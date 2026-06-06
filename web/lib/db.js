const DB_URL=process.env.NEXT_PUBLIC_SUPABASE_URL;
const DB_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;

export function dbReady(){return Boolean(DB_URL&&DB_KEY)}

export async function db(path,opts={}){
  if(!dbReady())return {ok:false,configured:false,data:null};
  const headers={apikey:DB_KEY,Authorization:'Bearer '+DB_KEY,'Content-Type':'application/json',...(opts.headers||{})};
  const res=await fetch(DB_URL.replace(/\/$/,'')+'/rest/v1/'+path,{method:opts.method||'GET',headers,body:opts.body?JSON.stringify(opts.body):undefined,cache:'no-store'});
  const text=await res.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch(e){data=text}
  return {ok:res.ok,status:res.status,data};
}

export function normalizePhone(phone){
  return String(phone||'').trim();
}

export async function createLead({type,name,phone,car,text,vin,mileage,customerId,vehicleId,raw}){
  const publicId='RS-'+Date.now().toString().slice(-8);
  const payload={...(raw||{}),contact_status:(raw&&raw.contact_status)||'unverified'};
  const created=await db('leads',{method:'POST',headers:{Prefer:'return=representation'},body:[{
    public_id:publicId,
    type:type||'question',
    status:'new_contact',
    source:'site',
    customer_id:customerId||null,
    vehicle_id:vehicleId||null,
    name:name||null,
    phone:normalizePhone(phone)||null,
    car_text:car||null,
    vin:vin||null,
    mileage:mileage||null,
    request_text:text||null,
    raw_payload:payload
  }]});
  if(!created.ok)return null;
  return Array.isArray(created.data)?created.data[0]:created.data;
}

export async function listLeads(){
  const r=await db('leads?select=*&order=created_at.desc&limit=100');
  if(!r.ok)return [];
  return Array.isArray(r.data)?r.data:[];
}

export async function getLead(id){
  const r=await db('leads?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');
  if(!r.ok||!Array.isArray(r.data))return null;
  return r.data[0]||null;
}

export async function updateLeadStatus(id,status){
  const r=await db('leads?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=representation'},body:{status,updated_at:new Date().toISOString()}});
  if(!r.ok)return null;
  return Array.isArray(r.data)?r.data[0]:r.data;
}

export async function listCustomers(){
  const r=await db('customers?select=*&status=eq.confirmed&order=created_at.desc&limit=100');
  if(!r.ok)return [];
  return Array.isArray(r.data)?r.data:[];
}

export async function getCustomer(id){
  const r=await db('customers?id=eq.'+encodeURIComponent(id)+'&status=eq.confirmed&select=*&limit=1');
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
