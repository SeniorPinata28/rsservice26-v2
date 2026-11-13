import assert from 'node:assert/strict';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://database.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-key';
process.env.TELEGRAM_BOT_TOKEN='test-token';process.env.TELEGRAM_WEBHOOK_SECRET='test-hook-secret';process.env.TELEGRAM_CHAT_ID='-100123';process.env.TELEGRAM_AI_ENABLED='false';
const {extractPhone,handleTelegramUpdate}=await import('../lib/telegram-bot.js');
const {POST}=await import('../app/api/telegram/webhook/route.js');
assert.equal(extractPhone('+7 (962) 453-72-97, нужен ремонт'),'79624537297');
assert.equal(extractPhone('8 934 041 60 60, вопрос'),'79340416060');
assert.equal(extractPhone('VIN XTA12379624537297'),'');assert.equal(extractPhone('Артикул 28113-1R100'),'');
let calls=[];const sessions=new Map();const slots=[];let lead=null;let administrator=false;let draft=null;const original=global.fetch;
function response(data){return {ok:true,text:async()=>JSON.stringify(data)}}
global.fetch=async(url,opts={})=>{
 const body=opts.body?JSON.parse(opts.body):null;calls.push({url,body,method:opts.method});
 if(url.startsWith('https://database.test')){
  if(url.includes('/telegram_sales_sessions')){
   if(opts.method==='POST'){sessions.set(body[0].chat_id,structuredClone(body[0]));return response([])}
   const id=new URL(url).searchParams.get('chat_id')?.slice(3);return response(sessions.has(id)?[sessions.get(id)]:[]);
  }
  if(url.includes('/telegram_ai_calls')){
   if(opts.method==='POST'){const row=body[0];if(slots.some(r=>r.request_key===row.request_key||(r.day===row.day&&r.global_slot===row.global_slot)||(r.day===row.day&&r.chat_id===row.chat_id&&r.client_slot===row.client_slot)))return {ok:false,status:409,text:async()=>JSON.stringify({error:'conflict'})};slots.push(row);return response([])}
   const filter=new URL(url).searchParams.get('chat_id')?.slice(3);return response(filter?slots.filter(r=>r.chat_id===filter):slots);
  }
  if(url.includes('/rate_limits'))return response([]);
  
  if(url.includes('/telegram_manager_audit'))return response([]);
  if(url.includes('/telegram_reply_drafts')){if(opts.method==='PATCH'){if(url.includes('status=eq.draft')&&draft.status!=='draft')return response([]);Object.assign(draft,body);return response([draft])}return response(draft?[draft]:[]);}
  if(url.includes('/leads')){if(opts.method==='PATCH'){Object.assign(lead,body);return response([lead])}if(opts.method==='POST'){lead={...body[0],id:'11111111-1111-4111-8111-111111111111',public_id:'RS-TEST'};return response([lead])}return response(lead?[lead]:[])}
  return response([]);
 }
 return {ok:true,json:async()=>({ok:true,result:url.endsWith('/getChatAdministrators')?(administrator?[{user:{id:123456},status:'administrator'},{user:{id:999999},status:'administrator'}]:[]):{}})};
};
const message=(id,text)=>({update_id:id,message:{chat:{id:123456,type:'private'},from:{id:123456,first_name:'Тест'},text}});
const authorized=update=>POST(new Request('https://example.test/api/telegram/webhook',{method:'POST',headers:{'x-telegram-bot-api-secret-token':'test-hook-secret'},body:JSON.stringify(update)}));
await handleTelegramUpdate({update_id:1,message:{chat:{id:-100123,type:'group'},from:{id:3},text:'Клиент 79624537297'}});assert.equal(calls.length,0,'group discussion must not become a lead');
const denied=await POST(new Request('https://example.test/api/telegram/webhook',{method:'POST',body:'{"update_id":3}'}));assert.equal(denied.status,401);
assert.equal((await authorized(message(2,'Нужна замена масла'))).status,200);assert.equal(lead,null,'conversation must not create a lead before consent');
assert.equal((await authorized(message(3,'Пятигорск'))).status,200);
assert.equal((await authorized(message(4,'Toyota Camry 2018'))).status,200);
assert.equal((await authorized(message(5,'+7 962 453-72-97'))).status,200);
const clientDraft=sessions.get('123456').data.draftId;assert.ok(clientDraft);assert.equal(lead,null);
const submit={update_id:6,callback_query:{id:'callback-1',from:{id:123456},message:{chat:{id:123456,type:'private'}},data:'c:submit:'+clientDraft}};
assert.equal((await authorized(submit)).status,200);assert.equal(lead.car_text,'Toyota Camry 2018');assert.equal(lead.raw_payload.city,'Пятигорск');
assert.ok(calls.some(c=>c.body?.chat_id==='-100123'&&c.body.text.includes('RS-TEST')));
assert.equal((await authorized(submit)).status,200);
assert.equal(calls.filter(c=>c.url.startsWith('https://database.test/rest/v1/leads')&&c.method==='POST').length,1,'duplicate confirmation must not insert twice');
const before=calls.filter(c=>c.url.startsWith('https://database.test/rest/v1/leads')).length;
await authorized(message(7,'/manager'));
assert.equal(calls.filter(c=>c.url.startsWith('https://database.test/rest/v1/leads')).length,before,'non-admin must not read CRM');
administrator=true;await authorized(message(8,'/manager'));
assert.ok(calls.some(c=>c.body?.text?.includes('Рабочая панель')));
const status={update_id:9,callback_query:{id:'callback-staff',from:{id:123456},message:{chat:{id:123456,type:'private'}},data:'m:take:'+lead.id}};
await authorized(status);assert.equal(lead.status,'in_progress');assert.ok(calls.some(c=>c.url.includes('/telegram_manager_audit')&&c.body?.[0]?.actor_id==='123456'));
draft={id:'22222222-2222-4222-8222-222222222222',lead_id:lead.id,actor_id:'123456',body:'Уточните удобный день для диагностики.',status:'draft',expires_at:new Date(Date.now()+600000).toISOString()};
const sendDraft=(actor,id)=>({update_id:id,callback_query:{id:'send-'+id,from:{id:actor},message:{chat:{id:actor,type:'private'}},data:'m:send:'+draft.id}});
let customerSends=()=>calls.filter(c=>c.body?.chat_id==='123456'&&c.body?.text?.startsWith('Ответ менеджера')).length;
await authorized(sendDraft(999999,10));assert.equal(customerSends(),0,'another staff member must not send someone else’s draft');
await authorized(sendDraft(123456,11));assert.equal(customerSends(),1,'approved draft should reach only the bound customer chat');
await authorized(sendDraft(123456,12));assert.equal(customerSends(),1,'double click must not send twice');
const {reserve}=await import('../lib/sales-ai.js');process.env.TELEGRAM_AI_DAILY_LIMIT='2';process.env.TELEGRAM_AI_CHAT_DAILY_LIMIT='1';
assert.deepEqual(await Promise.all([reserve('quota-a','chat-a','test'),reserve('quota-b','chat-b','test')]),[true,true]);
assert.equal(await reserve('quota-c','chat-c','test'),false);assert.equal(await reserve('quota-a','chat-a','test'),false);assert.equal(slots.length,2);
global.fetch=original;console.log('Telegram sales checks passed: consent, conversation, persistence, duplicate confirmation, staff authorization, audited status, draft ownership and double-send protection.');
