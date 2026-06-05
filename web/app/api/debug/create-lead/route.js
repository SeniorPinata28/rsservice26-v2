import {createLead,getOrCreateCustomer,dbReady} from '../../../../lib/db.js';

export async function GET(){
  if(!dbReady())return Response.json({ok:false,error:'Supabase env not ready'});
  try{
    const name='Debug Test';
    const phone='70000000000';
    const text='Debug lead from API';
    const customer=await getOrCreateCustomer({name,phone});
    const lead=await createLead({type:'debug',name,phone,car:'Debug car',text,customerId:customer?.id,raw:{source:'debug-endpoint'}});
    return Response.json({ok:true,customer,lead});
  }catch(e){
    return Response.json({ok:false,error:String(e?.message||e)},{status:500});
  }
}
