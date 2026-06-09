import {db} from '../../../../../lib/db.js';

const required=['id','customer_id','car_text','brand','model','year','vin','plate_number','mileage','notes','raw_payload'];

export async function GET(){
  try{
    const r=await db('vehicles?select=*&limit=1');
    const sample=Array.isArray(r.data)?r.data[0]||{}:{};
    const available=Object.keys(sample);
    const missing=required.filter(key=>!available.includes(key));
    return Response.json({ok:r.ok,required,available,missing,ready:missing.length===0});
  }catch(e){
    return Response.json({ok:false,error:'Не удалось проверить схему vehicles',details:String(e?.message||e)},{status:500});
  }
}
