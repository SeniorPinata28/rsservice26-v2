import {createVehicleForCustomer} from '../../../../../../lib/db.js';

export async function POST(request,{params}){
  try{
    const data=await request.json().catch(()=>({}));
    const result=await createVehicleForCustomer(params.id,data);
    return Response.json({ok:true,result});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось добавить автомобиль',details:String(e?.message||e)},{status:500});
  }
}
