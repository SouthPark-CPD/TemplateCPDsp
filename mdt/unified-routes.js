/* Fixed internal routes only; never use an arbitrary iframe URL. */
(function(root){
 const routes={procedures:'/mdt/procedures.html',radio:'/mdt/code.html',reglement:'/mdt/reglement.html',tenues:'/mdt/tenues-vehicules.html',organigramme:'/mdt/organigramme.html',rapide:'/mdt/acces-rapide.html',liaison:'/mdt/liaison.html',prosecutor:'/mdt/prosecutor-request.html',doj:'/mdt/communication-doj.html', 'liaison-gouv':'/mdt/liaison-gouvernement.html',avocat:'/mdt/liaison-avocat.html',channel:'/mdt/channel.html',pa:'/academy-admin/index.html',suivi:'/academy-admin/effectifs.html',formations:'/academy-admin/evaluations.html',recrutements:'/academy-admin/recrutements.html',activite:'/academy-admin/activite.html',dossier:'/academy-admin/dossier.html',sessions:'/academy-admin/sessions.html','gang-dashboard':'/mdt/gang-unit.html?view=dashboard','gang-map':'/mdt/gang-unit.html?view=map','gang-gangs':'/mdt/gang-unit.html?view=gangs','gang-intel':'/mdt/gang-unit.html?view=gangs','gang-operations':'/mdt/gang-unit.html?view=operations'};
 const params=['id','agent','tab','mode','template','date','schedule','participants','status','channelKey'];
 function resolve(value,origin){
  const u=new URL(value,origin);if(u.origin!==origin)return null;
  if(u.pathname==='/academy-admin/'||u.pathname==='/academy-admin')u.pathname=routes.pa;
  if(u.pathname==='/academy-admin/suivi.html'||u.pathname==='/academy-admin/effectifs.html'||u.pathname==='/academy-admin/agents.html')u.pathname=routes.suivi;
  if(u.pathname==='/mdt/gang-unit.html'&&!u.searchParams.get('view'))u.searchParams.set('view','dashboard');
  let view=Object.keys(routes).find(k=>{const target=new URL(routes[k],origin);return target.pathname===u.pathname&&[...target.searchParams].every(([key,val])=>u.searchParams.get(key)===val);});if(!view)return null;
  if(view==='channel'){const key=u.searchParams.get('channelKey')||'';if(!/^[a-z0-9-]{1,40}$/.test(key))return null;view=`channel:${key}`;}
  return {view,url:u.pathname+u.search+u.hash,academy:u.pathname.startsWith('/academy-admin/'),gang:view.startsWith('gang-')};
 }
 function fromShell(value,origin){
  const u=new URL(value,origin),requested=u.searchParams.get('view');
  const normalized=requested==='agents'||requested==='effectifs'?'suivi':requested;
  const dynamic=String(normalized||'').match(/^channel:([a-z0-9-]{1,40})$/);
  const view=dynamic?normalized:(Object.hasOwn(routes,normalized)?normalized:'procedures');
  const child=new URL(dynamic?routes.channel:routes[view],origin);if(dynamic)child.searchParams.set('channelKey',dynamic[1]);params.forEach(k=>{u.searchParams.getAll(k).forEach(v=>child.searchParams.append(k,v));});
  child.hash=u.hash;return resolve(child.href,origin);
 }
 function shellUrl(route,origin){const child=new URL(route.url,origin),u=new URL('/mdt/index.html',origin);u.searchParams.set('view',route.view);params.forEach(k=>{child.searchParams.getAll(k).forEach(v=>u.searchParams.append(k,v));});u.hash=child.hash;return u.pathname+u.search+u.hash;}
 root.CPDRoutes={routes,resolve,fromShell,shellUrl};
 if(typeof module!=='undefined')module.exports=root.CPDRoutes;
})(globalThis);
