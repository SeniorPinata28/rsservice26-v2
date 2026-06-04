export async function GET(){return Response.json({ok:true,message:'Leads API is running',storage:'telegram-notification + browser admin demo'})}

export async function POST(request){
  try{
    const data=await request.json();
    const name=String(data.name||'').trim();
    const phone=String(data.phone||'').trim();
    const car=String(data.car||'').trim();
    const text=String(data.text||'').trim();
    if(!name||!phone||!text){return Response.json({ok:false,error:'Заполните имя, телефон и текст заявки'},{status:400})}
    const lead={id:Date.now(),date:new Date().toISOString(),name,phone,car,text,status:'new',source:'site'};
    const token=process.env.TELEGRAM_BOT_TOKEN||process.env.BOT_TOKEN;
    const chat=process.env.TELEGRAM_CHAT_ID||process.env.MANAGER_CHAT_ID;
    let telegram=false;
    if(token&&chat){
      const message=`Новая заявка RSService26\n\nИмя: ${name}\nТелефон: ${phone}\nАвто: ${car||'не указано'}\n\n${text}`;
      const tg=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text:message})});
      telegram=tg.ok;
    }
    return Response.json({ok:true,telegram,lead});
  }catch(e){
    return Response.json({ok:false,error:'Ошибка обработки заявки'},{status:500});
  }
}
