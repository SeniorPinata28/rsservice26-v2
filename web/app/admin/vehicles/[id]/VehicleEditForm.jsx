'use client'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

function value(v){return v===undefined||v===null?'':String(v)}
function noteValue(notes,label){return String(notes||'').match(new RegExp(label+':\\s*([^\\n]+)','i'))?.[1]||''}

export default function VehicleEditForm({vehicle}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [form,setForm]=useState({
    car_text:value(vehicle.car_text),
    brand:value(vehicle.brand||vehicle.make),
    model:value(vehicle.model),
    year:value(vehicle.year),
    vin:value(vehicle.vin||noteValue(vehicle.notes,'VIN')),
    plate_number:value(vehicle.plate_number||vehicle.license_plate||noteValue(vehicle.notes,'Госномер')),
    mileage:value(vehicle.mileage||noteValue(vehicle.notes,'Пробег'))
  });
  async function submit(e){
    e.preventDefault();
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/vehicles/${vehicle.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setMessage(data.details||data.error||'Не удалось обновить автомобиль');setBusy(false);return}
      setMessage('Данные автомобиля обновлены');
      router.refresh();
    }catch(err){setMessage('Не удалось обновить автомобиль')}
    setBusy(false);
  }
  async function remove(){
    const ok=window.confirm('Удалить автомобиль? Связанные заявки останутся, но будут отвязаны от автомобиля.');
    if(!ok)return;
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/vehicles/${vehicle.id}`,{method:'DELETE'});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setMessage(data.details||data.error||'Не удалось удалить автомобиль');setBusy(false);return}
      const customerId=data?.result?.customer_id;
      router.push(customerId?`/admin/customers/${customerId}`:'/admin');
      router.refresh();
    }catch(err){setMessage('Не удалось удалить автомобиль')}
    setBusy(false);
  }
  return <form className="form" onSubmit={submit}>
    {message&&<p className="notice">{message}</p>}
    <input className="input" value={form.car_text} onChange={e=>setForm({...form,car_text:e.target.value})} placeholder="Автомобиль одной строкой, если удобнее"/>
    <div className="split" style={{gridTemplateColumns:'1fr 1fr',gap:12}}>
      <input className="input" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} placeholder="Марка"/>
      <input className="input" value={form.model} onChange={e=>setForm({...form,model:e.target.value})} placeholder="Модель"/>
    </div>
    <div className="split" style={{gridTemplateColumns:'1fr 1fr',gap:12}}>
      <input className="input" value={form.year} onChange={e=>setForm({...form,year:e.target.value})} placeholder="Год" inputMode="numeric"/>
      <input className="input" value={form.mileage} onChange={e=>setForm({...form,mileage:e.target.value})} placeholder="Пробег" inputMode="numeric"/>
    </div>
    <input className="input" value={form.vin} onChange={e=>setForm({...form,vin:e.target.value})} placeholder="VIN"/>
    <input className="input" value={form.plate_number} onChange={e=>setForm({...form,plate_number:e.target.value})} placeholder="Госномер"/>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <button className="btn primary" disabled={busy}>{busy?'Сохраняем...':'Сохранить изменения'}</button>
      <button type="button" className="btn danger" onClick={remove} disabled={busy}>Удалить автомобиль</button>
    </div>
  </form>
}
