import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const required=[
  'app/api/leads/route.js',
  'app/api/admin/leads/[id]/route.js',
  'app/admin/page.jsx',
  'app/admin/AdminFilters.jsx',
  'app/admin/leads/[id]/page.jsx',
  'app/admin/leads/[id]/LeadActions.jsx',
  'app/availability/AvailabilityClient.jsx',
  'app/booking/BookingClient.jsx',
  'app/contact/ContactClient.jsx',
  'app/parts/PartsClient.jsx',
  'app/cart/CartClient.jsx',
  'lib/db.js'
];
const errors=[];
function read(file){return fs.readFileSync(path.join(root,file),'utf8')}
for(const file of required){if(!fs.existsSync(path.join(root,file)))errors.push(`missing: ${file}`)}
if(fs.existsSync(path.join(root,'app/admin/customers/[id]/page.jsx')))errors.push('premature customer detail route exists: app/admin/customers/[id]/page.jsx');
const db=read('lib/db.js');
if(/updated_at\s*:/.test(db))errors.push('unsafe updated_at PATCH dependency found in lib/db.js');
if(/status=eq\.confirmed/.test(db))errors.push('strict customers status filter found; may hide confirmed customers when schema differs');
if(!/customer_id:customerId\|\|null/.test(db))errors.push('createLead must not auto-link customer_id');
if(!/vehicle_id:vehicleId\|\|null/.test(db))errors.push('createLead must not auto-link vehicle_id');
if(!/status:'new_contact'/.test(db))errors.push('new leads must use status new_contact');
const leadsApi=read('app/api/leads/route.js');
if(!/if\(!dbReady\(\)\)/.test(leadsApi))errors.push('/api/leads must fail when Supabase is not configured');
if(!/saved:true/.test(leadsApi))errors.push('/api/leads must only return saved:true after Supabase insert');
if(!/telegramError/.test(leadsApi))errors.push('/api/leads should expose telegramError without blocking saved lead');
const adminCustomers=fs.existsSync(path.join(root,'app/admin/customers/page.jsx'))?read('app/admin/customers/page.jsx'):'';
if(/href=\{`\/admin\/customers\/\$\{/.test(adminCustomers))errors.push('admin customers page contains link to unfinished customer detail route');
if(/создаются автоматически по телефону при заявке/.test(adminCustomers))errors.push('old incorrect customer model text still present');
const services=fs.existsSync(path.join(root,'app/services/page.jsx'))?read('app/services/page.jsx'):'';
if(/\/contact\?type=service/.test(services))errors.push('service booking still routes to unused contact query');
if(errors.length){console.error('RSService26 smoke-check failed:');for(const e of errors)console.error('-',e);process.exit(1)}
console.log('RSService26 smoke-check passed');
