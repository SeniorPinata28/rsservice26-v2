-- RSService26 core schema reference for launch checks.
-- Use this file as the versioned source of truth after comparing it with the live Supabase schema.
-- Do not blindly drop or recreate existing production tables. For a live database, first compare with information_schema.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text,
  name text,
  phone text not null,
  status text not null default 'confirmed',
  internal_notes text,
  client_notes text
);

create index if not exists customers_phone_idx
  on public.customers (phone);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_id uuid references public.customers(id) on delete set null,
  car_text text,
  vin text,
  mileage integer,
  brand text,
  model text,
  year integer,
  engine text,
  notes text
);

create index if not exists vehicles_customer_id_idx
  on public.vehicles (customer_id);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  public_id text,
  created_at timestamptz not null default now(),
  type text not null default 'question',
  status text not null default 'new_contact',
  source text not null default 'site',
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  name text,
  phone text,
  car_text text,
  vin text,
  mileage integer,
  request_text text,
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists leads_created_at_idx
  on public.leads (created_at desc);

create index if not exists leads_phone_idx
  on public.leads (phone);

create index if not exists leads_public_id_idx
  on public.leads (public_id);

create index if not exists leads_customer_id_idx
  on public.leads (customer_id);

create index if not exists leads_vehicle_id_idx
  on public.leads (vehicle_id);

create table if not exists public.manager_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid references public.leads(id) on delete cascade,
  comment_text text not null
);

create index if not exists manager_comments_lead_id_created_idx
  on public.manager_comments (lead_id, created_at desc);

create table if not exists public.service_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  service_date timestamptz not null default now(),
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  title text,
  description text,
  price numeric,
  mileage integer,
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists service_history_customer_id_idx
  on public.service_history (customer_id);

create index if not exists service_history_vehicle_id_date_idx
  on public.service_history (vehicle_id, service_date desc);

create index if not exists service_history_lead_id_idx
  on public.service_history (lead_id);
