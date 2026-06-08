import {db,getVehicle} from './db.js';

function trimOrNull(value){const text=String(value||'').trim();return text||null}
function numberOrNull(value){const n=Number(String(value||'').replace(',','.'));return Number.isFinite(n)&&String(value||'').trim()!==''?n:null}
function dateOrNow(value){
  const text=String(value||'').trim();
  if(!text)return new Date().toISOString();
  const date=new Date(text);
  if(Number.isNaN(date.getTime()))return new Date().toISOString();
  return date.toISOString();
}

async function createServiceHistoryVariant(body){
  const created=await db('service_history',{method:'POST',headers:{Prefer:'return=representation'},body:[body]});
  if(!created.ok)return {ok:false,error:created.error||created.data||created.status};
  return {ok:true,item:Array.isArray(created.data)?created.data[0]:created.data};
}

export async function createServiceHistoryForVehicle(vehicleId,data={}){
  const vehicle=await getVehicle(vehicleId);
  if(!vehicle)throw new Error('Автомобиль не найден');
  const title=trimOrNull(data.title||data.service_name);
  if(!title)throw new Error('Укажите название работы');
  const description=trimOrNull(data.description||data.comment);
  const serviceDate=dateOrNow(data.service_date||data.date);
  const mileage=numberOrNull(data.mileage);
  const price=numberOrNull(data.price||data.total);
  const rawPayload={...data,comment:trimOrNull(data.comment),source:'admin_vehicle_service_history'};
  const base={
    vehicle_id:vehicle.id,
    customer_id:vehicle.customer_id||null,
    service_date:serviceDate,
    title,
    description,
    mileage,
    price,
    raw_payload:rawPayload
  };
  const variants=[
    base,
    {vehicle_id:vehicle.id,customer_id:vehicle.customer_id||null,service_date:serviceDate,title,description,mileage,price},
    {vehicle_id:vehicle.id,service_date:serviceDate,title,description,mileage,price},
    {vehicle_id:vehicle.id,service_date:serviceDate,title,description,mileage},
    {vehicle_id:vehicle.id,title,description,mileage},
    {vehicle_id:vehicle.id,title,description},
    {vehicle_id:vehicle.id,title}
  ];
  let lastError=null;
  for(const body of variants){
    const clean=Object.fromEntries(Object.entries(body).filter(([,v])=>v!==undefined));
    const attempt=await createServiceHistoryVariant(clean);
    if(attempt.ok)return {history:attempt.item,vehicle};
    lastError=attempt.error;
  }
  throw new Error('Не удалось создать запись обслуживания: '+JSON.stringify(lastError));
}
