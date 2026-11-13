# Telegram bot on the website

Production runs via `web/app/api/telegram/webhook/route.js` on Vercel. Do not start the legacy `bot/index.js` long-polling process with the same token while the webhook is registered.

Server-only Production variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`. The webhook secret must also be supplied as Telegram `setWebhook.secret_token`. Only `message` and `callback_query` updates are needed. Use `max_connections: 1` and preserve pending updates.

Client menu opens the site's booking and parts-search forms, provides service prices and the two workshop contacts, and accepts a phone number plus request in one message. Such requests are saved in Supabase as `source=telegram`, then sent to the configured manager group. A saved lead stays in CRM if Telegram notification fails. This bot uses explicit menus and templates, not an AI model.

Apply `supabase/migrations/20261113140000_telegram_lead_idempotency.sql` before enabling intake. The unique index prevents duplicate leads on Telegram redelivery. Group messages are ignored, and webhook requests require Telegram's secret header. Intake is rate limited per client chat.

Run `node web/scripts/telegram-bot-check.mjs` to check authorization, menu, save/notify and duplicate delivery with mocked external services. After deployment, check unauthorized POST=401, register webhook, check getWebhookInfo, and send a clearly labelled test notification to the configured manager group. Do not print tokens in logs or commit them.
