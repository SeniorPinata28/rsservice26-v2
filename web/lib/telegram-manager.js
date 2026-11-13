import {db,getLead} from './db.js';
import {managerAdvice} from './sales-ai.js';
import {cleanText} from './validation.js';
import {SITE,send,telegramCall,leadActions} from './telegram-transport.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statusNames={new_contact:'Новая',in_progress:'В работе',waiting_client:'Ждём клиента',completed:'Завершена',declined:'Отказ'};
export async function isStaff(userId){
 if(!userId||!process.env.TELEGRAM_CHAT_ID)return false;
 try{const admins=await telegramCall('getChatAdministrators',{chat_id:process.env.TELEGRAM_CHAT_ID});return Array.isArray(admins)&&admins.some(member=>String(member.user?.id)===String(userId)&&['creator','administrator'].includes(member.status))}catch{return false}
}
function cardButtons(lead){return {inline_keyboard:[
 [{text:'Взять в работу',callback_data:'m:take:'+lead.id},{text:'Ждём клиента',callback_data:'m:wait:'+lead.id}],
 [{text:'Совет и черновик ответа',callback_data:'m:advice:'+lead.id}],
 [{text:'Завершить',callback_data:'m:done:'+lead.id},{text:'Список заявок',callback_data:'m:list'}],
 [{text:'Карточка в CRM',url:SITE+'/admin/leads/'+lead.id}]
]}}
async function showLead(chat,lead){
 if(!lead)return send(chat,'Заявка не найдена.');
 return send(chat,`${lead.public_id||'Заявка'} · ${statusNames[lead.status]||lead.status}\n${lead.name||'Клиент'}\nТелефон: ${lead.phone||'не указан'}\n${lead.car_text||'Автомобиль не указан'}\n${lead.raw_payload?.city||''}\n\n${lead.request_text||''}\n\n${(lead.raw_payload?.telegram_followups||[]).slice(-3).map(m=>'Дополнение: '+m.text).join('\n')}`,cardButtons(lead));
}
async function overview(chat){
 const response=await db('leads?select=id,public_id,status,name,car_text,created_at&order=created_at.desc&limit=200');
 if(!response.ok||!Array.isArray(response.data))return send(chat,'CRM временно недоступна. Попробуйте обновить панель позже.');
 const all=response.data;const active=all.filter(l=>!['completed','declined'].includes(l.status));
 const fresh=all.filter(l=>l.status==='new_contact');const overdue=fresh.filter(l=>Date.now()-new Date(l.created_at)>15*60000);
 const top=[...active].sort((a,b)=>(a.status==='new_contact'?0:1)-(b.status==='new_contact'?0:1)||new Date(a.created_at)-new Date(b.created_at)).slice(0,10);
 const summary=`Рабочая панель RS Service 26\nПо последним ${all.length} заявкам в CRM:\nНовые: ${fresh.length}\nВ обработке: ${active.length-fresh.length}\nНовые старше 15 минут: ${overdue.length}\nЗавершённые: ${all.filter(l=>l.status==='completed').length}\n\nСначала свяжитесь с новыми клиентами. Статус «Завершена» означает завершение обращения и не подтверждает оплату.\n\nВыберите заявку:`;
 return send(chat,summary,{inline_keyboard:[...top.map(l=>[{text:`${l.public_id||'Заявка'} · ${statusNames[l.status]||l.status} · ${(l.car_text||l.name||'Клиент').slice(0,35)}`,callback_data:'m:lead:'+l.id}]),[{text:'Обновить',callback_data:'m:list'}]]});
}
async function makeDraft(chat,actor,requestId,lead){
 await telegramCall('sendChatAction',{chat_id:chat,action:'typing'}).catch(()=>null);
 const result=await managerAdvice({actor,requestId,lead});
 if(!result.ok)return send(chat,'ИИ-совет сейчас недоступен. Можно обработать заявку вручную: уточнить город, автомобиль, потребность и удобное время. Финальную цену подтвердите после проверки.',cardButtons(lead));
 const suggestion=result.data;const body=cleanText(suggestion.reply_draft,1200);
 if(!body)return send(chat,'Не удалось подготовить ответ. Попробуйте позже.',cardButtons(lead));
 const stored=await db('telegram_reply_drafts',{method:'POST',headers:{Prefer:'return=representation'},body:[{lead_id:lead.id,actor_id:String(actor),body}]});
 if(!stored.ok||!stored.data?.[0]?.id)throw new Error('Draft save failed');
 const draftId=stored.data[0].id;
 const canSend=lead.source==='telegram'&&/^\d{5,20}$/.test(String(lead.raw_payload?.telegram_chat_id||''));
 const keyboard={inline_keyboard:[...(canSend?[[{text:'Подтвердить и отправить клиенту',callback_data:'m:send:'+draftId}]]:[]),[{text:'Вернуться к заявке',callback_data:'m:lead:'+lead.id}]]};
 return send(chat,`Совет по ${lead.public_id||'заявке'}\n\nСледующий шаг: ${cleanText(suggestion.next_action,900)}\n\nЧерновик ответа:\n${body}\n\n${suggestion.relevant_service?'Уместно предложить: '+cleanText(suggestion.relevant_service,250)+'\n\n':''}${canSend?'Ответ ещё не отправлен. Проверьте текст и подтвердите отправку.':'У клиента нет привязанного Telegram-диалога. Используйте телефон из карточки; бот не отправляет сообщения по номеру телефона.'}`,keyboard);
}
async function deliverDraft(chat,actor,id){
 const found=await db('telegram_reply_drafts?id=eq.'+id+'&select=*&limit=1');
 const draft=found.ok?found.data?.[0]:null;
 if(!draft||draft.actor_id!==String(actor)||new Date(draft.expires_at)<new Date())return send(chat,'Черновик истёк или создан другим сотрудником. Подготовьте новый.');
 if(draft.status!=='draft')return send(chat,'Этот черновик уже отправлен или отправка проверяется. Повторно его не отправляю.');
 const lead=await getLead(draft.lead_id);
 const target=String(lead?.raw_payload?.telegram_chat_id||'');
 if(lead?.source!=='telegram'||!/^\d{5,20}$/.test(target))return send(chat,'Для этой заявки нет подтверждённого Telegram-диалога.');
 const claim=await db('telegram_reply_drafts?id=eq.'+id+'&status=eq.draft',{method:'PATCH',headers:{Prefer:'return=representation'},body:{status:'sending'}});
 if(!claim.ok||!claim.data?.length)return send(chat,'Отправка уже началась.');
 try{
  await send(target,'Ответ менеджера RS Service 26 по заявке '+(lead.public_id||'')+':\n\n'+draft.body);
 }catch{
  await db('telegram_reply_drafts?id=eq.'+id,{method:'PATCH',body:{status:'unknown'}});
  return send(chat,'Доставка ответа не подтверждена. Проверьте диалог перед повторной отправкой.',leadActions(lead.id));
 }
 const saved=await db('telegram_reply_drafts?id=eq.'+id,{method:'PATCH',body:{status:'sent'}});
 const audit=await db('telegram_manager_audit',{method:'POST',body:[{lead_id:lead.id,actor_id:String(actor),action:'reply_sent',detail:{draft_id:id}}]});
 if(!saved.ok||!audit.ok)throw new Error('Reply audit failed');
 return send(chat,'Ответ клиенту отправлен.',cardButtons(lead));
}
export async function managerUpdate(update){
 const callback=update.callback_query;const message=update.message||callback?.message;
 const actor=update.message?.from||callback?.from;const chat=message?.chat;
 const action=callback?.data||'';
 const command=String(update.message?.text||'').split(/[\s@]/)[0].toLowerCase();
 if(!action.startsWith('m:')&&!['/manager','/sales'].includes(command))return false;
 if(!actor||actor.is_bot||message?.sender_chat||(!['private'].includes(chat?.type)&&String(chat?.id)!==String(process.env.TELEGRAM_CHAT_ID)))return true;
 if(!await isStaff(actor.id)){await send(chat.id,'Режим сотрудника доступен только администраторам рабочей группы RS Service 26.');return true;}
 if(!action||action==='m:list'){await overview(chat.id);return true;}
 const [,kind,id]=action.split(':');
 if(!uuid.test(id||'')){await send(chat.id,'Некорректная карточка. Откройте /manager.');return true;}
 if(kind==='send'){await deliverDraft(chat.id,actor.id,id);return true;}
 const lead=await getLead(id);if(!lead){await send(chat.id,'Заявка не найдена.');return true;}
 if(kind==='advice'){await makeDraft(chat.id,actor.id,callback.id,lead);return true;}
 const statuses={take:'in_progress',wait:'waiting_client',done:'completed'};
 if(statuses[kind]){
  const next=statuses[kind];
  if(lead.status!==next){
   const audit=await db('telegram_manager_audit',{method:'POST',body:[{lead_id:id,actor_id:String(actor.id),action:'status_change_requested',detail:{from:lead.status,to:next,callback_id:callback.id}}]});
   if(!audit.ok)throw new Error('Status audit unavailable');
   const changed=await db('leads?id=eq.'+id+'&status=eq.'+encodeURIComponent(lead.status),{method:'PATCH',headers:{Prefer:'return=representation'},body:{status:next}});
   if(!changed.ok)throw new Error('Status change failed');
   if(!changed.data?.length){await send(chat.id,'Заявка уже изменена другим сотрудником. Обновите карточку.',leadActions(id));return true;}
   lead.status=next;
   await db('telegram_manager_audit',{method:'POST',body:[{lead_id:id,actor_id:String(actor.id),action:'status_changed',detail:{to:next,callback_id:callback.id}}]});
  }
 }
 await showLead(chat.id,lead);return true;
}
