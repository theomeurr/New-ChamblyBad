
// Authentification gérée côté serveur (PHP + MySQL, voir admin-auth/).
// Cette page n'est atteinte que si la session PHP est valide (admin-auth/auth.php::require_login()).
initActusPreview();
initReservationsPreview();

/* =================================================================
   APERCU RESERVATIONS TERRAINS — données réelles (MySQL) + config CSV
================================================================== */
const GH = 'https://github.com/theomeurr/New-ChamblyBad/edit/main/';

const RV_ADMIN_CONFIG = {
  // Liens d'édition → ouvrent le fichier CSV sur GitHub
  sheetConfigUrl:    GH + 'data/reservations/config.csv',
  sheetSlotsUrl:     GH + 'data/reservations/creneaux_ouverts.csv',
  sheetBlockedUrl:   GH + 'data/reservations/creneaux_bloques.csv',
  sheetLicenciesUrl: GH + 'data/reservations/licencies.csv',
  // Pas de source remote — données locales uniquement
  configPubUrl:      '',
  slotsPubUrl:       '',
  blockedPubUrl:     '',
  licenciesPubUrl:   '',
  // Fichiers CSV locaux (config/créneaux/licenciés — changent rarement)
  configCsv:    'data/reservations/config.csv',
  blockedCsv:   'data/reservations/creneaux_bloques.csv',
  licenciesCsv: 'data/reservations/licencies.csv'
  // Les réservations elles-mêmes vivent en MySQL (voir admin-auth/reservations_list.php),
  // plus dans data/reservations/reservations.csv (obsolète, laissé pour historique).
};

let RV_LAST_RESERVATIONS = []; // cache pour l'export CSV

