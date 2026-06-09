const DB_URL=process.env.NEXT_PUBLIC_SUPABASE_URL;
const DB_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;

export const LEAD_STATUSES=['new_contact','in_progress','waiting_client','completed','declined'];
export const CONTACT_STATUSES=['unverified','verified','confirmed_client','duplicate','spam'];

export function dbReady(){return Boolean(DB_URL&&DB_KEY)}

export async function db(path,opts={}){
  if(!dbReady())return {ok:false,configured:false,data:null,error:'Supabase is not configured'};
  const headers={apikey:DB_KEY,Authorization:'Bearer '+DB_KEY,'Content-Type':'application/json',...(opts.headers||{})};
  const res=await fetch(DB_URL.replace(/\/$/,'')+'/rest/v1/'+path,{method:opts.method||'GET',headers,body:opts.body?JSON.stringify(opts.body):undefined,cache:'no-store'});
  const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch(e){data=text}
  return {ok:res.ok,status:res.status,data,error:res.ok?null:data};
}

export function normalizePhone(phone){return String(phone||'').replace(/\D/g,'').trim()}
export function normalizeLeadStatus(status){return LEAD_STATUSES.includes(status)?status:'new_contact'}
export function normalizeContactStatus(status){return CONTACT_STATUSES.includes(status)?status:'unverified'}
export function normalizeLeadType(type){const map={part:'parts_order',installation:'installation_booking',service:'service_booking',question:'general_callback',selection:'parts_selection_request',contact:'general_callback',cabinet_data_correction:'cabinet_data_correction',cabinet_vehicle_request:'cabinet_vehicle_request',cabinet_request:'cabinet_request'};return map[type]||type||'general_callback'}
export function getContactStatus(lead){return normalizeContactStatus(lead?.contact_status||lead?.raw_payload?.contact_status)}

export async function createLead({type,name,phone,car,text,vin,mileage,customerId,vehicleId,source,raw}){
  const now=new Date().toISOString();const publicId='RS-'+Date.now().toString().slice(-8);const contactStatus=normalizeContactStatus(raw?.contact_status);const rawPayload={...(raw||{}),contact_status:contactStatus,lead_status:'new_contact'};
  const base={public_id:publicId,created_at:now,type:normalizeLeadType(type),status:'new_contact',contact_status:contactStatus,source:source||raw?.source||'site',customer_id:customerId||null,vehicle_id:vehicleId||null,name:name||null,phone:normalizePhone(phone)||null,car_text:car||null,vin:vin||null,mileage:mileage||null,request_text:text||null,raw_payload:rawPayload};
  let created=await db('leads',{method:'POST',headers:{Prefer:'return=representation'},body:[base]});
  if(!created.ok){const fallback={...base};delete fallback.contact_status;created=await db('leads',{method:'POST',headers:{Prefer:'return=representation'},body:[fallback]})}
  if(!created.ok)throw new Error('Supabase leads insert failed: '+JSON.stringify(created.error||created.data||created.status));
  return Array.isArray(created.data)?created.data[0]:created.data;
}

export async function listLeads(){const r=await db('leads?select=*&order=created_at.desc&limit=200');return r.ok&&Array.isArray(r.data)?r.data:[]}
export async function getLead(id){const r=await db('leads?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');return r.ok&&Array.isArray(r.data)?r.data[0]||null:null}
export async function updateLead(id,patch){const r=await db('leads?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=representation'},body:patch});if(!r.ok)throw new Error('Supabase leads update failed: '+JSON.stringify(r.error||r.data||r.status));return Array.isArray(r.data)?r.data[0]:r.data}
export async function updateLeadStatus(id,status){return updateLead(id,{status:normalizeLeadStatus(status)})}

export async function updateLeadContactStatus(id,contactStatus){const lead=await getLead(id);if(!lead)return null;const next=normalizeContactStatus(contactStatus);const raw={...(lead.raw_payload||{}),contact_status:next};try{return await updateLead(id,{contact_status:next,raw_payload:raw})}catch(e){return updateLead(id,{raw_payload:raw})}}

export async function addManagerComment(id,comment,isPublic=false){const text=String(comment||'').trim();if(!text)return await getLead(id);const lead=await getLead(id);if(!lead)return null;const publicFlag=Boolean(isPublic);const item={text,created_at:new Date().toISOString(),is_public:publicFlag};const raw=lead.raw_payload||{};const comments=Array.isArray(raw.manager_comments)?raw.manager_comments:[];const rawPatch={...raw,manager_comments:[item,...comments].slice(0,20),manager_comment_last:text};if(publicFlag)rawPatch.manager_comment_public=text;const updated=await updateLead(id,{raw_payload:rawPatch});const commentBody={lead_id:id,comment_text:text,is_public:publicFlag};await db('manager_comments',{method:'POST',body:[commentBody]}).catch(()=>db('manager_comments',{method:'POST',body:[{lead_id:id,comment_text:text}]}).catch(()=>null));return updated}

