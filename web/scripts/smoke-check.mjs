import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const required=[
  'middleware.js',
  'app/api/leads/route.js',
  'app/api/admin/leads/[id]/route.js',
  'app/api/admin/leads/[id]/vehicle/route.js',
  'app/api/admin/customers/[id]/vehicles/route.js',
  'app/api/admin/vehicles/[id]/service-history/route.js',
  'app/api/cabinet/request-code/route.js',
  'app/api/cabinet/login/route.js',
  'app/admin/page.jsx',
  'app/admin/AdminFilters.jsx',
  'app/admin/leads/[id]/page.jsx',
  'app/admin/leads/[id]/LeadActions.jsx',
  'app/admin/leads/[id]/LeadEditForm.jsx',
  'app/admin/leads/[id]/VehicleLinkForm.jsx',
  'app/admin/customers/page.jsx',
  'app/admin/customers/[id]/page.jsx',
  'app/admin/customers/[id]/CustomerVehicleForm.jsx',
  'app/admin/customers/[id]/CustomerEditForm.jsx',
  'app/admin/vehicles/[id]/page.jsx',
  'app/admin/vehicles/[id]/ServiceHistoryForm.jsx',
  'app/admin/vehicles/[id]/VehicleEditForm.jsx',
  'app/cabinet/page.jsx',
  'app/cabinet/CabinetClient.jsx',
  'app/availability/AvailabilityClient.jsx',
  'app/booking/BookingClient.jsx',
  'app/contact/ContactClient.jsx',
  'app/parts/PartsClient.jsx',
  'app/cart/CartClient.jsx',
  'lib/db.js',
  'lib/admin-edit.js',
  'lib/cabinet-auth.js',
  'lib/rate-limit.js',
  'lib/service-history.js',
  'scripts/live-smoke.mjs',
  '../supabase/cabinet_login_codes.sql',
  '../supabase/rsservice26_core_schema.sql',
  '../supabase/rate_limits.sql',
  '../supabase/normalize_customer_status.sql'
];
const errors=[];
function filePath(file){return path.join(root,file)}
function exists(file){return fs.existsSync(filePath(file))}
function read(file){return fs.readFileSync(filePath(file),'utf8')}
function scanFiles(dir,acc=[]){
  if(!fs.existsSync(dir))return acc;
  for(const item of fs.readdirSync(dir)){
    const p=path.join(dir,item);
    const st=fs.statSync(p);
    if(st.isDirectory())scanFiles(p,acc);
    else if(/\.(js|jsx|ts|tsx|mjs|css|sql)$/.test(item))acc.push(p);
  }
  return acc;
}
function must(text,re,message){if(!re.test(text))errors.push(message)}
function mustNot(text,re,message){if(re.test(text))errors.push(message)}

for(const file of required){if(!exists(file))errors.push(`missing: ${file}`)}

