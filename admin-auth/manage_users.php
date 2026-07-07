<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

$currentAdmin = require_login();
if ($currentAdmin['role'] !== 'super') {
    http_response_code(403);
    exit('Accès réservé au super-admin.');
}

// L'id de session correspond au label ; on retrouve l'id numérique pour
// interdire de se révoquer soi-même par erreur.
$stmt = db()->prepare('SELECT id FROM admins WHERE label = ?');
$stmt->execute([$currentAdmin['label']]);
$myId = (int) $stmt->fetchColumn();

$error = null;
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'create') {
        $label = trim($_POST['label'] ?? '');
        $password = $_POST['password'] ?? '';
        $confirm = $_POST['confirm'] ?? '';
        $role = ($_POST['role'] ?? 'admin') === 'super' ? 'super' : 'admin';

        if ($label === '' || $password === '') {
            $error = 'Identifiant et mot de passe requis.';
        } elseif (strlen($password) < 10) {
            $error = 'Le mot de passe doit faire au moins 10 caractères.';
        } elseif ($password !== $confirm) {
            $error = 'Les deux mots de passe ne correspondent pas.';
        } else {
            $exists = db()->prepare('SELECT COUNT(*) FROM admins WHERE label = ?');
            $exists->execute([$label]);
            if ((int) $exists->fetchColumn() > 0) {
                $error = 'Cet identifiant existe déjà.';
            } else {
                create_admin($label, $password, $role);
                $success = "Compte « $label » créé.";
            }
        }
    } elseif ($action === 'revoke') {
        $id = (int) ($_POST['id'] ?? 0);
        $target = find_admin_by_id($id);
        if (!$target) {
            $error = 'Compte introuvable.';
        } elseif ($id === $myId) {
            $error = 'Vous ne pouvez pas révoquer votre propre compte.';
        } elseif ($target['role'] === 'super' && count_super_admins() <= 1) {
            $error = 'Impossible de révoquer le dernier super-admin.';
        } else {
            revoke_admin($id);
            $success = "Accès de « {$target['label']} » révoqué.";
        }
    } elseif ($action === 'reset_password') {
        $id = (int) ($_POST['id'] ?? 0);
        $password = $_POST['password'] ?? '';
        $confirm = $_POST['confirm'] ?? '';
        $target = find_admin_by_id($id);

        if (!$target) {
            $error = 'Compte introuvable.';
        } elseif (strlen($password) < 10) {
            $error = 'Le mot de passe doit faire au moins 10 caractères.';
        } elseif ($password !== $confirm) {
            $error = 'Les deux mots de passe ne correspondent pas.';
        } else {
            reset_password($id, $password);
            $success = "Mot de passe de « {$target['label']} » réinitialisé.";
        }
    }
}

$admins = list_admins();
$resetId = isset($_GET['reset']) ? (int) $_GET['reset'] : 0;

