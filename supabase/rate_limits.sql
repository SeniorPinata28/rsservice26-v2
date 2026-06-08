-- Optional persistent storage for RSService26 API rate limits.
-- Runtime also has in-memory fallback, but this table makes limits more stable across serverless instances.

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  identifier text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limits_scope_identifier_created_idx
  on public.rate_limits (scope, identifier, created_at desc);

create index if not exists rate_limits_created_at_idx
  on public.rate_limits (created_at desc);
