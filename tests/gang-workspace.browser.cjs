const { chromium } = require(process.env.CPD_PLAYWRIGHT || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true, channel: process.env.CPD_BROWSER_CHANNEL || 'msedge'});
 try {
 const page = await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const data={gangs:[{id:'1',name:'Gang test',aliases:'Test',members:'John Smith',status:'actif',color:'#c95757',threatLevel:'elevee',details:{},updatedAt:new Date().toISOString()}],individuals:[],reports:[{id:'8',title:'Ancienne observation',content:'Véhicule aperçu',category:'observation',reliability:'a_confirmer',details:{}}],watchlist:[],operations:[],territories:[],markers:[{id:'2',title:'Planque test',markerType:'hideout',x:50,y:50,gangName:'Gang test',notes:'Repère de test'}]};
 const calls=[];
 await page.route('http://cpd.test/**',async route=>{const u=new URL(route.request().url());if(u.pathname==='/api/gang-unit/data')return route.fulfill({json:{ok:true,...data}});if(u.pathname.includes('/api/gang-unit/')){const input=route.request().postDataJSON();calls.push({url:u.pathname,input});const type=u.pathname.split('/')[3],key={report:'reports',gang:'gangs',individual:'individuals',operation:'operations',watchlist:'watchlist'}[type];if(key){const record={...input,id:input.id || String(20+calls.length),createdAt:new Date().toISOString()};const i=data[key].findIndex(r=>r.id===record.id);if(i<0)data[key].push(record);else data[key][i]=record;return route.fulfill({json:{ok:true,[type]:record}});}return route.fulfill({json:{ok:true}});}if(u.pathname.includes('embedded-shell'))return route.fulfill({body:''});const file=path.join(__dirname,'..',u.pathname);if(fs.existsSync(file))return route.fulfill({body:fs.readFileSync(file),contentType:u.pathname.endsWith('.js')?'application/javascript':u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.png')?'image/png':'text/html'});return route.fulfill({status:404,body:''});});
 await page.goto('http://cpd.test/mdt/gang-unit.html?view=gangs');
 await page.locator('[data-case-open="gang"]').first().click();
 await page.locator('[data-case-tab="timeline"]').click();
 await page.locator('[data-category="Véhicule"]').click();
 await page.locator('.case-modal [name="content"]').fill('Plaque ABC123 observée');
 await page.locator('.case-modal [type="submit"]').click();
 await page.locator('.case-entry').filter({hasText:'Plaque ABC123'}).waitFor();
 assert.deepEqual(calls.at(-1).input.details.links,[{type:'gang',id:'1'}]);
 await page.reload();await page.locator('[data-case-open="gang"]').first().click();await page.locator('[data-case-tab="timeline"]').click();await page.locator('.case-detail').getByText('Plaque ABC123 observée',{exact:true}).waitFor();
 await page.locator('[data-case-action="unlinked"]').first().click();await page.locator('.case-modal [data-case-action="attach"]').click();await page.locator('[data-case-action="choose-link"]').first().click();await page.waitForFunction(()=>!document.querySelector('.case-modal').open);assert.equal(calls.at(-1).input.id,'8');
 await page.locator('[data-case-action="edit"]').click();await page.locator('[name="details.activities"]').fill('Trafic observé');await page.locator('.case-modal [type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('.case-modal').open);assert.equal(data.gangs[0].details.activities,'Trafic observé');
 await page.goto('http://cpd.test/mdt/gang-unit.html?view=map');await page.locator('[data-marker-id="2"]').waitFor();
 const initial=await page.locator('[data-marker-id="2"]').boundingBox();await page.mouse.move(initial.x+initial.width/2,initial.y+initial.height/2);
 for(let i=0;i<20;i++)await page.mouse.wheel(0,-100);
 const hit=page.locator('[data-marker-id="2"] .marker-hit');const bounds=await hit.boundingBox();await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.locator('#marker-detail-title').waitFor({state:'visible'});assert.equal(await page.locator('#marker-detail-title').textContent(),'Planque test');
 await page.route('http://cpd.test/api/auth/session',route=>route.fulfill({json:{authenticated:true,user:{username:'Test'},academyAccess:true,gangAccess:false,academySummary:{newCount:2,pendingCount:3}}}));
 await page.route('http://cpd.test/api/liaison/complaints*',route=>route.fulfill({json:{ok:true,threads:[]}}));
 await page.goto('http://cpd.test/mdt/index.html');await page.locator('[data-section="academy"] .app-badge').waitFor();assert.equal(await page.locator('#shell-message').isVisible(),false);await page.locator('[data-section="academy"]').click();assert.equal(await page.locator('[data-view="recrutements"] .app-badge').textContent(),'3');
 const recruitment={applicationId:'PA-000001',candidateName:'Jane Test',phone:'555',status:'new',recruitmentDecision:'pending',formData:{rpName:'Jane Test'},discordTicket:{channel_id:'123456789012345678',ticket_status:'active',history:[],transcript:{messages:[{id:'1',author:'Jane',content:'Bonjour instructeur',timestamp:new Date().toISOString()}]}}};
 await page.route('http://cpd.test/api/academy-admin-data/recruitment/**',route=>{const url=new URL(route.request().url());if(route.request().method()==='POST'){const input=route.request().postDataJSON();recruitment.discordTicket.ticket_status=input.action==='close'?'closed':input.action==='delete'?'deleted':'active';return route.fulfill({json:{ok:true}});}return route.fulfill({json:url.pathname.endsWith('/tickets')?{ok:true,tickets:[recruitment]}:{ok:true,ticket:recruitment}});});
 await page.goto('http://cpd.test/academy-admin/recrutements.html');await page.locator('[data-ticket-id]').click();await page.locator('.ticket-bubble').filter({hasText:'Bonjour instructeur'}).waitFor();page.on('dialog',dialog=>dialog.accept());await page.locator('[data-ticket-action="close"]').click();await page.locator('[data-ticket-action="reopen"]').waitFor();await page.locator('[data-ticket-action="reopen"]').click();await page.locator('[data-ticket-action="close"]').waitFor();
 await page.goto('http://cpd.test/mdt/gang-unit.html?view=gangs');await page.locator('[data-case-open="gang"]').first().click();await page.screenshot({path:path.join(require('node:os').tmpdir(),'cpd-dossiers-review.png')});
 assert.deepEqual(errors,[]);console.log('PASS: dossiers, observations persistantes, rattachement sans doublon, repère au zoom maximal, accueil et badge Recrutements.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