function initReservationsPreview(){
  const cfgBtn = document.getElementById('openSheetRvConfigBtn');
  const slotsBtn = document.getElementById('openSheetRvSlotsBtn');
  const blkBtn = document.getElementById('openSheetRvBlockedBtn');
  const licBtn = document.getElementById('openSheetRvLicenciesBtn');
  if (cfgBtn)   cfgBtn.href   = RV_ADMIN_CONFIG.sheetConfigUrl    || '#';
  if (slotsBtn) slotsBtn.href = RV_ADMIN_CONFIG.sheetSlotsUrl     || '#';
  if (blkBtn)   blkBtn.href   = RV_ADMIN_CONFIG.sheetBlockedUrl   || '#';
  if (licBtn)   licBtn.href   = RV_ADMIN_CONFIG.sheetLicenciesUrl || '#';

  const refreshBtn = document.getElementById('refreshRvBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', loadReservationsPreview);

  const exportBtn = document.getElementById('rvExportCsvBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportReservationsCsv);

  loadReservationsPreview();
}

async function loadReservationsPreview(){
  const statusEl = document.getElementById('rvStatus');
  if (statusEl) statusEl.textContent = 'Chargement...';

  const blkSources = [];
  if (RV_ADMIN_CONFIG.blockedPubUrl) blkSources.push(RV_ADMIN_CONFIG.blockedPubUrl);
  if (RV_ADMIN_CONFIG.blockedCsv) blkSources.push(RV_ADMIN_CONFIG.blockedCsv);

  const licSources = [];
  if (RV_ADMIN_CONFIG.licenciesPubUrl) licSources.push(RV_ADMIN_CONFIG.licenciesPubUrl);
  if (RV_ADMIN_CONFIG.licenciesCsv) licSources.push(RV_ADMIN_CONFIG.licenciesCsv);

  async function loadAny(urls){
    for (const u of urls){
      try { const t = await fetchCSVAdmin(u); const p = parseCSV(t); return p; }
      catch(e) { console.warn('RV source inaccessible :', u, e); }
    }
    return [];
  }

  async function loadReservationsFromDb(){
    try {
      const r = await fetch('admin-auth/reservations_list.php?_=' + Date.now(), { credentials: 'same-origin', cache: 'no-cache' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
      return data.reservations || [];
    } catch(e) { console.warn('Réservations inaccessibles :', e); return []; }
  }

  const [reservations, blocked, licencies] = await Promise.all([
    loadReservationsFromDb(),
    loadAny(blkSources),
    loadAny(licSources)
  ]);

  RV_LAST_RESERVATIONS = reservations;
  renderRvStats(reservations, blocked, licencies);
  renderRvTable(reservations);

  if (statusEl){
    statusEl.textContent = reservations.length
      ? reservations.length + ' réservation(s) chargée(s)'
      : 'Aucune réservation pour le moment';
  }
}

function renderRvStats(reservations, blocked, licencies){
  const now = new Date();
  const today = new Date(now); today.setHours(0,0,0,0);
  const in7 = new Date(today); in7.setDate(in7.getDate()+7);
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const isConfirmed = r => ['confirmed','pending','confirmée'].includes((r.statut||'').toLowerCase());
  const isActive = v => /^(x|1|true|oui|yes)$/i.test(String(v||'').trim());
  const parseD = s => {
    const m = String(s||'').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? new Date(+m[1], +m[2]-1, +m[3]) : null;
  };

  const upcoming = reservations.filter(r => {
    const d = parseD(r.date);
    return d && d >= today && d <= in7 && isConfirmed(r);
  });

  const monthRes = reservations.filter(r => {
    const d = parseD(r.date);
    return d && d >= startMonth && isConfirmed(r);
  });
  const revenue = monthRes.reduce((sum, r) => sum + (Number(r.montant)||0), 0);

  const licenciesActifs = (licencies || []).filter(l => isActive(l.actif)).length;

  const blockedFuture = (blocked || []).filter(b => {
    const d = parseD(b.date);
    return d && d >= today && isActive(b.actif);
  });

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('rvStatUpcoming',  String(upcoming.length));
  setText('rvStatRevenue',   revenue.toFixed(2).replace('.', ',') + ' €');
  setText('rvStatLicencies', String(licenciesActifs));
  setText('rvStatBlocked',   String(blockedFuture.length));
}

function renderRvTable(reservations){
  const body = document.getElementById('rvTableBody');
  if (!body) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const upcoming = reservations.filter(r => {
    const m = String(r.date||'').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return false;
    const d = new Date(+m[1], +m[2]-1, +m[3]);
    return d >= today && ['confirmed','pending','confirmée'].includes((r.statut||'').toLowerCase());
  }).sort((a,b) => (a.date+a.heure_debut).localeCompare(b.date+b.heure_debut));

  if (!upcoming.length){
    body.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:28px">Aucune réservation à venir pour l\'instant.</td></tr>';
    return;
  }

  const esc = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate = s => {
    const m = String(s||'').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return s;
    const d = new Date(+m[1], +m[2]-1, +m[3]);
    return d.toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'short' });
  };
  const fmtDuree = min => {
    const n = Number(min) || 0;
    if (n === 60) return '1 h';
    if (n === 90) return '1 h 30';
    if (n === 120) return '2 h';
    return n + ' min';
  };

  body.innerHTML = upcoming.map(r => `
    <tr>
      <td>${esc(fmtDate(r.date))}</td>
      <td>${esc((r.heure_debut||'').slice(0,5)||'—')} → ${esc((r.heure_fin||'').slice(0,5)||'—')}</td>
      <td>${esc(fmtDuree(r.duree))}</td>
      <td class="name-col">${esc((r.prenom||'') + ' ' + (r.nom||''))}</td>
      <td class="email-col">${esc(r.email||'')}<br>${esc(r.telephone||'')}</td>
      <td>${/^(oui|yes|x|1|true)$/i.test(r.licencie||'')
        ? '<span class="sport-badge badminton">Licencié</span>'
        : '<span class="sport-badge pickle">Externe</span>'}</td>
      <td class="price-col">${esc(r.montant||'0')} €</td>
      <td><span class="status-badge ${/confirmed/i.test(r.statut||'') ? 'confirmee' : 'en-attente'}">${esc(r.statut||'—')}</span></td>
      <td class="actions-col">
        <button type="button" class="act-btn cancel" onclick="cancelReservation(${Number(r.id)})">Annuler</button>
      </td>
    </tr>
  `).join('');
}

async function cancelReservation(id){
  if (!confirm('Annuler cette réservation ? Un remboursement Stripe sera tenté si un paiement a été encaissé.')) return;
  try {
    const r = await fetch('admin-auth/reservations_cancel.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
    const msg = data.refunded
      ? 'Réservation annulée et remboursée.'
      : (data.refund_error
        ? 'Réservation annulée. Le remboursement a échoué : ' + data.refund_error
        : 'Réservation annulée (aucun paiement encaissé à rembourser).');
    alert(msg);
    loadReservationsPreview();
  } catch(e) {
    alert('Erreur : ' + e.message);
  }
}

function exportReservationsCsv(){
  if (!RV_LAST_RESERVATIONS.length){ alert('Aucune réservation à exporter.'); return; }
  const headers = ['reference','date','heure_debut','heure_fin','duree','nom','prenom','email','telephone','licencie','numero_licence','montant','statut','stripe_payment_intent','created_at'];
  const csv = (window.BccoGithub && BccoGithub.serializeCSV)
    ? BccoGithub.serializeCSV(RV_LAST_RESERVATIONS, headers)
    : [headers.join(',')].concat(RV_LAST_RESERVATIONS.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))).join('\n');
  const ts = new Date().toISOString().slice(0,10);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reservations-bcco-${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* =================================================================
   UTILITAIRES CSV — partagés entre loadRencontresPreview et loadActusPreview
================================================================== */
function parseCSV(text){
  if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
  const rows=[]; let i=0, f='', r=[], inQ=false;
  while(i<text.length){
    const c=text[i];
    if(inQ){ if(c==='"'&&text[i+1]==='"'){f+='"';i+=2;continue;} if(c==='"'){inQ=false;i++;continue;} f+=c;i++;continue; }
    if(c==='"'){inQ=true;i++;continue;}
    if(c===','){r.push(f);f='';i++;continue;}
    if(c==='\n'||c==='\r'){ if(f.length||r.length){r.push(f);rows.push(r);} r=[];f=''; if(c==='\r'&&text[i+1]==='\n')i+=2; else i++; continue; }
    f+=c;i++;
  }
  if(f.length||r.length){r.push(f);rows.push(r);}
  if(!rows.length) return [];
  const h=rows[0].map(x=>x.trim());
  return rows.slice(1).filter(x=>x.some(v=>v&&v.trim())).map(x=>{ const o={}; h.forEach((k,idx)=>o[k]=(x[idx]||'').trim()); return o; });
}
async function fetchCSVAdmin(url){
  const busted = url + (url.includes('?')?'&':'?') + 't=' + Date.now();
  const res = await fetch(busted,{cache:'no-cache'});
  if(!res.ok) throw new Error('HTTP '+res.status);
  return res.text();
}

/* =================================================================
   APERCU ACTUALITES (lecture seule depuis Google Sheets / CSV local)
   -----------------------------------------------------------------
   Pour que le bouton "Modifier dans Google Sheets" fonctionne,
   renseigne l'URL d'EDITION (pas la CSV publiee) ci-dessous :
================================================================== */
const ACTUS_ADMIN_CONFIG = {
  sheetEditUrl: 'https://github.com/theomeurr/New-ChamblyBad/edit/main/data/actualites.csv',
  actusCsvUrl: '',
  actusCsvFallback: 'data/actualites.csv'
};

function initActusPreview(){
  const openBtn = document.getElementById('openSheetBtn');
  const refreshBtn = document.getElementById('refreshActusBtn');
  if(openBtn) openBtn.href = ACTUS_ADMIN_CONFIG.sheetEditUrl || '#';
  if(refreshBtn) refreshBtn.addEventListener('click',loadActusPreview);
  loadActusPreview();
}

async function loadActusPreview(){
  const previewEl = document.getElementById('actusPreview');
  const emptyEl = document.getElementById('actusEmpty');
  const statusEl = document.getElementById('actusStatus');
  statusEl.textContent = 'Chargement...';
  previewEl.innerHTML = '';
  emptyEl.style.display = 'none';

  const urls = [];
  if(ACTUS_ADMIN_CONFIG.actusCsvUrl) urls.push({url:ACTUS_ADMIN_CONFIG.actusCsvUrl, src:'Google Sheets'});
  if(ACTUS_ADMIN_CONFIG.actusCsvFallback) urls.push({url:ACTUS_ADMIN_CONFIG.actusCsvFallback, src:'data/actualites.csv'});

  let rows = [], sourceUsed = null;
  for(const u of urls){
    try{ const t = await fetchCSVAdmin(u.url); const parsed = parseCSV(t); if(parsed.length){ rows = parsed; sourceUsed = u.src; break; } }
    catch(e){ console.warn('Actus source inaccessible :', u.url, e); }
  }

  if(!rows.length){
    emptyEl.style.display = 'block';
    statusEl.textContent = sourceUsed ? 'Aucune actualité' : 'Sources inaccessibles — vérifiez votre connexion';
    return;
  }

  function esc(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function isActive(v){ return /^(x|1|true|oui|yes)$/i.test(String(v||'').trim()); }

  const publies = rows.filter(r => !('actif' in r) || !r.actif || isActive(r.actif)).length;
  const brouillons = rows.length - publies;

  previewEl.innerHTML = rows.map((r,idx) => {
    const published = (!('actif' in r) || !r.actif || isActive(r.actif));
    const tag = (r.tag||'event').toLowerCase();
    const tagLabel = r.tag_label || r.tag || '';
    const bg = published ? '#fff' : 'rgba(239,68,68,.04)';
    const border = published ? 'var(--line)' : 'rgba(239,68,68,.2)';
    const badge = published
      ? '<span style="background:rgba(165,235,120,.2);color:var(--gold-2);padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">En ligne</span>'
      : '<span style="background:rgba(239,68,68,.1);color:#ef4444;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">Brouillon</span>';
    const tagColor = tag==='match' ? '#ef4444' : (tag==='tournoi' ? 'var(--gold-2)' : 'var(--secondary)');
    const tagBg = tag==='match' ? 'rgba(239,68,68,.1)' : (tag==='tournoi' ? 'rgba(165,235,120,.15)' : 'rgba(10,25,136,.08)');

    return `
      <div style="background:${bg};border:1px solid ${border};border-radius:12px;overflow:hidden;display:flex;flex-direction:column">
        ${r.image ? `<div style="aspect-ratio:16/9;overflow:hidden;background:var(--bg-2)"><img src="${esc(r.image)}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'"/></div>` : ''}
        <div style="padding:14px;display:flex;flex-direction:column;gap:6px;flex:1">
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            ${badge}
            ${tagLabel ? `<span style="background:${tagBg};color:${tagColor};padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700">${esc(tagLabel)}</span>` : ''}
          </div>
          ${r.date_affichage ? `<div style="font-size:11px;color:var(--muted);font-weight:600">${esc(r.date_affichage)}</div>` : ''}
          <div style="font-family:'Anton',sans-serif;font-weight:400;font-size:14px;color:var(--text);line-height:1.3">${esc(r.titre||'(sans titre)')}</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(r.resume||'')}</div>
        </div>
      </div>`;
  }).join('');

  statusEl.textContent = `${publies} en ligne${brouillons?` · ${brouillons} brouillon${brouillons>1?'s':''}`:''} · source : ${sourceUsed}`;
}

/* =================================================================
   HISTORIQUE DES MODIFICATIONS (super-admin) — commits GitHub récents
================================================================== */
function openHistory(){
  const drawer = document.getElementById('historyDrawer');
  const overlay = document.getElementById('historyOverlay');
  if (!drawer || !overlay) return;
  drawer.style.display = '';
  overlay.style.display = '';
  loadHistory();
}
function closeHistory(){
  const drawer = document.getElementById('historyDrawer');
  const overlay = document.getElementById('historyOverlay');
  if (drawer) drawer.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
}
async function loadHistory(){
  const list = document.getElementById('historyList');
  if (!list) return;
  list.innerHTML = '<div style="font-size:13px;color:var(--muted);font-style:italic">Chargement…</div>';
  const esc = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  try {
    const r = await fetch('admin-auth/history.php', { credentials: 'same-origin' });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
    if (!data.commits || !data.commits.length){
      list.innerHTML = '<div style="font-size:13px;color:var(--muted);font-style:italic">Aucun historique.</div>';
      return;
    }
    list.innerHTML = data.commits.map(c => {
      const d = new Date(c.date);
      const dateStr = isNaN(d) ? '' : d.toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
      return `<div style="padding:10px 12px;background:var(--bg-2);border-radius:8px">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${esc(c.message)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${esc(dateStr)} · <a href="${esc(c.url)}" target="_blank" rel="noopener" style="color:var(--secondary);text-decoration:underline">${esc(c.sha)}</a></div>
      </div>`;
    }).join('');
  } catch (e) {
    list.innerHTML = '<div style="font-size:13px;color:#ef4444">Erreur : ' + esc(e.message) + '</div>';
  }
}

