import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';
import {getLead} from '../../../../lib/db.js';

function formatDate(value){
  if(!value)return '—';
  try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}
}
function typeLabel(type){
  const map={part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос',selection:'Подбор'};
  return map[type]||type||'Заявка';
}
function statusLabel(status){
  const map={new:'Новая',in_progress:'В работе',waiting_client:'Ждём клиента',confirmed:'Подтверждена',booked:'Записан',completed:'Выполнена',declined:'Отказ'};
  return map[status]||status||'—';
}
function Block({title,children}){return <section className="card" style={{padding:22,marginTop:18}}><h2 style={{marginTop:0}}>{title}</h2>{children}</section>}
function Row({label,value}){return <p style={{display:'grid',gridTemplateColumns:'150px 1fr',gap:12,margin:'10px 0'}}><b>{label}</b><span>{value||'—'}</span></p>}

export default async function LeadDetails({params}){
  const lead=await getLead(params.id);
  if(!lead){return <><Header/><main className="main"><section className="card" style={{padding:24}}><h1>Заявка не найдена</h1><Link className="btn primary" href="/admin">Назад в админку</Link></section></main><Footer/></>}
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">{typeLabel(lead.type)}</span><h1>{lead.public_id||'Заявка'}</h1><p className="muted">Создана: {formatDate(lead.created_at)} · Статус: {statusLabel(lead.status)}</p></div><Link className="btn primary" href="/admin">Назад</Link></section>
    <Block title="Клиент">
      <Row label="Имя" value={lead.name}/>
      <Row label="Телефон" value={lead.phone}/>
      <Row label="Авто" value={lead.car_text}/>
      <Row label="VIN" value={lead.vin}/>
      <Row label="Пробег" value={lead.mileage}/>
    </Block>
    <Block title="Запрос">
      <pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:16,lineHeight:1.45,margin:0}}>{lead.request_text||'—'}</pre>
    </Block>
    <Block title="Служебные данные">
      <Row label="ID" value={lead.id}/>
      <Row label="Customer ID" value={lead.customer_id}/>
      <Row label="Vehicle ID" value={lead.vehicle_id}/>
      <Row label="Источник" value={lead.source}/>
    </Block>
  </main><Footer/></>
}
