<?php
declare(strict_types=1);
require_once __DIR__ . '/../admin-auth/auth.php';

header('Content-Type: application/json');
header('Cache-Control: no-store');

$sessionId = $_GET['session_id'] ?? '';
if ($sessionId === '') {
    http_response_code(400);
    ob_clean(); echo json_encode(['error' => 'session_id requis.']);
    exit;
}

$stmt = db()->prepare(
    'SELECT reference, date, heure_debut, heure_fin, prenom, nom, montant, statut
     FROM reservations WHERE stripe_session_id = ?'
);
$stmt->execute([$sessionId]);
$row = $stmt->fetch();

if (!$row) {
    http_response_code(404);
    ob_clean(); echo json_encode(['error' => 'Réservation introuvable.']);
    exit;
}

ob_clean(); echo json_encode($row);
