-- Mensagens automaticas: pausa geral por empresa, data de ativacao da
-- automacao e chave de numero de WhatsApp normalizado.

-- Pausa geral: segura todos os envios automaticos da empresa (ficam pendentes).
alter table public.messaging_settings
  add column if not exists paused boolean not null default false,
  add column if not exists paused_at timestamptz;

comment on column public.messaging_settings.paused is
  'true = nenhum envio automatico sai; a fila continua pendente ate despausar.';

-- Ativacao: tipos que olham para o passado (agradecer, faltou, aniversario,
-- retorno) so consideram quem passar a se encaixar DEPOIS da ultima ativacao.
-- Evita disparo em massa para todo o historico ao ligar uma automacao.
alter table public.automations
  add column if not exists enabled_at timestamptz;

comment on column public.automations.enabled_at is
  'Ultima vez que a automacao foi ligada. Mantido por trigger.';

update public.automations set enabled_at = created_at where enabled and enabled_at is null;

create or replace function public.automations_track_enabled_at()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.enabled and (tg_op = 'INSERT' or not old.enabled) then
    new.enabled_at := now();
  elsif not new.enabled then
    new.enabled_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.automations_track_enabled_at() from public, anon, authenticated;

drop trigger if exists automations_track_enabled_at on public.automations;
create trigger automations_track_enabled_at before insert or update of enabled on public.automations
  for each row execute function public.automations_track_enabled_at();

-- Pausa: grava paused_at
create or replace function public.messaging_settings_track_paused()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.paused and (tg_op = 'INSERT' or not old.paused) then
    new.paused_at := now();
  elsif not new.paused then
    new.paused_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.messaging_settings_track_paused() from public, anon, authenticated;

drop trigger if exists messaging_settings_track_paused on public.messaging_settings;
create trigger messaging_settings_track_paused before insert or update of paused on public.messaging_settings
  for each row execute function public.messaging_settings_track_paused();

-- Chave do numero: sem DDI 55, DDD + 8 ultimos digitos (ignora o 9 extra que o
-- WhatsApp as vezes remove). Mae e filhos com o mesmo numero = mesma chave.
create or replace function public.whatsapp_number_key(p_number text)
returns text language sql immutable set search_path = public as $$
  with d as (select regexp_replace(coalesce(p_number, ''), '\D', '', 'g') as n),
  s as (select case when n like '55%' and length(n) in (12, 13) then substr(n, 3) else n end as n from d)
  select nullif(case when length(n) in (10, 11) then left(n, 2) || right(n, 8) else n end, '') from s;
$$;
