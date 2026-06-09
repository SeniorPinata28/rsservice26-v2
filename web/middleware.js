import {NextResponse} from 'next/server';
import {CABINET_SESSION_COOKIE,verifyCabinetSessionTokenEdge} from './lib/cabinet-auth-edge.js';

function unauthorized(message='RSService26 admin access required'){
  return new NextResponse(message,{status:401,headers:{'WWW-Authenticate':'Basic realm="RSService26 Admin", charset="UTF-8"'}});
}

function isAllowedByBasicAuth(request){
  const expected=process.env.ADMIN_BASIC_AUTH;
  if(!expected)return false;
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Basic '))return false;
  try{return atob(header.slice(6))===expected}catch(e){return false}
}

function isAllowedBySecret(request){
  const secret=process.env.ADMIN_SECRET;
  if(!secret)return false;
  const header=request.headers.get('x-admin-secret')||'';
  const cookie=request.cookies.get('rs_admin_secret')?.value||'';
  const query=request.nextUrl.searchParams.get('admin_secret')||'';
  return header===secret||cookie===secret||query===secret;
}

function hasAdminGuardConfigured(){return Boolean(process.env.ADMIN_BASIC_AUTH||process.env.ADMIN_SECRET)}
async function hasValidCabinetSession(request){return Boolean(await verifyCabinetSessionTokenEdge(request.cookies.get(CABINET_SESSION_COOKIE)?.value||''))}
function cabinetRedirect(request){const url=request.nextUrl.clone();url.pathname='/cabinet/login';url.searchParams.set('next',request.nextUrl.pathname);return NextResponse.redirect(url)}

export async function middleware(request){
  const pathname=request.nextUrl.pathname;
  const isAdminSurface=pathname==='/admin'||pathname.startsWith('/admin/')||pathname.startsWith('/api/admin/');
  const isCabinetLogin=pathname==='/cabinet/login'||pathname.startsWith('/api/cabinet/request-code')||pathname.startsWith('/api/cabinet/login');
  const isCabinetPage=pathname==='/cabinet'||pathname.startsWith('/cabinet/');
  const isPrivateCabinetApi=pathname.startsWith('/api/cabinet/')&&!isCabinetLogin;

  if(isAdminSurface){
    if(!hasAdminGuardConfigured()){
      if(process.env.NODE_ENV!=='production')return NextResponse.next();
      return new NextResponse('RSService26 admin guard is not configured. Set ADMIN_BASIC_AUTH or ADMIN_SECRET.',{status:503});
    }
    if(isAllowedByBasicAuth(request)||isAllowedBySecret(request))return NextResponse.next();
    return unauthorized();
  }

  if(isCabinetLogin)return NextResponse.next();

  if(isCabinetPage){
    if(await hasValidCabinetSession(request))return NextResponse.next();
    return cabinetRedirect(request);
  }

  if(isPrivateCabinetApi){
    if(await hasValidCabinetSession(request))return NextResponse.next();
    return Response.json({ok:false,error:'Требуется вход в кабинет'},{status:401});
  }

  return NextResponse.next();
}

export const config={matcher:['/admin/:path*','/api/admin/:path*','/cabinet/:path*','/api/cabinet/:path*']};
