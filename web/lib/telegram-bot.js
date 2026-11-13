import {createLead,db,dbReady} from './db.js';
import {services} from '../data.js';
import {checkRateLimit} from './rate-limit.js';
import {cleanText,normalizeRussianPhone} from './validation.js';

export const SITE='https://www.rsservice26.ru';
export const menu={inline_keyboard:[
 [{text:'Записаться на сервис',url:SITE+'/booking'},{text:'Подобрать запчасть',url:SITE+'/availability'}],
 [{text:'Услуги и цены',callback_data:'services'},{text:'Адреса и телефоны',callback_data:'contacts'}],
 [{text:'Обратиться к менеджеру',callback_data:'manager'}]
]};
export const contacts='Ставрополь\nпросп. Кулакова, 18Д\n+7 (962) 453-72-97\n\nПятигорск\nул. Фабричная, 32\n+7 (934) 041-60-60\n\n'+SITE+'/contact';
const help='Чтобы передать обращение менеджеру, отправьте одним сообщением телефон и ваш вопрос. Например:\n+7 962 000-00-00, Пятигорск, Toyota Camry 2018, нужна замена масла.\n\nДля подбора детали добавьте артикул или VIN. Дату записи и итоговую цену подтвердит менеджер.';
export function extractPhone(text){const candidates=String(text||'').match(/(?:\+7|8|7)[\s(.-]*\d(?:[\s().-]*\d){9}(?!\d)/g)||[];return candidates.map(normalizeRussianPhone).find(Boolean)||'';}
export async function telegramCall(method,body){
 const token=process.env.TELEGRAM_BOT_TOKEN;
 if(!token)throw new Error('Telegram not configured');
 const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const data=await r.json();if(!r.ok||!data.ok)throw new Error('Telegram API request failed');return data.result;
}
async function reply(chat,text){return telegramCall('sendMessage',{chat_id:chat,text,reply_markup:menu,link_preview_options:{is_disabled:true}})}
export async function handleTelegramUpdate(update){
 const message=update.message;const callback=update.callback_query;
 if(callback){
  await telegramCall('answerCallbackQuery',{callback_query_id:callback.id});
  if(callback.message?.chat?.type!=='private')return;
  const chat=callback.message.chat.id;
  if(callback.data==='contacts')return reply(chat,contacts);
  if(callback.data==='services')return reply(chat,'Основные услуги:\n\n'+services.slice(0,16).map(s=>s.name+' — '+s.price).join('\n')+'\n\nЦена зависит от автомобиля и объёма работ. Стоимость подтвердит менеджер.\n'+SITE+'/services');
  return reply(chat,help);
 }
 if(!message||message.from?.is_bot)return;
 const chat=message.chat;if(!chat?.id)return;
 const text=cleanText(message.text,3000);
 // Group messages are never forwarded or copied to CRM.
 if(chat.type!=='private')return;
 const command=text.split(/[\s@]/)[0].toLowerCase();
 if(['/start','/menu','/help'].includes(command))return reply(chat.id,'RS Service 26 — мультибрендовый автосервис в Ставрополе и Пятигорске.\n\nВыберите действие или отправьте телефон и вопрос одним сообщением.');
 if(command==='/contacts')return reply(chat.id,contacts);
 if(!text)return reply(chat.id,help);
 const phone=extractPhone(text);
 if(!phone)return reply(chat.id,help);
 if(!dbReady())throw new Error('Database not configured');
 const updateId=String(update.update_id);
 const existing=await db('leads?source=eq.telegram&raw_payload->>telegram_update_id=eq.'+encodeURIComponent(updateId)+'&select=id,public_id&limit=1');
 if(!existing.ok)throw new Error('Telegram lead lookup failed');
 if(existing.data?.length)return reply(chat.id,'Ваша заявка уже сохранена. Менеджер свяжется с вами.'); // Telegram redelivery must not create duplicate leads.
 const limit=await checkRateLimit({request:new Request(SITE),scope:'telegram_leads',customKey:String(chat.id),windowSeconds:60,limit:3,failClosed:true});
 if(!limit.ok)return reply(chat.id,limit.unavailable?'Сохранение заявок временно недоступно. Попробуйте позже или позвоните.':'Вы уже отправили несколько обращений. Подождите минуту или позвоните в автосервис.');
 const name=cleanText([message.from?.first_name,message.from?.last_name].filter(Boolean).join(' '),100)||'Клиент Telegram';
 let lead;
 try{lead=await createLead({type:'general_callback',name,phone,car:'',text,source:'telegram',raw:{telegram_update_id:updateId,telegram_chat_id:String(chat.id),telegram_username:cleanText(message.from?.username,100)}})}
 catch(error){
  // Unique index handles concurrent delivery of the same update.
  const found=await db('leads?source=eq.telegram&raw_payload->>telegram_update_id=eq.'+encodeURIComponent(updateId)+'&select=id&limit=1');
  if(found.ok&&found.data?.length)return reply(chat.id,'Ваша заявка уже сохранена. Менеджер свяжется с вами.');throw error;
 }
 const manager=process.env.TELEGRAM_CHAT_ID;
 let notified=false;
 if(manager){try{await telegramCall('sendMessage',{chat_id:manager,text:`Заявка из Telegram ${lead.public_id||''}\nИмя: ${name}\nТелефон: ${phone}\n\n${text}`,reply_markup:{inline_keyboard:[[{text:'Открыть заявки',url:SITE+'/admin'}]]}});notified=true}catch{console.error('Telegram manager notification failed');}}
 await reply(chat.id,notified?'Заявка сохранена и передана менеджеру. Он свяжется с вами для уточнения деталей.':'Заявка сохранена. Менеджер увидит её в системе. Если вопрос срочный, позвоните по номеру вашего автосервиса.');
}
