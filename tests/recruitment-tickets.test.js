const test=require('node:test');
const assert=require('node:assert/strict');
const {transcript}=require('../server/recruitment-tickets');
const {ticketAction}=require('../server/recruitment-tickets');
const {dossierDetails}=require('../server/gang-unit');
test('les liens de dossiers sont normalisés, dédupliqués et limités',()=>{
 const value=dossierDetails({links:[{type:'gang',id:12},{type:'gang',id:'12'},{type:'unknown',id:'2'},{type:'individual',id:'sql'}],phone:'x'.repeat(200),observedAt:'invalid',secret:'not kept'});
 assert.deepEqual(value.links,[{type:'gang',id:'12'}]);assert.equal(value.phone.length,80);assert.equal(value.observedAt,undefined);assert.equal(value.secret,undefined);
});
test('la sauvegarde de transcript pagine et conserve auteurs et pièces jointes',async()=>{
 const old=global.fetch;process.env.DISCORD_BOT_TOKEN='test';let count=0;
 global.fetch=async(url)=>{count++;assert.match(url,/messages\?limit=100/);const records=count===1?Array.from({length:100},(_,i)=>({id:String(200-i),content:'Message',author:{id:'12',username:'Agent'},attachments:[]})):[{id:'99',content:'Premier',author:{username:'Candidat'},attachments:[{url:'https://cdn.discordapp.com/attachments/a',filename:'capture.png'}]}];return {ok:true,status:200,text:async()=>JSON.stringify(records)};};
 try{const result=await transcript('123');assert.equal(count,2);assert.equal(result.messages.length,101);assert.equal(result.messages[0].content,'Premier');assert.equal(result.messages[0].attachments[0].name,'capture.png');}finally{global.fetch=old;}
});
test('une erreur de récupération ne produit pas un faux transcript complet',async()=>{
 const old=global.fetch;process.env.DISCORD_BOT_TOKEN='test';global.fetch=async()=>({ok:false,status:403,text:async()=>JSON.stringify({message:'Forbidden'})});
 try{await assert.rejects(transcript('123'),{code:'discord_api_error'});}finally{global.fetch=old;}
});
test('supprimer un ticket fermé sauvegarde les échanges avant de supprimer le salon',async()=>{
 const old=global.fetch, events=[];process.env.DISCORD_BOT_TOKEN='test';
 const sql=async(strings,...values)=>{const query=strings.join('?');if(query.includes('RETURNING *')&&query.includes('ticket_job_at'))return [{id:'1'}];if(query.startsWith('SELECT * FROM academy_recruitment_tickets'))return [{channel_id:'123',candidate_discord_id:'456',ticket_status:'closed'}];if(query.includes('SET transcript='))events.push('saved');return [];};
 global.fetch=async(url,options={})=>{if(options.method==='DELETE'){events.push('deleted');return {ok:true,status:204,text:async()=>''};}return {ok:true,status:200,text:async()=>JSON.stringify(url.includes('/messages?')?[]:{guild_id:'1538858756354473984',parent_id:'1538858758116089927',topic:'PA-000001 | candidate:456 | status:closed'})};};
 try{await ticketAction(sql,'PA-000001','delete',{id:'789',username:'Instructor'});assert.deepEqual(events,['saved','deleted']);}finally{global.fetch=old;}
});
