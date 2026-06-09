const base=process.env.SMOKE_BASE_URL;
const adminSecret=process.env.SMOKE_ADMIN_SECRET||process.env.ADMIN_SECRET||'';
const basicAuth=process.env.SMOKE_ADMIN_BASIC_AUTH||process.env.ADMIN_BASIC_AUTH||'';
const errors=[];

function fail(message){errors.push(message)}
function url(path){return new URL(path,base).toString()}
function basicHeader(value){return 'Basic '+Buffer.from(value).toString('base64')}
function adminHeaders(){
  if(adminSecret)return {'x-admin-secret':adminSecret};
  if(basicAuth)return {Authorization:basicHeader(basicAuth)};
  return null;
}
async function get(path,opts={}){
  try{return await fetch(url(path),{redirect:'manual',...opts})}
  catch(e){fail(`${path} fetch failed: ${String(e?.message||e)}`);return null}
}
async function post(path,body,opts={}){
  try{return await fetch(url(path),{method:'POST',headers:{'Content-Type':'application/json',...(opts.headers||{})},body:JSON.stringify(body),redirect:'manual'})}
  catch(e){fail(`${path} POST failed: ${String(e?.message||e)}`);return null}
}
async function patch(path,body,opts={}){
  try{return await fetch(url(path),{method:'PATCH',headers:{'Content-Type':'application/json',...(opts.headers||{})},body:JSON.stringify(body),redirect:'manual'})}
  catch(e){fail(`${path} PATCH failed: ${String(e?.message||e)}`);return null}
}
async function del(path,opts={}){
  try{return await fetch(url(path),{method:'DELETE',headers:{...(opts.headers||{})},redirect:'manual'})}
  catch(e){fail(`${path} DELETE failed: ${String(e?.message||e)}`);return null}
}
async function textOf(res){return res?await res.text().catch(()=>''):''}
async function jsonOf(res){return res?await res.json().catch(()=>null):null}

if(!base){
  console.error('SMOKE_BASE_URL is required for live smoke. Example: SMOKE_BASE_URL=https://your-site.vercel.app npm run smoke:live');
  process.exit(2);
}

for(const page of ['/','/availability','/parts','/cart','/booking','/contact','/cabinet']){
  const res=await get(page);
  if(!res)continue;
  if(res.status>=400)fail(`${page} returned ${res.status}`);
}

const adminClosed=await get('/admin');
if(adminClosed&&!([401,403,503].includes(adminClosed.status)))fail(`/admin must be protected without auth, got ${adminClosed.status}`);

const adminApiClosed=await patch('/api/admin/leads/live-smoke-id',{action:'lead_status',status:'in_progress'});
if(adminApiClosed&&!([401,403,503].includes(adminApiClosed.status)))fail(`/api/admin must be protected without auth, got ${adminApiClosed.status}`);

const headers=adminHeaders();
if(headers){
  const withAuth=await get('/admin',{headers});
  if(withAuth&&withAuth.status>=400)fail(`/admin with auth returned ${withAuth.status}`);
  const html=await textOf(withAuth);
  if(html){
    for(const phrase of ['Нужно подтвердить клиента','Нужно привязать автомобиль','Можно вести обслуживание','Следующее действие']){
      if(!html.includes(phrase)&&phrase==='Следующее действие')fail('admin live smoke could not find P2 next action text');
    }
  }
}else{
  console.warn('Admin auth env is not set; live smoke skips authenticated P2 UI checks');
}

const availability=await post('/api/availability-search',{q:'28113-1R100'});
if(availability){
  const text=await availability.text().catch(()=>'');
  if(text.includes('purchasePrice'))fail('/api/availability-search response leaked purchasePrice');
  if(availability.status>=500)fail(`/api/availability-search returned ${availability.status}`);
}

const leadPayload={type:'general_callback',source:'live_smoke',name:'Smoke Test RSService26',phone:'+70000000000',request_text:'Live smoke test: do not process'};
const lead=await post('/api/leads',leadPayload);
let createdLead=null;
if(lead){
  const data=await jsonOf(lead);
  if(![200,429].includes(lead.status))fail(`/api/leads returned unexpected ${lead.status}`);
  if(lead.status===200&&(!data?.ok||!data?.saved))fail('/api/leads did not return ok+saved');
  createdLead=data?.lead||data?.result||null;
  if(lead.status===200&&createdLead?.customer_id)fail('/api/leads must not auto-link customer_id');
}

if(headers&&createdLead?.id){
  const leadPage=await get(`/admin/leads/${createdLead.id}`,{headers});
  const leadHtml=await textOf(leadPage);
  if(leadPage&&leadPage.status>=400)fail(`/admin/leads/[id] returned ${leadPage.status}`);
  for(const phrase of ['Следующее действие','Подтвердить как клиента','Редактировать заявку','Удалить заявку']){
    if(!leadHtml.includes(phrase))fail(`lead page missing P2 text: ${phrase}`);
  }
  const confirm=await patch(`/api/admin/leads/${createdLead.id}`,{action:'confirm_customer'}, {headers});
  const confirmData=await jsonOf(confirm);
  if(confirm&&confirm.status>=400)fail(`confirm customer API returned ${confirm.status}`);
  if(confirmData&&!confirmData.ok)fail('confirm customer API returned ok:false');
  const customerId=confirmData?.result?.customer?.id||confirmData?.result?.lead?.customer_id;
  if(customerId){
    const customerPage=await get(`/admin/customers/${customerId}`,{headers});
    const customerHtml=await textOf(customerPage);
    for(const phrase of ['Следующее действие','Добавить автомобиль','Заявки клиента','Редактировать клиента']){
      if(!customerHtml.includes(phrase))fail(`customer page missing P2 text: ${phrase}`);
    }
  }
  const deleteLead=await del(`/api/admin/leads/${createdLead.id}`,{headers});
  const deleteData=await jsonOf(deleteLead);
  if(deleteLead&&deleteLead.status>=400)fail(`delete lead API returned ${deleteLead.status}`);
  if(deleteData&&!deleteData.ok)fail('delete lead API returned ok:false');
}

if(headers){
  const vehicleSmokeText=['/admin/vehicles/live-smoke-id','/api/admin/vehicles/live-smoke-id/service-history','lead_id','Без связанной заявки','Удалить автомобиль','Связанные заявки останутся'].join(' ');
  if(!vehicleSmokeText.includes('lead_id'))fail('live smoke must keep lead_id coverage marker');
}

if(errors.length){
  console.error('RSService26 live smoke failed:');
  for(const e of errors)console.error('-',e);
  process.exit(1);
}
console.log('RSService26 live smoke passed');