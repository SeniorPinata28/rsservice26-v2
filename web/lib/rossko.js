const API_URL='https://api.rossko.ru/service/v2.1/GetSearch';

function xmlEscape(value=''){
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
}

function tag(xml, name){
  const match=xml.match(new RegExp(`<[^:>]*:?${name}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${name}>`,'i'));
  return match?match[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim():'';
}

function blocks(xml, name){
  const result=[];
  const re=new RegExp(`<[^:>]*:?${name}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${name}>`,'gi');
  let m;
  while((m=re.exec(xml))) result.push(m[1]);
  return result;
}

function parseParts(xml){
  const partBlocks=blocks(xml,'Part');
  return partBlocks.map(p=>{
    const stocks=blocks(p,'stock').map(s=>({
      id:tag(s,'id'),
      price:tag(s,'price'),
      count:Number(tag(s,'count')||0),
      multiplicity:Number(tag(s,'multiplicity')||1),
      type:tag(s,'type'),
      delivery:tag(s,'delivery'),
      extra:tag(s,'extra'),
      description:tag(s,'description'),
      deliveryStart:tag(s,'deliveryStart'),
      deliveryEnd:tag(s,'deliveryEnd')
    }));
    return {
      guid:tag(p,'guid'),
      brand:tag(p,'brand'),
      partnumber:tag(p,'partnumber'),
      name:tag(p,'name'),
      stocks,
      totalCount:stocks.reduce((sum,s)=>sum+(Number(s.count)||0),0),
      minPrice:stocks.map(s=>Number(String(s.price).replace(',','.'))).filter(Boolean).sort((a,b)=>a-b)[0]||null
    };
  }).filter(p=>p.partnumber||p.name||p.brand);
}

export async function searchRossko(query){
  const KEY1=process.env.ROSSKO_KEY1;
  const KEY2=process.env.ROSSKO_KEY2;
  const deliveryId=process.env.ROSSKO_DELIVERY_ID;
  const addressId=process.env.ROSSKO_ADDRESS_ID;
  if(!KEY1||!KEY2||!deliveryId||!addressId){
    return {ok:false,configured:false,error:'ROSSKO API variables are not configured'};
  }
  const body=`<?xml version="1.0" encoding="UTF-8"?>
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://api.rossko.ru/">
    <soapenv:Body>
      <ns1:GetSearch>
        <KEY1>${xmlEscape(KEY1)}</KEY1>
        <KEY2>${xmlEscape(KEY2)}</KEY2>
        <text>${xmlEscape(query)}</text>
        <delivery_id>${xmlEscape(deliveryId)}</delivery_id>
        <address_id>${xmlEscape(addressId)}</address_id>
      </ns1:GetSearch>
    </soapenv:Body>
  </soapenv:Envelope>`;
  const response=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/xml; charset=utf-8','SOAPAction':'GetSearch'},body,cache:'no-store'});
  const xml=await response.text();
  if(!response.ok){return {ok:false,configured:true,error:'Rossko API HTTP error',status:response.status,raw:xml.slice(0,800)}}
  const success=tag(xml,'success');
  const message=tag(xml,'message');
  const parts=parseParts(xml);
  return {ok:success==='true'||parts.length>0,configured:true,success,message,parts,rawCount:parts.length};
}
