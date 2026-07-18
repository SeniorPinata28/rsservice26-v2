import {linkLeadToVehicle} from '../../../../../../lib/db.js';

export async function PATCH(request,{params}){
  try{
    const {id}=await params;
    const data=await request.json().catch(()=>({}));
    if(!data.vehicle_id)return Response.json({ok:false,error:'Не указан автомобиль'},{status:400});
    const lead=await linkLeadToVehicle(id,data.vehicle_id);
    return Response.json({ok:true,lead});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось привязать автомобиль к заявке',details:String(e?.message||e)},{status:500});
  }
}
