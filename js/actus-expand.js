/* ============================================================
   actus-expand.js — Agrandissement des actualités
   Au clic sur une carte d'actu (#rd-actus article), ouvre une
   fenêtre modale affichant l'image et le descriptif en plus grand.
   ============================================================ */
(function(){
  'use strict';

  var grid = document.getElementById('rd-actus');
  if(!grid) return;

  // --- Overlay modal (créé une seule fois) ---
  var overlay = document.createElement('div');
  overlay.id = 'actu-modal';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(6,11,60,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)';
  overlay.innerHTML =
    '<div role="dialog" aria-modal="true" aria-labelledby="actu-modal-title" style="position:relative;background:#060B3C;color:#fff;max-width:760px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 30px 80px rgba(0,0,0,.5)">'
    + '<button type="button" id="actu-modal-close" aria-label="Fermer" style="position:absolute;top:14px;right:14px;z-index:2;width:44px;height:44px;border:none;background:rgba(6,11,60,.65);color:#A5EB78;font-size:24px;line-height:1;cursor:pointer;font-family:inherit">✕</button>'
    + '<div id="actu-modal-media" style="position:relative;width:100%;background:#060B3C">'
    +   '<img id="actu-modal-img" src="" alt="" style="width:100%;max-height:56vh;object-fit:cover;display:block" />'
    +   '<span id="actu-modal-tag" style="position:absolute;top:16px;left:16px;background:#A5EB78;color:#060B3C;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:6px 12px;transform:skewX(-8deg)"></span>'
    + '</div>'
    + '<div style="padding:30px 32px 36px;display:flex;flex-direction:column;gap:14px">'
    +   '<div id="actu-modal-date" style="color:#A5EB78;font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase"></div>'
    +   '<h3 id="actu-modal-title" style="font-family:\'Anton\',sans-serif;font-weight:400;font-size:clamp(1.8rem,4vw,2.6rem);text-transform:uppercase;margin:0;line-height:1.05"></h3>'
    +   '<p id="actu-modal-desc" style="color:rgba(255,255,255,.82);font-size:16px;line-height:1.65;margin:0;white-space:pre-line"></p>'
    + '</div>'
    + '</div>';
  document.body.appendChild(overlay);

  var mImg   = overlay.querySelector('#actu-modal-img');
  var mTag   = overlay.querySelector('#actu-modal-tag');
  var mDate  = overlay.querySelector('#actu-modal-date');
  var mTitle = overlay.querySelector('#actu-modal-title');
  var mDesc  = overlay.querySelector('#actu-modal-desc');
  var mMedia = overlay.querySelector('#actu-modal-media');

  function txt(el){ return el ? (el.textContent || '').trim() : ''; }

  function openFrom(article){
    var img  = article.querySelector('img');
    var tag  = article.querySelector('.actu-badge') || article.querySelector('span[style*="position:absolute"]');
    var date = article.querySelector('.actu-date');
    var h3   = article.querySelector('h3');
    var desc = article.querySelector('p');

    if(img && img.getAttribute('src')){
      mImg.src = img.getAttribute('src');
      mImg.alt = img.getAttribute('alt') || txt(h3);
      mMedia.style.display = '';
    } else {
      mMedia.style.display = 'none';
    }
    if(tag && txt(tag)){ mTag.textContent = txt(tag); mTag.style.display = ''; }
    else { mTag.style.display = 'none'; }
    mDate.textContent  = txt(date);
    mTitle.textContent = txt(h3);
    mDesc.textContent  = txt(desc);

    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close(){
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  overlay.addEventListener('click', function(e){
    if(e.target === overlay || e.target.id === 'actu-modal-close') close();
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && overlay.style.display === 'flex') close();
  });

  // --- Rend les cartes cliquables (délégation) ---
  function enhance(){
    var cards = grid.querySelectorAll('article');
    cards.forEach(function(a){
      if(a.getAttribute('data-actu-ready')) return;
      a.setAttribute('data-actu-ready', '1');
      a.style.cursor = 'pointer';
      a.setAttribute('role', 'button');
      a.setAttribute('tabindex', '0');
      // repères de classe pour un ciblage fiable
      var badge = a.querySelector('span[style*="position:absolute"]');
      if(badge) badge.classList.add('actu-badge');
      var dateEl = a.querySelector('div[style*="A5EB78"][style*="uppercase"]');
      if(dateEl) dateEl.classList.add('actu-date');
      a.addEventListener('click', function(){ openFrom(a); });
      a.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openFrom(a); }
      });
    });
  }

  enhance();
  // Si les cartes sont (re)générées dynamiquement, on ré-attache
  if('MutationObserver' in window){
    new MutationObserver(enhance).observe(grid, { childList: true });
  }
})();
