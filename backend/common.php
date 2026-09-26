<?php
declare(strict_types=1);

const MVBC_DIVISIONS = [
    'construction',
    'trading',
    'industrial',
    'general',
];

const MVBC_STATUSES = [
    'new',
    'in_progress',
    'responded',
    'closed',
];

function setApiHeaders(): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('X-Frame-Options: DENY');
}

function sendJson(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function startAdminSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    ini_set('session.use_strict_mode', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function readJsonBody(): array
{
    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($contentType !== 'application/json') {
        sendJson(['error' => 'Content-Type must be application/json.'], 415);
    }

    $rawBody = file_get_contents('php://input') ?: '';
    if (strlen($rawBody) > 20000) {
        sendJson(['error' => 'Request body is too large.'], 413);
    }

    $decoded = json_decode($rawBody, true);
    if (!is_array($decoded)) {
        sendJson(['error' => 'Request body must be a valid JSON object.'], 400);
    }

    return $decoded;
}

function inputString(array $input, string $key): string
{
    $value = $input[$key] ?? '';
    if (!is_string($value) && !is_int($value) && !is_float($value)) {
        throw new InvalidArgumentException('Invalid value for ' . $key . '.');
    }

    return (string) $value;
}

function textLength(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }

    $length = preg_match_all('/./us', $value);
    return $length === false ? PHP_INT_MAX : $length;
}

function getDatabase(): PDO
{
    static $database = null;
    if ($database instanceof PDO) {
        return $database;
    }

    $configuredDirectory = getenv('MVBC_STORAGE_DIR');
    $storageDirectory = $configuredDirectory !== false && trim($configuredDirectory) !== ''
        ? $configuredDirectory
        : dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'mvbc-private-data';

    if (!is_dir($storageDirectory) && !mkdir($storageDirectory, 0700, true) && !is_dir($storageDirectory)) {
        throw new RuntimeException('Unable to create the private data directory.');
    }

    $databasePath = rtrim($storageDirectory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'inquiries.sqlite';
    $database = new PDO('sqlite:' . $databasePath, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5,
    ]);
    $database->exec('PRAGMA busy_timeout = 5000');
    $database->exec('PRAGMA journal_mode = WAL');
    $database->exec(
        "CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL DEFAULT '',
            division TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'responded', 'closed')),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    );
    $database->exec(
        'CREATE TABLE IF NOT EXISTS admin_login_attempts (
            ip_hash TEXT PRIMARY KEY,
            attempts INTEGER NOT NULL,
            window_started_at INTEGER NOT NULL,
            blocked_until INTEGER NOT NULL DEFAULT 0
        )'
    );

    return $database;
}

function loginAttemptKey(string $passwordHash): string
{
    $address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return hash_hmac('sha256', $address, $passwordHash);
}

function enforceLoginAttemptLimit(string $key): void
{
    $now = time();
    $database = getDatabase();
    $database->exec('DELETE FROM admin_login_attempts WHERE window_started_at < ' . (int) ($now - 86400) . ' AND blocked_until < ' . (int) $now);
    $statement = $database->prepare('SELECT blocked_until FROM admin_login_attempts WHERE ip_hash = :ip_hash');
    $statement->execute(['ip_hash' => $key]);
    $blockedUntil = (int) ($statement->fetchColumn() ?: 0);

    if ($blockedUntil > $now) {
        header('Retry-After: ' . ($blockedUntil - $now));
        sendJson(['error' => 'Too many sign-in attempts. Try again in 15 minutes.'], 429);
    }
}

function recordFailedLogin(string $key): void
{
    $now = time();
    $database = getDatabase();
    $statement = $database->prepare('SELECT attempts, window_started_at FROM admin_login_attempts WHERE ip_hash = :ip_hash');
    $statement->execute(['ip_hash' => $key]);
    $previous = $statement->fetch();

    if (!$previous || (int) $previous['window_started_at'] < $now - 900) {
        $attempts = 1;
        $windowStartedAt = $now;
    } else {
        $attempts = (int) $previous['attempts'] + 1;
        $windowStartedAt = (int) $previous['window_started_at'];
    }

    $blockedUntil = $attempts >= 5 ? $now + 900 : 0;
    $save = $database->prepare(
        'INSERT INTO admin_login_attempts (ip_hash, attempts, window_started_at, blocked_until) VALUES (:ip_hash, :attempts, :window_started_at, :blocked_until) ON CONFLICT(ip_hash) DO UPDATE SET attempts = excluded.attempts, window_started_at = excluded.window_started_at, blocked_until = excluded.blocked_until'
    );
    $save->execute([
        'ip_hash' => $key,
        'attempts' => $attempts,
        'window_started_at' => $windowStartedAt,
        'blocked_until' => $blockedUntil,
    ]);
}

function clearFailedLogins(string $key): void
{
    $statement = getDatabase()->prepare('DELETE FROM admin_login_attempts WHERE ip_hash = :ip_hash');
    $statement->execute(['ip_hash' => $key]);
}

function requireAdmin(): void
{
    if (empty($_SESSION['admin_authenticated'])) {
        sendJson(['error' => 'Administrator sign-in is required.'], 401);
    }
}

function requireCsrfToken(): void
{
    $providedToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';

    if (!is_string($providedToken) || !is_string($sessionToken) || $sessionToken === '' || !hash_equals($sessionToken, $providedToken)) {
        sendJson(['error' => 'The security token is invalid. Refresh the page and try again.'], 403);
    }
}

function validateInquiry(array $input): array
{
    $name = trim(inputString($input, 'name'));
    $email = trim(inputString($input, 'email'));
    $phone = trim(inputString($input, 'phone'));
    $division = trim(inputString($input, 'division'));
    $message = trim(inputString($input, 'message'));

    $nameLength = textLength($name);
    $phoneLength = textLength($phone);
    $messageLength = textLength($message);

    if ($nameLength < 2 || $nameLength > 100 || strlen($name) > 400) {
        throw new InvalidArgumentException('Name must be between 2 and 100 characters.');
    }
    if (strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        throw new InvalidArgumentException('Enter a valid email address.');
    }
    if ($phoneLength > 60 || strlen($phone) > 240) {
        throw new InvalidArgumentException('Phone number is too long.');
    }
    if (!in_array($division, MVBC_DIVISIONS, true)) {
        throw new InvalidArgumentException('Select a valid division.');
    }
    if ($messageLength < 10 || $messageLength > 3000 || strlen($message) > 12000) {
        throw new InvalidArgumentException('Message must be between 10 and 3000 characters.');
    }

    return [
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'division' => $division,
        'message' => $message,
    ];
}

function validateStatus(mixed $status): string
{
    if (!is_string($status) || !in_array($status, MVBC_STATUSES, true)) {
        throw new InvalidArgumentException('Select a valid inquiry status.');
    }

    return $status;
}
