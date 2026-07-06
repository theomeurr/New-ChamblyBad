/* ============================================================
   rd-equipes.js — Effectifs & classements (design maquette)
   Sources : data/effectifs.csv, data/classement.csv, data/classement-meta.csv
   ============================================================ */
(function(){
  'use strict';
  var tabsEl = document.getElementById('eq-tabs');
  var contentEl = document.getElementById('eq-content');
  if(!tabsEl) return;

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
  function fetchCSV(url){ return fetch(url+'?t='+Date.now(),{cache:'no-cache'}).then(function(r){ if(!r.ok) throw new Error(url); return r.text(); }).then(parseCSV).catch(function(){ return []; }); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function active(v){ return !('actif' in {v:v}) || /^(x|1|oui|true)$/i.test((v||'').trim()); }
  function isActive(v){ return v==null || v==='' || /^(x|1|oui|true)$/i.test((''+v).trim()); }
  var num = function(v){ var n=parseInt(v,10); return isNaN(n)?0:n; };

  var ORDER = ['top12','n2','r2','icd','d2','d3'];
  var LABELS = { top12:'Top 12', n2:'Nationale 2', r2:'Régionale 2', icd:'ICD Masculin', d2:'Oise D2', d3:'Oise D3' };
  var SUB = {};

  var effectifs = [], classement = [];

  function badge(v){
    if(!v) return '<span style="color:#c2c8d6">—</span>';
    return '<span style="display:inline-block;background:#F0F3FA;color:#0A1988;font-family:\'Anton\',sans-serif;font-size:12px;padding:3px 9px;border:1px solid rgba(10,25,136,.12)">'+esc(v)+'</span>';
  }

  function renderRoster(team){
    var rows = effectifs.filter(function(r){ return r.equipe===team && isActive(r.actif); })
      .sort(function(a,b){ return (a.nom||'').localeCompare(b.nom||'','fr'); });
    if(!rows.length) return '<div style="color:#5A6380;font-size:14px;padding:12px 0">Effectif à venir.</div>';
    var body = rows.map(function(r){
      var cap = /^(x|1|oui|true)$/i.test(r.capitaine||'') ? ' <span title="Capitaine" style="color:#0A1988">★</span>' : '';
      return '<tr style="border-bottom:1px solid rgba(10,25,136,.08)">'
        + '<td style="padding:11px 16px;font-weight:600">'+esc((r.nom||'').toUpperCase())+' '+esc(r.prenom||'')+cap+'</td>'
        + '<td style="padding:11px 16px;text-align:center">'+badge(r.simple)+'</td>'
        + '<td style="padding:11px 16px;text-align:center">'+badge(r.double)+'</td>'
        + '<td style="padding:11px 16px;text-align:center">'+badge(r.mixte)+'</td>'
        + '</tr>';
    }).join('');
    return '<div style="overflow-x:auto;border:1px solid rgba(10,25,136,.12);margin-bottom:34px">'
      + '<table style="width:100%;border-collapse:collapse;font-size:14px;min-width:520px">'
      + '<thead><tr style="background:#060B3C;color:#fff">'
      +   '<th style="text-align:left;padding:13px 16px;font-family:\'Anton\',sans-serif;font-weight:400;letter-spacing:.04em;text-transform:uppercase;font-size:13px">Joueur</th>'
      +   '<th style="padding:13px 16px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#A5EB78">Simple</th>'
      +   '<th style="padding:13px 16px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#A5EB78">Double</th>'
      +   '<th style="padding:13px 16px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#A5EB78">Mixte</th>'
      + '</tr></thead><tbody>'+body+'</tbody></table></div>';
  }

  function renderClassement(team){
    var rows = classement.filter(function(r){ return r.equipe===team; });
    if(!rows.length) return '';
    var pools = {};
    rows.forEach(function(r){ var p=r.pool||''; (pools[p]=pools[p]||[]).push(r); });
    var poolNames = Object.keys(pools).sort();
    var tables = poolNames.map(function(pn){
      var list = pools[pn].slice().sort(function(a,b){ return num(b.Pts)-num(a.Pts); });
      var bcco = list.some(function(r){ return r.chambly; });
      var body = list.map(function(r,i){
        var isCh = !!r.chambly;
        var rowStyle = isCh ? 'background:rgba(165,235,120,.16)' : '';
        var tdC = isCh ? 'color:#060B3C;font-weight:700' : 'color:#0B1130';
        return '<tr style="'+rowStyle+';border-bottom:1px solid rgba(10,25,136,.08)">'
          + '<td style="padding:9px 10px;text-align:center;font-family:\'Anton\',sans-serif;color:'+(isCh?'#060B3C':'#0A1988')+'">'+(i+1)+'</td>'
          + '<td style="padding:9px 10px;text-align:left;'+tdC+'">'+esc(r.team)+(isCh?' <span style="display:inline-block;background:#060B3C;color:#A5EB78;font-family:\'Anton\',sans-serif;font-size:9px;letter-spacing:.06em;padding:1px 6px;margin-left:6px;vertical-align:1px">BCCO</span>':'')+'</td>'
          + '<td style="padding:9px 10px;text-align:center;'+tdC+'">'+esc(r.J)+'</td>'
          + '<td style="padding:9px 10px;text-align:center;'+tdC+'">'+esc(r.G)+'</td>'
          + '<td style="padding:9px 10px;text-align:center;'+tdC+'">'+esc(r.N)+'</td>'
          + '<td style="padding:9px 10px;text-align:center;'+tdC+'">'+esc(r.P)+'</td>'
          + '<td style="padding:9px 10px;text-align:center;font-family:\'Anton\',sans-serif;color:'+(isCh?'#060B3C':'#0A1988')+';font-size:15px">'+esc(r.Pts)+'</td>'
          + '</tr>';
      }).join('');
      var title = pn ? esc(pn) : 'Classement';
      return '<div style="border:1px solid rgba(10,25,136,.12);'+(bcco?'border-color:rgba(165,235,120,.55)':'')+'">'
        + '<div style="background:#060B3C;color:#fff;font-family:\'Anton\',sans-serif;font-size:14px;letter-spacing:.06em;text-transform:uppercase;padding:12px 16px">'+title+(bcco?' <span style="color:#A5EB78;font-size:11px;letter-spacing:.1em">· BCCO</span>':'')+'</div>'
        + '<table style="width:100%;border-collapse:collapse;font-size:13px">'
        + '<thead><tr style="background:#F5F7FB">'
        +   '<th style="padding:9px 8px;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#5A6380">#</th>'
        +   '<th style="padding:9px 8px;text-align:left;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#5A6380">Équipe</th>'
        +   '<th style="padding:9px 8px;font-size:10.5px;font-weight:800;text-transform:uppercase;color:#5A6380">J</th>'
        +   '<th style="padding:9px 8px;font-size:10.5px;font-weight:800;text-transform:uppercase;color:#5A6380">V</th>'
        +   '<th style="padding:9px 8px;font-size:10.5px;font-weight:800;text-transform:uppercase;color:#5A6380">N</th>'
        +   '<th style="padding:9px 8px;font-size:10.5px;font-weight:800;text-transform:uppercase;color:#5A6380">D</th>'
        +   '<th style="padding:9px 8px;font-size:10.5px;font-weight:800;text-transform:uppercase;color:#5A6380">Pts</th>'
        + '</tr></thead><tbody>'+body+'</tbody></table></div>';
    }).join('');
    return '<h3 style="font-family:\'Anton\',sans-serif;font-weight:400;text-transform:uppercase;font-size:clamp(1.2rem,2.2vw,1.6rem);margin:6px 0 16px">Classement</h3>'
      + (SUB[team] ? '<p style="color:#5A6380;font-size:13.5px;margin:0 0 18px;max-width:720px">'+esc(SUB[team])+'</p>' : '')
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px">'+tables+'</div>';
  }

  function showTeam(team){
    [].forEach.call(tabsEl.children, function(b){
      var on = b.getAttribute('data-team')===team;
      b.style.background = on ? '#060B3C' : 'rgba(6,11,60,.08)';
      b.style.color = on ? '#A5EB78' : '#060B3C';
    });
    var n = effectifs.filter(function(r){ return r.equipe===team && isActive(r.actif); }).length;
    contentEl.innerHTML = '<div style="display:flex;align-items:baseline;gap:14px;margin-bottom:18px;flex-wrap:wrap">'
      + '<h2 style="font-family:\'Anton\',sans-serif;font-weight:400;font-size:clamp(1.6rem,3.4vw,2.4rem);text-transform:uppercase;margin:0;color:#060B3C">'+esc(LABELS[team]||team)+'</h2>'
      + '<span style="color:#5A6380;font-size:13.5px;font-weight:600">'+n+' joueur'+(n>1?'s':'')+' inscrit'+(n>1?'s':'')+'</span></div>'
      + renderRoster(team) + renderClassement(team);
  }

  Promise.all([
    fetchCSV('data/effectifs.csv'),
    fetchCSV('data/classement.csv'),
    fetchCSV('data/classement-meta.csv')
  ]).then(function(res){
    effectifs = res[0];
    classement = res[1];
    res[2].forEach(function(r){ if(r.key==='label' && r.equipe) LABELS[r.equipe]=r.value; if(r.key==='subtitle' && r.equipe) SUB[r.equipe]=r.value; });
    var teams = ORDER.filter(function(t){ return effectifs.some(function(r){ return r.equipe===t; }) || classement.some(function(r){ return r.equipe===t; }); });
    tabsEl.innerHTML = teams.map(function(t){
      return '<button data-team="'+t+'" style="padding:11px 20px;font-weight:800;font-size:13px;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;border:none;font-family:inherit;background:rgba(6,11,60,.08);color:#060B3C">'+esc(LABELS[t]||t)+'</button>';
    }).join('');
    [].forEach.call(tabsEl.children, function(b){ b.addEventListener('click', function(){ showTeam(b.getAttribute('data-team')); }); });
    if(teams.length) showTeam(teams[0]);
    else contentEl.innerHTML = '<div style="color:#5A6380">Aucune donnée d\'effectif pour le moment.</div>';
  });
})();
