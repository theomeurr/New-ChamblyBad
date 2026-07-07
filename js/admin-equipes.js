/* ============================================================
   admin-equipes.js — Photos des cartes équipes de l'accueil
   Remplace directement media/top12_equipe.webp et
   media/n2_equipe.webp via l'API GitHub (même mécanique que
   l'effectif Top 12 : BccoGithub.uploadImage). Upload immédiat.
   Se monte dans #equipesSlot une fois le dashboard visible.
   ============================================================ */
(function () {
  'use strict';

  var SLOT_ID = 'equipesSlot';
  var TEAMS = [
    { key: 'top12', label: 'Top 12', sub: 'Carte « Compétition » · élite nationale', path: 'media/top12_equipe.webp' },
    { key: 'n2',    label: 'Prénationale', sub: 'Carte « Compétition » · championnat de France', path: 'media/n2_equipe.webp' }
  ];

  var ICON_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></svg>';

  function injectCSS() {
    if (document.getElementById('ae-css')) return;
    var s = document.createElement('style');
    s.id = 'ae-css';
    s.textContent = [
      '.ae-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}',
      '.ae-card{border:1px solid var(--line,rgba(10,25,136,.1));border-radius:14px;overflow:hidden;background:#fff}',
      '.ae-photo{aspect-ratio:16/10;background:#0B1130}',
      '.ae-photo img{width:100%;height:100%;object-fit:cover;display:block}',
      '.ae-body{padding:14px 16px 16px}',
      '.ae-name{font-weight:800;font-size:16px;color:var(--text,#0B1130)}',
      '.ae-sub{font-size:12px;color:var(--muted,#5A6380);margin:2px 0 12px}',
      '.ae-btn{display:inline-flex;align-items:center;gap:8px;cursor:pointer;background:var(--secondary,#0A1988);color:#fff;border-radius:10px;padding:10px 16px;font-weight:700;font-size:13px}',
      '.ae-btn:hover{background:#060B3C}',
      '.ae-btn svg{width:16px;height:16px;flex:0 0 auto}',
      '.ae-status{font-size:12px;margin-top:10px;min-height:16px}',
      '.ae-status.busy{color:var(--secondary,#0A1988)}',
      '.ae-status.ok{color:#137a2e}',
      '.ae-status.err{color:#c0392b}'
    ].join('');
    document.head.appendChild(s);
  }

  function bust(path) { return path + '?v=' + Date.now().toString(36); }

  function render() {
    var slot = document.getElementById(SLOT_ID);
    if (!slot) return;
    slot.innerHTML = '<div class="ae-grid">' + TEAMS.map(function (t) {
      return '<div class="ae-card">'
        + '<div class="ae-photo"><img id="ae-img-' + t.key + '" src="' + bust(t.path) + '" alt="' + t.label + '" onerror="this.style.opacity=.25"/></div>'
        + '<div class="ae-body">'
        +   '<div class="ae-name">' + t.label + '</div>'
        +   '<div class="ae-sub">' + t.sub + '</div>'
        +   '<label class="ae-btn">' + ICON_UP + 'Remplacer la photo'
        +     '<input type="file" accept="image/*" data-team="' + t.key + '" style="display:none"/></label>'
        +   '<div class="ae-status" id="ae-status-' + t.key + '"></div>'
        + '</div></div>';
    }).join('') + '</div>';
    Array.prototype.forEach.call(slot.querySelectorAll('input[type=file]'), function (inp) {
      inp.addEventListener('change', onPick);
    });
  }

  async function onPick(e) {
    var input = e.currentTarget;
    var key = input.getAttribute('data-team');
    var team = TEAMS.filter(function (t) { return t.key === key; })[0];
    var file = input.files && input.files[0];
    input.value = '';
    if (!team || !file) return;
    var status = document.getElementById('ae-status-' + key);
    var img = document.getElementById('ae-img-' + key);
    try {
      if (!file.type || file.type.indexOf('image/') !== 0) throw new Error('Ce fichier n’est pas une image.');
      status.textContent = 'Publication en cours…';
      status.className = 'ae-status busy';
      img.src = URL.createObjectURL(file); // aperçu immédiat
      var res = await BccoGithub.uploadImage(file, team.path, 'Photo équipe : ' + team.label, { maxDim: 1600, quality: 0.85 });
      img.src = (res && res.rawUrl ? res.rawUrl : team.path) + '?v=' + Date.now().toString(36);
      status.textContent = '✓ Publié — visible sur le site sous ~1 min';
      status.className = 'ae-status ok';
      if (window.BccoGithub) BccoGithub.toast('Photo ' + team.label + ' publiée !', 'ok');
    } catch (err) {
      var m = err && err.message ? err.message : String(err);
      status.textContent = 'Erreur : ' + m;
      status.className = 'ae-status err';
      img.src = bust(team.path);
      if (window.BccoGithub) BccoGithub.toast('Erreur : ' + m, 'err');
    }
  }

  function init() { injectCSS(); if (!document.getElementById(SLOT_ID)) return false; render(); return true; }

  function waitForDashboard() {
    var dash = document.getElementById('dashboard');
    if (!dash) { setTimeout(waitForDashboard, 300); return; }
    if (dash.style.display !== 'none' && document.getElementById(SLOT_ID)) { init(); return; }
    var obs = new MutationObserver(function () {
      if (dash.style.display !== 'none' && document.getElementById(SLOT_ID)) { obs.disconnect(); init(); }
    });
    obs.observe(dash, { attributes: true, attributeFilter: ['style'] });
    setTimeout(function () { if (document.getElementById(SLOT_ID) && dash.style.display !== 'none') { obs.disconnect(); init(); } }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForDashboard);
  else waitForDashboard();
})();
