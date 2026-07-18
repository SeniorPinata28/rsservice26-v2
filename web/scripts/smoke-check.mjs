import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const errors=[];

const required=[
  'middleware.js',
  'components/Header.jsx',
  'app/api/leads/route.js',
  'app/api/admin/leads/[id]/route.js',
  'app/api/admin/leads/[id]/vehicle/route.js',
  'app/api/admin/customers/[id]/vehicles/route.js',
  'app/api/admin/vehicles/[id]/service-history/route.js',
  'app/api/cabinet/login/route.js',
  'app/api/cabinet/change-password/route.js',
  'app/api/cabinet/me/route.js',
  'app/api/cabinet/logout/route.js',
  'app/api/cabinet/request/route.js',
  'app/cabinet/page.jsx',
  'app/cabinet/CabinetClient.jsx',
  'app/cabinet/login/page.jsx',
  'app/cabinet/login/CabinetLoginClient.jsx',
  'app/admin/page.jsx',
  'app/admin/AdminFilters.jsx',
  'app/admin/leads/[id]/page.jsx',
  'app/admin/leads/[id]/LeadActions.jsx',
  'app/admin/leads/[id]/LeadEditForm.jsx',
  'app/admin/leads/[id]/VehicleLinkForm.jsx',
  'app/admin/customers/[id]/page.jsx',
  'app/admin/customers/[id]/CustomerVehicleForm.jsx',
  'app/admin/customers/[id]/CustomerEditForm.jsx',
  'app/admin/customers/[id]/CustomerCabinetAccessForm.jsx',
  'app/admin/vehicles/[id]/page.jsx',
  'app/admin/vehicles/[id]/ServiceHistoryForm.jsx',
  'app/admin/vehicles/[id]/VehicleEditForm.jsx',
  'lib/db.js',
  'lib/admin-edit.js',
  'lib/cabinet-auth.js',
  'lib/rate-limit.js',
  'lib/service-history.js',
  'scripts/live-smoke.mjs',
  '../supabase/cabinet_password_access.sql',
  '../supabase/rsservice26_core_schema.sql',
  '../supabase/rate_limits.sql',
  '../supabase/normalize_customer_status.sql'
];

function filePath(file){return path.join(root,file)}
function exists(file){return fs.existsSync(filePath(file))}
function read(file){return fs.readFileSync(filePath(file),'utf8')}
function must(text,re,message){if(!re.test(text))errors.push(message)}
function mustNot(text,re,message){if(re.test(text))errors.push(message)}
function scanFiles(dir,acc=[]){
  if(!fs.existsSync(dir))return acc;
  for(const item of fs.readdirSync(dir)){
    const p=path.join(dir,item);
    const st=fs.statSync(p);
    if(st.isDirectory()&&!['node_modules','.next','.git'].includes(item))scanFiles(p,acc);
    else if(/\.(js|jsx|ts|tsx|mjs|css|sql)$/.test(item))acc.push(p);
  }
  return acc;
}

for(const file of required){if(!exists(file))errors.push(`missing: ${file}`)}

const allFiles=scanFiles(root).concat(scanFiles(path.join(root,'..','supabase')));
const allText=allFiles.map(p=>fs.readFileSync(p,'utf8')).join('\n');

