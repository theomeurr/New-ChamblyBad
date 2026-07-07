<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/github_client.php';

$currentAdmin = require_login();
header('Content-Type: application/json');

if ($currentAdmin['role'] !== 'super') {
    http_response_code(403);
    ob_clean(); echo json_encode(['error' => 'Accès réservé au super-admin.']);
    exit;
}

try {
    $url = GH_API_BASE . '/repos/' . GH_REPO_OWNER . '/' . GH_REPO_NAME . '/commits?sha=' . GH_REPO_BRANCH . '&per_page=25';
    [$status, $data] = gh_call('GET', $url);
    if ($status !== 200 || !is_array($data)) {
        http_response_code($status);
        ob_clean(); echo json_encode(['error' => $data['message'] ?? ('HTTP ' . $status)]);
        exit;
    }
    $commits = array_map(function ($c) {
        return [
            'message' => explode("\n", trim($c['commit']['message'] ?? ''))[0],
            'date'    => $c['commit']['author']['date'] ?? '',
            'url'     => $c['html_url'] ?? '',
            'sha'     => substr($c['sha'] ?? '', 0, 7),
        ];
    }, $data);
    ob_clean(); echo json_encode(['commits' => $commits]);
} catch (Throwable $e) {
    http_response_code(500);
    ob_clean(); echo json_encode(['error' => $e->getMessage()]);
}
