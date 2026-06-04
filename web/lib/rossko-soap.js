import soap from 'soap';
import iconv from 'iconv-lite';

const SEARCH_WSDL = 'https://api.rossko.ru/service/v2.1/GetSearch?wsdl';
const DETAILS_WSDL = 'https://api.rossko.ru/service/v2.1/GetCheckoutDetails?wsdl';

function credentials(){
  const KEY1 = process.env.ROSSKO_KEY1;
  const KEY2 = process.env.ROSSKO_KEY2;
  return {KEY1, KEY2, ready: Boolean(KEY1 && KEY2)};
}

function list(value){
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function unwrap(response){
  if (!response || typeof response !== 'object') return response;
  const resultKey = Object.keys(response).find((key) => key.toLowerCase().endsWith('result'));
  return resultKey ? response[resultKey] : response;
}

function fixText(value){
  const text = String(value || '');
  if (!/[РС][А-Яа-яA-Za-z0-9]/.test(text)) return text;
  try {
    return iconv.decode(iconv.encode(text, 'win1251'), 'utf8');
  } catch {
    return text;
  }
}

function debugRaw(value){
  try {
    return JSON.stringify(value, null, 2).replace(String(process.env.ROSSKO_KEY1 || '__key1__'), 'hidden_key1').replace(String(process.env.ROSSKO_KEY2 || '__key2__'), 'hidden_key2').slice(0, 3000);
  } catch {
    return 'raw unavailable';
  }
}

function deepFindArray(obj, names){
  if (!obj || typeof obj !== 'object') return [];
  for (const name of names){
    if (obj[name]) return list(obj[name]);
  }
  for (const value of Object.values(obj)){
    const found = deepFindArray(value, names);
    if (found.length) return found;
  }
  return [];
}

async function call(wsdl, method, payload){
  const client = await soap.createClientAsync(wsdl, {disableCache: true});
  const fn = client[`${method}Async`];
  if (!fn) throw new Error(`SOAP method not found: ${method}`);
  const [response] = await fn(payload);
  return {response, data: unwrap(response)};
}

function parseCheckout(data){
  const root = unwrap(data) || {};
  const deliveryType = root.DeliveryType || root.deliveryType || {};
  const paymentType = root.PaymentType || root.paymentType || {};
  const deliveryAddress = root.DeliveryAddress || root.deliveryAddress || {};

  const deliveries = list(deliveryType.delivery || deliveryType.Delivery || root.delivery || root.Delivery)
    .map((item) => ({id: String(item.id || ''), name: fixText(item.name)}))
    .filter((item) => item.id || item.name);

  const payments = list(paymentType.payment || paymentType.Payment || root.payment || root.Payment)
    .map((item) => ({id: String(item.id || ''), name: fixText(item.name)}))
    .filter((item) => item.id || item.name);

  const addresses = list(deliveryAddress.address || deliveryAddress.Address || root.address || root.Address)
    .map((item) => ({
      id: String(item.id || ''),
      city: fixText(item.city),
      street: fixText(item.street),
      house: fixText(item.house),
      office: fixText(item.office),
      raw: [fixText(item.city), fixText(item.street), fixText(item.house), fixText(item.office)].filter(Boolean).join(', ')
    }))
    .filter((item) => item.id || item.raw);

  return {deliveries, payments, addresses};
}

function parseParts(data){
  const root = unwrap(data) || {};
  const partsList = root.PartsList || root.partsList || root.PartList || root.parts || {};
  let parts = list(partsList.Part || partsList.part || root.Part || root.part);
  if (!parts.length) parts = deepFindArray(root, ['Part', 'part']);

  return parts.map((part) => {
    const stockWrap = part.stocks || part.Stocks || {};
    const stocks = list(stockWrap.stock || stockWrap.Stock || part.stock || part.Stock).map((stock) => ({
      id: String(stock.id || ''),
      price: String(stock.price || ''),
      count: Number(stock.count || 0),
      multiplicity: Number(stock.multiplicity || 1),
      type: String(stock.type || ''),
      delivery: String(stock.delivery || ''),
      extra: String(stock.extra || ''),
      description: fixText(stock.description),
      deliveryStart: String(stock.deliveryStart || ''),
      deliveryEnd: String(stock.deliveryEnd || '')
    }));

    return {
      guid: String(part.guid || ''),
      brand: fixText(part.brand),
      partnumber: String(part.partnumber || ''),
      name: fixText(part.name),
      stocks,
      totalCount: stocks.reduce((sum, stock) => sum + Number(stock.count || 0), 0),
      minPrice: stocks.map((stock) => Number(String(stock.price).replace(',', '.'))).filter(Boolean).sort((a, b) => a - b)[0] || null
    };
  }).filter((part) => part.partnumber || part.name || part.brand);
}

export async function getRosskoCheckoutDetails(){
  const {KEY1, KEY2, ready} = credentials();
  if (!ready) return {ok: false, configured: false, error: 'Rossko keys are not configured'};
  try {
    const {response, data} = await call(DETAILS_WSDL, 'GetCheckoutDetails', {KEY1, KEY2});
    return {ok: true, configured: true, success: data?.success, message: fixText(data?.message || ''), ...parseCheckout(data), raw: debugRaw(response)};
  } catch (error) {
    return {ok: false, configured: true, error: error.message || 'Rossko SOAP error', raw: String(error.message || error).slice(0, 1000)};
  }
}

export async function searchRossko(query){
  const {KEY1, KEY2, ready} = credentials();
  const deliveryId = process.env.ROSSKO_DELIVERY_ID;
  const addressId = process.env.ROSSKO_ADDRESS_ID;
  if (!ready || !deliveryId || !addressId) return {ok: false, configured: false, error: 'Rossko search variables are not configured'};
  try {
    const {response, data} = await call(SEARCH_WSDL, 'GetSearch', {KEY1, KEY2, text: query, delivery_id: deliveryId, address_id: addressId});
    const parts = parseParts(data);
    return {ok: true, configured: true, success: data?.success, message: fixText(data?.message || ''), parts, rawCount: parts.length, raw: debugRaw(response)};
  } catch (error) {
    return {ok: false, configured: true, error: error.message || 'Rossko SOAP error', raw: String(error.message || error).slice(0, 1000)};
  }
}
