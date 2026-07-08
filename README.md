# BCCO — Badminton Club Chambly Oise

Site du **Badminton Club Chambly Oise** (BCCO), 8× Champion de France Top 12.

Frontend HTML/CSS/JS (contenu éditorial piloté par des CSV dans le dépôt) + backend PHP/MySQL pour l'admin et les réservations en ligne.

Projet commencé le lundi 20 avril 2026.

---

## Pages

| Fichier | Contenu |
|---------|---------|
| `index.html` | Accueil : actualités, Top 12, interclubs, équipes, salle de fitness, horaires, documents d'inscription |
| `galerie.html` | Galerie photos |
| `reservations.html` | Réservation de terrains (créneaux, tarifs, paiement) |
| `reservations-merci.html` | Confirmation après paiement Stripe |
| `mentions-legales.html` | Mentions légales |
| `politique-confidentialite.html` | Politique de confidentialité |
| `admin-bcco-fe732ff3.php` | Interface admin (accès protégé par login, voir plus bas) |
| `aide-admin.html` | Guide d'utilisation de l'admin |

Il n'y a pas de page `equipes.html` séparée — les équipes sont une section de `index.html` (`#equipes`).

---

## Architecture

- **Contenu éditorial** (actus, effectifs, classement, réservations ouvertes/tarifs...) : fichiers **CSV dans `data/`**, édités depuis l'admin ou directement sur GitHub, déployés tels quels.
- **Comptes admin** et **réservations** (données transactionnelles) : **MySQL**, via un backend **PHP** hébergé sur o2switch — voir [`admin-auth/`](admin-auth/) et [`reservations-api/`](reservations-api/).
- **Édition GitHub** : les admins n'ont pas besoin de compte GitHub personnel. Un token unique, stocké côté serveur (`admin-auth/config.php`), est utilisé par un proxy (`admin-auth/gh_proxy.php`) pour committer les modifications de contenu au nom du club.

### Modifier le contenu éditorial (CSV)

Depuis l'admin (recommandé) ou directement sur GitHub :

| Contenu | Fichier à éditer |
|---------|-----------------|
| Actualités | `data/actualites.csv` |
| Annonce (bandeau du site) | `data/annonce.json` |
| Effectif Top 12 | `data/top12.csv` |
| Interclubs — poules | `data/poules.csv` |
| Interclubs — journées / résultats | `data/journees.csv` |
| Classement (métadonnées saison) | `data/classement-meta.csv` |
| Galerie photos | `data/galerie.csv` |
| Créneaux réservables | `data/reservations/creneaux_ouverts.csv` |
| Créneaux bloqués (événements club) | `data/reservations/creneaux_bloques.csv` |
| Licenciés (vérification tarif réduit) | `data/reservations/licencies.csv` |
| Config réservation (tarifs, nb terrains…) | `data/reservations/config.csv` |

`data/bcco_reservations_2026-04-20.csv` est un jeu de données factice (format différent), pas consommé par le site.

### Comptes admin

Gérés en base MySQL (table `admins`) : identifiant, mot de passe (bcrypt), rôle `admin` ou `super`, verrouillage anti-bruteforce côté serveur, date de dernière connexion.

- **Admin** : accès complet au contenu du dashboard.
- **Super admin** : en plus, accès à **"Gérer les accès"** (créer/révoquer des comptes, réinitialiser un mot de passe), à l'**historique des modifications** (commits GitHub récents) et à l'**export de sauvegarde** (zip de `data/`).

Un super-admin crée les comptes des autres depuis le dashboard — aucune création manuelle en base n'est nécessaire après le tout premier compte.

### Réservations en ligne & paiement

Le formulaire de `reservations.html` interroge en temps réel [`reservations-api/availability.php`](reservations-api/availability.php) (croise les CSV de config/créneaux avec la table MySQL `reservations`, pour un compte de places toujours à jour). La réservation elle-même passe par [`reservations-api/create_checkout.php`](reservations-api/create_checkout.php) :

