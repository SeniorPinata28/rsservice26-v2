'use client'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

function cleanPhone(value){
  const digits=String(value||'').replace(/\D/g,'').slice(0,11)
  if(!digits)return ''
  if(digits.startsWith('8'))return '7'+digits.slice(1)
  if(digits.startsWith('7'))return digits
  return '7'+digits
}
function formatPhone(value){
  const d=cleanPhone(value).slice(1)
  const a=d.slice(0,3),b=d.slice(3,6),c=d.slice(6,8),f=d.slice(8,10)
  let out='+7'
  if(a)out+=' ('+a
  if(a.length===3)out+=')'
  if(b)out+=' '+b
  if(c)out+='-'+c
  if(f)out+='-'+f
  return out
}
export default function CabinetLoginClient(){
  const router=useRouter()
  const [phone,setPhone]=useState('')
  const [password,setPassword]=useState('')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  async function login(e){
    e.preventDefault();setBusy(true);setMessage('')
    try{
      const r=await fetch('/api/cabinet/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:cleanPhone(phone),password})})
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}))
      if(!data.ok){
        if(r.status===429){
          const minutes=Math.max(1,Math.ceil(Number(data.retryAfter||60)/60))
          setMessage(`Слишком много попыток. Подождите ${minutes} мин. и попробуйте снова.`)
        }else setMessage(data.error||'Не удалось войти')
        return
      }
      router.replace('/cabinet');router.refresh()
    }catch(err){setMessage('Не удалось войти')}
    finally{setBusy(false)}
  }

  return <section className="section split cabinetLogin">
    <aside className="card"><span className="badge">Личный кабинет</span><h1>Вход клиента</h1><p className="muted">Доступ создаёт менеджер RSService26. Используйте номер телефона и выданный пароль.</p></aside>
    <section className="card"><form className="form" onSubmit={login}><h2>Войти в кабинет</h2>{message&&<p className="notice" role="alert" aria-live="polite">{message}</p>}<input className="input" required value={phone} onChange={e=>setPhone(formatPhone(e.target.value))} placeholder="+7 (999) 999-99-99" inputMode="tel" autoComplete="tel"/><input className="input" required type="password" minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Пароль" autoComplete="current-password"/><button className="btn primary" disabled={busy}>{busy?'Проверяем...':'Войти'}</button><p className="muted">Забыли пароль? Обратитесь к менеджеру — он задаст новый временный пароль.</p></form></section>
  </section>
}
