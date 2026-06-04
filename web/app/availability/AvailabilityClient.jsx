'use client'
import {useState} from 'react'

const MARKUP=1.25;

function cleanText(value, fallback=''){
 const text=String(value||'').trim();
 if(!text)return fallback;
 if(/[�]{2,}|6{4,}|Р[¤љЋ™њќЎ]/.test(text))return fallback;
 return text;
}
function titleFor(part,query){
 const name=cleanText(part?.name,'');
 if(name)return name;
 const brand=cleanText(part?.brand,'');
 const article=part?.partnumber||'';
 const base=cleanText(query,'запчасть');
 return `${base}${brand?' · '+brand:''}${article?' · '+article:''}`;
}
function salePrice(value){
 const n=Number(String(value||'').replace(',','.'));
 if(!n)return null;
 return Math.ceil(n*MARKUP);
}

export default function AvailabilityClient(){
 const [q,setQ]=useState('');
 const [vin,setVin]=useState('');
 const [loading,setLoading]=useState(false);
 const [result,setResult]=useState(null);
 const [showAll,setShowAll]=useState(false);
 async function search(){
  if(!q.trim())return;
  setLoading(true);setResult(null);setShowAll(false);
  try{
   const r=await fetch('/api/rossko/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q})});
   const data=await r.json();
   setResult(data);
  }catch(e){setResult({ok:false,error:'Нет связи с сервером поиска'});}
  setLoading(false);
 }
 function requestPart(p){
  const best=p?.stocks?.find(s=>s.count>0)||null;
  const name=p?titleFor(p,q):'Запчасть';
  const brand=cleanText(p?.brand,'');
  const clientPrice=salePrice(best?.price||p?.minPrice);
  const text=p?`Запрос запчасти Rossko:\n${name}\nБренд: ${brand||'уточнить'}\nАртикул: ${p.partnumber||''}\nЦена клиенту: ${clientPrice?clientPrice+' ₽':'уточнить'}\nОстаток: ${p.totalCount||0}\nСклад: ${cleanText(best?.description,'уточнить')}\nVIN: ${vin||'не указан'}`:`Проверить запчасть:\nЗапрос: ${q}\nVIN: ${vin||'не указан'}`;
  sessionStorage.setItem('orderDraft',text);location.href='/contact';
 }
 const allParts=result?.parts||[];
 const sorted=[...allParts].sort((a,b)=>(b.totalCount>0)-(a.totalCount>0)||(a.minPrice||999999)-(b.minPrice||999999));
 const available=sorted.filter(p=>p.totalCount>0);
 const parts=showAll?sorted:available;
 return <><section className="hero"><span className="badge">Rossko API</span><h1>Проверить наличие запчасти</h1><p>Введите артикул, название или VIN. Сайт проверит цену и наличие через Rossko.</p></section><section className="section card"><div className="form"><input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Артикул, название детали или VIN"/><input className="input" value={vin} onChange={e=>setVin(e.target.value)} placeholder="VIN для заявки менеджеру (по желанию)"/><button className="btn primary" onClick={search} disabled={loading}>{loading?'Проверяем...':'Проверить через Rossko'}</button></div></section>{result&&<section className="section"><div className="sectionHead"><div><h2>В наличии</h2>{result.message&&<p className="muted">{cleanText(result.message,'')}</p>}</div><span className="badge">есть {available.length} из {sorted.length}</span></div>{result.error&&<div className="notice">{result.error}</div>}{!result.configured&&<div className="card"><h2>Rossko API ещё не настроен</h2><p className="muted">Нужно добавить ROSSKO_KEY1, ROSSKO_KEY2, ROSSKO_DELIVERY_ID и ROSSKO_ADDRESS_ID в Vercel.</p><button className="btn primary" onClick={()=>requestPart(null)}>Отправить менеджеру</button></div>}{result.configured&&sorted.length===0&&<div className="card"><h2>Ничего не найдено</h2><p className="muted">Запрос можно отправить менеджеру для ручной проверки.</p><button className="btn primary" onClick={()=>requestPart(null)}>Отправить запрос</button></div>}{sorted.length>0&&available.length===0&&<div className="card"><h2>Есть совпадения, но нет остатков</h2><p className="muted">Можно отправить запрос менеджеру для ручной проверки.</p><button className="btn primary" onClick={()=>requestPart(null)}>Отправить запрос</button></div>}{available.length>0&&<div className="toolbar"><button className="btn" onClick={()=>setShowAll(!showAll)}>{showAll?'Показать только в наличии':`Показать все ${sorted.length} позиций`}</button></div>}{parts.length>0&&<div className="grid">{parts.map((p,i)=>{const best=p.stocks?.find(s=>s.count>0);const name=titleFor(p,q);const brand=cleanText(p.brand,'Бренд не указан');const clientPrice=salePrice(best?.price||p.minPrice);return <article className="card" key={(p.guid||p.partnumber||'p')+i}><span className={p.totalCount>0?'badge':'muted'}>{p.totalCount>0?'В наличии':'Нет остатка'}</span><h3>{name}</h3><p className="muted">{brand} · {p.partnumber}</p><p className="price">{clientPrice?`${clientPrice} ₽`:'цену уточнить'}</p><p className="muted">Цена с наценкой RSService26</p><p>{p.totalCount>0?<span className="stock">Остаток: {p.totalCount} шт.</span>:<span className="muted">Остатка нет</span>}</p>{best?.description&&<p className="muted">{cleanText(best.description,'')}</p>}<button className="btn primary" onClick={()=>requestPart(p)}>Уточнить / заказать</button></article>})}</div>}</section>}</>}
