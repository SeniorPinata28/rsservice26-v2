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
  const map={new:'Новая',in_progress:'В работе',waiting_client:'Ждём клиента',confirmed:'Подтверждена',booked:'Записан',completed:'Выполнена',declined:'Отказ'};
  return map[status]||status||'—';
}

export default async function Page(){
  const [leads,customers]=await Promise.all([listLeads(),listCustomers()]);
  const clean=leads.filter(l=>l.type!=='debug');
  const leadCount=new Map();
  for(const l of clean){if(l.customer_id)leadCount.set(l.customer_id,(leadCount.get(l.customer_id)||0)+1)}
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">CRM</span><h1>Админка RSService26</h1><p className="muted">Заявки и клиенты из Supabase. Рабочий контур CRM.</p></div><Link className="btn primary" href="/availability">Проверить запчасть</Link></section>
    <section className="adminStats"><div className="card"><b>{clean.length}</b><span>заявок</span></div><div className="card"><b>{clean.filter(l=>l.status==='new').length}</b><span>новых</span></div><div className="card"><b>{customers.length}</b><span>клиентов</span></div><div className="card"><b>{clean.filter(l=>l.type==='installation').length}</b><span>установка</span></div></section>
    <section className="card adminList">
      <div className="adminListHead"><b>Клиенты</b><span>{customers.length} шт.</span></div>
      {customers.length===0&&<p className="muted">Клиентов пока нет.</p>}
      {customers.map(c=><Link className="leadRow" href={`/admin/customers/${c.id}`} key={c.id}>
        <div><b>{c.full_name||'Без имени'}</b><small>{formatDate(c.created_at)}</small></div>
        <div><span>{c.phone||'Телефон не указан'}</span><small>{c.status||'new'}</small></div>
        <div><span>{leadCount.get(c.id)||0} заявок</span><small>{c.telegram_username||'Telegram не указан'}</small></div>
        <p>{c.internal_notes||c.client_notes||'Карточка клиента'}</p>
      </Link>)}
    </section>
    <section className="card adminList">
      <div className="adminListHead"><b>Последние заявки</b><span>{clean.length} шт.</span></div>
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
