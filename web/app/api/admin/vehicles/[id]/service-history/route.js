import {createServiceHistoryForVehicle} from '../../../../../../lib/service-history.js';

export async function POST(request,{params}){
  try{
    const data=await request.json().catch(()=>({}));
    const result=await createServiceHistoryForVehicle(params.id,data);
    return Response.json({ok:true,result});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось добавить запись обслуживания',details:String(e?.message||e)},{status:500});
  }
}
