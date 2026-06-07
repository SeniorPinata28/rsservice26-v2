import {linkLeadToVehicle} from '../../../../../../lib/db.js';

export async function PATCH(request,{params}){
  try{
    const data=await request.json().catch(()=>({}));
    if(!data.vehicle_id)return Response.json({ok:false,error:'Не указан автомобиль'},{status:400});
    const lead=await linkLeadToVehicle(params.id,data.vehicle_id);
    return Response.json({ok:true,lead});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось привязать автомобиль к заявке',details:String(e?.message||e)},{status:500});
  }
}
