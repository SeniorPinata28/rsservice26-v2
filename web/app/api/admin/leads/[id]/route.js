import {addManagerComment,confirmLeadAsCustomer,updateLeadContactStatus,updateLeadStatus} from '../../../../../lib/db.js';
import {deleteLeadAdmin,updateLeadDetails} from '../../../../../lib/admin-edit.js';

export async function PATCH(request,{params}){
  try{
    const data=await request.json();
    const action=String(data.action||'').trim();
    const {id}=await params;
    let result=null;
    if(action==='lead_status')result=await updateLeadStatus(id,data.status);
    else if(action==='contact_status')result=await updateLeadContactStatus(id,data.contact_status);
    else if(action==='comment')result=await addManagerComment(id,data.comment,Boolean(data.is_public));
    else if(action==='confirm_customer')result=await confirmLeadAsCustomer(id);
    else if(action==='edit')result=await updateLeadDetails(id,data);
    else return Response.json({ok:false,error:'Неизвестное действие'},{status:400});
    if(!result)return Response.json({ok:false,error:'Не удалось обновить заявку'},{status:400});
    return Response.json({ok:true,result});
  }catch(e){
    return Response.json({ok:false,error:'Ошибка админского действия',details:String(e?.message||e)},{status:500});
  }
}

export async function DELETE(request,{params}){
  try{
    const {id}=await params;
    const result=await deleteLeadAdmin(id);
    return Response.json({ok:true,result});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось удалить заявку',details:String(e?.message||e)},{status:500});
  }
}
