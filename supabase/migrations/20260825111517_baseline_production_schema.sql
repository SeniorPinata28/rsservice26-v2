-- RS Service 26: reproducible baseline from production schema.
-- Captured from Supabase project qpdinphrenutrgkmubow on 2026-08-25.
-- Contains schema and non-sensitive reference statuses only.

begin;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text,
  phone text not null,
  email text,
  telegram_id text,
  telegram_username text,
  status text not null default 'confirmed',
  source text not null default 'site',
  default_vehicle_id uuid,
  manager_id uuid,
  client_notes text,
  internal_notes text,
  consent_personal_data boolean not null default false,
  last_activity_at timestamptz,
  name text,
  password_hash text,
  cabinet_enabled boolean not null default false,
  must_change_password boolean not null default true,
  password_updated_at timestamptz
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  make text,
  model text,
  year integer,
  vin text,
  engine text,
  transmission text,
  mileage integer,
  plate_number text,
  client_comment text,
  manager_comment text,
  parts_preference text not null default 'confirm_each_time',
  is_default boolean not null default false,
  is_active boolean not null default true,
  last_service_at timestamptz,
  next_service_mileage integer,
  next_service_date date,
  car_text text,
  brand text,
  license_plate text,
  notes text,
  raw_payload jsonb not null default '{}'::jsonb
);

alter table public.customers
  add constraint customers_default_vehicle_fk
  foreign key (default_vehicle_id) references public.vehicles(id) on delete set null;

create table public.statuses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text not null,
  name text not null,
  entity_type text not null,
  sort_order integer not null default 0,
  color text,
  is_final boolean not null default false,
  constraint statuses_code_entity_unique unique (code, entity_type)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  public_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type text not null default 'question',
  status text not null default 'new',
  source text not null default 'site',
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  manager_id uuid,
  name text,
  phone text,
  car_text text,
  vin text,
  mileage integer,
  request_text text,
  price_client numeric,
  stock_count integer,
  delivery_date timestamptz,
  raw_payload jsonb,
  telegram_message_id text,
  priority text not null default 'normal',
  closed_at timestamptz
);

create table public.manager_comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entity_type text not null,
  entity_id uuid not null,
  manager_id uuid,
  comment text not null,
  is_internal boolean not null default true
);

create table public.auth_login_tokens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  ip text,
  user_agent text
);

create table public.parts_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lead_id uuid references public.leads(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  part_name text,
  brand text,
  part_number text,
  supplier_guid text,
  stock_id text,
  purchase_price numeric,
  client_price numeric,
  markup_rate numeric,
  stock_count integer,
  delivery_start timestamptz,
  delivery_end timestamptz,
  status text not null default 'new'
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lead_id uuid references public.leads(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  manager_id uuid,
  service_type text,
  requested_date timestamptz,
  confirmed_date timestamptz,
  status text not null default 'new',
  comment text,
  completed_at timestamptz
);

create table public.service_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  service_date date not null default current_date,
  mileage integer,
  work_title text,
  work_description text,
  parts_used jsonb,
  total_price numeric,
  manager_id uuid,
  documents_url text
);

create table public.cabinet_login_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index auth_login_tokens_customer_id_idx on public.auth_login_tokens (customer_id);
create index bookings_customer_id_idx on public.bookings (customer_id);
create index bookings_lead_id_idx on public.bookings (lead_id);
create index bookings_vehicle_id_idx on public.bookings (vehicle_id);
create index cabinet_login_codes_expires_idx on public.cabinet_login_codes (expires_at);
create index cabinet_login_codes_phone_created_idx on public.cabinet_login_codes (phone, created_at desc);
create index customers_cabinet_enabled_idx on public.customers (cabinet_enabled) where cabinet_enabled = true;
create index customers_phone_idx on public.customers (phone);
create unique index customers_phone_unique on public.customers (phone);
create index customers_default_vehicle_id_idx on public.customers (default_vehicle_id);
create index leads_customer_id_idx on public.leads (customer_id);
create index leads_phone_idx on public.leads (phone);
create index leads_status_idx on public.leads (status);
create index leads_type_idx on public.leads (type);
create index leads_vehicle_id_idx on public.leads (vehicle_id);
create index manager_comments_entity_idx on public.manager_comments (entity_type, entity_id);
create index parts_requests_customer_id_idx on public.parts_requests (customer_id);
create index parts_requests_lead_id_idx on public.parts_requests (lead_id);
create index parts_requests_vehicle_id_idx on public.parts_requests (vehicle_id);
create index rate_limits_created_at_idx on public.rate_limits (created_at desc);
create index rate_limits_scope_identifier_created_idx on public.rate_limits (scope, identifier, created_at desc);
create index service_history_booking_id_idx on public.service_history (booking_id);
create index service_history_customer_id_idx on public.service_history (customer_id);
create index service_history_vehicle_id_idx on public.service_history (vehicle_id);
create index vehicles_customer_id_idx on public.vehicles (customer_id);
create index vehicles_plate_number_idx on public.vehicles (plate_number);
create index vehicles_vin_idx on public.vehicles (vin);

insert into public.statuses (code, name, entity_type, sort_order, color, is_final)
values
  ('new', 'Новая', 'lead', 10, 'blue', false),
  ('in_progress', 'В работе', 'lead', 20, 'orange', false),
  ('waiting_client', 'Ждём клиента', 'lead', 30, 'yellow', false),
  ('confirmed', 'Подтверждена', 'lead', 40, 'green', false),
  ('booked', 'Записан', 'lead', 50, 'green', false),
  ('completed', 'Выполнена', 'lead', 60, 'gray', true),
  ('declined', 'Отказ', 'lead', 70, 'red', true);

alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.statuses enable row level security;
alter table public.leads enable row level security;
alter table public.manager_comments enable row level security;
alter table public.auth_login_tokens enable row level security;
alter table public.parts_requests enable row level security;
alter table public.bookings enable row level security;
alter table public.service_history enable row level security;
alter table public.cabinet_login_codes enable row level security;
alter table public.rate_limits enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;

notify pgrst, 'reload schema';

commit;
