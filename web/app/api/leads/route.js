import {createLead,dbReady} from '../../../lib/db.js';

export async function GET(){return Response.json({ok:true,message:'Leads API is running',storage:dbReady()?'supabase + telegram':'telegram fallback'})}

export async function POST(request){
  try{
    const data=await request.json();
    const name=String(data.name||'').trim();
    const phone=String(data.phone||'').trim();
    const car=String(data.car||'').trim();
    const text=String(data.text||data.message||data.comment||data.request||'').trim();
    const type=String(data.type||'question').trim();
    const vin=String(data.vin||'').trim();
    const mileage=data.mileage?Number(data.mileage):null;
    if(!name||!phone||!text){return Response.json({ok:false,error:'Заполните имя, телефон и текст заявки'},{status:400})}

    let savedLead=null;
    let dbError=null;
    if(dbReady()){
      try{
        savedLead=await createLead({type,name,phone,car,text,vin,mileage,customerId:null,raw:{...data,contact_status:'unverified'}});
      }catch(e){dbError=String(e?.message||e)}
    }

    const lead=savedLead||{id:Date.now(),public_id:null,date:new Date().toISOString(),type,name,phone,car,text,status:'new',source:'site'};
    const token=process.env.TELEGRAM_BOT_TOKEN||process.env.BOT_TOKEN;
    const chat=process.env.TELEGRAM_CHAT_ID||process.env.MANAGER_CHAT_ID;
    let telegram=false;
    if(token&&chat){
      const number=lead.public_id?` #${lead.public_id}`:'';
      const message=`Новая заявка RSService26${number}\n\nСтатус контакта: новый контакт\nТип: ${type}\nИмя: ${name}\nТелефон: ${phone}\nАвто: ${car||'не указано'}${vin?'\nVIN: '+vin:''}\n\n${text}`;
      const tg=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text:message})});
      telegram=tg.ok;
    }
    return Response.json({ok:true,telegram,saved:Boolean(savedLead),dbReady:dbReady(),dbError,customerId:null,contactStatus:'unverified',lead});
  }catch(e){
    return Response.json({ok:false,error:'Ошибка обработки заявки',details:String(e?.message||e)},{status:500});
  }
}
