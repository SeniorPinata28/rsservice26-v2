const DB_URL=process.env.NEXT_PUBLIC_SUPABASE_URL;
const DB_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;

export function dbReady(){return Boolean(DB_URL&&DB_KEY)}

async function db(path,opts={}){
  if(!dbReady())return {ok:false,configured:false,data:null};
  const headers={apikey:DB_KEY,Authorization:'Bearer '+DB_KEY,'Content-Type':'application/json',...(opts.headers||{})};
  const res=await fetch(DB_URL.replace(/\/$/,'')+'/rest/v1/'+path,{method:opts.method||'GET',headers,body:opts.body?JSON.stringify(opts.body):undefined,cache:'no-store'});
  const text=await res.text();
  let data=null;
  try{data=text?JSON.parse(text):null}catch(e){data=text}
  return {ok:res.ok,status:res.status,data};
}

export async function getOrCreateCustomer({name,phone}){
  const p=String(phone||'').trim();
  if(!p)return null;
  const found=await db('customers?phone=eq.'+encodeURIComponent(p)+'&select=id,full_name,phone&limit=1');
  if(found.ok&&Array.isArray(found.data)&&found.data[0]){
    await db('customers?id=eq.'+found.data[0].id,{method:'PATCH',headers:{Prefer:'return=representation'},body:{last_activity_at:new Date().toISOString(),...(name&&!found.data[0].full_name?{full_name:name}:{})}});
    return found.data[0];
  }
  const created=await db('customers',{method:'POST',headers:{Prefer:'return=representation'},body:[{full_name:name||null,phone:p,source:'site',status:'new',last_activity_at:new Date().toISOString()}]});
  if(!created.ok)return null;
  return Array.isArray(created.data)?created.data[0]:created.data;
}

export async function createLead({type,name,phone,car,text,vin,mileage,customerId,vehicleId,raw}){
  const publicId='RS-'+Date.now().toString().slice(-8);
  const created=await db('leads',{method:'POST',headers:{Prefer:'return=representation'},body:[{public_id:publicId,type:type||'question',status:'new',source:'site',customer_id:customerId||null,vehicle_id:vehicleId||null,name:name||null,phone:phone||null,car_text:car||null,vin:vin||null,mileage:mileage||null,request_text:text||null,raw_payload:raw||null}]});
  if(!created.ok)return null;
  return Array.isArray(created.data)?created.data[0]:created.data;
}