export async function listCustomers(){const r=await db('customers?select=*&order=created_at.desc&limit=100');if(!r.ok)return [];const rows=Array.isArray(r.data)?r.data:[];return rows.filter(c=>!c.status||c.status==='confirmed'||c.status==='confirmed_client')}
export async function findCustomerByPhone(phone){const normalized=normalizePhone(phone);if(!normalized)return null;const r=await db('customers?phone=eq.'+encodeURIComponent(normalized)+'&select=*&limit=1');return r.ok&&Array.isArray(r.data)?r.data[0]||null:null}
export async function findConfirmedCustomerByPhone(phone){const c=await findCustomerByPhone(phone);if(!c)return null;if(c.status&&c.status!=='confirmed'&&c.status!=='confirmed_client')return null;return c}

async function createCustomerVariant(body){const created=await db('customers',{method:'POST',headers:{Prefer:'return=representation'},body:[body]});if(!created.ok)return {ok:false,error:created.error||created.data||created.status};return {ok:true,customer:Array.isArray(created.data)?created.data[0]:created.data}}
async function confirmCustomerRow(customer){if(!customer?.id)return customer;const variants=[{status:'confirmed'},{status:'confirmed_client'},{}];for(const patch of variants){if(Object.keys(patch).length===0)return customer;const r=await db('customers?id=eq.'+customer.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:patch});if(r.ok)return Array.isArray(r.data)?r.data[0]:r.data}return customer}

export async function confirmLeadAsCustomer(id){
  const lead=await getLead(id);if(!lead)return null;const phone=normalizePhone(lead.phone);if(!phone)throw new Error('У заявки нет телефона для подтверждения клиента');
  let customer=await findCustomerByPhone(phone);if(customer)customer=await confirmCustomerRow(customer);
  if(!customer){const variants=[{full_name:lead.name||null,phone,status:'confirmed',source:lead.source||'site'},{full_name:lead.name||null,phone,status:'confirmed'},{name:lead.name||null,phone,status:'confirmed'},{full_name:lead.name||null,phone},{name:lead.name||null,phone},{phone}];let lastError=null;for(const body of variants){const attempt=await createCustomerVariant(body);if(attempt.ok){customer=attempt.customer;break}lastError=attempt.error}if(!customer)throw new Error('Не удалось создать клиента: '+JSON.stringify(lastError))}
  const raw={...(lead.raw_payload||{}),contact_status:'confirmed_client'};try{return {lead:await updateLead(id,{customer_id:customer.id,contact_status:'confirmed_client',raw_payload:raw}),customer}}catch(e){return {lead:await updateLead(id,{customer_id:customer.id,raw_payload:raw}),customer}}
}

