'use client'
import {useState} from 'react'

export default function AvailabilityClient(){
 const [q,setQ]=useState('');
 const [vin,setVin]=useState('');
 const [loading,setLoading]=useState(false);
 const [result,setResult]=useState(null);
 async function search(){
  if(!q.trim())return;
  setLoading(true);setResult(null);
  try{
   const r=await fetch('/api/rossko/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q})});
   const data=await r.json();
   setResult(data);
  }catch(e){setResult({ok:false,error:'Нет связи с сервером поиска'});}
  setLoading(false);
 }
 function requestPart(p){
  const text=p?`Запрос запчасти Rossko:\n${p.name||''}\nБренд: ${p.brand||''}\nАртикул: ${p.partnumber||''}\nЦена от: ${p.minPrice||'уточнить'}\nОстаток: ${p.totalCount||0}\nVIN: ${vin||'не указан'}`:`Проверить запчасть:\nЗапрос: ${q}\nVIN: ${vin||'не указан'}`;
  sessionStorage.setItem('orderDraft',text);location.href='/contact';
 }
 const parts=result?.parts||[];
 return <><section className="hero"><span className="badge">Rossko API</span><h1>Проверить наличие запчасти</h1><p>Введите артикул, название или VIN. Сайт запросит наличие через серверное подключение к Rossko. Если результат не найден — заявка уйдёт менеджеру.</p></section><section className="section card"><div className="form"><input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Артикул, название детали или VIN"/><input className="input" value={vin} onChange={e=>setVin(e.target.value)} placeholder="VIN для заявки менеджеру (по желанию)"/><button className="btn primary" onClick={search} disabled={loading}>{loading?'Проверяем...':'Проверить через Rossko'}</button></div></section>{result&&<section className="section"><div className="sectionHead"><h2>Результаты Rossko</h2><span className="badge">{parts.length} позиций</span></div>{!result.configured&&<div className="card"><h2>Rossko API ещё не настроен</h2><p className="muted">Нужно добавить ROSSKO_KEY1, ROSSKO_KEY2, ROSSKO_DELIVERY_ID и ROSSKO_ADDRESS_ID в Vercel.</p><button className="btn primary" onClick={()=>requestPart(null)}>Отправить менеджеру</button></div>}{result.configured&&parts.length===0&&<div className="card"><h2>Ничего не найдено</h2><p className="muted">Запрос можно отправить менеджеру для ручной проверки.</p><button className="btn primary" onClick={()=>requestPart(null)}>Отправить запрос</button></div>}{parts.length>0&&<table className="table"><thead><tr><th>Запчасть</th><th>Артикул</th><th>Цена</th><th>Остаток</th><th>Действие</th></tr></thead><tbody>{parts.map((p,i)=><tr key={(p.guid||p.partnumber||'p')+i}><td><b>{p.name}</b><br/><span className="muted">{p.brand}</span></td><td>{p.partnumber}</td><td>{p.minPrice?`${p.minPrice} ₽`:'уточнить'}</td><td>{p.totalCount>0?<span className="stock">{p.totalCount} шт.</span>:<span className="muted">нет</span>}</td><td><button className="btn primary" onClick={()=>requestPart(p)}>Уточнить / заказать</button></td></tr>)}</tbody></table>}</section>}</>}
