/* ============================================================
   journees-toggle.js — Bouton « Voir les journées »
   Affiche/masque les journées du BCCO (matchs domicile & extérieur).
   ============================================================ */
(function(){
  'use strict';
  var btn = document.getElementById('voir-journees-btn');
  var panel = document.getElementById('journees-chambly');
  if(!btn || !panel) return;
  var wrap = btn.closest('.bcco-bounce');
  var label = btn.querySelector('span') || btn;

  btn.addEventListener('click', function(){
    var open = panel.style.display === 'block';
    if(open){
      panel.style.display = 'none';
      label.textContent = 'Voir les journées ↓';
      if(wrap) wrap.classList.add('bcco-bounce');
    } else {
      panel.style.display = 'block';
      label.textContent = 'Masquer les journées ↑';
      if(wrap) wrap.classList.remove('bcco-bounce');   // stop le rebond une fois ouvert
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
})();
