import {clearCabinetSessionCookie} from '../../../../lib/cabinet-auth.js';

export async function POST(){
  const response=Response.json({ok:true});
  return clearCabinetSessionCookie(response);
}
