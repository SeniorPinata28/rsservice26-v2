'use client'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

function vehicleTitle(v){return v.car_text||[v.brand,v.model,v.year].filter(Boolean).join(' ')||v.vin||'Автомобиль'}

export default function VehicleLinkForm({leadId,vehicles=[]}){
  const router=useRouter();
  const [vehicleId,setVehicleId]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function submit(e){
    e.preventDefault();
    if(!vehicleId){setMessage('Выберите автомобиль');return}
    setBusy(true);setMessage('');
    try{
      const r=await fetch(`/api/admin/leads/${leadId}/vehicle`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({vehicle_id:vehicleId})});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(!data.ok){setMessage(data.details||data.error||'Не удалось привязать автомобиль');setBusy(false);return}
      setMessage('Автомобиль привязан к заявке');
      router.refresh();
    }catch(err){setMessage('Не удалось привязать автомобиль')}
    setBusy(false);
  }
  if(!vehicles.length)return <p className="muted">У клиента пока нет автомобилей. Сначала добавьте автомобиль в карточке клиента.</p>
  return <form className="form" onSubmit={submit} style={{marginTop:12}}>
    {message&&<p className="notice">{message}</p>}
    <select value={vehicleId} onChange={e=>setVehicleId(e.target.value)} required>
      <option value="">Выберите автомобиль клиента</option>
      {vehicles.map(v=><option key={v.id} value={v.id}>{vehicleTitle(v)}{v.vin?' · '+v.vin:''}</option>)}
    </select>
    <button className="btn primary" disabled={busy}>{busy?'Сохраняем...':'Привязать автомобиль к заявке'}</button>
  </form>
}
