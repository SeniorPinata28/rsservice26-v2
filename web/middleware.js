import {NextResponse} from 'next/server';

function unauthorized(message='RSService26 admin access required'){
  return new NextResponse(message,{
    status:401,
    headers:{'WWW-Authenticate':'Basic realm="RSService26 Admin", charset="UTF-8"'}
  });
}

function isAllowedByBasicAuth(request){
  const expected=process.env.ADMIN_BASIC_AUTH;
  if(!expected)return false;
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Basic '))return false;
  try{
    const decoded=atob(header.slice(6));
    return decoded===expected;
  }catch(e){
    return false;
  }
}

function isAllowedBySecret(request){
  const secret=process.env.ADMIN_SECRET;
  if(!secret)return false;
  const header=request.headers.get('x-admin-secret')||'';
  const cookie=request.cookies.get('rs_admin_secret')?.value||'';
  const query=request.nextUrl.searchParams.get('admin_secret')||'';
  return header===secret||cookie===secret||query===secret;
}

function hasAdminGuardConfigured(){
  return Boolean(process.env.ADMIN_BASIC_AUTH||process.env.ADMIN_SECRET);
}

export function middleware(request){
  const pathname=request.nextUrl.pathname;
  const isAdminSurface=pathname==='/admin'||pathname.startsWith('/admin/')||pathname.startsWith('/api/admin/');
  if(!isAdminSurface)return NextResponse.next();

  if(!hasAdminGuardConfigured()){
    if(process.env.NODE_ENV!=='production')return NextResponse.next();
    return new NextResponse('RSService26 admin guard is not configured. Set ADMIN_BASIC_AUTH or ADMIN_SECRET.',{status:503});
  }

  if(isAllowedByBasicAuth(request)||isAllowedBySecret(request))return NextResponse.next();
  return unauthorized();
}

export const config={
  matcher:['/admin/:path*','/api/admin/:path*']
};
