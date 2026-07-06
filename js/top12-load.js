/* ============================================================
   top12-load.js — Effectif Top 12 de l'accueil (piloté par CSV)
   Charge data/top12.csv et construit les carrousels Filles / Garçons.
   Colonnes : nom,genre,nationalite,categorie,description,photo,lien
   genre = F (fille) ou G (garçon).
   ============================================================ */
(function () {
  'use strict';
  var mount = document.getElementById('top12-effectif');
  if (!mount) return;
  var CSV = 'data/top12.csv';

  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var rows = [], i = 0, f = '', r = [], inQ = false;
    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"' && text[i + 1] === '"') { f += '"'; i += 2; continue; }
        if (c === '"') { inQ = false; i++; continue; }
        f += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ',') { r.push(f); f = ''; i++; continue; }
      if (c === '\n' || c === '\r') {
        if (f.length || r.length) { r.push(f); rows.push(r); }
        r = []; f = ''; if (c === '\r' && text[i + 1] === '\n') i += 2; else i++; continue;
      }
      f += c; i++;
    }
    if (f.length || r.length) { r.push(f); rows.push(r); }
    if (!rows.length) return [];
    var h = rows[0].map(function (x) { return x.trim(); });
    return rows.slice(1).filter(function (x) { return x.some(function (v) { return v && v.trim(); }); })
      .map(function (x) { var o = {}; h.forEach(function (k, idx) { o[k] = (x[idx] || '').trim(); }); return o; });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function initials(name) {
    return (name || '').trim().split(/\s+/).map(function (w) { return w.charAt(0) || ''; }).join('').slice(0, 2).toUpperCase();
  }

  var CARD_STYLE = 'flex:0 0 220px;scroll-snap-align:start;text-decoration:none;color:#0B1130;background:#F5F7FB;transition:transform .3s';

  function card(p) {
    var media = (p.photo && p.photo.trim())
      ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.nom) + '" style="width:100%;height:100%;object-fit:cover;object-position:top" />'
      : '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:repeating-linear-gradient(-45deg,#060B3C 0 22px,#0A1988 22px 44px)"><span style="font-family:\'Anton\',sans-serif;font-size:64px;color:#A5EB78;line-height:1">' + esc(initials(p.nom)) + '</span></div>';
    var inner =
      '<div style="height:250px;overflow:hidden;background:#060B3C;position:relative">' + media + '</div>' +
      '<div style="padding:16px 16px 18px">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
          '<span style="font-size:10px;font-weight:800;letter-spacing:.14em;color:#0A1988;text-transform:uppercase">' + esc(p.nationalite) + '</span>' +
          (p.categorie ? '<span style="font-size:10px;font-weight:700;color:#5A6380;text-transform:uppercase;letter-spacing:.1em">' + esc(p.categorie) + '</span>' : '') +
        '</div>' +
        '<div style="font-family:\'Anton\',sans-serif;font-size:19px;text-transform:uppercase;line-height:1.1">' + esc(p.nom) + '</div>' +
        '<div style="font-size:12px;color:#5A6380;margin-top:5px">' + esc(p.description) + '</div>' +
      '</div>';
    if (p.lien && p.lien.trim()) {
      return '<a href="' + esc(p.lien) + '" target="_blank" rel="noopener" style="' + CARD_STYLE + '" data-hover="transform:translateY(-6px)">' + inner + '</a>';
    }
    return '<a href="#equipes" style="' + CARD_STYLE + '" data-hover="transform:translateY(-6px)">' + inner + '</a>';
  }

  function sublabel(txt) {
    return '<div style="font-family:\'Anton\',sans-serif;font-size:clamp(1.05rem,1.7vw,1.35rem);text-transform:uppercase;color:#0A1988;letter-spacing:.02em;margin:26px 0 14px;display:flex;align-items:center;gap:14px"><span style="background:#060B3C;color:#A5EB78;font-size:11px;font-weight:800;letter-spacing:.14em;padding:5px 12px;transform:skewX(-8deg)"><span style="display:inline-block;transform:skewX(8deg)">' + txt + '</span></span><span style="height:2px;flex:1;background:#A5EB78;opacity:.45"></span></div>';
  }
  function scroller(cards) {
    return '<div class="rd-scroll" style="display:flex;gap:16px;overflow-x:auto;padding-bottom:18px;scroll-snap-type:x mandatory">' + cards.join('') + '</div>';
  }

  // Ré-applique l'effet [data-hover] (rd-ui.js ne câble qu'au chargement initial)
  function wireHovers(root) {
    root.querySelectorAll('[data-hover]').forEach(function (el) {
      if (el.getAttribute('data-hover-wired')) return;
      el.setAttribute('data-hover-wired', '1');
      var base = el.getAttribute('style') || '';
      var sep = base && base.trim().slice(-1) !== ';' ? ';' : '';
      var hover = el.getAttribute('data-hover') || '';
      el.addEventListener('mouseenter', function () { el.setAttribute('style', base + sep + hover); });
      el.addEventListener('mouseleave', function () { el.setAttribute('style', base); });
    });
  }

  fetch(CSV + '?_=' + Date.now(), { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
    .then(function (text) {
      var rows = parseCSV(text);
      var filles = rows.filter(function (r) { return /^f/i.test(r.genre); });
      var garcons = rows.filter(function (r) { return !/^f/i.test(r.genre); });
      var html = '';
      if (filles.length) html += sublabel('Filles') + scroller(filles.map(card));
      if (garcons.length) html += sublabel('Garçons') + scroller(garcons.map(card));
      mount.innerHTML = html || '<div style="color:#5A6380;font-size:13px">Effectif à venir.</div>';
      wireHovers(mount);
    })
    .catch(function (e) {
      mount.innerHTML = '<div style="color:#5A6380;font-size:13px">Effectif indisponible pour le moment.</div>';
      console.warn('top12-load:', e);
    });
})();
