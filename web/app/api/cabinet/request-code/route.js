import {createCabinetLoginCode,dbReady,findConfirmedCustomerByPhone,normalizePhone} from '../../../../lib/db.js';
import {canExposeDevCode,deliverCabinetCode,generateOtp,hashOtp,otpExpiresAt} from '../../../../lib/cabinet-auth.js';

export async function POST(request){
  try{
    if(!dbReady())return Response.json({ok:false,error:'Supabase не настроен'},{status:500});
    const data=await request.json().catch(()=>({}));
    const phone=normalizePhone(data.phone);
    if(!phone)return Response.json({ok:false,error:'Введите телефон'},{status:400});

    const customer=await findConfirmedCustomerByPhone(phone);
    if(!customer){
      return Response.json({ok:false,error:'Код можно отправить только подтверждённому клиенту RSService26.'},{status:403});
    }

    const code=generateOtp();
    await createCabinetLoginCode(phone,hashOtp(phone,code),otpExpiresAt());
    const delivered=await deliverCabinetCode(phone,code);
    if(!delivered.ok){
      const body={ok:false,error:delivered.error||'Код создан, но канал доставки не настроен'};
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
