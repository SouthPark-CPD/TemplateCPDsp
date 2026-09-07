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
 await page.reload();await page.locator('[data-case-open="gang"]').first().click();await page.locator('[data-case-tab="timeline"]').click();await page.getByText('Plaque ABC123 observée',{exact:true}).waitFor();
 await page.locator('[data-case-action="unlinked"]').click();await page.locator('.case-modal [data-case-action="attach"]').click();await page.locator('[data-case-action="choose-link"]').first().click();await page.waitForFunction(()=>!document.querySelector('.case-modal').open);assert.equal(calls.at(-1).input.id,'8');
 await page.locator('[data-case-action="edit"]').click();await page.locator('[name="details.activities"]').fill('Trafic observé');await page.locator('.case-modal [type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('.case-modal').open);assert.equal(data.gangs[0].details.activities,'Trafic observé');
 await page.goto('http://cpd.test/mdt/gang-unit.html?view=map');await page.locator('[data-marker-id="2"]').waitFor();
 for(let i=0;i<12;i++)await page.locator('#map-zoom-in').click();
 const hit=page.locator('[data-marker-id="2"] .marker-hit');const bounds=await hit.boundingBox();await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.locator('#marker-detail-title').waitFor({state:'visible'});assert.equal(await page.locator('#marker-detail-title').textContent(),'Planque test');
 assert.deepEqual(errors,[]);console.log('PASS: dossier, observation liée, rechargement, rattachement sans doublon, détails persistants et repère à zoom maximum.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
