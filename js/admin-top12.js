/* ============================================================
   admin-top12.js — Éditeur de l'effectif Top 12 (data/top12.csv)
   ------------------------------------------------------------
   Pilote le carrousel de l'accueil (Filles / Garçons).
   Colonnes : nom, genre, nationalite, categorie, description, photo, lien
   - Édition inline de tous les champs
   - Ajout / suppression de joueurs
   - Tri automatique Filles / Garçons
   - Upload photo (recadrage 900×1200 portrait 3:4)
   - Publication via commit GitHub API
   ============================================================ */
(function () {
  'use strict';

  const CSV_PATH = 'data/top12.csv';
  const HEADERS = ['nom', 'genre', 'nationalite', 'categorie', 'description', 'photo', 'lien'];

  let state = {
    headers: HEADERS.slice(),
    rows: [],
    sha: null,
    initial: '[]',          // snapshot JSON pour détecter les changements
    pendingPhotos: {}        // idx → { blob, dataUrl }
  };

  // ---------------------------------------------------------------- CSS
  function injectCSS() {
    if (document.getElementById('admin-top12-css')) return;
    const s = document.createElement('style');
    s.id = 'admin-top12-css';
    s.textContent = `
      .at-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
      .at-btn{padding:10px 16px;border-radius:10px;border:1px solid var(--line);background:var(--surface);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .15s;color:var(--text)}
      .at-btn:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(10,25,136,.08)}
      .at-btn.primary{background:linear-gradient(135deg,#A5EB78,#7ed957);border:none;color:#0A1988;font-weight:700}
      .at-btn:disabled{opacity:.55;cursor:not-allowed}
      .at-btn svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .at-status{font-size:12px;color:var(--muted);font-style:italic;margin-left:auto}
      .at-group-title{font-family:'Anton',sans-serif;font-size:16px;text-transform:uppercase;color:var(--secondary);letter-spacing:.03em;margin:22px 0 12px;display:flex;align-items:center;gap:10px}
      .at-group-title .n{font-size:11px;font-weight:700;color:var(--muted);background:var(--bg-2);padding:2px 8px;border-radius:6px;font-family:inherit}
      .at-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
      .at-card{background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column;transition:border-color .2s,box-shadow .2s}
      .at-card.modified{border-color:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,.18)}
      .at-photo-wrap{position:relative;background:#f0f3fa;aspect-ratio:3/4;overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center}
      .at-photo-wrap img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
      .at-photo-wrap .at-noimg{font-size:11px;color:var(--muted);font-style:italic;text-align:center;padding:10px}
      .at-photo-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(10,25,136,.85),rgba(10,25,136,0) 55%);opacity:0;transition:opacity .2s;display:flex;align-items:flex-end;justify-content:center;padding:10px;color:#fff;font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;pointer-events:none}
      .at-photo-wrap:hover .at-photo-overlay{opacity:1}
      .at-photo-wrap input[type=file]{display:none}
      .at-photo-wrap.dragover{outline:3px dashed #A5EB78;outline-offset:-4px}
      .at-pending-tag{position:absolute;top:6px;left:6px;background:#f59e0b;color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;padding:2px 6px;border-radius:5px;z-index:2}
      .at-body{padding:9px 10px 10px;display:flex;flex-direction:column;gap:6px;flex:1}
      .at-inp{width:100%;padding:6px 8px;border:1px solid var(--line);border-radius:7px;font-size:12px;font-family:inherit;outline:none;background:#fff;color:var(--text);transition:border-color .15s}
      .at-inp:focus{border-color:#0A1988;box-shadow:0 0 0 2px rgba(10,25,136,.08)}
      .at-nom{font-weight:700}
      textarea.at-inp{resize:vertical;min-height:42px;line-height:1.35}
      .at-2col{display:grid;grid-template-columns:1fr 74px;gap:6px}
      .at-del{margin-top:2px;padding:5px;border:1px solid #fca5a5;background:none;color:#b91c1c;border-radius:7px;font-size:11px;font-weight:700;font-family:inherit;cursor:pointer}
      .at-del:hover{background:rgba(239,68,68,.06)}
    `;
    document.head.appendChild(s);
  }

  // ---------------------------------------------------------------- Helpers
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function slugify(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'joueur';
  }
  function photoPathFor(row) {
    return `media/top12/${slugify((row.nom || '').split(' ')[0] || row.nom)}.webp`;
  }
  function isDirty() {
    return Object.keys(state.pendingPhotos).length > 0 || JSON.stringify(state.rows) !== state.initial;
  }

  // ---------------------------------------------------------------- UI shell
  function replaceUI() {
    const slot = document.getElementById('top12Slot');
    if (!slot) return false;
    slot.innerHTML = `
      <div class="at-toolbar">
        <button type="button" class="at-btn primary" id="at-save-all" disabled>
          <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Publier les changements
        </button>
        <button type="button" class="at-btn" id="at-add">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter un joueur
        </button>
        <button type="button" class="at-btn" id="at-reload">
          <svg viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          Recharger
        </button>
        <span class="at-status" id="at-status">Chargement…</span>
      </div>
      <div id="at-groups"></div>
    `;
    document.getElementById('at-reload').addEventListener('click', reload);
    document.getElementById('at-save-all').addEventListener('click', saveAll);
    document.getElementById('at-add').addEventListener('click', addPlayer);
    return true;
  }

  function setStatus(msg) { const el = document.getElementById('at-status'); if (el) el.textContent = msg; }

  // ---------------------------------------------------------------- Load
  async function reload() {
    try {
      setStatus('Chargement depuis GitHub…');
      const f = await BccoGithub.readFile(CSV_PATH);
      const parsed = BccoGithub.parseCSV(f.content);
      const hs = parsed.headers && parsed.headers.length ? parsed.headers.slice() : HEADERS.slice();
      HEADERS.forEach(h => { if (!hs.includes(h)) hs.push(h); });
      state.headers = hs;
      state.rows = parsed.rows.map(r => { const o = {}; hs.forEach(h => o[h] = r[h] != null ? r[h] : ''); return o; });
      state.sha = f.sha;
      state.pendingPhotos = {};
      state.initial = JSON.stringify(state.rows);
      renderGroups();
      setStatus(`${state.rows.length} joueur${state.rows.length > 1 ? 's' : ''} chargé${state.rows.length > 1 ? 's' : ''}`);
      updateSaveButton();
    } catch (e) {
      BccoGithub.toast('Erreur : ' + e.message, 'err');
      setStatus('');
    }
  }

  // ---------------------------------------------------------------- Render
  function cardHtml(r, i) {
    const photo = state.pendingPhotos[i] ? state.pendingPhotos[i].dataUrl : (r.photo || photoPathFor(r));
    const pending = !!state.pendingPhotos[i];
    return `
      <article class="at-card" data-idx="${i}">
        <label class="at-photo-wrap" data-photo-idx="${i}">
          <input type="file" accept="image/*" data-file-idx="${i}"/>
          ${pending ? '<span class="at-pending-tag">À publier</span>' : ''}
          <img src="${escapeHtml(photo)}" alt="${escapeHtml(r.nom)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"/>
          <div class="at-noimg" style="display:none">Pas de photo<br><small style="opacity:.7">Cliquer pour ajouter</small></div>
          <div class="at-photo-overlay">Changer la photo</div>
        </label>
        <div class="at-body">
          <input class="at-inp at-nom" data-f="nom" data-i="${i}" value="${escapeHtml(r.nom)}" placeholder="Nom affiché"/>
          <div class="at-2col">
            <select class="at-inp" data-f="genre" data-i="${i}">
              <option value="G"${/^g/i.test(r.genre) || !/^f/i.test(r.genre) ? ' selected' : ''}>Garçon</option>
              <option value="F"${/^f/i.test(r.genre) ? ' selected' : ''}>Fille</option>
            </select>
            <input class="at-inp" data-f="nationalite" data-i="${i}" value="${escapeHtml(r.nationalite)}" placeholder="FRA" maxlength="5"/>
          </div>
          <input class="at-inp" data-f="categorie" data-i="${i}" value="${escapeHtml(r.categorie)}" placeholder="Simple M. / Mixte…"/>
          <textarea class="at-inp" data-f="description" data-i="${i}" rows="2" placeholder="Palmarès / description…">${escapeHtml(r.description)}</textarea>
          <input class="at-inp" data-f="lien" data-i="${i}" value="${escapeHtml(r.lien)}" placeholder="Lien BWF (optionnel)"/>
          <button type="button" class="at-del" data-del="${i}">Supprimer</button>
        </div>
      </article>`;
  }

  function renderGroups() {
    const wrap = document.getElementById('at-groups');
    if (!wrap) return;
    const filles = [], garcons = [];
    state.rows.forEach((r, i) => (/^f/i.test(r.genre) ? filles : garcons).push(i));
    function group(title, idxs) {
      return `<div class="at-group-title">${title}<span class="n">${idxs.length}</span></div>
        <div class="at-grid">${idxs.map(i => cardHtml(state.rows[i], i)).join('') || '<div style="color:var(--muted);font-size:12px;padding:8px">Aucun joueur.</div>'}</div>`;
    }
    wrap.innerHTML = group('Filles', filles) + group('Garçons', garcons);
    bindCards(wrap);
    markModified();
  }

  function bindCards(wrap) {
    wrap.querySelectorAll('.at-inp[data-f]').forEach(el => {
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        const i = +el.dataset.i, f = el.dataset.f;
        state.rows[i][f] = el.value;
        if (f === 'genre') { renderGroups(); }   // re-trie
        else { markModified(); updateSaveButton(); }
      });
    });
    wrap.querySelectorAll('input[type=file]').forEach(inp => {
      inp.addEventListener('change', e => handleFile(+inp.dataset.fileIdx, e.target.files[0]));
    });
    wrap.querySelectorAll('.at-del').forEach(b => {
      b.addEventListener('click', () => {
        const i = +b.dataset.del;
        if (!confirm(`Supprimer « ${state.rows[i].nom || 'ce joueur'} » de l'effectif ?`)) return;
        state.rows.splice(i, 1);
        // ré-indexe les photos pendantes
        const np = {}; Object.keys(state.pendingPhotos).forEach(k => { const n = +k; if (n < i) np[n] = state.pendingPhotos[n]; else if (n > i) np[n - 1] = state.pendingPhotos[n]; });
        state.pendingPhotos = np;
        renderGroups(); updateSaveButton();
      });
    });
    wrap.querySelectorAll('.at-photo-wrap').forEach(zone => {
      ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('dragover'); }));
      ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('dragover'); }));
      zone.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleFile(+zone.dataset.photoIdx, f); });
    });
  }

  function markModified() {
    const wrap = document.getElementById('at-groups');
    if (!wrap) return;
    const init = JSON.parse(state.initial);
    wrap.querySelectorAll('.at-card').forEach(card => {
      const i = +card.dataset.idx;
      const changed = !!state.pendingPhotos[i] || JSON.stringify(state.rows[i]) !== JSON.stringify(init[i]);
      card.classList.toggle('modified', changed);
    });
  }

  function addPlayer() {
    const row = {}; state.headers.forEach(h => row[h] = ''); row.genre = 'G'; row.nationalite = 'FRA';
    state.rows.push(row);
    renderGroups(); updateSaveButton();
    const wrap = document.getElementById('at-groups');
    const cards = wrap.querySelectorAll('.at-card');
    const last = cards[cards.length - 1];
    if (last) { last.scrollIntoView({ behavior: 'smooth', block: 'center' }); last.querySelector('.at-nom').focus(); }
  }

  async function handleFile(idx, file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { BccoGithub.toast('Fichier non reconnu comme image', 'err'); return; }
    try {
      const blob = await BccoGithub.resizeImage(file, { targetWidth: 900, targetHeight: 1200, quality: 0.85 });
      const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(new Error('Lecture impossible')); fr.readAsDataURL(blob); });
      state.pendingPhotos[idx] = { blob, dataUrl };
      renderGroups(); updateSaveButton();
    } catch (e) { BccoGithub.toast('Erreur : ' + e.message, 'err'); }
  }

  function updateSaveButton() {
    const btn = document.getElementById('at-save-all');
    if (!btn) return;
    btn.disabled = !isDirty();
  }

  // ---------------------------------------------------------------- Save
  async function saveAll() {
    const btn = document.getElementById('at-save-all');
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Publication…';
    try {
      const photoIdxs = Object.keys(state.pendingPhotos).map(n => +n);
      let uploaded = 0;
      for (const idx of photoIdxs) {
        const pending = state.pendingPhotos[idx];
        const row = state.rows[idx];
        if (!row) continue;
        const targetPath = photoPathFor(row);
        const fileForUpload = new File([pending.blob], targetPath.split('/').pop(), { type: pending.blob.type });
        setStatus(`Upload photo ${row.nom || ''} (${uploaded + 1}/${photoIdxs.length})…`);
        await BccoGithub.uploadImage(fileForUpload, targetPath, `Photo Top 12 : ${(row.nom || '').trim()}`);
        row.photo = `${targetPath}?v=${Date.now().toString(36)}`;
        uploaded++;
      }
      setStatus('Mise à jour de data/top12.csv…');
      const csv = BccoGithub.serializeCSV(state.rows, state.headers);
      const msg = `Effectif Top 12 : ${state.rows.length} joueur(s)${uploaded ? ` · ${uploaded} photo(s)` : ''}`;
      const res = await BccoGithub.writeFile(CSV_PATH, csv, msg, state.sha);
      state.sha = res.content && res.content.sha;
      state.pendingPhotos = {};
      state.initial = JSON.stringify(state.rows);
      BccoGithub.toast('Effectif Top 12 publié !', 'ok');
      setStatus('Publié ! ' + new Date().toLocaleTimeString('fr-FR'));
      renderGroups();
      updateSaveButton();
    } catch (e) {
      BccoGithub.toast('Erreur : ' + e.message, 'err');
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  }

  // ---------------------------------------------------------------- Init
  function init() { injectCSS(); if (!replaceUI()) return false; reload(); return true; }

  function waitForDashboard() {
    const dash = document.getElementById('dashboard');
    if (!dash) { setTimeout(waitForDashboard, 300); return; }
    if (dash.style.display !== 'none' && document.getElementById('top12Slot')) { init(); return; }
    const obs = new MutationObserver(() => {
      if (dash.style.display !== 'none' && document.getElementById('top12Slot')) { obs.disconnect(); init(); }
    });
    obs.observe(dash, { attributes: true, attributeFilter: ['style'] });
    setTimeout(() => { if (document.getElementById('top12Slot') && dash.style.display !== 'none') { obs.disconnect(); init(); } }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForDashboard);
  else waitForDashboard();
})();
