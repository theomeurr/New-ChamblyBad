/* ============================================================
   rd-galerie.js — Galerie (design maquette) pilotée par data/galerie.csv
   Colonnes : image,alt,taille,ordre,actif
   ============================================================ */
(function(){
  'use strict';
  var host = document.getElementById('rd-gallery');
  if(!host) return;

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
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  var photos = [];

  function render(){
    host.innerHTML = photos.map(function(p, i){
      return '<figure data-lb="'+i+'" style="margin:0 0 16px;break-inside:avoid;position:relative;overflow:hidden;cursor:zoom-in">'
        + '<img src="'+esc(p.image)+'" alt="'+esc(p.alt)+'" loading="lazy" style="width:100%;display:block;transition:transform .5s" data-hover="transform:scale(1.04)" />'
        + '<figcaption style="position:absolute;left:0;bottom:0;background:#060B3C;color:#A5EB78;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;padding:7px 14px">'+esc(p.alt)+'</figcaption>'
        + '</figure>';
    }).join('');
    // hover zoom (rd-ui.js a déjà tourné, on rebranche pour les nouveaux éléments)
    host.querySelectorAll('[data-hover]').forEach(function(el){
      var base = el.getAttribute('style')||'', hv = el.getAttribute('data-hover');
      el.addEventListener('mouseenter', function(){ el.setAttribute('style', base+';'+hv); });
      el.addEventListener('mouseleave', function(){ el.setAttribute('style', base); });
    });
    host.querySelectorAll('figure[data-lb]').forEach(function(fig){
      fig.addEventListener('click', function(){ openLb(parseInt(fig.getAttribute('data-lb'),10)); });
    });
  }

  // ----- Lightbox -----
  var lb = document.getElementById('rd-lightbox');
  var lbImg = document.getElementById('rd-lb-img');
  var idx = -1;
  function showLb(){ var p = photos[idx]; if(!p) return; lbImg.src = p.image; lbImg.alt = p.alt; }
  function openLb(i){ idx = i; lb.style.display = 'flex'; showLb(); }
  function closeLb(){ lb.style.display = 'none'; idx = -1; }
  function move(d){ if(!photos.length) return; idx = (idx + d + photos.length) % photos.length; showLb(); }

  lb.addEventListener('click', function(e){ if(e.target === lb) closeLb(); });
  document.getElementById('rd-lb-close').addEventListener('click', function(e){ e.stopPropagation(); closeLb(); });
  document.getElementById('rd-lb-prev').addEventListener('click', function(e){ e.stopPropagation(); move(-1); });
  document.getElementById('rd-lb-next').addEventListener('click', function(e){ e.stopPropagation(); move(1); });
  window.addEventListener('keydown', function(e){
    if(idx < 0) return;
    if(e.key === 'Escape') closeLb();
    if(e.key === 'ArrowRight') move(1);
    if(e.key === 'ArrowLeft') move(-1);
  });

  fetch('data/galerie.csv?t='+Date.now(), {cache:'no-cache'})
    .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.text(); })
    .then(function(t){
      photos = parseCSV(t)
        .filter(function(p){ return !('actif' in p) || /^(x|1|oui|true)$/i.test(p.actif); })
        .sort(function(a,b){ return (parseInt(a.ordre,10)||0) - (parseInt(b.ordre,10)||0); });
      if(!photos.length){ host.innerHTML = '<div style="color:#5A6380;font-size:14px">Aucune photo pour le moment.</div>'; return; }
      render();
    })
    .catch(function(){ host.innerHTML = '<div style="color:#5A6380;font-size:14px">Impossible de charger les photos.</div>'; });
})();
