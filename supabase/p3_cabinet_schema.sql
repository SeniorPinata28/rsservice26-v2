-- P3 cabinet schema additions for RSService26.
-- Safe to run in Supabase SQL Editor: every column/index is added only if missing.

alter table public.customers
  add column if not exists email text;

alter table public.vehicles
  add column if not exists plate_number text,
  add column if not exists license_plate text,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.manager_comments
  add column if not exists is_public boolean not null default false;

create index if not exists manager_comments_public_lead_idx
  on public.manager_comments (lead_id, is_public, created_at desc);

create index if not exists vehicles_license_plate_idx
  on public.vehicles (license_plate);
