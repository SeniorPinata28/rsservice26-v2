const DB_URL=process.env.NEXT_PUBLIC_SUPABASE_URL;
const DB_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;

export const LEAD_STATUSES=['new_contact','in_progress','waiting_client','completed','declined'];
export const CONTACT_STATUSES=['unverified','verified','confirmed_client','duplicate','spam'];

export function dbReady(){return Boolean(DB_URL&&DB_KEY)}

export async function db(path,opts={}){
  if(!dbReady())return {ok:false,configured:false,data:null,error:'Supabase is not configured'};
  const headers={apikey:DB_KEY,Authorization:'Bearer '+DB_KEY,'Content-Type':'application/json',...(opts.headers||{})};
  const res=await fetch(DB_URL.replace(/\/$/,'')+'/rest/v1/'+path,{method:opts.method||'GET',headers,body:opts.body?JSON.stringify(opts.body):undefined,cache:'no-store'});
  const text=await res.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch(e){data=text}
  return {ok:res.ok,status:res.status,data,error:res.ok?null:data};
}

export function normalizePhone(phone){return String(phone||'').replace(/[^0-9+]/g,'').trim()}
export function normalizeLeadStatus(status){return LEAD_STATUSES.includes(status)?status:'new_contact'}
export function normalizeContactStatus(status){return CONTACT_STATUSES.includes(status)?status:'unverified'}
export function getContactStatus(lead){return normalizeContactStatus(lead?.raw_payload?.contact_status)}

export async function createLead({type,name,phone,car,text,vin,mileage,customerId,vehicleId,source,raw}){
  const now=new Date().toISOString();
  const publicId='RS-'+Date.now().toString().slice(-8);
  const rawPayload={...(raw||{}),contact_status:normalizeContactStatus(raw?.contact_status),lead_status:'new_contact'};
  const created=await db('leads',{method:'POST',headers:{Prefer:'return=representation'},body:[{
    public_id:publicId,
    created_at:now,
    type:type||'question',
    status:'new_contact',
    source:source||raw?.source||'site',
    customer_id:customerId||null,
    vehicle_id:vehicleId||null,
    name:name||null,
    phone:normalizePhone(phone)||null,
    car_text:car||null,
    vin:vin||null,
    mileage:mileage||null,
    request_text:text||null,
    raw_payload:rawPayload
  }]});
  if(!created.ok)throw new Error('Supabase leads insert failed: '+JSON.stringify(created.error||created.data||created.status));
  return Array.isArray(created.data)?created.data[0]:created.data;
}

export async function listLeads(){
  const r=await db('leads?select=*&order=created_at.desc&limit=200');
  if(!r.ok)return [];
  return Array.isArray(r.data)?r.data:[];
}

export async function getLead(id){
  const r=await db('leads?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');
  if(!r.ok||!Array.isArray(r.data))return null;
  return r.data[0]||null;
}

export async function updateLead(id,patch){
  const r=await db('leads?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=representation'},body:patch});
  if(!r.ok)throw new Error('Supabase leads update failed: '+JSON.stringify(r.error||r.data||r.status));
  return Array.isArray(r.data)?r.data[0]:r.data;
}

export async function updateLeadStatus(id,status){return updateLead(id,{status:normalizeLeadStatus(status)})}

export async function updateLeadContactStatus(id,contactStatus){
  const lead=await getLead(id);
  if(!lead)return null;
  const raw={...(lead.raw_payload||{}),contact_status:normalizeContactStatus(contactStatus)};
  return updateLead(id,{raw_payload:raw});
}

export async function addManagerComment(id,comment){
  const text=String(comment||'').trim();
  if(!text)return await getLead(id);
  const lead=await getLead(id);
  if(!lead)return null;
  const item={text,created_at:new Date().toISOString()};
  const raw=lead.raw_payload||{};
  const comments=Array.isArray(raw.manager_comments)?raw.manager_comments:[];
  const updated=await updateLead(id,{raw_payload:{...raw,manager_comments:[item,...comments].slice(0,20),manager_comment_last:text}});
  await db('manager_comments',{method:'POST',body:[{lead_id:id,comment_text:text}]}).catch(()=>null);
  return updated;
}

