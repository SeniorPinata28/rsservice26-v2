import Header from '../../components/Header';
import Footer from '../../components/Footer';
import {listLeads,listCustomers} from '../../lib/db.js';
import AdminFilters from './AdminFilters';

function contactStatus(lead){return lead?.raw_payload?.contact_status||lead?.contact_status||'unverified'}
function isConfirmedCustomer(customer){return !customer.status||customer.status==='confirmed'||customer.status==='confirmed_client'}

export default async function Page(){
  const [leads,customers]=await Promise.all([listLeads(),listCustomers()]);
  const clean=leads.filter(l=>l.type!=='debug');
  const confirmedCustomers=customers.filter(isConfirmedCustomer);
  return <><Header/><main className="main adminPage">
    <section className="adminHero" style={{padding:'22px 0 10px'}}>
      <div><span className="badge">Админка</span><h1 style={{marginBottom:8}}>RSService26</h1><p className="muted">Рабочий порядок: открыть заявку → подтвердить клиента → открыть клиента → добавить автомобиль.</p></div>
    </section>
    <AdminFilters leads={clean} confirmedCustomersCount={confirmedCustomers.length}/>
  </main><Footer/></>
}
