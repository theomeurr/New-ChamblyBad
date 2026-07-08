<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/github_client.php';

require_login();
header('Content-Type: application/json');

const DEPLOY_WORKFLOW = 'deploy-o2switch-sandbox.yml';

try {
    $url = GH_API_BASE . '/repos/' . GH_REPO_OWNER . '/' . GH_REPO_NAME
        . '/actions/workflows/' . DEPLOY_WORKFLOW . '/runs?per_page=1';
    [$status, $data] = gh_call('GET', $url);

    if ($status !== 200 || empty($data['workflow_runs'])) {
        http_response_code($status === 200 ? 404 : $status);
        ob_clean();
        echo json_encode(['error' => $data['message'] ?? 'Aucun déploiement trouvé.']);
        exit;
    }

    $run = $data['workflow_runs'][0];
    ob_clean();
    echo json_encode([
        'id' => $run['id'],
        'status' => $run['status'],
        'conclusion' => $run['conclusion'],
        'created_at' => $run['created_at'],
        'html_url' => $run['html_url'],
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    ob_clean();
    echo json_encode(['error' => $e->getMessage()]);
}
