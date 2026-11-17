
alter table public.automation_dispatches
  add constraint automation_dispatches_company_consistency_chk
  check (scheduled_for is null or scheduled_for is not null);
