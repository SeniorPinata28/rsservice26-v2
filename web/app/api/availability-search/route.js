async function runSupplierSearch(q){
  const mod=await import('../../../lib/rossko-soap.js');
  return mod.searchRossko(q);
}

function safeStock(s){return {id:String(s?.id||''),salePrice:s?.salePrice||null,count:Number(s?.count||0),multiplicity:Number(s?.multiplicity||1),delivery:String(s?.delivery||''),extra:String(s?.extra||''),description:String(s?.description||''),deliveryStart:String(s?.deliveryStart||''),deliveryEnd:String(s?.deliveryEnd||'')}}
function safePart(p){const stocks=Array.isArray(p?.stocks)?p.stocks.map(safeStock):[];const prices=stocks.map(s=>s.salePrice).filter(Boolean).sort((a,b)=>a-b);return {guid:String(p?.guid||''),brand:String(p?.brand||''),partnumber:String(p?.partnumber||''),name:String(p?.name||''),stocks,totalCount:Number(p?.totalCount||0),minSalePrice:prices[0]||p?.minSalePrice||null}}
function safeResult(r){return {ok:Boolean(r?.ok),configured:Boolean(r?.configured),success:r?.success,message:String(r?.message||''),error:r?.error?String(r.error):undefined,parts:Array.isArray(r?.parts)?r.parts.map(safePart):[],rawCount:Number(r?.rawCount||0)}}

async function handle(q){
  if(!q)return Response.json({ok:false,error:'Укажите поисковый запрос'},{status:400});
  try{return Response.json(safeResult(await runSupplierSearch(q)))}catch(e){return Response.json({ok:false,configured:true,error:'Проверка наличия временно недоступна',parts:[],rawCount:0},{status:500})}
}

export async function GET(request){const {searchParams}=new URL(request.url);return handle(String(searchParams.get('q')||'').trim())}
export async function POST(request){const data=await request.json().catch(()=>({}));return handle(String(data.q||data.text||'').trim())}
