
alter table public.automation_dispatches
  add constraint automation_dispatches_status_chk
  check (status in ('pending','processing','sent','failed'));

create or replace function public.mark_automation_dispatch_sent(
  dispatch_id uuid,
  provider_id text
) returns void
language sql security definer set search_path=public
as $$
  update public.automation_dispatches
  set status='sent',
      sent_at=now(),
      provider_message_id=left(provider_id,500),
      processing_started_at=null
  where id=dispatch_id and status='processing';
$$;

revoke execute on function public.mark_automation_dispatch_sent(uuid,text) from public,anon,authenticated;
