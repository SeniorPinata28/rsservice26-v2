import crypto from 'node:crypto';

const OTP_TTL_MINUTES=10;
const OTP_PEPPER=process.env.CABINET_OTP_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||'rsservice26-dev-secret';

export function generateOtp(){
  return String(Math.floor(100000+Math.random()*900000));
}

export function hashOtp(phone,code){
  return crypto.createHash('sha256').update(`${String(phone||'').trim()}:${String(code||'').trim()}:${OTP_PEPPER}`).digest('hex');
}

export function otpExpiresAt(){
  return new Date(Date.now()+OTP_TTL_MINUTES*60*1000).toISOString();
}

export function canExposeDevCode(){
  return process.env.CABINET_DEV_SHOW_CODE==='true'&&process.env.NODE_ENV!=='production';
}

export async function deliverCabinetCode(phone,code){
  const provider=process.env.CABINET_OTP_PROVIDER||'';
  if(provider==='console'){
    console.log(`RSService26 cabinet code for ${phone}: ${code}`);
    return {ok:true,channel:'console'};
  }
  return {ok:false,error:'Канал доставки кода не настроен. Подключите SMS-провайдера или временно CABINET_OTP_PROVIDER=console для локальной проверки.'};
}
