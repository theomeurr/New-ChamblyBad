/* ============================================================
   cookie-consent.js — Bandeau de consentement + Google Analytics
   -----------------------------------------------------------------
   Tant que GA_MEASUREMENT_ID est vide, ce script ne fait rien :
   pas de bandeau, pas de traceur. Dès qu'un identifiant GA4
   (format G-XXXXXXXXXX) est renseigné ci-dessous, le bandeau
   apparaît et Google Analytics n'est chargé qu'après acceptation
   explicite — jamais avant, jamais si refusé.
   ============================================================ */
(function(){
  'use strict';

  // Renseigner ici l'ID de mesure GA4 une fois la propriété créée
  // (analytics.google.com → Admin → Data Streams → Web → Measurement ID).
  var GA_MEASUREMENT_ID = '';

  var STORAGE_KEY = 'bcco_cookie_consent'; // 'accepted' | 'rejected'

  if (!GA_MEASUREMENT_ID) return; // rien à demander tant qu'aucun traceur n'est configuré

  function getConsent(){
    try { return localStorage.getItem(STORAGE_KEY); } catch(e){ return null; }
  }
  function setConsent(value){
    try { localStorage.setItem(STORAGE_KEY, value); } catch(e){}
  }

  function loadGoogleAnalytics(){
    if (document.getElementById('ga-gtag-script')) return;
    var s = document.createElement('script');
    s.id = 'ga-gtag-script';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  function buildBanner(){
    var bar = document.createElement('div');
    bar.id = 'cookie-consent-bar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Consentement cookies');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:500;background:#060B3C;color:#fff;'
      + 'padding:18px 24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;'
      + 'box-shadow:0 -8px 30px rgba(0,0,0,.25);font-family:"Open Sans",system-ui,sans-serif';
    bar.innerHTML =
      '<p style="margin:0;flex:1;min-width:240px;font-size:13.5px;line-height:1.5;color:rgba(255,255,255,.9)">'
      + 'Ce site utilise des cookies de mesure d\'audience, uniquement si vous l\'acceptez. '
      + '<a href="politique-confidentialite.html" style="color:#A5EB78;text-decoration:underline">En savoir plus</a>'
      + '</p>'
      + '<div style="display:flex;gap:10px;flex-shrink:0">'
      +   '<button type="button" id="cookie-reject" style="background:none;border:1.5px solid rgba(255,255,255,.4);color:#fff;'
      +     'padding:10px 18px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;border-radius:8px">Refuser</button>'
      +   '<button type="button" id="cookie-accept" style="background:#A5EB78;border:none;color:#060B3C;'
      +     'padding:10px 20px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;border-radius:8px">Accepter</button>'
      + '</div>';
    document.body.appendChild(bar);

    document.getElementById('cookie-accept').addEventListener('click', function(){
      setConsent('accepted');
      loadGoogleAnalytics();
      closeBanner();
    });
    document.getElementById('cookie-reject').addEventListener('click', function(){
      setConsent('rejected');
      closeBanner();
    });
  }

  function closeBanner(){
    var bar = document.getElementById('cookie-consent-bar');
    if (bar) bar.remove();
    buildReopenLink();
  }

  function buildReopenLink(){
    if (document.getElementById('cookie-reopen-link')) return;
    var link = document.createElement('button');
    link.type = 'button';
    link.id = 'cookie-reopen-link';
    link.textContent = 'Cookies';
    link.setAttribute('aria-label', 'Gérer les préférences cookies');
    link.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:499;background:rgba(6,11,60,.85);'
      + 'color:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.25);border-radius:8px;'
      + 'padding:6px 12px;font-size:11px;font-weight:600;cursor:pointer;font-family:"Open Sans",system-ui,sans-serif';
    link.addEventListener('click', function(){
      link.remove();
      buildBanner();
    });
    document.body.appendChild(link);
  }

  function init(){
    var consent = getConsent();
    if (consent === 'accepted'){
      loadGoogleAnalytics();
      buildReopenLink();
    } else if (consent === 'rejected'){
      buildReopenLink();
    } else {
      buildBanner();
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
