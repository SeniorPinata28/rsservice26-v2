'use client'
import {useRouter} from 'next/navigation'
import {useEffect,useState} from 'react'

const leadStatusLabels={new_contact:'Новая',in_progress:'В работе',waiting_client:'Ждём ответа клиента',completed:'Выполнена',declined:'Отказ'};
const typeLabels={parts_order:'Запчасть',installation_booking:'Установка',service_booking:'Запись на сервис',general_callback:'Вопрос менеджеру',parts_selection_request:'Подбор',cabinet_data_correction:'Исправить данные',cabinet_vehicle_request:'Добавить автомобиль',cabinet_request:'Заявка из кабинета',part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос'};
const emptyRequest={type:'service_booking',vehicle_id:'',car_text:'',vin:'',plate_number:'',comment:''};

function formatDate(value){if(!value)return '—';try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function value(v){return v===undefined||v===null||v===''?'—':String(v)}
function vehicleName(vehicle){return vehicle?.car_text||[vehicle?.brand,vehicle?.model,vehicle?.year].filter(Boolean).join(' ')||'Автомобиль'}
function vehicleById(vehicles,id){return vehicles.find(v=>String(v.id)===String(id))||null}
function customerSnapshot(customer){return [`Имя: ${value(customer?.name)}`,`Телефон: ${value(customer?.phone)}`,`Email: ${value(customer?.email)}`,`Создан: ${formatDate(customer?.created_at)}`].join('\n')}

export default function CabinetClient(){
  const router=useRouter();
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [requestBusy,setRequestBusy]=useState(false);
  const [requestMessage,setRequestMessage]=useState('');
  const [requestForm,setRequestForm]=useState(emptyRequest);
  const [data,setData]=useState({customer:null,vehicles:[],leads:[],service_history:[]});

  async function load(){
    setLoading(true);setError('');
    try{
      const r=await fetch('/api/cabinet/me',{cache:'no-store'});
      const json=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(r.status===401){router.replace('/cabinet/login');return}
      if(!json.ok){setError(json.error||'Не удалось загрузить кабинет');return}
      setData({customer:json.customer||null,vehicles:Array.isArray(json.vehicles)?json.vehicles:[],leads:Array.isArray(json.leads)?json.leads:[],service_history:Array.isArray(json.service_history)?json.service_history:[]});
    }catch(err){setError('Не удалось загрузить кабинет')}
    finally{setLoading(false)}
  }

  useEffect(()=>{load()},[]);

  async function logout(){
    setBusy(true);setError('');
    try{await fetch('/api/cabinet/logout',{method:'POST'});router.replace('/cabinet/login');router.refresh()}
    catch(err){setError('Не удалось выйти из кабинета')}
    finally{setBusy(false)}
  }

  async function sendCabinetRequest(payload,successText){
    setRequestBusy(true);setRequestMessage('');
    try{
      const r=await fetch('/api/cabinet/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const json=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(r.status===401){router.replace('/cabinet/login');return}
      if(!json.ok){setRequestMessage(json.error||'Не удалось отправить заявку');return}
      setRequestMessage(successText||'Заявка отправлена. Менеджер увидит её в админке.');
      setRequestForm(emptyRequest);
      await load();
    }catch(err){setRequestMessage('Не удалось отправить заявку')}
    finally{setRequestBusy(false)}
  }

  async function submitRequest(e){
    e.preventDefault();
    await sendCabinetRequest(requestForm,'Заявка отправлена. Менеджер увидит её в админке.');
  }
  async function reportDataError(){
    const comment=window.prompt('Что нужно исправить в ваших данных?');
    if(comment===null)return;
    await sendCabinetRequest({type:'cabinet_data_correction',comment:`Клиент просит исправить данные.\nТелефон клиента: ${data.customer?.phone||'не указан'}\nТекущие данные:\n${customerSnapshot(data.customer)}\nКомментарий клиента: ${comment||'не указан'}`},'Заявка на исправление данных отправлена менеджеру.');
  }
  async function requestVehicleByManager(){
    const comment=window.prompt('Напишите автомобиль, VIN, госномер и комментарий для менеджера.');
    if(comment===null)return;
    await sendCabinetRequest({type:'cabinet_vehicle_request',comment,car_text:comment},'Заявка на добавление автомобиля отправлена менеджеру.');
  }

  const {customer,vehicles,leads,service_history:history}=data;

  if(loading)return <section className="card emptyState"><span className="badge">Личный кабинет</span><h1>Загружаем кабинет</h1><p className="muted">Проверяем сессию и получаем данные клиента.</p></section>
  if(error)return <section className="card emptyState"><span className="badge">Личный кабинет</span><h1>Ошибка загрузки</h1><p className="notice">{error}</p><div className="cardActions"><button className="btn primary" onClick={load}>Повторить</button><button className="btn" onClick={logout}>Войти заново</button></div></section>

  return <>
    <section className="hero"><span className="badge">Личный кабинет</span><h1>Кабинет клиента RSService26</h1><p>Ваши автомобили, заявки и история обслуживания. Данные доступны только по подтверждённой сессии.</p></section>

    <section className="section" style={{display:'grid',gap:18}}>
      <section className="card">
        <div className="sectionHead"><div><h2>Мои данные</h2><p className="muted">Клиент подтверждён менеджером RSService26.</p></div><button className="btn" disabled={busy} onClick={logout}>{busy?'Выходим...':'Выйти'}</button></div>
        <div className="leadRow" style={{cursor:'default'}}><div><b>{value(customer?.name)}</b><small>Имя</small></div><div><span>{value(customer?.phone)}</span><small>Телефон</small></div><div><span>{value(customer?.email)}</span><small>Email</small></div><p>Создан: {formatDate(customer?.created_at)}</p></div>
        <button className="btn" disabled={requestBusy} onClick={reportDataError}>{requestBusy?'Отправляем...':'Сообщить об ошибке'}</button>
      </section>

      <section className="card">
        <div className="sectionHead"><div><h2>Мои автомобили</h2><p className="muted">Автомобиль добавляет менеджер после проверки данных.</p></div><button className="btn" disabled={requestBusy} onClick={requestVehicleByManager}>{requestBusy?'Отправляем...':'Добавить автомобиль через менеджера'}</button></div>
        {vehicles.length===0&&<p className="muted">Автомобили пока не добавлены. После первого обслуживания менеджер добавит автомобиль в базу.</p>}
        {vehicles.map(v=><article className="leadRow" key={v.id} style={{cursor:'default'}}><div><b>{vehicleName(v)}</b><small>{[v.brand,v.model,v.year].filter(Boolean).join(' ')||'Автомобиль'}</small></div><div><span>VIN: {value(v.vin)}</span><small>Госномер: {value(v.plate_number)}</small></div><p>Пробег: {value(v.mileage)}</p></article>)}
      </section>

      <section className="card">
        <h2>Мои заявки</h2>
        {leads.length===0&&<p className="muted">У вас пока нет связанных заявок.</p>}
        {leads.map(lead=>{const v=vehicleById(vehicles,lead.vehicle_id);return <article className="leadRow" key={lead.id} style={{cursor:'default'}}><div><b>{lead.public_id||'Без номера'}</b><small>{formatDate(lead.created_at)}</small></div><div><span>{typeLabels[lead.type]||lead.type||'Заявка'}</span><small>{leadStatusLabels[lead.status]||lead.status||'—'}</small></div><div><span>{v?vehicleName(v):(lead.car_text||'Авто не указано')}</span><small>{lead.vin||'VIN не указан'}</small></div><p>{lead.request_text||'Без текста'}{lead.manager_comment_last?`\nКомментарий: ${lead.manager_comment_last}`:''}</p></article>})}
      </section>

      <section className="card">
        <h2>История обслуживания</h2>
        {history.length===0&&<p className="muted">История обслуживания пока не заполнена.</p>}
        {history.map(item=>{const v=vehicleById(vehicles,item.vehicle_id);return <article className="leadRow" key={item.id} style={{cursor:'default'}}><div><b>{item.title||'Работа'}</b><small>{formatDate(item.service_date)}</small></div><div><span>{v?vehicleName(v):'Автомобиль'}</span><small>Пробег: {value(item.mileage)}</small></div><p>{item.description||'Описание не заполнено'}{item.price?`\nСумма: ${item.price}`:''}</p></article>})}
      </section>

      <section className="card">
        <h2>Оставить новую заявку</h2>
        <form className="form" onSubmit={submitRequest}>
          {requestMessage&&<p className="notice">{requestMessage}</p>}
          <select className="input" value={requestForm.type} onChange={e=>setRequestForm({...requestForm,type:e.target.value})}>
            <option value="parts_order">Запчасть</option>
            <option value="service_booking">Запись на сервис</option>
            <option value="general_callback">Вопрос менеджеру</option>
            <option value="cabinet_data_correction">Исправить данные</option>
            <option value="cabinet_vehicle_request">Добавить автомобиль</option>
          </select>
          <select className="input" value={requestForm.vehicle_id} onChange={e=>setRequestForm({...requestForm,vehicle_id:e.target.value})}>
            <option value="">Без выбора автомобиля</option>
            {vehicles.map(v=><option key={v.id} value={v.id}>{vehicleName(v)}{v.vin?' · '+v.vin:''}</option>)}
          </select>
          <input className="input" value={requestForm.car_text} onChange={e=>setRequestForm({...requestForm,car_text:e.target.value})} placeholder="Автомобиль, если его нет в списке"/>
          <input className="input" value={requestForm.vin} onChange={e=>setRequestForm({...requestForm,vin:e.target.value})} placeholder="VIN, если нужно"/>
          <input className="input" value={requestForm.plate_number} onChange={e=>setRequestForm({...requestForm,plate_number:e.target.value})} placeholder="Госномер, если нужно"/>
          <textarea className="input" required value={requestForm.comment} onChange={e=>setRequestForm({...requestForm,comment:e.target.value})} placeholder="Текст заявки"/>
          <button className="btn primary" disabled={requestBusy}>{requestBusy?'Отправляем...':'Отправить заявку'}</button>
        </form>
      </section>
    </section>
  </>
}