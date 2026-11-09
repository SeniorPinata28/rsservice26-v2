// Deputy manager controls. Enabled only when IDs and server-side Supabase credentials are configured.
import { Markup } from 'telegraf';

const allowedStatuses = new Map([
  ['accept', ['accepted', 'Принята']],
  ['progress', ['in_progress', 'В работе']],
  ['done', ['completed', 'Выполнена']],
  ['cancel', ['cancelled', 'Отменена']]
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
  [Markup.button.callback('Новые заявки', 'mgr:list')],
  [Markup.button.callback('Обновить', 'mgr:list')]
]);
const actionButtons = id => Markup.inlineKeyboard([
  [Markup.button.callback('Принять', 'mgr:accept:' + id), Markup.button.callback('В работе', 'mgr:progress:' + id)],
  [Markup.button.callback('Выполнено', 'mgr:done:' + id), Markup.button.callback('Отменить', 'mgr:cancel:' + id)]
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
  bot.action('mgr:list', async ctx => {
    if (!roleFor(ctx.from.id) || ctx.chat.type !== 'private') return ctx.answerCbQuery('Нет доступа');
    await ctx.answerCbQuery();
    try {
      const leads = await api('leads?select=id,public_id,status,name,phone,car_text,request_text,price_client,stock_count,delivery_date&order=created_at.desc&limit=10');
      if (!leads.length) return ctx.reply('Заявок нет.', menu);
      for (const lead of leads) await ctx.reply(renderLead(lead), actionButtons(lead.id));
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
      const updated = await api('leads?id=eq.' + id + '&select=id,public_id,status', {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status, updated_at: new Date().toISOString(), ...(status === 'completed' || status === 'cancelled' ? { closed_at: new Date().toISOString() } : { closed_at: null }) })
      });
      if (!updated?.length) return ctx.reply('Заявка не найдена.');
      await ctx.reply('Заявка ' + escapeText(updated[0].public_id || id) + ': ' + label);
    } catch { await ctx.reply('Статус не сохранён. Проверьте подключение и права.'); }
  });
}
