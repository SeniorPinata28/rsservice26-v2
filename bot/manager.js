// Deputy manager controls. Enabled only when IDs and server-side Supabase credentials are configured.
import { Markup } from 'telegraf';

const testLead = x => /codex|test|debug|smoke|acceptance/i.test([x.source,x.type].join(' ')) || x.raw_payload?.test === true;
const allowedStatuses = new Map([
  ['accept', ['accepted', 'Принята']],
  ['progress', ['in_progress', 'В работе']],
  ['done', ['completed', 'Выполнена']],
  ['cancel', ['declined', 'Отменена']]
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const csvIds = (value = '') => new Set(value.split(',').map(s => s.trim()).filter(s => /^\d+$/.test(s)));
const ownerIds = csvIds(process.env.OWNER_TELEGRAM_IDS);
const deputyIds = csvIds(process.env.DEPUTY_TELEGRAM_IDS);
const roleFor = id => ownerIds.has(String(id)) ? 'owner' : deputyIds.has(String(id)) ? 'deputy' : null;
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ready = () => Boolean(supabaseUrl && supabaseKey);
const escapeText = value => String(value ?? '—').slice(0, 800);
const api = async (path, options = {}) => {
  if (!ready()) throw new Error('Supabase credentials are not configured');
  const response = await fetch(supabaseUrl + '/rest/v1/' + path, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: 'Bearer ' + supabaseKey,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error('Supabase request failed: HTTP ' + response.status);
  const raw = await response.text();
  return raw ? JSON.parse(raw) : null;
};
const menu = Markup.inlineKeyboard([
  [Markup.button.callback('Реальные заявки', 'mgr:list:real'), Markup.button.callback('Тестовые', 'mgr:list:test')]
]);
const actionButtons = id => Markup.inlineKeyboard([
  [Markup.button.callback('Принять', 'mgr:accept:' + id), Markup.button.callback('В работе', 'mgr:progress:' + id)],
  [Markup.button.callback('Выполнено', 'mgr:done:' + id), Markup.button.callback('Отменить', 'mgr:cancel:' + id)],
  [Markup.button.callback('История клиента', 'mgr:history:' + id), Markup.button.callback('Запчасти', 'mgr:parts:' + id)]
]);
const renderLead = lead => [
  'Заявка ' + escapeText(lead.public_id || lead.id),
  'Статус: ' + escapeText(lead.status),
  'Имя: ' + escapeText(lead.name),
  'Телефон: ' + escapeText(lead.phone),
  'Авто: ' + escapeText(lead.car_text),
  'Запрос: ' + escapeText(lead.request_text),
  'Цена: ' + escapeText(lead.price_client),
  'Остаток: ' + escapeText(lead.stock_count),
  'Доставка: ' + escapeText(lead.delivery_date)
].join('\n');

export function registerManager(bot) {
  bot.command('myid', ctx => ctx.reply('Ваш Telegram ID: ' + ctx.from.id));
  bot.command('manager', async ctx => {
    if (!roleFor(ctx.from.id) || ctx.chat.type !== 'private') return ctx.reply('Доступ к управлению не предоставлен.');
    if (!ready()) return ctx.reply('Панель не настроена: отсутствует серверное подключение к Supabase.');
    return ctx.reply('RSService26 — панель управления (' + roleFor(ctx.from.id) + ')', menu);
  });
  bot.action(/^mgr:list:(real|test)$/, async ctx => {
    if (!roleFor(ctx.from.id) || ctx.chat.type !== 'private') return ctx.answerCbQuery('Нет доступа');
    await ctx.answerCbQuery();
    try {
      const leads = await api('leads?select=id,public_id,status,name,phone,car_text,request_text,price_client,stock_count,delivery_date,source,type,raw_payload&order=created_at.desc&limit=100');
      const filtered = leads.filter(x => testLead(x) === (ctx.match[1] === 'test')).slice(0,10);
      if (!filtered.length) return ctx.reply('Заявок нет.', menu);
      for (const lead of filtered) await ctx.reply(renderLead(lead), actionButtons(lead.id));
    } catch { await ctx.reply('Не удалось загрузить заявки. Проверьте серверное подключение.'); }
  });
  bot.action(/^mgr:(accept|progress|done|cancel):([0-9a-f-]+)$/i, async ctx => {
    if (!roleFor(ctx.from.id) || ctx.chat.type !== 'private') return ctx.answerCbQuery('Нет доступа');
    const action = ctx.match[1];
    const id = ctx.match[2];
    if (!uuidPattern.test(id)) return ctx.answerCbQuery('Некорректный ID');
    await ctx.answerCbQuery();
    try {
      const [status, label] = allowedStatuses.get(action);
      const existing = await api('leads?id=eq.' + id + '&select=id,public_id,status,source,type,raw_payload&limit=1');
      if (!existing?.length) return ctx.reply('Заявка не найдена.');
      if (testLead(existing[0])) return ctx.reply('Изменение тестовых заявок отключено.');
      if (existing[0].status === status) return ctx.reply('Статус уже установлен.');
      await api('rpc/manager_change_lead_status', {
        method: 'POST',
        body: JSON.stringify({p_lead_id:id,p_telegram_id:String(ctx.from.id),p_action:action,p_expected_status:existing[0].status,p_new_status:status})
      });
      const updated = [{public_id:existing[0].public_id}];
      if (!updated?.length) return ctx.reply('Заявка не найдена.');
      await ctx.reply('Заявка ' + escapeText(updated[0].public_id || id) + ': ' + label);
    } catch { await ctx.reply('Статус не сохранён. Проверьте подключение и права.'); }
  });
  bot.action(/^mgr:history:([0-9a-f-]+)$/i, async ctx => {
    if (!roleFor(ctx.from.id) || ctx.chat.type !== 'private') return ctx.answerCbQuery('Нет доступа');
    await ctx.answerCbQuery();
    try {
      const id=ctx.match[1];
      const lead=(await api('leads?id=eq.'+id+'&select=name,phone,customer_id&limit=1'))[0];
      if(!lead) return ctx.reply('Заявка не найдена.');
      const filter=lead.customer_id?'customer_id=eq.'+lead.customer_id:lead.phone?'phone=eq.'+encodeURIComponent(lead.phone):null;
      if(!filter) return ctx.reply('Недостаточно данных.');
      const history=await api('leads?select=public_id,status,request_text&'+filter+'&order=created_at.desc&limit=10');
      const vehicles=lead.customer_id?await api('vehicles?customer_id=eq.'+lead.customer_id+'&select=make,model,year,vin&limit=10'):[];
      await ctx.reply(['История: '+escapeText(lead.name),...history.map(x=>escapeText(x.public_id)+' — '+escapeText(x.status)+' — '+escapeText(x.request_text).slice(0,100)),...vehicles.map(x=>'Авто: '+escapeText(x.make)+' '+escapeText(x.model)+' '+escapeText(x.year)+' VIN '+escapeText(x.vin))].join('\\n').slice(0,3900));
    } catch { await ctx.reply('Ошибка получения истории.'); }
  });
  bot.action(/^mgr:parts:([0-9a-f-]+)$/i, async ctx => {
    if (!roleFor(ctx.from.id) || ctx.chat.type !== 'private') return ctx.answerCbQuery('Нет доступа');
    await ctx.answerCbQuery();
    try {
      const parts=await api('parts_requests?lead_id=eq.'+ctx.match[1]+'&select=part_name,part_number,client_price,stock_count,delivery_start,delivery_end,status&limit=10');
      if(!parts.length) return ctx.reply('По заявке нет оформленных запросов запчастей.');
      await ctx.reply(parts.map(x=>['Запчасть: '+escapeText(x.part_name),'Артикул: '+escapeText(x.part_number),'Цена: '+escapeText(x.client_price),'Наличие: '+escapeText(x.stock_count),'Доставка: '+escapeText(x.delivery_start)+' — '+escapeText(x.delivery_end),'Статус: '+escapeText(x.status)].join('\\n')).join('\\n\\n').slice(0,3900));
    } catch { await ctx.reply('Ошибка получения запчастей.'); }
  });
}
