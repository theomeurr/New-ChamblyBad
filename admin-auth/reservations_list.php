<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

require_login();
header('Content-Type: application/json');

$stmt = db()->query(
    "SELECT id, reference, date, heure_debut, heure_fin, duree, nom, prenom, email, telephone,
            licencie, numero_licence, montant, statut, stripe_payment_intent, created_at
     FROM reservations
     WHERE date >= CURDATE()
     ORDER BY date ASC, heure_debut ASC
     LIMIT 200"
);
ob_clean(); echo json_encode(['reservations' => $stmt->fetchAll()]);
