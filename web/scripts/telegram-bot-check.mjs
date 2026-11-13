import assert from 'node:assert/strict';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://database.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-key';
process.env.TELEGRAM_BOT_TOKEN='test-token';process.env.TELEGRAM_WEBHOOK_SECRET='test-hook-secret';process.env.TELEGRAM_CHAT_ID='-100123';
const {extractPhone,handleTelegramUpdate}=await import('../lib/telegram-bot.js');
const {POST}=await import('../app/api/telegram/webhook/route.js');
assert.equal(extractPhone('+7 (962) 453-72-97, нужен ремонт'),'79624537297');
assert.equal(extractPhone('8 934 041 60 60, вопрос'),'79340416060');
assert.equal(extractPhone('VIN XTA12345678901234'),'');assert.equal(extractPhone('Артикул 28113-1R100'),'');
let calls=[];let saved=false;const original=global.fetch;
global.fetch=async(url,opts={})=>{
 const body=opts.body?JSON.parse(opts.body):null;calls.push({url,body,method:opts.method});
 if(url.startsWith('https://database.test')){
  if(url.includes('/rate_limits'))return {ok:true,text:async()=>JSON.stringify([])};
  if(opts.method==='POST'){saved=true;return {ok:true,text:async()=>JSON.stringify([{id:'test-lead',public_id:'RS-TEST'}])};}
  return {ok:true,text:async()=>JSON.stringify(saved?[{id:'test-lead',public_id:'RS-TEST'}]:[])};
 }
 return {ok:true,json:async()=>({ok:true,result:{}})};
};
await handleTelegramUpdate({update_id:1,message:{chat:{id:2,type:'group'},from:{id:3},text:'Клиент 79624537297'}});assert.equal(calls.length,0);
await handleTelegramUpdate({update_id:2,message:{chat:{id:3,type:'private'},from:{id:3},text:'/start'}});assert.equal(calls.length,1);assert.ok(calls[0].body.reply_markup.inline_keyboard[0][0].url.endsWith('/booking'));
const denied=await POST(new Request('https://example.test/api/telegram/webhook',{method:'POST',body:'{"update_id":3}'}));assert.equal(denied.status,401);
const nonAscii=await POST(new Request('https://example.test/api/telegram/webhook',{method:'POST',headers:{'x-telegram-bot-api-secret-token':'é'.repeat(16)},body:'{}'}));assert.equal(nonAscii.status,401);
const update={update_id:4,message:{chat:{id:3,type:'private'},from:{id:3,first_name:'Тест'},text:'+7 962 453-72-97, Пятигорск, нужна диагностика'}};
const request=()=>new Request('https://example.test/api/telegram/webhook',{method:'POST',headers:{'x-telegram-bot-api-secret-token':'test-hook-secret'},body:JSON.stringify(update)});
assert.equal((await POST(request())).status,200);
assert.equal(calls.filter(c=>c.url.startsWith('https://database.test/rest/v1/leads')&&c.method==='POST').length,1);
assert.ok(calls.some(c=>c.body?.chat_id==='-100123'&&c.body.text.includes('RS-TEST')));
assert.equal((await POST(request())).status,200);
assert.equal(calls.filter(c=>c.url.startsWith('https://database.test/rest/v1/leads')&&c.method==='POST').length,1,'duplicate update must not insert twice');
global.fetch=original;console.log('Telegram checks passed: menu, authorization, database save, manager notification, duplicate delivery.');
