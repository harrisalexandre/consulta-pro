-- Mensagens automaticas (design 2026-11-17): schema.
-- - automations.professional_ids + tipos permitidos
-- - messaging_settings (1 por empresa) com RLS
-- - patients.whatsapp_opt_out_at
-- - automation_dispatches: paciente, chave de idempotencia, estados
--   "held" (segurada) / "needs_action" (precisa de acao) / "skipped" (nao sai
--   por regra), motivo legivel em pt-BR + codigo.
-- - message_kind ganha 'test' (envio de teste aparece no historico).

-- 1. automations --------------------------------------------------------------
alter table public.automations
  add column if not exists professional_ids uuid[];

comment on column public.automations.professional_ids is
  'Filtro opcional por profissionais. NULL = todos os profissionais.';

alter table public.automations drop constraint if exists automations_type_check;
alter table public.automations add constraint automations_type_check check (type in (
  'appointment_confirmation','appointment_reminder','appointment_cancelled',
  'appointment_rescheduled','appointment_followup','appointment_no_show',
  'birthday','patient_recall'));

-- 2. messaging_settings -------------------------------------------------------
create table if not exists public.messaging_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  send_window_start time not null default '08:00',
  send_window_end time not null default '20:00',
  -- dias permitidos, 0 = domingo ... 6 = sabado (igual a extract(dow) e Date.getDay())
  send_weekdays smallint[] not null default '{1,2,3,4,5}',
  outside_window_policy text not null default 'defer'
    check (outside_window_policy in ('defer','skip')),
  min_interval_minutes integer not null default 120
    check (min_interval_minutes between 0 and 10080),
  respect_opt_out boolean not null default true,
  notify_on_disconnect boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messaging_settings_window_chk check (send_window_start < send_window_end),
  constraint messaging_settings_weekdays_chk check (
    cardinality(send_weekdays) between 1 and 7
    and send_weekdays <@ '{0,1,2,3,4,5,6}'::smallint[])
);

comment on table public.messaging_settings is
  'Regras de envio de mensagens automaticas por empresa. Sem linha = valores padrao.';

drop trigger if exists set_updated_at_messaging_settings on public.messaging_settings;
create trigger set_updated_at_messaging_settings before update on public.messaging_settings
  for each row execute function public.set_updated_at();

alter table public.messaging_settings enable row level security;

drop policy if exists messaging_settings_select on public.messaging_settings;
create policy messaging_settings_select on public.messaging_settings
  for select to authenticated using (public.is_company_member(company_id));
drop policy if exists messaging_settings_insert on public.messaging_settings;
create policy messaging_settings_insert on public.messaging_settings
  for insert to authenticated with check (public.is_company_admin(company_id));
drop policy if exists messaging_settings_update on public.messaging_settings;
create policy messaging_settings_update on public.messaging_settings
  for update to authenticated using (public.is_company_admin(company_id))
  with check (public.is_company_admin(company_id));

revoke all on public.messaging_settings from anon;
grant select, insert, update on public.messaging_settings to authenticated;

insert into public.messaging_settings (company_id)
select id from public.companies
on conflict (company_id) do nothing;

