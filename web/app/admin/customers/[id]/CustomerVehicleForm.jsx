'use client'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

const emptyForm={brand:'',model:'',year:'',vin:'',plate_number:'',mileage:'',car_text:''};

export default function CustomerVehicleForm({customerId}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [createdVehicle,setCreatedVehicle]=useState(null);
  const [form,setForm]=useState(emptyForm);
  async function submit(e){
    e.preventDefault();
    setBusy(true);setMessage('');setCreatedVehicle(null);
    try{
      const r=await fetch(`/api/admin/customers/${customerId}/vehicles`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setMessage(data.details||data.error||'Не удалось добавить автомобиль');setBusy(false);return}
      const vehicle=data?.result?.vehicle||data?.vehicle||null;
      setCreatedVehicle(vehicle);
      setMessage('Автомобиль сохранён в базе. Он появился ниже в списке автомобилей клиента.');
      setForm(emptyForm);
      router.refresh();
    }catch(err){setMessage('Не удалось добавить автомобиль')}
    setBusy(false);
  }
  return <form className="form" onSubmit={submit}>
    {message&&<p className="notice">{message}</p>}
    {createdVehicle?.id&&<p><Link className="btn primary" href={`/admin/vehicles/${createdVehicle.id}`}>Открыть созданный автомобиль</Link></p>}
    <input className="input" value={form.car_text} onChange={e=>setForm({...form,car_text:e.target.value})} placeholder="Автомобиль одной строкой, если удобнее"/>
    <div className="split" style={{gridTemplateColumns:'1fr 1fr',gap:12}}>
      <input className="input" value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})} placeholder="Марка, например Hyundai"/>
      <input className="input" value={form.model} onChange={e=>setForm({...form,model:e.target.value})} placeholder="Модель, например Solaris"/>
    </div>
    <div className="split" style={{gridTemplateColumns:'1fr 1fr',gap:12}}>
      <input className="input" value={form.year} onChange={e=>setForm({...form,year:e.target.value})} placeholder="Год" inputMode="numeric"/>
      <input className="input" value={form.mileage} onChange={e=>setForm({...form,mileage:e.target.value})} placeholder="Пробег" inputMode="numeric"/>
    </div>
    <input className="input" value={form.vin} onChange={e=>setForm({...form,vin:e.target.value})} placeholder="VIN"/>
    <input className="input" value={form.plate_number} onChange={e=>setForm({...form,plate_number:e.target.value})} placeholder="Госномер"/>
    <button className="btn primary" disabled={busy}>{busy?'Сохраняем...':'Добавить автомобиль'}</button>
  </form>
}
