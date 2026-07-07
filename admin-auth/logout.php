<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

log_out_session();
header('Location: /admin-auth/login.php');
exit;