const allFiles=scanFiles(root).concat(scanFiles(path.join(root,'..','supabase')));
const allText=allFiles.map(p=>fs.readFileSync(p,'utf8')).join('\n');
if(/window\.prompt\s*\(/.test(allText))errors.push('window.prompt must not be used in production UX');
if(/purchasePrice/.test(read('app/api/availability-search/route.js')))errors.push('/api/availability-search must not expose purchasePrice in safe response');
if(/app\/api\/debug|debug-endpoint|\/api\/debug/.test(allText))errors.push('debug endpoint reference found');

const middleware=read('middleware.js');
if(!/ADMIN_BASIC_AUTH/.test(middleware))errors.push('admin guard must support ADMIN_BASIC_AUTH');
if(!/ADMIN_SECRET/.test(middleware))errors.push('admin guard must support ADMIN_SECRET');
if(!/\/admin\/:path\*/.test(middleware)||!/\/api\/admin\/:path\*/.test(middleware))errors.push('middleware must match /admin and /api/admin routes');
if(!/status:503/.test(middleware))errors.push('production admin guard must fail closed when not configured');
if(!/WWW-Authenticate/.test(middleware))errors.push('admin guard should return basic auth challenge');

const header=read('components/Header.jsx');
if(!/NEXT_PUBLIC_CABINET_ENABLED/.test(header))errors.push('cabinet link must be feature-flagged');
if(/<Link href="\/cabinet">Кабинет<\/Link>/.test(header))errors.push('cabinet link must not be unconditional in Header');
const cabinetPage=read('app/cabinet/page.jsx');
if(!/NEXT_PUBLIC_CABINET_ENABLED/.test(cabinetPage))errors.push('/cabinet page must be disabled by feature flag until OTP delivery works');
if(!/Кабинет временно недоступен/.test(cabinetPage))errors.push('/cabinet disabled state must be explicit');

const db=read('lib/db.js');
if(/updated_at\s*:/.test(db))errors.push('unsafe updated_at PATCH dependency found in lib/db.js');
if(/status=eq\.confirmed/.test(db))errors.push('strict customers status filter found; may hide confirmed customers when schema differs');
if(!/customer_id:customerId\|\|null/.test(db))errors.push('createLead must not auto-link customer_id');
if(!/vehicle_id:vehicleId\|\|null/.test(db))errors.push('createLead must not auto-link vehicle_id');
if(!/status:'new_contact'/.test(db))errors.push('new leads must use status new_contact');
if(!/createVehicleForCustomer/.test(db))errors.push('vehicle stage requires createVehicleForCustomer helper');
if(!/linkLeadToVehicle/.test(db))errors.push('vehicle stage requires linkLeadToVehicle helper');
if(!/findConfirmedCustomerByPhone/.test(db))errors.push('cabinet stage requires confirmed customer lookup by phone');
if(!/createCabinetLoginCode/.test(db))errors.push('cabinet OTP requires createCabinetLoginCode helper');
if(!/findActiveCabinetLoginCode/.test(db))errors.push('cabinet OTP requires active code lookup');
if(!/confirmLeadAsCustomer/.test(db))errors.push('P2 requires confirmLeadAsCustomer helper');
if(!/contact_status:'confirmed_client'/.test(db))errors.push('P2 confirm customer must update contact_status to confirmed_client');
if(!/raw=\{\.\.\.\(lead\.raw_payload\|\|\{\}\),contact_status:'confirmed_client'\}/.test(db))errors.push('P2 confirm customer must mirror contact_status in raw_payload');

const coreSql=read('../supabase/rsservice26_core_schema.sql');
for(const table of ['leads','customers','vehicles','service_history','manager_comments']){
  if(!new RegExp(`create table if not exists public\\.${table}`).test(coreSql))errors.push(`core schema missing table: ${table}`);
}
if(!/references public\.customers\(id\)/.test(coreSql))errors.push('core schema must include customer FK references');
if(!/references public\.vehicles\(id\)/.test(coreSql))errors.push('core schema must include vehicle FK references');

const otpSql=read('../supabase/cabinet_login_codes.sql');
if(!/create table if not exists public\.cabinet_login_codes/.test(otpSql))errors.push('cabinet_login_codes SQL must create OTP table');
if(!/cabinet_login_codes_phone_created_idx/.test(otpSql))errors.push('cabinet_login_codes SQL must include phone index');
if(!/cabinet_login_codes_expires_idx/.test(otpSql))errors.push('cabinet_login_codes SQL must include expires index');

const rateLimitSql=read('../supabase/rate_limits.sql');
if(!/create table if not exists public\.rate_limits/.test(rateLimitSql))errors.push('rate_limits SQL must create rate limit table');
if(!/rate_limits_scope_identifier_created_idx/.test(rateLimitSql))errors.push('rate_limits SQL must include scope identifier index');
const normalizeCustomerSql=read('../supabase/normalize_customer_status.sql');
if(!/set status = 'confirmed'/.test(normalizeCustomerSql))errors.push('customer status normalization SQL must set confirmed');
if(!/alter table public\.customers/.test(normalizeCustomerSql))errors.push('customer status normalization SQL must set default');

const rateLimitHelper=read('lib/rate-limit.js');
if(!/checkRateLimit/.test(rateLimitHelper))errors.push('rate limit helper must export checkRateLimit');
if(!/rateLimitResponse/.test(rateLimitHelper))errors.push('rate limit helper must export rateLimitResponse');
if(!/Retry-After/.test(rateLimitHelper))errors.push('rate limit responses must include Retry-After');
if(!/rate_limits/.test(rateLimitHelper))errors.push('rate limit helper should use persistent rate_limits table when available');

const leadsApi=read('app/api/leads/route.js');
if(!/if\(!dbReady\(\)\)/.test(leadsApi))errors.push('/api/leads must fail when Supabase is not configured');
if(!/saved:true/.test(leadsApi))errors.push('/api/leads must only return saved:true after Supabase insert');
if(!/telegramError/.test(leadsApi))errors.push('/api/leads should expose telegramError without blocking saved lead');
if(!/checkRateLimit/.test(leadsApi))errors.push('/api/leads must apply rate limit');
if(!/LEADS_RATE_LIMIT_WINDOW_SECONDS/.test(leadsApi))errors.push('/api/leads must expose rate limit env tuning');

const leadAdminApi=read('app/api/admin/leads/[id]/route.js');
must(leadAdminApi,/confirm_customer/,'P2 lead API must support confirm_customer');
must(leadAdminApi,/updateLeadDetails/,'P2 lead API must support editing lead details');
must(leadAdminApi,/DELETE/,'P2 lead API must support deleting lead only');
const leadVehicleApi=read('app/api/admin/leads/[id]/vehicle/route.js');
must(leadVehicleApi,/linkLeadToVehicle/,'P2 lead vehicle API must link lead to vehicle');

const requestCodeApi=read('app/api/cabinet/request-code/route.js');
if(!/findConfirmedCustomerByPhone/.test(requestCodeApi))errors.push('cabinet code request must be limited to confirmed customers');
if(!/createCabinetLoginCode/.test(requestCodeApi))errors.push('cabinet code request must persist OTP hash');
if(!/checkRateLimit/.test(requestCodeApi))errors.push('cabinet code request must apply rate limit');
if(!/CABINET_OTP_RATE_LIMIT_WINDOW_SECONDS/.test(requestCodeApi))errors.push('cabinet OTP rate limit must expose env tuning');
const cabinetAuth=read('lib/cabinet-auth.js');
if(!/CABINET_OTP_PROVIDER/.test(cabinetAuth))errors.push('cabinet delivery must be provider-gated');
if(!/provider==='console'/.test(cabinetAuth))errors.push('console OTP provider should exist only as explicit provider');

const cabinetApi=read('app/api/cabinet/login/route.js');
if(!/findConfirmedCustomerByPhone/.test(cabinetApi))errors.push('cabinet login must allow only confirmed customers');
if(!/findActiveCabinetLoginCode/.test(cabinetApi))errors.push('cabinet login must require active OTP');
if(!/hashOtp/.test(cabinetApi))errors.push('cabinet login must verify OTP hash');
if(!/getCustomerLeads/.test(cabinetApi))errors.push('cabinet must show customer leads only');
if(/customer_id\s*=\s*null/.test(cabinetApi))errors.push('cabinet must not expose unconfirmed leads');
const cabinetClient=read('app/cabinet/CabinetClient.jsx');
if(!/\/api\/cabinet\/request-code/.test(cabinetClient))errors.push('cabinet UI must request OTP first');
if(!/\/api\/cabinet\/login/.test(cabinetClient))errors.push('cabinet UI must verify OTP before opening');

const serviceHistoryHelper=read('lib/service-history.js');
must(serviceHistoryHelper,/createServiceHistoryForVehicle/,'service history helper must export createServiceHistoryForVehicle');
must(serviceHistoryHelper,/service_history/,'service history helper must write to service_history');
must(serviceHistoryHelper,/lead_id/,'P2 service history must persist linked lead_id');
must(serviceHistoryHelper,/getLead\(leadId\)/,'P2 service history must validate linked lead');
must(serviceHistoryHelper,/vehicle_id:vehicle\.id/,'P2 service history must persist vehicle_id');
must(serviceHistoryHelper,/customer_id:customerId/,'P2 service history must persist customer_id');
const serviceHistoryApi=read('app/api/admin/vehicles/[id]/service-history/route.js');
if(!/createServiceHistoryForVehicle/.test(serviceHistoryApi))errors.push('service history API must use helper');
const vehiclePage=read('app/admin/vehicles/[id]/page.jsx');
must(vehiclePage,/Следующее действие/,'P2 vehicle page must include next action block');
must(vehiclePage,/История обслуживания[\s\S]*Добавить обслуживание/,'P2 vehicle page must render service history before add form');
must(vehiclePage,/ServiceHistoryForm vehicleId=\{vehicle\.id\} leads=\{leads\}/,'P2 vehicle page must pass vehicle leads into service history form');
must(vehiclePage,/VehicleEditForm/,'P2 vehicle page must include edit/delete form');
const serviceHistoryForm=read('app/admin/vehicles/[id]/ServiceHistoryForm.jsx');
must(serviceHistoryForm,/\/api\/admin\/vehicles\/\$\{vehicleId\}\/service-history/,'service history form must post to admin API');
must(serviceHistoryForm,/router\.refresh/,'service history form must refresh vehicle page after save');
must(serviceHistoryForm,/lead_id/,'P2 service history form must send lead_id');
must(serviceHistoryForm,/Без связанной заявки/,'P2 service history form must allow empty linked lead');
must(serviceHistoryForm,/leads\.map/,'P2 service history form must render linked lead selector');

const adminFilters=read('app/admin/AdminFilters.jsx');
must(adminFilters,/Нужно подтвердить клиента/,'P2 /admin must show next action: confirm customer');
must(adminFilters,/Нужно привязать автомобиль/,'P2 /admin must show next action: link vehicle');
must(adminFilters,/Можно вести обслуживание/,'P2 /admin must show next action: service');
must(adminFilters,/Заявка выполнена/,'P2 /admin must show completed next action');
must(adminFilters,/repeat\(auto-fit|minmax\(135px/,'P2 /admin filters must be mobile-first cards');
const leadDetail=read('app/admin/leads/[id]/page.jsx');
must(leadDetail,/Следующее действие/,'P2 lead detail must include next action block');
must(leadDetail,/Контакт ещё не подтверждён как клиент/,'P2 lead detail must guide customer confirmation');
must(leadDetail,/VehicleLinkForm/,'lead detail must include vehicle link form');
must(leadDetail,/Редактировать заявку/,'P2 lead detail must include edit form');
must(leadDetail,/Технические данные/,'P2 lead detail must keep technical data at bottom');
const leadActions=read('app/admin/leads/[id]/LeadActions.jsx');
must(leadActions,/Подтвердить как клиента/,'P2 lead actions must include confirm customer button');
must(leadActions,/disabled=\{!!busy\}/,'P2 lead actions must disable buttons while busy');
const leadEdit=read('app/admin/leads/[id]/LeadEditForm.jsx');
must(leadEdit,/Удалить заявку/,'P2 lead edit must include delete lead button');
must(leadEdit,/window\.confirm/,'P2 lead delete must require confirmation');
const customerDetail=read('app/admin/customers/[id]/page.jsx');
must(customerDetail,/Следующее действие/,'P2 customer detail must include next action block');
must(customerDetail,/Добавьте автомобиль клиента/,'P2 customer detail must guide add vehicle');
must(customerDetail,/CustomerVehicleForm/,'customer detail must include vehicle form');
must(customerDetail,/\/admin\/vehicles\/\$\{v\.id\}/,'customer vehicles must link to vehicle detail');
must(customerDetail,/Редактировать клиента/,'P2 customer detail must include edit form at bottom');
const vehicleEdit=read('app/admin/vehicles/[id]/VehicleEditForm.jsx');
must(vehicleEdit,/Удалить автомобиль/,'P2 vehicle edit must include delete vehicle button');
must(vehicleEdit,/Связанные заявки останутся/,'P2 vehicle delete must preserve leads and only unlink');

const liveSmoke=read('scripts/live-smoke.mjs');
if(!/SMOKE_BASE_URL/.test(liveSmoke))errors.push('live smoke must require SMOKE_BASE_URL');
if(!/purchasePrice/.test(liveSmoke))errors.push('live smoke must check purchasePrice leak');
if(!/\/api\/admin/.test(liveSmoke))errors.push('live smoke must check admin API protection');
if(!/\/api\/leads/.test(liveSmoke))errors.push('live smoke must check public leads endpoint');
must(liveSmoke,/Следующее действие/,'live smoke must check P2 next action text when admin auth is available');
must(liveSmoke,/Нужно подтвердить клиента/,'live smoke must check P2 admin next action indicators');
must(liveSmoke,/Подтвердить как клиента/,'live smoke must check P2 confirm customer UI when admin auth is available');
must(liveSmoke,/lead_id/,'live smoke must check P2 linked lead service-history support');

const adminCustomers=read('app/admin/customers/page.jsx');
if(!/\/admin\/customers\/\$\{c\.id\}/.test(adminCustomers))errors.push('admin customers page must link to customer detail route');
if(/создаются автоматически по телефону при заявке/.test(adminCustomers))errors.push('old incorrect customer model text still present');
const services=exists('app/services/page.jsx')?read('app/services/page.jsx'):'';
if(/\/contact\?type=service/.test(services))errors.push('service booking still routes to unused contact query');

async function httpSmoke(){
  const base=process.env.SMOKE_BASE_URL;
  if(!base)return;
  const pages=['/','/availability','/parts','/cart','/booking','/contact','/cabinet','/admin'];
  for(const page of pages){
    const res=await fetch(new URL(page,base));
    if(page==='/admin'){
      if(![401,403,503].includes(res.status))errors.push(`/admin must be protected in HTTP smoke, got ${res.status}`);
    }else if(res.status>=400){
      errors.push(`${page} returned HTTP ${res.status}`);
    }
  }
}

await httpSmoke();
if(errors.length){console.error('RSService26 smoke-check failed:');for(const e of errors)console.error('-',e);process.exit(1)}
console.log('RSService26 smoke-check passed');