import {createLead,dbReady,normalizePhone} from '../../../lib/db.js';
import {checkRateLimit,rateLimitResponse} from '../../../lib/rate-limit.js';

export async function GET(){return Response.json({ok:false,error:'Method not allowed'},{status:405})}

function value(data,...keys){for(const key of keys){const v=data?.[key];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim()}return ''}
function money(v){return v!==undefined&&v!==null&&String(v).trim()?String(v).trim():''}

export async function POST(request){
  try{
    const data=await request.json();
    const name=value(data,'name','client_name');
    const phone=normalizePhone(value(data,'phone','client_phone'));
    const car=value(data,'car_text','car','vehicle');
    const vin=value(data,'vin');
    const mileage=value(data,'mileage')?Number(value(data,'mileage')):null;
    const type=value(data,'type')||'question';
    const source=value(data,'source')||'site';
    const text=value(data,'request_text','text','message','comment','request')||'Заявка без текста';
    if(!name||!phone||!text){return Response.json({ok:false,error:'Заполните имя, телефон и текст заявки'},{status:400})}

    const limit=await checkRateLimit({
      request,
      scope:'leads',
      phone,
      windowSeconds:Number(process.env.LEADS_RATE_LIMIT_WINDOW_SECONDS||60),
      limit:Number(process.env.LEADS_RATE_LIMIT_MAX||3)
    });
    if(!limit.ok)return rateLimitResponse(limit,'Слишком много заявок. Попробуйте отправить повторно позже или позвоните менеджеру.');

    if(!dbReady()){return Response.json({ok:false,error:'Supabase не настроен. Заявка не сохранена.'},{status:500})}

    const raw={...data,source,contact_status:'unverified',lead_status:'new_contact'};
    let savedLead=null;
    try{savedLead=await createLead({type,name,phone,car,text,vin,mileage,customerId:null,vehicleId:null,source,raw})}
    catch(e){return Response.json({ok:false,error:'Заявка не сохранена в Supabase',details:String(e?.message||e)},{status:500})}
    if(!savedLead){return Response.json({ok:false,error:'Заявка не сохранена в Supabase'},{status:500})}

    const token=process.env.TELEGRAM_BOT_TOKEN||process.env.BOT_TOKEN;
    const chat=process.env.TELEGRAM_CHAT_ID||process.env.MANAGER_CHAT_ID;
    let telegram=false;
    let telegramError=null;
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
        if(!tg.ok)telegramError=await tg.text().catch(()=>null);
      }catch(e){telegramError=String(e?.message||e)}
    }
    return Response.json({ok:true,telegram,telegramError,saved:true,dbReady:true,customerId:null,contactStatus:'unverified',lead:savedLead});
  }catch(e){
    return Response.json({ok:false,error:'Ошибка обработки заявки',details:String(e?.message||e)},{status:500});
  }
}
