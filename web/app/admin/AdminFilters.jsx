'use client'
import Link from 'next/link'
import {useMemo,useState} from 'react'

const leadStatuses={new_contact:'Новый',in_progress:'В работе',waiting_client:'Ждём клиента',completed:'Выполнена',declined:'Отказ'};
const contactStatuses={unverified:'Новый контакт',verified:'Проверен',confirmed_client:'Клиент',duplicate:'Дубль',spam:'Спам'};
const typeLabels={part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос',selection:'Подбор',parts_search:'Проверка наличия',parts_order:'Заказ запчасти',installation_booking:'Установка',service_booking:'Сервис',general_callback:'Вопрос',phone_callback:'Звонок',parts_selection_request:'Подбор'};
function formatDate(value){if(!value)return '—';try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function contactStatus(lead){return lead?.contact_status||lead?.raw_payload?.contact_status||'unverified'}
function normalizedPhone(value){return String(value||'').replace(/[^0-9+]/g,'').toLowerCase()}
function shortText(value,max=145){const text=String(value||'').trim();return text.length>max?text.slice(0,max)+'…':text}
function isActive(lead){return ['new_contact','in_progress','waiting_client'].includes(lead.status)}
function isNewContact(lead){return contactStatus(lead)==='unverified'&&!lead.customer_id}
function isConfirmed(lead){return Boolean(lead.customer_id)||contactStatus(lead)==='confirmed_client'}
function chipStyle(active=false){return {display:'grid',gap:4,textAlign:'left',padding:'13px 14px',borderRadius:18,border:active?'2px solid #1e63ff':'1px solid #d9e2ef',background:active?'#eff6ff':'#fff',boxShadow:active?'0 10px 28px rgba(30,99,255,.12)':'0 6px 18px rgba(15,23,42,.045)',cursor:'pointer',fontWeight:900,color:'#0b1220'}}
function badgeStyle(kind){const map={new_contact:'#dbeafe',in_progress:'#fef3c7',waiting_client:'#ede9fe',completed:'#dcfce7',declined:'#fee2e2'};return {display:'inline-flex',alignItems:'center',width:'fit-content',padding:'5px 9px',borderRadius:999,background:map[kind]||'#f1f5f9',fontSize:12,fontWeight:900,color:'#0f172a'}}

export default function AdminFilters({leads}){
 const [preset,setPreset]=useState('active');
 const [status,setStatus]=useState('all');
 const [contact,setContact]=useState('all');
 const [type,setType]=useState('all');
 const [phone,setPhone]=useState('');
 const [number,setNumber]=useState('');
 const clean=Array.isArray(leads)?leads.filter(l=>l.type!=='debug'):[];
 const stats={
  all:clean.length,
  active:clean.filter(isActive).length,
  new:clean.filter(isNewContact).length,
  confirmed:clean.filter(isConfirmed).length
 };
 const filtered=useMemo(()=>clean.filter(lead=>{
  if(preset==='active'&&!isActive(lead))return false;
  if(preset==='new'&&!isNewContact(lead))return false;
  if(preset==='confirmed'&&!isConfirmed(lead))return false;
  if(status!=='all'&&lead.status!==status)return false;
  if(contact!=='all'&&contactStatus(lead)!==contact)return false;
  if(type!=='all'&&lead.type!==type)return false;
  if(phone&&!normalizedPhone(lead.phone).includes(normalizedPhone(phone)))return false;
  if(number&&!(lead.public_id||'').toLowerCase().includes(number.toLowerCase()))return false;
  return true;
 }),[clean,preset,status,contact,type,phone,number]);
 function resetFilters(nextPreset){setPreset(nextPreset);setStatus('all');setContact('all');setType('all');setPhone('');setNumber('')}
 return <section className="card adminList" style={{padding:16}}>
   <div className="adminListHead" style={{alignItems:'flex-start',gap:12,marginBottom:12}}><div><b style={{fontSize:22}}>Заявки</b><p className="muted" style={{margin:'6px 0 0'}}>Один рабочий список. Нажми заявку → подтверди клиента → открой клиента → добавь авто.</p></div><span>{filtered.length} из {clean.length}</span></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginBottom:14}}>
    <button type="button" style={chipStyle(preset==='all')} onClick={()=>resetFilters('all')}><span>Всего заявок</span><b style={{fontSize:24}}>{stats.all}</b></button>
    <button type="button" style={chipStyle(preset==='active')} onClick={()=>resetFilters('active')}><span>Активные</span><b style={{fontSize:24}}>{stats.active}</b></button>
    <button type="button" style={chipStyle(preset==='new')} onClick={()=>resetFilters('new')}><span>Новые контакты</span><b style={{fontSize:24}}>{stats.new}</b></button>
    <button type="button" style={chipStyle(preset==='confirmed')} onClick={()=>resetFilters('confirmed')}><span>Клиенты</span><b style={{fontSize:24}}>{stats.confirmed}</b></button>
   </div>
   <div className="filters" style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:10,margin:'0 0 16px'}}>
    <select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Статус заявки</option>{Object.entries(leadStatuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
    <select value={contact} onChange={e=>setContact(e.target.value)}><option value="all">Статус контакта</option>{Object.entries(contactStatuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
    <select value={type} onChange={e=>setType(e.target.value)}><option value="all">Тип заявки</option>{Object.entries(typeLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
    <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Телефон"/>
    <input className="input" value={number} onChange={e=>setNumber(e.target.value)} placeholder="Номер заявки"/>
   </div>
   {filtered.length===0&&<p className="muted">Заявок по фильтру нет.</p>}
   <div style={{display:'grid',gap:12}}>
    {filtered.map(lead=>{
     const cStatus=contactStatus(lead);
     return <article key={lead.id} className="card" style={{padding:14,borderRadius:18,boxShadow:'0 8px 22px rgba(15,23,42,.055)'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'start'}}>
       <div style={{display:'grid',gap:7}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}><b style={{fontSize:18}}>{lead.public_id||'Без номера'}</b><span style={badgeStyle(lead.status)}>{leadStatuses[lead.status]||lead.status||'—'}</span><span className="badge">{typeLabels[lead.type]||lead.type||'Заявка'}</span></div>
        <div style={{display:'grid',gap:3}}><b>{lead.name||'Без имени'} · {lead.phone||'телефон не указан'}</b><small className="muted">{formatDate(lead.created_at)} · {contactStatuses[cStatus]||cStatus} · {lead.customer_id?'клиент подтверждён':'без клиента'}</small></div>
       </div>
       <Link className="btn primary" href={`/admin/leads/${lead.id}`} style={{marginTop:0}}>Открыть</Link>
      </div>
      <p style={{margin:'10px 0 0',lineHeight:1.45}}>{shortText(lead.request_text||'Без текста')}</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
       <Link className="btn" href={`/admin/leads/${lead.id}`} style={{marginTop:0}}>Заявка</Link>
       {lead.customer_id&&<Link className="btn" href={`/admin/customers/${lead.customer_id}`} style={{marginTop:0}}>Клиент</Link>}
       {lead.vehicle_id&&<Link className="btn" href={`/admin/vehicles/${lead.vehicle_id}`} style={{marginTop:0}}>Авто</Link>}
      </div>
     </article>
    })}
   </div>
  </section>
}
