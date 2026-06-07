create table if not exists public.cabinet_login_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cabinet_login_codes_phone_created_idx
  on public.cabinet_login_codes (phone, created_at desc);

create index if not exists cabinet_login_codes_expires_idx
  on public.cabinet_login_codes (expires_at);
