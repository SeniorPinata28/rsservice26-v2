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
async function get(path,opts={}){try{return await fetch(url(path),{redirect:'manual',...opts})}catch(e){fail(`${path} fetch failed: ${String(e?.message||e)}`);return null}}
async function post(path,body,opts={}){try{return await fetch(url(path),{method:'POST',headers:{'Content-Type':'application/json',...(opts.headers||{})},body:JSON.stringify(body),redirect:'manual'})}catch(e){fail(`${path} POST failed: ${String(e?.message||e)}`);return null}}
async function patch(path,body,opts={}){try{return await fetch(url(path),{method:'PATCH',headers:{'Content-Type':'application/json',...(opts.headers||{})},body:JSON.stringify(body),redirect:'manual'})}catch(e){fail(`${path} PATCH failed: ${String(e?.message||e)}`);return null}}
async function del(path,opts={}){try{return await fetch(url(path),{method:'DELETE',headers:{...(opts.headers||{})},redirect:'manual'})}catch(e){fail(`${path} DELETE failed: ${String(e?.message||e)}`);return null}}
async function textOf(res){return res?await res.text().catch(()=>''):''}
async function jsonOf(res){return res?await res.json().catch(()=>null):null}
function setCookieFrom(res){const value=res?.headers?.get('set-cookie')||'';return value.split(';')[0]||''}

if(!base){console.error('SMOKE_BASE_URL is required for live smoke. Example: SMOKE_BASE_URL=https://your-site.vercel.app npm run smoke:live');process.exit(2)}

for(const page of ['/','/availability','/parts','/cart','/booking','/contact','/cabinet/login']){
  const res=await get(page);
  if(!res)continue;
  if(res.status>=400)fail(`${page} returned ${res.status}`);
}

const cabinetNoCookie=await get('/cabinet');
if(cabinetNoCookie&&!([301,302,303,307,308].includes(cabinetNoCookie.status)))fail(`/cabinet without cookie must redirect to /cabinet/login, got ${cabinetNoCookie.status}`);
const cabinetLocation=cabinetNoCookie?.headers?.get('location')||'';
if(cabinetNoCookie&&[301,302,303,307,308].includes(cabinetNoCookie.status)&&!cabinetLocation.includes('/cabinet/login'))fail(`/cabinet redirect location must include /cabinet/login, got ${cabinetLocation}`);

const cabinetMeNoCookie=await get('/api/cabinet/me');
if(cabinetMeNoCookie&&cabinetMeNoCookie.status!==401)fail(`/api/cabinet/me without cookie must return 401, got ${cabinetMeNoCookie.status}`);

const cabinetRequestNoCookie=await post('/api/cabinet/request',{type:'general_callback',comment:'unauthorized smoke request'});
if(cabinetRequestNoCookie&&cabinetRequestNoCookie.status!==401)fail(`/api/cabinet/request without cookie must return 401, got ${cabinetRequestNoCookie.status}`);

const logoutNoCookie=await post('/api/cabinet/logout',{});
if(logoutNoCookie&&logoutNoCookie.status>=500)fail(`/api/cabinet/logout without cookie must not fail with ${logoutNoCookie.status}`);
const clearCookie=setCookieFrom(logoutNoCookie);
if(logoutNoCookie&&logoutNoCookie.status<500&&!clearCookie.includes('rs_cabinet_session='))fail('/api/cabinet/logout should set/clear rs_cabinet_session cookie');

const unknownPhone=await post('/api/cabinet/login',{phone:'+79990000000',password:'invalid-password'});
if(unknownPhone){
  if(![401,429,500].includes(unknownPhone.status))fail(`/api/cabinet/login unknown phone expected 401/429/500, got ${unknownPhone.status}`);
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
  if(html&&!html.includes('Заявки'))fail('admin live smoke could not find admin leads text');
}else{
  console.warn('Admin auth env is not set; live smoke skips authenticated admin UI checks');
}

const availability=await post('/api/availability-search',{q:'28113-1R100'});
if(availability){const text=await textOf(availability);if(text.includes('purchasePrice'))fail('/api/availability-search response leaked purchasePrice');if(availability.status>=500)fail(`/api/availability-search returned ${availability.status}`)}

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
  for(const phrase of ['Следующее действие','Подтвердить как клиента','Редактировать заявку','Удалить заявку']){if(!leadHtml.includes(phrase))fail(`lead page missing P2 text: ${phrase}`)}
  const deleteLead=await del(`/api/admin/leads/${createdLead.id}`,{headers});
  const deleteData=await jsonOf(deleteLead);
  if(deleteLead&&deleteLead.status>=400)fail(`delete lead API returned ${deleteLead.status}`);
  if(deleteData&&!deleteData.ok)fail('delete lead API returned ok:false');
}

if(errors.length){console.error('RSService26 live smoke failed:');for(const e of errors)console.error('-',e);process.exit(1)}
console.log('RSService26 live smoke passed');
