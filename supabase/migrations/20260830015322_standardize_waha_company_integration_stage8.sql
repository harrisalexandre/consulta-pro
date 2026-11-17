
alter table public.whatsapp_integrations
  alter column provider set default 'waha';

update public.whatsapp_integrations
set provider='waha'
where provider='evolution_api';

alter table public.whatsapp_integrations
  drop constraint if exists whatsapp_integrations_provider_chk;

alter table public.whatsapp_integrations
  add constraint whatsapp_integrations_provider_chk check (provider='waha');

create unique index if not exists whatsapp_integrations_company_idx
on public.whatsapp_integrations(company_id);
