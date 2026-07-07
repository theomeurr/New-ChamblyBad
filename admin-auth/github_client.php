<?php
declare(strict_types=1);

// Client GitHub partagé par gh_proxy.php, history.php, export_data.php.
// Le token (GITHUB_TOKEN) vient de config.php et ne quitte jamais le serveur.

const GH_REPO_OWNER  = 'theomeurr';
const GH_REPO_NAME   = 'New-ChamblyBad';
const GH_REPO_BRANCH = 'main';
const GH_API_BASE    = 'https://api.github.com';

function gh_call(string $method, string $url, ?array $body = null): array {
    if (!defined('GITHUB_TOKEN') || GITHUB_TOKEN === '') {
        throw new RuntimeException('GITHUB_TOKEN absent de config.php.');
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . GITHUB_TOKEN,
            'Accept: application/vnd.github+json',
            'X-GitHub-Api-Version: 2022-11-28',
            'User-Agent: BCCO-Admin',
        ],
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }
    $response = curl_exec($ch);
    if ($response === false) {
        $err = curl_error($ch);
        throw new RuntimeException('Erreur réseau GitHub : ' . $err);
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    return [$status, json_decode($response, true)];
}

function gh_contents_url(string $path): string {
    $encoded = implode('/', array_map('rawurlencode', explode('/', $path)));
    return GH_API_BASE . '/repos/' . GH_REPO_OWNER . '/' . GH_REPO_NAME . '/contents/' . $encoded;
}
