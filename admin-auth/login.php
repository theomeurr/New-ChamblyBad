<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

start_session();
if (!empty($_SESSION['admin_label'])) {
    header('Location: /admin-bcco-fe732ff3.php');
    exit;
}

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $label = trim($_POST['label'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($label === '' || $password === '') {
        $error = 'Identifiant et mot de passe requis.';
    } else {
        $result = verify_login($label, $password);
        if ($result === 'locked') {
            $error = 'Trop de tentatives. Réessayez dans ' . LOCKOUT_MINUTES . ' minutes.';
        } elseif ($result === 'invalid') {
            $error = 'Identifiants incorrects.';
        } else {
            record_login((int) $result['id']);
            log_in_session($result);
            header('Location: /admin-bcco-fe732ff3.php');
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="robots" content="noindex,nofollow"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Connexion Admin — BCCO</title>
<link rel="icon" type="image/png" href="../media/cropped-Logo-BCCO-180x180.webp"/>
<style>
body{font-family:system-ui,sans-serif;background:linear-gradient(135deg,#0A1988,#0B1130);display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;box-sizing:border-box}
.card{background:#fff;border-radius:24px;padding:48px 40px;max-width:400px;width:100%;text-align:center;box-shadow:0 40px 100px rgba(0,0,0,.3)}
.card img{width:60px;height:60px;margin-bottom:16px}
.card h2{margin:0 0 8px;color:#0B1130}
.card p{color:#5A6380;font-size:14px;margin:0 0 28px}
input{width:100%;padding:14px 18px;border:1px solid rgba(10,25,136,.15);border-radius:12px;font-size:15px;margin-bottom:16px;outline:none;box-sizing:border-box}
input:focus{border-color:#0A1988}
button{width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#A5EB78,#7ed957);color:#0A1988;font-weight:700;font-size:16px;cursor:pointer}
.err{color:#ef4444;font-size:13px;font-weight:600;margin-bottom:16px}
</style>
</head>
<body>
<div class="card">
  <img src="../media/cropped-Logo-BCCO-180x180.webp" alt="BCCO"/>
  <h2>Espace Admin</h2>
  <p>Espace admin BCCO.</p>
  <?php if ($error): ?><div class="err"><?= htmlspecialchars($error) ?></div><?php endif; ?>
  <form method="post">
    <input type="text" name="label" placeholder="Identifiant" autocomplete="username" required/>
    <input type="password" name="password" placeholder="Mot de passe" autocomplete="current-password" required/>
    <button type="submit">Se connecter</button>
  </form>
</div>
</body>
</html>
