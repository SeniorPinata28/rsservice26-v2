-- RSService26 launch schema fix
-- Цель: зафиксировать базовый контур заявок без преждевременной CRM.
-- Выполнить один раз в Supabase SQL Editor перед запуском, если этих колонок нет.

alter table if exists leads add column if not exists public_id text;
alter table if exists leads add column if not exists created_at timestamptz default now();
alter table if exists leads add column if not exists type text;
alter table if exists leads add column if not exists status text default 'new_contact';
alter table if exists leads add column if not exists source text default 'site';
alter table if exists leads add column if not exists name text;
alter table if exists leads add column if not exists phone text;
alter table if exists leads add column if not exists car_text text;
alter table if exists leads add column if not exists vin text;
alter table if exists leads add column if not exists mileage numeric;
alter table if exists leads add column if not exists request_text text;
alter table if exists leads add column if not exists raw_payload jsonb default '{}'::jsonb;
alter table if exists leads add column if not exists customer_id uuid;
alter table if exists leads add column if not exists vehicle_id uuid;

alter table if exists customers add column if not exists full_name text;
alter table if exists customers add column if not exists phone text;
alter table if exists customers add column if not exists status text default 'confirmed';
alter table if exists customers add column if not exists created_at timestamptz default now();

create index if not exists leads_public_id_idx on leads(public_id);
create index if not exists leads_phone_idx on leads(phone);
create index if not exists leads_status_idx on leads(status);
create index if not exists leads_created_at_idx on leads(created_at desc);
create index if not exists customers_phone_idx on customers(phone);

update leads set status='new_contact' where status is null;
update customers set status='confirmed' where status is null;
