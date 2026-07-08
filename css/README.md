# css/ — Feuilles de style

## Actif : `rd.css`

**Toutes les pages publiques actuelles** (`index.html`, `galerie.html`, `reservations.html`, `mentions-legales.html`, `politique-confidentialite.html`) chargent uniquement `css/rd.css` (~315 lignes). L'interface admin (`admin-bcco-fe732ff3.php`) a ses styles en inline dans la page, pas de dépendance à ce dossier.

`rd.css` est le CSS du design actuel (« rd- », pour les scripts `rd-*.js` associés). Beaucoup de mise en forme du site vit aussi en inline directement dans le HTML (choix du design actuel, pas d'erreur) — `rd.css` couvre surtout la nav, les carrousels, la nav pill mobile, le menu plein écran et quelques composants partagés.

## Legacy : `styles.css` + `css/_*.css` (non chargés par aucune page)

Le fichier `styles.css` (racine du repo) et les ~15 modules ci-dessous (`_base.css`, `_layout.css`, `_home-sections.css`, `_section-equipes.css`, `_salle.css`, `_salle-editorial.css`, `_flamme-paralympique.css`, `_actualites-roster.css`, `_responsive.css`, `_bottom-nav.css`, `_planning-mobile.css`, `_faq.css`, `_contact-buttons.css`, `_animations.css`, `_mobile-optim.css`) documentaient une **précédente version du site**, avant la refonte « rd- ». Aucune page actuelle ne les charge (`grep -rl 'href="styles.css"' *.html *.php` ne remonte rien).

Ils n'ont pas été supprimés du repo, mais peuvent l'être en toute sécurité — à confirmer avant suppression si une future refonte compte les réutiliser comme base.

## Build (production)

`scripts/build.js` minifie tout le HTML/CSS/JS en un dossier `dist/` (CI : `.github/workflows/build.yml`). Le déploiement o2switch actuel n'utilise **pas** ce `dist/` (il sert directement la racine du repo via FTP) — voir `scripts/README.md`.
