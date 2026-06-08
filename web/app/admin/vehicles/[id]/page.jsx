import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';
import {getCustomer,getVehicle,getVehicleLeads,getVehicleServiceHistory} from '../../../../lib/db.js';
import ServiceHistoryForm from './ServiceHistoryForm';
import VehicleEditForm from './VehicleEditForm';

function formatDate(value){if(!value)return '—';try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function noteValue(notes,label){return String(notes||'').match(new RegExp(label+':\\s*([^\\n]+)','i'))?.[1]||''}
function vehicleTitle(v){return v.car_text||[v.brand||v.make,v.model,v.year].filter(Boolean).join(' ')||v.vin||'Автомобиль'}
function nameOf(c){return c?.full_name||c?.name||'Клиент'}
function leadType(type){const map={parts_order:'Запчасть',installation_booking:'Установка',service_booking:'Сервис',general_callback:'Вопрос',parts_selection_request:'Подбор',part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос'};return map[type]||type||'Заявка'}
function Block({title,children}){return <section className="card" style={{padding:22,marginTop:18}}><h2 style={{marginTop:0}}>{title}</h2>{children}</section>}
function Row({label,value}){return <p style={{display:'grid',gridTemplateColumns:'180px 1fr',gap:12,margin:'10px 0'}}><b>{label}</b><span>{value||'—'}</span></p>}

export default async function VehicleDetails({params}){
  const vehicle=await getVehicle(params.id);
  if(!vehicle)return <><Header/><main className="main"><section className="card"><h1>Автомобиль не найден</h1><Link className="btn primary" href="/admin">Назад в админку</Link></section></main><Footer/></>;
  const [customer,leads,history]=await Promise.all([vehicle.customer_id?getCustomer(vehicle.customer_id):null,getVehicleLeads(vehicle.id),getVehicleServiceHistory(vehicle.id)]);
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">Автомобиль</span><h1>{vehicleTitle(vehicle)}</h1><p className="muted">Карточка автомобиля и история заявок, связанных с этим автомобилем.</p></div>{customer?<Link className="btn primary" href={`/admin/customers/${customer.id}`}>К клиенту</Link>:<Link className="btn primary" href="/admin">Назад</Link>}</section>
    <Block title="Данные автомобиля">
      <Row label="Автомобиль" value={vehicleTitle(vehicle)}/>
      <Row label="Марка" value={vehicle.brand||vehicle.make}/>
      <Row label="Модель" value={vehicle.model}/>
      <Row label="Год" value={vehicle.year}/>
      <Row label="VIN" value={vehicle.vin||noteValue(vehicle.notes,'VIN')}/>
      <Row label="Госномер" value={vehicle.plate_number||vehicle.license_plate||noteValue(vehicle.notes,'Госномер')}/>
      <Row label="Пробег" value={vehicle.mileage||noteValue(vehicle.notes,'Пробег')}/>
      <Row label="Клиент" value={customer?nameOf(customer):'не привязан'}/>
    </Block>
    <Block title="Редактировать данные автомобиля">
      <VehicleEditForm vehicle={vehicle}/>
    </Block>
    <Block title="Добавить запись обслуживания">
      <ServiceHistoryForm vehicleId={vehicle.id}/>
    </Block>
    <Block title="История обслуживания">
      {history.length===0&&<p className="muted">Отдельная история обслуживания пока не заполнена.</p>}
      {history.map(item=><div className="leadRow" key={item.id}><div><b>{item.title||item.service_name||'Работа'}</b><small>{formatDate(item.service_date||item.created_at)}</small></div><div><span>{item.mileage||'пробег не указан'}</span><small>{item.price||item.total||''}</small></div><p>{item.comment||item.description||'—'}</p></div>)}
    </Block>
    <Block title="История заявок по автомобилю">
      {leads.length===0&&<p className="muted">Заявок по этому автомобилю пока нет.</p>}
      {leads.map(lead=><Link className="leadRow" href={`/admin/leads/${lead.id}`} key={lead.id}>
        <div><b>{lead.public_id||'Без номера'}</b><small>{formatDate(lead.created_at)}</small></div>
        <div><span>{leadType(lead.type)}</span><small>{lead.status||'—'}</small></div>
        <div><span>{lead.phone||'телефон не указан'}</span><small>{lead.name||'имя не указано'}</small></div>
        <p>{lead.request_text||'Без текста'}</p>
      </Link>)}
    </Block>
  </main><Footer/></>
}
