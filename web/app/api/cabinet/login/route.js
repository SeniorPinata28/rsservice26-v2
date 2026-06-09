import {dbReady,findActiveCabinetLoginCode,findConfirmedCustomerByPhone,incrementCabinetLoginAttempts,markCabinetLoginCodeUsed,normalizePhone} from '../../../../lib/db.js';
import {hashOtp,setCabinetSessionCookie} from '../../../../lib/cabinet-auth.js';

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
      return Response.json({ok:false,error:'Кабинет доступен только подтверждённым клиентам RSService26. Оставьте заявку, и менеджер свяжется с вами.'},{status:403});
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
    const response=Response.json({ok:true});
    return setCabinetSessionCookie(response,customer.id);
  }catch(e){
    return Response.json({ok:false,error:'Не удалось открыть кабинет',details:String(e?.message||e)},{status:500});
  }
}
