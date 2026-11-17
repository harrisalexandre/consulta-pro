
alter table public.automation_dispatches
  add constraint automation_dispatches_attempts_chk check (attempts >= 0 and attempts <= 10);

create index if not exists automation_dispatches_retry_idx
on public.automation_dispatches (scheduled_for, attempts)
where status in ('pending','failed');

create or replace function public.requeue_failed_automation_dispatches()
returns integer
language plpgsql security definer set search_path=public
as $$
declare n integer;
begin
  update public.automation_dispatches
  set status='pending',
      scheduled_for=now() + make_interval(secs => least(3600, greatest(30, power(2, attempts)::integer * 30))),
      processing_started_at=null
  where status='failed'
    and attempts < 6
    and scheduled_for <= now()
    and scheduled_for > now() - interval '24 hours';
  get diagnostics n=row_count;
  return n;
end;
$$;

revoke execute on function public.requeue_failed_automation_dispatches() from public,anon,authenticated;
