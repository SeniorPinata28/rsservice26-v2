import {getCabinetSessionFromRequest} from '../../../../lib/cabinet-auth.js';
import {createLead,dbReady,getCustomer,getCustomerVehicles,normalizePhone} from '../../../../lib/db.js';

function value(data,...keys){for(const key of keys){const v=data?.[key];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim()}return ''}
function typeValue(type){const allowed={parts_order:'parts_order',service_booking:'service_booking',general_callback:'general_callback',cabinet_data_correction:'cabinet_data_correction',cabinet_vehicle_request:'cabinet_vehicle_request',cabinet_request:'cabinet_request'};return allowed[type]||'cabinet_request'}
function money(v){return v!==undefined&&v!==null&&String(v).trim()?String(v).trim():''}
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
    if(!dbReady())return Response.json({ok:false,error:'Supabase не настроен'},{status:500});
    const session=getCabinetSessionFromRequest(request);
    if(!session?.customer_id)return Response.json({ok:false,error:'Требуется вход в кабинет'},{status:401});
    const data=await request.json().catch(()=>({}));
    const customer=await getCustomer(session.customer_id);
    if(!customer)return Response.json({ok:false,error:'Клиент не найден'},{status:404});

    const vehicles=await getCustomerVehicles(customer.id);
    const requestedVehicleId=value(data,'vehicle_id');
    const vehicle=requestedVehicleId?vehicles.find(v=>String(v.id)===String(requestedVehicleId)):null;
    if(requestedVehicleId&&!vehicle)return Response.json({ok:false,error:'Выбранный автомобиль не принадлежит клиенту'},{status:403});

    const type=typeValue(value(data,'type'));
    const name=customer.full_name||customer.name||'Клиент RSService26';
    const phone=normalizePhone(customer.phone);
    const car=value(data,'car_text','car')||vehicle?.car_text||[vehicle?.brand||vehicle?.make,vehicle?.model,vehicle?.year].filter(Boolean).join(' ');
    const vin=value(data,'vin')||vehicle?.vin||'';
    const mileage=value(data,'mileage')||vehicle?.mileage||'';
    const comment=value(data,'comment','request_text','text','message');
    const text=comment||'Заявка из личного кабинета';
    if(!phone)return Response.json({ok:false,error:'У клиента не указан телефон'},{status:400});
    if(!text)return Response.json({ok:false,error:'Укажите текст заявки'},{status:400});

    const raw={...data,source:'cabinet',customer_id:customer.id,vehicle_id:vehicle?.id||null,contact_status:'confirmed_client',lead_status:'new_contact'};
    const savedLead=await createLead({type,name,phone,car,text,vin,mileage:mileage?Number(mileage):null,customerId:customer.id,vehicleId:vehicle?.id||null,source:'cabinet',raw});
    const tg=await notifyTelegram(savedLead,type,name,phone,car,text,vin);
    return Response.json({ok:true,saved:true,lead:savedLead,...tg});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось создать заявку из кабинета',details:String(e?.message||e)},{status:500});
  }
}
