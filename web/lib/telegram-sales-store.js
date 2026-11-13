import {db} from './db.js';
import {normalizeRussianPhone} from './validation.js';
export function extractPhone(text){const candidates=String(text||'').match(/(?<![A-Za-z0-9])(?:\+7|8|7)[\s(.-]*\d(?:[\s().-]*\d){9}(?!\d)/g)||[];return candidates.map(normalizeRussianPhone).find(Boolean)||'';}
export function detectCity(text){if(/пятигорск/i.test(text))return 'Пятигорск';if(/ставропол/i.test(text))return 'Ставрополь';return '';}
export async function loadSession(chat){
 const r=await db('telegram_sales_sessions?chat_id=eq.'+encodeURIComponent(chat)+'&select=data,expires_at&limit=1');
 if(!r.ok)throw new Error('Conversation storage unavailable');
 const row=r.data?.[0];return row&&new Date(row.expires_at)>new Date()?row.data:{};
}
export async function saveSession(chat,data){
 const now=new Date();const r=await db('telegram_sales_sessions',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:[{chat_id:String(chat),data,updated_at:now.toISOString(),expires_at:new Date(+now+7*86400000).toISOString()}]});
 if(!r.ok)throw new Error('Conversation save failed');
}
export function nextField(data){if(!data.city)return 'city';if(!data.car)return 'car';if(!data.hasNeed)return 'need';if(!data.phone)return 'phone';return '';}
export const questions={city:'В каком городе вам удобнее: Ставрополь или Пятигорск?',car:'Подскажите марку, модель и год автомобиля.',need:'Какая услуга или запчасть нужна? Можно описать, что беспокоит в автомобиле.',phone:'Оставьте телефон для связи с менеджером. Заявку отправим после вашего подтверждения.'};
