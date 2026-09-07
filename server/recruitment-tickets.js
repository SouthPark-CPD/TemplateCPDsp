const { createApplicationTicket, discordRequest, ACADEMY_GUILD_ID, APPLICATION_CATEGORY_ID, CANDIDATE_PERMISSIONS, AcademyError, applicationEmbeds, CLOSE_TICKET_BUTTON_ID } = require('./academy');
const { decodeModernFormData } = require('./application-form');
let schema;
async function ensureTicketSchema(sql) {
 if (!schema) schema=(async()=>{
  await sql`ALTER TABLE academy_recruitment_applications ADD COLUMN IF NOT EXISTS candidate_discord_id VARCHAR(32)`;
  await sql`ALTER TABLE academy_recruitment_applications ADD COLUMN IF NOT EXISTS ticket_job_at TIMESTAMPTZ`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS academy_recruitment_active_candidate_idx ON academy_recruitment_applications(candidate_discord_id) WHERE candidate_discord_id IS NOT NULL AND status NOT IN ('processed','archived')`;
  await sql`CREATE TABLE IF NOT EXISTS academy_recruitment_tickets (application_id VARCHAR(32) PRIMARY KEY, channel_id VARCHAR(32), channel_name VARCHAR(100), candidate_discord_id VARCHAR(32), candidate_name VARCHAR(120), ticket_status VARCHAR(24) NOT NULL DEFAULT 'active', recruitment_decision VARCHAR(24) NOT NULL DEFAULT 'pending', transcript JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), closed_at TIMESTAMPTZ, closed_by_discord_id VARCHAR(32), closed_by_name VARCHAR(120), deleted_at TIMESTAMPTZ, deleted_by_discord_id VARCHAR(32), deleted_by_name VARCHAR(120), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  await sql`ALTER TABLE academy_recruitment_tickets ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb`;
 })().catch(e=>{schema=null;throw e;});
 return schema;
}
const publicId=id=>`PA-${String(id).padStart(6,'0')}`;
async function ensureWelcome(sql,row,channelId,user,application) {
 if(row.discord_message_id)return;
 const applicationId=publicId(row.id);
 const messages=await discordRequest(`/channels/${channelId}/messages?limit=100`);
 let message=messages.find(m=>(m.embeds || []).some(e=>e.title?.includes(applicationId)));
 if(!message)message=await discordRequest(`/channels/${channelId}/messages`,{method:'POST',body:JSON.stringify({content:`@everyone\n<@${user.id}>, votre candidature **${applicationId}** est enregistrée. Les instructeurs vous répondront ici.`,embeds:applicationEmbeds(applicationId,user,application),allowed_mentions:{parse:['everyone'],users:[user.id]},components:[{type:1,components:[{type:2,style:4,label:'Clore le ticket',custom_id:CLOSE_TICKET_BUTTON_ID}]}]})});
 await sql`UPDATE academy_recruitment_applications SET discord_message_id=${message.id},updated_at=NOW() WHERE id=${row.id}`;
}
async function history(sql,id,action,user) { await sql`UPDATE academy_recruitment_tickets SET history=history || ${JSON.stringify([{action,actor:user.globalName || user.username || 'Police Academy',at:new Date().toISOString()}])}::jsonb, updated_at=NOW() WHERE application_id=${id}`; }
async function createForApplication(sql, row, user, application) {
 await ensureTicketSchema(sql);
 const applicationId=publicId(row.id);
 const [lease]=await sql`UPDATE academy_recruitment_applications SET ticket_job_at=NOW() WHERE id=${row.id} AND (ticket_job_at IS NULL OR ticket_job_at<NOW()-INTERVAL '2 minutes') RETURNING id`;
 if(!lease)throw new AcademyError('ticket_busy',409);
 try {
  const [existing]=await sql`SELECT * FROM academy_recruitment_tickets WHERE application_id=${applicationId}`;
  if(existing?.channel_id){if(existing.ticket_status==='active')await ensureWelcome(sql,row,existing.channel_id,user,application);return {applicationId,channelId:existing.channel_id,channelUrl:`https://discord.com/channels/${ACADEMY_GUILD_ID}/${existing.channel_id}`,ticketStatus:existing.ticket_status};}
  const channels=await discordRequest(`/guilds/${ACADEMY_GUILD_ID}/channels`);
  const recovered=channels.find(c=>c.parent_id===APPLICATION_CATEGORY_ID && c.topic?.includes(applicationId) && c.topic?.includes(`candidate:${user.id}`));
  const save=async channel=>{
   await sql`INSERT INTO academy_recruitment_tickets(application_id,channel_id,channel_name,candidate_discord_id,candidate_name,ticket_status) VALUES(${applicationId},${channel.id},${channel.name || ''},${user.id},${`${row.first_name} ${row.last_name}`.slice(0,120)},'active') ON CONFLICT(application_id) DO NOTHING`;
   await sql`UPDATE academy_recruitment_applications SET discord_channel_id=${channel.id},candidate_discord_id=${user.id},updated_at=NOW() WHERE id=${row.id}`;
   await history(sql,applicationId,'created',user);
  };
  if(recovered){await save(recovered);await ensureWelcome(sql,row,recovered.id,user,application);return {applicationId,channelId:recovered.id,channelUrl:`https://discord.com/channels/${ACADEMY_GUILD_ID}/${recovered.id}`};}
  const ticket=await createApplicationTicket(user,application,{applicationId,onCreated:save});
  await sql`UPDATE academy_recruitment_applications SET discord_message_id=${ticket.messageId},updated_at=NOW() WHERE id=${row.id}`;
  return ticket;
 } finally {await sql`UPDATE academy_recruitment_applications SET ticket_job_at=NULL WHERE id=${row.id}`;}
}
async function readTicket(sql, applicationId) {await ensureTicketSchema(sql);const [row]=await sql`SELECT * FROM academy_recruitment_tickets WHERE application_id=${applicationId}`;return row || null;}
async function transcript(channelId) {
 const messages=[];let before='';
 for(let i=0;i<100;i++){
  const batch=await discordRequest(`/channels/${channelId}/messages?limit=100${before?`&before=${before}`:''}`);
  for(const m of batch)messages.push({id:m.id,author:m.author?.global_name || m.author?.username || 'Discord',authorId:m.author?.id,content:m.content || '',timestamp:m.timestamp,attachments:(m.attachments || []).map(a=>({url:a.url,name:a.filename,contentType:a.content_type})),embeds:(m.embeds || []).map(e=>({title:e.title,description:e.description,fields:e.fields}))});
  if(batch.length<100)return {messages:messages.reverse(),savedAt:new Date().toISOString()};before=batch.at(-1).id;
 }
 throw new AcademyError('transcript_limit_reached',409);
}
async function ticketAction(sql,applicationId,action,user) {
 await ensureTicketSchema(sql);
 const numericId=applicationId.replace(/^PA-0*/,'') || '0';
 const [lease]=await sql`UPDATE academy_recruitment_applications SET ticket_job_at=NOW() WHERE id=${numericId} AND (ticket_job_at IS NULL OR ticket_job_at<NOW()-INTERVAL '2 minutes') RETURNING *`;
 if(!lease)throw new AcademyError('ticket_busy',409);
 try{
  const ticket=await readTicket(sql,applicationId);if(!ticket?.channel_id)throw new AcademyError('ticket_not_created',404);
  if(ticket.ticket_status==='deleted')throw new AcademyError('ticket_deleted',409);
  const channel=await discordRequest(`/channels/${ticket.channel_id}`);
  if(channel.guild_id!==ACADEMY_GUILD_ID || channel.parent_id!==APPLICATION_CATEGORY_ID || !channel.topic?.includes(`candidate:${ticket.candidate_discord_id}`))throw new AcademyError('ticket_channel_mismatch',403);
  if(['close','delete','refresh'].includes(action)){
   const saved=await transcript(ticket.channel_id);
   const messages=new Map((Array.isArray(ticket.transcript?.messages)?ticket.transcript.messages:[]).map(message=>[message.id,message]));
   saved.messages.forEach(message=>messages.set(message.id,message));
   saved.messages=[...messages.values()].sort((a,b)=>new Date(a.timestamp || 0)-new Date(b.timestamp || 0));
   await sql`UPDATE academy_recruitment_tickets SET transcript=${JSON.stringify(saved)}::jsonb,updated_at=NOW() WHERE application_id=${applicationId}`;
  }
  if(action==='delete'){
   if(ticket.ticket_status!=='closed')throw new AcademyError('close_ticket_first',409);
   await discordRequest(`/channels/${ticket.channel_id}`,{method:'DELETE'});
   await sql`UPDATE academy_recruitment_tickets SET ticket_status='deleted',deleted_at=NOW(),deleted_by_discord_id=${user.id},deleted_by_name=${user.globalName || user.username},updated_at=NOW() WHERE application_id=${applicationId}`;
  }else if(action==='close' || action==='reopen'){
   const active=action==='reopen';
   await discordRequest(`/channels/${ticket.channel_id}/permissions/${ticket.candidate_discord_id}`,{method:'PUT',body:JSON.stringify({type:1,allow:active?CANDIDATE_PERMISSIONS:'66560',deny:active?'0':'2048'})});
   await discordRequest(`/channels/${ticket.channel_id}`,{method:'PATCH',body:JSON.stringify({topic:`${applicationId} | candidate:${ticket.candidate_discord_id} | status:${active?'active':'closed'}`})});
   await sql`UPDATE academy_recruitment_tickets SET ticket_status=${active?'active':'closed'},closed_at=${active?null:new Date().toISOString()},closed_by_discord_id=${active?null:user.id},closed_by_name=${active?null:user.globalName || user.username},updated_at=NOW() WHERE application_id=${applicationId}`;
  }
  await history(sql,applicationId,action,user);
  return readTicket(sql,applicationId);
 }finally{await sql`UPDATE academy_recruitment_applications SET ticket_job_at=NULL WHERE id=${numericId}`;}
}
function storedApplication(row){const data=decodeModernFormData(row.availability) || {};return {formVersion:3,...data,firstName:row.first_name,lastName:row.last_name,rpName:data.rpName || `${row.first_name} ${row.last_name}`,phone:row.phone,background:row.experience,additional:row.motivation,ageDisplay:data.age};}
module.exports={ensureTicketSchema,createForApplication,readTicket,ticketAction,storedApplication,transcript};
