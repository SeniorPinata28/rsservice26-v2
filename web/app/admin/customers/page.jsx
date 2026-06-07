import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import Link from 'next/link';
import {listCustomers} from '../../../lib/db.js';

function formatDate(value){
  if(!value)return '—';
  try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}
}

export default async function CustomersPage(){
  const customers=await listCustomers();
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">CRM</span><h1>Подтверждённые клиенты</h1><p className="muted">Этот раздел не является личным кабинетом. Карточка клиента нужна менеджеру для автомобилей и связанных заявок.</p></div><Link className="btn primary" href="/admin">Вернуться к заявкам</Link></section>
    <section className="card adminList">
      <div className="adminListHead"><b>Подтверждённые клиенты</b><span>{customers.length} шт.</span></div>
      {customers.length===0&&<p className="muted">Подтверждённых клиентов пока нет.</p>}
      {customers.map(c=><Link className="leadRow" href={`/admin/customers/${c.id}`} key={c.id}>
        <div><b>{c.full_name||c.name||'Без имени'}</b><small>{formatDate(c.created_at)}</small></div>
        <div><span>{c.phone||'Телефон не указан'}</span><small>{c.status||'confirmed'}</small></div>
        <div><span>Карточка клиента</span><small>автомобили и заявки</small></div>
        <p>{c.internal_notes||c.client_notes||'Подтверждённый клиент. Открыть карточку клиента.'}</p>
      </Link>)}
    </section>
  </main><Footer/></>
}
