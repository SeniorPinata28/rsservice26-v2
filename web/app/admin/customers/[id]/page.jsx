import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import Link from 'next/link';
import {getCustomer,getCustomerLeads,getCustomerVehicles} from '../../../../lib/db.js';
import CustomerEditForm from './CustomerEditForm';
import CustomerVehicleForm from './CustomerVehicleForm';
import CustomerCabinetAccessForm from './CustomerCabinetAccessForm';

function formatDate(value){if(!value)return '—';try{return new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return '—'}}
function nameOf(c){return c?.full_name||c?.name||'Без имени'}
function noteValue(notes,label){return String(notes||'').match(new RegExp(label+':\\s*([^\\n]+)','i'))?.[1]||''}
function vehicleTitle(v){return v.car_text||[v.brand||v.make,v.model,v.year].filter(Boolean).join(' ')||noteValue(v.notes,'Автомобиль')||v.vin||'Автомобиль'}
function vehiclePlate(v){return v.plate_number||v.license_plate||noteValue(v.notes,'Госномер')||'не указан'}
function leadType(type){const map={parts_order:'Запчасть',installation_booking:'Установка',service_booking:'Сервис',general_callback:'Вопрос',parts_selection_request:'Подбор',part:'Запчасть',installation:'Установка',service:'Сервис',question:'Вопрос'};return map[type]||type||'Заявка'}
function Block({title,children}){return <section className="card" style={{padding:22,marginTop:18}}><h2 style={{marginTop:0}}>{title}</h2>{children}</section>}
function Row({label,value}){return <p style={{display:'grid',gridTemplateColumns:'minmax(120px,140px) 1fr',gap:12,margin:'10px 0'}}><b>{label}</b><span>{value||'—'}</span></p>}
function Small({children}){return <small style={{display:'block',color:'#64748b',lineHeight:1.3}}>{children}</small>}
function editableCustomer(c){return {id:c.id,full_name:c.full_name||'',name:c.name||'',phone:c.phone||'',email:c.email||'',status:c.status||'confirmed',internal_notes:c.internal_notes||'',client_notes:c.client_notes||''}}
function NextAction({vehicles}){return <div className="notice">{vehicles.length===0?<><p style={{marginTop:0}}>Добавьте автомобиль клиента.</p><a className="btn primary" href="#add-vehicle">Добавить автомобиль</a></>:<><p style={{marginTop:0}}>Откройте автомобиль или вернитесь к заявке для привязки.</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="btn primary" href={`/admin/vehicles/${vehicles[0].id}`}>Открыть первый автомобиль</Link><Link className="btn" href="/admin">Назад в заявки</Link></div></>}</div>}

export default async function CustomerDetails({params}){
  const customer=await getCustomer(params.id);
  if(!customer)return <><Header/><main className="main"><section className="card"><h1>Клиент не найден</h1><Link className="btn primary" href="/admin">Назад</Link></section></main><Footer/></>;
  const [vehicles,leads]=await Promise.all([getCustomerVehicles(customer.id),getCustomerLeads(customer.id)]);
  return <><Header/><main className="main adminPage">
    <section className="adminHero"><div><span className="badge">Клиент</span><h1>{nameOf(customer)}</h1><p className="muted">{customer.phone||'телефон не указан'} · {vehicles.length} авто · {leads.length} заявок</p></div><Link className="btn primary" href="/admin">Назад</Link></section>
    <Block title="Следующее действие"><NextAction vehicles={vehicles}/></Block>
    <Block title="Данные клиента">
      <Row label="Имя" value={nameOf(customer)}/>
      <Row label="Телефон" value={customer.phone}/>
      <Row label="Email" value={customer.email}/>
      <Row label="Статус" value={customer.status||'confirmed'}/>
      <Row label="Создан" value={formatDate(customer.created_at)}/>
    </Block>
    <Block title="Доступ в личный кабинет">
      <p className="muted">Статус: {customer.cabinet_enabled===true?'доступ разрешён':'доступ отключён'} · Пароль: {customer.password_hash?'установлен':'не установлен'}</p>
      <CustomerCabinetAccessForm customer={{id:customer.id,cabinet_enabled:customer.cabinet_enabled===true,has_password:Boolean(customer.password_hash)}}/>
    </Block>
    <Block title="Автомобили клиента">
      {vehicles.length===0&&<p className="muted">Автомобилей пока нет.</p>}
      {vehicles.map(v=><Link className="leadRow" href={`/admin/vehicles/${v.id}`} key={v.id}>
        <div><b>{vehicleTitle(v)}</b><Small>Госномер: {vehiclePlate(v)}</Small></div>
        <div><span>VIN: {v.vin||noteValue(v.notes,'VIN')||'не указан'}</span><Small>Пробег: {v.mileage||noteValue(v.notes,'Пробег')||'не указан'}</Small></div>
        <p>Открыть автомобиль</p>
      </Link>)}
    </Block>
    <Block title="Добавить автомобиль"><div id="add-vehicle"><CustomerVehicleForm customerId={customer.id}/></div></Block>
    <Block title="Заявки клиента">
      {leads.length===0&&<p className="muted">Заявок пока нет.</p>}
      {leads.map(lead=><Link className="leadRow" href={`/admin/leads/${lead.id}`} key={lead.id}>
        <div><b>{lead.public_id||'Без номера'}</b><Small>{formatDate(lead.created_at)}</Small></div>
        <div><span>{leadType(lead.type)}</span><Small>{lead.status||'—'}</Small></div>
        <p>{lead.request_text||'Без текста'}</p>
      </Link>)}
    </Block>
    <Block title="Редактировать клиента"><CustomerEditForm customer={editableCustomer(customer)}/></Block>
  </main><Footer/></>
}
