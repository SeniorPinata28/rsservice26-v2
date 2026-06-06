'use client'
import Link from 'next/link'
import {useMemo,useState} from 'react'

const leadStatuses={new_contact:'Новый контакт',in_progress:'В работе',waiting_client:'Ждём клиента',completed:'Выполнена',declined:'Отказ'};
const contactStatuses={unverified:'Новый контакт',verified:'Проверен',confirmed_client:'Подтверждённый клиент',duplicate:'Дубль',spam:'Спам'};
const typeLabels={part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос',selection:'Подбор'};
function formatDate(value){if(!value)return '—';try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function contactStatus(lead){return lead?.raw_payload?.contact_status||'unverified'}

export default function AdminFilters({leads}){
 const [status,setStatus]=useState('all');
 const [type,setType]=useState('all');
 const [phone,setPhone]=useState('');
 const [number,setNumber]=useState('');
 const clean=Array.isArray(leads)?leads.filter(l=>l.type!=='debug'):[];
 const filtered=useMemo(()=>clean.filter(lead=>{
  if(status!=='all'&&lead.status!==status)return false;
  if(type!=='all'&&lead.type!==type)return false;
  if(phone&&!(lead.phone||'').toLowerCase().includes(phone.toLowerCase()))return false;
  if(number&&!(lead.public_id||'').toLowerCase().includes(number.toLowerCase()))return false;
  return true;
 }),[clean,status,type,phone,number]);
 const potential=clean.filter(l=>!l.customer_id&&contactStatus(l)!=='spam'&&contactStatus(l)!=='duplicate');
 const confirmed=clean.filter(l=>l.customer_id||contactStatus(l)==='confirmed_client');
 return <>
  <section className="card adminList">
   <div className="adminListHead"><b>Заявки</b><span>{filtered.length} из {clean.length}</span></div>
   <div className="filters">
    <select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Все статусы заявки</option>{Object.entries(leadStatuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
    <select value={type} onChange={e=>setType(e.target.value)}><option value="all">Все типы заявки</option>{Object.entries(typeLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
    <input className="input" style={{maxWidth:220}} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Поиск по телефону"/>
    <input className="input" style={{maxWidth:220}} value={number} onChange={e=>setNumber(e.target.value)} placeholder="Поиск по номеру"/>
   </div>
   {filtered.length===0&&<p className="muted">Заявок по фильтру нет.</p>}
   {filtered.map(lead=><Link className="leadRow" href={`/admin/leads/${lead.id}`} key={lead.id}>
    <div><b>{lead.public_id||'Без номера'}</b><small>{formatDate(lead.created_at)}</small></div>
    <div><span>{typeLabels[lead.type]||lead.type||'Заявка'}</span><small>{leadStatuses[lead.status]||lead.status||'—'}</small></div>
    <div><span>{lead.name||'Без имени'}</span><small>{lead.phone||'Телефон не указан'}</small></div>
    <div><span>{contactStatuses[contactStatus(lead)]||contactStatus(lead)}</span><small>{lead.customer_id?'связан с клиентом':'без клиента'}</small></div>
    <p>{lead.request_text||'Без текста'}</p>
   </Link>)}
  </section>
  <section className="card adminList">
   <div className="adminListHead"><b>Контакты / потенциальные клиенты</b><span>{potential.length} шт.</span></div>
   {potential.length===0&&<p className="muted">Потенциальных контактов пока нет.</p>}
   {potential.map(lead=><Link className="leadRow" href={`/admin/leads/${lead.id}`} key={lead.id}>
    <div><b>{lead.name||'Без имени'}</b><small>{formatDate(lead.created_at)}</small></div>
    <div><span>{lead.phone||'Телефон не указан'}</span><small>{contactStatuses[contactStatus(lead)]||'Новый контакт'}</small></div>
    <div><span>{typeLabels[lead.type]||lead.type}</span><small>{lead.public_id||'Без номера'}</small></div>
    <p>{lead.request_text||'Заявка без текста'}</p>
   </Link>)}
  </section>
  <section className="card adminList">
   <div className="adminListHead"><b>Подтверждённые клиенты</b><span>{confirmed.length} связанных заявок</span></div>
   {confirmed.length===0&&<p className="muted">Подтверждённых клиентов пока нет. Клиент появляется только после кнопки “Подтвердить как клиента”.</p>}
   {confirmed.map(lead=><Link className="leadRow" href={`/admin/leads/${lead.id}`} key={lead.id}>
    <div><b>{lead.name||'Без имени'}</b><small>{formatDate(lead.created_at)}</small></div>
    <div><span>{lead.phone||'Телефон не указан'}</span><small>confirmed_client</small></div>
    <div><span>{lead.public_id||'Без номера'}</span><small>customer_id: {lead.customer_id||'есть в raw'}</small></div>
    <p>{lead.request_text||'Подтверждённый клиент'}</p>
   </Link>)}
  </section>
 </>
}
