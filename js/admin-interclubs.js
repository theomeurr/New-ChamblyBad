/* ============================================================
   admin-interclubs.js — Éditeur Poules & Journées (interclubs Top 12)
   ------------------------------------------------------------
   Pilote la section poules + journées de l'accueil.
   - data/poules.csv    : poule,ordre,equipe,bcco
   - data/journees.csv  : journee,date,adversaire,lieu (domicile|exterieur)
   Édition inline, ajout/suppression, publication via commit GitHub.
   ============================================================ */
(function () {
  'use strict';

  const POULES_PATH = 'data/poules.csv';
  const JOURNEES_PATH = 'data/journees.csv';
  const PH = ['poule', 'ordre', 'equipe', 'bcco'];
  const JH = ['journee', 'date', 'adversaire', 'lieu'];

  let st = {
    pRows: [], pSha: null, pInit: '[]',
    jRows: [], jSha: null, jInit: '[]'
  };

  function injectCSS() {
    if (document.getElementById('admin-ic-css')) return;
    const s = document.createElement('style');
    s.id = 'admin-ic-css';
    s.textContent = `
      .ic-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px}
      .ic-btn{padding:10px 16px;border-radius:10px;border:1px solid var(--line);background:var(--surface);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .15s;color:var(--text)}
      .ic-btn:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(10,25,136,.08)}
      .ic-btn.primary{background:linear-gradient(135deg,#A5EB78,#7ed957);border:none;color:#0A1988;font-weight:700}
      .ic-btn:disabled{opacity:.55;cursor:not-allowed}
      .ic-btn svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .ic-status{font-size:12px;color:var(--muted);font-style:italic;margin-left:auto}
      .ic-sub{font-family:'Anton',sans-serif;font-size:15px;text-transform:uppercase;color:var(--secondary);letter-spacing:.03em;margin:20px 0 10px}
      .ic-poules{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
      .ic-card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px}
      .ic-card h4{margin:0 0 10px;font-family:'Anton',sans-serif;font-weight:400;font-size:18px;text-transform:uppercase;color:var(--text)}
      .ic-team{display:flex;align-items:center;gap:8px;margin-bottom:7px}
      .ic-team input[type=text]{flex:1;padding:6px 8px;border:1px solid var(--line);border-radius:7px;font-size:12.5px;font-family:inherit;outline:none;background:#fff;color:var(--text)}
      .ic-team input[type=text]:focus{border-color:#0A1988;box-shadow:0 0 0 2px rgba(10,25,136,.08)}
      .ic-team label{font-size:10.5px;color:var(--muted);display:inline-flex;align-items:center;gap:3px;white-space:nowrap;cursor:pointer}
      .ic-x{border:1px solid #fca5a5;background:none;color:#b91c1c;border-radius:6px;width:26px;height:26px;flex-shrink:0;cursor:pointer;font-weight:700;font-family:inherit}
      .ic-add{margin-top:4px;font-size:11.5px;color:var(--secondary);background:none;border:1px dashed var(--line);border-radius:7px;padding:5px 10px;cursor:pointer;font-family:inherit}
      .ic-jrow{display:grid;grid-template-columns:46px 1.1fr 2fr 1fr 30px;gap:8px;align-items:center;margin-bottom:7px}
      .ic-jrow input,.ic-jrow select{padding:6px 8px;border:1px solid var(--line);border-radius:7px;font-size:12.5px;font-family:inherit;outline:none;background:#fff;color:var(--text)}
      .ic-jrow input:focus,.ic-jrow select:focus{border-color:#0A1988;box-shadow:0 0 0 2px rgba(10,25,136,.08)}
      .ic-jhead{display:grid;grid-template-columns:46px 1.1fr 2fr 1fr 30px;gap:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px;padding:0 2px}
    `;
    document.head.appendChild(s);
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function isX(v) { return /^(x|1|true|oui|yes)$/i.test(String(v || '').trim()); }
  function dirtyP() { return JSON.stringify(st.pRows) !== st.pInit; }
  function dirtyJ() { return JSON.stringify(st.jRows) !== st.jInit; }
  function isDirty() { return dirtyP() || dirtyJ(); }

  function shell() {
    const slot = document.getElementById('interclubsSlot');
    if (!slot) return false;
    slot.innerHTML = `
      <div class="ic-toolbar">
        <button type="button" class="ic-btn primary" id="ic-save" disabled>
          <svg viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Publier les changements
        </button>
        <button type="button" class="ic-btn" id="ic-reload">
          <svg viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          Recharger
        </button>
        <span class="ic-status" id="ic-status">Chargement…</span>
      </div>
      <div class="ic-sub">Les poules</div>
      <div id="ic-poules" class="ic-poules"></div>
      <div class="ic-sub">Les journées du BCCO</div>
      <div id="ic-jhead" class="ic-jhead"><span>J</span><span>Date</span><span>Adversaire</span><span>Lieu</span><span></span></div>
      <div id="ic-journees"></div>
      <button type="button" class="ic-add" id="ic-jadd" style="margin-top:8px">+ Ajouter une journée</button>
    `;
    document.getElementById('ic-reload').addEventListener('click', reload);
    document.getElementById('ic-save').addEventListener('click', saveAll);
    document.getElementById('ic-jadd').addEventListener('click', addJournee);
    return true;
  }
  function setStatus(m) { const el = document.getElementById('ic-status'); if (el) el.textContent = m; }
  function updateSave() { const b = document.getElementById('ic-save'); if (b) b.disabled = !isDirty(); }

  async function reload() {
    try {
      setStatus('Chargement depuis GitHub…');
      const [pf, jf] = await Promise.all([BccoGithub.readFile(POULES_PATH), BccoGithub.readFile(JOURNEES_PATH)]);
      const pp = BccoGithub.parseCSV(pf.content), jp = BccoGithub.parseCSV(jf.content);
      st.pRows = pp.rows.map(r => { const o = {}; PH.forEach(h => o[h] = r[h] != null ? r[h] : ''); return o; });
      st.jRows = jp.rows.map(r => { const o = {}; JH.forEach(h => o[h] = r[h] != null ? r[h] : ''); return o; });
      st.pSha = pf.sha; st.jSha = jf.sha;
      st.pInit = JSON.stringify(st.pRows); st.jInit = JSON.stringify(st.jRows);
      renderPoules(); renderJournees();
      setStatus(`${st.pRows.length} équipes · ${st.jRows.length} journées`);
      updateSave();
    } catch (e) { BccoGithub.toast('Erreur : ' + e.message, 'err'); setStatus(''); }
  }

  // -------- Poules
  function renderPoules() {
    const wrap = document.getElementById('ic-poules');
    if (!wrap) return;
    const poules = [...new Set(st.pRows.map(r => r.poule))].sort();
    if (!poules.length) poules.push('1', '2');
    wrap.innerHTML = poules.map(p => {
      const idxs = st.pRows.map((r, i) => ({ r, i })).filter(x => x.r.poule === p);
      const teams = idxs.map(({ r, i }) => `
        <div class="ic-team">
          <input type="text" data-pi="${i}" value="${esc(r.equipe)}" placeholder="Nom de l'équipe"/>
          <label title="Équipe du BCCO"><input type="radio" name="ic-bcco" data-bcco="${i}" ${isX(r.bcco) ? 'checked' : ''}/> BCCO</label>
          <button type="button" class="ic-x" data-pdel="${i}" title="Supprimer">✕</button>
        </div>`).join('');
      return `<div class="ic-card"><h4>Poule ${esc(p)}</h4>${teams}<button type="button" class="ic-add" data-padd="${esc(p)}">+ Ajouter une équipe</button></div>`;
    }).join('');
    bindPoules(wrap);
  }
  function bindPoules(wrap) {
    wrap.querySelectorAll('input[data-pi]').forEach(inp => inp.addEventListener('input', () => { st.pRows[+inp.dataset.pi].equipe = inp.value; updateSave(); }));
    wrap.querySelectorAll('input[data-bcco]').forEach(rd => rd.addEventListener('change', () => {
      const sel = +rd.dataset.bcco;
      st.pRows.forEach((r, i) => r.bcco = (i === sel ? 'x' : ''));
      updateSave();
    }));
    wrap.querySelectorAll('[data-pdel]').forEach(b => b.addEventListener('click', () => {
      st.pRows.splice(+b.dataset.pdel, 1); reNumber(); renderPoules(); updateSave();
    }));
    wrap.querySelectorAll('[data-padd]').forEach(b => b.addEventListener('click', () => {
      st.pRows.push({ poule: b.dataset.padd, ordre: '', equipe: '', bcco: '' }); reNumber(); renderPoules(); updateSave();
    }));
  }
  function reNumber() {
    const cnt = {};
    st.pRows.forEach(r => { cnt[r.poule] = (cnt[r.poule] || 0) + 1; r.ordre = String(cnt[r.poule]); });
  }

  // -------- Journées
  function renderJournees() {
    const wrap = document.getElementById('ic-journees');
    if (!wrap) return;
    wrap.innerHTML = st.jRows.map((r, i) => `
      <div class="ic-jrow">
        <input type="text" data-jf="journee" data-ji="${i}" value="${esc(r.journee)}"/>
        <input type="text" data-jf="date" data-ji="${i}" value="${esc(r.date)}" placeholder="19 sept. 2026"/>
        <input type="text" data-jf="adversaire" data-ji="${i}" value="${esc(r.adversaire)}" placeholder="Adversaire"/>
        <select data-jf="lieu" data-ji="${i}">
          <option value="domicile"${/^dom/i.test(r.lieu) ? ' selected' : ''}>Domicile</option>
          <option value="exterieur"${!/^dom/i.test(r.lieu) ? ' selected' : ''}>Extérieur</option>
        </select>
        <button type="button" class="ic-x" data-jdel="${i}" title="Supprimer">✕</button>
      </div>`).join('') || '<div style="color:var(--muted);font-size:12px">Aucune journée.</div>';
    wrap.querySelectorAll('[data-jf]').forEach(el => {
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, () => { st.jRows[+el.dataset.ji][el.dataset.jf] = el.value; updateSave(); });
    });
    wrap.querySelectorAll('[data-jdel]').forEach(b => b.addEventListener('click', () => { st.jRows.splice(+b.dataset.jdel, 1); renderJournees(); updateSave(); }));
  }
  function addJournee() {
    const next = st.jRows.reduce((m, r) => Math.max(m, +r.journee || 0), 0) + 1;
    st.jRows.push({ journee: String(next), date: '', adversaire: '', lieu: 'domicile' });
    renderJournees(); updateSave();
  }

  // -------- Save
  async function saveAll() {
    const btn = document.getElementById('ic-save');
    btn.disabled = true; const orig = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Publication…';
    try {
      reNumber();
      if (dirtyP()) {
        setStatus('Mise à jour des poules…');
        const csv = BccoGithub.serializeCSV(st.pRows, PH);
        const res = await BccoGithub.writeFile(POULES_PATH, csv, 'Interclubs : poules', st.pSha);
        st.pSha = res.content && res.content.sha; st.pInit = JSON.stringify(st.pRows);
      }
      if (dirtyJ()) {
        setStatus('Mise à jour des journées…');
        const csv = BccoGithub.serializeCSV(st.jRows, JH);
        const res = await BccoGithub.writeFile(JOURNEES_PATH, csv, 'Interclubs : journées', st.jSha);
        st.jSha = res.content && res.content.sha; st.jInit = JSON.stringify(st.jRows);
      }
      BccoGithub.toast('Interclubs publié !', 'ok');
      setStatus('Publié ! ' + new Date().toLocaleTimeString('fr-FR'));
      updateSave();
    } catch (e) { BccoGithub.toast('Erreur : ' + e.message, 'err'); btn.disabled = false; btn.innerHTML = orig; }
  }

  // -------- Init
  function init() { injectCSS(); if (!shell()) return false; reload(); return true; }
  function waitForDashboard() {
    const dash = document.getElementById('dashboard');
    if (!dash) { setTimeout(waitForDashboard, 300); return; }
    if (dash.style.display !== 'none' && document.getElementById('interclubsSlot')) { init(); return; }
    const obs = new MutationObserver(() => { if (dash.style.display !== 'none' && document.getElementById('interclubsSlot')) { obs.disconnect(); init(); } });
    obs.observe(dash, { attributes: true, attributeFilter: ['style'] });
    setTimeout(() => { if (document.getElementById('interclubsSlot') && dash.style.display !== 'none') { obs.disconnect(); init(); } }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForDashboard);
  else waitForDashboard();
})();
