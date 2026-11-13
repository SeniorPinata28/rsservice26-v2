import {randomUUID} from 'node:crypto';
import {createLead,db,getLead,updateLead} from './db.js';
import {services} from '../data.js';
import {checkRateLimit} from './rate-limit.js';
import {cleanText,normalizeRussianPhone} from './validation.js';
import {customerAdvice} from './sales-ai.js';
import {extractPhone,detectCity,loadSession,saveSession,nextField,questions} from './telegram-sales-store.js';
import {SITE,menu,contacts,send,telegramCall,notifyLead,leadActions} from './telegram-transport.js';
const onlyDigits=s=>String(s||'').replace(/[^а-яa-z0-9]/gi,'').toLowerCase();
const greeting='Здравствуйте! Я онлайн-помощник RS Service 26. Помогу с ремонтом, обслуживанием или подбором запчастей для автомобиля любой марки.\n\nЧто нужно сделать с автомобилем?';
export async function customerUpdate(update){
 const message=update.message||update.callback_query?.message;
 const from=update.message?.from||update.callback_query?.from;
 const chat=message?.chat;
 if(chat?.type!=='private'||String(chat.id)!==String(from?.id)||from?.is_bot)return;
 let session=await loadSession(chat.id);
 const callback=update.callback_query?.data||'';
 async function respond(text,markup=menu){
  session.lastUpdate=update.update_id;session.lastReply=text;session.lastMarkup=markup;
  await saveSession(chat.id,session);return send(chat.id,text,markup);
 }
 if(session.lastUpdate===update.update_id&&session.lastReply)return send(chat.id,session.lastReply,session.lastMarkup||menu);
 if(callback==='contacts')return respond(contacts);
 if(callback==='services')return respond('Ориентиры по услугам:\n\n'+services.slice(0,16).map(s=>s.name+' — '+s.price).join('\n')+'\n\nОкончательная стоимость зависит от автомобиля и объёма работ. Её подтвердит менеджер.\n'+SITE+'/services');
 if(callback.startsWith('c:submit:')){
  if(session.leadId)return respond('Заявка уже сохранена. Менеджер свяжется с вами.');
  if(!session.draftId||callback!=='c:submit:'+session.draftId||nextField(session))return respond('Эта заявка уже изменилась. Продолжим уточнение.\n'+(questions[nextField(session)]||'Напишите, что нужно сделать.'));
  const limit=await checkRateLimit({request:new Request(SITE),scope:'telegram_leads',customKey:String(chat.id),windowSeconds:60,limit:3,failClosed:true});
  if(!limit.ok)return respond('Сейчас не удалось передать заявку. Подождите минуту или позвоните в автосервис.');
  const key=String(update.update_id);
  const found=await db('leads?source=eq.telegram&raw_payload->>telegram_update_id=eq.'+key+'&select=*&limit=1');
  if(!found.ok)throw new Error('Lead lookup failed');
  let lead=found.data?.[0];
  if(!lead){
   const requestText=(session.history||[]).filter(m=>m.role==='user').map(m=>m.text).join('\n').slice(-3000);
   try{lead=await createLead({type:session.intent==='booking'?'service_booking':session.intent==='parts'?'parts_selection_request':'general_callback',name:cleanText([from.first_name,from.last_name].filter(Boolean).join(' '),100)||'Клиент Telegram',phone:session.phone,car:session.car,text:requestText,source:'telegram',raw:{city:session.city,service_interest:session.service||'',sales_intent:session.intent||'question',telegram_update_id:key,telegram_chat_id:String(chat.id),contact_status:'unverified',consent_at:new Date().toISOString()}})}
   catch(error){const retry=await db('leads?source=eq.telegram&raw_payload->>telegram_update_id=eq.'+key+'&select=*&limit=1');lead=retry.ok?retry.data?.[0]:null;if(!lead)throw error;}
  }
  session.leadId=lead.id;session.draftId=null;await saveSession(chat.id,session);
  const notified=await notifyLead(lead);
  return respond(`Заявка ${lead.public_id||''} сохранена${notified?' и передана менеджеру':''}. Он свяжется с вами, чтобы согласовать цену и время.\n\nДополнения можно написать здесь. Для другого обращения нажмите «Начать новую заявку».`);
 }
 const text=cleanText(update.message?.text,2000);
 const command=text.split(/[\s@]/)[0].toLowerCase();
 if(callback==='new'||callback==='c:cancel'||['/new','/reset'].includes(command)){session={};return respond(greeting);}
 if(['/start','/menu','/help'].includes(command))return respond(greeting);
 if(command==='/contacts')return respond(contacts);
 if(session.leadId){
  if(!text)return respond('Напишите дополнение к заявке текстом.');
  const limit=await checkRateLimit({request:new Request(SITE),scope:'telegram_followup',customKey:String(chat.id),windowSeconds:60,limit:5,failClosed:true});
  if(!limit.ok)return respond('Подождите минуту перед следующим сообщением.');
  const lead=await getLead(session.leadId);if(!lead||String(lead.raw_payload?.telegram_chat_id)!==String(chat.id))throw new Error('Lead ownership mismatch');
  const followups=[...(lead.raw_payload?.telegram_followups||[]),{text,at:new Date().toISOString(),update_id:update.update_id}].slice(-20);
  const already=(lead.raw_payload?.telegram_followups||[]).some(m=>m.update_id===update.update_id);
  if(!already){await updateLead(lead.id,{raw_payload:{...(lead.raw_payload||{}),telegram_followups:followups}});await send(process.env.TELEGRAM_CHAT_ID,`Дополнение к заявке ${lead.public_id||''}\n\n${text}`,leadActions(lead.id)).catch(()=>null);}
  return respond('Дополнение сохранено к вашей заявке. Менеджер увидит его.');
 }
 const contact=update.message?.contact;
 if(contact&&String(contact.user_id)!==String(from.id))return respond('Отправьте свой номер телефона текстом или поделитесь собственным контактом.');
 const input=text||(contact?'Мой номер телефона':'');
 if(!input)return respond('Расскажите текстом, какая услуга или запчасть нужна.');
 const limit=await checkRateLimit({request:new Request(SITE),scope:'telegram_dialogue',customKey:String(chat.id),windowSeconds:60,limit:10,failClosed:true});
 if(!limit.ok)return respond('Давайте продолжим через минуту. Для срочной связи откройте «Адреса и телефоны».');
 const previousField=session.pending;
 session.phone=extractPhone(text)||(contact?normalizeRussianPhone(contact.phone_number):'')||session.phone||'';
 session.city=detectCity(text)||session.city||'';
 if(previousField==='car'&&text.length>=4&&!extractPhone(text)&&!detectCity(text))session.car=cleanText(text,180);
 const meaningful=text.replace(/(?:\+7|8|7)[\s(.-]*\d(?:[\s().-]*\d){9}(?!\d)/g,'').replace(/Ставрополь|Пятигорск/gi,'').trim();
 if(!['car','city','phone'].includes(previousField)&&/запис|замен|ремонт|диагност|масл|тормоз|детал|запчаст|стуч|завод|глох|скрип|провер|почин|ошиб|обслуж|подбор|артикул|vin|кондицион|фильтр/i.test(meaningful))session.hasNeed=true;
 if(previousField==='need'&&meaningful.length>4)session.hasNeed=true;
 session.history=[...(session.history||[]),{role:'user',text:input}].slice(-10);
 await telegramCall('sendChatAction',{chat_id:chat.id,action:'typing'}).catch(()=>null);
 const advice=await customerAdvice({chat:chat.id,updateId:update.update_id,history:session.history,car:session.car||'',city:session.city||''});
 let explanation='Помогу уточнить детали и передать обращение в выбранный автосервис.';
 if(advice.ok){
  const data=advice.data||{};explanation=cleanText(data.reply,700)||explanation;
  const quoted=cleanText(data.car,180);const transcript=onlyDigits(session.history.filter(m=>m.role==='user').map(m=>m.text).join(' '));
  if(quoted&&onlyDigits(quoted).length>=3&&transcript.includes(onlyDigits(quoted)))session.car=quoted;
  if(data.has_need===true)session.hasNeed=true;
  if(['booking','parts','question'].includes(data.intent))session.intent=data.intent;
  if(services.some(s=>s.name===data.service))session.service=data.service;
 }
 session.pending=nextField(session);
 if(!session.pending){
  session.draftId=randomUUID();
  const requestText=session.history.filter(m=>m.role==='user').map(m=>m.text).join('\n').slice(-1000);
  const confirmation=`Проверьте заявку:\n${session.city}\nАвтомобиль: ${session.car}\nТелефон: +${session.phone}\n\n${requestText}\n\nПередать эти данные менеджеру для согласования стоимости и записи?`;
  return respond(confirmation,{inline_keyboard:[[{text:'Передать заявку менеджеру',callback_data:'c:submit:'+session.draftId}],[{text:'Начать заново',callback_data:'c:cancel'}]]});
 }
 const answer=explanation+'\n\n'+questions[session.pending];
 session.history=[...session.history,{role:'assistant',text:answer}].slice(-10);
 return respond(answer);
}
