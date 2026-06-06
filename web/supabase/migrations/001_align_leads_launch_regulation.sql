alter table public.leads
  add column if not exists contact_status varchar(50) not null default 'unverified';

update public.leads
set contact_status = coalesce(raw_payload->>'contact_status', contact_status, 'unverified')
where contact_status is null or contact_status = '';

update public.leads
set status = 'new_contact'
where status is null or status = 'new';

insert into public.statuses (code, name, entity_type, sort_order, color, is_final)
values
  ('new_contact', 'Новый контакт', 'lead', 10, 'blue', false),
  ('in_progress', 'В работе', 'lead', 20, 'orange', false),
  ('waiting_client', 'Ждём клиента', 'lead', 30, 'yellow', false),
  ('completed', 'Выполнена', 'lead', 40, 'gray', true),
  ('declined', 'Отказ', 'lead', 50, 'red', true),
  ('unverified', 'Новый контакт', 'contact', 10, 'blue', false),
  ('verified', 'Проверен', 'contact', 20, 'green', false),
  ('confirmed_client', 'Подтверждённый клиент', 'contact', 30, 'green', false),
  ('duplicate', 'Дубль', 'contact', 40, 'orange', true),
  ('spam', 'Спам', 'contact', 50, 'red', true)
on conflict (code, entity_type) do nothing;

create index if not exists leads_contact_status_idx
on public.leads (contact_status);

create index if not exists leads_type_idx
on public.leads (type);

create index if not exists leads_phone_idx
on public.leads (phone);