1. Revalidation serveur du créneau et du tarif (jamais de confiance dans ce qu'envoie le navigateur).
2. Vérification CAPTCHA (Cloudflare Turnstile — sautée tant que non configurée).
3. Insertion d'une réservation `pending` en base, verrou MySQL par date pour éviter le double-comptage entre deux requêtes simultanées.
4. Création d'une session **Stripe Checkout** (mode test tant que `STRIPE_SECRET_KEY` n'est pas une clé réelle).

Le paiement est confirmé par [`reservations-api/stripe_webhook.php`](reservations-api/stripe_webhook.php) (signature Stripe vérifiée manuellement, sans SDK), qui passe la réservation en `confirmed`. Côté admin, la liste des réservations et l'annulation (avec tentative de remboursement Stripe) sont dans `admin-auth/reservations_list.php` / `reservations_cancel.php`.

**Tant que `STRIPE_SECRET_KEY` est vide** dans `admin-auth/config.php`, tout le parcours fonctionne jusqu'à l'étape de paiement, qui échoue proprement avec un message clair — aucune réservation fantôme n'est créée.

---

## Structure du dépôt

```
site-nouveau-design/
├── index.html
├── galerie.html
├── reservations.html
├── reservations-merci.html
├── mentions-legales.html
├── politique-confidentialite.html
├── admin-bcco-fe732ff3.php         # URL privée — ne pas partager
├── aide-admin.html
├── sw.js                           # Service Worker (cache PWA) — bump CACHE_VERSION à chaque déploiement visible
├── manifest.json                   # PWA manifest
├── pwa.js                          # Enregistrement du SW
├── sitemap.xml
├── robots.txt
│
├── css/
│   └── rd.css                      # Feuille de style active, chargée par toutes les pages publiques
│                                    # (l'ancien styles.css + ses ~15 modules css/_*.css ne sont plus chargés
│                                    #  par aucune page — legacy non nettoyé, voir css/README.md)
│
├── js/                             # Un fichier par fonctionnalité, voir js/README.md pour le détail
│   ├── rd-ui.js / rd-mobile.js     # UI + nav partagées (toutes pages publiques)
│   ├── rd-accueil.js               # Interactions accueil (tarifs, filtre documents, compteurs)
│   ├── rd-galerie.js               # Galerie
│   ├── rd-reservations.js          # Réservation + paiement
│   ├── admin*.js                   # Modules de l'interface admin
│   └── ...                         # Scripts spécifiques par section de l'accueil
│
├── admin-auth/                     # Backend PHP : auth admin, proxy GitHub, gestion réservations
│   ├── config.php                  # Secrets serveur — JAMAIS committé (voir config.example.php)
│   ├── auth.php                    # Session PHP, hash bcrypt, verrouillage anti-bruteforce
│   ├── login.php / logout.php
│   ├── manage_users.php            # Gestion des comptes (super-admin)
│   ├── gh_proxy.php + github_client.php   # Proxy GitHub centralisé (lecture/écriture CSV)
│   ├── history.php                 # Historique des commits GitHub
│   ├── export_data.php             # Export zip de data/
│   ├── reservations_list.php / reservations_cancel.php
│
├── reservations-api/                # Backend PHP public (pas de login requis) : réservation + paiement
│   ├── reservations_lib.php        # Lecture CSV config/créneaux + calculs tarifs/disponibilité
│   ├── availability.php            # Disponibilités temps réel (GET)
│   ├── create_checkout.php         # Création réservation + session Stripe (POST)
│   ├── stripe_client.php           # Client Stripe REST (curl, sans SDK)
│   ├── stripe_webhook.php          # Confirmation de paiement (appelé par Stripe)
│   └── session_status.php          # Statut d'une session pour reservations-merci.html
│
├── data/                           # Contenu éditorial (CSV/JSON, édités via l'admin ou GitHub)
│   ├── actualites.csv
│   ├── annonce.json
│   ├── top12.csv
│   ├── poules.csv
│   ├── journees.csv
│   ├── classement-meta.csv
│   ├── galerie.csv
│   └── reservations/
│       ├── config.csv
│       ├── creneaux_ouverts.csv
│       ├── creneaux_bloques.csv
│       └── licencies.csv
│
├── media/                          # Images et icônes (WebP optimisé)
├── docs/                           # PDFs (formulaires, règlement…)
├── partials/                       # Fragments HTML (voir partials/README.md)
└── scripts/                        # Build, DB, preview locale — voir scripts/README.md
    ├── build.js
    ├── serve.py
    ├── admin-db/schema.sql
    └── google-apps-script/inscription-backend.gs
```

