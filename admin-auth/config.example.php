<?php
// Copiez ce fichier en "config.php" (même dossier) et remplissez avec les
// informations notées lors de la création de la base MySQL dans cPanel.
//
// NE JAMAIS committer config.php dans git — il est déjà ignoré (.gitignore).

define('DB_HOST', 'localhost');
define('DB_NAME', 'XXXX_bcco_admin');
define('DB_USER', 'XXXX_bcco_admin_user');
define('DB_PASS', 'REMPLACER_PAR_LE_MOT_DE_PASSE_GENERE_CPANEL');

// Token GitHub fine-grained (scope Contents: Read and write, limité à ce repo).
// Reste uniquement sur le serveur — jamais transmis au navigateur.
// Voir github.com/settings/personal-access-tokens/new
define('GITHUB_TOKEN', 'REMPLACER_PAR_UN_TOKEN_GITHUB_FINE-GRAINED');

// Stripe (mode test d'abord : clés sk_test_... / whsec_...) — Developers → API keys.
// Tant que vide, la réservation fonctionne jusqu'à l'étape paiement puis affiche
// une erreur claire "paiement pas encore configuré" (pas de crash).
define('STRIPE_SECRET_KEY', '');
// Généré par Stripe lors de la création du endpoint webhook (Developers → Webhooks
// → Add endpoint → URL : https://votredomaine/reservations-api/stripe_webhook.php
// → événements : checkout.session.completed, checkout.session.expired).
define('STRIPE_WEBHOOK_SECRET', '');

// Cloudflare Turnstile (CAPTCHA du formulaire de réservation) — dash.cloudflare.com
// → Turnstile → Add site. Tant que vide, la vérification est simplement sautée
// (pas de blocage), utile pour tester avant d'avoir les clés.
define('TURNSTILE_SECRET_KEY', '');
