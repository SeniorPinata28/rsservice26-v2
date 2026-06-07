import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';
import {getCustomer,getCustomerLeads,getCustomerVehicles} from '../../../../lib/db.js';

function formatDate(value){if(!value)return '—';try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function nameOf(c){return c?.full_name||c?.name||'Клиент без имени'}
function Block({title,children}){return <section className="card" style={{padding:22,marginTop:18}}><h2 style={{marginTop:0}}>{title}</h2>{children}</section>}
function Row({label,value}){return <p style={{display:'grid',gridTemplateColumns:'170px 1fr',gap:12,margin:'10px 0'}}><b>{label}</b><span>{value||'—'}</span></p>}

export default async function CustomerDetails({params}){
 const customer=await getCustomer(params.id);
 if(!customer){return <><Header/><main className="main"><section className="card" style={{padding:24}}><h1>Клиент не найден</h1><p className="muted">Карточка доступна только для подтверждённых клиентов.</p><Link className="btn primary" href="/admin">Назад в админку</Link></section></main><Footer/></>}
 const [leads,vehicles]=await Promise.all([getCustomerLeads(customer.id),getCustomerVehicles(customer.id)]);
 return <><Header/><main className="main adminPage">
  <section className="adminHero"><div><span className="badge">Подтверждённый клиент</span><h1>{nameOf(customer)}</h1><p className="muted">Телефон: {customer.phone||'—'} · Заявок: {leads.length} · Автомобилей: {vehicles.length}</p></div><Link className="btn primary" href="/admin">Назад</Link></section>
  <Block title="Данные клиента">
   <Row label="Имя" value={nameOf(customer)}/>
   <Row label="Телефон" value={customer.phone}/>
   <Row label="Email" value={customer.email}/>
   <Row label="Статус" value={customer.status||'confirmed'}/>
   <Row label="Дата создания" value={formatDate(customer.created_at)}/>
   <Row label="Источник" value={customer.source}/>
  </Block>
  <Block title="Автомобили клиента">
   {vehicles.length===0&&<p className="muted">Автомобили ещё не добавлены. Следующий шаг — форма добавления автомобиля из этой карточки.</p>}
   {vehicles.map(v=><div className="leadRow" key={v.id}><div><b>{v.make||v.brand||'Марка не указана'} {v.model||''}</b><small>{v.year||'год не указан'}</small></div><div><span>{v.vin||'VIN не указан'}</span><small>{v.plate_number||v.license_plate||'номер не указан'}</small></div><p>{v.engine||''} {v.transmission||''}</p></div>)}
  </Block>
  <Block title="История заявок">
   {leads.length===0&&<p className="muted">Заявок у клиента пока нет.</p>}
   {leads.map(l=><Link className="leadRow" href={`/admin/leads/${l.id}`} key={l.id}><div><b>{l.public_id||'Без номера'}</b><small>{formatDate(l.created_at)}</small></div><div><span>{l.type||'Заявка'}</span><small>{l.status||'—'}</small></div><p>{l.request_text||'Без текста'}</p></Link>)}
  </Block>
 </main><Footer/></>
}
