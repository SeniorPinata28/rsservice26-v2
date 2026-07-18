import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {setTimeout as wait} from 'node:timers/promises';
import {hashCabinetPassword} from '../lib/cabinet-auth.js';

const appPort=3187;
const dbPort=4587;
const phone='79991234567';
const password='Temporary-pass-26';
const customer={
  id:'00000000-0000-4000-8000-000000000026',
  full_name:'Тестовый клиент',
  phone,
  status:'confirmed',
  cabinet_enabled:true,
  must_change_password:false,
  password_hash:hashCabinetPassword(password),
  created_at:new Date().toISOString()
};

function json(response,status,data){
  response.writeHead(status,{'content-type':'application/json'});
  response.end(JSON.stringify(data));
}

const database=createServer((request,response)=>{
  const url=new URL(request.url||'/',`http://127.0.0.1:${dbPort}`);
  if(!url.pathname.startsWith('/rest/v1/'))return json(response,404,{message:'not found'});
  const table=url.pathname.slice('/rest/v1/'.length);
  if(table==='customers')return json(response,200,[customer]);
  if(table==='rate_limits')return json(response,request.method==='POST'?201:200,request.method==='POST'?{}:[]);
  if(['vehicles','leads','service_history','manager_comments'].includes(table))return json(response,200,[]);
  return json(response,404,{message:'unknown test table'});
});

await new Promise((resolve,reject)=>database.once('error',reject).listen(dbPort,'127.0.0.1',resolve));
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(appPort)],{
  cwd:new URL('..',import.meta.url),
  env:{...process.env,NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${dbPort}`,SUPABASE_SERVICE_ROLE_KEY:'test-service-role',CABINET_SESSION_SECRET:'test-session-secret'},
  stdio:['ignore','pipe','pipe']
});
let appOutput='';
app.stdout.on('data',chunk=>{appOutput+=chunk});
app.stderr.on('data',chunk=>{appOutput+=chunk});

try{
  let ready=false;
  for(let attempt=0;attempt<40;attempt++){
    try{const response=await fetch(`http://127.0.0.1:${appPort}/cabinet/login`);if(response.ok){ready=true;break}}catch{}
    await wait(250);
  }
  assert.equal(ready,true,`Next.js did not start:\n${appOutput}`);

  const rejected=await fetch(`http://127.0.0.1:${appPort}/api/cabinet/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone,password:'wrong-password'})});
  assert.equal(rejected.status,401);

  const accepted=await fetch(`http://127.0.0.1:${appPort}/api/cabinet/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone,password})});
  assert.equal(accepted.status,200,await accepted.text());
  const cookie=accepted.headers.get('set-cookie')||'';
  assert.match(cookie,/^rs_cabinet_session=/);
  assert.match(cookie,/HttpOnly/i);
  const cookieHeader=cookie.split(';')[0];

  const cabinet=await fetch(`http://127.0.0.1:${appPort}/cabinet`,{headers:{cookie:cookieHeader},redirect:'manual'});
  assert.equal(cabinet.status,200);

  const me=await fetch(`http://127.0.0.1:${appPort}/api/cabinet/me`,{headers:{cookie:cookieHeader}});
  assert.equal(me.status,200,await me.clone().text());
  const profile=await me.json();
  assert.equal(profile.ok,true);
  assert.equal(profile.customer.phone,phone);

  const logout=await fetch(`http://127.0.0.1:${appPort}/api/cabinet/logout`,{method:'POST',headers:{cookie:cookieHeader}});
  assert.equal(logout.status,200);
  assert.match(logout.headers.get('set-cookie')||'',/Max-Age=0/i);

  console.log('RSService26 cabinet end-to-end flow passed');
}finally{
  app.kill('SIGTERM');
  await new Promise(resolve=>database.close(resolve));
}
