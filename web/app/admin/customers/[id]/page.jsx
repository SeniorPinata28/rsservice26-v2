import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';
import {getCustomer,getCustomerLeads,getCustomerVehicles} from '../../../../lib/db.js';
import CustomerEditForm from './CustomerEditForm';
import CustomerVehicleForm from './CustomerVehicleForm';

function formatDate(value){if(!value)return '—';try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function nameOf(c){return c?.full_name||c?.name||'Без имени'}
function noteValue(notes,label){return String(notes||'').match(new RegExp(label+':\\s*([^\\n]+)','i'))?.[1]||''}
function vehicleTitle(v){return v.car_text||[v.brand||v.make,v.model,v.year].filter(Boolean).join(' ')||v.vin||'Автомобиль без описания'}
function vehiclePlate(v){return v.plate_number||v.license_plate||noteValue(v.notes,'Госномер')||'не указан'}
function leadType(type){const map={parts_order:'Запчасть',installation_booking:'Установка',service_booking:'Сервис',general_callback:'Вопрос',parts_selection_request:'Подбор',part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос'};return map[type]||type||'Заявка'}
function Block({title,children}){return <section className="card" style={{padding:22,marginTop:18}}><h2 style={{marginTop:0}}>{title}</h2>{children}</section>}
function Row({label,value}){return <p style={{display:'grid',gridTemplateColumns:'180px 1fr',gap:12,margin:'10px 0'}}><b>{label}</b><span>{value||'—'}</span></p>}
function Stack({children}){return <div style={{display:'grid',gap:4}}>{children}</div>}
function Small({children}){return <small style={{display:'block',color:'#64748b',lineHeight:1.3}}>{children}</small>}

export default async function CustomerDetails({params}){
  const customer=await getCustomer(params.id);
  if(!customer)return <><Header/><main className="main"><section className="card"><h1>Клиент не найден</h1><Link className="btn primary" href="/admin/customers">Назад к клиентам</Link></section></main><Footer/></>;
  const [vehicles,leads]=await Promise.all([getCustomerVehicles(customer.id),getCustomerLeads(customer.id)]);
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">Клиент</span><h1>{nameOf(customer)}</h1><p className="muted">Карточка подтверждённого клиента. Это не личный кабинет клиента.</p></div><Link className="btn primary" href="/admin/customers">Назад к клиентам</Link></section>
    <Block title="Данные клиента">
      <Row label="Имя" value={nameOf(customer)}/>
      <Row label="Телефон" value={customer.phone}/>
      <Row label="Email" value={customer.email}/>
      <Row label="Статус" value={customer.status||'confirmed'}/>
      <Row label="Создан" value={formatDate(customer.created_at)}/>
      <Row label="Источник" value={customer.source}/>
    </Block>
    <Block title="Редактировать клиента">
      <CustomerEditForm customer={customer}/>
    </Block>
    <Block title="Добавить автомобиль">
      <CustomerVehicleForm customerId={customer.id}/>
    </Block>
    <Block title="Автомобили клиента">
      {vehicles.length===0&&<p className="muted">Автомобилей пока нет.</p>}
      {vehicles.map(v=><Link className="leadRow" href={`/admin/vehicles/${v.id}`} key={v.id}>
        <Stack><b>{vehicleTitle(v)}</b><Small>Госномер: {vehiclePlate(v)}</Small></Stack>
        <Stack><span>VIN: {v.vin||noteValue(v.notes,'VIN')||'не указан'}</span><Small>Пробег: {v.mileage||noteValue(v.notes,'Пробег')||'не указан'}</Small></Stack>
        <Stack><span>Карточка автомобиля</span><Small>История заявок и обслуживания</Small></Stack>
        <p>{v.notes||'Открыть автомобиль и связанные заявки.'}</p>
      </Link>)}
    </Block>
    <Block title="Заявки клиента">
      {leads.length===0&&<p className="muted">Заявок, связанных с клиентом, пока нет.</p>}
      {leads.map(lead=><Link className="leadRow" href={`/admin/leads/${lead.id}`} key={lead.id}>
        <Stack><b>{lead.public_id||'Без номера'}</b><Small>{formatDate(lead.created_at)}</Small></Stack>
        <Stack><span>{leadType(lead.type)}</span><Small>{lead.status||'—'}</Small></Stack>
        <Stack><span>{lead.vehicle_id?'С автомобилем':'Без автомобиля'}</span><Small>{lead.vin||lead.car_text||'данные авто не указаны'}</Small></Stack>
        <p>{lead.request_text||'Без текста'}</p>
      </Link>)}
    </Block>
  </main><Footer/></>
}