const SEARCH_URL='https://api.rossko.ru/service/v2.1/GetSearch';
const CHECKOUT_DETAILS_URL='https://api.rossko.ru/service/v2.1/GetCheckoutDetails';

function xmlEscape(value=''){
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
}

function tag(xml,name){
  const match=xml.match(new RegExp(`<[^:>]*:?${name}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${name}>`,'i'));
  return match?match[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim():'';
}

function blocks(xml,name){
  const result=[];
  const re=new RegExp(`<[^:>]*:?${name}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${name}>`,'gi');
  let m;
  while((m=re.exec(xml)))result.push(m[1]);
  return result;
}

function authReady(){
  const KEY1=process.env.ROSSKO_KEY1;
  const KEY2=process.env.ROSSKO_KEY2;
  return {KEY1,KEY2,ready:Boolean(KEY1&&KEY2)};
}

function soapEnvelope(method,inner){
  return `<?xml version="1.0" encoding="UTF-8"?>
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://api.rossko.ru/">
    <soapenv:Body>
      <ns1:${method}>${inner}</ns1:${method}>
    </soapenv:Body>
  </soapenv:Envelope>`;
}

async function soapRequest(url,method,inner){
  const body=soapEnvelope(method,inner);
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'text/xml; charset=utf-8','SOAPAction':method},body,cache:'no-store'});
  const xml=await response.text();
  if(!response.ok){return {ok:false,error:'Rossko API HTTP error',status:response.status,raw:xml.slice(0,1200)}}
  return {ok:true,xml};
}

function parseParts(xml){
  const partBlocks=blocks(xml,'Part');
  return partBlocks.map(p=>{
    const stocks=blocks(p,'stock').map(s=>({id:tag(s,'id'),price:tag(s,'price'),count:Number(tag(s,'count')||0),multiplicity:Number(tag(s,'multiplicity')||1),type:tag(s,'type'),delivery:tag(s,'delivery'),extra:tag(s,'extra'),description:tag(s,'description'),deliveryStart:tag(s,'deliveryStart'),deliveryEnd:tag(s,'deliveryEnd')}));
    return {guid:tag(p,'guid'),brand:tag(p,'brand'),partnumber:tag(p,'partnumber'),name:tag(p,'name'),stocks,totalCount:stocks.reduce((sum,s)=>sum+(Number(s.count)||0),0),minPrice:stocks.map(s=>Number(String(s.price).replace(',','.'))).filter(Boolean).sort((a,b)=>a-b)[0]||null};
  }).filter(p=>p.partnumber||p.name||p.brand);
}

function parseCheckoutDetails(xml){
  const deliveries=blocks(xml,'delivery').map(d=>({id:tag(d,'id'),name:tag(d,'name')})).filter(x=>x.id||x.name);
  const payments=blocks(xml,'payment').map(p=>({id:tag(p,'id'),name:tag(p,'name')})).filter(x=>x.id||x.name);
  const addresses=blocks(xml,'address').map(a=>({id:tag(a,'id'),city:tag(a,'city'),street:tag(a,'street'),house:tag(a,'house'),office:tag(a,'office'),raw:[tag(a,'city'),tag(a,'street'),tag(a,'house'),tag(a,'office')].filter(Boolean).join(', ')})).filter(x=>x.id||x.raw);
  return {deliveries,payments,addresses};
}

export async function getRosskoCheckoutDetails(){
  const {KEY1,KEY2,ready}=authReady();
  if(!ready){return {ok:false,configured:false,error:'ROSSKO_KEY1 and ROSSKO_KEY2 are not configured'}}
  const inner=`<KEY1>${xmlEscape(KEY1)}</KEY1><KEY2>${xmlEscape(KEY2)}</KEY2>`;
  const result=await soapRequest(CHECKOUT_DETAILS_URL,'GetCheckoutDetails',inner);
  if(!result.ok)return {...result,configured:true};
  const success=tag(result.xml,'success');
  const message=tag(result.xml,'message');
  return {ok:success==='true'||success==='1'||!message,configured:true,success,message,...parseCheckoutDetails(result.xml)};
}

export async function searchRossko(query){
  const {KEY1,KEY2,ready}=authReady();
  const deliveryId=process.env.ROSSKO_DELIVERY_ID;
  const addressId=process.env.ROSSKO_ADDRESS_ID;
  if(!ready||!deliveryId||!addressId){return {ok:false,configured:false,error:'ROSSKO API variables are not configured'}}
  const inner=`<KEY1>${xmlEscape(KEY1)}</KEY1><KEY2>${xmlEscape(KEY2)}</KEY2><text>${xmlEscape(query)}</text><delivery_id>${xmlEscape(deliveryId)}</delivery_id><address_id>${xmlEscape(addressId)}</address_id>`;
  const result=await soapRequest(SEARCH_URL,'GetSearch',inner);
  if(!result.ok)return {...result,configured:true};
  const success=tag(result.xml,'success');
  const message=tag(result.xml,'message');
  const parts=parseParts(result.xml);
  return {ok:success==='true'||parts.length>0,configured:true,success,message,parts,rawCount:parts.length};
}
