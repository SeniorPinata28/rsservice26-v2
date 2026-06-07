import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';
import {getLead} from '../../../../lib/db.js';
import LeadActions from './LeadActions';

function formatDate(value){
  if(!value)return '—';
  try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}
}
function typeLabel(type){
  const map={
    part:'Запчасть',
    installation:'Установка',
    service:'Сервис',
    question:'Вопрос',
    selection:'Подбор',
    parts_search:'Проверка наличия',
    parts_order:'Заказ запчасти',
    installation_booking:'Запись на установку',
    service_booking:'Запись на сервис',
    general_callback:'Вопрос / обратный звонок',
    phone_callback:'Телефонная заявка',
    parts_selection_request:'Подбор деталей'
  };
  return map[type]||type||'Заявка';
}
function statusLabel(status){const map={new_contact:'Новый контакт',in_progress:'В работе',waiting_client:'Ждём клиента',completed:'Выполнена',declined:'Отказ'};return map[status]||status||'—'}
function contactLabel(status){const map={unverified:'Новый контакт',verified:'Проверен',confirmed_client:'Подтверждённый клиент',duplicate:'Дубль',spam:'Спам'};return map[status]||status||'Новый контакт'}
function Block({title,children}){return <section className="card" style={{padding:22,marginTop:18}}><h2 style={{marginTop:0}}>{title}</h2>{children}</section>}
function Row({label,value}){return <p style={{display:'grid',gridTemplateColumns:'180px 1fr',gap:12,margin:'10px 0'}}><b>{label}</b><span>{value||'—'}</span></p>}

export default async function LeadDetails({params}){
  const lead=await getLead(params.id);
  if(!lead){return <><Header/><main className="main"><section className="card" style={{padding:24}}><h1>Заявка не найдена</h1><Link className="btn primary" href="/admin">Назад в админку</Link></section></main><Footer/></>}
  const raw=lead.raw_payload||{};
  const contactStatus=lead.contact_status||raw.contact_status||'unverified';
  const comments=Array.isArray(raw.manager_comments)?raw.manager_comments:[];
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">{typeLabel(lead.type)}</span><h1>{lead.public_id||'Заявка'}</h1><p className="muted">Создана: {formatDate(lead.created_at)} · Статус заявки: {statusLabel(lead.status)} · Статус контакта: {contactLabel(contactStatus)}</p></div><Link className="btn primary" href="/admin">Назад</Link></section>
    <Block title="Основные данные заявки">
      <Row label="Номер заявки" value={lead.public_id}/>
      <Row label="Дата создания" value={formatDate(lead.created_at)}/>
      <Row label="Тип заявки" value={typeLabel(lead.type)}/>
      <Row label="Статус заявки" value={statusLabel(lead.status)}/>
      <Row label="Статус контакта" value={contactLabel(contactStatus)}/>
      <Row label="Источник" value={lead.source}/>
    </Block>
    <Block title="Контакт и автомобиль">
      <Row label="Имя" value={lead.name}/>
      <Row label="Телефон" value={lead.phone}/>
      <Row label="Авто" value={lead.car_text}/>
      <Row label="VIN" value={lead.vin}/>
      <Row label="Пробег" value={lead.mileage}/>
      <Row label="Customer ID" value={lead.customer_id}/>
      <Row label="Vehicle ID" value={lead.vehicle_id}/>
    </Block>
    <Block title="Текст заявки"><pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:16,lineHeight:1.45,margin:0}}>{lead.request_text||'—'}</pre></Block>
    <LeadActions lead={lead}/>
    <Block title="Комментарии менеджера">
      {comments.length===0&&<p className="muted">Комментариев пока нет.</p>}
      {comments.map((c,i)=><div key={i} className="notice" style={{marginBottom:10}}><b>{formatDate(c.created_at)}</b><p style={{marginBottom:0}}>{c.text}</p></div>)}
    </Block>
    <Block title="Технические данные raw_payload"><pre style={{whiteSpace:'pre-wrap',fontSize:13,overflow:'auto',margin:0}}>{JSON.stringify(raw,null,2)}</pre></Block>
  </main><Footer/></>
}