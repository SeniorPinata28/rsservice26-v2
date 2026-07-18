export function cleanText(value,maxLength=500){return String(value??'').trim().replace(/\u0000/g,'').slice(0,maxLength)}
export function normalizeRussianPhone(value){
  let digits=String(value??'').replace(/\D/g,'');
  if(digits.length===10)digits='7'+digits;
  if(digits.length===11&&digits.startsWith('8'))digits='7'+digits.slice(1);
  return digits.length===11&&digits.startsWith('7')?digits:'';
}
export function validVin(value){const vin=cleanText(value,17).toUpperCase();return !vin||/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)}
export function requestTooLarge(request,maxBytes=65536){const size=Number(request.headers.get('content-length')||0);return Number.isFinite(size)&&size>maxBytes}
export function publicError(error,status=500){
  if(process.env.NODE_ENV!=='production')console.error(error);
  return Response.json({ok:false,error:'Не удалось выполнить запрос. Попробуйте позже или позвоните менеджеру.'},{status});
}
