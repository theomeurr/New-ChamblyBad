<?php
declare(strict_types=1);
require_once __DIR__ . '/../admin-auth/auth.php';
require_once __DIR__ . '/stripe_client.php';

// Endpoint appelé par Stripe (pas par le navigateur) — Developers → Webhooks →
// Add endpoint → https://votredomaine/reservations-api/stripe_webhook.php
// Événements à cocher : checkout.session.completed, checkout.session.expired

header('Content-Type: application/json');

$payload = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

if (!defined('STRIPE_WEBHOOK_SECRET') || STRIPE_WEBHOOK_SECRET === '') {
    http_response_code(503);
    ob_clean(); echo json_encode(['error' => 'STRIPE_WEBHOOK_SECRET absent de config.php.']);
    exit;
}

if (!stripe_verify_webhook_signature($payload, $sigHeader, STRIPE_WEBHOOK_SECRET)) {
    http_response_code(400);
    ob_clean(); echo json_encode(['error' => 'Signature invalide.']);
    exit;
}

$event = json_decode($payload, true);
if (!$event || empty($event['type'])) {
    http_response_code(400);
    ob_clean(); echo json_encode(['error' => 'Payload invalide.']);
    exit;
}

$pdo = db();
$session = $event['data']['object'] ?? [];
$sessionId = $session['id'] ?? null;

if ($sessionId) {
    if ($event['type'] === 'checkout.session.completed') {
        $stmt = $pdo->prepare(
            "UPDATE reservations SET statut = 'confirmed', stripe_payment_intent = ?
             WHERE stripe_session_id = ? AND statut = 'pending'"
        );
        $stmt->execute([$session['payment_intent'] ?? null, $sessionId]);
    } elseif ($event['type'] === 'checkout.session.expired') {
        $stmt = $pdo->prepare(
            "UPDATE reservations SET statut = 'expired'
             WHERE stripe_session_id = ? AND statut = 'pending'"
        );
        $stmt->execute([$sessionId]);
    }
}

http_response_code(200);
ob_clean(); echo json_encode(['received' => true]);
