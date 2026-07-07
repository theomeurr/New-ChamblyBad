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
