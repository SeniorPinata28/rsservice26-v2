import {createVehicleForCustomerSafe} from '../../../../../../lib/vehicles.js';

export async function POST(request,{params}){
  try{
    const {id}=await params;
    const data=await request.json().catch(()=>({}));
    const result=await createVehicleForCustomerSafe(id,data);
    return Response.json({ok:true,result});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось добавить автомобиль',details:String(e?.message||e)},{status:500});
  }
}
