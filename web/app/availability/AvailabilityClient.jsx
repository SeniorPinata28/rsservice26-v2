'use client'
import Image from 'next/image'
import {useEffect,useMemo,useState} from 'react'
import {imageForPart} from '../../lib/part-images'

const quickQueries=['фильтр масляный','фильтр воздушный','колодки передние','свечи зажигания','насос масляный','помпа','ремень приводной','стойка стабилизатора'];
const generalHints={насос:['насос масляный','насос топливный','насос ГУР','насос омывателя','помпа'],фильтр:['фильтр масляный','фильтр воздушный','фильтр салонный','фильтр топливный'],колодки:['колодки передние','колодки задние','колодки Hyundai','колодки Kia']};
const emptyLeadForm={name:'',phone:'',vin:'',comment:''};

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
function formatDate(value){if(!value)return '';const date=new Date(value);if(Number.isNaN(date.getTime()))return '';return date.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
function hintsFor(query){const q=String(query||'').trim().toLowerCase();return generalHints[q]||[]}

export default function AvailabilityClient({initialQuery=''}){
  const [q,setQ]=useState(initialQuery||'');
  const [vin,setVin]=useState('');
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [showAll,setShowAll]=useState(false);
  const [sort,setSort]=useState('price');
  const [brand,setBrand]=useState('all');
  const [requestState,setRequestState]=useState('');
  const [pendingRequest,setPendingRequest]=useState(null);
  const [leadForm,setLeadForm]=useState(emptyLeadForm);
  const [sending,setSending]=useState(false);

  async function search(value=q){
    const query=String(value||'').trim();
    if(!query)return;
    setQ(query);setLoading(true);setResult(null);setShowAll(false);setBrand('all');setRequestState('');setPendingRequest(null);
    try{
      const r=await fetch('/api/availability-search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:query})});
      const data=await r.json();
      setResult(data);
    }catch(e){setResult({ok:false,error:'Нет связи с сервером поиска',parts:[],rawCount:0})}
    setLoading(false);
  }

  useEffect(()=>{if(initialQuery)search(initialQuery)},[initialQuery]);

  function buildRequest(part,mode='part'){
    const best=bestStock(part);
    const name=part?titleFor(part,q):'Запчасть';
    const brandName=cleanText(part?.brand,'');
    const clientPrice=best?.salePrice||part?.minSalePrice;
    const deliveryText=formatDate(best?.deliveryStart)||'уточнить';
    const stockCount=part?.totalCount||best?.count||0;
    const action=mode==='install'?'Записать на установку':'Заказать запчасть';
    const baseText=part
      ? `${action}:\n${name}\nБренд: ${brandName||'уточнить'}\nАртикул: ${part.partnumber||''}\nЦена клиенту: ${clientPrice?clientPrice+' ₽':'уточнить'}\nОстаток: ${stockCount}\nСклад: ${cleanText(best?.description,'уточнить')}\nДоставка: ${deliveryText}`
      : `Проверить запчасть:\nЗапрос: ${q}`;
    return {part,mode,name,brandName,clientPrice,deliveryText,stockCount,text:baseText};
  }

  function openRequest(part,mode='part'){
    const request=buildRequest(part,mode);
    setPendingRequest(request);
    setLeadForm({...emptyLeadForm,vin:vin||''});
    setRequestState('');
  }

  function closeRequest(){
    if(sending)return;
    setPendingRequest(null);
    setLeadForm(emptyLeadForm);
  }

  async function submitRequest(e){
    e.preventDefault();
    if(!pendingRequest)return;
    const formVin=String(leadForm.vin||vin||'').trim();
    const comment=String(leadForm.comment||'').trim();
    const requestText=`${pendingRequest.text}\nVIN: ${formVin||'не указан'}${comment?`\nКомментарий клиента: ${comment}`:''}`;
    const payload={
      type:pendingRequest.mode==='install'?'installation_booking':'parts_order',
      source:'availability',
      name:leadForm.name,
      phone:leadForm.phone,
      vin:formVin,
      text:requestText,
      request_text:requestText,
      car:'',
      client_price:pendingRequest.clientPrice?`${pendingRequest.clientPrice} ₽`:'',
      stock:pendingRequest.stockCount,
      delivery:pendingRequest.deliveryText,
      raw_part:pendingRequest.part||null,
      query:q,
      comment
    };
    setSending(true);setRequestState('Отправляем заявку...');
    try{
      const r=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const data=await r.json().catch(()=>({ok:false,error:'Ошибка ответа сервера'}));
      if(data.ok&&data.saved){
        setRequestState('Заявка отправлена. Менеджер свяжется с вами.');
        setPendingRequest(null);
        setLeadForm(emptyLeadForm);
        if(formVin)setVin(formVin);
      }else{
        setRequestState(data.error||'Не удалось отправить заявку');
      }
    }catch(e){setRequestState('Не удалось отправить заявку')}
    setSending(false);
  }

  const allParts=result?.parts||[];
  const available=allParts.filter(p=>p.totalCount>0);
  const brands=useMemo(()=>['all',...Array.from(new Set(available.map(p=>cleanText(p.brand,'')).filter(Boolean))).sort()],[result]);
  const visibleBase=showAll?allParts:available;
  const filtered=visibleBase.filter(p=>brand==='all'||cleanText(p.brand,'')===brand);
  const parts=[...filtered].sort((a,b)=>{if(sort==='stock')return (b.totalCount||0)-(a.totalCount||0);if(sort==='brand')return cleanText(a.brand,'').localeCompare(cleanText(b.brand,''),'ru');const ap=bestStock(a)?.salePrice||a.minSalePrice||999999;const bp=bestStock(b)?.salePrice||b.minSalePrice||999999;return ap-bp});
  const hints=hintsFor(q);

  return <>
    <section className="availabilityHero"><div><span className="eyebrow">Поиск по поставщикам</span><h1>Проверить наличие</h1><p>Введите артикул или название — покажем актуальные предложения.</p></div></section>
    <section className="main availabilitySearch"><div className="searchBox lightSearch"><div className="searchTabs"><span className="active">Артикул / название</span><span>VIN для менеджера</span><span>Быстрые запросы</span></div><div className="availabilityForm"><input className="input" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')search()}} placeholder="Например: 28113-1R100 или насос масляный"/><input className="input" value={vin} onChange={e=>setVin(e.target.value)} placeholder="VIN для заявки менеджеру (по желанию)"/><button className="btn primary" onClick={()=>search()} disabled={loading}>{loading?'Проверяем...':'Проверить наличие'}</button></div>{hints.length>0&&<div className="smartHint"><b>Уточните запрос:</b><div className="quickChips inline">{hints.map(item=><button key={item} onClick={()=>search(item)}>{item}</button>)}</div></div>}<div className="quickChips">{quickQueries.map(item=><button key={item} onClick={()=>search(item)}>{item}</button>)}</div>{requestState&&<p className="notice">{requestState}</p>}</div></section>
    {pendingRequest&&<section className="main" style={{paddingTop:0}}><div className="card" style={{maxWidth:760,margin:'0 auto'}}><div className="sectionHead" style={{marginBottom:12}}><div><h2>{pendingRequest.mode==='install'?'Заявка на установку':'Заявка на запчасть'}</h2><p className="muted" style={{marginBottom:0}}>{pendingRequest.name}</p></div><button type="button" className="btn" onClick={closeRequest} disabled={sending}>Закрыть</button></div><form className="form" onSubmit={submitRequest}><input className="input" required value={leadForm.name} onChange={e=>setLeadForm({...leadForm,name:e.target.value})} placeholder="Имя"/><input className="input" required value={leadForm.phone} onChange={e=>setLeadForm({...leadForm,phone:e.target.value})} placeholder="Телефон"/><input className="input" value={leadForm.vin} onChange={e=>setLeadForm({...leadForm,vin:e.target.value})} placeholder={vin?'VIN уже указан, можно изменить':'VIN, если не был указан'}/><textarea className="input" value={leadForm.comment} onChange={e=>setLeadForm({...leadForm,comment:e.target.value})} placeholder="Комментарий, необязательно"/><button className="btn primary" disabled={sending}>{sending?'Отправляем...':'Отправить заявку'}</button></form></div></section>}
    {result&&<section className="main section"><div className="resultsHead"><div><h2>{available.length?'Найдено в наличии':'Результат проверки'}</h2>{result.message&&<p className="muted">{cleanText(result.message,'')}</p>}</div><div className="resultStats"><b>{available.length}</b><span>в наличии из {allParts.length}</span></div></div>{result.error&&<div className="notice">{result.error}</div>}{!result.configured&&<div className="card emptyState"><h2>Проверка наличия временно недоступна</h2><p className="muted">Сервис проверки поставщиков временно недоступен. Можно отправить запрос менеджеру.</p><button className="btn primary" onClick={()=>openRequest(null)}>Отправить менеджеру</button></div>}{result.configured&&allParts.length===0&&<div className="card emptyState"><h2>Ничего не найдено</h2><p className="muted">Запрос слишком общий или такой позиции нет в выдаче поставщиков. Попробуйте уточнить запрос либо отправьте заявку менеджеру.</p><div className="quickChips inline">{(hints.length?hints:quickQueries.slice(4,7)).map(item=><button key={item} onClick={()=>search(item)}>{item}</button>)}</div><button className="btn primary" onClick={()=>openRequest(null)}>Отправить запрос</button></div>}{allParts.length>0&&available.length===0&&<div className="card emptyState"><h2>Есть совпадения, но нет остатков</h2><p className="muted">Можно отправить запрос менеджеру для ручной проверки.</p><button className="btn primary" onClick={()=>openRequest(null)}>Отправить запрос</button></div>}{available.length>0&&<div className="filters shopFilters"><button className="btn" onClick={()=>setShowAll(!showAll)}>{showAll?'Только в наличии':`Все ${allParts.length} позиций`}</button><select value={sort} onChange={e=>setSort(e.target.value)}><option value="price">Сначала дешевле</option><option value="stock">Больше остаток</option><option value="brand">По бренду</option></select><select value={brand} onChange={e=>setBrand(e.target.value)}><option value="all">Все бренды</option>{brands.filter(b=>b!=='all').map(b=><option key={b} value={b}>{b}</option>)}</select></div>}{parts.length>0&&<div className="shopGrid">{parts.map((p,i)=>{const best=bestStock(p);const name=titleFor(p,q);const brandName=cleanText(p.brand,'Бренд не указан');const clientPrice=best?.salePrice||p.minSalePrice;const image=imageForPart(p,q);return <article className="shopCard" key={(p.guid||p.partnumber||'p')+i}><div className="productTop"><span className={p.totalCount>0?'badge':'muted'}>{p.totalCount>0?'В наличии':'Нет остатка'}</span>{best?.deliveryStart&&<span className="deliveryPill">доставка {formatDate(best.deliveryStart)}</span>}</div>{image&&<div className="shopPartVisual"><Image src={image} alt={name} width={520} height={360} sizes="(max-width: 860px) 100vw, 360px"/></div>}<h3>{name}</h3><p className="muted productMeta">{brandName} · {p.partnumber}</p><div className="shopPriceRow"><p className="price">{clientPrice?`${clientPrice} ₽`:'цену уточнить'}</p><p>{p.totalCount>0?<span className="stock">{p.totalCount} шт.</span>:<span className="muted">нет</span>}</p></div>{best?.description&&<p className="muted">{cleanText(best.description,'')}</p>}<div className="cardActions"><button className="btn primary" onClick={()=>openRequest(p,'part')}>Заказать запчасть</button><button className="btn" onClick={()=>openRequest(p,'install')}>Записаться на установку</button></div></article>})}</div>}</section>}
  </>
}
