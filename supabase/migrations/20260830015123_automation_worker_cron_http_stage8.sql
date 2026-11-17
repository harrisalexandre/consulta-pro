
select cron.unschedule('consulta-pro-automation-worker');
select cron.schedule(
  'consulta-pro-automation-worker',
  '* * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='consulta_pro_project_url')
      || '/functions/v1/process-automation-dispatches',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='consulta_pro_legacy_anon_key')
    ),
    body := '{"batch_size":10}'::jsonb
  );
  $job$
);
