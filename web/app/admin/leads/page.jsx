import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import Link from 'next/link';
import {listLeads} from '../../../lib/db.js';

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

export default async function AdminLeads(){
  const leads=await listLeads();
  const clean=leads.filter(l=>l.type!=='debug');
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">CRM</span><h1>Заявки</h1><p className="muted">Все обращения с сайта. Данные берутся из Supabase.</p></div><Link className="btn primary" href="/admin">Админка</Link></section>
    <section className="adminStats"><div className="card"><b>{clean.length}</b><span>заявок</span></div><div className="card"><b>{clean.filter(l=>l.status==='new').length}</b><span>новых</span></div><div className="card"><b>{clean.filter(l=>l.type==='part').length}</b><span>запчасти</span></div><div className="card"><b>{clean.filter(l=>l.type==='installation').length}</b><span>установка</span></div></section>
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
