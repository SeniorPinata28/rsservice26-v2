'use client'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

export default function CustomerVehicleForm({customerId}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [form,setForm]=useState({brand:'',model:'',year:'',vin:'',plate_number:'',mileage:'',car_text:''});
  async function submit(e){
    e.preventDefault();
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/customers/${customerId}/vehicles`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setMessage(data.details||data.error||'Не удалось добавить автомобиль');setBusy(false);return}
      setMessage('Автомобиль добавлен');
      setForm({brand:'',model:'',year:'',vin:'',plate_number:'',mileage:'',car_text:''});
      router.refresh();
    }catch(err){setMessage('Не удалось добавить автомобиль')}
    setBusy(false);
  }
  return <form className="form" onSubmit={submit}>
    {message&&<p className="notice">{message}</p>}
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
