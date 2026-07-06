/* ============================================================
   rd-ui.js — UI partagée du design maquette
   - [data-hover]  : reproduit le style-hover des maquettes
   - menu mobile   : [data-menu-toggle] / [data-menu-close]
   - apparitions   : [data-reveal] via IntersectionObserver
   - année, ancre  : liens #ancre avec scroll doux
   ============================================================ */
(function(){
  'use strict';

  // ----- style-hover -----
  document.querySelectorAll('[data-hover]').forEach(function(el){
    var base = el.getAttribute('style') || '';
    var hover = el.getAttribute('data-hover') || '';
    var sep = (base && !base.trim().endsWith(';')) ? ';' : '';
    el.addEventListener('mouseenter', function(){ el.setAttribute('style', base + sep + hover); });
    el.addEventListener('mouseleave', function(){ el.setAttribute('style', base); });
  });

  // ----- menu mobile -----
  var menu = document.querySelector('.rd-mobile-menu');
  function toggleMenu(){ if(menu) menu.classList.toggle('open'); }
  function closeMenu(){ if(menu) menu.classList.remove('open'); }
  document.querySelectorAll('[data-menu-toggle]').forEach(function(b){ b.addEventListener('click', toggleMenu); });
  document.querySelectorAll('[data-menu-close]').forEach(function(a){ a.addEventListener('click', closeMenu); });

  // ----- année courante -----
  document.querySelectorAll('[data-year]').forEach(function(el){ el.textContent = new Date().getFullYear(); });

  // ----- apparitions au scroll -----
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nodes = document.querySelectorAll('[data-reveal]');
  if(reduce){
    nodes.forEach(function(n){ n.classList.add('rd-in'); });
  } else if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('rd-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    nodes.forEach(function(n){ io.observe(n); });
  } else {
    nodes.forEach(function(n){ n.classList.add('rd-in'); });
  }
})();
