import {getCabinetSessionFromRequest} from '../../../../lib/cabinet-auth.js';
import {dbReady,getCustomer,getCustomerLeads,getCustomerServiceHistory,getCustomerVehicles,getPublicLeadComments} from '../../../../lib/db.js';

function noteValue(notes,label){return String(notes||'').match(new RegExp(label+':\\s*([^\\n]+)','i'))?.[1]||''}
function publicCustomer(customer){return {id:customer.id,name:customer.full_name||customer.name||'Клиент RSService26',phone:customer.phone||'',email:customer.email||'',status:customer.status||'confirmed',created_at:customer.created_at||'',must_change_password:Boolean(customer.must_change_password)}}
function publicVehicle(v){return {id:v.id,car_text:v.car_text||[v.brand||v.make,v.model,v.year].filter(Boolean).join(' ')||noteValue(v.notes,'Автомобиль')||v.vin||'Автомобиль',brand:v.brand||v.make||'',model:v.model||'',year:v.year||'',vin:v.vin||noteValue(v.notes,'VIN')||'',plate_number:v.plate_number||v.license_plate||noteValue(v.notes,'Госномер')||'',mileage:v.mileage||noteValue(v.notes,'Пробег')||''}}
function publicLead(lead,commentsByLead){const comments=commentsByLead.get(lead.id)||[];return {id:lead.id,public_id:lead.public_id||'',created_at:lead.created_at||'',type:lead.type||'',status:lead.status||'',vehicle_id:lead.vehicle_id||'',car_text:lead.car_text||'',vin:lead.vin||'',mileage:lead.mileage||'',request_text:lead.request_text||'',manager_comment_last:comments[0]?.comment_text||'',manager_comments:comments.map(comment=>({id:comment.id,created_at:comment.created_at,comment_text:comment.comment_text}))}}
function publicHistory(item){return {id:item.id,vehicle_id:item.vehicle_id||'',lead_id:item.lead_id||'',service_date:item.service_date||item.created_at||'',title:item.title||item.service_name||'Работа',description:item.description||'',mileage:item.mileage||'',price:item.price||item.total||''}}

export async function GET(request){
  try{
    if(!dbReady())return Response.json({ok:false,error:'Supabase не настроен'},{status:500});
    const session=getCabinetSessionFromRequest(request);
    if(!session?.customer_id)return Response.json({ok:false,error:'Требуется вход в кабинет'},{status:401});
    const customer=await getCustomer(session.customer_id);
    if(!customer)return Response.json({ok:false,error:'Клиент не найден'},{status:404});
    const [vehicles,leads,history]=await Promise.all([getCustomerVehicles(customer.id),getCustomerLeads(customer.id),getCustomerServiceHistory(customer.id)]);
    const publicComments=await getPublicLeadComments(leads.map(lead=>lead.id));
    const commentsByLead=new Map();
    for(const comment of publicComments){
      const list=commentsByLead.get(comment.lead_id)||[];
      list.push(comment);
      commentsByLead.set(comment.lead_id,list);
    }
    return Response.json({ok:true,customer:publicCustomer(customer),vehicles:vehicles.map(publicVehicle),leads:leads.map(lead=>publicLead(lead,commentsByLead)),service_history:history.map(publicHistory)});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось загрузить кабинет',details:String(e?.message||e)},{status:500});
  }
}
