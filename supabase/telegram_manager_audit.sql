-- Deploy only after verifying the bot runtime and staging tests.
create table if not exists public.telegram_manager_audit (
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null references public.leads(id) on delete restrict,
 telegram_id text not null,
 action text not null check (action in ('accept','progress','done','cancel')),
 previous_status text not null,
 new_status text not null,
 created_at timestamptz not null default now()
);
alter table public.telegram_manager_audit enable row level security;
revoke all on public.telegram_manager_audit from public, anon, authenticated;
grant select, insert on public.telegram_manager_audit to service_role;

create or replace function public.manager_change_lead_status(
 p_lead_id uuid, p_telegram_id text, p_action text,
 p_expected_status text, p_new_status text
) returns void language plpgsql security invoker set search_path = '' as $$
declare actual_status text;
begin
 if p_telegram_id !~ '^[0-9]{1,20}$' then raise exception 'Invalid Telegram ID'; end if;
 if not (
  (p_action='accept' and p_new_status='accepted') or
  (p_action='progress' and p_new_status='in_progress') or
  (p_action='done' and p_new_status='completed') or
  (p_action='cancel' and p_new_status='cancelled')
 ) then raise exception 'Invalid status transition'; end if;
 select status into actual_status from public.leads where id=p_lead_id for update;
 if not found then raise exception 'Lead not found'; end if;
 if actual_status is distinct from p_expected_status then raise exception 'Lead changed concurrently'; end if;
 update public.leads set status=p_new_status, updated_at=now(),
  closed_at=case when p_new_status in ('completed','cancelled') then now() else null end
 where id=p_lead_id;
 insert into public.telegram_manager_audit(lead_id,telegram_id,action,previous_status,new_status)
 values (p_lead_id,p_telegram_id,p_action,actual_status,p_new_status);
end;
$$;
revoke all on function public.manager_change_lead_status(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.manager_change_lead_status(uuid,text,text,text,text) to service_role;
