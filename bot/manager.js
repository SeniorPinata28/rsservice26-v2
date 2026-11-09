import { Markup } from 'telegraf';

const URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const OWNER = process.env.TELEGRAM_OWNER_ID || '';
const DEPUTIES = new Set((process.env.TELEGRAM_DEPUTY_IDS || '').split(',').map(x => x.trim()).filter(Boolean));
const STATUSES = { accept: 'accepted', progress: 'in_progress', done: 'completed', cancel: 'cancelled' };
const LABELS = { new: 'Новая', new_contact: 'Новый контакт', accepted: 'Принята', in_progress: 'В работе', completed: 'Выполнена', cancelled: 'Отменена' };
const clean = value => String(value ?? '—').slice(0, 500);
const isStaff = ctx => Boolean(ctx.from && (String(ctx.from.id) === OWNER || DEPUTIES.has(String(ctx.from.id))));
const isTest = lead => lead.type === 'debug' || /codex|test|тест/i.test([lead.source, lead.request_text, lead.name].join(' '));

async function db(path, options = {}) {
  if (!URL || !KEY) throw new Error('Не заданы SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(URL + '/rest/v1/' + path, {
    ...options,
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', ...options.headers }
  });
  if (!response.ok) throw new Error('Supabase HTTP ' + response.status);
  return response.status === 204 ? null : response.json();
}

const leadButtons = lead => Markup.inlineKeyboard([
  [Markup.button.callback('Принять', 'rs:accept:' + lead.id), Markup.button.callback('В работе', 'rs:progress:' + lead.id)],
  [Markup.button.callback('Выполнено', 'rs:done:' + lead.id), Markup.button.callback('Отменить', 'rs:cancel:' + lead.id)]
]);

async function card(ctx, lead) {
  const car = lead.car_text || 'Не указан';
  const details = [
    'Заявка ' + clean(lead.public_id || lead.id),
    'Статус: ' + (LABELS[lead.status] || clean(lead.status)),
    'Клиент: ' + clean(lead.name),
    'Телефон: ' + clean(lead.phone),
    'Автомобиль: ' + clean(car),
    'Обращение: ' + clean(lead.request_text),
    'Артикул/VIN: ' + clean(lead.vin),
    'Цена: ' + clean(lead.price_client),
    'Наличие: ' + clean(lead.stock_count),
    'Доставка: ' + clean(lead.delivery_date),
    isTest(lead) ? 'ТЕСТОВАЯ ЗАЯВКА' : ''
  ].filter(Boolean).join('\n');
  await ctx.reply(details, leadButtons(lead));
}

export function registerManager(bot) {
  bot.command('myid', ctx => ctx.reply('Ваш Telegram ID: ' + ctx.from.id));
  bot.command('manager', async ctx => {
    if (!isStaff(ctx)) return ctx.reply('Нет доступа к управлению заявками.');
    try {
      const leads = await db('leads?select=id,public_id,status,type,source,name,phone,car_text,request_text,vin,price_client,stock_count,delivery_date&order=created_at.desc&limit=20');
      const live = leads.filter(lead => !isTest(lead));
      await ctx.reply('Последние заявки: ' + live.length + '. Тестовые: ' + (leads.length - live.length) + '.');
      for (const lead of live.slice(0, 10)) await card(ctx, lead);
    } catch (error) {
      console.error('Manager list error:', error.message);
      await ctx.reply('Не удалось получить заявки. Проверьте подключение к базе.');
    }
  });
  bot.action(/^rs:(accept|progress|done|cancel):([0-9a-f-]{36})$/, async ctx => {
    if (!isStaff(ctx)) return ctx.answerCbQuery('Недостаточно прав', { show_alert: true });
    const action = ctx.match[1];
    const id = ctx.match[2];
    try {
      const existing = await db('leads?id=eq.' + encodeURIComponent(id) + '&select=id,public_id,status,type,source,name,request_text&limit=1');
      if (!existing.length) return ctx.answerCbQuery('Заявка не найдена', { show_alert: true });
      if (isTest(existing[0])) return ctx.answerCbQuery('Тестовая заявка: изменение запрещено', { show_alert: true });
      const status = STATUSES[action];
      const updated = await db('leads?id=eq.' + encodeURIComponent(id) + '&status=eq.' + encodeURIComponent(existing[0].status), {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status, updated_at: new Date().toISOString(), ...(action === 'done' || action === 'cancel' ? { closed_at: new Date().toISOString() } : { closed_at: null }) })
      });
      if (!updated.length) return ctx.answerCbQuery('Статус уже изменён. Обновите список.', { show_alert: true });
      // Audit is written only after the migration has been applied.
      try {
        await db('telegram_manager_actions', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ lead_id: id, telegram_user_id: String(ctx.from.id), action, old_status: existing[0].status, new_status: status })
        });
      } catch (auditError) {
        console.error('Manager audit error:', auditError.message);
      }
      await ctx.answerCbQuery('Статус обновлён');
      await ctx.reply('Заявка ' + clean(existing[0].public_id) + ': ' + LABELS[status]);
    } catch (error) {
      console.error('Manager update error:', error.message);
      await ctx.answerCbQuery('Ошибка обновления', { show_alert: true });
    }
  });
}
