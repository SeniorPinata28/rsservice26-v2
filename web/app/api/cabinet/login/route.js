import {dbReady,findActiveCabinetLoginCode,findConfirmedCustomerByPhone,getCustomerLeads,incrementCabinetLoginAttempts,markCabinetLoginCodeUsed,normalizePhone} from '../../../../lib/db.js';
import {hashOtp} from '../../../../lib/cabinet-auth.js';

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
    const phone=normalizePhone(data.phone);
    const code=String(data.code||'').trim();
    if(!phone)return Response.json({ok:false,error:'Введите телефон'},{status:400});
    if(!code)return Response.json({ok:false,error:'Введите код подтверждения'},{status:400});

    const customer=await findConfirmedCustomerByPhone(phone);
    if(!customer){
      return Response.json({ok:false,error:'Кабинет доступен только подтверждённым клиентам. Оставьте заявку или дождитесь подтверждения менеджера.'},{status:403});
    }

    const loginCode=await findActiveCabinetLoginCode(phone);
    if(!loginCode)return Response.json({ok:false,error:'Код не найден или истёк. Запросите новый код.'},{status:400});
    if(Number(loginCode.attempts||0)>=5)return Response.json({ok:false,error:'Слишком много попыток. Запросите новый код.'},{status:429});

    const expected=loginCode.code_hash;
    const actual=hashOtp(phone,code);
    if(expected!==actual){
      await incrementCabinetLoginAttempts(loginCode.id,loginCode.attempts);
      return Response.json({ok:false,error:'Неверный код подтверждения'},{status:400});
    }

    await markCabinetLoginCodeUsed(loginCode.id);
    const leads=await getCustomerLeads(customer.id);
    return Response.json({ok:true,customer:publicCustomer(customer),leads:leads.map(publicLead)});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось открыть кабинет',details:String(e?.message||e)},{status:500});
  }
}
