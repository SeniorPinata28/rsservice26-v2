import assert from 'node:assert/strict';
import {isCabinetSessionCurrent} from '../lib/cabinet-auth.js';
import {readLimitedJson} from '../lib/validation.js';

process.env.NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:1';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-service-role';
process.env.NODE_ENV='production';

const availability=await import('../app/api/availability-search/route.js');

const getResponse=await availability.GET();
assert.equal(getResponse.status,405);
assert.equal(getResponse.headers.get('allow'),'POST');

const oversized=JSON.stringify({q:'x'.repeat(5000)});
const oversizedAvailability=await availability.POST(new Request('http://localhost/api/availability-search',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:oversized
}));
assert.equal(oversizedAvailability.status,413);

const unavailableLimiter=await availability.POST(new Request('http://localhost/api/availability-search',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({q:'масляный фильтр'})
}));
assert.equal(unavailableLimiter.status,503);

let oversizedLoginError=null;
try{await readLimitedJson(new Request('http://localhost/api/cabinet/login',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:JSON.stringify({phone:'79991234567',password:'x'.repeat(9000)})
}),8192)}catch(error){oversizedLoginError=error}
assert.equal(oversizedLoginError?.code,'REQUEST_TOO_LARGE');

const session={customer_id:'customer-1',session_version:'v1'};
assert.equal(isCabinetSessionCurrent(session,{id:'customer-1',cabinet_enabled:true,password_updated_at:'v1'}),true);
assert.equal(isCabinetSessionCurrent(session,{id:'customer-1',cabinet_enabled:false,password_updated_at:'v1'}),false);
assert.equal(isCabinetSessionCurrent(session,{id:'customer-1',cabinet_enabled:true,password_updated_at:'v2'}),false);

console.log('RSService26 security route check passed');
