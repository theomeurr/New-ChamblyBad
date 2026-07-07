<?php
declare(strict_types=1);

// Mise en tampon dès le tout premier fichier requis par n'importe quel endpoint :
// un warning/deprecation PHP imprévu ne doit jamais pouvoir se glisser avant un
// echo json_encode(...) et casser le JSON côté client. Chaque endpoint JSON fait
// ob_clean() juste avant sa sortie finale pour jeter tout ce qui aurait fuité.
if (!ob_get_level()) ob_start();

require_once __DIR__ . '/config.php';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function start_session(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function admin_count(): int {
    return (int) db()->query('SELECT COUNT(*) FROM admins')->fetchColumn();
}

function create_admin(string $label, string $password, string $role = 'admin'): void {
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = db()->prepare('INSERT INTO admins (label, password_hash, role) VALUES (?, ?, ?)');
    $stmt->execute([$label, $hash, $role]);
}

function list_admins(): array {
    return db()->query('SELECT id, label, role, created_at, last_login FROM admins ORDER BY created_at ASC')->fetchAll();
}

function reset_password(int $id, string $password): void {
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = db()->prepare('UPDATE admins SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?');
    $stmt->execute([$hash, $id]);
}

function record_login(int $id): void {
    $stmt = db()->prepare('UPDATE admins SET last_login = NOW() WHERE id = ?');
    $stmt->execute([$id]);
}

function count_super_admins(): int {
    return (int) db()->query("SELECT COUNT(*) FROM admins WHERE role = 'super'")->fetchColumn();
}

function revoke_admin(int $id): void {
    $stmt = db()->prepare('DELETE FROM admins WHERE id = ?');
    $stmt->execute([$id]);
}

function find_admin_by_id(int $id) {
    $stmt = db()->prepare('SELECT * FROM admins WHERE id = ?');
    $stmt->execute([$id]);
    return $stmt->fetch();
}

/**
 * Vérifie les identifiants. Retourne la ligne admin en cas de succès,
 * ou une chaîne d'erreur ('locked' | 'invalid') sinon.
 */
function verify_login(string $label, string $password) {
    $stmt = db()->prepare('SELECT * FROM admins WHERE label = ?');
    $stmt->execute([$label]);
    $admin = $stmt->fetch();

    if (!$admin) {
        return 'invalid';
    }

    if ($admin['locked_until'] !== null && strtotime($admin['locked_until']) > time()) {
        return 'locked';
    }

    if (!password_verify($password, $admin['password_hash'])) {
        $attempts = (int) $admin['failed_attempts'] + 1;
        if ($attempts >= MAX_ATTEMPTS) {
            $lockUntil = date('Y-m-d H:i:s', time() + LOCKOUT_MINUTES * 60);
            $upd = db()->prepare('UPDATE admins SET failed_attempts = 0, locked_until = ? WHERE id = ?');
            $upd->execute([$lockUntil, $admin['id']]);
            return 'locked';
        }
        $upd = db()->prepare('UPDATE admins SET failed_attempts = ? WHERE id = ?');
        $upd->execute([$attempts, $admin['id']]);
        return 'invalid';
    }

    $reset = db()->prepare('UPDATE admins SET failed_attempts = 0, locked_until = NULL WHERE id = ?');
    $reset->execute([$admin['id']]);

    return $admin;
}

function require_login(): array {
    start_session();
    if (empty($_SESSION['admin_label'])) {
        header('Location: /admin-auth/login.php');
        exit;
    }
    return [
        'label' => $_SESSION['admin_label'],
        'role' => $_SESSION['admin_role'] ?? 'admin',
    ];
}

function log_in_session(array $admin): void {
    start_session();
    session_regenerate_id(true);
    $_SESSION['admin_label'] = $admin['label'];
    $_SESSION['admin_role'] = $admin['role'];
}

function log_out_session(): void {
    start_session();
    $_SESSION = [];
    session_destroy();
}
