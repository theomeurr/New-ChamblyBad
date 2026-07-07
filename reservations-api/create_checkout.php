<?php
declare(strict_types=1);
require_once __DIR__ . '/../admin-auth/auth.php'; // fournit db() — pas de require_login(), endpoint public
require_once __DIR__ . '/reservations_lib.php';
require_once __DIR__ . '/stripe_client.php';

header('Content-Type: application/json');

function fail(int $code, string $message): void {
    http_response_code($code);
    ob_clean(); echo json_encode(['error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'Méthode non supportée.');

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) fail(400, 'Requête invalide.');

$date = (string) ($input['date'] ?? '');
$heureDebut = (string) ($input['heure_debut'] ?? '');
$duree = (int) ($input['duree'] ?? 0);
$prenom = trim((string) ($input['prenom'] ?? ''));
$nom = trim((string) ($input['nom'] ?? ''));
$email = trim((string) ($input['email'] ?? ''));
$telephone = trim((string) ($input['telephone'] ?? ''));
$licencieDemande = !empty($input['licencie']);
$numeroLicence = trim((string) ($input['numero_licence'] ?? ''));
$turnstileToken = $input['turnstile_token'] ?? null;

// --- Validation des champs ---
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) fail(400, 'Date invalide.');
if (!preg_match('/^\d{2}:\d{2}$/', $heureDebut)) fail(400, 'Heure invalide.');
if (!in_array($duree, [60, 90, 120], true)) fail(400, 'Durée invalide.');
if ($prenom === '' || $nom === '') fail(400, 'Prénom et nom requis.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail(400, 'Email invalide.');
if ($telephone === '') fail(400, 'Téléphone requis.');
if ($licencieDemande && $numeroLicence === '') fail(400, 'Numéro de licence requis.');

// --- CAPTCHA ---
$remoteIp = $_SERVER['REMOTE_ADDR'] ?? '';
if (!rv_verify_turnstile($turnstileToken, $remoteIp)) {
    fail(400, 'Vérification anti-robot échouée. Rechargez la page et réessayez.');
}

// --- Règles métier (créneau, horaires, anticipation) ---
$config = rv_load_config();

// --- Stripe doit être configuré avant d'aller plus loin (aucune écriture DB sinon) ---
if (!stripe_configured()) {
    fail(503, "La réservation en ligne n'est pas encore activée (paiement non configuré). Contactez le club : " . $config['email_contact']);
}

$openSlots = rv_load_open_slots();
$blocked = rv_load_blocked();
$licencies = rv_load_licencies();

$dt = DateTime::createFromFormat('Y-m-d', $date);
if (!$dt) fail(400, 'Date invalide.');

$today = new DateTime('today');
$horizon = (clone $today)->modify('+' . $config['anticipation_jours'] . ' days');
if ($dt < $today || $dt > $horizon) fail(400, 'Cette date est hors de la fenêtre de réservation.');

$jour = FR_DAYS[(int) $dt->format('N')];
$window = $openSlots[$jour] ?? null;
if (!$window) fail(400, 'Aucun créneau ouvert ce jour-là.');

$startMin = rv_hhmm_to_min($heureDebut);
$endMin = $startMin + $duree;
$windowStart = rv_hhmm_to_min($window['debut']);
$windowEnd = rv_hhmm_to_min($window['fin']);
if ($startMin < $windowStart || $endMin > $windowEnd) fail(400, 'Créneau en dehors des horaires d\'ouverture.');

$isToday = $dt->format('Y-m-d') === $today->format('Y-m-d');
if ($isToday) {
    $nowMin = ((int) date('H')) * 60 + (int) date('i');
    if ($startMin <= $nowMin) fail(400, 'Ce créneau est déjà passé.');
}

if (rv_is_blocked($blocked, $date, $startMin, $endMin)) fail(409, 'Ce créneau est indisponible.');

// --- Tarif recalculé côté serveur (jamais confiance dans un montant envoyé par le client) ---
$basePrice = rv_price_for_duree($config, $duree);
if ($basePrice === null) fail(400, 'Durée invalide.');
$licencieVerifie = $licencieDemande && rv_verify_licence($licencies, $numeroLicence);
$montant = rv_apply_reduction($config, $basePrice, $licencieVerifie);

$pdo = db();
$heureFin = sprintf('%02d:%02d', intdiv($endMin, 60), $endMin % 60);

// --- Verrou par date : sérialise les tentatives de réservation du même jour pour
//     éviter un double-comptage de créneau entre deux requêtes simultanées. ---
$lockName = 'rv_lock_' . $date;
$lockStmt = $pdo->prepare('SELECT GET_LOCK(?, 5)');
$lockStmt->execute([$lockName]);
if (!(int) $lockStmt->fetchColumn()) fail(503, 'Serveur occupé, réessayez.');

try {
    $taken = rv_count_overlapping($pdo, $date, $startMin, $endMin);
    if ($taken >= $config['nb_terrains']) {
        fail(409, 'Ce créneau vient d\'être complété. Choisissez un autre horaire.');
    }

    $reference = rv_generate_reference($pdo);
    $insert = $pdo->prepare(
        'INSERT INTO reservations
         (reference, date, heure_debut, heure_fin, duree, nom, prenom, email, telephone, licencie, numero_licence, montant, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $insert->execute([
        $reference, $date, $heureDebut, $heureFin, $duree,
        $nom, $prenom, $email, $telephone,
        $licencieVerifie ? 'oui' : 'non', $numeroLicence !== '' ? $numeroLicence : null,
        $montant, 'pending',
    ]);
    $reservationId = (int) $pdo->lastInsertId();
} finally {
    $pdo->prepare('SELECT RELEASE_LOCK(?)')->execute([$lockName]);
}

// --- Création de la session Stripe Checkout (mode test tant que sk_test_...) ---
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$origin = $scheme . '://' . $_SERVER['HTTP_HOST'];

[$status, $session] = stripe_create_checkout_session([
    'email' => $email,
    'amount_euros' => $montant,
    'label' => 'Réservation terrain BCCO — ' . $date . ' ' . $heureDebut,
    'success_url' => $origin . '/reservations-merci.html?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url' => $origin . '/reservations.html?cancelled=1',
    'metadata' => ['reference' => $reference, 'reservation_id' => (string) $reservationId],
]);

if ($status !== 200 || empty($session['url'])) {
    // On ne laisse pas de réservation "pending" fantôme si Stripe échoue.
    $pdo->prepare("UPDATE reservations SET statut = 'expired' WHERE id = ?")->execute([$reservationId]);
    fail(502, 'Erreur lors de la création du paiement : ' . ($session['error']['message'] ?? 'inconnue'));
}

$pdo->prepare('UPDATE reservations SET stripe_session_id = ? WHERE id = ?')->execute([$session['id'], $reservationId]);

ob_clean(); echo json_encode(['checkout_url' => $session['url'], 'reference' => $reference]);
