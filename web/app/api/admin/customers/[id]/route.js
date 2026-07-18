import {deleteCustomerAdmin,updateCustomerCabinetAccess,updateCustomerDetails} from '../../../../../lib/admin-edit.js';

export async function POST(request,{params}){
  try{
    const {id}=await params;
    const data=await request.json().catch(()=>({}));
    if(data.action!=='cabinet_access')return Response.json({ok:false,error:'Неизвестное действие'},{status:400});
    const result=await updateCustomerCabinetAccess(id,data);
    return Response.json({ok:true,result:{id:result.id,cabinet_enabled:result.cabinet_enabled===true,has_password:Boolean(result.password_hash),password_verified:Boolean(data.password)}});
  }catch(e){
    return Response.json({ok:false,error:String(e?.message||e)},{status:400});
  }
}

export async function PATCH(request,{params}){
  try{
    const {id}=await params;
    const data=await request.json().catch(()=>({}));
    const result=await updateCustomerDetails(id,data);
    return Response.json({ok:true,result});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось обновить клиента',details:String(e?.message||e)},{status:500});
  }
}

export async function DELETE(request,{params}){
  try{
    const {id}=await params;
    const result=await deleteCustomerAdmin(id);
    return Response.json({ok:true,result});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось удалить клиента',details:String(e?.message||e)},{status:500});
  }
}
