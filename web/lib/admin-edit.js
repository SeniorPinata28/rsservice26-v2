import {db,getCustomer,getLead,getVehicle,normalizePhone,updateLead} from './db.js';

function trimOrNull(value){const text=String(value||'').trim();return text||null}
function numberOrNull(value){const n=Number(String(value||'').replace(',','.'));return Number.isFinite(n)&&String(value||'').trim()!==''?n:null}
function cleanPatch(obj){return Object.fromEntries(Object.entries(obj).filter(([,v])=>v!==undefined))}

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

export async function updateCustomerDetails(id,data={}){
  const customer=await getCustomer(id);
  if(!customer)throw new Error('Клиент не найден');
  const patch=cleanPatch({
    full_name:trimOrNull(data.full_name||data.name),
    name:trimOrNull(data.name||data.full_name),
    phone:normalizePhone(data.phone)||null,
    email:trimOrNull(data.email),
    internal_notes:trimOrNull(data.internal_notes),
    client_notes:trimOrNull(data.client_notes),
    status:trimOrNull(data.status)||'confirmed'
  });
  const r=await db('customers?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{Prefer:'return=representation'},body:patch});
  if(!r.ok)throw new Error('Не удалось обновить клиента: '+JSON.stringify(r.error||r.data||r.status));
  return Array.isArray(r.data)?r.data[0]:r.data;
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
