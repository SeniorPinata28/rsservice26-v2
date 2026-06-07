'use client'
import {useState} from 'react'

export default function BookingClient(){
 const [ok,setOk]=useState(false);const [error,setError]=useState('');const [name,setName]=useState('');const [phone,setPhone]=useState('');const [car,setCar]=useState('');const [service,setService]=useState('');const [date,setDate]=useState('');const [comment,setComment]=useState('');
 async function submit(e){
  e.preventDefault();setError('');
  const text=`Запись на сервис:\nУслуга: ${service}\nАвтомобиль: ${car}\nЖелаемая дата: ${date||'уточнить'}\nКомментарий: ${comment||'нет'}`;
  try{
   const r=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'service_booking',source:'booking',name,phone,car,text,request_text:text,preferred_date:date,symptoms_list:service,comment})});
   const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
   if(!data.ok){setError(data.error||'Не удалось отправить заявку');return}
   setOk(true);
  }catch(err){setError('Не удалось отправить заявку')}
 }
 return <><section className="hero contactHero"><span className="badge">Запись на сервис</span><h1>Записаться на ремонт или диагностику</h1><p>Оставьте данные. Менеджер подтвердит время, стоимость и необходимость запчастей.</p></section><section className="section contactGrid"><aside className="card"><h2>Что будет дальше</h2><div className="steps"><p><b>1.</b> Мы получим заявку.</p><p><b>2.</b> Уточним симптомы, автомобиль и удобное время.</p><p><b>3.</b> Согласуем работы и запчасти до визита.</p></div><p className="muted">Если нужна только деталь без сервиса — используйте проверку наличия или каталог.</p><a className="btn" href="/availability">Проверить запчасть</a></aside><section className="card">{error&&<p className="notice">{error}</p>}{ok?<div className="successBox"><h2>Заявка на сервис отправлена</h2><p className="muted">Менеджер свяжется с вами для подтверждения записи.</p><button className="btn primary" onClick={()=>{setOk(false);setName('');setPhone('');setCar('');setService('');setDate('');setComment('')}}>Создать ещё одну</button></div>:<form className="form" onSubmit={submit}><input className="input" required value={name} onChange={e=>setName(e.target.value)} placeholder="Имя"/><input className="input" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Телефон"/><input className="input" required value={car} onChange={e=>setCar(e.target.value)} placeholder="Автомобиль / год / двигатель"/><input className="input" required value={service} onChange={e=>setService(e.target.value)} placeholder="Что нужно сделать?"/><input className="input" value={date} onChange={e=>setDate(e.target.value)} placeholder="Желаемая дата / время"/><textarea className="input" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Комментарий, симптомы, пожелания"/><button className="btn primary">Отправить заявку на сервис</button></form>}</section></section></>}
