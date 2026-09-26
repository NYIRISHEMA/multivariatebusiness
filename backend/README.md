# MVBC Contact Backend

The contact form and admin dashboard require PHP 8.1 or newer with PDO SQLite enabled. GitHub Pages is static hosting and cannot execute this PHP backend; deploy the frontend and these PHP endpoints together on a PHP-enabled host using the same origin.

## Configure

Set these environment variables in the PHP host before starting PHP:

- `MVBC_ADMIN_USERNAME`: administrator username. Defaults to `admin`.
- `MVBC_ADMIN_PASSWORD_HASH`: password hash generated with PHP's `password_hash()`; never put the plain password or its hash in the repository.
- `MVBC_STORAGE_DIR`: optional private writable directory for `inquiries.sqlite`. By default, the backend creates `mvbc-private-data` outside the project directory.

Generate a hash locally with PHP, replacing the placeholder with a strong password:

```powershell
php -r "echo password_hash('REPLACE_WITH_A_LONG_RANDOM_PASSWORD', PASSWORD_DEFAULT), PHP_EOL;"
```

Set `MVBC_ADMIN_PASSWORD_HASH` to the resulting hash in the server environment. Use HTTPS in production so the administrator session cookie is secure.

## Run locally

From the project root, configure the environment variables in the current shell and start PHP's development server:

```powershell
$env:MVBC_ADMIN_USERNAME = 'admin'
$env:MVBC_ADMIN_PASSWORD_HASH = 'PASTE_THE_GENERATED_HASH_HERE'
$env:MVBC_STORAGE_DIR = Join-Path $env:LOCALAPPDATA 'MVBC\private-data'
php -S 127.0.0.1:8000 -t .
```

Open `http://127.0.0.1:8000/contact.html` to submit an inquiry and `http://127.0.0.1:8000/admin/admin.html` to manage inquiries. The database is created automatically in the configured private directory.

The admin API uses PHP sessions, `HttpOnly`/`SameSite=Strict` cookies, CSRF tokens for mutations, prepared SQLite statements, server-side input validation, and a five-attempt per-IP login limit with a 15-minute lockout. Back up the private database directory separately from the website files.