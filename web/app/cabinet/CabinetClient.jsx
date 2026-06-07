'use client'
import {useState} from 'react'

const leadStatusLabels={new_contact:'Новая заявка',in_progress:'В работе',waiting_client:'Ждём клиента',completed:'Выполнена',declined:'Отказ'};
const typeLabels={parts_order:'Запчасть',installation_booking:'Установка',service_booking:'Сервис',general_callback:'Вопрос',parts_selection_request:'Подбор',part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос'};

function formatDate(value){
  if(!value)return '—';
  try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}
}

export default function CabinetClient(){
  const [phone,setPhone]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [customer,setCustomer]=useState(null);
  const [leads,setLeads]=useState([]);

  async function submit(e){
    e.preventDefault();
    setError('');setLoading(true);setCustomer(null);setLeads([]);
    try{
      const r=await fetch('/api/cabinet/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setError(data.error||'Кабинет недоступен');return}
      setCustomer(data.customer);
      setLeads(Array.isArray(data.leads)?data.leads:[]);
    }catch(err){setError('Не удалось открыть кабинет')}
    finally{setLoading(false)}
  }

  function reset(){
    setCustomer(null);setLeads([]);setError('');
  }

  return <>
    <section className="hero"><span className="badge">Личный кабинет</span><h1>Кабинет клиента RSService26</h1><p>Доступ открыт только подтверждённым клиентам. Введите телефон, который менеджер привязал к карточке клиента.</p></section>
    <section className="section split">
      <aside className="card">
        <h2>Правило доступа</h2>
        <p className="muted">Кабинет не создаёт регистрацию для всех подряд. Сначала менеджер подтверждает клиента в админке, затем заявки клиента становятся доступны по телефону.</p>
        <div className="steps"><p><b>1.</b> Клиент оставляет заявку.</p><p><b>2.</b> Менеджер подтверждает клиента.</p><p><b>3.</b> Кабинет показывает связанные заявки.</p></div>
      </aside>
      <section className="card">
        {!customer&&<form className="form" onSubmit={submit}>
          <h2>Вход по телефону</h2>
          {error&&<p className="notice">{error}</p>}
          <input className="input" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Телефон клиента"/>
          <button className="btn primary" disabled={loading}>{loading?'Проверяем...':'Открыть кабинет'}</button>
        </form>}
        {customer&&<div>
          <div className="sectionHead"><div><h2>{customer.name}</h2><p className="muted">{customer.phone} · {customer.status}</p></div><button className="btn" onClick={reset}>Выйти</button></div>
          <h3>Заявки клиента</h3>
          {leads.length===0&&<p className="muted">У клиента пока нет связанных заявок. Менеджер должен подтвердить клиента и связать заявки через customer_id.</p>}
          {leads.map(lead=><article className="leadRow" key={lead.id} style={{cursor:'default'}}>
            <div><b>{lead.public_id||'Без номера'}</b><small>{formatDate(lead.created_at)}</small></div>
            <div><span>{typeLabels[lead.type]||lead.type||'Заявка'}</span><small>{leadStatusLabels[lead.status]||lead.status||'—'}</small></div>
            <div><span>{lead.car_text||'Авто не указано'}</span><small>{lead.vin||'VIN не указан'}</small></div>
            <p>{lead.request_text||'Без текста'}</p>
          </article>)}
        </div>}
      </section>
    </section>
  </>
}
