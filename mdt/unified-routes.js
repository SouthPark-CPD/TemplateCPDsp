/* Fixed internal routes only; never use an arbitrary iframe URL. */
(function(root){
 const routes={procedures:'/mdt/procedures.html',radio:'/mdt/code.html',reglement:'/mdt/reglement.html',tenues:'/mdt/tenues-vehicules.html',organigramme:'/mdt/organigramme.html',rapide:'/mdt/acces-rapide.html',pa:'/academy-admin/index.html',suivi:'/academy-admin/effectifs.html',formations:'/academy-admin/evaluations.html',recrutements:'/academy-admin/recrutements.html',activite:'/academy-admin/activite.html',dossier:'/academy-admin/dossier.html',sessions:'/academy-admin/sessions.html'};
 const params=['id','agent','tab','mode','template','date','schedule','participants','status'];
 function resolve(value,origin){
  const u=new URL(value,origin);if(u.origin!==origin)return null;
  if(u.pathname==='/academy-admin/'||u.pathname==='/academy-admin')u.pathname=routes.pa;
  if(u.pathname==='/academy-admin/suivi.html'||u.pathname==='/academy-admin/effectifs.html'||u.pathname==='/academy-admin/agents.html')u.pathname=routes.suivi;
  const view=Object.keys(routes).find(k=>routes[k]===u.pathname);if(!view)return null;
  return {view,url:u.pathname+u.search+u.hash,academy:u.pathname.startsWith('/academy-admin/')};
 }
 function fromShell(value,origin){
  const u=new URL(value,origin),requested=u.searchParams.get('view');
  const view=requested==='agents'||requested==='effectifs'?'suivi':(Object.hasOwn(routes,requested)?requested:'procedures');
  const child=new URL(routes[view],origin);params.forEach(k=>{u.searchParams.getAll(k).forEach(v=>child.searchParams.append(k,v));});
  child.hash=u.hash;return resolve(child.href,origin);
 }
 function shellUrl(route,origin){const child=new URL(route.url,origin),u=new URL('/mdt/index.html',origin);u.searchParams.set('view',route.view);params.forEach(k=>{child.searchParams.getAll(k).forEach(v=>u.searchParams.append(k,v));});u.hash=child.hash;return u.pathname+u.search+u.hash;}
 root.CPDRoutes={routes,resolve,fromShell,shellUrl};
 if(typeof module!=='undefined')module.exports=root.CPDRoutes;
})(globalThis);
