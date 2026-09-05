/* CPD Tablet V3 — native document scrolling, existing APIs only. */
(function(){
 const academy=location.pathname.includes('/academy-admin/');
 const file=location.pathname.split('/').pop()||'index.html';
 const links=academy?[
 ['index.html','Tableau de bord','grid'],['agents.html','Tous les agents','users'],['effectifs.html','Suivi pédagogique','chart'],['evaluations.html','Formations','book'],['recrutements.html','Recrutements','inbox'],['activite.html','Historique','clock']
 ]:[['index.html','Procédures','book'],['code.html','Radio','radio'],['reglement.html','Règlement','list'],['tenues-vehicules.html','Tenues','users'],['organigramme.html','Organigramme','chart'],['acces-rapide.html','Accès rapide','grid']];
 const paths={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',chart:'M4 4v16h16 M8 16v-4 M12 16V8 M16 16V5',book:'M12 5v16 M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1',inbox:'M3 4h18v16H3z M3 13h5l2 3h4l2-3h5',clock:'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',radio:'M5 9h14v12H5z M8 3v6 M8 13h8 M8 17h2',list:'M8 6h13 M8 12h13 M8 18h13 M3 6h1 M3 12h1 M3 18h1'};
 const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[k]||paths.grid}"/></svg>`;
 function start(){
  if(document.querySelector('.tablet-shell'))return;
  document.body.classList.add('tablet-ui');
  const root=document.createElement('div');root.className='tablet-shell';
  const title=file==='dossier.html'?'Dossier agent':(links.find(x=>x[0]===file)||links[0])[1];
  root.innerHTML=`<aside class="tablet-nav"><a class="tablet-brand" href="/mdt/portail.html"><img src="/assets/cpd-seal.png" alt="CPD"><span>CHICAGO<small>POLICE DEPARTMENT</small></span></a><div class="tablet-module">${academy?'POLICE ACADEMY':'MOBILE DATA TERMINAL'}</div><nav aria-label="Navigation">${links.map(([url,name,key])=>`<a href="${url}" aria-label="${name}" title="${name}" ${url===file?'aria-current="page"':''}>${icon(key)}<span>${name}</span></a>`).join('')}</nav><nav class="tablet-bottom"><a href="/mdt/portail.html">${icon('grid')}<span>Changer d’espace</span></a>${academy?'<a href="/mdt/index.html">'+icon('book')+'<span>Ouvrir le MDT</span></a>':'<a href="https://guidejuridiquesp.netlify.app/" target="_blank" rel="noopener">'+icon('book')+'<span>Guide juridique ↗</span></a>'}<a href="${academy?'/api/academy-admin-auth/logout':'/api/auth/logout'}">${icon('users')}<span>Déconnexion</span></a></nav></aside><section class="tablet-work"><header class="tablet-bar"><div><span>${academy?'Police Academy':'MDT'}</span><h1>${title}</h1></div><div class="tablet-account"><span id="tablet-name">${academy?'Instructeur':'Agent CPD'}</span></div></header><div class="tablet-search"></div><div class="tablet-tabs"></div><div class="tablet-scroll" tabindex="0" aria-label="Contenu défilant"></div></section>`;
  const main=document.body.querySelector(':scope > main')||document.body.querySelector(':scope > .qr-wrap');
  const search=document.body.querySelector(':scope > .search-container');
  const tabs=document.body.querySelector(':scope > #categories');
  document.body.prepend(root);
  if(main)root.querySelector('.tablet-scroll').append(main);
  if(search)root.querySelector('.tablet-search').append(search);
  if(tabs)root.querySelector('.tablet-tabs').append(tabs);
  document.querySelectorAll('body > .topbar,body > #site-header,body > footer').forEach(x=>x.hidden=true);
  if(academy){
   const name=document.querySelector('#instructor-name');
   if(name){const sync=()=>document.querySelector('#tablet-name').textContent=name.textContent;sync();new MutationObserver(sync).observe(name,{childList:true,subtree:true,characterData:true});}
  }else fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{const n=d?.user?.globalName||d?.user?.username;if(n)document.querySelector('#tablet-name').textContent=n;}).catch(()=>{});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
