# RSService26 v2

Рабочий репозиторий RSService26: сайт автосервиса/запчастей на Next.js и отдельный Telegram-бот.

## Структура

```text
web/        Next.js сайт, API routes, админка, кабинет, smoke-проверки
bot/        Telegram-бот для простых сценариев общения
supabase/   SQL-схемы и безопасные добавочные миграции для Supabase
```

## Что уже подключено

- Публичные страницы сайта: главная, проверка запчасти, каталог, корзина-черновик, запись, контакты.
- API заявок: `/api/leads` сохраняет обращения в Supabase и может отправлять уведомление в Telegram.
- Админка: `/admin` и `/api/admin/*` защищены `ADMIN_BASIC_AUTH` или `ADMIN_SECRET`.
- Кабинет клиента: серверные API, OTP-вход, HTTP-only cookie и middleware-защита уже реализованы; ссылка в меню включается флагом `NEXT_PUBLIC_CABINET_ENABLED=true`.
- Supabase SQL: базовые таблицы клиентов, автомобилей, заявок, комментариев, истории обслуживания, OTP-кодов и rate limit.
- Проверки: `npm run smoke` для статической проверки проекта и `npm run smoke:live` для проверки развернутого сайта.

## Локальный запуск сайта

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

Открыть: http://localhost:3000

Для реальной работы заявок заполните в `.env.local` минимум:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ADMIN_BASIC_AUTH или ADMIN_SECRET
```

Telegram-уведомления дополнительно требуют:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

## Supabase

Перед запуском на реальной базе примените SQL из папки `supabase/` в Supabase SQL Editor. Безопасный порядок:

1. `supabase/rsservice26_core_schema.sql`
2. `supabase/customers_admin_fields.sql`
3. `supabase/vehicles_admin_fields.sql`
4. `supabase/p3_cabinet_schema.sql`
5. `supabase/cabinet_login_codes.sql`
6. `supabase/rate_limits.sql`
7. `supabase/normalize_customer_status.sql`

Файлы используют `create table if not exists` и `add column if not exists`, поэтому рассчитаны на аккуратное добавление недостающих объектов без удаления production-данных.

## Проверки

Из корня репозитория:

```bash
npm run smoke
```

Для проверки развернутого сайта:

```bash
cd web
SMOKE_BASE_URL=https://your-site.example npm run smoke:live
```

Если админка закрыта секретом, добавьте `SMOKE_ADMIN_SECRET` или `SMOKE_ADMIN_BASIC_AUTH`.

## Деплой сайта на Vercel

При импорте проекта в Vercel укажите:

```text
Root Directory: web
Build Command: npm run build
Output Directory: оставить пустым
Install Command: npm install
```

В Vercel Environment Variables перенесите значения из `web/.env.example` и заполните реальные секреты.

## Запуск Telegram-бота

```bash
cd bot
npm install
cp .env.example .env
npm start
```

В `bot/.env` нужно заполнить `BOT_TOKEN`. Для уведомлений менеджеру также заполните `MANAGER_CHAT_ID`.

## Важно

- Оплата и реальные финансовые настройки не подключены.
- Корзина на сайте — это черновик подбора на устройстве клиента, а не интернет-магазин с оплатой.
- `SUPABASE_SERVICE_ROLE_KEY` должен храниться только на сервере/Vercel, не публикуйте его в клиентском коде.
