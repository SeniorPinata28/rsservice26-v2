import {deleteVehicleAdmin} from '../../../../../lib/admin-edit.js';
import {updateVehicleResilient} from '../../../../../lib/vehicle-edit.js';

export async function PATCH(request,{params}){
  try{
    const {id}=await params;
    const data=await request.json().catch(()=>({}));
    const result=await updateVehicleResilient(id,data);
    return Response.json({ok:true,result});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось обновить автомобиль',details:String(e?.message||e)},{status:500});
  }
}

export async function DELETE(request,{params}){
  try{
    const {id}=await params;
    const result=await deleteVehicleAdmin(id);
    return Response.json({ok:true,result});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось удалить автомобиль',details:String(e?.message||e)},{status:500});
  }
}
