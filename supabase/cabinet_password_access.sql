-- Cabinet access is provisioned only by an administrator or manager.
-- Passwords are stored as salted scrypt hashes; plaintext passwords are never stored.

alter table public.customers
  add column if not exists password_hash text,
  add column if not exists cabinet_enabled boolean not null default false,
  add column if not exists must_change_password boolean not null default true,
  add column if not exists password_updated_at timestamptz;

create index if not exists customers_cabinet_enabled_idx
  on public.customers (cabinet_enabled)
  where cabinet_enabled = true;

-- Make the new fields available to the Data API immediately.
notify pgrst, 'reload schema';
