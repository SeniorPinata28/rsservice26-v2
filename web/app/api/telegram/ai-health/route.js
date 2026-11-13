import {timingSafeEqual} from 'node:crypto';
import {probeAI} from '../../../../lib/sales-ai.js';
export const runtime='nodejs';
export const maxDuration=30;
export async function POST(request){
 const expected=process.env.TELEGRAM_WEBHOOK_SECRET||'';const provided=request.headers.get('x-telegram-bot-api-secret-token')||'';
 if(!expected||Buffer.byteLength(expected)!==Buffer.byteLength(provided)||!timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))return Response.json({ok:false},{status:401});
 try{const result=await probeAI();return Response.json(result,{status:result.ok?200:503})}catch{return Response.json({ok:false,code:'probe_failed'},{status:503})}
}
