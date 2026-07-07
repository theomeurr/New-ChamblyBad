<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/github_client.php';

// Proxy GitHub Contents API : le token GitHub reste côté serveur (config.php,
// constante GITHUB_TOKEN), jamais exposé au navigateur. Seule la session PHP
// (login MySQL) protège l'écriture — cohérent avec le reste de l'admin.

$currentAdmin = require_login();

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $path = $_GET['path'] ?? '';
        if ($path === '') {
            http_response_code(400);
            echo json_encode(['error' => 'path requis']);
            exit;
        }
        [$status, $data] = gh_call('GET', gh_contents_url($path) . '?ref=' . GH_REPO_BRANCH);
        if ($status === 404) {
            http_response_code(404);
            echo json_encode(['error' => 'Fichier introuvable : ' . $path]);
            exit;
        }
        if ($status !== 200) {
            http_response_code($status);
            echo json_encode(['error' => $data['message'] ?? ('HTTP ' . $status)]);
            exit;
        }
        $bytes = base64_decode(str_replace("\n", '', $data['content']));
        echo json_encode(['content' => $bytes, 'sha' => $data['sha'], 'path' => $path]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $path = $input['path'] ?? '';
        $content = $input['content'] ?? null; // déjà en base64 (texte ou image)
        $message = $input['message'] ?? ('Mise à jour ' . $path);
        $sha = $input['sha'] ?? null;

        if ($path === '' || $content === null) {
            http_response_code(400);
            echo json_encode(['error' => 'path et content requis']);
            exit;
        }

        $message .= ' (par ' . $currentAdmin['label'] . ')';

        $body = ['message' => $message, 'content' => $content, 'branch' => GH_REPO_BRANCH];
        if ($sha) $body['sha'] = $sha;

        [$status, $data] = gh_call('PUT', gh_contents_url($path), $body);

        // Auto-recovery : sha manquant ou obsolète → on récupère le sha actuel et on retente une fois.
        if (in_array($status, [409, 422], true)) {
            [$checkStatus, $checkData] = gh_call('GET', gh_contents_url($path) . '?ref=' . GH_REPO_BRANCH);
            if ($checkStatus === 200 && !empty($checkData['sha'])) {
                $body['sha'] = $checkData['sha'];
                [$status, $data] = gh_call('PUT', gh_contents_url($path), $body);
            }
        }

        if ($status < 200 || $status >= 300) {
            http_response_code($status);
            echo json_encode(['error' => $data['message'] ?? ('HTTP ' . $status)]);
            exit;
        }

        $rawUrl = 'https://raw.githubusercontent.com/' . GH_REPO_OWNER . '/' . GH_REPO_NAME . '/' . GH_REPO_BRANCH . '/' . $path;
        echo json_encode(['sha' => $data['content']['sha'] ?? null, 'rawUrl' => $rawUrl, 'localUrl' => './' . $path, 'path' => $path]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Méthode non supportée']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
