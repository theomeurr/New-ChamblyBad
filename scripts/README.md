# Scripts

## `serve.py` — Preview locale

```bash
python3 scripts/serve.py 8000
# puis ouvrir http://localhost:8000/
```

Sert le repo en HTTP statique. Contourne un souci connu de `python3 -m http.server` : sur certains environnements sandboxés, l'évaluation de `os.getcwd()` (utilisée par défaut pour `--directory`) échoue. `serve.py` passe une directory absolue explicitement et utilise `ThreadingHTTPServer`.

Ne sert que du HTML/CSS/JS/CSV statiques — les pages PHP (`admin-auth/`, `reservations-api/`) nécessitent un vrai serveur PHP pour être testées (`php -S localhost:8000`, avec un `admin-auth/config.php` pointant vers une base MySQL locale ou de test).

## `build.js` — Minification HTML/CSS/JS

Produit un dossier `dist/` minifié.

```bash
npm install     # installe html-minifier-terser et clean-css (1ʳᵉ fois)
npm run build   # crée dist/ avec tout le site minifié
npm run clean   # supprime dist/
```

- `*.html` → minifie HTML, CSS inline et JS inline en un seul passage
- `styles.css` → minifie via clean-css niveau 2 (fichier legacy, non chargé par les pages actuelles — voir `css/README.md`)
- `*.json`, `*.csv`, `media/*`, `docs/*` → copiés tels quels
- Skip : `node_modules/`, `dist/`, `.git/`, `.claude/`, le PDF de doc, etc.

Le workflow `.github/workflows/build.yml` lance ce build à chaque push/PR sur `main` et publie `dist/` comme artifact GitHub (téléchargeable 14 jours) — **ce n'est pas ce `dist/` qui est déployé** : le déploiement o2switch ([`.github/workflows/deploy-o2switch-sandbox.yml`](../.github/workflows/deploy-o2switch-sandbox.yml)) synchronise la racine du repo telle quelle via FTP, indépendamment de ce build.

## `admin-db/schema.sql` — Schéma MySQL

Tables `admins` (comptes admin) et `reservations` (réservations de terrains). À exécuter dans phpMyAdmin lors de la création/mise à jour de la base — voir la section « Comptes admin » et « Réservations en ligne » du README racine.

## `google-apps-script/inscription-backend.gs`

Script Google Apps Script préparé pour un futur formulaire de pré-inscription (webhook → Google Sheets), voir `docs/setup-inscription-backend.md`. **Pas encore branché à une page** — le fichier `inscription.html` qu'il référence n'existe pas dans le repo actuel. Système distinct de celui des réservations de terrains (qui utilise MySQL + PHP, pas Google Sheets).
