import {getRosskoCheckoutDetails} from '../../../../lib/rossko';

export async function GET(){
  try{
    const result=await getRosskoCheckoutDetails();
    return Response.json(result);
  }catch(e){
    return Response.json({ok:false,error:'Ошибка запроса Rossko checkout details'},{status:500});
  }
}
