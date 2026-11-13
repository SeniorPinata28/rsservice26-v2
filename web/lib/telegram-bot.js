import {managerUpdate} from './telegram-manager.js';
import {customerUpdate} from './telegram-sales.js';
import {telegramCall} from './telegram-transport.js';
export {SITE,menu,contacts,telegramCall} from './telegram-transport.js';
export {extractPhone} from './telegram-sales-store.js';
export async function handleTelegramUpdate(update){
 if(update.callback_query)await telegramCall('answerCallbackQuery',{callback_query_id:update.callback_query.id}).catch(()=>null);
 if(await managerUpdate(update))return;
 return customerUpdate(update);
}
