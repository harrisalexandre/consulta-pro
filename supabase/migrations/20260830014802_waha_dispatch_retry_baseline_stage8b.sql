
create unique index if not exists whatsapp_integrations_company_instance_idx
on public.whatsapp_integrations(company_id, instance_name)
where instance_name is not null;

create index if not exists automation_dispatches_processing_idx
on public.automation_dispatches(status, scheduled_for)
where status in ('pending','processing');

alter table public.automation_dispatches
  add column if not exists attempts integer not null default 0,
  add column if not exists last_error text,
  add column if not exists processing_started_at timestamptz;

create or replace function public.mark_automation_dispatch_failed(
  dispatch_id uuid,
  error_message text
) returns void
language sql security definer set search_path=public
as $$
  update public.automation_dispatches
  set status='failed',
      attempts=attempts+1,
      last_error=left(error_message,1000),
      processing_started_at=null
  where id=dispatch_id and status='processing';
$$;

revoke execute on function public.mark_automation_dispatch_failed(uuid,text) from public,anon,authenticated;
