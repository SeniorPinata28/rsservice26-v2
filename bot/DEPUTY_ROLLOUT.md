# Telegram deputy manager — staging rollout

## Scope
This branch adds private-chat-only `/manager` and `/myid` commands to the existing Telegraf bot. It does not alter the public booking/parts flows or the website's notification API. The manager panel reads ten recent Supabase leads and can change lead statuses.

## Required server-only configuration
- `BOT_TOKEN`: the token of the **actual** deployed Telegram bot (verify with BotFather before rollout).
- `OWNER_TELEGRAM_IDS`: comma-separated numeric Telegram IDs of owners.
- `DEPUTY_TELEGRAM_IDS`: comma-separated numeric Telegram IDs of authorized deputies. **Do not enter @usernames.** Ask Simon to send `/myid` to the bot, then verify his identity independently.
- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: backend-only credential; never send to the deputy, commit it, or put it in client code.

No Telegram ID has been configured in this branch. Without explicit IDs, no manager can access the panel. The `/myid` command reveals only the sender's own Telegram ID.

## Pre-deployment checks
1. Identify the live process running @rsservice26_manager_bot. The Next.js Vercel deployment is not proof that the Telegraf long-polling bot is running there.
2. Confirm that the live bot is based on `bot/index.js`. Do not run two pollers against the same token.
3. Obtain and independently verify numeric Telegram IDs. Confirm that the owner remains in control of BotFather and Supabase.
4. Verify current status values accepted by the site's CRM; this branch uses `accepted`, `in_progress`, `completed`, `cancelled` and may require mapping to the site's existing status vocabulary.
5. Run syntax and integration tests against a test bot and test database; verify unauthorized users and group chats cannot access manager functions.
6. Only then merge/deploy, test a test lead, and verify the existing website notifications still arrive.

## Remaining work
- Persistent audit log (who changed each lead and when) is **not implemented**.
- Customer history and part order confirmation are **not implemented**.
- Test-lead isolation is **not implemented**.
- Assignment of `manager_id` to an actual staff record is **not implemented**.
- Live bot identity, runtime and end-to-end tests are **not verified**.

Do not merge this branch into production before the checks above.

## Audit findings (2026-11-09)
- The website posts Telegram notifications directly in `web/app/api/leads/route.js` using `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. This does **not** establish that the separate `bot/index.js` long-polling process is deployed anywhere.
- Vercel project `rsservice26-v2` contains the website's Telegram environment variables but no `BOT_TOKEN`, `OWNER_TELEGRAM_IDS` or `DEPUTY_TELEGRAM_IDS` for the separate bot process.
- Supabase has `leads`, `customers`, `vehicles`, `parts_requests`; `telegram_manager_audit` is absent in production. SQL migration is staged in `supabase/telegram_manager_audit.sql` but NOT applied.
- Existing website statuses: `new_contact`, `in_progress`, `waiting_client`, `completed`, `declined`. The branch adds `accepted` to the website's normalization list; bot maps cancel to `declined`.
- Bot now provides filtered real/test leads, client lead history, linked vehicles, and linked part request read-only details. **Part-order confirmation is not implemented.**
- Test-lead detection is heuristic by `source`, `type`, and `raw_payload.test`. It is not a fully reliable production/test isolation mechanism.
- Status updates use an atomic audited SQL RPC and intentionally fail without the migration.
- Numeric IDs of owner and deputy remain unconfigured. The username `@SGalstyan720` is not a numeric Telegram ID.

## Deployment gate
Do not merge or deploy until the runtime and bot token identity are confirmed, owner/deputy numeric IDs verified, staging tests run, and SQL migration reviewed. No live user data should be changed during testing.
