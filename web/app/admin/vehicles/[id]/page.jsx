import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';
import {getCustomer,getVehicle,getVehicleLeads,getVehicleServiceHistory} from '../../../../lib/db.js';
import ServiceHistoryForm from './ServiceHistoryForm';
import VehicleEditForm from './VehicleEditForm';

function formatDate(value){if(!value)return '—';try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function noteValue(notes,label){return String(notes||'').match(new RegExp(label+':\\s*([^\\n]+)','i'))?.[1]||''}
function vehicleTitle(v){return v.car_text||[v.brand||v.make,v.model,v.year].filter(Boolean).join(' ')||noteValue(v.notes,'Автомобиль')||v.vin||'Автомобиль'}
function nameOf(c){return c?.full_name||c?.name||'Клиент'}
function leadType(type){const map={parts_order:'Запчасть',installation_booking:'Установка',service_booking:'Сервис',general_callback:'Вопрос',parts_selection_request:'Подбор',part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос'};return map[type]||type||'Заявка'}
function Block({title,children}){return <section className="card" style={{padding:22,marginTop:18}}><h2 style={{marginTop:0}}>{title}</h2>{children}</section>}
function Row({label,value}){return <p style={{display:'grid',gridTemplateColumns:'minmax(120px,140px) 1fr',gap:12,margin:'10px 0'}}><b>{label}</b><span>{value||'—'}</span></p>}
function isActive(lead){return ['new_contact','in_progress','waiting_client'].includes(lead.status)}
function NextAction({history,leads,customer}){const active=leads.find(isActive);if(history.length===0)return <div className="notice"><p style={{marginTop:0}}>Добавьте первую запись обслуживания.</p><a className="btn primary" href="#service-history-form">Добавить обслуживание</a></div>;if(active)return <div className="notice"><p style={{marginTop:0}}>Есть активные заявки по автомобилю.</p><Link className="btn primary" href={`/admin/leads/${active.id}`}>Открыть активную заявку</Link></div>;return <div className="notice"><p style={{marginTop:0}}>Можно добавить новую запись обслуживания или вернуться к клиенту.</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><a className="btn primary" href="#service-history-form">Добавить обслуживание</a>{customer&&<Link className="btn" href={`/admin/customers/${customer.id}`}>К клиенту</Link>}</div></div>}

export default async function VehicleDetails({params}){
  const {id}=await params;
  const vehicle=await getVehicle(id);
  if(!vehicle)return <><Header/><main className="main"><section className="card"><h1>Автомобиль не найден</h1><Link className="btn primary" href="/admin">Назад</Link></section></main><Footer/></>;
  const [customer,leads,history]=await Promise.all([vehicle.customer_id?getCustomer(vehicle.customer_id):null,getVehicleLeads(vehicle.id),getVehicleServiceHistory(vehicle.id)]);
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">Автомобиль</span><h1>{vehicleTitle(vehicle)}</h1><p className="muted">{customer?nameOf(customer):'без клиента'} · VIN: {vehicle.vin||noteValue(vehicle.notes,'VIN')||'не указан'} · Госномер: {vehicle.plate_number||vehicle.license_plate||noteValue(vehicle.notes,'Госномер')||'не указан'}</p></div>{customer?<Link className="btn primary" href={`/admin/customers/${customer.id}`}>К клиенту</Link>:<Link className="btn primary" href="/admin">Назад</Link>}</section>
    <Block title="Следующее действие"><NextAction history={history} leads={leads} customer={customer}/></Block>
    <Block title="Данные автомобиля">
      <Row label="Автомобиль" value={vehicleTitle(vehicle)}/>
      <Row label="Марка" value={vehicle.brand||vehicle.make}/>
      <Row label="Модель" value={vehicle.model}/>
      <Row label="Год" value={vehicle.year}/>
      <Row label="VIN" value={vehicle.vin||noteValue(vehicle.notes,'VIN')}/>
      <Row label="Госномер" value={vehicle.plate_number||vehicle.license_plate||noteValue(vehicle.notes,'Госномер')}/>
      <Row label="Пробег" value={vehicle.mileage||noteValue(vehicle.notes,'Пробег')}/>
      <Row label="Клиент" value={customer?nameOf(customer):'—'}/>
    </Block>
    <Block title="История обслуживания">
      {history.length===0&&<p className="muted">Записей обслуживания пока нет.</p>}
      {history.map(item=><div className="leadRow" key={item.id}><div><b>{item.title||item.service_name||'Работа'}</b><small>{formatDate(item.service_date||item.created_at)}</small></div><div><span>{item.mileage||'пробег не указан'}</span><small>{item.price||item.total||''}</small></div><p>{item.comment||item.description||'—'}{item.lead_id?' · заявка связана':''}</p></div>)}
    </Block>
    <Block title="Добавить обслуживание"><div id="service-history-form"><ServiceHistoryForm vehicleId={vehicle.id} leads={leads}/></div></Block>
    <Block title="Заявки по автомобилю">
      {leads.length===0&&<p className="muted">Заявок пока нет.</p>}
      {leads.map(lead=><Link className="leadRow" href={`/admin/leads/${lead.id}`} key={lead.id}>
        <div><b>{lead.public_id||'Без номера'}</b><small>{formatDate(lead.created_at)}</small></div>
        <div><span>{leadType(lead.type)}</span><small>{lead.status||'—'}</small></div>
        <p>{lead.request_text||'Без текста'}</p>
      </Link>)}
    </Block>
    <Block title="Редактировать автомобиль"><VehicleEditForm vehicle={vehicle}/></Block>
  </main><Footer/></>
}
