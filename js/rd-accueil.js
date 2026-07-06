/* ============================================================
   rd-accueil.js — Interactions de la page d'accueil
   - Bascule tarifs Jeunes / Adultes
   - Compteurs animés (data-count) au scroll
   ============================================================ */
(function(){
  'use strict';

  // ----- Tarifs Jeunes / Adultes -----
  var catBtns = document.querySelectorAll('[data-cat]');
  var catGrids = document.querySelectorAll('[data-cat-grid]');
  function setCat(cat){
    catBtns.forEach(function(b){
      var on = b.getAttribute('data-cat') === cat;
      b.style.background = on ? '#060B3C' : 'rgba(6,11,60,.12)';
      b.style.color = on ? '#A5EB78' : '#060B3C';
    });
    catGrids.forEach(function(g){
      g.style.display = (g.getAttribute('data-cat-grid') === cat) ? 'grid' : 'none';
    });
  }
  catBtns.forEach(function(b){
    b.addEventListener('click', function(){ setCat(b.getAttribute('data-cat')); });
  });

  // ----- Compteurs animés -----
  function animateCount(el){
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var t0 = null, dur = 1300;
    function step(t){
      if(t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * ease);
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if(counters.length){
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting){ animateCount(e.target); io.unobserve(e.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach(function(c){ io.observe(c); });
    } else {
      counters.forEach(function(c){ c.textContent = c.getAttribute('data-count'); });
    }
  }
})();
