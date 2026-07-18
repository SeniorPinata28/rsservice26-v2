'use client'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

export default function CustomerCabinetAccessForm({customer}){
  const router=useRouter();
  const [enabled,setEnabled]=useState(customer.cabinet_enabled===true);
  const [password,setPassword]=useState('');
  const [mustChange,setMustChange]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function save(e){
    e.preventDefault();setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/customers/${customer.id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cabinet_access',enabled,password,must_change_password:mustChange})});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setMessage(data.error||'Не удалось обновить доступ');return}
      setPassword('');setMessage(enabled?'Доступ в кабинет включён':'Доступ в кабинет отключён');router.refresh();
    }catch(e){setMessage('Не удалось обновить доступ')}finally{setBusy(false)}
  }
  return <form className="form" onSubmit={save}>
    {message&&<p className="notice">{message}</p>}
    <label className="toggleRow"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/><span><b>Разрешить вход в кабинет</b><small>Клиент сможет войти только после включения доступа менеджером.</small></span></label>
    <input className="input" type="password" minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder={customer.has_password?'Новый пароль — только для сброса':'Временный пароль, минимум 8 символов'}/>
    <label className="toggleRow"><input type="checkbox" checked={mustChange} onChange={e=>setMustChange(e.target.checked)}/><span><b>Попросить сменить пароль</b><small>Рекомендуется при создании и каждом сбросе временного пароля.</small></span></label>
    <p className="muted">Текущий пароль никогда не отображается. Менеджер может только задать новый.</p>
    <button className="btn primary" disabled={busy}>{busy?'Сохраняем...':'Сохранить доступ'}</button>
  </form>
}
