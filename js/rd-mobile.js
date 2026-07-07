/* ============================================================
   rd-mobile.js — Expérience mobile + PWA (site déployé)
   Portage des maquettes « Site mobile et PWA » :
     1. Nav flottante « pill » en bas d'écran (mobile ≤ 920px)
     2. Bouton « Installer l'application » (menu + bannière)
        piloté par l'événement beforeinstallprompt
   Le service worker, lui, est enregistré par pwa.js.
   Aucun markup à ajouter dans les pages : tout est injecté ici.
   ============================================================ */
(function () {
  'use strict';

  var SVG = {
    home:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    teams:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    gallery: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    book:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    download:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>'
  };

  // Page courante → cible des liens + item actif
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var isHome = (page === '' || page === 'index.html');
  var homeUrl = isHome ? '#top' : 'index.html';
  var teamsUrl = isHome ? '#equipes' : 'index.html#equipes';

  // ----- 1. Nav pill flottante (mobile) -----
  function buildPill() {
    if (document.querySelector('.rd-pill')) return;
    var nav = document.createElement('nav');
    nav.className = 'rd-pill';
    nav.setAttribute('aria-label', 'Navigation rapide');
    nav.innerHTML =
      '<a href="' + homeUrl + '"' + (isHome ? ' class="is-active"' : '') + '>' + SVG.home + '<span>Accueil</span></a>' +
      '<a href="' + teamsUrl + '">' + SVG.teams + '<span>Équipes</span></a>' +
      '<a href="galerie.html"' + (page === 'galerie.html' ? ' class="is-active"' : '') + '>' + SVG.gallery + '<span>Galerie</span></a>' +
      '<a href="reservations.html" class="rd-pill-cta' + (page === 'reservations.html' ? ' is-active' : '') + '">' + SVG.book + '<span>Réserver</span></a>';
    document.body.appendChild(nav);
    document.body.classList.add('rd-has-pill');
  }

  // ----- 2. Installation PWA -----
  var deferredPrompt = null;

  function buildInstallUI() {
    // Bouton dans le menu mobile
    var menu = document.querySelector('.rd-mobile-menu');
    if (menu && !menu.querySelector('.rd-install-drawer')) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rd-install-drawer';
      btn.setAttribute('data-pwa-install', '');
      btn.innerHTML = SVG.download + 'Installer l’application';
      menu.appendChild(btn);
    }
    // Bannière flottante
    if (!document.querySelector('.rd-install-banner')) {
      var banner = document.createElement('div');
      banner.className = 'rd-install-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Installer l’application BCCO');
      banner.innerHTML =
        '<img src="media/icon-192.png" alt="" onerror="this.style.display=\'none\'" />' +
        '<div class="rd-ib-txt"><b>Installer l’appli BCCO</b><small>Accès rapide, plein écran, hors-ligne</small></div>' +
        '<button type="button" class="rd-ib-go" data-pwa-install>Installer</button>' +
        '<button type="button" class="rd-ib-close" aria-label="Fermer">×</button>';
      document.body.appendChild(banner);
      banner.querySelector('.rd-ib-close').addEventListener('click', function () {
        document.body.classList.remove('rd-can-install');
        try { localStorage.setItem('bcco-install-dismissed', '1'); } catch (e) {}
      });
    }
  }

  function doInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () {
      deferredPrompt = null;
      document.body.classList.remove('rd-can-install');
    });
  }

  // Un seul écouteur délégué pour tous les boutons [data-pwa-install]
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-pwa-install]') : null;
    if (t) { e.preventDefault(); doInstall(); }
  });

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    buildInstallUI();
    var dismissed;
    try { dismissed = localStorage.getItem('bcco-install-dismissed'); } catch (err) {}
    if (!dismissed) document.body.classList.add('rd-can-install');
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    document.body.classList.remove('rd-can-install');
    try { localStorage.setItem('bcco-install-dismissed', '1'); } catch (e) {}
  });

  // ----- init -----
  function init() { buildPill(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
