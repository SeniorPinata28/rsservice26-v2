import {getCabinetSessionFromRequest} from '../../../../lib/cabinet-auth.js';
import {createLead,dbReady,getCustomer,getCustomerVehicles,normalizePhone} from '../../../../lib/db.js';
import {checkRateLimit,rateLimitResponse} from '../../../../lib/rate-limit.js';
import {cleanText,publicError,requestTooLarge,validVin} from '../../../../lib/validation.js';

function value(data,...keys){for(const key of keys){const v=data?.[key];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim()}return ''}
function typeValue(type){const allowed={parts_order:'parts_order',service_booking:'service_booking',general_callback:'general_callback',cabinet_data_correction:'cabinet_data_correction',cabinet_vehicle_request:'cabinet_vehicle_request',cabinet_request:'cabinet_request'};return allowed[type]||'cabinet_request'}
async function notifyTelegram(lead,type,name,phone,car,text,vin){
  const token=process.env.TELEGRAM_BOT_TOKEN||process.env.BOT_TOKEN;
  const chat=process.env.TELEGRAM_CHAT_ID||process.env.MANAGER_CHAT_ID;
  if(!token||!chat)return {telegram:false,telegramError:null};
  const number=lead?.public_id?` #${lead.public_id}`:'';
  const message=[`Новая заявка RSService26${number}`,'','Источник: cabinet',`Тип: ${type}`,`Имя: ${name}`,`Телефон: ${phone}`,`Авто: ${car||'не указано'}`,vin?`VIN: ${vin}`:null,'',text].filter(Boolean).join('\n');
  try{const tg=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text:message})});if(!tg.ok)return {telegram:false,telegramError:await tg.text().catch(()=>null)};return {telegram:true,telegramError:null}}
  catch(e){return {telegram:false,telegramError:String(e?.message||e)}}
}

export async function POST(request){
  try{
    if(requestTooLarge(request))return Response.json({ok:false,error:'Слишком большой запрос'},{status:413});
    if(!dbReady())return Response.json({ok:false,error:'Supabase не настроен'},{status:500});
    const session=getCabinetSessionFromRequest(request);
    if(!session?.customer_id)return Response.json({ok:false,error:'Требуется вход в кабинет'},{status:401});
    const data=await request.json().catch(()=>({}));
    const customer=await getCustomer(session.customer_id);
    if(!customer)return Response.json({ok:false,error:'Клиент не найден'},{status:404});
    const phone=normalizePhone(customer.phone);
    if(!phone)return Response.json({ok:false,error:'У клиента не указан телефон'},{status:400});

    const limit=await checkRateLimit({
      request,
      scope:'cabinet_request',
      phone,
      customKey:'customer:'+customer.id,
      windowSeconds:Number(process.env.CABINET_REQUEST_RATE_LIMIT_WINDOW_SECONDS||300),
      limit:Number(process.env.CABINET_REQUEST_RATE_LIMIT_MAX||3)
    });
    if(!limit.ok)return rateLimitResponse(limit,'Слишком много заявок из кабинета. Попробуйте позже или позвоните менеджеру.');

    const vehicles=await getCustomerVehicles(customer.id);
    const requestedVehicleId=value(data,'vehicle_id');
    const vehicle=requestedVehicleId?vehicles.find(v=>String(v.id)===String(requestedVehicleId)):null;
    if(requestedVehicleId&&!vehicle)return Response.json({ok:false,error:'Выбранный автомобиль не принадлежит клиенту'},{status:403});

    const type=typeValue(value(data,'type'));
    const name=customer.full_name||customer.name||'Клиент RSService26';
    const car=cleanText(value(data,'car_text','car')||vehicle?.car_text||[vehicle?.brand||vehicle?.make,vehicle?.model,vehicle?.year].filter(Boolean).join(' '),250);
    const vin=cleanText(value(data,'vin')||vehicle?.vin||'',17).toUpperCase();
    const mileage=value(data,'mileage')||vehicle?.mileage||'';
    const comment=cleanText(value(data,'comment','request_text','text','message'),3000);
    const text=comment||'Заявка из личного кабинета';
    if(!text)return Response.json({ok:false,error:'Укажите текст заявки'},{status:400});
    if(!validVin(vin))return Response.json({ok:false,error:'VIN должен содержать 17 допустимых символов'},{status:400});

    const raw={source:'cabinet',customer_id:customer.id,vehicle_id:vehicle?.id||null,contact_status:'confirmed_client',lead_status:'new_contact'};
    const savedLead=await createLead({type,name,phone,car,text,vin,mileage:mileage?Number(mileage):null,customerId:customer.id,vehicleId:vehicle?.id||null,source:'cabinet',raw});
    const tg=await notifyTelegram(savedLead,type,name,phone,car,text,vin);
    return Response.json({ok:true,saved:true,telegram:tg.telegram,lead:{id:savedLead.id,public_id:savedLead.public_id}});
  }catch(e){
    return publicError(e);
  }
}
