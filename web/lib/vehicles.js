import {db,getCustomer} from './db.js';

function trimOrNull(value){const text=String(value||'').trim();return text||null}
function numberOrNull(value){const n=Number(value);return Number.isFinite(n)&&String(value).trim()!==''?n:null}
function vehicleCarText(data){return trimOrNull(data.car_text)||[trimOrNull(data.brand),trimOrNull(data.model),trimOrNull(data.year)].filter(Boolean).join(' ')||trimOrNull(data.vin)||'Автомобиль клиента'}

async function createVehicleVariant(body){
  const created=await db('vehicles',{method:'POST',headers:{Prefer:'return=representation'},body:[body]});
  if(!created.ok)return {ok:false,error:created.error||created.data||created.status};
  return {ok:true,vehicle:Array.isArray(created.data)?created.data[0]:created.data};
}

export async function createVehicleForCustomerSafe(customerId,data={}){
  const customer=await getCustomer(customerId);
  if(!customer)throw new Error('Клиент не найден');
  const carText=vehicleCarText(data);
  const brand=trimOrNull(data.brand);
  const model=trimOrNull(data.model);
  const year=numberOrNull(data.year);
  const vin=trimOrNull(data.vin);
  const plateNumber=trimOrNull(data.plate_number||data.license_plate||data.gos_number);
  const mileage=numberOrNull(data.mileage);
  const base={customer_id:customerId,car_text:carText,brand,model,year,vin,plate_number:plateNumber,license_plate:plateNumber,mileage};
  const variants=[
    base,
    {customer_id:customerId,car_text:carText,brand,model,year,vin,plate_number:plateNumber,mileage},
    {customer_id:customerId,car_text:carText,brand,model,year,vin,license_plate:plateNumber,mileage},
    {customer_id:customerId,car_text:carText,brand,model,year,vin,mileage},
    {customer_id:customerId,car_text:carText,brand,model,vin,mileage},
    {customer_id:customerId,car_text:carText,brand,model,vin},
    {customer_id:customerId,car_text:carText,brand,model},
    {customer_id:customerId,car_text:carText,vin,mileage},
    {customer_id:customerId,car_text:carText,vin},
    {customer_id:customerId,car_text:carText},
    {customer_id:customerId,vin},
    {customer_id:customerId}
  ];
  let lastError=null;
  for(const body of variants){
    const clean=Object.fromEntries(Object.entries(body).filter(([,v])=>v!==undefined&&v!==null));
    const attempt=await createVehicleVariant(clean);
    if(attempt.ok)return {vehicle:attempt.vehicle,customer};
    lastError=attempt.error;
  }
  throw new Error('Не удалось создать автомобиль: '+JSON.stringify(lastError));
}
