/* ============================================================
   rd-reservations.js — Réservation (design maquette) sur données réelles
   Sources : data/reservations/{config,creneaux_ouverts,creneaux_bloques,reservations}.csv
   ============================================================ */
(function(){
  'use strict';
  var slotsEl = document.getElementById('rv-slots');
  var labelEl = document.getElementById('rv-date-label');
  var recapEl = document.getElementById('rv-recap');
  if(!slotsEl) return;

  function parseCSV(text){
    if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
    var rows=[], i=0, f='', r=[], inQ=false;
    while(i<text.length){
      var c=text[i];
      if(inQ){ if(c==='"'&&text[i+1]==='"'){f+='"';i+=2;continue;} if(c==='"'){inQ=false;i++;continue;} f+=c;i++;continue; }
      if(c==='"'){inQ=true;i++;continue;}
      if(c===','){r.push(f);f='';i++;continue;}
      if(c==='\n'||c==='\r'){ if(f.length||r.length){r.push(f);rows.push(r);} r=[];f=''; if(c==='\r'&&text[i+1]==='\n')i+=2; else i++; continue; }
      f+=c;i++;
    }
    if(f.length||r.length){r.push(f);rows.push(r);}
    if(!rows.length) return [];
    var h=rows[0].map(function(x){return x.trim();});
    return rows.slice(1).filter(function(x){return x.some(function(v){return v&&v.trim();});}).map(function(x){var o={};h.forEach(function(k,idx){o[k]=(x[idx]||'').trim();});return o;});
  }
  function fetchCSV(url){ return fetch(url+'?t='+Date.now(),{cache:'no-cache'}).then(function(r){ if(!r.ok) throw new Error(url); return r.text(); }).then(parseCSV).catch(function(){ return []; }); }
  function active(v){ return /^(x|1|oui|true)$/i.test((v||'').trim()); }
  function toH(t){ return parseInt((t||'').split(':')[0], 10); }
  function pad(n){ return (n<10?'0':'')+n; }

  var JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  var JOUR_KEY = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
  var MOIS = ['janv.','févr.','mars','avril','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

  // Config par défaut (surchargée par config.csv)
  var CFG = { nbTerrains:9, prix:{60:16,90:24,120:32}, reduc:25, anticipation:14 };
  var ouverts = {};   // jourKey -> {debut, fin}
  var bloques = [];   // {date, dh, fh}
  var resa = [];      // réservations confirmées

  var state = { dayOffset:0, selHour:null, dur:90, licencie:false, confirmed:false };

  function dateForOffset(off){ var d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+off); return d; }
  function iso(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function dateLabel(off){
    var d=dateForOffset(off);
    return off===0 ? "Aujourd'hui" : JOURS[d.getDay()]+' '+d.getDate()+' '+MOIS[d.getMonth()];
  }

  function slotsForDate(off){
    var d = dateForOffset(off);
    var key = JOUR_KEY[d.getDay()];
    var win = ouverts[key];
    if(!win) return [];
    var dateISO = iso(d);
    var isBlockedFull = bloques.some(function(b){ return b.date===dateISO; });
    var now = new Date();
    var isToday = off===0;
    var out = [];
    for(var h=win.debut; h<win.fin; h++){
      var blocked = isBlockedFull || bloques.some(function(b){ return b.date===dateISO && h>=b.dh && h<b.fh; });
      var past = isToday && h <= now.getHours();
      var taken = resa.filter(function(r){
        return active(r.statut==null?'x':r.statut||'x') && r.date===dateISO && h>=toH(r.heure_debut) && h<toH(r.heure_fin);
      }).length;
      var restants = (blocked||past) ? 0 : Math.max(0, CFG.nbTerrains - taken);
      out.push({ hour:h, restants:restants, full:restants===0, closed:blocked||past });
    }
    return out;
  }

  function renderSlots(){
    labelEl.textContent = dateLabel(state.dayOffset);
    var slots = slotsForDate(state.dayOffset);
    if(!slots.length){
      slotsEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#5A6380;font-size:14px;padding:24px">Aucun créneau d\'ouverture ce jour-là.</div>';
      recapEl.innerHTML = '';
      return;
    }
    slotsEl.innerHTML = '';
    slots.forEach(function(s){
      var btn = document.createElement('button');
      var sel = state.selHour===s.hour;
      var base = 'border:none;padding:22px 16px;font-family:inherit;text-align:center;transition:transform .2s;';
      if(s.full){ base += 'background:#e2e6f0;color:#9aa2bd;cursor:not-allowed'; }
      else if(sel){ base += 'background:#060B3C;color:#A5EB78;outline:3px solid #A5EB78;cursor:pointer'; }
      else { base += 'background:#A5EB78;color:#060B3C;cursor:pointer'; }
      btn.setAttribute('style', base);
      if(s.full) btn.disabled = true;
      var dispo = s.closed ? (s.restants===0 ? 'Fermé' : 'Complet')
        : (s.full ? 'Complet' : s.restants + (s.restants>1?' terrains libres':' terrain libre'));
      btn.innerHTML = '<span style="font-family:\'Anton\',sans-serif;font-size:24px;display:block;line-height:1.1">'+pad(s.hour)+':00</span>'
        + '<span style="font-size:12px;font-weight:700;display:block;margin-top:6px">'+dispo+'</span>';
      if(!s.full){ btn.addEventListener('click', function(){ state.selHour=s.hour; state.confirmed=false; renderSlots(); renderRecap(); if(recapEl.firstChild) recapEl.scrollIntoView({behavior:'smooth',block:'center'}); }); }
      slotsEl.appendChild(btn);
    });
  }

  function durBtnStyle(on){
    return on
      ? 'border:none;background:#A5EB78;color:#060B3C;padding:10px 16px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit'
      : 'border:1.5px solid rgba(255,255,255,.35);background:transparent;color:#fff;padding:10px 16px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit';
  }

  function renderRecap(){
    if(state.selHour===null){ recapEl.innerHTML=''; return; }
    var raw = CFG.prix[state.dur];
    var total = raw;
    var selHeure = pad(state.selHour)+':00';
    recapEl.innerHTML =
      '<div style="margin-top:50px;background:#060B3C;color:#fff;padding:40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:32px;align-items:center">'
      + '<div>'
      +   '<div style="color:#A5EB78;font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;margin-bottom:10px">Votre sélection</div>'
      +   '<div style="font-family:\'Anton\',sans-serif;font-size:32px;text-transform:uppercase;line-height:1.1">'+dateLabel(state.dayOffset)+' · '+selHeure+'</div>'
      +   '<div style="font-size:14px;color:rgba(255,255,255,.7);margin-top:8px">Halle Marie-Amélie Le Fur · terrain attribué sur place</div>'
      + '</div>'
      + '<div>'
      +   '<div style="color:#A5EB78;font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;margin-bottom:12px">Durée</div>'
      +   '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      +     '<button data-dur="60" style="'+durBtnStyle(state.dur===60)+'">1h · '+CFG.prix[60]+'€</button>'
      +     '<button data-dur="90" style="'+durBtnStyle(state.dur===90)+'">1h30 · '+CFG.prix[90]+'€</button>'
      +     '<button data-dur="120" style="'+durBtnStyle(state.dur===120)+'">2h · '+CFG.prix[120]+'€</button>'
      +   '</div>'
      + '</div>'
      + '<div style="text-align:right">'
      +   '<div style="font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.6)">Total</div>'
      +   '<div style="font-family:\'Anton\',sans-serif;font-size:54px;color:#A5EB78;line-height:1">'+total+' €</div>'
      +   '<button id="rv-confirm" style="margin-top:16px;background:#A5EB78;color:#060B3C;border:none;padding:16px 32px;font-weight:800;font-size:13px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;font-family:inherit;transform:skewX(-8deg)">'
      +     '<span style="display:inline-block;transform:skewX(8deg)">'+(state.confirmed?'✓ Demande enregistrée (démo)':'Confirmer la réservation')+'</span>'
      +   '</button>'
      + '</div>'
      + '</div>';
    recapEl.querySelectorAll('[data-dur]').forEach(function(b){
      b.addEventListener('click', function(){ state.dur=parseInt(b.getAttribute('data-dur'),10); state.confirmed=false; renderRecap(); });
    });
    var conf = document.getElementById('rv-confirm');
    if(conf) conf.addEventListener('click', function(){ state.confirmed=true; renderRecap(); });
  }

  document.getElementById('rv-prev').addEventListener('click', function(){ state.dayOffset=Math.max(0,state.dayOffset-1); state.selHour=null; state.confirmed=false; renderSlots(); renderRecap(); });
  document.getElementById('rv-next').addEventListener('click', function(){ state.dayOffset=Math.min(CFG.anticipation,state.dayOffset+1); state.selHour=null; state.confirmed=false; renderSlots(); renderRecap(); });

  Promise.all([
    fetchCSV('data/reservations/config.csv'),
    fetchCSV('data/reservations/creneaux_ouverts.csv'),
    fetchCSV('data/reservations/creneaux_bloques.csv'),
    fetchCSV('data/reservations/reservations.csv')
  ]).then(function(res){
    var cfgRows = res[0];
    cfgRows.forEach(function(r){
      var k=r.cle, v=r.valeur;
      if(k==='tarif_1h') CFG.prix[60]=parseInt(v,10)||CFG.prix[60];
      else if(k==='tarif_1h30') CFG.prix[90]=parseInt(v,10)||CFG.prix[90];
      else if(k==='tarif_2h') CFG.prix[120]=parseInt(v,10)||CFG.prix[120];
      else if(k==='reduction_licencie_pct') CFG.reduc=parseInt(v,10)||CFG.reduc;
      else if(k==='nb_terrains_reservables') CFG.nbTerrains=parseInt(v,10)||CFG.nbTerrains;
      else if(k==='anticipation_jours') CFG.anticipation=parseInt(v,10)||CFG.anticipation;
    });
    res[1].forEach(function(r){ if(active(r.actif)) ouverts[(r.jour||'').toLowerCase()]={debut:toH(r.heure_debut),fin:toH(r.heure_fin)}; });
    bloques = res[2].filter(function(r){return active(r.actif);}).map(function(r){ return {date:r.date, dh:toH(r.heure_debut), fh:toH(r.heure_fin)}; });
    resa = res[3];
    renderSlots();
  });
})();
