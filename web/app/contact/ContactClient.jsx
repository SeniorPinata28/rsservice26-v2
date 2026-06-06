'use client'
import {useEffect,useState} from 'react'

function detectType(text){
 const s=String(text||'').toLowerCase();
 if(s.includes('записать на установку'))return 'installation_booking';
 if(s.includes('заказать запчасть'))return 'parts_order';
 if(s.includes('подбор')||s.includes('vin'))return 'parts_selection_request';
 return 'general_callback';
}

export default function ContactClient(){
 const [ok,setOk]=useState(false);const [error,setError]=useState('');const [draft,setDraft]=useState('');const [name,setName]=useState('');const [phone,setPhone]=useState('');
 useEffect(()=>{setDraft(sessionStorage.getItem('orderDraft')||'')},[]);
 async function submit(e){
  e.preventDefault();setError('');
  const text=draft||'Вопрос менеджеру';
  const type=detectType(text);
  try{
   const r=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,source:'contact',name,phone,car:'',text,request_text:text})});
   const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
   if(!data.ok){setError(data.error||'Не удалось отправить вопрос');return}
   sessionStorage.removeItem('orderDraft');setOk(true);
  }catch(err){setError('Не удалось отправить вопрос')}
 }
 return <><section className="hero contactHero"><span className="badge">Контакты</span><h1>Контакты RSService26</h1><p>Адрес, телефоны и быстрый вопрос менеджеру. Для записи на сервис используйте отдельный раздел “Записаться”.</p></section><section className="section contactGrid"><aside className="card"><h2>Связь и адрес</h2><p><b>Адрес:</b><br/>Ставрополь, просп. Кулакова, 18Д</p><p><b>Телефоны:</b><br/><a href="tel:+79679677042">+7 (967) 967-70-42</a><br/><a href="tel:+79624494455">+7 (962) 449-44-55</a></p><p><b>График:</b><br/>ежедневно 9:00–20:00</p><div className="cardActions"><a className="btn primary" href="/booking">Записаться на сервис</a><a className="btn" href="/availability">Проверить запчасть</a></div></aside><section className="card"><h2>{draft?'Отправить заявку менеджеру':'Задать вопрос менеджеру'}</h2>{error&&<p className="notice">{error}</p>}{ok?<div className="successBox"><h2>Заявка отправлена</h2><p className="muted">Менеджер получит обращение и свяжется с вами.</p><button className="btn primary" onClick={()=>{setOk(false);setDraft('');setName('');setPhone('')}}>Отправить ещё вопрос</button></div>:<form className="form" onSubmit={submit}><input className="input" required value={name} onChange={e=>setName(e.target.value)} placeholder="Имя"/><input className="input" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Телефон"/><textarea className="input" required value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Ваш вопрос"/><button className="btn primary">Отправить заявку</button></form>}</section></section></>}
