import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import Link from 'next/link';
import {listCustomers,listLeads} from '../../../lib/db.js';

function formatDate(value){
  if(!value)return '—';
  try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}
}

export default async function CustomersPage(){
  const [customers,leads]=await Promise.all([listCustomers(),listLeads()]);
  const leadCount=new Map();
  for(const l of leads){if(l.customer_id)leadCount.set(l.customer_id,(leadCount.get(l.customer_id)||0)+1)}
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">CRM</span><h1>Клиенты</h1><p className="muted">Клиенты создаются автоматически по телефону при заявке.</p></div><Link className="btn primary" href="/admin">Заявки</Link></section>
    <section className="adminStats"><div className="card"><b>{customers.length}</b><span>клиентов</span></div><div className="card"><b>{customers.filter(c=>c.status==='new').length}</b><span>новых</span></div></section>
    <section className="card adminList">
      <div className="adminListHead"><b>Список клиентов</b><span>{customers.length} шт.</span></div>
      {customers.length===0&&<p className="muted">Клиентов пока нет.</p>}
      {customers.map(c=><Link className="leadRow" href={`/admin/customers/${c.id}`} key={c.id}>
        <div><b>{c.full_name||'Без имени'}</b><small>{formatDate(c.created_at)}</small></div>
        <div><span>{c.phone||'Телефон не указан'}</span><small>{c.status||'new'}</small></div>
        <div><span>{leadCount.get(c.id)||0} заявок</span><small>{c.telegram_username||'Telegram не указан'}</small></div>
        <p>{c.internal_notes||c.client_notes||'Карточка клиента'}</p>
      </Link>)}
    </section>
  </main><Footer/></>
}
