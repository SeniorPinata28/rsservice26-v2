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
  const [code,setCode]=useState('');
  const [step,setStep]=useState('phone');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [info,setInfo]=useState('');
  const [devCode,setDevCode]=useState('');
  const [customer,setCustomer]=useState(null);
  const [leads,setLeads]=useState([]);

  async function requestCode(e){
    e.preventDefault();
    setError('');setInfo('');setDevCode('');setLoading(true);setCustomer(null);setLeads([]);
    try{
      const r=await fetch('/api/cabinet/request-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setError(data.error||'Не удалось отправить код');if(data.devCode)setDevCode(data.devCode);return}
      setInfo(data.message||'Код отправлен. Введите его для входа.');
      if(data.devCode)setDevCode(data.devCode);
      setStep('code');
    }catch(err){setError('Не удалось отправить код')}
    finally{setLoading(false)}
  }

  async function submitCode(e){
    e.preventDefault();
    setError('');setInfo('');setLoading(true);setCustomer(null);setLeads([]);
    try{
      const r=await fetch('/api/cabinet/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,code})});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setError(data.error||'Кабинет недоступен');return}
      setCustomer(data.customer);
      setLeads(Array.isArray(data.leads)?data.leads:[]);
      setStep('cabinet');
      setCode('');setDevCode('');
    }catch(err){setError('Не удалось открыть кабинет')}
    finally{setLoading(false)}
  }

  function reset(){
    setCustomer(null);setLeads([]);setError('');setInfo('');setCode('');setDevCode('');setStep('phone');
  }

  return <>
    <section className="hero"><span className="badge">Личный кабинет</span><h1>Кабинет клиента RSService26</h1><p>Доступ открыт только подтверждённым клиентам. Вход выполняется по телефону и одноразовому коду.</p></section>
    <section className="section split">
      <aside className="card">
        <h2>Правило доступа</h2>
        <p className="muted">Кабинет не создаёт регистрацию для всех подряд. Сначала менеджер подтверждает клиента в админке, затем клиент подтверждает владение телефоном кодом.</p>
        <div className="steps"><p><b>1.</b> Клиент вводит телефон.</p><p><b>2.</b> Система отправляет одноразовый код.</p><p><b>3.</b> После проверки кода показываются только заявки этого customer_id.</p></div>
      </aside>
      <section className="card">
        {step==='phone'&&<form className="form" onSubmit={requestCode}>
          <h2>Вход по телефону</h2>
          {error&&<p className="notice">{error}</p>}
          {info&&<p className="notice">{info}</p>}
          {devCode&&<p className="notice">Код для локальной проверки: <b>{devCode}</b></p>}
          <input className="input" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Телефон клиента"/>
          <button className="btn primary" disabled={loading}>{loading?'Отправляем...':'Получить код'}</button>
        </form>}
        {step==='code'&&<form className="form" onSubmit={submitCode}>
          <h2>Введите код</h2>
          {error&&<p className="notice">{error}</p>}
          {info&&<p className="notice">{info}</p>}
          {devCode&&<p className="notice">Код для локальной проверки: <b>{devCode}</b></p>}
          <input className="input" required value={code} onChange={e=>setCode(e.target.value)} placeholder="6-значный код" inputMode="numeric" maxLength={6}/>
          <button className="btn primary" disabled={loading}>{loading?'Проверяем...':'Открыть кабинет'}</button>
          <button type="button" className="btn" disabled={loading} onClick={()=>setStep('phone')}>Изменить телефон</button>
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
