'use client'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

export default function LeadEditForm({lead}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [form,setForm]=useState({
    name:lead.name||'',
    phone:lead.phone||'',
    car_text:lead.car_text||'',
    vin:lead.vin||'',
    mileage:lead.mileage||'',
    request_text:lead.request_text||''
  });

  async function save(e){
    e.preventDefault();
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/leads/${lead.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'edit',...form})});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setMessage(data.details||data.error||'Не удалось сохранить заявку');setBusy(false);return}
      setMessage('Заявка обновлена');
      router.refresh();
    }catch(err){setMessage('Не удалось сохранить заявку')}
    setBusy(false);
  }

  async function remove(){
    const ok=window.confirm('Удалить эту заявку? Действие нельзя отменить.');
    if(!ok)return;
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/leads/${lead.id}`,{method:'DELETE'});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setMessage(data.details||data.error||'Не удалось удалить заявку');setBusy(false);return}
      router.push('/admin');
      router.refresh();
    }catch(err){setMessage('Не удалось удалить заявку')}
    setBusy(false);
  }

  return <form className="form" onSubmit={save}>
    {message&&<p className="notice">{message}</p>}
    <input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Имя"/>
    <input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Телефон"/>
    <input className="input" value={form.car_text} onChange={e=>setForm({...form,car_text:e.target.value})} placeholder="Автомобиль"/>
    <input className="input" value={form.vin} onChange={e=>setForm({...form,vin:e.target.value})} placeholder="VIN"/>
    <input className="input" value={form.mileage} onChange={e=>setForm({...form,mileage:e.target.value})} placeholder="Пробег" inputMode="numeric"/>
    <textarea className="input" value={form.request_text} onChange={e=>setForm({...form,request_text:e.target.value})} placeholder="Текст заявки"/>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <button className="btn primary" disabled={busy}>{busy?'Сохраняем...':'Сохранить изменения'}</button>
      <button type="button" className="btn danger" onClick={remove} disabled={busy}>Удалить заявку</button>
    </div>
  </form>
}