mustNot(allText,/window\.prompt\s*\(/,'window.prompt must not be used in production UX');
const cabinetText=allFiles.filter(p=>p.includes(`${path.sep}cabinet${path.sep}`)||p.endsWith(`${path.sep}cabinet-auth.js`)).map(p=>fs.readFileSync(p,'utf8')).join('\n');
mustNot(cabinetText,/localStorage\s*\./,'localStorage must not be used for cabinet auth');
if(exists('app/api/debug')||exists('app/api/debug/route.js'))errors.push('debug endpoint found');
if(exists('app/api/availability-search/route.js'))mustNot(read('app/api/availability-search/route.js'),/purchasePrice/,'/api/availability-search must not expose purchasePrice in safe response');

if(exists('middleware.js')){
  const middleware=read('middleware.js');
  must(middleware,/ADMIN_BASIC_AUTH/,'admin guard must support ADMIN_BASIC_AUTH');
  must(middleware,/ADMIN_SECRET/,'admin guard must support ADMIN_SECRET');
  must(middleware,/\/admin\/:path\*/,'middleware must match /admin routes');
  must(middleware,/\/api\/admin\/:path\*/,'middleware must match /api/admin routes');
  must(middleware,/\/cabinet\/:path\*/,'middleware must match /cabinet routes');
  must(middleware,/\/api\/cabinet\/:path\*/,'middleware must match /api/cabinet routes');
  must(middleware,/pathname==='\/cabinet\/login'/,'/cabinet/login must remain public');
  must(middleware,/pathname\.startsWith\('\/api\/cabinet\/login'\)/,'cabinet login API must remain public');
  must(middleware,/hasValidCabinetSession\(request\)|verifyCabinetSessionTokenEdge/,'middleware must verify cabinet session cookie');
  must(middleware,/status:401/,'private cabinet API should return 401 without session');
}

if(exists('components/Header.jsx')){
  const header=read('components/Header.jsx');
  must(header,/NEXT_PUBLIC_CABINET_ENABLED/,'cabinet link must be feature-flagged');
  must(header,/cabinetEnabled&&<Link[^>]*href="\/cabinet"[^>]*>.*?<\/Link>/,'cabinet link must render only when cabinetEnabled is true');
}

if(exists('lib/cabinet-auth.js')){
  const auth=read('lib/cabinet-auth.js');
  must(auth,/CABINET_SESSION_COOKIE/,'cabinet auth must define session cookie name');
  must(auth,/httpOnly:true/,'cabinet session cookie must be HTTP-only');
  must(auth,/secure:process\.env\.NODE_ENV==='production'/,'cabinet session cookie must be secure in production');
  must(auth,/sameSite:'lax'|sameSite:"lax"|sameSite:'strict'|sameSite:"strict"/,'cabinet session cookie must use SameSite');
  must(auth,/createCabinetSessionToken/,'cabinet auth must create signed session token');
  must(auth,/verifyCabinetSessionToken/,'cabinet auth must verify signed session token');
  must(auth,/setCabinetSessionCookie/,'cabinet auth must set session cookie');
  must(auth,/clearCabinetSessionCookie/,'cabinet auth must clear session cookie');
  must(auth,/hashCabinetPassword/,'cabinet auth must hash passwords');
  must(auth,/verifyCabinetPassword/,'cabinet auth must verify password hashes');
  must(auth,/scryptSync/,'cabinet passwords must use scrypt');
  must(auth,/timingSafeEqual/,'password verification must use timing-safe comparison');
}

if(exists('lib/db.js')){
  const db=read('lib/db.js');
  must(db,/findConfirmedCustomerByPhone/,'cabinet stage requires confirmed customer lookup by phone');
  must(db,/getCustomerLeads/,'cabinet requires customer leads helper');
  must(db,/getCustomerVehicles/,'cabinet requires customer vehicles helper');
  must(db,/getCustomerServiceHistory/,'cabinet requires customer service history helper');
  must(db,/customer_id:customerId\|\|null/,'createLead must support explicit customer_id but not auto-link public leads');
  must(db,/vehicle_id:vehicleId\|\|null/,'createLead must support explicit vehicle_id but not auto-link public leads');
  must(db,/confirmLeadAsCustomer/,'P2 requires confirmLeadAsCustomer helper');
}

if(exists('../supabase/cabinet_password_access.sql')){
  const passwordSql=read('../supabase/cabinet_password_access.sql');
  for(const field of ['password_hash','cabinet_enabled','must_change_password','password_updated_at'])must(passwordSql,new RegExp(field),`cabinet password SQL missing field: ${field}`);
}
if(exists('../supabase/rate_limits.sql')){
  const rateSql=read('../supabase/rate_limits.sql');
  must(rateSql,/create table if not exists public\.rate_limits/,'rate_limits SQL must create rate limit table');
}

if(exists('app/api/cabinet/login/route.js')){
  const login=read('app/api/cabinet/login/route.js');
  must(login,/findConfirmedCustomerByPhone/,'cabinet login must allow only confirmed customers');
  must(login,/verifyCabinetPassword/,'cabinet login must verify password hash');
  must(login,/cabinet_enabled/,'cabinet login must require manager-enabled access');
  must(login,/checkRateLimit/,'cabinet login must apply rate limit');
  must(login,/setCabinetSessionCookie/,'cabinet login must set HTTP-only session cookie');
  mustNot(login,/getCustomerLeads/,'cabinet login must not return customer data directly');
  mustNot(login,/leads\.map/,'cabinet login must not return leads directly');
}

if(exists('app/api/cabinet/me/route.js')){
  const me=read('app/api/cabinet/me/route.js');
  must(me,/getCabinetSessionFromRequest/,'cabinet me must read server session');
  must(me,/getCustomer\(session\.customer_id\)/,'cabinet me must load customer by session.customer_id');
  must(me,/getCustomerVehicles\(customer\.id\)/,'cabinet me must filter vehicles by session customer');
  must(me,/getCustomerLeads\(customer\.id\)/,'cabinet me must filter leads by session customer');
  must(me,/getCustomerServiceHistory\(customer\.id\)/,'cabinet me must filter service history by session customer');
  must(me,/status:401/,'cabinet me must return 401 without session');
  mustNot(me,/raw_payload/,'cabinet me must not expose raw_payload');
}

if(exists('app/api/cabinet/logout/route.js')){
  const logout=read('app/api/cabinet/logout/route.js');
  must(logout,/clearCabinetSessionCookie/,'cabinet logout must clear session cookie');
  must(logout,/ok:true/,'cabinet logout must return ok:true');
}

if(exists('app/api/cabinet/request/route.js')){
  const request=read('app/api/cabinet/request/route.js');
  must(request,/getCabinetSessionFromRequest/,'cabinet request must read server session');
  must(request,/getCustomer\(session\.customer_id\)/,'cabinet request must load customer from session');
  must(request,/getCustomerVehicles\(customer\.id\)/,'cabinet request must load only customer vehicles');
  must(request,/requestedVehicleId&&!vehicle/,'cabinet request must reject foreign vehicle_id');
  must(request,/createLead/,'cabinet request must create lead via helper');
  must(request,/source:'cabinet'/,'cabinet request must set source cabinet');
  must(request,/customerId:customer\.id/,'cabinet request must force customer_id from session');
  mustNot(request,/data\.customer_id/,'cabinet request must not trust customer_id from client');
}

if(exists('app/cabinet/login/CabinetLoginClient.jsx')){
  const loginClient=read('app/cabinet/login/CabinetLoginClient.jsx');
  must(loginClient,/\/api\/cabinet\/login/,'login client must send phone and password');
  must(loginClient,/password/,'login client must contain password field');
  must(loginClient,/router\.replace\('\/cabinet'\)/,'login client must redirect to cabinet after login');
  must(loginClient,/\+7 \(999\) 999-99-99/,'login client must show phone mask placeholder');
}

if(exists('app/cabinet/CabinetClient.jsx')){
  const cabinetClient=read('app/cabinet/CabinetClient.jsx');
  must(cabinetClient,/\/api\/cabinet\/me/,'protected cabinet must load data from /api/cabinet/me');
  must(cabinetClient,/\/api\/cabinet\/logout/,'protected cabinet must call logout API');
  must(cabinetClient,/\/api\/cabinet\/request/,'protected cabinet must submit new requests through server API');
  must(cabinetClient,/Мои данные/,'protected cabinet must show customer block');
  must(cabinetClient,/Мои автомобили/,'protected cabinet must show vehicles block');
  must(cabinetClient,/Мои заявки/,'protected cabinet must show leads block');
  must(cabinetClient,/История обслуживания/,'protected cabinet must show service history block');
  must(cabinetClient,/Оставить новую заявку/,'protected cabinet must show new request form');
  must(cabinetClient,/Сообщить об ошибке/,'protected cabinet must allow data correction request');
  must(cabinetClient,/Добавить автомобиль через менеджера/,'protected cabinet must allow vehicle request through manager');
  must(cabinetClient,/\/api\/cabinet\/change-password/,'protected cabinet must support password change');
  mustNot(cabinetClient,/\/api\/cabinet\/login/,'protected cabinet must not perform login');
  mustNot(cabinetClient,/setCustomer\(/,'protected cabinet must not keep login customer in client state');
  mustNot(cabinetClient,/setLeads\(/,'protected cabinet must not keep login leads in client state');
}

if(exists('lib/service-history.js')){
  const serviceHistory=read('lib/service-history.js');
  must(serviceHistory,/lead_id/,'P2 service history must persist linked lead_id');
  must(serviceHistory,/getLead\(leadId\)/,'P2 service history must validate linked lead');
  must(serviceHistory,/customer_id:customerId/,'P2 service history must persist customer_id');
}

if(exists('app/admin/AdminFilters.jsx')){
  const adminFilters=read('app/admin/AdminFilters.jsx');
  must(adminFilters,/Нужно подтвердить клиента/,'P2 /admin must show next action: confirm customer');
  must(adminFilters,/Нужно привязать автомобиль/,'P2 /admin must show next action: link vehicle');
  must(adminFilters,/Можно вести обслуживание/,'P2 /admin must show next action: service');
  must(adminFilters,/Заявка выполнена/,'P2 /admin must show completed next action');
}

if(errors.length){
  console.error('RSService26 smoke-check failed:');
  for(const error of errors)console.error('-',error);
  process.exit(1);
}

console.log('RSService26 smoke-check passed');
