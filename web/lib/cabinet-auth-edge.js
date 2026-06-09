export const CABINET_SESSION_COOKIE='rs_cabinet_session';

const SESSION_SECRET=process.env.CABINET_SESSION_SECRET||process.env.CABINET_OTP_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||'rsservice26-dev-session-secret';

function base64urlBytes(buffer){
  const bytes=new Uint8Array(buffer);
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromBase64url(input){
  const padded=String(input||'').replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(String(input||'').length/4)*4,'=');
  try{return atob(padded)}catch(e){return ''}
}
async function signEdge(value){
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey('raw',encoder.encode(SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,encoder.encode(value));
  return base64urlBytes(signature);
}

export async function verifyCabinetSessionTokenEdge(token){
  const [encoded,signature]=String(token||'').split('.');
  if(!encoded||!signature)return null;
  const expected=await signEdge(encoded);
  if(expected!==signature)return null;
  try{
    const payload=JSON.parse(fromBase64url(encoded));
    if(!payload?.customer_id)return null;
    if(Number(payload.exp||0)<Math.floor(Date.now()/1000))return null;
    return {customer_id:String(payload.customer_id)};
  }catch(e){return null}
}
