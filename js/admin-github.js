/* ============================================================
   admin-github.js — Helper d'intégration GitHub pour l'admin BCCO
   ------------------------------------------------------------
   Permet d'éditer les fichiers du repo (CSV, images) sans quitter
   la page admin, via un proxy PHP côté serveur (admin-auth/gh_proxy.php).

   USAGE :
     const f = await BccoGithub.readFile('data/actualites.csv');
     await BccoGithub.writeFile('data/actualites.csv', newContent, 'msg', f.sha);
     await BccoGithub.uploadImage(file, 'media/actus/photo.jpg', 'msg');

   SÉCURITÉ :
   - Le token GitHub reste sur le serveur (admin-auth/config.php, GITHUB_TOKEN),
     jamais transmis ni stocké dans le navigateur.
   - Seule la session PHP (login admin MySQL) protège l'écriture : le proxy
     appelle require_login() avant tout accès à l'API GitHub.
   ============================================================ */

(function (global) {
  'use strict';

  const REPO_OWNER  = 'theomeurr';
  const REPO_NAME   = 'New-ChamblyBad';
  const REPO_BRANCH = 'main';
  const PROXY_URL   = 'admin-auth/gh_proxy.php';

  // -----------------------------------------------------------
  // Toast notifications
  // -----------------------------------------------------------
  let toastEl = null;
  function ensureToastDom() {
    if (toastEl) return;
    toastEl = document.createElement('div');
    toastEl.id = 'bcco-toast';
    Object.assign(toastEl.style, {
      position: 'fixed', top: '24px', right: '24px',
      maxWidth: '380px', minWidth: '240px',
      padding: '14px 18px', borderRadius: '12px',
      background: '#0A1988', color: '#fff',
      fontSize: '13.5px', fontWeight: '500',
      boxShadow: '0 20px 50px rgba(10,25,136,.28)',
      zIndex: '9999', opacity: '0',
      transform: 'translateY(-10px)',
      transition: 'opacity .2s, transform .2s',
      pointerEvents: 'none', lineHeight: '1.4'
    });
    document.body.appendChild(toastEl);
  }
  function toast(msg, type) {
    ensureToastDom();
    const colors = {
      ok:    { bg: '#16a34a', sh: 'rgba(22,163,74,.32)' },
      err:   { bg: '#ef4444', sh: 'rgba(239,68,68,.32)' },
      info:  { bg: '#0A1988', sh: 'rgba(10,25,136,.28)' },
      warn:  { bg: '#d97706', sh: 'rgba(217,119,6,.32)' }
    };
    const c = colors[type] || colors.info;
    toastEl.style.background = c.bg;
    toastEl.style.boxShadow = `0 20px 50px ${c.sh}`;
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translateY(0)';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(-10px)';
    }, type === 'err' ? 5000 : 3000);
  }

  // -----------------------------------------------------------
  // Proxy PHP : lecture / écriture (le token reste côté serveur)
  // -----------------------------------------------------------
  async function readFile(path) {
    const r = await fetch(PROXY_URL + '?path=' + encodeURIComponent(path), {
      credentials: 'same-origin'
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) {
      throw new Error('Session expirée. Recharge la page pour te reconnecter.');
    }
    if (r.status === 404) throw new Error('Fichier introuvable : ' + path);
    if (!r.ok) throw new Error(data.error || ('Erreur lecture (HTTP ' + r.status + ')'));
    return { content: data.content, sha: data.sha, path: data.path };
  }

  async function writeFile(path, content, message, sha) {
    // Texte UTF-8 → base64
    const bytes = new TextEncoder().encode(content);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    const b64 = btoa(bin);
    return writeBase64(path, b64, message, sha);
  }

  async function writeBase64(path, b64, message, sha) {
    const r = await fetch(PROXY_URL, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content: b64, message: message || ('Mise à jour ' + path), sha })
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) {
      throw new Error('Session expirée. Recharge la page pour te reconnecter.');
    }
    if (!r.ok) throw new Error(data.error || ('Erreur écriture (HTTP ' + r.status + ')'));
    return data;
  }

  // -----------------------------------------------------------
  // Upload d'image avec redimensionnement
  // -----------------------------------------------------------
  // Options : maxDim (number)  |  { maxDim?, quality?, targetWidth?, targetHeight? }
  // Si targetWidth & targetHeight sont fournis : center-crop "cover" vers ces dimensions exactes.
  function resizeImage(file, options = 1600, quality = 0.85) {
    // Compat ascendante : (file, maxDim, quality)
    let opts;
    if (typeof options === 'number') {
      opts = { maxDim: options, quality };
    } else {
      opts = Object.assign({ maxDim: 1600, quality: 0.85 }, options || {});
    }
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          const ctx = c.getContext('2d');

          if (opts.targetWidth && opts.targetHeight) {
            // Mode "card" : center-crop type object-fit:cover vers dimensions exactes
            c.width = opts.targetWidth;
            c.height = opts.targetHeight;
            const targetRatio = opts.targetWidth / opts.targetHeight;
            const srcRatio = img.width / img.height;
            let sx, sy, sw, sh;
            if (srcRatio > targetRatio) {
              // Source plus large → on rogne sur les côtés
              sh = img.height;
              sw = img.height * targetRatio;
              sx = (img.width - sw) / 2;
              sy = 0;
            } else {
              // Source plus haute → on rogne en haut/bas
              sw = img.width;
              sh = img.width / targetRatio;
              sx = 0;
              sy = (img.height - sh) / 2;
            }
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, opts.targetWidth, opts.targetHeight);
          } else {
            // Mode "fit" classique : scale down preserving aspect ratio
            let { width: w, height: h } = img;
            if (Math.max(w, h) > opts.maxDim) {
              const ratio = opts.maxDim / Math.max(w, h);
              w = Math.round(w * ratio);
              h = Math.round(h * ratio);
            }
            c.width = w; c.height = h;
            ctx.drawImage(img, 0, 0, w, h);
          }

          c.toBlob(blob => blob ? resolve(blob) : reject(new Error('Conversion canvas échouée')),
                   file.type === 'image/png' ? 'image/png' : 'image/jpeg',
                   opts.quality);
        };
        img.onerror = () => reject(new Error('Image illisible'));
        img.src = e.target.result;
      };
      fr.onerror = () => reject(new Error('Lecture fichier échouée'));
      fr.readAsDataURL(file);
    });
  }

  async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => {
        const dataUrl = fr.result;
        const b64 = String(dataUrl).split(',')[1] || '';
        resolve(b64);
      };
      fr.onerror = () => reject(new Error('Lecture blob échouée'));
      fr.readAsDataURL(blob);
    });
  }

  async function uploadImage(file, targetPath, message, opts = {}) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      throw new Error('Fichier non reconnu comme image.');
    }
    const blob = await resizeImage(file, opts.maxDim || 1600, opts.quality || 0.85);
    const b64  = await blobToBase64(blob);

    // Le proxy PHP gère lui-même le sha manquant/obsolète (auto-recovery).
    const result = await writeBase64(targetPath, b64, message || ('Upload image ' + targetPath), null);
    return { ...result, path: targetPath };
  }

  // -----------------------------------------------------------
  // CSV helpers (parse / serialize)
  // -----------------------------------------------------------
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const rows = []; let i = 0, field = '', row = [], inQ = false;
    while (i < text.length) {
      const c = text[i];
      if (inQ) {
        if (c === '"' && text[i+1] === '"') { field += '"'; i += 2; continue; }
        if (c === '"') { inQ = false; i++; continue; }
        field += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\n' || c === '\r') {
        if (field.length || row.length) { row.push(field); rows.push(row); }
        row = []; field = '';
        if (c === '\r' && text[i+1] === '\n') i += 2; else i++;
        continue;
      }
      field += c; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    if (!rows.length) return { headers: [], rows: [] };
    const headers = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1).filter(r => r.some(v => v && v.trim())).map(r => {
      const o = {};
      headers.forEach((h, idx) => o[h] = (r[idx] != null ? String(r[idx]) : '').trim());
      return o;
    });
    return { headers, rows: dataRows };
  }

  function csvEscape(v) {
    const s = String(v == null ? '' : v);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function serializeCSV(rows, headers) {
    if (!headers || !headers.length) return '';
    const out = [headers.map(csvEscape).join(',')];
    for (const r of rows) {
      out.push(headers.map(h => csvEscape(r[h])).join(','));
    }
    return out.join('\n') + '\n';
  }

  // -----------------------------------------------------------
  // Misc helpers
  // -----------------------------------------------------------
  function slugify(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'item';
  }

  // -----------------------------------------------------------
  // Export public API
  // -----------------------------------------------------------
  global.BccoGithub = {
    // config
    REPO_OWNER, REPO_NAME, REPO_BRANCH,
    // files
    readFile, writeFile, uploadImage, resizeImage,
    // csv
    parseCSV, serializeCSV,
    // ui
    toast, slugify
  };

})(window);
