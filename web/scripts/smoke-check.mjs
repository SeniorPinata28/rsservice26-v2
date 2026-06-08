import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const required=[
  'middleware.js',
  'app/api/leads/route.js',
  'app/api/admin/leads/[id]/route.js',
  'app/api/admin/leads/[id]/vehicle/route.js',
  'app/api/admin/customers/[id]/vehicles/route.js',
  'app/api/cabinet/request-code/route.js',
  'app/api/cabinet/login/route.js',
  'app/admin/page.jsx',
  'app/admin/AdminFilters.jsx',
  'app/admin/leads/[id]/page.jsx',
  'app/admin/leads/[id]/LeadActions.jsx',
  'app/admin/leads/[id]/VehicleLinkForm.jsx',
  'app/admin/customers/page.jsx',
  'app/admin/customers/[id]/page.jsx',
  'app/admin/customers/[id]/CustomerVehicleForm.jsx',
  'app/admin/vehicles/[id]/page.jsx',
  'app/cabinet/page.jsx',
  'app/cabinet/CabinetClient.jsx',
  'app/availability/AvailabilityClient.jsx',
  'app/booking/BookingClient.jsx',
  'app/contact/ContactClient.jsx',
  'app/parts/PartsClient.jsx',
  'app/cart/CartClient.jsx',
  'lib/db.js',
  'lib/cabinet-auth.js',
  '../supabase/cabinet_login_codes.sql',
  '../supabase/rsservice26_core_schema.sql'
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

const leadsApi=read('app/api/leads/route.js');
if(!/if\(!dbReady\(\)\)/.test(leadsApi))errors.push('/api/leads must fail when Supabase is not configured');
if(!/saved:true/.test(leadsApi))errors.push('/api/leads must only return saved:true after Supabase insert');
if(!/telegramError/.test(leadsApi))errors.push('/api/leads should expose telegramError without blocking saved lead');

const requestCodeApi=read('app/api/cabinet/request-code/route.js');
if(!/findConfirmedCustomerByPhone/.test(requestCodeApi))errors.push('cabinet code request must be limited to confirmed customers');
if(!/createCabinetLoginCode/.test(requestCodeApi))errors.push('cabinet code request must persist OTP hash');
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

const adminCustomers=read('app/admin/customers/page.jsx');
if(!/\/admin\/customers\/\$\{c\.id\}/.test(adminCustomers))errors.push('admin customers page must link to customer detail route');
if(/создаются автоматически по телефону при заявке/.test(adminCustomers))errors.push('old incorrect customer model text still present');
const customerDetail=read('app/admin/customers/[id]/page.jsx');
if(!/CustomerVehicleForm/.test(customerDetail))errors.push('customer detail must include vehicle form');
if(!/\/admin\/vehicles\/\$\{v\.id\}/.test(customerDetail))errors.push('customer vehicles must link to vehicle detail');
const leadDetail=read('app/admin/leads/[id]/page.jsx');
if(!/VehicleLinkForm/.test(leadDetail))errors.push('lead detail must include vehicle link form');
const services=exists('app/services/page.jsx')?read('app/services/page.jsx'):'';
if(/\/contact\?type=service/.test(services))errors.push('service booking still routes to unused contact query');

async function httpSmoke(){
  const base=process.env.SMOKE_BASE_URL;
  if(!base)return;
  const pages=['/','/availability','/parts','/cart','/booking','/contact','/cabinet','/admin'];
  for(const page of pages){
    const res=await fetch(new URL(page,base));
    if(page==='/admin'){
      if(![401,503].includes(res.status))errors.push(`/admin must be protected in HTTP smoke, got ${res.status}`);
    }else if(res.status>=400){
      errors.push(`${page} returned HTTP ${res.status}`);
    }
  }
}

await httpSmoke();
if(errors.length){console.error('RSService26 smoke-check failed:');for(const e of errors)console.error('-',e);process.exit(1)}
console.log('RSService26 smoke-check passed');
