import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';
import {listLeads,listCustomers} from '../../lib/db.js';

function formatDate(value){
  if(!value)return '—';
  try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}
}
function label(type){
  const map={part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос',debug:'Тест'};
  return map[type]||type||'Заявка';
}
function statusName(status){
  const map={new:'Новая',new_contact:'Новый контакт',verified:'Проверен',confirmed_client:'Подтверждённый клиент',duplicate:'Дубль',spam:'Спам',in_progress:'В работе',waiting_client:'Ждём клиента',confirmed:'Подтверждена',booked:'Записан',completed:'Выполнена',declined:'Отказ'};
  return map[status]||status||'—';
}
function contactStatus(lead){
  const raw=lead.raw_payload||{};
  if(raw.contact_status==='verified')return 'Проверен';
  if(raw.contact_status==='confirmed_client')return 'Подтверждённый клиент';
  if(raw.contact_status==='duplicate')return 'Дубль';
  if(raw.contact_status==='spam')return 'Спам';
  return 'Новый контакт';
}

export default async function Page(){
  const [leads,customers]=await Promise.all([listLeads(),listCustomers()]);
  const clean=leads.filter(l=>l.type!=='debug');
  const potentialContacts=clean.filter(l=>!l.customer_id);
  const confirmedCustomers=customers.filter(c=>c.status==='confirmed');
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">CRM</span><h1>Админка RSService26</h1><p className="muted">Главное хранилище — заявки. Контакты не считаются клиентами до подтверждения менеджером.</p></div><Link className="btn primary" href="/availability">Проверить запчасть</Link></section>
    <section className="adminStats"><div className="card"><b>{clean.length}</b><span>заявок</span></div><div className="card"><b>{potentialContacts.length}</b><span>новых контактов</span></div><div className="card"><b>{confirmedCustomers.length}</b><span>подтверждённых клиентов</span></div><div className="card"><b>{clean.filter(l=>l.type==='installation').length}</b><span>установка</span></div></section>
    <section className="card adminList">
      <div className="adminListHead"><b>Контакты / потенциальные клиенты</b><span>{potentialContacts.length} шт.</span></div>
      {potentialContacts.length===0&&<p className="muted">Новых контактов пока нет.</p>}
      {potentialContacts.map(lead=><Link className="leadRow" href={`/admin/leads/${lead.id}`} key={lead.id}>
        <div><b>{lead.name||'Без имени'}</b><small>{formatDate(lead.created_at)}</small></div>
        <div><span>{lead.phone||'Телефон не указан'}</span><small>{contactStatus(lead)}</small></div>
        <div><span>{label(lead.type)}</span><small>{lead.public_id||'Без номера'}</small></div>
        <p>{lead.request_text||'Заявка без текста'}</p>
      </Link>)}
    </section>
    <section className="card adminList">
      <div className="adminListHead"><b>Подтверждённые клиенты</b><span>{confirmedCustomers.length} шт.</span></div>
      {confirmedCustomers.length===0&&<p className="muted">Подтверждённых клиентов пока нет. Личный кабинет создаётся только после подтверждения клиента.</p>}
      {confirmedCustomers.map(c=><div className="leadRow" key={c.id}>
        <div><b>{c.full_name||'Без имени'}</b><small>{formatDate(c.created_at)}</small></div>
        <div><span>{c.phone||'Телефон не указан'}</span><small>{c.status}</small></div>
        <div><span>Личный кабинет</span><small>доступен после отдельного шага</small></div>
        <p>{c.internal_notes||c.client_notes||'Подтверждённый клиент'}</p>
      </div>)}
    </section>
    <section className="card adminList">
      <div className="adminListHead"><b>Все заявки</b><span>{clean.length} шт.</span></div>
      {clean.length===0&&<p className="muted">Заявок пока нет.</p>}
      {clean.map(lead=><Link className="leadRow" href={`/admin/leads/${lead.id}`} key={lead.id}>
        <div><b>{lead.public_id||'Без номера'}</b><small>{formatDate(lead.created_at)}</small></div>
        <div><span>{label(lead.type)}</span><small>{statusName(lead.status)}</small></div>
        <div><span>{lead.name||'Без имени'}</span><small>{lead.phone||'Телефон не указан'}</small></div>
        <p>{lead.request_text||'Без текста'}</p>
      </Link>)}
    </section>
  </main><Footer/></>
}
