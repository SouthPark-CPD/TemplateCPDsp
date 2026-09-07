const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {guardMutation,decodeCookie}=require('../server/request-security');
const {prepareAsset}=require('../server/page-response');
const {parseImagePayload}=require('../server/police-media');
const routes=require('../mdt/unified-routes');
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(data){this.data=data;return this},end(){this.ended=true}};}
test('les mutations refusent les origines étrangères et les formulaires simples',()=>{
 for(const headers of [{origin:'https://attacker.test','content-type':'application/json'},{origin:'null','content-type':'application/json'},{'content-type':'application/x-www-form-urlencoded'},{'sec-fetch-site':'cross-site','content-type':'application/json'}]){const res=response();assert.equal(guardMutation({method:'POST',headers:{host:'cpd.test',...headers},body:{}},res),false);assert.ok([403,415].includes(res.statusCode));}
});
test('JSON même origine et clients serveur authentifiés restent compatibles',()=>{
 for(const headers of [{host:'cpd.test',origin:'https://cpd.test'},{host:'localhost:3000',origin:'http://localhost:3000'},{host:'cpd.test'}])assert.equal(guardMutation({method:'POST',headers:{...headers,'content-type':'application/json; charset=utf-8'},body:{}},response()),true);
});
test('la limite mesure le corps réel même sans Content-Length',()=>{const res=response();assert.equal(guardMutation({method:'POST',headers:{host:'cpd.test','content-type':'application/json'},body:{text:'x'.repeat(200)}},res,100),false);assert.equal(res.statusCode,413);});
test('un cookie invalide ne casse pas la session',()=>{assert.equal(decodeCookie('%E0%A4%A'),'');assert.equal(decodeCookie('abc%20def'),'abc def');});
test('un document HTML reste non stockable ; un fichier inchangé renvoie 304',()=>{
 const req={method:'GET',headers:{}},stat={size:42,mtimeMs:1000},res=response();assert.equal(prepareAsset(req,res,stat,'.html'),false);assert.equal(res.headers['Cache-Control'],'private, no-store');
 const asset=response();prepareAsset(req,asset,stat,'.css');const cached=response();assert.equal(prepareAsset({method:'GET',headers:{'if-none-match':asset.headers.ETag}},cached,stat,'.css'),true);assert.equal(cached.statusCode,304);
});
test('du HTML annoncé comme PNG est refusé',()=>{const data=Buffer.from('<script>alert(1)</script>').toString('base64');assert.equal(parseImagePayload({type:'image/png',data:`data:image/png;base64,${data}`}).ok,false);});
test('les liens cartographiques conservent le repère et le sous-onglet dans la tablette',()=>{const origin='https://cpd.test',resolved=routes.resolve('/mdt/gang-unit.html?view=map&kind=marker&target=42&sub=individuals',origin);const restored=routes.fromShell(routes.shellUrl(resolved,origin),origin);assert.deepEqual(Object.fromEntries(new URL(restored.url,origin).searchParams),Object.fromEntries(new URL(resolved.url,origin).searchParams));assert.equal(routes.resolve('https://attacker.test/mdt/index.html',origin),null);});
test('les fichiers internes sont bloqués avant le fallback statique Vercel',()=>{const config=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../vercel.json')));const deny=config.routes.filter(r=>r.status===404).map(r=>new RegExp(`^(?:${r.src})$`));for(const path of ['/server/auth.js','/tests/security.test.js','/.env.local','/package-lock.json','/PROJECT_CONTEXT.md','/SQL-PLANNING-FORMATIONS-V8.sql'])assert.ok(deny.some(r=>r.test(path)),path);for(const path of ['/api/auth/session','/mdt/index.html','/assets/motion.css'])assert.equal(deny.some(r=>r.test(path)),false,path);});
