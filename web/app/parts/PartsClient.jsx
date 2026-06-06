'use client'
import Link from 'next/link'
import {useMemo,useState} from 'react'
import {parts} from '../../data'

export default function PartsClient(){
 const [q,setQ]=useState('');
 const [msg,setMsg]=useState('');
 const [selected,setSelected]=useState(null);
 const [form,setForm]=useState({name:'',phone:'',car:'',vin:'',comment:''});
 const list=useMemo(()=>{const s=q.toLowerCase().trim();return !s?parts:parts.filter(p=>(p.name+p.sku+p.compatibility+p.category).toLowerCase().includes(s))},[q]);
 function add(p){const cart=JSON.parse(localStorage.getItem('cart')||'[]');const item=cart.find(x=>x.sku===p.sku);if(item)item.qty+=1;else cart.push({sku:p.sku,qty:1});localStorage.setItem('cart',JSON.stringify(cart));setMsg(`${p.name} добавлен в подбор. Подбор хранится только как черновик на этом устройстве.`)}
 function openRequest(p,mode='part'){setSelected({p,mode});setMsg('')}
 async function submit(e){
  e.preventDefault();
  if(!selected)return;
  const {p,mode}=selected;
  const text=`${mode==='install'?'Записать на установку':'Заказать запчасть'}:\n${p.name}\nАртикул: ${p.sku}\nЦена клиенту: ${p.price}\nСовместимость: ${p.compatibility}\nКомментарий: ${form.comment||'нет'}`;
  const r=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:mode==='install'?'installation':'part',source:'parts_catalog',name:form.name,phone:form.phone,car:form.car,vin:form.vin,text,request_text:text,client_price:p.price,stock:p.stock,raw_part:p})});
  const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
  if(data.ok){setMsg('Заявка отправлена. Менеджер свяжется с вами.');setSelected(null);setForm({name:'',phone:'',car:'',vin:'',comment:''});return}
  setMsg(data.error||'Не удалось отправить заявку');
 }
 return <><section className="hero"><span className="badge">Каталог</span><h1>Популярные запчасти</h1><p>Каталог помогает быстро выбрать позицию. Актуальное наличие и цену лучше проверить по артикулу.</p></section><div className="sectionHead section"><div><h2>Каталог запчастей</h2><p className="muted">Поиск по названию, артикулу, категории или совместимости.</p></div><input className="input" style={{maxWidth:360}} value={q} onChange={e=>setQ(e.target.value)} placeholder="Поиск запчасти"/></div>{msg&&<p className="notice">{msg}</p>}{selected&&<section className="section card"><h2>{selected.mode==='install'?'Заявка на установку':'Заявка на запчасть'}</h2><p className="muted">{selected.p.name} · {selected.p.sku}</p><form className="form" onSubmit={submit}><input className="input" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Имя"/><input className="input" required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Телефон"/><input className="input" value={form.car} onChange={e=>setForm({...form,car:e.target.value})} placeholder="Автомобиль / год / двигатель"/><input className="input" value={form.vin} onChange={e=>setForm({...form,vin:e.target.value})} placeholder="VIN, если есть"/><textarea className="input" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} placeholder="Комментарий менеджеру"/><button className="btn primary">Отправить заявку</button><button type="button" className="btn" onClick={()=>setSelected(null)}>Отмена</button></form></section>}<div className="grid">{list.map(p=><article className="card" key={p.sku}><span className="badge">{p.category}</span><h2>{p.name}</h2><p className="muted">Артикул: {p.sku}</p><p>{p.compatibility}</p><p className="stock">В наличии: {p.stock} шт.</p><p className="price">{p.price}</p><div className="cardActions"><button className="btn primary" onClick={()=>openRequest(p,'part')}>Заказать</button><button className="btn" onClick={()=>openRequest(p,'install')}>Установить</button><button className="btn" onClick={()=>add(p)}>В подбор</button><Link className="btn" href={`/availability?q=${encodeURIComponent(p.sku)}`}>Проверить</Link></div></article>)}</div></>}
