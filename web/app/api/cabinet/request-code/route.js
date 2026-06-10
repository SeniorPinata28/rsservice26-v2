import {createCabinetLoginCode,dbReady,findConfirmedCustomerByPhone} from '../../../../lib/db.js';
import {canExposeDevCode,deliverCabinetCode,generateOtp,hashOtp,normalizeCabinetPhone,otpExpiresAt} from '../../../../lib/cabinet-auth.js';
import {checkRateLimit,rateLimitResponse} from '../../../../lib/rate-limit.js';

export async function POST(request){
  try{
    if(!dbReady())return Response.json({ok:false,error:'Supabase не настроен'},{status:500});
    const data=await request.json().catch(()=>({}));
    const phone=normalizeCabinetPhone(data.phone);
    if(!phone)return Response.json({ok:false,error:'Введите телефон'},{status:400});

    const limit=await checkRateLimit({
      request,
      scope:'cabinet_otp',
      phone,
      windowSeconds:Number(process.env.CABINET_OTP_RATE_LIMIT_WINDOW_SECONDS||120),
      limit:Number(process.env.CABINET_OTP_RATE_LIMIT_MAX||1)
    });
    if(!limit.ok)return rateLimitResponse(limit,'Код уже запрошен. Подождите перед повторной отправкой.');

    const customer=await findConfirmedCustomerByPhone(phone);
    if(!customer){
      return Response.json({ok:false,error:'Кабинет доступен только подтверждённым клиентам RSService26. Оставьте заявку, и менеджер свяжется с вами.'},{status:403});
    }

    const code=generateOtp();
    await createCabinetLoginCode(phone,hashOtp(phone,code),otpExpiresAt());
    const delivered=await deliverCabinetCode(phone,code);
    if(!delivered.ok){
      const body={ok:false,error:delivered.error||'Канал доставки кода не настроен'};
      if(canExposeDevCode())body.devCode=code;
      return Response.json(body,{status:500});
    }

    const body={ok:true,message:'Код отправлен. Введите его для входа в кабинет.',channel:delivered.channel||'otp'};
    if(canExposeDevCode())body.devCode=code;
    return Response.json(body);
  }catch(e){
    return Response.json({ok:false,error:'Не удалось отправить код',details:String(e?.message||e)},{status:500});
  }
}
