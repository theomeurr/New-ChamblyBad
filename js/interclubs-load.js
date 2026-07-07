/* ============================================================
   interclubs-load.js — Poules & journées de l'accueil (pilotées par CSV)
   - data/poules.csv    : poule,ordre,equipe,bcco
   - data/journees.csv  : journee,date,adversaire,lieu (domicile|exterieur)
   Remplit #poules-mount et #journees-mount (rendu identique au design).
   ============================================================ */
(function () {
  'use strict';
  var poulesMount = document.getElementById('poules-mount');
  var journeesMount = document.getElementById('journees-mount');
  if (!poulesMount && !journeesMount) return;

  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var rows = [], i = 0, f = '', r = [], inQ = false;
    while (i < text.length) {
      var c = text[i];
      if (inQ) { if (c === '"' && text[i + 1] === '"') { f += '"'; i += 2; continue; } if (c === '"') { inQ = false; i++; continue; } f += c; i++; continue; }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ',') { r.push(f); f = ''; i++; continue; }
      if (c === '\n' || c === '\r') { if (f.length || r.length) { r.push(f); rows.push(r); } r = []; f = ''; if (c === '\r' && text[i + 1] === '\n') i += 2; else i++; continue; }
      f += c; i++;
    }
    if (f.length || r.length) { r.push(f); rows.push(r); }
    if (!rows.length) return [];
    var h = rows[0].map(function (x) { return x.trim(); });
    return rows.slice(1).filter(function (x) { return x.some(function (v) { return v && v.trim(); }); })
      .map(function (x) { var o = {}; h.forEach(function (k, idx) { o[k] = (x[idx] || '').trim(); }); return o; });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function isX(v) { return /^(x|1|true|oui|yes)$/i.test(String(v || '').trim()); }

  // -------------------------------------------------- POULES
  function pouleCard(num, teams, dark) {
    var bg = dark ? '#060B3C' : '#fff';
    var fg = dark ? '#fff' : '#0B1130';
    var accent = dark ? '#A5EB78' : '#0A1988';
    var line = dark ? 'rgba(255,255,255,.1)' : '#EEF1F8';
    var numc = dark ? 'rgba(255,255,255,.4)' : '#9AA2BD';
    var rows = teams.map(function (t, i) {
      var b = isX(t.bcco);
      var base = 'display:flex;align-items:center;gap:14px;padding:13px 16px;border-top:1px solid ' + line + (b ? ';background:#A5EB78' : '');
      var pad = String(i + 1).padStart(2, '0');
      var badge = b ? '<span style="margin-left:auto;background:#060B3C;color:#A5EB78;font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:4px 9px;transform:skewX(-8deg)">Notre équipe</span>' : '';
      return '<div style="' + base + '"><span style="font-family:\'Anton\',sans-serif;font-size:18px;line-height:1;width:26px;flex-shrink:0;color:' + (b ? '#060B3C' : numc) + '">' + pad + '</span>'
        + '<span style="font-weight:' + (b ? '800' : '600') + ';font-size:14.5px;color:' + (b ? '#060B3C' : fg) + '">' + esc(t.equipe) + '</span>' + badge + '</div>';
    }).join('');
    return '<div style="background:' + bg + ';border-top:5px solid ' + accent + '"><div style="padding:22px 20px 18px">'
      + '<div style="font-family:\'Anton\',sans-serif;font-weight:400;font-size:26px;text-transform:uppercase;color:' + fg + ';line-height:1">Poule ' + num + '</div>'
      + '<div style="font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:' + accent + ';margin-top:6px">' + teams.length + ' équipes · aller simple</div></div>' + rows + '</div>';
  }

  function renderPoules(rows) {
    if (!poulesMount) return;
    var byPoule = {};
    rows.forEach(function (r) { (byPoule[r.poule] = byPoule[r.poule] || []).push(r); });
    var nums = Object.keys(byPoule).sort();
    // Notre poule (celle du BCCO) affichée en premier
    var bccoPoule = (rows.filter(function (r) { return isX(r.bcco); })[0] || {}).poule;
    if (bccoPoule) nums = [bccoPoule].concat(nums.filter(function (n) { return n !== bccoPoule; }));
    var html = nums.map(function (n, idx) {
      var teams = byPoule[n].slice().sort(function (a, b) { return (+a.ordre || 0) - (+b.ordre || 0); });
      return pouleCard(n, teams, idx % 2 === 1);   // 1re poule claire, 2e sombre
    }).join('');
    poulesMount.innerHTML = html;
    // sous-titre : poule du BCCO
    var bccoRow = rows.filter(function (r) { return isX(r.bcco); })[0];
    var sub = document.getElementById('poules-bcco-poule');
    if (sub && bccoRow) sub.textContent = 'Poule ' + bccoRow.poule;
  }

  // -------------------------------------------------- JOURNÉES
  // Parse une date FR type « 19 sept. 2026 » → objet Date (ou null)
  function parseFrDate(s) {
    var p = String(s || '').toLowerCase().replace(/\./g, ' ').split(/\s+/).filter(Boolean);
    if (p.length < 3) return null;
    var day = parseInt(p[0], 10), year = parseInt(p[2], 10), w = p[1], mo;
    if (w.indexOf('janv') === 0) mo = 0;
    else if (w.indexOf('fév') === 0 || w.indexOf('fev') === 0) mo = 1;
    else if (w.indexOf('mars') === 0) mo = 2;
    else if (w.indexOf('avr') === 0) mo = 3;
    else if (w.indexOf('mai') === 0) mo = 4;
    else if (w.indexOf('juin') === 0) mo = 5;
    else if (w.indexOf('juil') === 0) mo = 6;
    else if (w.indexOf('aoû') === 0 || w.indexOf('aou') === 0) mo = 7;
    else if (w.indexOf('sept') === 0) mo = 8;
    else if (w.indexOf('oct') === 0) mo = 9;
    else if (w.indexOf('nov') === 0) mo = 10;
    else if (w.indexOf('déc') === 0 || w.indexOf('dec') === 0) mo = 11;
    if (mo == null || isNaN(day) || isNaN(year)) return null;
    return new Date(year, mo, day);
  }
  function isPast(dateStr) {
    var d = parseFrDate(dateStr);
    if (!d) return false;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return d < today;   // une rencontre jouée le jour même n'est pas grisée
  }

  function journeeRow(j) {
    var dom = /^dom/i.test(j.lieu);
    var past = isPast(j.date);
    var adv = esc(j.adversaire);
    var vs = '<span style="color:#9AA2BD;font-weight:600;font-size:12px">vs</span>';
    var match = dom ? ('BCCO ' + vs + ' ' + adv) : (adv + ' ' + vs + ' BCCO');
    // Couleurs : accent vert (domicile) / bleu (extérieur), grisé si passé
    var accent = past ? '#C7CCDA' : (dom ? '#A5EB78' : '#0A1988');
    var bg = past ? '#F0F2F7' : '#F5F7FB';
    var jColor = past ? '#9AA2BD' : '#060B3C';
    var matchColor = past ? '#9AA2BD' : '#0B1130';
    var tag = past ? 'Terminé' : (dom ? 'Domicile' : 'Extérieur');
    var tagbg = past ? '#E3E7F0' : (dom ? '#A5EB78' : '#0A1988');
    var tagfg = past ? '#8A93B0' : (dom ? '#060B3C' : '#fff');
    return '<div style="display:flex;align-items:center;gap:12px;background:' + bg + ';border-left:4px solid ' + accent + ';padding:9px 14px;margin-bottom:7px' + (past ? ';opacity:.72' : '') + '">'
      + '<div style="flex:0 0 auto;text-align:center">'
      + '<div style="font-family:\'Anton\',sans-serif;font-size:17px;color:' + jColor + ';line-height:1">J' + esc(j.journee) + '</div>'
      + '<div style="font-size:9.5px;color:#9AA2BD;font-weight:700;margin-top:2px;white-space:nowrap">' + esc(j.date) + '</div></div>'
      + '<div style="flex:1;min-width:0;font-weight:800;font-size:13px;color:' + matchColor + ';line-height:1.3">' + match + '</div>'
      + '<span style="flex:0 0 auto;background:' + tagbg + ';color:' + tagfg + ';font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:5px 9px;transform:skewX(-8deg);white-space:nowrap">' + tag + '</span></div>';
  }

  function renderJournees(rows) {
    if (!journeesMount) return;
    rows.sort(function (a, b) { return (+a.journee || 0) - (+b.journee || 0); });
    journeesMount.innerHTML = rows.map(journeeRow).join('') || '<div style="color:#5A6380;font-size:13px">Calendrier à venir.</div>';
  }

  function load(path) { return fetch(path + '?_=' + Date.now(), { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(parseCSV); }

  if (poulesMount) load('data/poules.csv').then(renderPoules).catch(function (e) { poulesMount.innerHTML = '<div style="color:#5A6380;font-size:13px">Poules indisponibles.</div>'; console.warn('poules', e); });
  if (journeesMount) load('data/journees.csv').then(renderJournees).catch(function (e) { journeesMount.innerHTML = '<div style="color:#5A6380;font-size:13px">Journées indisponibles.</div>'; console.warn('journees', e); });
})();
