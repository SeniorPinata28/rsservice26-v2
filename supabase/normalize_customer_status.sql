-- Normalize customer status for P1.
-- Business rule:
--   customers.status = 'confirmed'
--   leads.contact_status / leads.raw_payload.contact_status = 'confirmed_client'

update public.customers
set status = 'confirmed'
where status is null
   or status = ''
   or status = 'confirmed_client';

alter table public.customers
  alter column status set default 'confirmed';

-- Optional safety check. Run after update:
-- select status, count(*) from public.customers group by status order by status;
