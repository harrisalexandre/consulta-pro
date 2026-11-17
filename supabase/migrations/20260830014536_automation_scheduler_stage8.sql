
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'consulta-pro-automation-enqueue',
  '* * * * *',
  $$select public.enqueue_due_automation_dispatches();$$
)
where not exists (
  select 1 from cron.job where jobname = 'consulta-pro-automation-enqueue'
);
