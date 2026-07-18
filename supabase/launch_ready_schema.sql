-- RSService26 production schema. Additive and safe for an empty or existing project.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  full_name text, name text, phone text not null, email text, status text not null default 'confirmed',
  internal_notes text, client_notes text, source text, password_hash text,
  cabinet_enabled boolean not null default false, must_change_password boolean not null default true,
  password_updated_at timestamptz
);
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  customer_id uuid references public.customers(id) on delete set null, car_text text,
  brand text, model text, year integer, engine text, vin text, plate_number text,
  license_plate text, mileage integer, notes text, raw_payload jsonb not null default '{}'::jsonb
);
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(), public_id text, created_at timestamptz not null default now(),
  type text not null default 'general_callback', status text not null default 'new_contact',
  contact_status text not null default 'unverified', source text not null default 'site',
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  name text, phone text, car_text text, vin text, mileage integer, request_text text,
  raw_payload jsonb not null default '{}'::jsonb
);
create table if not exists public.manager_comments (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  lead_id uuid references public.leads(id) on delete cascade, comment_text text not null,
  is_public boolean not null default false
);
create table if not exists public.service_history (
  id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
  service_date timestamptz not null default now(), customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null, lead_id uuid references public.leads(id) on delete set null,
  title text, description text, price numeric, mileage integer, raw_payload jsonb not null default '{}'::jsonb
);
create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(), scope text not null, identifier text not null,
  created_at timestamptz not null default now()
);

alter table public.customers add column if not exists full_name text;
alter table public.customers add column if not exists name text;
alter table public.customers add column if not exists email text;
alter table public.customers add column if not exists status text not null default 'confirmed';
alter table public.customers add column if not exists internal_notes text;
alter table public.customers add column if not exists client_notes text;
alter table public.customers add column if not exists source text;
alter table public.customers add column if not exists password_hash text;
alter table public.customers add column if not exists cabinet_enabled boolean not null default false;
alter table public.customers add column if not exists must_change_password boolean not null default true;
alter table public.customers add column if not exists password_updated_at timestamptz;
alter table public.vehicles add column if not exists car_text text;
alter table public.vehicles add column if not exists brand text;
alter table public.vehicles add column if not exists model text;
alter table public.vehicles add column if not exists year integer;
alter table public.vehicles add column if not exists engine text;
alter table public.vehicles add column if not exists vin text;
alter table public.vehicles add column if not exists plate_number text;
alter table public.vehicles add column if not exists license_plate text;
alter table public.vehicles add column if not exists mileage integer;
alter table public.vehicles add column if not exists notes text;
alter table public.vehicles add column if not exists raw_payload jsonb not null default '{}'::jsonb;
alter table public.leads add column if not exists contact_status text not null default 'unverified';
alter table public.manager_comments add column if not exists is_public boolean not null default false;

create unique index if not exists customers_phone_unique_idx on public.customers(phone);
create unique index if not exists leads_public_id_unique_idx on public.leads(public_id) where public_id is not null;
create index if not exists customers_cabinet_enabled_idx on public.customers(cabinet_enabled) where cabinet_enabled=true;
create index if not exists vehicles_customer_id_idx on public.vehicles(customer_id);
create index if not exists vehicles_vin_idx on public.vehicles(vin);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists leads_phone_idx on public.leads(phone);
create index if not exists leads_customer_id_idx on public.leads(customer_id);
create index if not exists leads_vehicle_id_idx on public.leads(vehicle_id);
create index if not exists leads_contact_status_idx on public.leads(contact_status);
create index if not exists manager_comments_public_lead_idx on public.manager_comments(lead_id,is_public,created_at desc);
create index if not exists service_history_customer_id_idx on public.service_history(customer_id);
create index if not exists service_history_vehicle_id_date_idx on public.service_history(vehicle_id,service_date desc);
create index if not exists service_history_lead_id_idx on public.service_history(lead_id);
create index if not exists rate_limits_scope_identifier_created_idx on public.rate_limits(scope,identifier,created_at desc);

alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.leads enable row level security;
alter table public.manager_comments enable row level security;
alter table public.service_history enable row level security;
alter table public.rate_limits enable row level security;

-- Refresh PostgREST after all idempotent schema updates so admin forms can
-- use newly added columns without waiting for the schema cache to expire.
notify pgrst, 'reload schema';
revoke all on table public.customers, public.vehicles, public.leads, public.manager_comments, public.service_history, public.rate_limits from anon, authenticated;
grant usage on schema public to service_role;
grant all on table public.customers, public.vehicles, public.leads, public.manager_comments, public.service_history, public.rate_limits to service_role;
grant usage, select on all sequences in schema public to service_role;