export async function getCustomer(id){const r=await db('customers?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');return r.ok&&Array.isArray(r.data)?r.data[0]||null:null}
export async function getCustomerLeads(customerId){const r=await db('leads?customer_id=eq.'+encodeURIComponent(customerId)+'&select=*&order=created_at.desc&limit=100');return r.ok&&Array.isArray(r.data)?r.data:[]}
export async function getCustomerVehicles(customerId){const r=await db('vehicles?customer_id=eq.'+encodeURIComponent(customerId)+'&select=*&order=created_at.desc&limit=100');return r.ok&&Array.isArray(r.data)?r.data:[]}
export async function getCustomerServiceHistory(customerId){
  const vehicles=await getCustomerVehicles(customerId);
  const byCustomer=await db('service_history?customer_id=eq.'+encodeURIComponent(customerId)+'&select=*&order=service_date.desc&limit=100');
  const rows=[];
  if(byCustomer.ok&&Array.isArray(byCustomer.data))rows.push(...byCustomer.data);
  const vehicleIds=vehicles.map(v=>v.id).filter(Boolean);
  if(vehicleIds.length){
    const encodedIds='('+vehicleIds.map(id=>'"'+String(id).replace(/"/g,'')+'"').join(',')+')';
    const byVehicle=await db('service_history?vehicle_id=in.'+encodeURIComponent(encodedIds)+'&select=*&order=service_date.desc&limit=100');
    if(byVehicle.ok&&Array.isArray(byVehicle.data))rows.push(...byVehicle.data);
  }
  const unique=new Map();
  for(const row of rows){if(row?.id&&!unique.has(row.id))unique.set(row.id,row)}
  return Array.from(unique.values()).sort((a,b)=>new Date(b.service_date||b.created_at||0)-new Date(a.service_date||a.created_at||0));
}
export async function listVehicles(){const r=await db('vehicles?select=*&order=created_at.desc&limit=100');return r.ok&&Array.isArray(r.data)?r.data:[]}
export async function getVehicle(id){const r=await db('vehicles?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');return r.ok&&Array.isArray(r.data)?r.data[0]||null:null}
export async function getVehicleLeads(vehicleId){const r=await db('leads?vehicle_id=eq.'+encodeURIComponent(vehicleId)+'&select=*&order=created_at.desc&limit=100');return r.ok&&Array.isArray(r.data)?r.data:[]}
export async function getVehicleServiceHistory(vehicleId){const r=await db('service_history?vehicle_id=eq.'+encodeURIComponent(vehicleId)+'&select=*&order=service_date.desc&limit=100');return r.ok&&Array.isArray(r.data)?r.data:[]}
export async function getPublicLeadComments(leadIds=[]){
  const ids=leadIds.filter(Boolean);
  if(!ids.length)return [];
  const encodedIds='('+ids.map(id=>'"'+String(id).replace(/"/g,'')+'"').join(',')+')';
  const r=await db('manager_comments?lead_id=in.'+encodeURIComponent(encodedIds)+'&is_public=eq.true&select=*&order=created_at.desc&limit=100');
  return r.ok&&Array.isArray(r.data)?r.data:[];
}

function trimOrNull(value){const text=String(value||'').trim();return text||null}
function numberOrNull(value){const n=Number(value);return Number.isFinite(n)&&String(value).trim()!==''?n:null}
function vehicleCarText(data){return trimOrNull(data.car_text)||[trimOrNull(data.brand),trimOrNull(data.model),trimOrNull(data.year)].filter(Boolean).join(' ')||trimOrNull(data.vin)||'Автомобиль клиента'}
async function createVehicleVariant(body){const created=await db('vehicles',{method:'POST',headers:{Prefer:'return=representation'},body:[body]});if(!created.ok)return {ok:false,error:created.error||created.data||created.status};return {ok:true,vehicle:Array.isArray(created.data)?created.data[0]:created.data}}

export async function createVehicleForCustomer(customerId,data={}){
  const customer=await getCustomer(customerId);
  if(!customer)throw new Error('Клиент не найден');
  const carText=vehicleCarText(data);
  const base={customer_id:customerId,car_text:carText,brand:trimOrNull(data.brand),model:trimOrNull(data.model),year:numberOrNull(data.year),vin:trimOrNull(data.vin),plate_number:trimOrNull(data.plate_number),mileage:numberOrNull(data.mileage)};
  const variants=[base,{customer_id:customerId,car_text:carText,vin:base.vin,plate_number:base.plate_number,mileage:base.mileage},{customer_id:customerId,car_text:carText,vin:base.vin,mileage:base.mileage},{customer_id:customerId,car_text:carText,vin:base.vin},{customer_id:customerId,car_text:carText},{customer_id:customerId,vin:base.vin},{customer_id:customerId}];
  let lastError=null;
  for(const body of variants){const clean=Object.fromEntries(Object.entries(body).filter(([,v])=>v!==undefined));const attempt=await createVehicleVariant(clean);if(attempt.ok)return {vehicle:attempt.vehicle,customer};lastError=attempt.error}
  throw new Error('Не удалось создать автомобиль: '+JSON.stringify(lastError));
}

export async function linkLeadToVehicle(leadId,vehicleId){
  const lead=await getLead(leadId);if(!lead)throw new Error('Заявка не найдена');
  const vehicle=await getVehicle(vehicleId);if(!vehicle)throw new Error('Автомобиль не найден');
  const patch={vehicle_id:vehicle.id};
  if(vehicle.customer_id)patch.customer_id=vehicle.customer_id;
  if(!lead.car_text&&(vehicle.car_text||vehicle.brand||vehicle.model))patch.car_text=vehicle.car_text||[vehicle.brand,vehicle.model,vehicle.year].filter(Boolean).join(' ');
  if(!lead.vin&&vehicle.vin)patch.vin=vehicle.vin;
  if(!lead.mileage&&vehicle.mileage)patch.mileage=vehicle.mileage;
  return updateLead(lead.id,patch);
}

export async function createCabinetLoginCode(phone,codeHash,expiresAt){
  const normalized=normalizePhone(phone);
  const r=await db('cabinet_login_codes',{method:'POST',headers:{Prefer:'return=representation'},body:[{phone:normalized,code_hash:codeHash,expires_at:expiresAt}]});
  if(!r.ok)throw new Error('Не удалось сохранить код входа: '+JSON.stringify(r.error||r.data||r.status));
  return Array.isArray(r.data)?r.data[0]:r.data;
}

export async function findActiveCabinetLoginCode(phone){
  const normalized=normalizePhone(phone);
  const r=await db('cabinet_login_codes?phone=eq.'+encodeURIComponent(normalized)+'&used_at=is.null&expires_at=gt.'+encodeURIComponent(new Date().toISOString())+'&select=*&order=created_at.desc&limit=1');
  return r.ok&&Array.isArray(r.data)?r.data[0]||null:null;
}

export async function markCabinetLoginCodeUsed(id){
  const r=await db('cabinet_login_codes?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=representation'},body:{used_at:new Date().toISOString()}});
  if(!r.ok)throw new Error('Не удалось погасить код входа: '+JSON.stringify(r.error||r.data||r.status));
  return Array.isArray(r.data)?r.data[0]:r.data;
}

export async function incrementCabinetLoginAttempts(id,attempts){
  const next=Number(attempts||0)+1;
  const r=await db('cabinet_login_codes?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=representation'},body:{attempts:next}});
  return r.ok?(Array.isArray(r.data)?r.data[0]:r.data):null;
}