function fmt_datetime(?string $dt): string {
    if (!$dt) return 'Jamais connecté';
    return 'Dernière connexion : ' . date('d/m/Y à H:i', strtotime($dt));
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="robots" content="noindex,nofollow"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Gestion des accès — BCCO</title>
<link rel="icon" type="image/png" href="../media/cropped-Logo-BCCO-180x180.webp"/>
<style>
:root{--bg-2:#F5F7FB;--line:rgba(10,25,136,.10);--text:#0B1130;--muted:#5A6380;--gold:#A5EB78;--gold-2:#7ed957;--secondary:#0A1988}
*{box-sizing:border-box}
body{font-family:system-ui,sans-serif;color:var(--text);background:var(--bg-2);margin:0;padding:24px}
.wrap{max-width:640px;margin:0 auto}
a.back{font-size:13px;color:var(--secondary);text-decoration:none;font-weight:600}
h2{margin:16px 0 20px}
.card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:20px}
.row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-2);border-radius:8px;margin-bottom:8px;flex-wrap:wrap}
.row .label{flex:1 1 auto;min-width:120px}
.row .label .name{font-weight:600;font-size:13px;display:block}
.row .label .sub{font-size:11px;color:var(--muted)}
.tag{font-size:10px;font-weight:700;padding:2px 7px;border-radius:5px;text-transform:uppercase}
.tag.super{background:var(--secondary);color:#fff}
.tag.admin{background:#fff;border:1px solid var(--line);color:var(--muted)}
.row form{margin:0}
.row-actions{display:flex;gap:6px}
.row button, .row a.mini-btn{font-size:11px;font-weight:700;background:none;border-radius:6px;padding:4px 9px;cursor:pointer;text-decoration:none;display:inline-block}
.row .revoke-btn{color:#b91c1c;border:1px solid #fca5a5}
.row .reset-btn{color:var(--secondary);border:1px solid var(--line)}
input,select{width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:10px;font-size:14px;margin-bottom:12px;box-sizing:border-box;font-family:inherit}
button[type=submit]{padding:11px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--gold),var(--gold-2));color:var(--secondary);font-weight:700;cursor:pointer}
.msg{padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px}
.msg.err{background:#fef2f2;color:#b91c1c}
.msg.ok{background:rgba(165,235,120,.15);color:#166534}
.reset-card{border:1px solid var(--gold-2);background:rgba(165,235,120,.06)}
</style>
</head>
<body>
<div class="wrap">
  <a class="back" href="../admin-bcco-fe732ff3.php">&larr; Retour au dashboard</a>
  <h2>Gestion des accès admin</h2>

  <?php if ($error): ?><div class="msg err"><?= htmlspecialchars($error) ?></div><?php endif; ?>
  <?php if ($success): ?><div class="msg ok"><?= htmlspecialchars($success) ?></div><?php endif; ?>

  <?php if ($resetId && ($resetTarget = find_admin_by_id($resetId))): ?>
  <div class="card reset-card">
    <strong style="font-size:13px">Réinitialiser le mot de passe de « <?= htmlspecialchars($resetTarget['label']) ?> »</strong>
    <form method="post" style="margin-top:14px">
      <input type="hidden" name="action" value="reset_password"/>
      <input type="hidden" name="id" value="<?= (int) $resetTarget['id'] ?>"/>
      <input type="password" name="password" placeholder="Nouveau mot de passe (min. 10 caractères)" required/>
      <input type="password" name="confirm" placeholder="Confirmer le mot de passe" required/>
      <button type="submit">Réinitialiser</button>
    </form>
  </div>
  <?php endif; ?>

  <div class="card">
    <strong style="font-size:13px">Utilisateurs configurés</strong>
    <div style="margin-top:12px">
      <?php foreach ($admins as $a): ?>
        <div class="row">
          <span class="label">
            <span class="name"><?= htmlspecialchars($a['label']) ?></span>
            <span class="sub"><?= htmlspecialchars(fmt_datetime($a['last_login'])) ?></span>
          </span>
          <span class="tag <?= $a['role'] === 'super' ? 'super' : 'admin' ?>"><?= $a['role'] === 'super' ? 'super admin' : 'admin' ?></span>
          <div class="row-actions">
            <a class="mini-btn reset-btn" href="?reset=<?= (int) $a['id'] ?>">Réinitialiser MDP</a>
            <?php if ((int) $a['id'] === $myId): ?>
              <span style="font-size:11px;color:var(--muted);font-style:italic;align-self:center">vous</span>
            <?php else: ?>
              <form method="post" onsubmit="return confirm('Révoquer l\'accès de « <?= htmlspecialchars($a['label']) ?> » ?');">
                <input type="hidden" name="action" value="revoke"/>
                <input type="hidden" name="id" value="<?= (int) $a['id'] ?>"/>
                <button type="submit" class="revoke-btn">Révoquer</button>
              </form>
            <?php endif; ?>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="card">
    <strong style="font-size:13px">Créer un accès</strong>
    <form method="post" style="margin-top:14px">
      <input type="hidden" name="action" value="create"/>
      <input type="text" name="label" placeholder="Identifiant" required/>
      <input type="password" name="password" placeholder="Mot de passe (min. 10 caractères)" required/>
      <input type="password" name="confirm" placeholder="Confirmer le mot de passe" required/>
      <select name="role">
        <option value="admin">Admin (peut modifier, pas gérer les accès)</option>
        <option value="super">Super admin (accès complet)</option>
      </select>
      <button type="submit">Créer le compte</button>
    </form>
  </div>
</div>
</body>
</html>
