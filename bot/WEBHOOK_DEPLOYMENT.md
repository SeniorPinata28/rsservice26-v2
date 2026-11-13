# Unified Telegram sales assistant

Production is hosted by the website at `/api/telegram/webhook`. Do not run the legacy long-polling `bot/index.js` with this bot token.

## Customer flow

Private conversations retain recent context for up to seven days of inactivity. The assistant gives short service advice, asks for city, car, need and contact number, then shows a confirmation button. Only confirmation creates a CRM lead. The customer can add information to that lead or start a new request. Parts availability, exact pricing and booking times require staff confirmation.

## Staff flow

Use `/manager` or `/sales` in the configured manager group or privately with the bot. Every action checks the sender's current creator/administrator role using Telegram getChatAdministrators. Other members and anonymous group senders cannot use staff actions. The panel lists active leads and highlights new leads older than 15 minutes. Status changes are preceded by an audit record and use an optimistic status check; a second audit event records success. An AI adviser proposes a next action and a reply draft. A draft expires after 30 minutes and can be sent only by its creator after explicit confirmation, only to the customer chat bound to that Telegram lead. The send claim prevents a second click from resending it. Website leads without a bound Telegram chat must be contacted using their provided phone.

## Storage and model

Apply `supabase/migrations/20261113150000_telegram_sales_assistant.sql`. All four tables have RLS and service-role-only privileges. AI reservations use unique daily global and per-chat slots to enforce quotas even across concurrent workers. The default is 100 AI requests per day across the bot and 20 per chat; this is a request cap, not a currency billing limit. Failed requests consume a reservation. No automatic credit purchases or subscription changes are made. Expired sessions are ignored; physical retention cleanup can be scheduled separately.

Server-only production settings: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_AI_ENABLED`, `AI_GATEWAY_MODEL`, `TELEGRAM_AI_DAILY_LIMIT`, `TELEGRAM_AI_CHAT_DAILY_LIMIT`. AI Gateway authenticates with the deployment's Vercel OIDC token. No provider key is committed. If the model is unavailable, guided intake and manual manager actions remain usable; the bot must not claim an AI response succeeded.

The model sees a bounded, redacted request context and the published service catalogue. It cannot read arbitrary CRM records, change prices or statuses, book time, send replies or order parts. These actions are deterministic and authorization-gated. No unsolicited customer campaigns or automatic follow-up messages are configured. This assistant helps collect and process leads; revenue growth has not been measured.

## Verification

Run `node web/scripts/telegram-bot-check.mjs` for consent, persistent dialogue, duplicate protection, staff authorization, audit, reply ownership, double-send protection and concurrent quotas. Run `npm --prefix web run build`. After deployment, the secret-protected fixed-prompt `/api/telegram/ai-health` POST verifies a real model call without customer data. Check getWebhookInfo, and have a group administrator run `/manager` and a customer start a new conversation. Never print tokens or authorization headers.
