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
