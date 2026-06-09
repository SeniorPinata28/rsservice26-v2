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
  const [step,setStep]=useState('phone')
  const [phone,setPhone]=useState('')
  const [code,setCode]=useState('')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  async function requestCode(e){
    if(e)e.preventDefault()
    setBusy(true);setMessage('')
    try{
      const r=await fetch('/api/cabinet/request-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:cleanPhone(phone)})})
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}))
      if(!data.ok){setMessage(data.retryAfter?`Повторите через ${data.retryAfter} сек.`:(data.error||'Не удалось отправить код'));return}
      setMessage('Код отправлен. Введите его для входа.');setStep('code')
    }catch(err){setMessage('Не удалось отправить код')}
    finally{setBusy(false)}
  }

  async function login(e){
    e.preventDefault();setBusy(true);setMessage('')
    try{
      const r=await fetch('/api/cabinet/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:cleanPhone(phone),code})})
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}))
      if(!data.ok){setMessage(data.error||'Не удалось войти');return}
      router.replace('/cabinet');router.refresh()
    }catch(err){setMessage('Не удалось войти')}
    finally{setBusy(false)}
  }

  return <section className="section split">
    <aside className="card"><span className="badge">Личный кабинет</span><h1>Вход клиента</h1><p className="muted">Введите телефон, который вы оставляли в RSService26.</p></aside>
    <section className="card">
      {step==='phone'&&<form className="form" onSubmit={requestCode}><h2>Получить код</h2>{message&&<p className="notice">{message}</p>}<input className="input" required value={phone} onChange={e=>setPhone(formatPhone(e.target.value))} placeholder="+7 (999) 999-99-99" inputMode="tel"/><button className="btn primary" disabled={busy}>{busy?'Отправляем...':'Получить код'}</button></form>}
      {step==='code'&&<form className="form" onSubmit={login}><h2>Введите код</h2>{message&&<p className="notice">{message}</p>}<input className="input" required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-значный код" inputMode="numeric" maxLength={6}/><button className="btn primary" disabled={busy}>{busy?'Проверяем...':'Войти'}</button><button type="button" className="btn" disabled={busy} onClick={requestCode}>Отправить код повторно</button><button type="button" className="btn" disabled={busy} onClick={()=>setStep('phone')}>Изменить телефон</button></form>}
    </section>
  </section>
}
