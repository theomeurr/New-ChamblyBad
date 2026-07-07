/* ============================================================
   rd-mobile.js — Expérience mobile + PWA (site déployé)
   Portage des maquettes « Site mobile et PWA » :
     1. Nav flottante « pill » en bas d'écran (mobile ≤ 920px)
     2. Menu mobile plein écran (typo Anton, liens numérotés)
     3. Bouton « Installer l'application » (menu + bannière)
        piloté par l'événement beforeinstallprompt
     4. Carrousels mobile (.rd-carousel) : points indicateurs + swipe
     5. Lightbox : clic sur [data-zoom] → photo en grand
   Le service worker, lui, est enregistré par pwa.js.
   Aucun markup à ajouter dans les pages : tout est injecté ici.
   ============================================================ */
(function () {
  'use strict';

  var SVG = {
    home:    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    teams:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>',
    gallery: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
    book:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    clock:   '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    download:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>'
  };

  // Page courante → cible des liens + item actif
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var isHome = (page === '' || page === 'index.html');
  var homeUrl = isHome ? '#top' : 'index.html';
  var teamsUrl = isHome ? '#equipes' : 'index.html#equipes';
  var horairesUrl = isHome ? '#horaires' : 'index.html#horaires';

  // ----- 1. Nav pill flottante (mobile) -----
  function buildPill() {
    if (document.querySelector('.rd-pill')) return;
    var nav = document.createElement('nav');
    nav.className = 'rd-pill';
    nav.setAttribute('aria-label', 'Navigation rapide');
    nav.innerHTML =
      '<a href="' + homeUrl + '" aria-label="Accueil"' + (isHome ? ' class="is-active"' : '') + '>' + SVG.home + '</a>' +
      '<a href="' + teamsUrl + '" aria-label="Équipes">' + SVG.teams + '</a>' +
      '<a href="' + horairesUrl + '" aria-label="Horaires">' + SVG.clock + '</a>' +
      '<a href="reservations.html" class="rd-pill-cta' + (page === 'reservations.html' ? ' is-active' : '') + '" aria-label="Réserver un terrain">' + SVG.book + '</a>';
    document.body.appendChild(nav);
    document.body.classList.add('rd-has-pill');
  }

  // ----- 2. Menu mobile plein écran (typo Anton) -----
  function anchor(hash) { return isHome ? hash : 'index.html' + hash; }

  var drawerLinks = [
    { num: '01', label: 'Le club', children: [
      { label: 'Palmarès',    href: anchor('#club') },
      { label: 'Les équipes', href: anchor('#equipes') },
      { label: 'La salle',    href: anchor('#salle') },
      { label: 'Fitness',     href: anchor('#fitness') }
    ] },
    { num: '02', label: 'Actus',    href: anchor('#actus') },
    { num: '03', label: 'Horaires', href: anchor('#horaires') },
    { num: '04', label: 'Galerie',  href: 'galerie.html' },
    { num: '05', label: 'Contact',  href: anchor('#contact') }
  ];

  function buildDrawer() {
    var menu = document.querySelector('.rd-mobile-menu');
    if (!menu || menu.classList.contains('rd-drawer')) return;

    var links = drawerLinks.map(function (l) {
      if (l.children) {
        var subs = l.children.map(function (c) {
          return '<a class="rd-drawer-sublink" href="' + c.href + '" data-menu-close>' + c.label + '</a>';
        }).join('');
        return '<div class="rd-drawer-group">' +
          '<button type="button" class="rd-drawer-link rd-drawer-parent" aria-expanded="false">' +
            '<span class="rd-dl-num">' + l.num + '</span>' +
            '<span class="rd-dl-label">' + l.label + '</span>' +
            '<span class="rd-dl-caret">▾</span>' +
          '</button>' +
          '<div class="rd-drawer-sub">' + subs + '</div>' +
        '</div>';
      }
      return '<a class="rd-drawer-link" href="' + l.href + '" data-menu-close>' +
        '<span class="rd-dl-num">' + l.num + '</span>' +
        '<span class="rd-dl-label">' + l.label + '</span></a>';
    }).join('');

    menu.removeAttribute('style');
    menu.classList.add('rd-drawer');
    // Sortir le drawer du <nav> : son backdrop-filter crée un bloc
    // conteneur qui piégerait le position:fixed dans la hauteur du nav.
    document.body.appendChild(menu);
    menu.innerHTML =
      '<div class="rd-drawer-links">' + links + '</div>' +
      '<div class="rd-drawer-foot">' +
        '<a class="rd-df-outline" href="reservations.html" data-menu-close>Réserver un terrain</a>' +
        '<a class="rd-df-green" href="' + anchor('#rejoindre') + '" data-menu-close>Se licencier</a>' +
        '<button type="button" class="rd-install-drawer" data-pwa-install>' + SVG.download + 'Installer l’application</button>' +
      '</div>';

    // Sous-menu « La structure » : ouverture/fermeture au clic
    // + fermeture du drawer (liens/close portent data-menu-close) + verrou de défilement
    menu.addEventListener('click', function (e) {
      var parent = e.target.closest && e.target.closest('.rd-drawer-parent');
      if (parent) {
        var group = parent.parentNode;
        var isOpen = group.classList.toggle('open');
        parent.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        return;
      }
      if (e.target.closest && e.target.closest('[data-menu-close]')) menu.classList.remove('open');
    });
    // Le bouton ☰ de la barre devient ✕ à l'ouverture (même bouton,
    // on ne redessine pas de logo/texte → la barre ne bouge pas).
    var toggles = document.querySelectorAll('[data-menu-toggle]');
    var mo = new MutationObserver(function () {
      var open = menu.classList.contains('open');
      document.documentElement.style.overflow = open ? 'hidden' : '';
      Array.prototype.forEach.call(toggles, function (b) {
        b.textContent = open ? '✕' : '☰';
        b.setAttribute('aria-label', open ? 'Fermer le menu' : 'Menu');
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
    mo.observe(menu, { attributes: true, attributeFilter: ['class'] });
  }

  // ----- 3. Installation PWA -----
  var deferredPrompt = null;

  function buildInstallUI() {
    // Bouton dans le menu mobile (au cas où le drawer n'aurait pas été construit)
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

  // ----- 4. Carrousels mobile (.rd-carousel) : points + swipe -----
  function buildCarousels() {
    var cars = document.querySelectorAll('.rd-carousel');
    Array.prototype.forEach.call(cars, function (car) {
      if (car.__rdCar) return;
      car.__rdCar = true;

      var dots = document.createElement('div');
      dots.className = 'rd-dots';
      car.insertAdjacentElement('afterend', dots);

      function scrollToIndex(i) {
        var child = car.children[i];
        if (!child) return;
        var cr = car.getBoundingClientRect();
        var chr = child.getBoundingClientRect();
        var delta = (chr.left - cr.left) - (cr.width - chr.width) / 2;
        car.scrollTo({ left: car.scrollLeft + delta, behavior: 'smooth' });
      }

      function activeIndex() {
        var cr = car.getBoundingClientRect();
        var center = cr.left + cr.width / 2;
        var best = 0, bestD = Infinity;
        Array.prototype.forEach.call(car.children, function (ch, i) {
          var r = ch.getBoundingClientRect();
          var d = Math.abs(r.left + r.width / 2 - center);
          if (d < bestD) { bestD = d; best = i; }
        });
        return best;
      }

      function sync() {
        var on = activeIndex();
        Array.prototype.forEach.call(dots.children, function (d, i) {
          d.classList.toggle('on', i === on);
        });
      }

      function render() {
        var n = car.children.length;
        dots.innerHTML = '';
        if (n < 2) return;
        for (var i = 0; i < n; i++) {
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', 'Aller à l’élément ' + (i + 1));
          (function (idx) { b.addEventListener('click', function () { scrollToIndex(idx); }); })(i);
          dots.appendChild(b);
        }
        sync();
      }

      var raf;
      car.addEventListener('scroll', function () {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(sync);
      }, { passive: true });

      render();
      // Contenu injecté après coup (poules chargées en CSV) → régénère les points
      new MutationObserver(render).observe(car, { childList: true });
    });
  }

  // ----- 5. Lightbox : clic sur [data-zoom] → photo en grand -----
  function closeZoom() {
    var lb = document.getElementById('rd-lightbox');
    if (!lb) return;
    lb.classList.remove('open');
    document.documentElement.style.overflow = '';
  }
  function openZoom(src, alt) {
    var lb = document.getElementById('rd-lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'rd-lightbox';
      lb.className = 'rd-lightbox';
      lb.innerHTML = '<button type="button" class="rd-lb-close" aria-label="Fermer">✕</button><img alt="" />';
      document.body.appendChild(lb);
      lb.addEventListener('click', function (e) {
        if (e.target === lb || (e.target.closest && e.target.closest('.rd-lb-close'))) closeZoom();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeZoom(); });
    }
    var img = lb.querySelector('img');
    img.src = src;
    img.alt = alt || '';
    lb.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
  }
  document.addEventListener('click', function (e) {
    var z = e.target.closest ? e.target.closest('[data-zoom]') : null;
    if (z) {
      e.preventDefault();
      var inner = z.querySelector('img');
      openZoom(z.getAttribute('data-zoom'), inner ? inner.alt : '');
    }
  });

  // ----- init -----
  function init() { buildPill(); buildDrawer(); buildCarousels(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
