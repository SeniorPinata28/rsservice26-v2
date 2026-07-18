import assert from 'node:assert/strict';
import {NextResponse} from 'next/server.js';
import {
  CABINET_SESSION_COOKIE,
  clearCabinetSessionCookie,
  setCabinetSessionCookie,
  verifyCabinetSessionToken
} from '../lib/cabinet-auth.js';
import {verifyCabinetSessionTokenEdge} from '../lib/cabinet-auth-edge.js';

process.env.CABINET_SESSION_SECRET='rsservice26-integration-check-secret';
process.env.NODE_ENV='production';

const customerId='00000000-0000-4000-8000-000000000026';
const loginResponse=setCabinetSessionCookie(NextResponse.json({ok:true}),customerId);
const setCookie=loginResponse.headers.get('set-cookie')||'';
assert.match(setCookie,new RegExp(`^${CABINET_SESSION_COOKIE}=`));
assert.match(setCookie,/HttpOnly/i);
assert.match(setCookie,/Secure/i);
assert.match(setCookie,/SameSite=lax/i);

const token=setCookie.match(new RegExp(`${CABINET_SESSION_COOKIE}=([^;]+)`))?.[1]||'';
assert.equal(verifyCabinetSessionToken(token)?.customer_id,customerId);
assert.equal((await verifyCabinetSessionTokenEdge(token))?.customer_id,customerId);

const logoutResponse=clearCabinetSessionCookie(NextResponse.json({ok:true}));
const clearedCookie=logoutResponse.headers.get('set-cookie')||'';
assert.match(clearedCookie,new RegExp(`^${CABINET_SESSION_COOKIE}=`));
assert.match(clearedCookie,/Max-Age=0/i);

console.log('RSService26 cabinet session check passed');
