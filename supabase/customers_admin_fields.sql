-- Required for full customer editing in RSService26 admin.
-- Run this in Supabase SQL Editor.
-- Safe for existing tables: columns are added only if they do not exist.

alter table public.customers
  add column if not exists full_name text,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists status text not null default 'confirmed',
  add column if not exists internal_notes text,
  add column if not exists client_notes text,
  add column if not exists source text;

create index if not exists customers_phone_idx
  on public.customers (phone);
