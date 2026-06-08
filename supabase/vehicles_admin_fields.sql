-- Required for full vehicle editing in RSService26 admin.
-- Run this in Supabase SQL Editor.
-- It is safe for existing tables: columns are added only if they do not exist.

alter table public.vehicles
  add column if not exists car_text text,
  add column if not exists brand text,
  add column if not exists model text,
  add column if not exists year integer,
  add column if not exists vin text,
  add column if not exists plate_number text,
  add column if not exists license_plate text,
  add column if not exists mileage integer,
  add column if not exists notes text,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

create index if not exists vehicles_vin_idx
  on public.vehicles (vin);

create index if not exists vehicles_plate_number_idx
  on public.vehicles (plate_number);
