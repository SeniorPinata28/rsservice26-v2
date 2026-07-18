const DEFAULT_MARKUP_PERCENT=60;

function number(value){
  if(value===undefined||value===null||String(value).trim()==='')return null;
  const parsed=Number(String(value??'').replace(',','.'));
  return Number.isFinite(parsed)?parsed:null;
}

export function getMarkupPercent(env=process.env){
  const percent=number(env.RSSERVICE26_MARKUP_PERCENT);
  if(percent!==null&&percent>=0)return percent;

  return DEFAULT_MARKUP_PERCENT;
}

export function calculateClientPrice(purchasePrice,env=process.env){
  const purchase=number(purchasePrice);
  if(purchase===null||purchase<=0)return null;
  return Math.ceil(purchase*(1+getMarkupPercent(env)/100));
}
