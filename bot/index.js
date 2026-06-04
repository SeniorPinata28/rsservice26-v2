import 'dotenv/config';
import {Telegraf,Markup} from 'telegraf';

const bot=new Telegraf(process.env.BOT_TOKEN);
const managerChatId=process.env.MANAGER_CHAT_ID||process.env.TELEGRAM_CHAT_ID;

const parts=[
{sku:'28113-1R100',name:'Воздушный фильтр Hyundai Solaris',compatibility:'Solaris 2011-2016',price:'650 ₽',stock:12},
{sku:'31922-2E900',name:'Топливный фильтр Kia Rio',compatibility:'Rio 2012-2017',price:'1200 ₽',stock:5},
{sku:'26300-35503',name:'Масляный фильтр Hyundai/Kia',compatibility:'Hyundai/Kia 1.4-1.6',price:'450 ₽',stock:20},
{sku:'97133-D1000',name:'Салонный фильтр угольный',compatibility:'Solaris / Rio / Creta',price:'790 ₽',stock:18},
{sku:'58101-1RA05',name:'Колодки тормозные передние',compatibility:'Solaris / Rio',price:'2100 ₽',stock:9},
{sku:'97606-1R000',name:'Фильтр-осушитель кондиционера',compatibility:'Solaris / Rio',price:'1700 ₽',stock:0}
];

const services=['Диагностика','Плановое ТО','Замена масла','Ходовая','Тормоза','Электрика','Кондиционер','Подбор запчастей по VIN'];
const sessions=new Map();
const mainMenu=()=>Markup.keyboard([['Записаться','Проверить запчасть'],['Услуги и цены','Адрес и контакты'],['Связаться с менеджером']]).resize();

function setStep(ctx,step,data={}){sessions.set(ctx.from.id,{step,data});}
function clearStep(ctx){sessions.delete(ctx.from.id);}
async function notifyManager(text){if(managerChatId){await bot.telegram.sendMessage(managerChatId,text);}}

bot.start(ctx=>ctx.reply('RSService26: сервис Hyundai/Kia в Ставрополе. Выберите действие.',mainMenu()));
bot.hears('Адрес и контакты',ctx=>ctx.reply('Адрес: Россия, Ставрополь, просп. Кулакова, 18Д\nТелефоны: +7 (967) 967-70-42, +7 (962) 449-44-55\nСайт: https://rsservice26-v2.vercel.app',mainMenu()));
bot.hears('Услуги и цены',ctx=>ctx.reply('Основные услуги:\n'+services.map(s=>'• '+s).join('\n')+'\n\nТочная цена зависит от автомобиля и диагностики.',mainMenu()));
bot.hears('Связаться с менеджером',ctx=>ctx.reply('Напишите сообщение, телефон и удобное время звонка. Я передам менеджеру.',mainMenu()));

bot.hears('Записаться',ctx=>{setStep(ctx,'service_name');ctx.reply('На какую услугу записать? Например: диагностика, ТО, тормоза, ходовая.');});
bot.hears('Проверить запчасть',ctx=>{setStep(ctx,'part_query');ctx.reply('Напишите артикул, название запчасти или VIN.');});

bot.on('text',async ctx=>{
 const s=sessions.get(ctx.from.id);
 const text=ctx.message.text.trim();
 if(!s){return ctx.reply('Выберите действие в меню.',mainMenu());}
 if(s.step==='service_name'){s.data.service=text;setStep(ctx,'service_phone',s.data);return ctx.reply('Укажите телефон для связи.');}
 if(s.step==='service_phone'){s.data.phone=text;setStep(ctx,'service_car',s.data);return ctx.reply('Укажите автомобиль: марка, модель, год.');}
 if(s.step==='service_car'){s.data.car=text;setStep(ctx,'service_date',s.data);return ctx.reply('Укажите желаемую дату и время.');}
 if(s.step==='service_date'){
  s.data.date=text;clearStep(ctx);
  const msg=`Новая запись из Telegram\nИмя: ${ctx.from.first_name||''}\nТелефон: ${s.data.phone}\nАвто: ${s.data.car}\nУслуга: ${s.data.service}\nДата: ${s.data.date}`;
  await notifyManager(msg);
  return ctx.reply('Заявка на запись отправлена менеджеру.',mainMenu());
 }
 if(s.step==='part_query'){
  clearStep(ctx);
  const q=text.toLowerCase();
  const found=parts.filter(p=>(p.sku+p.name+p.compatibility).toLowerCase().includes(q));
  if(found.length){return ctx.reply(found.map(p=>`${p.name}\nАртикул: ${p.sku}\nСовместимость: ${p.compatibility}\nЦена: ${p.price}\nНаличие: ${p.stock>0?p.stock+' шт.':'нет в наличии'}`).join('\n\n'),mainMenu());}
  await notifyManager(`Запрос запчасти из Telegram\nКлиент: ${ctx.from.first_name||''} @${ctx.from.username||''}\nЗапрос: ${text}`);
  return ctx.reply('В каталоге не найдено. Запрос отправлен менеджеру для ручной проверки.',mainMenu());
 }
});

bot.launch().then(()=>console.log('RSService26 bot started'));
process.once('SIGINT',()=>bot.stop('SIGINT'));
process.once('SIGTERM',()=>bot.stop('SIGTERM'));
