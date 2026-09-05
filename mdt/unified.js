/* Persistent shell; all module scripts and server authorization stay isolated. */
(()=>{
 const R=CPDRoutes,origin=location.origin,frame=document.getElementById('module-frame');
 const message=document.getElementById('shell-message'),retry=document.getElementById('retry-session'),paMenu=document.getElementById('pa-menu');
 const mdt=[['rapide','Accès rapide','grid'],['procedures','Procédures','book'],['radio','Radio','radio'],['reglement','Règlement','list'],['tenues','Tenues','users'],['organigramme','Organigramme','chart']];
 const pa=[['pa','Tableau de bord','grid'],['agents','Tous les agents','users'],['suivi','Suivi pédagogique','chart'],['formations','Formations','book'],['recrutements','Recrutements','inbox'],['activite','Historique','clock']];
 const paths={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',chart:'M4 4v16h16 M8 16v-4 M12 16V8 M16 16V5',book:'M12 5v16 M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1',inbox:'M3 4h18v16H3z M3 13h5l2 3h4l2-3h5',clock:'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',radio:'M5 9h14v12H5z M8 3v6 M8 13h8 M8 17h2',list:'M8 6h13 M8 12h13 M8 18h13 M3 6h1 M3 12h1 M3 18h1'};
 const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[k]}"/></svg>`;
 let authorized=false,ready=false,current=null,timer;
 window.CPDUnifiedShell=true;
 function renderLinks(id,items){document.getElementById(id).innerHTML=items.map(([key,label,k])=>`<a class="${key==='rapide'?'nav-mdt-quick':''}" href="${R.shellUrl(R.resolve(R.routes[key],origin),origin)}" data-view="${key}">${icon(k)}<span>${label}</span></a>`).join('');}
 renderLinks('mdt-links',mdt);
 const navToggle=document.getElementById('nav-toggle');
 navToggle.addEventListener('click',()=>{const collapsed=document.body.classList.toggle('nav-collapsed');navToggle.setAttribute('aria-expanded',String(!collapsed));navToggle.setAttribute('aria-label',collapsed?'Afficher le menu':'Réduire le menu');});
 function refreshBadge(){if(!authorized)return;fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{const badge=document.getElementById('pa-count');if(!badge||!data?.academyAccess)return;const count=Number(data.academySummary?.newCount||0);badge.textContent=String(count);badge.hidden=count<=0;}).catch(()=>{});}
 function displayRoute(route){
  current=route;const item=[...mdt,...pa].find(x=>x[0]===route.view);
  const title=item?.[1]||(route.view==='dossier'?'Dossier agent':'Sessions de formation');
  document.getElementById('view-title').textContent=title;frame.title=title;
  document.getElementById('section-name').textContent=route.academy?'Police Academy':'MDT';
  document.querySelectorAll('[data-view]').forEach(a=>{if(a.dataset.view===route.view||(route.view==='dossier'&&a.dataset.view==='agents'))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(route.academy)paMenu.open=true;
 }
 function navigate(route,push=true){
  if(!ready||!route)return;
  if(route.academy&&!authorized){message.textContent='L’accès à la Police Academy est réservé aux instructeurs.';message.hidden=false;return;}
  if(push)history.pushState(null,'',R.shellUrl(route,origin));
  displayRoute(route);frame.hidden=false;message.hidden=false;message.textContent='Chargement…';retry.hidden=true;
  clearTimeout(timer);timer=setTimeout(()=>{message.textContent='Le chargement prend plus de temps que prévu.';retry.hidden=false;},15000);
  frame.src=route.url;
 }
 document.querySelector('.unified-nav').addEventListener('click',e=>{
  const a=e.target.closest('a[data-view]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  e.preventDefault();navigate(R.resolve(R.routes[a.dataset.view],origin));
 });
 frame.addEventListener('load',()=>{
  clearTimeout(timer);
  try{
   const win=frame.contentWindow,doc=frame.contentDocument,url=new URL(win.location.href);
   if(url.href==='about:blank')return;
   if(url.origin!==origin){message.textContent='Impossible d’afficher cette page.';message.hidden=false;return;}
   if(url.pathname.startsWith('/auth/')||url.pathname.startsWith('/academy-auth/')){
    if(url.pathname.includes('denied')){frame.hidden=true;message.textContent='Accès refusé à cette rubrique.';message.hidden=false;return;}
    location.replace(url.pathname+url.search);return;
   }
   if(url.pathname==='/'){location.replace('/');return;}
   const route=R.resolve(url.href,origin);
   if(!route){message.textContent='Cette rubrique est indisponible.';message.hidden=false;retry.hidden=false;return;}
   displayRoute(route);history.replaceState(null,'',R.shellUrl(route,origin));message.hidden=true;retry.hidden=true;
   // Keep internal links and dossier/query parameters within this application.
   doc.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.hasAttribute('download'))return;
    const dest=new URL(a.href,win.location.href);if(dest.origin!==origin)return;
    if(dest.pathname===url.pathname&&dest.search===url.search&&dest.hash)return;
    let target=R.resolve(dest.href,origin);
    if(dest.pathname==='/mdt/index.html'||dest.pathname==='/mdt/'||dest.pathname==='/mdt/portail.html')target=R.fromShell(dest.href,origin);
    if(target){e.preventDefault();navigate(target);}
    else if(dest.pathname.includes('/logout')){e.preventDefault();location.assign(dest.pathname);}
   });
  }catch{message.textContent='Impossible de charger la rubrique. Réessayez.';message.hidden=false;retry.hidden=false;}
 });
 async function session(){
  retry.disabled=true;
  try{
   const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});
   if(response.status===401){location.replace('/auth/login.html?error=login_required');return;}
   if(!response.ok)throw new Error('session');
   const data=await response.json();if(!data.authenticated)throw new Error('session');
   authorized=data.academyAccess===true;ready=true;paMenu.hidden=!authorized;
   if(authorized){renderLinks('pa-links',pa);const count=Number(data.academySummary?.newCount||0);const badge=document.getElementById('pa-count');badge.textContent=String(count);badge.hidden=count<=0;refreshBadge();}
   else document.getElementById('pa-links').replaceChildren();
   document.getElementById('agent-name').textContent=data.user?.globalName||data.user?.username||'Agent CPD';
   let route=R.fromShell(location.href,origin);if(route.academy&&!authorized){route=R.resolve(R.routes.procedures,origin);history.replaceState(null,'',R.shellUrl(route,origin));}
   navigate(route,false);
  }catch{message.textContent='Impossible de vérifier vos accès. Réessayez.';message.hidden=false;retry.hidden=false;}
  finally{retry.disabled=false;}
 }
 retry.addEventListener('click',()=>ready&&current?navigate(current,false):session());
 addEventListener('message',e=>{if(e.origin===origin&&e.data?.type==='academy-recruitment-updated')refreshBadge();});
 setInterval(refreshBadge,15000);
 addEventListener('popstate',()=>navigate(R.fromShell(location.href,origin),false));
 session();
})();
