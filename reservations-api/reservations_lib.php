<?php
declare(strict_types=1);

// Logique partagée entre availability.php et create_checkout.php : lecture des CSV
// de config (statiques, édités via l'admin GitHub) + calculs de créneaux/tarifs.
// Les réservations elles-mêmes vivent en MySQL (voir reservations_lib.php::db(),
// fourni par admin-auth/auth.php).

const RV_DATA_DIR = __DIR__ . '/../data/reservations';
const FR_DAYS = [1 => 'lundi', 2 => 'mardi', 3 => 'mercredi', 4 => 'jeudi', 5 => 'vendredi', 6 => 'samedi', 7 => 'dimanche'];

function rv_read_csv(string $path): array {
    if (!is_file($path)) return [];
    $content = file_get_contents($path);
    if ($content === false) return [];
    if (substr($content, 0, 3) === "\xEF\xBB\xBF") $content = substr($content, 3);

    $fh = fopen('php://temp', 'r+');
    fwrite($fh, $content);
    rewind($fh);
    $headers = fgetcsv($fh, 0, ',', '"', '');
    if (!$headers) { fclose($fh); return []; }
    $headers = array_map('trim', $headers);
    $rows = [];
    while (($r = fgetcsv($fh, 0, ',', '"', '')) !== false) {
        if (count(array_filter($r, fn($v) => trim((string) $v) !== '')) === 0) continue;
        $row = [];
        foreach ($headers as $i => $h) $row[$h] = isset($r[$i]) ? trim((string) $r[$i]) : '';
        $rows[] = $row;
    }
    fclose($fh);
    return $rows;
}

function rv_is_active(string $v): bool {
    return (bool) preg_match('/^(x|1|true|oui|yes)$/i', trim($v));
}

function rv_load_config(): array {
    $defaults = [
        'tarif_1h' => 16, 'tarif_1h30' => 24, 'tarif_2h' => 32,
        'reduction_licencie_pct' => 0, 'anticipation_jours' => 14,
        'annulation_heures_avant' => 24, 'nb_terrains_reservables' => 9,
        'email_contact' => 'bcco60@gmail.com',
    ];
    foreach (rv_read_csv(RV_DATA_DIR . '/config.csv') as $r) {
        if (isset($r['cle']) && $r['cle'] !== '') $defaults[$r['cle']] = $r['valeur'];
    }
    return [
        'tarif_1h' => (float) $defaults['tarif_1h'],
        'tarif_1h30' => (float) $defaults['tarif_1h30'],
        'tarif_2h' => (float) $defaults['tarif_2h'],
        'reduction_pct' => (float) $defaults['reduction_licencie_pct'],
        'anticipation_jours' => (int) $defaults['anticipation_jours'],
        'annulation_heures' => (int) $defaults['annulation_heures_avant'],
        'nb_terrains' => (int) $defaults['nb_terrains_reservables'],
        'email_contact' => (string) $defaults['email_contact'],
    ];
}

function rv_load_open_slots(): array {
    $out = [];
    foreach (rv_read_csv(RV_DATA_DIR . '/creneaux_ouverts.csv') as $r) {
        if (rv_is_active($r['actif'] ?? '')) {
            $out[strtolower(trim($r['jour'] ?? ''))] = ['debut' => $r['heure_debut'], 'fin' => $r['heure_fin']];
        }
    }
    return $out;
}

function rv_load_blocked(): array {
    $out = [];
    foreach (rv_read_csv(RV_DATA_DIR . '/creneaux_bloques.csv') as $r) {
        if (rv_is_active($r['actif'] ?? '')) $out[] = $r;
    }
    return $out;
}

function rv_load_licencies(): array {
    $out = [];
    foreach (rv_read_csv(RV_DATA_DIR . '/licencies.csv') as $r) {
        if (rv_is_active($r['actif'] ?? '')) {
            $num = strtolower(trim($r['numero_licence'] ?? ''));
            if ($num !== '') $out[ltrim($num, '0') ?: '0'] = $r;
        }
    }
    return $out;
}

function rv_verify_licence(array $licencies, string $numero): bool {
    $key = strtolower(trim($numero));
    if ($key === '') return false;
    $norm = ltrim($key, '0') ?: '0';
    return isset($licencies[$norm]);
}

function rv_hhmm_to_min(string $t): int {
    [$h, $m] = array_pad(explode(':', $t), 2, '0');
    return ((int) $h) * 60 + (int) $m;
}

function rv_price_for_duree(array $config, int $duree): ?float {
    return match ($duree) {
        60 => $config['tarif_1h'],
        90 => $config['tarif_1h30'],
        120 => $config['tarif_2h'],
        default => null,
    };
}

function rv_apply_reduction(array $config, float $price, bool $licencieVerifie): float {
    if (!$licencieVerifie || !$config['reduction_pct']) return $price;
    return round($price * (100 - $config['reduction_pct']) / 100, 2);
}

/**
 * Nombre de réservations actives (confirmées, ou en attente de paiement depuis
 * moins de 20 min — au-delà on considère l'intention abandonnée et on libère
 * la place, sans dépendre d'un cron pour nettoyer les lignes "pending" mortes).
 */
function rv_count_overlapping(PDO $pdo, string $date, int $startMin, int $endMin): int {
    $stmt = $pdo->prepare(
        "SELECT heure_debut, heure_fin FROM reservations
         WHERE date = ? AND (
           statut = 'confirmed' OR (statut = 'pending' AND created_at > (NOW() - INTERVAL 20 MINUTE))
         )"
    );
    $stmt->execute([$date]);
    $count = 0;
    foreach ($stmt->fetchAll() as $r) {
        $rs = rv_hhmm_to_min(substr($r['heure_debut'], 0, 5));
        $re = rv_hhmm_to_min(substr($r['heure_fin'], 0, 5));
        if ($startMin < $re && $endMin > $rs) $count++;
    }
    return $count;
}

function rv_is_blocked(array $blocked, string $date, int $startMin, int $endMin): bool {
    foreach ($blocked as $b) {
        if ($b['date'] !== $date) continue;
        $bs = rv_hhmm_to_min($b['heure_debut']);
        $be = rv_hhmm_to_min($b['heure_fin']);
        if ($startMin < $be && $endMin > $bs) return true;
    }
    return false;
}

/**
 * Vérifie un token Cloudflare Turnstile. Si TURNSTILE_SECRET_KEY n'est pas encore
 * configuré (config.php), on considère la vérification "passée" pour ne pas bloquer
 * les réservations avant l'arrivée des clés — cohérent avec le reste du site.
 */
function rv_verify_turnstile(?string $token, string $remoteIp): bool {
    if (!defined('TURNSTILE_SECRET_KEY') || TURNSTILE_SECRET_KEY === '') return true;
    if (!$token) return false;

    $ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'secret' => TURNSTILE_SECRET_KEY,
            'response' => $token,
            'remoteip' => $remoteIp,
        ]),
    ]);
    $response = curl_exec($ch);
    if ($response === false) return false;
    $data = json_decode($response, true);
    return (bool) ($data['success'] ?? false);
}

function rv_generate_reference(PDO $pdo): string {
    do {
        $ref = 'BCCO-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM reservations WHERE reference = ?');
        $stmt->execute([$ref]);
    } while ((int) $stmt->fetchColumn() > 0);
    return $ref;
}
