import {db,getVehicle} from './db.js';

function trimOrNull(value){const text=String(value||'').trim();return text||null}
function numberOrNull(value){const n=Number(value);return Number.isFinite(n)&&String(value).trim()!==''?n:null}
function vehicleCarText(data,current={}){
  const direct=trimOrNull(data.car_text);
  const brand=trimOrNull(data.brand||data.make);
  const model=trimOrNull(data.model);
  const year=trimOrNull(data.year);
  const vin=trimOrNull(data.vin);
  const plate=trimOrNull(data.plate_number||data.license_plate||data.gos_number);
  const base=direct||[brand,model,year].filter(Boolean).join(' ')||current.car_text||vin||current.vin||'Автомобиль клиента';
  return plate&&base&&!base.includes(plate)?`${base} · госномер ${plate}`:base;
}
function vehicleNotes(data,current={}){
  const items=[];
  const plate=trimOrNull(data.plate_number||data.license_plate||data.gos_number);
  const vin=trimOrNull(data.vin);
  const mileage=trimOrNull(data.mileage);
  const carText=vehicleCarText(data,current);
  if(carText)items.push(`Автомобиль: ${carText}`);
  if(plate)items.push(`Госномер: ${plate}`);
  if(vin)items.push(`VIN: ${vin}`);
  if(mileage)items.push(`Пробег: ${mileage}`);
  const existing=trimOrNull(data.notes)||trimOrNull(current.notes);
  return items.join('\n')||existing||null;
}
function isSchemaError(error){const message=JSON.stringify(error||'');return message.includes('PGRST204')||message.includes('schema cache')||message.includes('Could not find the')}
function schemaMessage(error){return 'Схема таблицы vehicles не готова. Примените supabase/vehicles_admin_fields.sql в Supabase SQL Editor. Детали: '+JSON.stringify(error)}

export async function updateVehicleResilient(vehicleId,data={}){
  const current=await getVehicle(vehicleId);
  if(!current)throw new Error('Автомобиль не найден');
  const carText=vehicleCarText(data,current);
  const brand=trimOrNull(data.brand||data.make);
  const model=trimOrNull(data.model);
  const year=numberOrNull(data.year);
  const vin=trimOrNull(data.vin);
  const plate=trimOrNull(data.plate_number||data.license_plate||data.gos_number);
  const mileage=numberOrNull(data.mileage);
  const notes=vehicleNotes(data,current);
  const raw_payload={...(current.raw_payload||{}),...data,car_text:carText,edited_at:new Date().toISOString(),source:'admin_vehicle_edit'};
  const body={car_text:carText,brand,model,year,vin,plate_number:plate,mileage,notes,raw_payload};
  const clean=Object.fromEntries(Object.entries(body).filter(([,v])=>v!==undefined&&v!==null&&v!==''));
  const r=await db('vehicles?id=eq.'+encodeURIComponent(vehicleId),{method:'PATCH',headers:{Prefer:'return=representation'},body:clean});
  if(!r.ok){
    if(isSchemaError(r.error||r.data))throw new Error(schemaMessage(r.error||r.data));
    throw new Error('Не удалось обновить автомобиль: '+JSON.stringify(r.error||r.data||r.status));
  }
  return {vehicle:Array.isArray(r.data)?r.data[0]:r.data};
}
