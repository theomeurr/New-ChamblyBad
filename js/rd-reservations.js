/* ============================================================
   rd-reservations.js — Réservation avec paiement Stripe (mode test)
   Disponibilités : reservations-api/availability.php (temps réel, MySQL)
   Config statique (tarifs, horaires) : incluse dans la réponse de l'API
   ============================================================ */
(function(){
  'use strict';
  var slotsEl = document.getElementById('rv-slots');
  var labelEl = document.getElementById('rv-date-label');
  var recapEl = document.getElementById('rv-recap');
  if(!slotsEl) return;

  // Renseigner ici la clé publique Turnstile (dash.cloudflare.com → Turnstile → Add site)
  // une fois obtenue. Tant que vide, le CAPTCHA est simplement sauté (le serveur fait
  // de même côté admin-auth/config.php::TURNSTILE_SECRET_KEY).
  var TURNSTILE_SITE_KEY = '';

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
  function pad(n){ return (n<10?'0':'')+n; }

  var JOURS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  var MOIS = ['janv.','févr.','mars','avril','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

  // Valeurs par défaut, mises à jour par la réponse de availability.php
  var CFG = { nbTerrains:9, prix:{60:16,90:24,120:32}, reduc:25, anticipation:14 };
  var licencies = {}; // numéro (normalisé) -> ligne, pour aperçu de prix côté client

  var state = { dayOffset:0, selHour:null, dur:90, slots:[] };

  function dateForOffset(off){ var d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+off); return d; }
  function iso(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function dateLabel(off){
    var d=dateForOffset(off);
    return off===0 ? "Aujourd'hui" : JOURS[d.getDay()]+' '+d.getDate()+' '+MOIS[d.getMonth()];
  }
  function normLicence(n){ return String(n||'').trim().toLowerCase().replace(/^0+/, ''); }

  async function loadSlots(off){
    var dateISO = iso(dateForOffset(off));
    try {
      var res = await fetch('reservations-api/availability.php?date='+dateISO+'&t='+Date.now(), { cache:'no-cache' });
      var data = await res.json();
      if (data.config){
        CFG.nbTerrains = data.config.nb_terrains;
        CFG.prix = { 60:data.config.tarif_1h, 90:data.config.tarif_1h30, 120:data.config.tarif_2h };
        CFG.reduc = data.config.reduction_pct;
        CFG.anticipation = data.config.anticipation_jours;
      }
      return data.slots || [];
    } catch(e){ console.warn('Disponibilités inaccessibles :', e); return []; }
  }

  function paintSlots(slots){
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
      if(!s.full){ btn.addEventListener('click', function(){ state.selHour=s.hour; paintSlots(state.slots); renderRecap(); if(recapEl.firstChild) recapEl.scrollIntoView({behavior:'smooth',block:'center'}); }); }
      slotsEl.appendChild(btn);
    });
  }

  async function renderSlots(){
    labelEl.textContent = dateLabel(state.dayOffset);
    slotsEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#5A6380;font-size:14px;padding:24px">Chargement…</div>';
    var slots = await loadSlots(state.dayOffset);
    state.slots = slots;
    paintSlots(slots);
  }

  function durBtnStyle(on){
    return on
      ? 'border:none;background:#A5EB78;color:#060B3C;padding:10px 16px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit'
      : 'border:1.5px solid rgba(255,255,255,.35);background:transparent;color:#fff;padding:10px 16px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit';
  }

  function renderRecap(){
    if(state.selHour===null){ recapEl.innerHTML=''; return; }
    var total = CFG.prix[state.dur];
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
      +     '<span style="display:inline-block;transform:skewX(8deg)">Réserver ce créneau</span>'
      +   '</button>'
      + '</div>'
      + '</div>';
    recapEl.querySelectorAll('[data-dur]').forEach(function(b){
      b.addEventListener('click', function(){ state.dur=parseInt(b.getAttribute('data-dur'),10); renderRecap(); });
    });
    var conf = document.getElementById('rv-confirm');
    if(conf) conf.addEventListener('click', openModal);
  }

  document.getElementById('rv-prev').addEventListener('click', function(){ state.dayOffset=Math.max(0,state.dayOffset-1); state.selHour=null; renderSlots(); renderRecap(); });
  document.getElementById('rv-next').addEventListener('click', function(){ state.dayOffset=Math.min(CFG.anticipation,state.dayOffset+1); state.selHour=null; renderSlots(); renderRecap(); });

  /* =================================================================
     MODALE — formulaire + Turnstile + création de session Stripe
  ================================================================== */
  var modalOverlay = document.getElementById('rv-modal-overlay');
  var modal = document.getElementById('rv-modal');
  var modalSubtitle = document.getElementById('rv-modal-subtitle');
  var form = document.getElementById('rv-form');
  var licencieCheckbox = document.getElementById('rv-licencie');
  var licenceField = document.getElementById('rv-licence-field');
  var numeroLicence = document.getElementById('rv-numero-licence');
  var licenceStatus = document.getElementById('rv-licence-status');
  var submitBtn = document.getElementById('rv-submit-btn');
  var submitAmount = document.getElementById('rv-submit-amount');
  var formError = document.getElementById('rv-form-error');
  var turnstileContainer = document.getElementById('rv-turnstile');
  var turnstileWidgetId = null;

  function currentPrice(){ return CFG.prix[state.dur] || CFG.prix[60]; }
  function isLicencieVerified(){
    if (!licencieCheckbox || !licencieCheckbox.checked) return false;
    return !!licencies[normLicence(numeroLicence.value)];
  }
  function reducedPrice(p){ if(!CFG.reduc) return p; return Math.round(p*(100-CFG.reduc))/100; }
  function finalPrice(){ var p = currentPrice(); return isLicencieVerified() ? reducedPrice(p) : p; }

  function updateLicenceStatus(){
    if (!licencieCheckbox.checked){ licenceStatus.textContent=''; return; }
    var v = numeroLicence.value.trim();
    if (!v){ licenceStatus.textContent='Saisissez votre numéro pour bénéficier du tarif réduit.'; licenceStatus.style.color='#5A6380'; return; }
    if (isLicencieVerified()){ licenceStatus.textContent='✅ Licence reconnue — tarif réduit appliqué.'; licenceStatus.style.color='#16a34a'; }
    else { licenceStatus.textContent='⚠️ Numéro non reconnu — tarif public appliqué.'; licenceStatus.style.color='#d97706'; }
  }
  function updateSubmitAmount(){ submitAmount.textContent = finalPrice() + ' €'; }

  if (licencieCheckbox){
    licencieCheckbox.addEventListener('change', function(){
      licenceField.style.display = licencieCheckbox.checked ? '' : 'none';
      if (licencieCheckbox.checked) numeroLicence.setAttribute('required',''); else numeroLicence.removeAttribute('required');
      updateLicenceStatus(); updateSubmitAmount();
    });
    numeroLicence.addEventListener('input', function(){ updateLicenceStatus(); updateSubmitAmount(); });
  }

  function renderTurnstile(){
    turnstileContainer.innerHTML = '';
    turnstileWidgetId = null;
    if (!TURNSTILE_SITE_KEY || typeof turnstile === 'undefined') return;
    turnstileWidgetId = turnstile.render(turnstileContainer, { sitekey: TURNSTILE_SITE_KEY });
  }
  function getTurnstileToken(){
    if (!TURNSTILE_SITE_KEY || typeof turnstile === 'undefined' || turnstileWidgetId===null) return null;
    return turnstile.getResponse(turnstileWidgetId) || null;
  }

  function openModal(){
    if (state.selHour===null) return;
    var durLabel = state.dur===60?'1h':(state.dur===90?'1h30':'2h');
    modalSubtitle.textContent = dateLabel(state.dayOffset) + ' · ' + pad(state.selHour) + ':00 · ' + durLabel;
    form.reset();
    licenceField.style.display = 'none';
    licenceStatus.textContent = '';
    formError.style.display = 'none';
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Payer <span id="rv-submit-amount">'+finalPrice()+' €</span>';
    modalOverlay.style.display = 'flex';
    modal.style.display = 'block';
    renderTurnstile();
    setTimeout(function(){ var f=document.getElementById('rv-prenom'); if(f) f.focus(); }, 50);
  }
  function closeModal(){
    modalOverlay.style.display = 'none';
    modal.style.display = 'none';
  }
  document.getElementById('rv-modal-close').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', function(e){ if (e.key==='Escape') closeModal(); });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (!form.checkValidity()){ form.reportValidity(); return; }

    formError.style.display = 'none';
    submitBtn.disabled = true;
    var originalHtml = submitBtn.innerHTML;
    submitBtn.textContent = 'Redirection…';

    var payload = {
      date: iso(dateForOffset(state.dayOffset)),
      heure_debut: pad(state.selHour) + ':00',
      duree: state.dur,
      prenom: document.getElementById('rv-prenom').value.trim(),
      nom: document.getElementById('rv-nom').value.trim(),
      email: document.getElementById('rv-email').value.trim(),
      telephone: document.getElementById('rv-telephone').value.trim(),
      licencie: licencieCheckbox.checked,
      numero_licence: licencieCheckbox.checked ? numeroLicence.value.trim() : '',
      turnstile_token: getTurnstileToken()
    };

    fetch('reservations-api/create_checkout.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){
      return r.json().then(function(data){ return { ok:r.ok, data:data }; });
    }).then(function(res){
      if (!res.ok) throw new Error(res.data.error || 'Erreur inconnue.');
      window.location.href = res.data.checkout_url;
    }).catch(function(err){
      formError.textContent = err.message;
      formError.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
      if (TURNSTILE_SITE_KEY && typeof turnstile !== 'undefined' && turnstileWidgetId!==null) turnstile.reset(turnstileWidgetId);
    });
  });

  // Vérification licence — purement indicative côté client (le serveur revérifie
  // systématiquement le tarif final avant de créer la session de paiement).
  fetchCSV('data/reservations/licencies.csv').then(function(rows){
    rows.forEach(function(r){
      if(!/^(x|1|oui|true)$/i.test((r.actif||'').trim())) return;
      var raw = String(r.numero_licence||'').trim().toLowerCase();
      if (!raw) return;
      licencies[raw] = r;
      var norm = normLicence(raw);
      if (norm) licencies[norm] = r;
    });
  });

  renderSlots();
})();
