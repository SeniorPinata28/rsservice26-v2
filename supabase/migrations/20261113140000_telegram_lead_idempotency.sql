-- Prevent Telegram webhook retries from creating duplicate customer requests.
create unique index if not exists leads_telegram_update_unique
on public.leads ((raw_payload->>'telegram_update_id'))
where source = 'telegram' and raw_payload->>'telegram_update_id' is not null;
