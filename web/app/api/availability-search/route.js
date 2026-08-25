async function runSupplierSearch(q){
  const mod=await import('../../../lib/rossko-soap.js');
  return mod.searchRossko(q);
}

function safeStock(s){return {id:String(s?.id||''),salePrice:s?.salePrice||null,count:Number(s?.count||0),multiplicity:Number(s?.multiplicity||1),delivery:String(s?.delivery||''),extra:String(s?.extra||''),description:String(s?.description||''),deliveryStart:String(s?.deliveryStart||''),deliveryEnd:String(s?.deliveryEnd||'')}}
function safePart(p){const stocks=Array.isArray(p?.stocks)?p.stocks.map(safeStock):[];const prices=stocks.map(s=>s.salePrice).filter(Boolean).sort((a,b)=>a-b);return {guid:String(p?.guid||''),brand:String(p?.brand||''),partnumber:String(p?.partnumber||''),name:String(p?.name||''),stocks,totalCount:Number(p?.totalCount||0),minSalePrice:prices[0]||p?.minSalePrice||null}}
function safeResult(r){return {ok:Boolean(r?.ok),configured:Boolean(r?.configured),success:r?.success,message:String(r?.message||''),error:r?.error?String(r.error):undefined,parts:Array.isArray(r?.parts)?r.parts.map(safePart):[],rawCount:Number(r?.rawCount||0)}}

export async function GET(){return Response.json({ok:false,error:'Method not allowed'},{status:405,headers:{Allow:'POST'}})}
export async function POST(request){
  try{
    const data=await readLimitedJson(request,4096);
    const q=cleanText(data.q||data.text,100);
    if(q.length<2)return Response.json({ok:false,error:'Укажите поисковый запрос'},{status:400});
    const limit=await checkRateLimit({
      request,
      scope:'rossko_search',
      windowSeconds:Number(process.env.ROSSKO_SEARCH_RATE_LIMIT_WINDOW_SECONDS||60),
      limit:Number(process.env.ROSSKO_SEARCH_RATE_LIMIT_MAX||10),
      failClosed:true
    });
    if(!limit.ok)return rateLimitResponse(limit,'Слишком много запросов к поиску. Попробуйте позже.');
    return Response.json(safeResult(await runSupplierSearch(q)));
  }catch(e){return publicError(e)}
}
import {checkRateLimit,rateLimitResponse} from '../../../lib/rate-limit.js';
import {cleanText,publicError,readLimitedJson} from '../../../lib/validation.js';