create or replace function public.create_default_messaging_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.messaging_settings (company_id) values (new.id)
  on conflict (company_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.create_default_messaging_settings() from public, anon, authenticated;

drop trigger if exists create_default_messaging_settings on public.companies;
create trigger create_default_messaging_settings after insert on public.companies
  for each row execute function public.create_default_messaging_settings();

-- 3. patients: opt-out --------------------------------------------------------
alter table public.patients
  add column if not exists whatsapp_opt_out_at timestamptz;

comment on column public.patients.whatsapp_opt_out_at is
  'Quando o paciente respondeu SAIR/PARAR. Preenchido = nao recebe mensagens automaticas. NULL = recebe.';

-- 4. message_kind: test -------------------------------------------------------
alter type public.message_kind add value if not exists 'test';

-- 5. automation_dispatches ----------------------------------------------------
alter table public.automation_dispatches
  add column if not exists patient_id uuid references public.patients(id) on delete cascade,
  add column if not exists dedupe_key text,
  add column if not exists due_at timestamptz,
  add column if not exists status_reason_code text,
  add column if not exists status_reason text,
  add column if not exists held_at timestamptz,
  add column if not exists held_by uuid references auth.users(id) on delete set null,
  add column if not exists blocked_since timestamptz;

comment on column public.automation_dispatches.blocked_since is
  'Desde quando o envio espera o WhatsApp do consultorio reconectar (limite de espera antes de virar needs_action).';

comment on column public.automation_dispatches.dedupe_key is
  'Chave de idempotencia por automacao (consulta, consulta+horario, paciente+ano...).';
comment on column public.automation_dispatches.due_at is
  'Horario planejado pela regra da automacao (antes de janela/intervalo). scheduled_for = proxima tentativa.';
comment on column public.automation_dispatches.status_reason_code is
  'Codigo estavel do motivo (ex.: missing_whatsapp, missing_address).';
comment on column public.automation_dispatches.status_reason is
  'Motivo legivel em pt-BR para mostrar ao usuario.';

-- disparos de aniversario/retorno nao tem consulta
alter table public.automation_dispatches alter column appointment_id drop not null;
-- numero e resolvido no envio (pode estar faltando no cadastro)
alter table public.automation_dispatches alter column recipient_number drop not null;

update public.automation_dispatches d
set patient_id = a.patient_id
from public.appointments a
where a.id = d.appointment_id and d.patient_id is null;

update public.automation_dispatches d
set dedupe_key = d.appointment_id::text || ':' || extract(epoch from a.starts_at)::bigint
from public.appointments a, public.automations au
where a.id = d.appointment_id and au.id = d.automation_id
  and au.type in ('appointment_reminder','appointment_rescheduled')
  and d.dedupe_key is null;

update public.automation_dispatches
set dedupe_key = coalesce(appointment_id::text, id::text)
where dedupe_key is null;

update public.automation_dispatches set due_at = coalesce(scheduled_for, created_at) where due_at is null;

alter table public.automation_dispatches alter column dedupe_key set not null;
alter table public.automation_dispatches alter column patient_id set not null;

-- idempotencia passa a ser (automation_id, dedupe_key): permite um novo aviso
-- quando a consulta e remarcada de novo, sem duplicar o mesmo evento.
drop index if exists public.automation_dispatches_dedupe_idx;
alter table public.automation_dispatches
  drop constraint if exists automation_dispatches_company_id_automation_id_appointment__key;
create unique index if not exists automation_dispatches_automation_dedupe_key
  on public.automation_dispatches (automation_id, dedupe_key);

-- havia duas checks de status (uma sem 'cancelled'); fica uma so
alter table public.automation_dispatches drop constraint if exists automation_dispatches_status_chk;
alter table public.automation_dispatches drop constraint if exists automation_dispatches_status_check;
alter table public.automation_dispatches add constraint automation_dispatches_status_check check (status in (
  'pending','processing','sent','failed','cancelled','held','needs_action','skipped'));

-- check sem efeito herdada do baseline
alter table public.automation_dispatches drop constraint if exists automation_dispatches_company_consistency_chk;

create index if not exists automation_dispatches_patient_sent_idx
  on public.automation_dispatches (patient_id, sent_at desc) where status = 'sent';
create index if not exists automation_dispatches_appointment_idx
  on public.automation_dispatches (appointment_id) where appointment_id is not null;
create index if not exists automation_dispatches_company_status_idx
  on public.automation_dispatches (company_id, status, scheduled_for);

-- membros so leem; mudancas passam pelas RPCs (segurar/desfazer/reenviar) ou
-- pelo worker (service role). Antes qualquer membro podia reescrever
-- recipient_number e status direto pela API.
drop policy if exists automation_dispatches_all on public.automation_dispatches;
drop policy if exists automation_dispatches_select on public.automation_dispatches;
create policy automation_dispatches_select on public.automation_dispatches
  for select to authenticated using (public.is_company_member(company_id));
revoke insert, update, delete on public.automation_dispatches from anon, authenticated;
