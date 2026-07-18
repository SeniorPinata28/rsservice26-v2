import crypto from 'node:crypto';

export const CABINET_SESSION_COOKIE='rs_cabinet_session';

function sessionSecret(){
  const secret=String(process.env.CABINET_SESSION_SECRET||process.env.CABINET_OTP_SECRET||'');
  if(secret)return secret;
  if(process.env.NODE_ENV!=='production')return 'rsservice26-local-development-only';
  return '';
}

function ttlSeconds(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
function base64url(input){return Buffer.from(input).toString('base64url')}
function fromBase64url(input){return Buffer.from(input,'base64url').toString('utf8')}
function sign(value){const secret=sessionSecret();if(!secret)throw new Error('CABINET_SESSION_SECRET is not configured');return crypto.createHmac('sha256',secret).update(value).digest('base64url')}
function safeEqual(left,right){try{const a=Buffer.from(String(left));const b=Buffer.from(String(right));return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch(e){return false}}

export function normalizeCabinetPhone(phone){
  const digits=String(phone||'').replace(/\D/g,'');
  if(!digits)return '';
  if(digits.length===11&&digits.startsWith('8'))return '7'+digits.slice(1);
  if(digits.length===10)return '7'+digits;
  return digits;
}

export function validateCabinetPassword(password){
  const value=String(password||'');
  if(value.length<8)return 'Пароль должен содержать не менее 8 символов';
  if(value.length>128)return 'Пароль слишком длинный';
  return '';
}

export function hashCabinetPassword(password){
  const error=validateCabinetPassword(password);
  if(error)throw new Error(error);
  const salt=crypto.randomBytes(16).toString('base64url');
  const hash=crypto.scryptSync(String(password),salt,64).toString('base64url');
  return `scrypt$${salt}$${hash}`;
}

export function verifyCabinetPassword(password,storedHash){
  const [algorithm,salt,encoded]=String(storedHash||'').split('$');
  if(algorithm!=='scrypt'||!salt||!encoded)return false;
  try{
    const expected=Buffer.from(encoded,'base64url');
    const actual=crypto.scryptSync(String(password||''),salt,expected.length);
    return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);
  }catch(e){return false}
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
  let expected='';try{expected=sign(encoded)}catch(e){return null}
  if(!safeEqual(expected,signature))return null;
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
