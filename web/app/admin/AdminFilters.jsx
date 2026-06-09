'use client'
import Link from 'next/link'
import {useMemo,useState} from 'react'

const leadStatuses={new_contact:'Новая',in_progress:'В работе',waiting_client:'Ждём',completed:'Выполнена',declined:'Отказ'};
const typeLabels={part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос',selection:'Подбор',parts_search:'Проверка',parts_order:'Заказ',installation_booking:'Установка',service_booking:'Сервис',general_callback:'Вопрос',phone_callback:'Звонок',parts_selection_request:'Подбор'};
function formatDate(value){if(!value)return '—';try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function contactStatus(lead){return lead?.contact_status||lead?.raw_payload?.contact_status||'unverified'}
function normalizedPhone(value){return String(value||'').replace(/[^0-9+]/g,'').toLowerCase()}
function shortText(value,max=120){const text=String(value||'').trim();return text.length>max?text.slice(0,max)+'…':text}
function isActive(lead){return ['new_contact','in_progress','waiting_client'].includes(lead.status)}
function isNewContact(lead){return contactStatus(lead)==='unverified'&&!lead.customer_id}
function isConfirmed(lead){return Boolean(lead.customer_id)||contactStatus(lead)==='confirmed_client'}
function metric(active){return {display:'grid',gap:3,textAlign:'left',padding:'12px 14px',borderRadius:16,border:active?'2px solid #1e63ff':'1px solid #d9e2ef',background:active?'#eff6ff':'#fff',cursor:'pointer',fontWeight:900,color:'#0b1220'}}
function statusBadge(status){const map={new_contact:'#dbeafe',in_progress:'#fef3c7',waiting_client:'#ede9fe',completed:'#dcfce7',declined:'#fee2e2'};return {display:'inline-flex',padding:'5px 9px',borderRadius:999,background:map[status]||'#f1f5f9',fontSize:12,fontWeight:900,color:'#0f172a'}}

export default function AdminFilters({leads}){
 const [preset,setPreset]=useState('active');
 const [status,setStatus]=useState('all');
 const [query,setQuery]=useState('');
 const clean=Array.isArray(leads)?leads.filter(l=>l.type!=='debug'):[];
 const stats={all:clean.length,active:clean.filter(isActive).length,new:clean.filter(isNewContact).length,confirmed:clean.filter(isConfirmed).length};
 const filtered=useMemo(()=>clean.filter(lead=>{
  if(preset==='active'&&!isActive(lead))return false;
  if(preset==='new'&&!isNewContact(lead))return false;
  if(preset==='confirmed'&&!isConfirmed(lead))return false;
  if(status!=='all'&&lead.status!==status)return false;
  const q=query.trim().toLowerCase();
  if(q){
   const hay=[lead.public_id,lead.name,lead.phone,lead.vin,lead.car_text,lead.request_text].map(v=>String(v||'').toLowerCase()).join(' ');
   const phoneHay=normalizedPhone(lead.phone);
   if(!hay.includes(q)&&!phoneHay.includes(normalizedPhone(q)))return false;
  }
  return true;
 }),[clean,preset,status,query]);
 function reset(next){setPreset(next);setStatus('all');setQuery('')}
 return <section className="card adminList" style={{padding:16}}>
   <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-end',marginBottom:12,flexWrap:'wrap'}}><div><h2 style={{margin:'0 0 4px'}}>Заявки</h2><p className="muted" style={{margin:0}}>Открой заявку, обработай обращение, при необходимости создай клиента и автомобиль.</p></div><b>{filtered.length} из {clean.length}</b></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginBottom:12}}>
    <button type="button" style={metric(preset==='all')} onClick={()=>reset('all')}><span>Все</span><b style={{fontSize:22}}>{stats.all}</b></button>
    <button type="button" style={metric(preset==='active')} onClick={()=>reset('active')}><span>Активные</span><b style={{fontSize:22}}>{stats.active}</b></button>
    <button type="button" style={metric(preset==='new')} onClick={()=>reset('new')}><span>Новые</span><b style={{fontSize:22}}>{stats.new}</b></button>
    <button type="button" style={metric(preset==='confirmed')} onClick={()=>reset('confirmed')}><span>Клиенты</span><b style={{fontSize:22}}>{stats.confirmed}</b></button>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:10,marginBottom:14}}>
    <select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Все статусы</option>{Object.entries(leadStatuses).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
    <input className="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск: номер заявки, телефон, имя, VIN, текст"/>
   </div>
   {filtered.length===0&&<p className="muted">Нет записей по текущему фильтру.</p>}
   <div style={{display:'grid',gap:10}}>
    {filtered.map(lead=><article key={lead.id} className="card" style={{padding:14,borderRadius:18,boxShadow:'0 8px 22px rgba(15,23,42,.055)'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'start'}}>
        <div><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><b style={{fontSize:17}}>{lead.public_id||'Без номера'}</b><span style={statusBadge(lead.status)}>{leadStatuses[lead.status]||lead.status||'—'}</span><span className="badge">{typeLabels[lead.type]||lead.type||'Заявка'}</span></div><p style={{margin:'7px 0 0',fontWeight:900}}>{lead.name||'Без имени'} · {lead.phone||'телефон не указан'}</p><small className="muted">{formatDate(lead.created_at)} · {lead.customer_id?'клиент есть':'без клиента'} · {lead.vehicle_id?'авто есть':'без авто'}</small></div>
        <Link className="btn primary" href={`/admin/leads/${lead.id}`} style={{marginTop:0}}>Открыть</Link>
      </div>
      <p style={{margin:'10px 0 0',lineHeight:1.45}}>{shortText(lead.request_text||'Без текста')}</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}><Link className="btn" href={`/admin/leads/${lead.id}`} style={{marginTop:0}}>Заявка</Link>{lead.customer_id&&<Link className="btn" href={`/admin/customers/${lead.customer_id}`} style={{marginTop:0}}>Клиент</Link>}{lead.vehicle_id&&<Link className="btn" href={`/admin/vehicles/${lead.vehicle_id}`} style={{marginTop:0}}>Авто</Link>}</div>
     </article>)}
   </div>
  </section>
}
