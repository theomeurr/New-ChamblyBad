<?php
declare(strict_types=1);
require_once __DIR__ . '/../admin-auth/auth.php'; // fournit db() — pas de require_login(), endpoint public
require_once __DIR__ . '/reservations_lib.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

$date = $_GET['date'] ?? '';
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    ob_clean(); echo json_encode(['error' => 'Paramètre date invalide (attendu YYYY-MM-DD).']);
    exit;
}

try {
    $config = rv_load_config();
    $openSlots = rv_load_open_slots();
    $blocked = rv_load_blocked();

    $dt = DateTime::createFromFormat('Y-m-d', $date);
    if (!$dt) {
        http_response_code(400);
        ob_clean(); echo json_encode(['error' => 'Date invalide.']);
        exit;
    }
    $jour = FR_DAYS[(int) $dt->format('N')];
    $window = $openSlots[$jour] ?? null;

    if (!$window) {
        ob_clean(); echo json_encode(['slots' => [], 'config' => $config]);
        exit;
    }

    $today = new DateTime('today');
    $isToday = $dt->format('Y-m-d') === $today->format('Y-m-d');
    $nowMin = ((int) date('H')) * 60 + (int) date('i');

    $startH = (int) explode(':', $window['debut'])[0];
    $endH = (int) explode(':', $window['fin'])[0];

    $pdo = db();
    $slots = [];
    for ($h = $startH; $h < $endH; $h++) {
        $startMin = $h * 60;
        $endMin = $startMin + 60;
        $blockedSlot = rv_is_blocked($blocked, $date, $startMin, $endMin);
        $past = $isToday && $startMin <= $nowMin;
        if ($blockedSlot || $past) {
            $slots[] = ['hour' => $h, 'restants' => 0, 'full' => true, 'closed' => true];
            continue;
        }
        $taken = rv_count_overlapping($pdo, $date, $startMin, $endMin);
        $restants = max(0, $config['nb_terrains'] - $taken);
        $slots[] = ['hour' => $h, 'restants' => $restants, 'full' => $restants === 0, 'closed' => false];
    }

    ob_clean(); echo json_encode(['slots' => $slots, 'config' => $config]);
} catch (Throwable $e) {
    http_response_code(500);
    ob_clean(); echo json_encode(['error' => $e->getMessage()]);
}
