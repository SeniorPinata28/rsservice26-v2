import {dbReady,findConfirmedCustomerByPhone,normalizePhone} from '../../../../lib/db.js';
import {setCabinetSessionCookie,verifyCabinetPassword} from '../../../../lib/cabinet-auth.js';
import {checkRateLimit,rateLimitResponse} from '../../../../lib/rate-limit.js';
import {normalizeRussianPhone,publicError,requestTooLarge} from '../../../../lib/validation.js';
import {NextResponse} from 'next/server';

export async function POST(request){
  try{
    if(requestTooLarge(request,8192))return Response.json({ok:false,error:'Слишком большой запрос'},{status:413});
    if(!dbReady())return Response.json({ok:false,error:'Supabase не настроен'},{status:500});
    const data=await request.json().catch(()=>({}));
    const phone=normalizeRussianPhone(data.phone);
    const password=String(data.password||'');
    if(!phone)return Response.json({ok:false,error:'Введите корректный российский номер телефона'},{status:400});
    if(!password)return Response.json({ok:false,error:'Введите пароль'},{status:400});

    const limit=await checkRateLimit({
      request,
      // Version the scope so accounts locked by the former OTP-based limits
      // are released after moving to phone + password authentication.
      scope:'cabinet_password_login_v2',
      phone,
      windowSeconds:Number(process.env.CABINET_LOGIN_RATE_LIMIT_WINDOW_SECONDS||300),
      limit:Number(process.env.CABINET_LOGIN_RATE_LIMIT_MAX||10),
      consume:false
    });
    if(!limit.ok)return rateLimitResponse(limit,'Вход временно заблокирован из-за частых попыток.');

    const customer=await findConfirmedCustomerByPhone(phone);
    if(!customer||customer.cabinet_enabled!==true||!verifyCabinetPassword(password,customer.password_hash)){
      await checkRateLimit({
        request,
        scope:'cabinet_password_login_v2',
        phone,
        windowSeconds:Number(process.env.CABINET_LOGIN_RATE_LIMIT_WINDOW_SECONDS||300),
        limit:Number(process.env.CABINET_LOGIN_RATE_LIMIT_MAX||10),
        consume:true
      });
      return Response.json({ok:false,error:'Телефон или пароль не подходят. Проверьте данные, выданные менеджером.'},{status:401});
    }
    const response=NextResponse.json({ok:true,must_change_password:Boolean(customer.must_change_password)});
    return setCabinetSessionCookie(response,customer.id);
  }catch(e){
    return publicError(e);
  }
}
