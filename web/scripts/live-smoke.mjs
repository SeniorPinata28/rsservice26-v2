const base=process.env.SMOKE_BASE_URL;
const adminSecret=process.env.SMOKE_ADMIN_SECRET||process.env.ADMIN_SECRET||'';
const basicAuth=process.env.SMOKE_ADMIN_BASIC_AUTH||process.env.ADMIN_BASIC_AUTH||'';
const errors=[];

function fail(message){errors.push(message)}
function url(path){return new URL(path,base).toString()}
function basicHeader(value){return 'Basic '+Buffer.from(value).toString('base64')}
async function get(path,opts={}){
  try{return await fetch(url(path),{redirect:'manual',...opts})}
  catch(e){fail(`${path} fetch failed: ${String(e?.message||e)}`);return null}
}
async function post(path,body,opts={}){
  try{return await fetch(url(path),{method:'POST',headers:{'Content-Type':'application/json',...(opts.headers||{})},body:JSON.stringify(body),redirect:'manual'})}
  catch(e){fail(`${path} POST failed: ${String(e?.message||e)}`);return null}
}

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

const adminApiClosed=await fetch(url('/api/admin/leads/live-smoke-id'),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'lead_status',status:'in_progress'}),redirect:'manual'}).catch(e=>{fail(`/api/admin PATCH fetch failed: ${String(e?.message||e)}`);return null});
if(adminApiClosed&&!([401,403,503].includes(adminApiClosed.status)))fail(`/api/admin must be protected without auth, got ${adminApiClosed.status}`);

if(adminSecret){
  const withSecret=await get('/admin',{headers:{'x-admin-secret':adminSecret}});
  if(withSecret&&withSecret.status>=400)fail(`/admin with x-admin-secret returned ${withSecret.status}`);
}else if(basicAuth){
  const withBasic=await get('/admin',{headers:{Authorization:basicHeader(basicAuth)}});
  if(withBasic&&withBasic.status>=400)fail(`/admin with basic auth returned ${withBasic.status}`);
}

const availability=await post('/api/availability-search',{q:'28113-1R100'});
if(availability){
  const text=await availability.text().catch(()=>'');
  if(text.includes('purchasePrice'))fail('/api/availability-search response leaked purchasePrice');
  if(availability.status>=500)fail(`/api/availability-search returned ${availability.status}`);
}

const leadPayload={type:'general_callback',source:'live_smoke',name:'Smoke Test RSService26',phone:'+70000000000',request_text:'Live smoke test: do not process'};
const lead=await post('/api/leads',leadPayload);
if(lead){
  const data=await lead.json().catch(()=>null);
  if(![200,429].includes(lead.status))fail(`/api/leads returned unexpected ${lead.status}`);
  if(lead.status===200&&(!data?.ok||!data?.saved))fail('/api/leads did not return ok+saved');
  if(lead.status===200&&data?.lead?.customer_id)fail('/api/leads must not auto-link customer_id');
}

if(errors.length){
  console.error('RSService26 live smoke failed:');
  for(const e of errors)console.error('-',e);
  process.exit(1);
}
console.log('RSService26 live smoke passed');
