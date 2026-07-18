import {createLead,dbReady,normalizePhone} from '../../../lib/db.js';
import {checkRateLimit,rateLimitResponse} from '../../../lib/rate-limit.js';
import {cleanText,normalizeRussianPhone,publicError,requestTooLarge,validVin} from '../../../lib/validation.js';

export async function GET(){return Response.json({ok:false,error:'Method not allowed'},{status:405})}

function value(data,...keys){for(const key of keys){const v=data?.[key];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim()}return ''}
function money(v){return v!==undefined&&v!==null&&String(v).trim()?String(v).trim():''}
function duplicateKey({phone,type,text,vin}){return [phone,type,vin||'',String(text||'').slice(0,220)].join('|')}

export async function POST(request){
  try{
    if(requestTooLarge(request))return Response.json({ok:false,error:'Слишком большой запрос'},{status:413});
    const data=await request.json();
    const name=cleanText(value(data,'name','client_name'),100);
    const phone=normalizeRussianPhone(value(data,'phone','client_phone'));
    const car=cleanText(value(data,'car_text','car','vehicle'),250);
    const vin=cleanText(value(data,'vin'),17).toUpperCase();
    const mileage=value(data,'mileage')?Number(value(data,'mileage')):null;
    const type=cleanText(value(data,'type'),60)||'question';
    const source=cleanText(value(data,'source'),60)||'site';
    const text=cleanText(value(data,'request_text','text','message','comment','request'),3000)||'Заявка без текста';
    if(!name||!phone||!text){return Response.json({ok:false,error:'Проверьте имя, российский номер телефона и текст заявки'},{status:400})}
    if(!validVin(vin))return Response.json({ok:false,error:'VIN должен содержать 17 допустимых символов'},{status:400});

    const duplicateLimit=await checkRateLimit({
      request,
      scope:'lead_duplicate',
      phone,
      customKey:duplicateKey({phone,type,text,vin}),
      windowSeconds:Number(process.env.LEAD_DUPLICATE_WINDOW_SECONDS||300),
      limit:1
    });
    if(!duplicateLimit.ok)return rateLimitResponse(duplicateLimit,'Такая заявка уже отправлена. Менеджер свяжется с вами. Повторно отправлять не нужно.');

    const limit=await checkRateLimit({
      request,
      scope:'leads',
      phone,
      windowSeconds:Number(process.env.LEADS_RATE_LIMIT_WINDOW_SECONDS||60),
      limit:Number(process.env.LEADS_RATE_LIMIT_MAX||3)
    });
    if(!limit.ok)return rateLimitResponse(limit,'Слишком много заявок. Попробуйте отправить повторно позже или позвоните менеджеру.');

    if(!dbReady()){return Response.json({ok:false,error:'Supabase не настроен. Заявка не сохранена.'},{status:500})}

    const raw={
      source,contact_status:'unverified',lead_status:'new_contact',
      client_price:cleanText(data.client_price||data.salePrice||data.price_client||data.price,80),
      stock:cleanText(data.stock||data.totalCount||data.count,80),
      delivery:cleanText(data.delivery||data.deliveryStart||data.delivery_time,120),
      preferred_date:cleanText(data.preferred_date,120),
      comment:cleanText(data.comment,1000)
    };
    let savedLead=null;
    try{savedLead=await createLead({type,name,phone,car,text,vin,mileage,customerId:null,vehicleId:null,source,raw})}
    catch(e){return publicError(e)}
    if(!savedLead){return Response.json({ok:false,error:'Заявка не сохранена в Supabase'},{status:500})}

    const token=process.env.TELEGRAM_BOT_TOKEN||process.env.BOT_TOKEN;
    const chat=process.env.TELEGRAM_CHAT_ID||process.env.MANAGER_CHAT_ID;
    let telegram=false;
    if(token&&chat){
      const number=savedLead.public_id?` #${savedLead.public_id}`:'';
      const clientPrice=money(data.client_price||data.salePrice||data.price_client||data.price);
      const stock=money(data.stock||data.totalCount||data.count);
      const delivery=money(data.delivery||data.deliveryStart||data.delivery_time);
      const message=[
        `Новая заявка RSService26${number}`,
        '',
        'Статус контакта: новый контакт',
        `Тип: ${type}`,
        `Имя: ${name}`,
        `Телефон: ${phone}`,
        `Авто: ${car||'не указано'}`,
        vin?`VIN: ${vin}`:null,
        '',
        text,
        clientPrice?`Цена клиенту: ${clientPrice}`:null,
        stock?`Остаток: ${stock}`:null,
        delivery?`Срок доставки: ${delivery}`:null
      ].filter(Boolean).join('\n');
      try{
        const tg=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text:message})});
        telegram=tg.ok;
        if(!tg.ok)console.error('Telegram notification failed',tg.status);
      }catch(e){console.error('Telegram notification failed')}
    }
    return Response.json({ok:true,telegram,saved:true,dbReady:true,customerId:null,contactStatus:'unverified',lead:{id:savedLead.id,public_id:savedLead.public_id}});
  }catch(e){
    return publicError(e);
  }
}
