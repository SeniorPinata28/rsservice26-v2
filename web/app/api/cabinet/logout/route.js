import {clearCabinetSessionCookie} from '../../../../lib/cabinet-auth.js';
import {NextResponse} from 'next/server';

export async function POST(){
  const response=NextResponse.json({ok:true});
  return clearCabinetSessionCookie(response);
}
