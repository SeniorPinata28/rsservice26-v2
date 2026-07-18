import {dbReady,findConfirmedCustomerByPhone,normalizePhone} from '../../../../lib/db.js';
import {setCabinetSessionCookie,verifyCabinetPassword} from '../../../../lib/cabinet-auth.js';
import {checkRateLimit,rateLimitResponse} from '../../../../lib/rate-limit.js';
import {normalizeRussianPhone,publicError,requestTooLarge} from '../../../../lib/validation.js';

export async function POST(request){
  try{
    if(requestTooLarge(request,8192))return Response.json({ok:false,error:'Слишком большой запрос'},{status:413});
    if(!dbReady())return Response.json({ok:false,error:'Supabase не настроен'},{status:500});
    const data=await request.json().catch(()=>({}));
    const phone=normalizeRussianPhone(data.phone);
    const password=String(data.password||'');
    if(!phone)return Response.json({ok:false,error:'Введите корректный российский номер телефона'},{status:400});
    if(!password)return Response.json({ok:false,error:'Введите пароль'},{status:400});

    const limit=await checkRateLimit({request,scope:'cabinet_password_login',phone,windowSeconds:300,limit:10});
    if(!limit.ok)return rateLimitResponse(limit,'Слишком много попыток входа. Попробуйте через несколько минут.');

    const customer=await findConfirmedCustomerByPhone(phone);
    if(!customer||customer.cabinet_enabled!==true||!verifyCabinetPassword(password,customer.password_hash)){
      return Response.json({ok:false,error:'Неверный телефон или пароль'},{status:401});
    }
    const response=Response.json({ok:true,must_change_password:Boolean(customer.must_change_password)});
    return setCabinetSessionCookie(response,customer.id);
  }catch(e){
    return publicError(e);
  }
}
