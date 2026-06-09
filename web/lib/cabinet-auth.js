import crypto from 'node:crypto';
import {cookies} from 'next/headers';

export const CABINET_SESSION_COOKIE='rs_cabinet_session';

const OTP_PEPPER=process.env.CABINET_OTP_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||'rsservice26-dev-secret';
const SESSION_SECRET=process.env.CABINET_SESSION_SECRET||process.env.CABINET_OTP_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||'rsservice26-dev-session-secret';

function ttlSeconds(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
function base64url(input){return Buffer.from(input).toString('base64url')}
function fromBase64url(input){return Buffer.from(input,'base64url').toString('utf8')}
function sign(value){return crypto.createHmac('sha256',SESSION_SECRET).update(value).digest('base64url')}

export function normalizeCabinetPhone(phone){
  const digits=String(phone||'').replace(/\D/g,'');
  if(!digits)return '';
  if(digits.length===11&&digits.startsWith('8'))return '7'+digits.slice(1);
  if(digits.length===10)return '7'+digits;
  return digits;
}

export function generateOtp(){
  return String(Math.floor(100000+Math.random()*900000));
}

export function hashOtp(phone,code){
  return crypto.createHash('sha256').update(`${normalizeCabinetPhone(phone)}:${String(code||'').trim()}:${OTP_PEPPER}`).digest('hex');
}

export function otpExpiresAt(){
  return new Date(Date.now()+ttlSeconds(process.env.CABINET_OTP_TTL_SECONDS,600)*1000).toISOString();
}

export function canExposeDevCode(){
  return process.env.CABINET_DEV_SHOW_CODE==='true'&&process.env.NODE_ENV!=='production';
}

async function deliverCabinetCodeViaSmsRu(phone,code){
  const apiKey=process.env.SMS_RU_API_KEY||process.env.SMS_API_KEY;
  if(!apiKey)return {ok:false,error:'SMS_RU_API_KEY не настроен'};
  const to=normalizeCabinetPhone(phone);
  const text=`RSService26: код входа ${code}`;
  const body=new URLSearchParams({api_id:apiKey,to,msg:text,json:'1'});
  const response=await fetch('https://sms.ru/sms/send',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const data=await response.json().catch(()=>null);
  if(!response.ok)return {ok:false,error:'SMS.ru HTTP '+response.status};
  if(data?.status!=='OK')return {ok:false,error:data?.status_text||'SMS.ru не принял сообщение'};
  const phoneResult=data?.sms?.[to];
  if(phoneResult?.status&&phoneResult.status!=='OK')return {ok:false,error:phoneResult.status_text||'SMS.ru не принял номер'};
  return {ok:true,channel:'sms_ru'};
}

export async function deliverCabinetCode(phone,code){
  const provider=process.env.CABINET_OTP_PROVIDER||'';
  if(provider==='console'&&process.env.NODE_ENV!=='production'){
    console.log(`RSService26 cabinet code for ${phone}: ${code}`);
    return {ok:true,channel:'console'};
  }
  if(provider==='sms_ru')return deliverCabinetCodeViaSmsRu(phone,code);
  return {ok:false,error:'Канал доставки кода не настроен'};
}

export function createCabinetSessionToken(customerId){
  const maxAge=ttlSeconds(process.env.CABINET_SESSION_TTL_SECONDS,60*60*24*14);
  const payload={customer_id:String(customerId),exp:Math.floor(Date.now()/1000)+maxAge};
  const encoded=base64url(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyCabinetSessionToken(token){
  const [encoded,signature]=String(token||'').split('.');
  if(!encoded||!signature)return null;
  if(sign(encoded)!==signature)return null;
  try{
    const payload=JSON.parse(fromBase64url(encoded));
    if(!payload?.customer_id)return null;
    if(Number(payload.exp||0)<Math.floor(Date.now()/1000))return null;
    return {customer_id:String(payload.customer_id)};
  }catch(e){return null}
}

export function setCabinetSessionCookie(response,customerId){
  const maxAge=ttlSeconds(process.env.CABINET_SESSION_TTL_SECONDS,60*60*24*14);
  response.cookies.set(CABINET_SESSION_COOKIE,createCabinetSessionToken(customerId),{
    httpOnly:true,
    secure:process.env.NODE_ENV==='production',
    sameSite:'lax',
    path:'/',
    maxAge
  });
  return response;
}

export function clearCabinetSessionCookie(response){
  response.cookies.set(CABINET_SESSION_COOKIE,'',{
    httpOnly:true,
    secure:process.env.NODE_ENV==='production',
    sameSite:'lax',
    path:'/',
    maxAge:0
  });
  return response;
}

export function getCabinetSessionFromRequest(request){
  return verifyCabinetSessionToken(request.cookies.get(CABINET_SESSION_COOKIE)?.value||'');
}

export function getCabinetSessionFromServerCookies(){
  return verifyCabinetSessionToken(cookies().get(CABINET_SESSION_COOKIE)?.value||'');
}
