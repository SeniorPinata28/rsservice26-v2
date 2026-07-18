import {db,dbReady} from '../../../../lib/db.js';

async function checkTable(name){
  const r=await db(`${name}?select=*&limit=1`);
  return {ok:r.ok,status:r.status,error:r.ok?null:r.error};
}

export async function GET(){
  const rosskoEnv={
    ROSSKO_KEY1:Boolean(process.env.ROSSKO_KEY1),
    ROSSKO_KEY2:Boolean(process.env.ROSSKO_KEY2),
    ROSSKO_DELIVERY_ID:Boolean(process.env.ROSSKO_DELIVERY_ID),
    ROSSKO_ADDRESS_ID:Boolean(process.env.ROSSKO_ADDRESS_ID)
  };
  const result={
    ok:true,
    checked_at:new Date().toISOString(),
    supabase:{configured:dbReady(),ok:false},
    tables:{},
    telegram:{configured:Boolean((process.env.TELEGRAM_BOT_TOKEN||process.env.BOT_TOKEN)&&(process.env.TELEGRAM_CHAT_ID||process.env.MANAGER_CHAT_ID))},
    rossko:{configured:Object.values(rosskoEnv).every(Boolean),env:rosskoEnv},
    required_lead_fields:['public_id','created_at','type','status','source','name','phone','car_text','vin','mileage','request_text','raw_payload','customer_id','vehicle_id'],
    notes:[]
  };
  if(!dbReady()){
    result.ok=false;
    result.notes.push('Supabase env vars are missing: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
    return Response.json(result,{status:500});
  }
  const tables=['leads','customers','manager_comments','vehicles','service_history','rate_limits'];
  for(const table of tables){result.tables[table]=await checkTable(table)}
  result.supabase.ok=Boolean(result.tables.leads?.ok);
  if(!result.tables.leads?.ok){result.ok=false;result.notes.push('Table leads is not readable by service role key')}
  if(!result.telegram.configured)result.notes.push('Telegram variables are missing; leads will save but manager notifications will not be sent')
  if(!result.rossko.configured)result.notes.push('Rossko search requires ROSSKO_KEY1, ROSSKO_KEY2, ROSSKO_DELIVERY_ID, ROSSKO_ADDRESS_ID')
  return Response.json(result,{status:result.ok?200:500});
}
