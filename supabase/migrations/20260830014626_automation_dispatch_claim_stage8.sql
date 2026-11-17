
create or replace function public.claim_automation_dispatches(batch_size integer default 20)
returns table (
  id uuid,
  company_id uuid,
  automation_id uuid,
  appointment_id uuid,
  recipient_number text,
  scheduled_for timestamptz
)
language sql
security definer
set search_path = public
as $$
  with claimed as (
    select d.id
    from public.automation_dispatches d
    where d.status = 'pending'
      and (d.scheduled_for is null or d.scheduled_for <= now())
    order by d.scheduled_for nulls first, d.created_at
    for update skip locked
    limit greatest(1, least(batch_size, 100))
  )
  update public.automation_dispatches d
  set status = 'processing'
  from claimed c
  where d.id = c.id
  returning d.id,d.company_id,d.automation_id,d.appointment_id,
            d.recipient_number,d.scheduled_for;
$$;

revoke execute on function public.claim_automation_dispatches(integer) from public, anon, authenticated;
