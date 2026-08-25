export function cleanText(value,maxLength=500){return String(value??'').trim().replace(/\u0000/g,'').slice(0,maxLength)}
export function normalizeRussianPhone(value){
  let digits=String(value??'').replace(/\D/g,'');
  if(digits.length===10)digits='7'+digits;
  if(digits.length===11&&digits.startsWith('8'))digits='7'+digits.slice(1);
  return digits.length===11&&digits.startsWith('7')?digits:'';
}
export function validVin(value){const vin=cleanText(value,17).toUpperCase();return !vin||/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)}
export function requestTooLarge(request,maxBytes=65536){const size=Number(request.headers.get('content-length')||0);return Number.isFinite(size)&&size>maxBytes}
export async function readLimitedJson(request,maxBytes=65536){
  if(requestTooLarge(request,maxBytes)){
    const error=new Error('REQUEST_TOO_LARGE');error.code='REQUEST_TOO_LARGE';throw error;
  }
  if(!request.body)return {};
  const reader=request.body.getReader();
  const chunks=[];let total=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>maxBytes){
        await reader.cancel().catch(()=>null);
        const error=new Error('REQUEST_TOO_LARGE');error.code='REQUEST_TOO_LARGE';throw error;
      }
      chunks.push(value);
    }
  }finally{reader.releaseLock()}
  const bytes=new Uint8Array(total);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  const text=new TextDecoder().decode(bytes);
  if(!text.trim())return {};
  try{return JSON.parse(text)}
  catch{const error=new Error('INVALID_JSON');error.code='INVALID_JSON';throw error}
}
export function publicError(error,status=500){
  if(process.env.NODE_ENV!=='production')console.error(error);
  if(error?.code==='REQUEST_TOO_LARGE')return Response.json({ok:false,error:'Слишком большой запрос'},{status:413});
  if(error?.code==='INVALID_JSON')return Response.json({ok:false,error:'Некорректный JSON'},{status:400});
  return Response.json({ok:false,error:'Не удалось выполнить запрос. Попробуйте позже или позвоните менеджеру.'},{status});
}
