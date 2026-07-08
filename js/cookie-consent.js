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
    var overlay = document.createElement('div');
    overlay.id = 'cookie-consent-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(6,11,60,.6);z-index:500;'
      + 'backdrop-filter:blur(2px)';
    document.body.appendChild(overlay);

    var card = document.createElement('div');
    card.id = 'cookie-consent-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-label', 'Consentement cookies');
    card.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:501;'
      + 'background:#fff;border-radius:20px;max-width:420px;width:calc(100% - 40px);'
      + 'padding:32px 30px;box-shadow:0 40px 100px rgba(0,0,0,.3);font-family:"Open Sans",system-ui,sans-serif;'
      + 'text-align:center';
    card.innerHTML =
      '<div style="font-family:\'Anton\',sans-serif;font-weight:400;font-size:20px;text-transform:uppercase;color:#060B3C;margin-bottom:10px">Cookies</div>'
      + '<p style="margin:0 0 24px;font-size:13.5px;line-height:1.6;color:#5A6380">'
      + 'Ce site utilise des cookies de mesure d\'audience, uniquement si vous l\'acceptez. '
      + '<a href="politique-confidentialite.html" style="color:#0A1988;font-weight:700;text-decoration:underline">En savoir plus</a>'
      + '</p>'
      + '<div style="display:flex;gap:10px">'
      +   '<button type="button" id="cookie-reject" style="flex:1;background:none;border:1.5px solid rgba(10,25,136,.2);color:#060B3C;'
      +     'padding:13px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;border-radius:12px">Refuser</button>'
      +   '<button type="button" id="cookie-accept" style="flex:1;background:linear-gradient(135deg,#A5EB78,#7ed957);border:none;color:#060B3C;'
      +     'padding:13px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;border-radius:12px">Accepter</button>'
      + '</div>';
    document.body.appendChild(card);

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
    var overlay = document.getElementById('cookie-consent-overlay');
    var card = document.getElementById('cookie-consent-card');
    if (overlay) overlay.remove();
    if (card) card.remove();
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
