import {db,getCustomer,getLead,getVehicle,normalizePhone,updateLead} from './db.js';

function trimOrNull(value){const text=String(value||'').trim();return text||null}
function numberOrNull(value){const n=Number(String(value||'').replace(',','.'));return Number.isFinite(n)&&String(value||'').trim()!==''?n:null}
function cleanPatch(obj){return Object.fromEntries(Object.entries(obj).filter(([,v])=>v!==undefined&&v!==null&&v!==''))}

export async function updateLeadDetails(id,data={}){
  const lead=await getLead(id);
  if(!lead)throw new Error('Заявка не найдена');
  const raw={...(lead.raw_payload||{}),admin_edited_at:new Date().toISOString()};
  const patch=cleanPatch({
    name:trimOrNull(data.name),
    phone:normalizePhone(data.phone)||null,
    car_text:trimOrNull(data.car_text||data.car),
    vin:trimOrNull(data.vin),
    mileage:numberOrNull(data.mileage),
    request_text:trimOrNull(data.request_text||data.text),
    raw_payload:raw
  });
  return updateLead(id,patch);
}

export async function deleteLeadAdmin(id){
  const lead=await getLead(id);
  if(!lead)throw new Error('Заявка не найдена');
  const deleted=await db('leads?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
  if(!deleted.ok)throw new Error('Не удалось удалить заявку: '+JSON.stringify(deleted.error||deleted.data||deleted.status));
  return {id};
}

async function patchCustomerVariant(id,body){
  const r=await db('customers?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=representation'},body});
  if(!r.ok)return {ok:false,error:r.error||r.data||r.status};
  return {ok:true,customer:Array.isArray(r.data)?r.data[0]:r.data};
}

export async function updateCustomerDetails(id,data={}){
  const customer=await getCustomer(id);
  if(!customer)throw new Error('Клиент не найден');
  const fullName=trimOrNull(data.full_name||data.name);
  const phone=normalizePhone(data.phone)||null;
  const email=trimOrNull(data.email);
  const internalNotes=trimOrNull(data.internal_notes);
  const clientNotes=trimOrNull(data.client_notes);
  const status=trimOrNull(data.status)||'confirmed';
  const variants=[
    {full_name:fullName,phone,email,status,internal_notes:internalNotes,client_notes:clientNotes},
    {full_name:fullName,phone,email,status,internal_notes:internalNotes},
    {full_name:fullName,phone,email,status},
    {full_name:fullName,phone,status},
    {full_name:fullName,phone},
    {name:fullName,phone,email,status,internal_notes:internalNotes,client_notes:clientNotes},
    {name:fullName,phone,email,status},
    {name:fullName,phone,status},
    {phone,email,status,internal_notes:internalNotes,client_notes:clientNotes},
    {phone,email,status},
    {phone,status},
    {phone}
  ];
  let lastError=null;
  for(const body of variants){
    const patch=cleanPatch(body);
    if(Object.keys(patch).length===0)continue;
    const attempt=await patchCustomerVariant(id,patch);
    if(attempt.ok)return attempt.customer;
    lastError=attempt.error;
  }
  throw new Error('Не удалось обновить клиента: '+JSON.stringify(lastError));
}

export async function deleteCustomerAdmin(id){
  const customer=await getCustomer(id);
  if(!customer)throw new Error('Клиент не найден');
  await db('leads?customer_id=eq.'+encodeURIComponent(id),{method:'PATCH',body:{customer_id:null,vehicle_id:null}}).catch(()=>null);
  await db('vehicles?customer_id=eq.'+encodeURIComponent(id),{method:'DELETE'}).catch(()=>null);
  const deleted=await db('customers?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
  if(!deleted.ok)throw new Error('Не удалось удалить клиента: '+JSON.stringify(deleted.error||deleted.data||deleted.status));
  return {id};
}

export async function updateVehicleDetails(id,data={}){
  const vehicle=await getVehicle(id);
  if(!vehicle)throw new Error('Автомобиль не найден');
  const plate=trimOrNull(data.plate_number||data.license_plate||data.gos_number);
  const vin=trimOrNull(data.vin);
  const mileage=numberOrNull(data.mileage);
  const notes=[plate?`Госномер: ${plate}`:null,vin?`VIN: ${vin}`:null,mileage?`Пробег: ${mileage}`:null,trimOrNull(data.notes)].filter(Boolean).join('\n')||null;
  const carText=trimOrNull(data.car_text)||[trimOrNull(data.brand),trimOrNull(data.model),trimOrNull(data.year)].filter(Boolean).join(' ')||vin||vehicle.car_text||'Автомобиль клиента';
  const variants=[
    {car_text:carText,brand:trimOrNull(data.brand),model:trimOrNull(data.model),year:numberOrNull(data.year),vin,plate_number:plate,license_plate:plate,mileage,notes},
    {car_text:carText,brand:trimOrNull(data.brand),model:trimOrNull(data.model),year:numberOrNull(data.year),vin,plate_number:plate,mileage,notes},
    {car_text:carText,brand:trimOrNull(data.brand),model:trimOrNull(data.model),vin,mileage,notes},
    {car_text:carText,vin,mileage,notes},
    {car_text:carText,vin,notes},
    {car_text:carText}
  ];
  let lastError=null;
  for(const body of variants){
    const patch=cleanPatch(Object.fromEntries(Object.entries(body).filter(([,v])=>v!==null&&v!=='')));
    const r=await db('vehicles?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=representation'},body:patch});
    if(r.ok)return Array.isArray(r.data)?r.data[0]:r.data;
    lastError=r.error||r.data||r.status;
  }
  throw new Error('Не удалось обновить автомобиль: '+JSON.stringify(lastError));
}

export async function deleteVehicleAdmin(id){
  const vehicle=await getVehicle(id);
  if(!vehicle)throw new Error('Автомобиль не найден');
  await db('leads?vehicle_id=eq.'+encodeURIComponent(id),{method:'PATCH',body:{vehicle_id:null}}).catch(()=>null);
  const deleted=await db('vehicles?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
  if(!deleted.ok)throw new Error('Не удалось удалить автомобиль: '+JSON.stringify(deleted.error||deleted.data||deleted.status));
  return {id,customer_id:vehicle.customer_id||null};
}
