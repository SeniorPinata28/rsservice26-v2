import {timingSafeEqual} from 'node:crypto';
import {handleTelegramUpdate} from '../../../../lib/telegram-bot.js';
import {publicError,readLimitedJson} from '../../../../lib/validation.js';
export const runtime='nodejs';
export const maxDuration=30;
export async function GET(){return Response.json({ok:false,error:'Method not allowed'},{status:405,headers:{Allow:'POST'}})}
export async function POST(request){
 const expected=process.env.TELEGRAM_WEBHOOK_SECRET||'';
 const provided=request.headers.get('x-telegram-bot-api-secret-token')||'';
 if(!expected||Buffer.byteLength(provided)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))return Response.json({ok:false},{status:401});
 try{
  const update=await readLimitedJson(request,65536);
  if(!Number.isSafeInteger(update.update_id))return Response.json({ok:false},{status:400});
  await handleTelegramUpdate(update);
  return Response.json({ok:true});
 }catch(error){console.error('Telegram webhook processing failed');return publicError(error)}
}
