import {db,dbReady,normalizePhone} from './db.js';

const memoryHits=new Map();

function nowMs(){return Date.now()}
function clientIp(request){
  const forwarded=request.headers.get('x-forwarded-for')||'';
  const first=forwarded.split(',')[0]?.trim();
  return first||request.headers.get('x-real-ip')||request.headers.get('cf-connecting-ip')||'unknown';
}
function cleanIdentifier(value){return String(value||'').trim().slice(0,120)||'unknown'}
function seconds(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?n:fallback}
function limitNumber(value,fallback){const n=Number(value);return Number.isFinite(n)&&n>0?Math.floor(n):fallback}

function memoryCheck(identifier,windowSeconds,limit){
  const now=nowMs();
  const windowMs=windowSeconds*1000;
  const current=(memoryHits.get(identifier)||[]).filter(t=>now-t<windowMs);
  if(current.length>=limit){
    const oldest=Math.min(...current);
    const retryAfter=Math.max(1,Math.ceil((windowMs-(now-oldest))/1000));
    memoryHits.set(identifier,current);
    return {ok:false,retryAfter,source:'memory'};
  }
  current.push(now);
  memoryHits.set(identifier,current);
  return {ok:true,remaining:Math.max(0,limit-current.length),source:'memory'};
}

async function persistentCheck({scope,identifier,windowSeconds,limit}){
  if(!dbReady())return {ok:true,source:'none'};
  const since=new Date(Date.now()-windowSeconds*1000).toISOString();
  const selectPath='rate_limits?scope=eq.'+encodeURIComponent(scope)+'&identifier=eq.'+encodeURIComponent(identifier)+'&created_at=gt.'+encodeURIComponent(since)+'&select=id,created_at&order=created_at.asc';
  const existing=await db(selectPath);
  if(!existing.ok||!Array.isArray(existing.data))return {ok:true,source:'db_unavailable'};
  if(existing.data.length>=limit){
    const oldest=new Date(existing.data[0].created_at).getTime();
    const retryAfter=Math.max(1,Math.ceil((windowSeconds*1000-(Date.now()-oldest))/1000));
    return {ok:false,retryAfter,source:'db'};
  }
  await db('rate_limits',{method:'POST',body:[{scope,identifier}]}).catch(()=>null);
  return {ok:true,remaining:Math.max(0,limit-existing.data.length-1),source:'db'};
}

export async function checkRateLimit({request,scope,phone,windowSeconds,limit}){
  const normalizedPhone=normalizePhone(phone);
  const ip=clientIp(request);
  const phoneKey=normalizedPhone?`phone:${normalizedPhone}`:'';
  const ipKey=`ip:${ip}`;
  const identifier=cleanIdentifier(`${scope}:${phoneKey||ipKey}`);
  const ipIdentifier=cleanIdentifier(`${scope}:${ipKey}`);
  const win=seconds(windowSeconds,60);
  const lim=limitNumber(limit,3);

  const primaryMemory=memoryCheck(identifier,win,lim);
  if(!primaryMemory.ok)return primaryMemory;
  if(phoneKey){
    const ipMemory=memoryCheck(ipIdentifier,win,Math.max(lim*2,4));
    if(!ipMemory.ok)return ipMemory;
  }

  const primaryDb=await persistentCheck({scope,identifier,windowSeconds:win,limit:lim});
  if(!primaryDb.ok)return primaryDb;
  if(phoneKey){
    const ipDb=await persistentCheck({scope,identifier:ipIdentifier,windowSeconds:win,limit:Math.max(lim*2,4)});
    if(!ipDb.ok)return ipDb;
  }
  return {ok:true,remaining:primaryDb.remaining??primaryMemory.remaining??0,source:primaryDb.source||primaryMemory.source};
}

export function rateLimitResponse(result,message='Слишком много запросов. Попробуйте позже.'){
  return Response.json({ok:false,error:message,retryAfter:result?.retryAfter||60},{status:429,headers:{'Retry-After':String(result?.retryAfter||60)}});
}
