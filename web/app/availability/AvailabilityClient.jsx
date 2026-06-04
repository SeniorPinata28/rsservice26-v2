'use client'
import {useEffect,useMemo,useState} from 'react'
import {useSearchParams} from 'next/navigation'

const quickQueries=['фильтр масляный','фильтр воздушный','колодки передние','свечи зажигания','насос масляный','помпа','ремень приводной','стойка стабилизатора'];

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
function bestStock(part){return part?.stocks?.filter(s=>s.count>0).sort((a,b)=>(a.salePrice||999999)-(b.salePrice||999999))[0]||null}
function formatDate(value){
 if(!value)return '';
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return '';
 return date.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
}

export default function AvailabilityClient(){
 const params=useSearchParams();
 const [q,setQ]=useState(params.get('q')||'');
 const [vin,setVin]=useState('');
 const [loading,setLoading]=useState(false);
 const [result,setResult]=useState(null);
 const [showAll,setShowAll]=useState(false);
 const [sort,setSort]=useState('price');
 const [brand,setBrand]=useState('all');
 async function search(value=q){
  const query=String(value||'').trim();
  if(!query)return;
  setQ(query);setLoading(true);setResult(null);setShowAll(false);setBrand('all');
  try{
   const r=await fetch('/api/rossko/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:query})});
   const data=await r.json();
   setResult(data);
  }catch(e){setResult({ok:false,error:'Нет связи с сервером поиска'});}
  setLoading(false);
 }
 useEffect(()=>{const initial=params.get('q');if(initial)search(initial)},[]);
 function requestPart(p){
  const best=bestStock(p);
  const name=p?titleFor(p,q):'Запчасть';
  const brandName=cleanText(p?.brand,'');
  const clientPrice=best?.salePrice||p?.minSalePrice;
  const text=p?`Запрос запчасти:\n${name}\nБренд: ${brandName||'уточнить'}\nАртикул: ${p.partnumber||''}\nЦена клиенту: ${clientPrice?clientPrice+' ₽':'уточнить'}\nОстаток: ${p.totalCount||0}\nСклад: ${cleanText(best?.description,'уточнить')}\nДоставка: ${formatDate(best?.deliveryStart)||'уточнить'}\nVIN: ${vin||'не указан'}`:`Проверить запчасть:\nЗапрос: ${q}\nVIN: ${vin||'не указан'}`;
  sessionStorage.setItem('orderDraft',text);location.href='/contact';
 }
 const allParts=result?.parts||[];
 const available=allParts.filter(p=>p.totalCount>0);
 const brands=useMemo(()=>['all',...Array.from(new Set(available.map(p=>cleanText(p.brand,'')).filter(Boolean))).sort()],[result]);
 const visibleBase=showAll?allParts:available;
 const filtered=visibleBase.filter(p=>brand==='all'||cleanText(p.brand,'')===brand);
 const parts=[...filtered].sort((a,b)=>{
  if(sort==='stock')return (b.totalCount||0)-(a.totalCount||0);
  if(sort==='brand')return cleanText(a.brand,'').localeCompare(cleanText(b.brand,''),'ru');
  const ap=bestStock(a)?.salePrice||a.minSalePrice||999999;
  const bp=bestStock(b)?.salePrice||b.minSalePrice||999999;
  return ap-bp;
 });
 return <><section className="availabilityHero"><div><span className="eyebrow">Проверка цены и остатков</span><h1>Проверить наличие запчасти</h1><p>Введите артикул или точное название. Для общих слов лучше уточнять тип детали: “насос масляный”, “насос топливный”, “помпа”.</p></div></section><section className="main availabilitySearch"><div className="searchBox lightSearch"><div className="searchTabs"><span className="active">Артикул / название</span><span>VIN для менеджера</span><span>Быстрые запросы</span></div><div className="availabilityForm"><input className="input" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')search()}} placeholder="Например: 28113-1R100 или насос масляный"/><input className="input" value={vin} onChange={e=>setVin(e.target.value)} placeholder="VIN для заявки менеджеру (по желанию)"/><button className="btn primary" onClick={()=>search()} disabled={loading}>{loading?'Проверяем...':'Проверить наличие'}</button></div><div className="quickChips">{quickQueries.map(item=><button key={item} onClick={()=>search(item)}>{item}</button>)}</div></div></section>{result&&<section className="main section"><div className="resultsHead"><div><h2>{available.length?'Найдено в наличии':'Результат проверки'}</h2>{result.message&&<p className="muted">{cleanText(result.message,'')}</p>}</div><div className="resultStats"><b>{available.length}</b><span>в наличии из {allParts.length}</span></div></div>{result.error&&<div className="notice">{result.error}</div>}{!result.configured&&<div className="card emptyState"><h2>Проверка наличия временно недоступна</h2><p className="muted">Сервис проверки поставщиков временно недоступен. Можно отправить запрос менеджеру.</p><button className="btn primary" onClick={()=>requestPart(null)}>Отправить менеджеру</button></div>}{result.configured&&allParts.length===0&&<div className="card emptyState"><h2>Ничего не найдено</h2><p className="muted">Запрос слишком общий или такой позиции нет в выдаче поставщиков. Попробуйте уточнить: “насос масляный”, “насос топливный”, “помпа”, либо отправьте запрос менеджеру.</p><div className="quickChips inline">{quickQueries.slice(4,7).map(item=><button key={item} onClick={()=>search(item)}>{item}</button>)}</div><button className="btn primary" onClick={()=>requestPart(null)}>Отправить запрос</button></div>}{allParts.length>0&&available.length===0&&<div className="card emptyState"><h2>Есть совпадения, но нет остатков</h2><p className="muted">Можно отправить запрос менеджеру для ручной проверки.</p><button className="btn primary" onClick={()=>requestPart(null)}>Отправить запрос</button></div>}{available.length>0&&<div className="filters shopFilters"><button className="btn" onClick={()=>setShowAll(!showAll)}>{showAll?'Только в наличии':`Все ${allParts.length} позиций`}</button><select value={sort} onChange={e=>setSort(e.target.value)}><option value="price">Сначала дешевле</option><option value="stock">Больше остаток</option><option value="brand">По бренду</option></select><select value={brand} onChange={e=>setBrand(e.target.value)}><option value="all">Все бренды</option>{brands.filter(b=>b!=='all').map(b=><option key={b} value={b}>{b}</option>)}</select></div>}{parts.length>0&&<div className="shopGrid">{parts.map((p,i)=>{const best=bestStock(p);const name=titleFor(p,q);const brandName=cleanText(p.brand,'Бренд не указан');const clientPrice=best?.salePrice||p.minSalePrice;return <article className="shopCard" key={(p.guid||p.partnumber||'p')+i}><div className="productTop"><span className={p.totalCount>0?'badge':'muted'}>{p.totalCount>0?'В наличии':'Нет остатка'}</span>{best?.deliveryStart&&<span className="deliveryPill">доставка {formatDate(best.deliveryStart)}</span>}</div><h3>{name}</h3><p className="muted productMeta">{brandName} · {p.partnumber}</p><div className="shopPriceRow"><p className="price">{clientPrice?`${clientPrice} ₽`:'цену уточнить'}</p><p>{p.totalCount>0?<span className="stock">{p.totalCount} шт.</span>:<span className="muted">нет</span>}</p></div>{best?.description&&<p className="muted">{cleanText(best.description,'')}</p>}<button className="btn primary" onClick={()=>requestPart(p)}>Уточнить / заказать</button></article>})}</div>}</section>}</>}
