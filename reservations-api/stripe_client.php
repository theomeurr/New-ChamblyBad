<?php
declare(strict_types=1);

// Client Stripe minimal (curl + API REST, sans SDK Composer — cohérent avec
// admin-auth/github_client.php). La clé ne quitte jamais le serveur.

const STRIPE_API_BASE = 'https://api.stripe.com/v1';

function stripe_configured(): bool {
    return defined('STRIPE_SECRET_KEY') && STRIPE_SECRET_KEY !== '';
}

/**
 * Appel Stripe REST. $params est un tableau PHP, envoyé en application/x-www-form-urlencoded
 * (http_build_query gère nativement la notation "a[b][c]=" attendue par Stripe pour les
 * paramètres imbriqués, ex: line_items[0][price_data][currency]).
 */
function stripe_call(string $method, string $path, array $params = []): array {
    if (!stripe_configured()) {
        throw new RuntimeException('STRIPE_SECRET_KEY absent de config.php.');
    }
    $url = STRIPE_API_BASE . $path;
    $ch = curl_init();
    $opts = [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . STRIPE_SECRET_KEY],
        CURLOPT_USERAGENT => 'BCCO-Reservations',
    ];
    if ($method === 'GET' && $params) {
        $url .= '?' . http_build_query($params);
    } elseif ($params) {
        $opts[CURLOPT_POSTFIELDS] = http_build_query($params);
    }
    $opts[CURLOPT_URL] = $url;
    curl_setopt_array($ch, $opts);
    $response = curl_exec($ch);
    if ($response === false) {
        $err = curl_error($ch);
        throw new RuntimeException('Erreur réseau Stripe : ' . $err);
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    return [$status, json_decode($response, true)];
}

/**
 * Crée une session Stripe Checkout (mode paiement unique) pour une réservation.
 * $amountEuros : montant en euros (converti en centimes pour Stripe).
 */
function stripe_create_checkout_session(array $opts): array {
    $params = [
        'mode' => 'payment',
        'success_url' => $opts['success_url'],
        'cancel_url' => $opts['cancel_url'],
        'customer_email' => $opts['email'],
        'line_items' => [[
            'quantity' => 1,
            'price_data' => [
                'currency' => 'eur',
                'unit_amount' => (int) round($opts['amount_euros'] * 100),
                'product_data' => [
                    'name' => $opts['label'],
                ],
            ],
        ]],
        'metadata' => $opts['metadata'] ?? [],
    ];
    return stripe_call('POST', '/checkout/sessions', $params);
}

function stripe_retrieve_checkout_session(string $sessionId): array {
    return stripe_call('GET', '/checkout/sessions/' . rawurlencode($sessionId));
}

function stripe_create_refund(string $paymentIntentId): array {
    return stripe_call('POST', '/refunds', ['payment_intent' => $paymentIntentId]);
}

/**
 * Vérifie la signature d'un webhook Stripe (implémentation manuelle du schéma documenté
 * par Stripe : hash_hmac('sha256', "$timestamp.$payload", secret), tolérance 5 minutes).
 */
function stripe_verify_webhook_signature(string $payload, string $sigHeader, string $secret): bool {
    $parts = [];
    foreach (explode(',', $sigHeader) as $part) {
        [$k, $v] = array_pad(explode('=', $part, 2), 2, null);
        $parts[$k][] = $v;
    }
    if (empty($parts['t'][0]) || empty($parts['v1'])) return false;
    $timestamp = (int) $parts['t'][0];
    if (abs(time() - $timestamp) > 300) return false; // tolérance 5 min (anti-rejeu)

    $signedPayload = $timestamp . '.' . $payload;
    $expected = hash_hmac('sha256', $signedPayload, $secret);

    foreach ($parts['v1'] as $sig) {
        if (hash_equals($expected, $sig)) return true;
    }
    return false;
}