export async function listCustomers(){
  const r=await db('customers?select=*&order=created_at.desc&limit=100');
  if(!r.ok)return [];
  const rows=Array.isArray(r.data)?r.data:[];
  return rows.filter(c=>!c.status||c.status==='confirmed'||c.status==='confirmed_client');
}

export async function findConfirmedCustomerByPhone(phone){
  const normalized=normalizePhone(phone);
  if(!normalized)return null;
  const r=await db('customers?phone=eq.'+encodeURIComponent(normalized)+'&select=*&limit=1');
  if(!r.ok||!Array.isArray(r.data))return null;
  const customer=r.data[0]||null;
  if(!customer)return null;
  if(customer.status&&customer.status!=='confirmed'&&customer.status!=='confirmed_client')return null;
  return customer;
}

async function createCustomerVariant(body){
  const created=await db('customers',{method:'POST',headers:{Prefer:'return=representation'},body:[body]});
  if(!created.ok)return {ok:false,error:created.error||created.data||created.status};
  return {ok:true,customer:Array.isArray(created.data)?created.data[0]:created.data};
}

export async function confirmLeadAsCustomer(id){
  const lead=await getLead(id);
  if(!lead)return null;
  const phone=normalizePhone(lead.phone);
  if(!phone)throw new Error('У заявки нет телефона для подтверждения клиента');
  let customer=await findConfirmedCustomerByPhone(phone);
  if(!customer){
    const variants=[
      {full_name:lead.name||null,phone,status:'confirmed'},
      {name:lead.name||null,phone,status:'confirmed'},
      {full_name:lead.name||null,phone},
      {name:lead.name||null,phone},
      {phone}
    ];
    let lastError=null;
    for(const body of variants){
      const attempt=await createCustomerVariant(body);
      if(attempt.ok){customer=attempt.customer;break}
      lastError=attempt.error;
    }
    if(!customer)throw new Error('Не удалось создать клиента: '+JSON.stringify(lastError));
  }
  const raw={...(lead.raw_payload||{}),contact_status:'confirmed_client'};
  const updated=await updateLead(id,{customer_id:customer.id,raw_payload:raw});
  return {lead:updated,customer};
}

export async function getCustomer(id){
  const r=await db('customers?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');
  if(!r.ok||!Array.isArray(r.data))return null;
  return r.data[0]||null;
}

export async function getCustomerLeads(customerId){
  const r=await db('leads?customer_id=eq.'+encodeURIComponent(customerId)+'&select=*&order=created_at.desc&limit=100');
  if(!r.ok)return [];
  return Array.isArray(r.data)?r.data:[];
}

export async function getCustomerVehicles(customerId){
  const r=await db('vehicles?customer_id=eq.'+encodeURIComponent(customerId)+'&select=*&order=created_at.desc&limit=100');
  if(!r.ok)return [];
  return Array.isArray(r.data)?r.data:[];
}

export async function listVehicles(){
  const r=await db('vehicles?select=*&order=created_at.desc&limit=100');
  if(!r.ok)return [];
  return Array.isArray(r.data)?r.data:[];
}

export async function getVehicle(id){
  const r=await db('vehicles?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');
  if(!r.ok||!Array.isArray(r.data))return null;
  return r.data[0]||null;
}

export async function getVehicleLeads(vehicleId){
  const r=await db('leads?vehicle_id=eq.'+encodeURIComponent(vehicleId)+'&select=*&order=created_at.desc&limit=100');
  if(!r.ok)return [];
  return Array.isArray(r.data)?r.data:[];
}

export async function getVehicleServiceHistory(vehicleId){
  const r=await db('service_history?vehicle_id=eq.'+encodeURIComponent(vehicleId)+'&select=*&order=service_date.desc&limit=100');
  if(!r.ok)return [];
  return Array.isArray(r.data)?r.data:[];
}
