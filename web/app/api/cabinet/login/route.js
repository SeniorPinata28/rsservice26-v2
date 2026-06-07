import {dbReady,findConfirmedCustomerByPhone,getCustomerLeads} from '../../../../lib/db.js';

function publicCustomer(customer){
  return {
    id:customer.id,
    name:customer.full_name||customer.name||'Клиент RSService26',
    phone:customer.phone||'',
    status:customer.status||'confirmed'
  };
}

function publicLead(lead){
  return {
    id:lead.id,
    public_id:lead.public_id||'',
    created_at:lead.created_at||'',
    type:lead.type||'',
    status:lead.status||'',
    car_text:lead.car_text||'',
    vin:lead.vin||'',
    mileage:lead.mileage||'',
    request_text:lead.request_text||''
  };
}

export async function POST(request){
  try{
    if(!dbReady())return Response.json({ok:false,error:'Supabase не настроен'},{status:500});
    const data=await request.json().catch(()=>({}));
    const phone=String(data.phone||'').trim();
    if(!phone)return Response.json({ok:false,error:'Введите телефон'},{status:400});

    const customer=await findConfirmedCustomerByPhone(phone);
    if(!customer){
      return Response.json({ok:false,error:'Кабинет доступен только подтверждённым клиентам. Оставьте заявку или дождитесь подтверждения менеджера.'},{status:403});
    }

    const leads=await getCustomerLeads(customer.id);
    return Response.json({ok:true,customer:publicCustomer(customer),leads:leads.map(publicLead)});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось открыть кабинет',details:String(e?.message||e)},{status:500});
  }
}
