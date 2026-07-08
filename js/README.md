# js/ — Scripts JavaScript

Chaque fichier correspond à une fonctionnalité ou une page.
Chargés directement via `<script defer>` dans le HTML — aucun bundler.

## Partagés (toutes les pages publiques : index, galerie, reservations, mentions-légales, politique-confidentialité)

| Fichier | Rôle |
|---------|------|
| `rd-ui.js` | UI partagée (hover, comportements communs du design actuel) |
| `rd-mobile.js` | Nav pill mobile flottante, menu plein écran, installation PWA, carrousels `.rd-carousel`, lightbox |
| `pwa.js` | Enregistrement du service worker, auto-update + reload à la détection d'une nouvelle version |

## Page d'accueil (`index.html`)

| Fichier | Rôle |
|---------|------|
| `rd-accueil.js` | Bascule tarifs Jeunes/Adultes, filtre documents Majeur/Mineur, compteurs animés au scroll |
| `actus-expand.js` | Agrandissement des actualités |
| `journees-toggle.js` | Bouton « Voir les journées » (interclubs) |
| `top12-load.js` | Effectif Top 12 de l'accueil (piloté par `data/top12.csv`) |
| `interclubs-load.js` | Poules & journées de l'accueil (pilotées par `data/poules.csv` / `data/journees.csv`) |
| `fitness-carousel.js` | Carrousel photos de la salle de fitness |

## Pages secondaires

| Fichier | Page | Rôle |
|---------|------|------|
| `rd-galerie.js` | `galerie.html` | Galerie pilotée par `data/galerie.csv` |
| `rd-reservations.js` | `reservations.html` | Disponibilités temps réel (`reservations-api/availability.php`), formulaire de réservation, CAPTCHA Turnstile, redirection Stripe Checkout |

## Interface admin (`admin-bcco-fe732ff3.php`)

| Fichier | Rôle |
|---------|------|
| `admin.js` | Aperçu réservations (liste/annulation via `admin-auth/`), historique des modifications, aperçu actualités |
| `admin-github.js` | Lecture/écriture de fichiers via le proxy GitHub serveur (`admin-auth/gh_proxy.php`) |
| `admin-actus.js` | Édition directe des actualités |
| `admin-annonce.js` | Éditeur du bandeau d'annonce du site |
| `admin-top12.js` | Éditeur de l'effectif Top 12 (`data/top12.csv`) |
| `admin-interclubs.js` | Éditeur Poules & Journées (interclubs Top 12) |
| `admin-equipes.js` | Photos des cartes équipes de l'accueil |
| `admin-galerie.js` | Gestion complète de la galerie photos |
| `admin-image-converter.js` | Convertisseur JPEG/PNG → WebP |
| `admin-diagnostic.js` | Diagnostic santé des données CSV |

## Fichiers orphelins (présents dans le repo, chargés par aucune page)

Reliquats d'itérations précédentes du site, jamais nettoyés après la refonte « rd- » :
`actualites.js`, `rencontres.js`, `roster.js`, `home-init.js`, `home-voir-plus.js`, `home-scroll-reveal.js`,
`equipes.js`, `rd-equipes.js`, `galerie-init.js`, `galerie-bn.js`, `galerie-load.js`,
`reservations.js`, `next-match-banner.js`, `annonce-banner.js`, `contact.js`, `faq.js`.
À vérifier avant suppression (certains peuvent être repris ultérieurement), mais aucun n'est actuellement chargé par une page — vérifiable par `grep -rl "nom-du-fichier"` sur les `.html`/`.php`.

## Pourquoi des fichiers externes ?

- **Cache navigateur** : non re-téléchargés à chaque navigation entre pages
- **Maintenance** : éditer un `.js` dédié plutôt que de naviguer dans 2000 lignes de HTML
- **Diffs Git lisibles** : les modifications JS ne polluent pas les diffs HTML
