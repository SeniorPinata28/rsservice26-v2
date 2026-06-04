import {searchRossko} from '../../../../lib/rossko-soap';

export async function GET(request){
  const {searchParams}=new URL(request.url);
  const q=String(searchParams.get('q')||'').trim();
  if(!q){return Response.json({ok:false,error:'Укажите параметр q'} ,{status:400})}
  try{
    const result=await searchRossko(q);
    return Response.json(result);
  }catch(e){
    return Response.json({ok:false,error:'Ошибка запроса Rossko API'},{status:500});
  }
}

export async function POST(request){
  try{
    const data=await request.json();
    const q=String(data.q||data.text||'').trim();
    if(!q){return Response.json({ok:false,error:'Укажите поисковый запрос'},{status:400})}
    const result=await searchRossko(q);
    return Response.json(result);
  }catch(e){
    return Response.json({ok:false,error:'Ошибка запроса Rossko API'},{status:500});
  }
}
