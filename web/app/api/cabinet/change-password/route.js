import {getCabinetSessionFromRequest,hashCabinetPassword,validateCabinetPassword,verifyCabinetPassword} from '../../../../lib/cabinet-auth.js';
import {db,getCustomer} from '../../../../lib/db.js';

export async function POST(request){
  try{
    const session=getCabinetSessionFromRequest(request);
    if(!session?.customer_id)return Response.json({ok:false,error:'Требуется вход в кабинет'},{status:401});
    const data=await request.json().catch(()=>({}));
    const currentPassword=String(data.current_password||'');
    const newPassword=String(data.new_password||'');
    const customer=await getCustomer(session.customer_id);
    if(!customer||!verifyCabinetPassword(currentPassword,customer.password_hash))return Response.json({ok:false,error:'Текущий пароль указан неверно'},{status:400});
    const error=validateCabinetPassword(newPassword);
    if(error)return Response.json({ok:false,error},{status:400});
    if(currentPassword===newPassword)return Response.json({ok:false,error:'Новый пароль должен отличаться от текущего'},{status:400});
    const updated=await db('customers?id=eq.'+encodeURIComponent(customer.id),{method:'PATCH',body:{password_hash:hashCabinetPassword(newPassword),must_change_password:false,password_updated_at:new Date().toISOString()}});
    if(!updated.ok)throw new Error('Не удалось сохранить пароль');
    return Response.json({ok:true});
  }catch(e){return Response.json({ok:false,error:String(e?.message||e)},{status:500})}
}
