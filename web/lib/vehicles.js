import {db,getCustomer} from './db.js';

const REQUIRED_VEHICLE_FIELDS=['customer_id','car_text','brand','model','year','vin','plate_number','mileage','notes','raw_payload'];

function trimOrNull(value){const text=String(value||'').trim();return text||null}
function numberOrNull(value){const n=Number(value);return Number.isFinite(n)&&String(value).trim()!==''?n:null}
function vehicleCarText(data){
  const direct=trimOrNull(data.car_text);
  const brand=trimOrNull(data.brand||data.make);
  const model=trimOrNull(data.model);
  const year=trimOrNull(data.year);
  const vin=trimOrNull(data.vin);
  const plateNumber=trimOrNull(data.plate_number||data.license_plate||data.gos_number);
  const base=direct||[brand,model,year].filter(Boolean).join(' ')||vin||'Автомобиль клиента';
  return plateNumber?`${base} · госномер ${plateNumber}`:base;
}
function vehicleNotes(data){
  const items=[];
  const carText=vehicleCarText(data);
  const plateNumber=trimOrNull(data.plate_number||data.license_plate||data.gos_number);
  const vin=trimOrNull(data.vin);
  const mileage=trimOrNull(data.mileage);
  if(carText)items.push(`Автомобиль: ${carText}`);
  if(plateNumber)items.push(`Госномер: ${plateNumber}`);
  if(vin)items.push(`VIN: ${vin}`);
  if(mileage)items.push(`Пробег: ${mileage}`);
  return items.join('\n')||null;
}
function isSchemaError(error){
  const message=JSON.stringify(error||'');
  return message.includes('PGRST204')||message.includes('schema cache')||message.includes('Could not find the');
}
function schemaMessage(error){
  return 'Схема таблицы vehicles не готова. Примените supabase/vehicles_admin_fields.sql в Supabase SQL Editor. Детали: '+JSON.stringify(error);
}

export async function createVehicleForCustomerSafe(customerId,data={}){
  const customer=await getCustomer(customerId);
  if(!customer)throw new Error('Клиент не найден');
  const brand=trimOrNull(data.brand||data.make);
  const model=trimOrNull(data.model);
  const year=numberOrNull(data.year);
  const vin=trimOrNull(data.vin);
  const plateNumber=trimOrNull(data.plate_number||data.license_plate||data.gos_number);
  const mileage=numberOrNull(data.mileage);
  const carText=vehicleCarText(data);
  const notes=vehicleNotes(data);
  if(!carText&&!vin)throw new Error('Укажите автомобиль или VIN');
  const body={
    customer_id:customerId,
    car_text:carText,
    brand,
    model,
    year,
    vin,
    plate_number:plateNumber,
    mileage,
    notes,
    raw_payload:{...data,car_text:carText,notes,source:'admin_customer_vehicle'}
  };
  const clean=Object.fromEntries(Object.entries(body).filter(([,v])=>v!==undefined&&v!==null&&v!==''));
  const created=await db('vehicles',{method:'POST',headers:{Prefer:'return=representation'},body:[clean]});
  if(!created.ok){
    if(isSchemaError(created.error||created.data))throw new Error(schemaMessage(created.error||created.data));
    throw new Error('Не удалось создать автомобиль: '+JSON.stringify(created.error||created.data||created.status));
  }
  const vehicle=Array.isArray(created.data)?created.data[0]:created.data;
  const missingSaved=REQUIRED_VEHICLE_FIELDS.filter(field=>clean[field]!==undefined&&vehicle&&vehicle[field]===undefined);
  if(missingSaved.length)throw new Error('Автомобиль сохранён неполно. Не найдены поля в ответе Supabase: '+missingSaved.join(', '));
  return {vehicle,customer};
}
