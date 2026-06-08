import {updateCustomerDetails} from '../../../../../lib/admin-edit.js';

export async function PATCH(request,{params}){
  try{
    const data=await request.json().catch(()=>({}));
    const result=await updateCustomerDetails(params.id,data);
    return Response.json({ok:true,result});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось обновить клиента',details:String(e?.message||e)},{status:500});
  }
}
