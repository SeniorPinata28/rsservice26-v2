export const SITE='https://www.rsservice26.ru';
export const menu={inline_keyboard:[
 [{text:'Запись на сервис',url:SITE+'/booking'},{text:'Поиск запчастей',url:SITE+'/availability'}],
 [{text:'Услуги и цены',callback_data:'services'},{text:'Адреса и телефоны',callback_data:'contacts'}],
 [{text:'Начать новую заявку',callback_data:'new'}]
]};
export const contacts='Ставрополь\nпросп. Кулакова, 18Д\n+7 (962) 453-72-97\n\nПятигорск\nул. Фабричная, 32\n+7 (934) 041-60-60\n\n'+SITE+'/contact';
export function leadActions(id){return {inline_keyboard:[[{text:'Разобрать заявку',callback_data:'m:lead:'+id},{text:'Открыть в CRM',url:SITE+'/admin/leads/'+id}]]};}
export async function telegramCall(method,body){
 const token=process.env.TELEGRAM_BOT_TOKEN;
 if(!token)throw new Error('Telegram not configured');
 const r=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
 const data=await r.json();if(!r.ok||!data.ok)throw new Error('Telegram API request failed');return data.result;
}
export function send(chat,text,markup=menu){return telegramCall('sendMessage',{chat_id:chat,text:String(text).slice(0,4000),reply_markup:markup,link_preview_options:{is_disabled:true}})}
export async function notifyLead(lead){
 if(!process.env.TELEGRAM_CHAT_ID)return false;
 try{await send(process.env.TELEGRAM_CHAT_ID,`Новая заявка ${lead.public_id||''}\n${lead.name||'Клиент'} · ${lead.phone||''}\n${lead.raw_payload?.city||''} · ${lead.car_text||''}\n\n${lead.request_text||''}`,leadActions(lead.id));return true}catch{console.error('Telegram manager notification failed');return false}
}
