import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';
import {getCustomerVehicles,getLead} from '../../../../lib/db.js';
import LeadActions from './LeadActions';
import LeadEditForm from './LeadEditForm';
import VehicleLinkForm from './VehicleLinkForm';

function formatDate(value){if(!value)return '—';try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function typeLabel(type){const map={part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос',selection:'Подбор',parts_search:'Проверка наличия',parts_order:'Заказ запчасти',installation_booking:'Запись на установку',service_booking:'Запись на сервис',general_callback:'Вопрос / обратный звонок',phone_callback:'Телефонная заявка',parts_selection_request:'Подбор деталей'};return map[type]||type||'Заявка'}
function statusLabel(status){const map={new_contact:'Новая',in_progress:'В работе',waiting_client:'Ждём клиента',completed:'Выполнена',declined:'Отказ'};return map[status]||status||'—'}
function contactLabel(status){const map={unverified:'Новый контакт',verified:'Проверен',confirmed_client:'Клиент',duplicate:'Дубль',spam:'Спам'};return map[status]||status||'Новый контакт'}
function Block({title,children}){return <section className="card" style={{padding:22,marginTop:18}}><h2 style={{marginTop:0}}>{title}</h2>{children}</section>}
function Row({label,value}){return <p style={{display:'grid',gridTemplateColumns:'150px 1fr',gap:12,margin:'10px 0'}}><b>{label}</b><span>{value||'—'}</span></p>}

export default async function LeadDetails({params}){
  const lead=await getLead(params.id);
  if(!lead){return <><Header/><main className="main"><section className="card" style={{padding:24}}><h1>Заявка не найдена</h1><Link className="btn primary" href="/admin">Назад в админку</Link></section></main><Footer/></>}
  const raw=lead.raw_payload||{};
  const contactStatus=lead.contact_status||raw.contact_status||'unverified';
  const comments=Array.isArray(raw.manager_comments)?raw.manager_comments:[];
  const customerVehicles=lead.customer_id?await getCustomerVehicles(lead.customer_id):[];
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">{typeLabel(lead.type)}</span><h1>{lead.public_id||'Заявка'}</h1><p className="muted">{formatDate(lead.created_at)} · {statusLabel(lead.status)} · {contactLabel(contactStatus)}</p></div><Link className="btn primary" href="/admin">Назад</Link></section>
    <Block title="Данные заявки">
      <Row label="Клиент" value={lead.name}/>
      <Row label="Телефон" value={lead.phone}/>
      <Row label="Автомобиль" value={lead.car_text}/>
      <Row label="VIN" value={lead.vin}/>
      <Row label="Пробег" value={lead.mileage}/>
      <Row label="Тип" value={typeLabel(lead.type)}/>
      <Row label="Статус" value={statusLabel(lead.status)}/>
      <Row label="Контакт" value={contactLabel(contactStatus)}/>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}>{lead.customer_id&&<Link className="btn" href={`/admin/customers/${lead.customer_id}`}>Открыть клиента</Link>}{lead.vehicle_id&&<Link className="btn" href={`/admin/vehicles/${lead.vehicle_id}`}>Открыть автомобиль</Link>}</div>
    </Block>
    <Block title="Текст обращения"><pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:16,lineHeight:1.45,margin:0}}>{lead.request_text||'—'}</pre></Block>
    <Block title="Действия менеджера"><LeadActions lead={lead}/></Block>
    <Block title="Редактировать заявку"><LeadEditForm lead={lead}/></Block>
    <Block title="Автомобиль">
      {lead.vehicle_id?<p className="muted">Заявка уже привязана к автомобилю.</p>:lead.customer_id?<VehicleLinkForm leadId={lead.id} vehicles={customerVehicles}/>:<p className="muted">Сначала подтвердите контакт как клиента. После этого можно добавить автомобиль в карточке клиента и привязать заявку.</p>}
    </Block>
    <Block title="История">
      {comments.length===0&&<p className="muted">Комментариев пока нет.</p>}
      {comments.map((c,i)=><div key={i} className="notice" style={{marginBottom:10}}><b>{formatDate(c.created_at)}</b><p style={{marginBottom:0}}>{c.text}</p></div>)}
    </Block>
  </main><Footer/></>
}