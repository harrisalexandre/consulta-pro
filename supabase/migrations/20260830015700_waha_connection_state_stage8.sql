
alter table public.whatsapp_integrations
  add column if not exists last_error text,
  add column if not exists connected_at timestamptz;

alter table public.whatsapp_integrations
  drop constraint if exists whatsapp_integrations_status_chk;
alter table public.whatsapp_integrations
  add constraint whatsapp_integrations_status_chk
  check (status in ('disconnected','connecting','connected','error'));

create or replace function public.upsert_waha_integration(
  target_company uuid,
  target_instance text,
  target_status text default 'disconnected',
  target_phone text default null,
  target_error text default null
) returns uuid
language plpgsql security definer set search_path=public
as $$
declare integration_id uuid;
begin
  insert into public.whatsapp_integrations
    (company_id,provider,instance_name,status,phone_number,last_error,last_sync_at,connected_at,updated_at)
  values
    (target_company,'waha',target_instance,target_status,target_phone,target_error,now(),
     case when target_status='connected' then now() else null end,now())
  on conflict (company_id) do update set
    instance_name=excluded.instance_name,
    status=excluded.status,
    phone_number=excluded.phone_number,
    last_error=excluded.last_error,
    last_sync_at=now(),
    connected_at=case when excluded.status='connected' then now() else whatsapp_integrations.connected_at end,
    updated_at=now()
  returning id into integration_id;
  return integration_id;
end;
$$;

revoke execute on function public.upsert_waha_integration(uuid,text,text,text,text) from public,anon,authenticated;
