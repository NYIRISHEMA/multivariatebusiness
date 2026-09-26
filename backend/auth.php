<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
setApiHeaders();
startAdminSession();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }

    sendJson([
        'authenticated' => !empty($_SESSION['admin_authenticated']),
        'csrfToken' => $_SESSION['csrf_token'],
    ]);
}

if ($method !== 'POST') {
    header('Allow: GET, POST');
    sendJson(['error' => 'Method not allowed.'], 405);
}

$input = readJsonBody();
$action = $input['action'] ?? '';

if ($action === 'login') {
    $configuredHash = getenv('MVBC_ADMIN_PASSWORD_HASH');
    if ($configuredHash === false || trim($configuredHash) === '') {
        sendJson(['error' => 'Administrator password is not configured on the server.'], 503);
    }

    $attemptKey = loginAttemptKey($configuredHash);
    enforceLoginAttemptLimit($attemptKey);

    $configuredUsername = getenv('MVBC_ADMIN_USERNAME') ?: 'admin';
    try {
        $username = trim(inputString($input, 'username'));
        $password = inputString($input, 'password');
    } catch (InvalidArgumentException $error) {
        sendJson(['error' => $error->getMessage()], 422);
    }

    if (!hash_equals($configuredUsername, $username) || !password_verify($password, $configuredHash)) {
        recordFailedLogin($attemptKey);
        usleep(300000);
        sendJson(['error' => 'Username or password is incorrect.'], 401);
    }

    clearFailedLogins($attemptKey);
    session_regenerate_id(true);
    $_SESSION['admin_authenticated'] = true;
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

    sendJson([
        'authenticated' => true,
        'csrfToken' => $_SESSION['csrf_token'],
    ]);
}

if ($action === 'logout') {
    requireAdmin();
    requireCsrfToken();

    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $cookie = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $cookie['path'],
            'domain' => $cookie['domain'],
            'secure' => $cookie['secure'],
            'httponly' => $cookie['httponly'],
            'samesite' => 'Strict',
        ]);
    }
    session_destroy();

    sendJson(['authenticated' => false]);
}

sendJson(['error' => 'Unknown authentication action.'], 400);
