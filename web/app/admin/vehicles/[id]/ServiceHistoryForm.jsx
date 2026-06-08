'use client'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

const emptyForm={service_date:'',title:'',description:'',mileage:'',price:'',comment:''};

export default function ServiceHistoryForm({vehicleId}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [form,setForm]=useState(emptyForm);

  async function submit(e){
    e.preventDefault();
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/vehicles/${vehicleId}/service-history`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setMessage(data.details||data.error||'Не удалось добавить запись обслуживания');setBusy(false);return}
      setMessage('Запись обслуживания добавлена');
      setForm(emptyForm);
      router.refresh();
    }catch(err){setMessage('Не удалось добавить запись обслуживания')}
    setBusy(false);
  }

  return <form className="form" onSubmit={submit}>
    {message&&<p className="notice">{message}</p>}
    <input className="input" value={form.service_date} onChange={e=>setForm({...form,service_date:e.target.value})} placeholder="Дата обслуживания, например 2026-06-08"/>
    <input className="input" required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Название работы, например Замена масла"/>
    <textarea className="input" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Описание работ и деталей"/>
    <div className="split" style={{gridTemplateColumns:'1fr 1fr',gap:12}}>
      <input className="input" value={form.mileage} onChange={e=>setForm({...form,mileage:e.target.value})} placeholder="Пробег" inputMode="numeric"/>
      <input className="input" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="Сумма" inputMode="decimal"/>
    </div>
    <textarea className="input" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} placeholder="Комментарий менеджера"/>
    <button className="btn primary" disabled={busy}>{busy?'Сохраняем...':'Добавить запись обслуживания'}</button>
  </form>
}
