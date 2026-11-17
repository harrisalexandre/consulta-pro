
create unique index if not exists automation_dispatches_dedupe_idx
on public.automation_dispatches (automation_id, appointment_id);

create or replace function public.enqueue_due_automation_dispatches()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  insert into public.automation_dispatches
    (company_id, automation_id, appointment_id, recipient_number, status, scheduled_for)
  select
    a.company_id,
    au.id,
    a.id,
    p.phone,
    'pending',
    a.starts_at - make_interval(mins => au.advance_minutes)
  from public.automations au
  join public.appointments a on a.company_id = au.company_id
  join public.patients p on p.id = a.patient_id and p.company_id = a.company_id
  where au.enabled
    and au.channel = 'whatsapp'
    and au.type = 'appointment_reminder'
    and a.starts_at - make_interval(mins => au.advance_minutes) <= now()
    and a.starts_at > now()
    and p.phone is not null
  on conflict (automation_id, appointment_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke execute on function public.enqueue_due_automation_dispatches() from public, anon, authenticated;
