import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Link from 'next/link';
import {listLeads,listCustomers} from '../../lib/db.js';
import AdminFilters from './AdminFilters';

function contactStatus(lead){return lead?.raw_payload?.contact_status||'unverified'}
function isConfirmedCustomer(customer){return !customer.status||customer.status==='confirmed'||customer.status==='confirmed_client'}

export default async function Page(){
  const [leads,customers]=await Promise.all([listLeads(),listCustomers()]);
  const clean=leads.filter(l=>l.type!=='debug');
  const newContacts=clean.filter(l=>contactStatus(l)==='unverified'&&!l.customer_id).length;
  const confirmedCustomers=customers.filter(isConfirmedCustomer);
  const active=clean.filter(l=>['new_contact','in_progress','waiting_client'].includes(l.status)).length;
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">CRM</span><h1>Админка RSService26</h1><p className="muted">Главное хранилище — заявки. Контакты не считаются клиентами до подтверждения менеджером.</p></div><Link className="btn primary" href="/availability">Проверить запчасть</Link></section>
    <section className="adminStats"><div className="card"><b>{clean.length}</b><span>всего заявок</span></div><div className="card"><b>{active}</b><span>активных заявок</span></div><div className="card"><b>{newContacts}</b><span>новых контактов</span></div><div className="card"><b>{confirmedCustomers.length}</b><span>подтверждённых клиентов</span></div></section>
    <AdminFilters leads={clean}/>
  </main><Footer/></>
}