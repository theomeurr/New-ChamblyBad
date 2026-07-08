<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/github_client.php';

$currentAdmin = require_login();
header('Content-Type: application/json');

const DEPLOY_WORKFLOW = 'deploy-o2switch-sandbox.yml';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    ob_clean();
    echo json_encode(['error' => 'Méthode non supportée.']);
    exit;
}

try {
    $url = GH_API_BASE . '/repos/' . GH_REPO_OWNER . '/' . GH_REPO_NAME
        . '/actions/workflows/' . DEPLOY_WORKFLOW . '/dispatches';
    [$status, $data] = gh_call('POST', $url, ['ref' => GH_REPO_BRANCH]);

    // GitHub répond 204 (sans corps) en cas de succès sur cet endpoint.
    if ($status !== 204) {
        http_response_code($status);
        $msg = $data['message'] ?? ('HTTP ' . $status);
        if ($status === 403 || $status === 404) {
            $msg .= " — vérifiez que le token GitHub (config.php) a bien la permission "
                  . "\"Actions: Read and write\" (Settings → Developer settings → "
                  . "Fine-grained tokens, sur le token utilisé).";
        }
        ob_clean();
        echo json_encode(['error' => $msg]);
        exit;
    }

    ob_clean();
    echo json_encode(['ok' => true, 'triggered_by' => $currentAdmin['label']]);
} catch (Throwable $e) {
    http_response_code(500);
    ob_clean();
    echo json_encode(['error' => $e->getMessage()]);
}
