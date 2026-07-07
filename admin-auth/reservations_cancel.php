<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/../reservations-api/stripe_client.php';

$currentAdmin = require_login();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    ob_clean(); echo json_encode(['error' => 'Méthode non supportée.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$id = (int) ($input['id'] ?? 0);
if (!$id) {
    http_response_code(400);
    ob_clean(); echo json_encode(['error' => 'id requis.']);
    exit;
}

$pdo = db();
$stmt = $pdo->prepare('SELECT * FROM reservations WHERE id = ?');
$stmt->execute([$id]);
$reservation = $stmt->fetch();

if (!$reservation) {
    http_response_code(404);
    ob_clean(); echo json_encode(['error' => 'Réservation introuvable.']);
    exit;
}
if ($reservation['statut'] === 'cancelled') {
    http_response_code(400);
    ob_clean(); echo json_encode(['error' => 'Déjà annulée.']);
    exit;
}

$refunded = false;
$refundError = null;

if ($reservation['stripe_payment_intent'] && stripe_configured()) {
    try {
        [$status, $data] = stripe_create_refund($reservation['stripe_payment_intent']);
        $refunded = $status === 200;
        if (!$refunded) $refundError = $data['error']['message'] ?? ('HTTP ' . $status);
    } catch (Throwable $e) {
        $refundError = $e->getMessage();
    }
}

$pdo->prepare("UPDATE reservations SET statut = 'cancelled' WHERE id = ?")->execute([$id]);

ob_clean(); echo json_encode([
    'ok' => true,
    'refunded' => $refunded,
    'refund_error' => $refundError,
    'cancelled_by' => $currentAdmin['label'],
]);
