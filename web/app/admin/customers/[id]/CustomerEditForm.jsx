'use client'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

export default function CustomerEditForm({customer}){
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [form,setForm]=useState({
    name:customer.full_name||customer.name||'',
    phone:customer.phone||'',
    email:customer.email||'',
    status:customer.status||'confirmed',
    internal_notes:customer.internal_notes||'',
    client_notes:customer.client_notes||''
  });
  async function save(e){
    e.preventDefault();
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/customers/${customer.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setMessage(data.details||data.error||'Не удалось сохранить клиента');setBusy(false);return}
      setMessage('Клиент обновлён');
      router.refresh();
    }catch(err){setMessage('Не удалось сохранить клиента')}
    setBusy(false);
  }
  async function remove(){
    const ok=window.confirm('Удалить клиента? Его автомобили будут удалены, а заявки останутся, но будут отвязаны от клиента.');
    if(!ok)return;
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/customers/${customer.id}`,{method:'DELETE'});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setMessage(data.details||data.error||'Не удалось удалить клиента');setBusy(false);return}
      router.push('/admin');
      router.refresh();
    }catch(err){setMessage('Не удалось удалить клиента')}
    setBusy(false);
  }
  return <form className="form" onSubmit={save}>
    {message&&<p className="notice">{message}</p>}
    <input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Имя клиента"/>
    <input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Телефон"/>
    <input className="input" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email"/>
    <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
      <option value="confirmed">confirmed</option>
      <option value="inactive">inactive</option>
    </select>
    <textarea className="input" value={form.internal_notes} onChange={e=>setForm({...form,internal_notes:e.target.value})} placeholder="Внутренние заметки менеджера"/>
    <textarea className="input" value={form.client_notes} onChange={e=>setForm({...form,client_notes:e.target.value})} placeholder="Заметки по клиенту"/>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <button className="btn primary" disabled={busy}>{busy?'Сохраняем...':'Сохранить клиента'}</button>
      <button type="button" className="btn danger" onClick={remove} disabled={busy}>Удалить клиента</button>
    </div>
  </form>
}