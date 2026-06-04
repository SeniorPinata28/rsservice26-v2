const SEARCH_URL='https://api.rossko.ru/service/v2.1/GetSearch';
const CHECKOUT_DETAILS_URL='https://api.rossko.ru/service/v2.1/GetCheckoutDetails';

function xmlEscape(value=''){
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
}
function tag(xml,name){const match=xml.match(new RegExp(`<[^:>]*:?${name}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${name}>`,'i'));return match?match[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim():'';}
function blocks(xml,name){const result=[];const re=new RegExp(`<[^:>]*:?${name}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${name}>`,'gi');let m;while((m=re.exec(xml)))result.push(m[1]);return result;}
function authReady(){const KEY1=process.env.ROSSKO_KEY1;const KEY2=process.env.ROSSKO_KEY2;return {KEY1,KEY2,ready:Boolean(KEY1&&KEY2)};}
function envelope(inner){return `<?xml version="1.0" encoding="UTF-8"?><SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns1="http://api.rossko.ru/"><SOAP-ENV:Body>${inner}</SOAP-ENV:Body></SOAP-ENV:Envelope>`;}
function methodBody(method,inner,variant){if(variant==='direct')return `<ns1:${method}>${inner}</ns1:${method}>`;if(variant==='request')return `<ns1:${method}><request>${inner}</request></ns1:${method}>`;if(variant==='parameters')return `<ns1:${method}><parameters>${inner}</parameters></ns1:${method}>`;if(variant==='param0')return `<ns1:${method}><param0>${inner}</param0></ns1:${method}>`;if(variant==='arg0')return `<ns1:${method}><arg0>${inner}</arg0></ns1:${method}>`;return `<ns1:${method}><param>${inner}</param></ns1:${method}>`;}
async function soapRequest(url,method,inner){
  const variants=['direct','request','param','param0','arg0','parameters'];
  const actions=['none','empty','method','url'];
  const attempts=[];
  for(const variant of variants){
    for(const action of actions){
      const headers={'Content-Type':'text/xml; charset=utf-8'};
      if(action==='empty')headers.SOAPAction='';
      if(action==='method')headers.SOAPAction=method;
      if(action==='url')headers.SOAPAction=`http://api.rossko.ru/${method}`;
      const body=envelope(methodBody(method,inner,variant));
      const response=await fetch(url,{method:'POST',headers,body,cache:'no-store'});
      const xml=await response.text();
      attempts.push({variant,action,status:response.status,xml});
      const message=tag(xml,'message');
      if(response.ok && !/Некорректный вызов сервиса/i.test(message||''))return {ok:true,xml,variant,action};
    }
  }
  const last=attempts[attempts.length-1];
  return {ok:false,error:'Rossko API call failed',status:last?.status,raw:safeRaw(attempts.map(a=>`VARIANT: ${a.variant}\nACTION: ${a.action}\nSTATUS: ${a.status}\n${a.xml}`).join('\n\n---\n\n'))};
}
function parseParts(xml){const partBlocks=blocks(xml,'Part');return partBlocks.map(p=>{const stocks=blocks(p,'stock').map(s=>({id:tag(s,'id'),price:tag(s,'price'),count:Number(tag(s,'count')||0),multiplicity:Number(tag(s,'multiplicity')||1),type:tag(s,'type'),delivery:tag(s,'delivery'),extra:tag(s,'extra'),description:tag(s,'description'),deliveryStart:tag(s,'deliveryStart'),deliveryEnd:tag(s,'deliveryEnd')}));return {guid:tag(p,'guid'),brand:tag(p,'brand'),partnumber:tag(p,'partnumber'),name:tag(p,'name'),stocks,totalCount:stocks.reduce((sum,s)=>sum+(Number(s.count)||0),0),minPrice:stocks.map(s=>Number(String(s.price).replace(',','.'))).filter(Boolean).sort((a,b)=>a-b)[0]||null};}).filter(p=>p.partnumber||p.name||p.brand);}
function parseCheckoutDetails(xml){const deliveries=blocks(xml,'delivery').map(d=>({id:tag(d,'id'),name:tag(d,'name')})).filter(x=>x.id||x.name);const payments=blocks(xml,'payment').map(p=>({id:tag(p,'id'),name:tag(p,'name')})).filter(x=>x.id||x.name);const addresses=blocks(xml,'address').map(a=>({id:tag(a,'id'),city:tag(a,'city'),street:tag(a,'street'),house:tag(a,'house'),office:tag(a,'office'),raw:[tag(a,'city'),tag(a,'street'),tag(a,'house'),tag(a,'office')].filter(Boolean).join(', ')})).filter(x=>x.id||x.raw);return {deliveries,payments,addresses};}
function safeRaw(xml){return String(xml||'').replace(/<KEY1>[\s\S]*?<\/KEY1>/g,'<KEY1>hidden</KEY1>').replace(/<KEY2>[\s\S]*?<\/KEY2>/g,'<KEY2>hidden</KEY2>').slice(0,2600);}
export async function getRosskoCheckoutDetails(){const {KEY1,KEY2,ready}=authReady();if(!ready)return {ok:false,configured:false,error:'ROSSKO_KEY1 and ROSSKO_KEY2 are not configured'};const inner=`<KEY1>${xmlEscape(KEY1)}</KEY1><KEY2>${xmlEscape(KEY2)}</KEY2>`;const result=await soapRequest(CHECKOUT_DETAILS_URL,'GetCheckoutDetails',inner);if(!result.ok)return {...result,configured:true};const success=tag(result.xml,'success');const message=tag(result.xml,'message');const parsed=parseCheckoutDetails(result.xml);return {ok:success==='true'||success==='1'||parsed.deliveries.length>0||parsed.addresses.length>0,configured:true,success,message,variant:result.variant,action:result.action,...parsed,raw:safeRaw(result.xml)};}
export async function searchRossko(query){const {KEY1,KEY2,ready}=authReady();const deliveryId=process.env.ROSSKO_DELIVERY_ID;const addressId=process.env.ROSSKO_ADDRESS_ID;if(!ready||!deliveryId||!addressId)return {ok:false,configured:false,error:'ROSSKO API variables are not configured'};const inner=`<KEY1>${xmlEscape(KEY1)}</KEY1><KEY2>${xmlEscape(KEY2)}</KEY2><text>${xmlEscape(query)}</text><delivery_id>${xmlEscape(deliveryId)}</delivery_id><address_id>${xmlEscape(addressId)}</address_id>`;const result=await soapRequest(SEARCH_URL,'GetSearch',inner);if(!result.ok)return {...result,configured:true};const success=tag(result.xml,'success');const message=tag(result.xml,'message');const parts=parseParts(result.xml);return {ok:success==='true'||parts.length>0,configured:true,success,message,variant:result.variant,action:result.action,parts,rawCount:parts.length,raw:safeRaw(result.xml)};}