---

## Déploiement

### Production/bac à sable — o2switch (FTP)
Un workflow GitHub Actions ([`.github/workflows/deploy-o2switch-sandbox.yml`](.github/workflows/deploy-o2switch-sandbox.yml)) synchronise le dépôt vers l'hébergement o2switch via FTP à chaque push sur `main` (`dangerous-clean-slate: false` — ne supprime jamais un fichier absent du repo, ça protège `admin-auth/config.php`, jamais committé).

Après chaque déploiement qui change du contenu visible (HTML/CSS/JS), pensez à **incrémenter `CACHE_VERSION` dans `sw.js`** — sinon le service worker PWA peut continuer à servir l'ancienne version en cache pendant un ou deux rechargements.

### Lancer en local
```bash
python3 scripts/serve.py 8000
# puis ouvrir http://localhost:8000/
```
`scripts/serve.py` contourne un souci connu de `python3 -m http.server` (évaluation de `os.getcwd()` qui échoue dans certains environnements sandboxés). Alternative simple si ce n'est pas un souci chez vous : `python3 -m http.server 8000`, `npx serve`, `php -S localhost:8000`.

> **Note :** ouvrir les fichiers directement (`file://`) peut bloquer le chargement des CSV locaux à cause des règles CORS du navigateur. Les pages PHP (`admin-auth/`, `reservations-api/`) nécessitent un serveur PHP (`php -S localhost:8000`) pour être testées, un serveur statique ne suffit pas.

---

## Interface admin

**URL** : `admin-bcco-fe732ff3.php` (slug privé — ne pas publier)
**Protection** : session PHP + mot de passe hashé bcrypt en MySQL, verrouillage après 5 tentatives échouées (30 min), côté serveur — pas contournable depuis la console du navigateur.

L'admin permet de :
- Éditer actualités, annonce, effectif Top 12, interclubs, galerie, photos d'équipes
- Gérer les réservations de terrains (liste, annulation avec remboursement Stripe)
- Gérer les accès admin (super-admin)
- Consulter l'historique des modifications et exporter une sauvegarde (super-admin)

---

## PWA

Le site est installable en tant qu'application (PWA) sur iOS et Android grâce au `manifest.json` et au service worker `sw.js`.
Stratégies : **network-first** pour HTML/CSV/JSON, **stale-while-revalidate** pour CSS/JS/fonts, **cache-first** pour les images.
Version du cache : voir `CACHE_VERSION` dans `sw.js` — **à incrémenter à chaque déploiement qui change du HTML/CSS/JS visible**, sinon les visiteurs récurrents (et vous, en train de vérifier un déploiement) peuvent voir l'ancienne version pendant un ou deux rechargements.

---

## ⚠️ RGPD — Licenciés

Le fichier `data/reservations/licencies.csv` est **accessible publiquement** (fichier statique), et lu côté serveur par `reservations-api/` pour la vérification de tarif réduit.
Il ne doit contenir que des données de démonstration tant qu'il n'est pas déplacé vers un stockage non public (ex: table MySQL, comme `admins`/`reservations`).
Voir `politique-confidentialite.html`.
