<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/github_client.php';

$currentAdmin = require_login();
if ($currentAdmin['role'] !== 'super') {
    http_response_code(403);
    exit('Accès réservé au super-admin.');
}

function gh_list_files(string $dir): array {
    [$status, $items] = gh_call('GET', gh_contents_url($dir) . '?ref=' . GH_REPO_BRANCH);
    if ($status !== 200 || !is_array($items)) return [];
    $files = [];
    foreach ($items as $item) {
        if (($item['type'] ?? '') === 'file') {
            $files[] = $item['path'];
        } elseif (($item['type'] ?? '') === 'dir') {
            $files = array_merge($files, gh_list_files($item['path']));
        }
    }
    return $files;
}

if (!class_exists('ZipArchive')) {
    http_response_code(500);
    exit('Extension PHP ZipArchive indisponible sur ce serveur.');
}

$paths = gh_list_files('data');
if (!$paths) {
    http_response_code(500);
    exit('Aucun fichier trouvé dans data/.');
}

$tmpZip = tempnam(sys_get_temp_dir(), 'bcco_export_');
$zip = new ZipArchive();
$zip->open($tmpZip, ZipArchive::OVERWRITE);

foreach ($paths as $path) {
    [$status, $data] = gh_call('GET', gh_contents_url($path) . '?ref=' . GH_REPO_BRANCH);
    if ($status === 200 && isset($data['content'])) {
        $bytes = base64_decode(str_replace("\n", '', $data['content']));
        $zip->addFromString($path, $bytes);
    }
}
$zip->close();

$filename = 'bcco-export-' . date('Y-m-d_His') . '.zip';
header('Content-Type: application/zip');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($tmpZip));
ob_clean(); // le zip est un flux binaire : tout warning bufferé avant ce point le corromprait
readfile($tmpZip);
unlink($tmpZip);
