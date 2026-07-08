# partials/

Ce dossier ne contient plus que ce README. Il hébergeait auparavant
`head-common.html`, un fragment `<head>` partagé propagé dans chaque
page publique par `scripts/sync-head.py` (vérifié en CI par
`.github/workflows/check-head-sync.yml`).

Ce système a été retiré : `head-common.html` référençait des scripts
d'une précédente version du site (`nav-mega.js`, `nav-pill.js`,
`animations.js`), remplacés depuis par `rd-ui.js`/`rd-mobile.js` lors
de la refonte « rd- ». Aucune page publique n'avait les marqueurs
`HEAD:COMMON-START`/`END` attendus par le script — le check CI était
rouge en permanence, pas à cause d'une régression récente.

Chaque page publique gère aujourd'hui son propre `<head>`
indépendamment (pas de fragment partagé synchronisé automatiquement).
