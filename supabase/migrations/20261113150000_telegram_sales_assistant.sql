create table if not exists public.telegram_sales_sessions (
 chat_id text primary key, data jsonb not null default '{}',
 updated_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '7 days'
);
create table if not exists public.telegram_manager_audit (
 id uuid primary key default gen_random_uuid(), lead_id uuid references public.leads(id),
 actor_id text not null, action text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.telegram_reply_drafts (
 id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.leads(id), actor_id text not null,
 body text not null, status text not null default 'draft' check(status in ('draft','sending','sent','unknown')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '30 minutes'
);
create table if not exists public.telegram_ai_calls (
 request_key text primary key, chat_id text not null, kind text not null,
 day date not null default (now() at time zone 'utc')::date, created_at timestamptz not null default now(),
 outcome text not null default 'reserved', model text, input_tokens integer, output_tokens integer
);
create index if not exists telegram_ai_calls_day_chat on public.telegram_ai_calls(day,chat_id);
create index if not exists telegram_manager_audit_lead on public.telegram_manager_audit(lead_id,created_at desc);
alter table public.telegram_sales_sessions enable row level security;
alter table public.telegram_manager_audit enable row level security;
alter table public.telegram_reply_drafts enable row level security;
alter table public.telegram_ai_calls enable row level security;
revoke all on public.telegram_sales_sessions,public.telegram_manager_audit,public.telegram_reply_drafts,public.telegram_ai_calls from public,anon,authenticated;
grant all on public.telegram_sales_sessions,public.telegram_manager_audit,public.telegram_reply_drafts,public.telegram_ai_calls to service_role;

alter table public.telegram_ai_calls add column if not exists global_slot integer;
alter table public.telegram_ai_calls add column if not exists client_slot integer;
create unique index if not exists telegram_ai_global_slot on public.telegram_ai_calls(day,global_slot);
create unique index if not exists telegram_ai_client_slot on public.telegram_ai_calls(day,chat_id,client_slot);
