-- Keepalive do WhatsApp a cada 10 min (mesmo padrao de token do worker:
-- URL e chave anon legada no vault). Atualiza status/last_sync_at e envia
-- os avisos "algo parou".
select cron.unschedule(jobid) from cron.job where jobname = 'consulta-pro-whatsapp-keepalive';
select cron.schedule(
  'consulta-pro-whatsapp-keepalive',
  '*/10 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='consulta_pro_project_url')
      || '/functions/v1/whatsapp-keepalive',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='consulta_pro_legacy_anon_key')
    ),
    body := '{}'::jsonb
  );
  $job$
);
