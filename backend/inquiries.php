<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';
setApiHeaders();
startAdminSession();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'GET') {
        requireAdmin();
        $statement = getDatabase()->query(
            'SELECT id, name, email, phone, division, message, status, created_at, updated_at FROM inquiries ORDER BY created_at DESC, id DESC'
        );
        sendJson(['inquiries' => $statement->fetchAll()]);
    }

    if ($method === 'POST') {
        $input = readJsonBody();
        $action = $input['action'] ?? '';

        if ($action === 'submit') {
            if (!empty($input['website'])) {
                sendJson(['saved' => true], 201);
            }

            $inquiry = validateInquiry($input);
            $now = gmdate('Y-m-d\TH:i:s\Z');
            $statement = getDatabase()->prepare(
                'INSERT INTO inquiries (name, email, phone, division, message, status, created_at, updated_at) VALUES (:name, :email, :phone, :division, :message, :status, :created_at, :updated_at)'
            );
            $statement->execute($inquiry + [
                'status' => 'new',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            sendJson(['saved' => true], 201);
        }

        requireAdmin();
        requireCsrfToken();

        if ($action !== 'create') {
            sendJson(['error' => 'Unknown inquiry action.'], 400);
        }

        $inquiry = validateInquiry($input);
        $status = validateStatus($input['status'] ?? 'new');
        $now = gmdate('Y-m-d\TH:i:s\Z');
        $statement = getDatabase()->prepare(
            'INSERT INTO inquiries (name, email, phone, division, message, status, created_at, updated_at) VALUES (:name, :email, :phone, :division, :message, :status, :created_at, :updated_at)'
        );
        $statement->execute($inquiry + [
            'status' => $status,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        sendJson(['id' => (int) getDatabase()->lastInsertId()], 201);
    }

    if ($method === 'PATCH') {
        requireAdmin();
        requireCsrfToken();
        $input = readJsonBody();
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            sendJson(['error' => 'A valid inquiry ID is required.'], 400);
        }

        $inquiry = validateInquiry($input);
        $status = validateStatus($input['status'] ?? null);
        $statement = getDatabase()->prepare(
            'UPDATE inquiries SET name = :name, email = :email, phone = :phone, division = :division, message = :message, status = :status, updated_at = :updated_at WHERE id = :id'
        );
        $statement->execute($inquiry + [
            'status' => $status,
            'updated_at' => gmdate('Y-m-d\TH:i:s\Z'),
            'id' => $id,
        ]);
        if ($statement->rowCount() === 0) {
            $exists = getDatabase()->prepare('SELECT 1 FROM inquiries WHERE id = :id');
            $exists->execute(['id' => $id]);
            if (!$exists->fetchColumn()) {
                sendJson(['error' => 'Inquiry not found.'], 404);
            }
        }

        sendJson(['updated' => true]);
    }

    if ($method === 'DELETE') {
        requireAdmin();
        requireCsrfToken();
        $input = readJsonBody();
        $id = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            sendJson(['error' => 'A valid inquiry ID is required.'], 400);
        }

        $statement = getDatabase()->prepare('DELETE FROM inquiries WHERE id = :id');
        $statement->execute(['id' => $id]);
        if ($statement->rowCount() === 0) {
            sendJson(['error' => 'Inquiry not found.'], 404);
        }

        sendJson(['deleted' => true]);
    }

    header('Allow: GET, POST, PATCH, DELETE');
    sendJson(['error' => 'Method not allowed.'], 405);
} catch (InvalidArgumentException $error) {
    sendJson(['error' => $error->getMessage()], 422);
} catch (Throwable $error) {
    error_log('MVBC inquiry API error: ' . $error->getMessage());
    sendJson(['error' => 'The request could not be completed. Check the PHP server configuration and try again.'], 500);
}
