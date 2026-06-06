'use client'
import {useEffect,useState} from 'react'
import {parts} from '../../data'

export default function CartClient(){
 const [items,setItems]=useState([]);
 const [mode,setMode]=useState('part');
 const [message,setMessage]=useState('');
 const [form,setForm]=useState({name:'',phone:'',car:'',vin:'',comment:''});
 useEffect(()=>{setItems(JSON.parse(localStorage.getItem('cart')||'[]'))},[]);
 function save(v){setItems(v);localStorage.setItem('cart',JSON.stringify(v))}
 const rows=items.map(i=>({...i,part:parts.find(p=>p.sku===i.sku)})).filter(r=>r.part);
 const total=rows.reduce((s,r)=>s+Number(String(r.part.price).replace(/\D/g,''))*r.qty,0);
 function upd(sku,qty){if(qty<1)save(items.filter(i=>i.sku!==sku));else save(items.map(i=>i.sku===sku?{...i,qty}:i))}
 async function checkout(e){
  e.preventDefault();
  const text=rows.map(r=>`${r.part.name} ${r.sku} x${r.qty}`).join('\n');
  const requestText=`${mode==='install'?'Записать на установку с деталями':'Заказ запчастей'}:\n${text}\nОриентировочно клиенту: ${total} ₽\nКомментарий: ${form.comment||'нет'}`;
  const r=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:mode==='install'?'installation':'part',source:'parts_selection',name:form.name,phone:form.phone,car:form.car,vin:form.vin,text:requestText,request_text:requestText,client_price:`${total} ₽`,raw_items:rows.map(r=>({sku:r.sku,qty:r.qty,name:r.part.name,price:r.part.price}))})});
  const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
  if(data.ok){setMessage('Заявка по подбору отправлена. Менеджер свяжется с вами.');save([]);setForm({name:'',phone:'',car:'',vin:'',comment:''});return}
  setMessage(data.error||'Не удалось отправить заявку');
 }
 return <><section className="hero"><span className="badge">Мой подбор</span><h1>Подбор деталей</h1><p>Это не онлайн-оплата. Здесь собраны детали для заявки менеджеру: он проверит наличие, цену и возможность установки.</p></section>{message&&<p className="notice">{message}</p>}{!rows.length&&<section className="section card emptyState"><h2>Список подбора пуст</h2><p className="muted">Добавьте запчасти из каталога или проверьте наличие по артикулу.</p><a className="btn primary" href="/parts">Открыть каталог</a> <a className="btn" href="/availability">Проверить наличие</a></section>}{rows.length>0&&<div className="section split"><section>{rows.map(r=><article className="card" key={r.sku}><h2>{r.part.name}</h2><p className="muted">{r.sku} · {r.part.price}</p><p>Количество: <button className="btn" onClick={()=>upd(r.sku,r.qty-1)}>-</button> <b>{r.qty}</b> <button className="btn" onClick={()=>upd(r.sku,r.qty+1)}>+</button></p></article>)}</section><aside className="card"><h2>Заявка по подбору</h2><p className="total">{total} ₽</p><p className="muted">Финальная цена и наличие подтверждаются менеджером. Подбор в localStorage используется только как черновик интерфейса, не как база заявок.</p><form className="form" onSubmit={checkout}><select value={mode} onChange={e=>setMode(e.target.value)}><option value="part">Заказать запчасти</option><option value="install">Записаться на установку</option></select><input className="input" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Имя"/><input className="input" required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Телефон"/><input className="input" value={form.car} onChange={e=>setForm({...form,car:e.target.value})} placeholder="Автомобиль / год / двигатель"/><input className="input" value={form.vin} onChange={e=>setForm({...form,vin:e.target.value})} placeholder="VIN, если есть"/><textarea className="input" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} placeholder="Комментарий"/><button className="btn primary">Отправить заявку</button></form></aside></div>}</>}
