-- Mensagens automaticas: decisoes do dono (17/11) + RPCs para o frontend.
-- 1. Retorno (patient_recall) so para pacientes escolhidos manualmente.
-- 2. Lembrete com horario fora da janela vai no ultimo horario permitido
--    ANTES (nunca depois do inicio da consulta).
-- 3. Intervalo minimo e SAIR sao por PACIENTE.
-- 4. Aviso de problema por WhatsApp para um numero escolhido pela empresa
--    (no maximo 1 por hora).
-- 5. RPCs: alcance, saude, segurar/desfazer/reenviar, elegiveis de retorno.

-- Colunas -----------------------------------------------------------------------
alter table public.messaging_settings
  add column if not exists alert_whatsapp_number text,
  add column if not exists alert_last_sent_at timestamptz,
  add column if not exists alert_outage_started_at timestamptz;

comment on column public.messaging_settings.notify_on_disconnect is
  'Liga o aviso "algo parou" por WhatsApp para alert_whatsapp_number.';
comment on column public.messaging_settings.alert_whatsapp_number is
  'Numero (com DDD) que recebe o aviso quando mensagens nao saem ou o WhatsApp volta apos queda.';

alter table public.automation_dispatches
  add column if not exists status_changed_at timestamptz not null default now();

comment on column public.automation_dispatches.status_changed_at is
  'Ultima mudanca de status (mantido por trigger).';

create or replace function public.automation_dispatches_track_status()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.automation_dispatches_track_status() from public, anon, authenticated;

drop trigger if exists automation_dispatches_track_status on public.automation_dispatches;
create trigger automation_dispatches_track_status before insert or update of status on public.automation_dispatches
  for each row execute function public.automation_dispatches_track_status();

-- Queda do WhatsApp: guarda desde quando caiu (para o resumo ao reconectar)
create or replace function public.whatsapp_integrations_track_outage()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'connected' and new.status <> 'connected' then
    insert into public.messaging_settings (company_id, alert_outage_started_at)
    values (new.company_id, now())
    on conflict (company_id) do update
      set alert_outage_started_at = coalesce(messaging_settings.alert_outage_started_at, now());
  end if;
  return new;
end;
$$;
revoke execute on function public.whatsapp_integrations_track_outage() from public, anon, authenticated;

drop trigger if exists whatsapp_integrations_track_outage on public.whatsapp_integrations;
create trigger whatsapp_integrations_track_outage after update of status on public.whatsapp_integrations
  for each row execute function public.whatsapp_integrations_track_outage();

-- Ultimo instante permitido pela janela (<= p_at). Fim da janela e exclusivo,
-- entao o ultimo instante do dia e fim - 1 minuto.
create or replace function public.messaging_prev_send_at(p_company uuid, p_at timestamptz)
returns timestamptz
language plpgsql stable security definer set search_path = public as $$
declare
  s public.messaging_settings;
  tz text;
  local_ts timestamp;
  d date;
  i int;
begin
  s := public.messaging_settings_effective(p_company);
  select coalesce(c.timezone, 'America/Sao_Paulo') into tz from public.companies c where c.id = p_company;
  tz := coalesce(tz, 'America/Sao_Paulo');
  local_ts := p_at at time zone tz;
  for i in 0..7 loop
    d := local_ts::date - i;
    if extract(dow from d)::smallint = any (s.send_weekdays) then
      if i = 0 then
        if local_ts::time >= s.send_window_end then
          return (d + s.send_window_end - interval '1 minute') at time zone tz;
        elsif local_ts::time >= s.send_window_start then
          return p_at;
        end if;
      else
        return (d + s.send_window_end - interval '1 minute') at time zone tz;
      end if;
    end if;
  end loop;
  return null;
end;
$$;

-- Horario de envio planejado de um lembrete: dentro da janela = no horario;
-- fora = ultimo horario permitido antes (dia anterior, se preciso). Se esse
-- horario ja passou, o proximo permitido antes da consulta. Se nem isso,
-- devolve due (o worker marca como nao enviado com motivo).
create or replace function public.reminder_send_at(p_company uuid, p_due timestamptz, p_starts_at timestamptz)
returns timestamptz
language plpgsql stable security definer set search_path = public as $$
declare
  s public.messaging_settings := public.messaging_settings_effective(p_company);
  v timestamptz;
begin
  if s.outside_window_policy = 'skip' then return p_due; end if;
  if public.messaging_next_send_at(p_company, p_due) = p_due then return p_due; end if;
  v := public.messaging_prev_send_at(p_company, p_due);
  if v is not null and v >= now() then return v; end if;
  v := public.messaging_next_send_at(p_company, greatest(p_due, now()));
  if v is not null and v < p_starts_at then return v; end if;
  return p_due;
end;
$$;

-- Enfileiramento: retorno sai do automatico (so por selecao manual);
-- lembrete usa reminder_send_at.
create or replace function public.enqueue_due_automation_dispatches()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  au record;
  n integer;
  total integer := 0;
  s public.messaging_settings;
begin
  for au in
    select * from public.automations
    where enabled and channel = 'whatsapp'
      and type in ('appointment_reminder','appointment_followup','appointment_no_show','birthday')
  loop
    s := public.messaging_settings_effective(au.company_id);
    insert into public.automation_dispatches
      (company_id, automation_id, appointment_id, patient_id, recipient_number,
       status, dedupe_key, due_at, scheduled_for)
    select au.company_id, au.id, c.appointment_id, c.patient_id,
           public.patient_whatsapp_number(p.whatsapp, p.phone),
           'pending', c.dedupe_key, c.due_at,
           case
             when au.type = 'appointment_reminder'
               then public.reminder_send_at(au.company_id, c.due_at, c.due_at + make_interval(mins => au.advance_minutes))
             when s.outside_window_policy = 'defer'
               then coalesce(public.messaging_next_send_at(au.company_id, c.due_at), c.due_at)
             else c.due_at end
    from public.automation_candidates(au.company_id, au.type, au.advance_minutes, au.professional_ids,
                                      coalesce(au.enabled_at, au.created_at),
                                      now() - interval '1 day', now() + interval '7 days') c
    join public.patients p on p.id = c.patient_id
    where not (s.respect_opt_out and p.whatsapp_opt_out_at is not null)
    on conflict (automation_id, dedupe_key) do nothing;
    get diagnostics n = row_count;
    total := total + n;
  end loop;
  return total;
end;
$$;

-- Preparo do envio (versao com intervalo/SAIR por paciente) --------------------
create or replace function public.prepare_automation_dispatch(p_dispatch_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d public.automation_dispatches;
  au public.automations;
  p public.patients;
  a public.appointments;
  c public.companies;
  w public.whatsapp_integrations;
  s public.messaging_settings;
  v_body text;
  v_tpl public.message_templates;
  v_number text;
  v_next timestamptz;
  v_last timestamptz;
  v_prof text;
  v_has_appt boolean := false;
  v_before_start boolean;
begin
  select * into d from public.automation_dispatches where id = p_dispatch_id for update;
  if not found or d.status <> 'processing' then
    return jsonb_build_object('action', 'ignore');
  end if;

  select * into au from public.automations where id = d.automation_id and company_id = d.company_id;
  if not found then
    return public.set_dispatch_outcome(d.id, 'cancelled', 'automation_deleted', 'A mensagem automática foi apagada');
  end if;
  if not au.enabled then
    return public.set_dispatch_outcome(d.id, 'cancelled', 'automation_disabled', 'A mensagem automática está desligada');
  end if;
  if au.channel <> 'whatsapp' then
    return public.set_dispatch_outcome(d.id, 'needs_action', 'channel_not_whatsapp', 'Esta mensagem automática não está configurada para WhatsApp');
  end if;

  select * into p from public.patients where id = d.patient_id and company_id = d.company_id;
  if not found then
    return public.set_dispatch_outcome(d.id, 'cancelled', 'patient_missing', 'Paciente não encontrado');
  end if;
  if p.status <> 'active' then
    return public.set_dispatch_outcome(d.id, 'skipped', 'patient_inactive', 'O paciente está inativo');
  end if;

  select * into c from public.companies where id = d.company_id;
  s := public.messaging_settings_effective(d.company_id);
  if s.paused then
    return public.set_dispatch_outcome(d.id, 'pending', 'paused', 'Envios automáticos pausados pelo consultório', now() + interval '5 minutes');
  end if;

  if d.appointment_id is not null then
    select * into a from public.appointments where id = d.appointment_id and company_id = d.company_id;
    if not found then
      return public.set_dispatch_outcome(d.id, 'cancelled', 'appointment_missing', 'A consulta foi apagada');
    end if;
    v_has_appt := true;

    if au.type <> 'appointment_cancelled' and a.status = 'cancelled' then
      return public.set_dispatch_outcome(d.id, 'cancelled', 'appointment_cancelled', 'A consulta foi cancelada');
    end if;
    if au.type = 'appointment_cancelled' and a.status <> 'cancelled' then
      return public.set_dispatch_outcome(d.id, 'cancelled', 'appointment_reactivated', 'A consulta voltou a ser agendada');
    end if;
    if au.type = 'appointment_followup' and a.status <> 'completed' then
      return public.set_dispatch_outcome(d.id, 'cancelled', 'appointment_status_changed', 'A consulta não está mais marcada como realizada');
    end if;
    if au.type = 'appointment_no_show' and a.status <> 'no_show' then
      return public.set_dispatch_outcome(d.id, 'cancelled', 'appointment_status_changed', 'A consulta não está mais marcada como falta');
    end if;
    if au.type in ('appointment_reminder', 'appointment_rescheduled')
       and d.dedupe_key <> a.id::text || ':' || extract(epoch from a.starts_at)::bigint then
      return public.set_dispatch_outcome(d.id, 'cancelled', 'appointment_rescheduled', 'A consulta foi remarcada; vale o novo horário');
    end if;
    if au.type in ('appointment_reminder', 'appointment_confirmation', 'appointment_rescheduled', 'appointment_cancelled')
       and a.starts_at <= now() then
      return public.set_dispatch_outcome(d.id, 'skipped', 'appointment_passed', 'O horário da consulta passou antes do envio');
    end if;
    if au.type = 'appointment_reminder' and d.due_at < a.created_at - interval '1 minute' then
      return public.set_dispatch_outcome(d.id, 'skipped', 'reminder_time_passed', 'A consulta foi marcada depois do horário deste lembrete');
    end if;
    if au.professional_ids is not null and not (a.professional_id = any (au.professional_ids)) then
      return public.set_dispatch_outcome(d.id, 'cancelled', 'professional_filtered', 'A consulta é de um profissional fora desta mensagem automática');
    end if;
    select pr.name into v_prof from public.professionals pr where pr.id = a.professional_id;
  end if;
  v_before_start := v_has_appt and au.type in
    ('appointment_reminder', 'appointment_confirmation', 'appointment_rescheduled', 'appointment_cancelled');

  if au.type = 'patient_recall' and exists (
    select 1 from public.appointments f
    where f.patient_id = p.id and f.company_id = d.company_id
      and f.status in ('scheduled', 'confirmed') and f.starts_at > now()) then
    return public.set_dispatch_outcome(d.id, 'cancelled', 'patient_has_appointment', 'O paciente já tem consulta marcada');
  end if;

  -- SAIR / PARAR (por paciente)
  if s.respect_opt_out and p.whatsapp_opt_out_at is not null then
    return public.set_dispatch_outcome(d.id, 'skipped', 'patient_opted_out', 'O paciente pediu para não receber mensagens (respondeu SAIR)');
  end if;

  v_number := public.patient_whatsapp_number(p.whatsapp, p.phone);
  if v_number is null then
    return public.set_dispatch_outcome(d.id, 'needs_action', 'missing_whatsapp', 'Paciente sem WhatsApp no cadastro');
  end if;
  if length(v_number) < 10 then
    return public.set_dispatch_outcome(d.id, 'needs_action', 'invalid_whatsapp', 'O WhatsApp do paciente está incompleto no cadastro');
  end if;

  v_body := au.message_template;
  if au.message_template_id is not null then
    select * into v_tpl from public.message_templates
    where id = au.message_template_id and company_id = d.company_id;
    if not found then
      return public.set_dispatch_outcome(d.id, 'needs_action', 'template_missing', 'O modelo de mensagem usado foi apagado');
    end if;
    if not v_tpl.active then
      return public.set_dispatch_outcome(d.id, 'needs_action', 'template_inactive', 'O modelo de mensagem usado está desativado');
    end if;
    v_body := v_tpl.body;
  end if;
  if coalesce(btrim(v_body), '') = '' then
    return public.set_dispatch_outcome(d.id, 'needs_action', 'template_missing', 'A mensagem automática está sem texto');
  end if;

  -- janela de envio
  v_next := public.messaging_next_send_at(d.company_id, now());
  if v_next is distinct from now() then
    if s.outside_window_policy = 'skip' then
      return public.set_dispatch_outcome(d.id, 'skipped', 'outside_window', 'Fora do horário de envio configurado');
    end if;
    if v_before_start and (v_next is null or v_next >= a.starts_at) then
      return public.set_dispatch_outcome(d.id, 'skipped', 'outside_window_too_late', 'Fora do horário de envio, e o próximo horário seria depois da consulta');
    end if;
    return public.set_dispatch_outcome(d.id, 'pending', 'deferred_window', 'Aguardando o horário de envio', v_next);
  end if;

  -- intervalo minimo POR PACIENTE; outro disparo do mesmo paciente em
  -- processamento agora: so o de menor id segue.
  if s.min_interval_minutes > 0 then
    select max(x.sent_at) into v_last from public.automation_dispatches x
    where x.patient_id = p.id and x.status = 'sent' and x.id <> d.id
      and x.sent_at > now() - make_interval(mins => s.min_interval_minutes);
    if v_last is not null then
      v_next := public.messaging_next_send_at(d.company_id, v_last + make_interval(mins => s.min_interval_minutes));
    elsif exists (select 1 from public.automation_dispatches x
                  where x.patient_id = p.id and x.status = 'processing' and x.id < d.id) then
      v_next := public.messaging_next_send_at(d.company_id, now() + make_interval(mins => s.min_interval_minutes));
    else
      v_next := null;
    end if;
    if v_next is not null then
      if v_before_start and v_next >= a.starts_at then
        return public.set_dispatch_outcome(d.id, 'skipped', 'min_interval_too_late', 'O paciente recebeu outra mensagem há pouco, e o próximo horário seria depois da consulta');
      end if;
      return public.set_dispatch_outcome(d.id, 'pending', 'deferred_interval', 'Aguardando o intervalo mínimo entre mensagens para este paciente', v_next);
    end if;
  end if;

  select * into w from public.whatsapp_integrations
  where company_id = d.company_id and provider = 'evolution'
    and status = 'connected' and instance_name is not null;
  if not found then
    if coalesce(d.blocked_since, now()) > now() - interval '2 hours'
       and not (v_before_start and now() + interval '5 minutes' >= a.starts_at) then
      return public.set_dispatch_outcome(d.id, 'pending', 'whatsapp_disconnected_waiting',
        'Aguardando o WhatsApp do consultório reconectar', now() + interval '5 minutes');
    end if;
    return public.set_dispatch_outcome(d.id, 'needs_action', 'whatsapp_disconnected',
      'O WhatsApp do consultório estava desconectado na hora do envio');
  end if;

  update public.automation_dispatches
  set recipient_number = v_number, status_reason_code = null, status_reason = null, blocked_since = null
  where id = d.id;

  return jsonb_build_object(
    'action', 'send',
    'dispatch_id', d.id,
    'company_id', d.company_id,
    'automation_type', au.type,
    'integration_id', w.id,
    'instance_name', w.instance_name,
    'recipient_number', v_number,
    'body', v_body,
    'patient_id', p.id,
    'patient_name', p.full_name,
    'appointment_id', a.id,
    'starts_at', a.starts_at,
    'appointment_type', a.appointment_type,
    'professional_name', v_prof,
    'company', jsonb_build_object(
      'name', c.name, 'timezone', c.timezone, 'street', c.street, 'number', c.number,
      'complement', c.complement, 'neighborhood', c.neighborhood, 'city', c.city, 'state', c.state)
  );
end;
$$;

-- SAIR por paciente: o numero que respondeu pode ser de mais de um paciente
-- (mae e filhos). Marca o paciente da ultima mensagem automatica enviada para
-- esse numero; sem envio anterior, o unico paciente com o numero; se houver
-- varios e nenhum envio, marca todos (nao da para saber qual).
drop function if exists public.mark_whatsapp_opt_out(uuid, text);
create function public.mark_whatsapp_opt_out(p_company_id uuid, p_number text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_key text := public.whatsapp_number_key(p_number);
  v_ids uuid[];
  v_last uuid;
begin
  if v_key is null then return 0; end if;
  select coalesce(array_agg(id), '{}') into v_ids from public.patients
  where company_id = p_company_id
    and public.whatsapp_number_key(public.patient_whatsapp_number(whatsapp, phone)) = v_key;
  if cardinality(v_ids) = 0 then return 0; end if;

  if cardinality(v_ids) > 1 then
    select x.patient_id into v_last from public.automation_dispatches x
    where x.company_id = p_company_id and x.status = 'sent' and x.patient_id = any (v_ids)
    order by x.sent_at desc nulls last limit 1;
    if v_last is not null then v_ids := array[v_last]; end if;
  end if;

  update public.patients
  set whatsapp_opt_out_at = coalesce(whatsapp_opt_out_at, now())
  where id = any (v_ids);

  if (public.messaging_settings_effective(p_company_id)).respect_opt_out then
    update public.automation_dispatches
    set status = 'skipped', status_reason_code = 'patient_opted_out',
        status_reason = 'O paciente pediu para não receber mensagens (respondeu SAIR)'
    where company_id = p_company_id and patient_id = any (v_ids)
      and status in ('pending', 'held');
  end if;
  return cardinality(v_ids);
end;
$$;

-- Avisos "algo parou" (chamado pelo keepalive a cada 10 min) -------------------
-- Devolve os avisos a enviar e ja marca alert_last_sent_at (claim). No maximo
-- 1 por hora por empresa. So com WhatsApp conectado (durante a queda nao ha
-- como enviar; o resumo sai quando reconectar).
create or replace function public.claim_messaging_alerts()
returns table (company_id uuid, instance_name text, alert_number text, message text)
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_na_new integer;
  v_na_total integer;
  v_pending integer;
  v_stuck integer;
  v_msg text;
begin
  for r in
    select s.company_id as cid, s.alert_whatsapp_number, s.alert_last_sent_at, s.alert_outage_started_at,
           s.paused, w.instance_name as inst, coalesce(c.timezone, 'America/Sao_Paulo') as tz
    from public.messaging_settings s
    join public.whatsapp_integrations w on w.company_id = s.company_id
      and w.provider = 'evolution' and w.status = 'connected' and w.instance_name is not null
    join public.companies c on c.id = s.company_id
    where s.notify_on_disconnect
      and public.patient_whatsapp_number(s.alert_whatsapp_number, null) is not null
      and (s.alert_last_sent_at is null or s.alert_last_sent_at < now() - interval '1 hour')
    for update of s skip locked
  loop
    select count(*) filter (where d.status = 'needs_action'
                              and d.status_changed_at > coalesce(r.alert_last_sent_at, '-infinity'::timestamptz)),
           count(*) filter (where d.status = 'needs_action'),
           count(*) filter (where d.status = 'pending'),
           count(*) filter (where d.status = 'pending' and d.scheduled_for < now() - interval '15 minutes')
      into v_na_new, v_na_total, v_pending, v_stuck
    from public.automation_dispatches d where d.company_id = r.cid;

    v_msg := null;
    if r.alert_outage_started_at is not null then
      v_msg := 'Consulta Pro: o WhatsApp do consultório voltou a funcionar. Ficou desconectado desde '
        || to_char(r.alert_outage_started_at at time zone r.tz, 'DD/MM "às" HH24:MI') || '. '
        || v_pending || ' mensagem(ns) aguardando envio e ' || v_na_total
        || ' que não saíram. Abra "Mensagens automáticas" para conferir.';
    elsif v_na_new > 0 then
      v_msg := 'Consulta Pro: ' || v_na_new || ' mensagem(ns) automática(s) não saíram e precisam de atenção. '
        || 'Abra "Mensagens automáticas" > "Mensagens que não saíram" para resolver.';
    elsif v_stuck > 0 and not r.paused then
      v_msg := 'Consulta Pro: ' || v_stuck || ' mensagem(ns) automática(s) estão atrasadas na fila. '
        || 'Abra "Mensagens automáticas" para conferir.';
    end if;

    if v_msg is not null then
      update public.messaging_settings
      set alert_last_sent_at = now(), alert_outage_started_at = null
      where messaging_settings.company_id = r.cid;
      company_id := r.cid;
      instance_name := r.inst;
      alert_number := public.patient_whatsapp_number(r.alert_whatsapp_number, null);
      message := v_msg;
      return next;
    end if;
  end loop;
end;
$$;

-- ===================== RPCs para o frontend ==================================
-- Erros (raise exception, campo message): 'forbidden', 'not_found',
-- 'invalid_status', 'automation_disabled', 'invalid_type'.

-- Alcance: quem receberia nos proximos p_days dias (tipos por tempo).
-- Confirmacao/cancelamento/remarcacao dependem de eventos futuros e o retorno
-- e manual (ver get_recall_candidates): devolvem vazio.
create or replace function public.get_automation_reach(
  p_company_id uuid, p_type text, p_advance_minutes integer,
  p_professional_ids uuid[] default null, p_days integer default 7)
returns table (
  patient_id uuid, patient_name text, appointment_id uuid, appointment_starts_at timestamptz,
  professional_name text, send_at timestamptz, recipient_number text, reach_status text)
language plpgsql stable security definer set search_path = public as $$
declare
  s public.messaging_settings;
begin
  if not public.is_company_member(p_company_id) then raise exception 'forbidden'; end if;
  if p_type not in ('appointment_confirmation','appointment_reminder','appointment_cancelled',
    'appointment_rescheduled','appointment_followup','appointment_no_show','birthday','patient_recall') then
    raise exception 'invalid_type';
  end if;
  s := public.messaging_settings_effective(p_company_id);

  return query
  with cand as (
    select c.*
    from public.automation_candidates(p_company_id, p_type, greatest(0, coalesce(p_advance_minutes, 0)),
           p_professional_ids, null, now(), now() + make_interval(days => least(greatest(coalesce(p_days, 7), 1), 31))) c
    where p_type in ('appointment_reminder','appointment_followup','appointment_no_show','birthday')
  ), base as (
    select cand.*, p.full_name, p.whatsapp_opt_out_at, public.patient_whatsapp_number(p.whatsapp, p.phone) as num,
           a.starts_at, a.created_at as appt_created_at, pr.name as prof_name,
           case
             when p_type = 'appointment_reminder' then public.reminder_send_at(p_company_id, cand.due_at, a.starts_at)
             when s.outside_window_policy = 'defer' then public.messaging_next_send_at(p_company_id, cand.due_at)
             else cand.due_at end as planned
    from cand
    join public.patients p on p.id = cand.patient_id
    left join public.appointments a on a.id = cand.appointment_id
    left join public.professionals pr on pr.id = a.professional_id
  )
  select b.patient_id, b.full_name, b.appointment_id, b.starts_at, b.prof_name, b.planned,
         b.num,
         case
           when s.respect_opt_out and b.whatsapp_opt_out_at is not null then 'opted_out'
           when b.num is null or length(b.num) < 10 then 'no_whatsapp'
           when s.outside_window_policy = 'skip'
                and public.messaging_next_send_at(p_company_id, b.planned) is distinct from b.planned then 'outside_window'
           when p_type = 'appointment_reminder'
                and (b.planned >= b.starts_at or b.due_at < b.appt_created_at - interval '1 minute'
                     or public.messaging_next_send_at(p_company_id, b.planned) is distinct from b.planned) then 'too_late'
           else 'will_send' end
  from base b
  order by b.planned, b.full_name;
end;
$$;

-- Saude do envio
create or replace function public.get_messaging_health(p_company_id uuid)
returns table (
  whatsapp_status text, is_connected boolean, phone_number text, last_sync_at timestamptz,
  paused boolean, last_sent_at timestamptz, pending_count integer, held_count integer,
  needs_action_count integer, retrying_count integer, stuck_count integer,
  next_send_at timestamptz, alert_enabled boolean, alert_last_sent_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  s public.messaging_settings;
  w public.whatsapp_integrations;
begin
  if not public.is_company_member(p_company_id) then raise exception 'forbidden'; end if;
  s := public.messaging_settings_effective(p_company_id);
  select * into w from public.whatsapp_integrations x where x.company_id = p_company_id;

  return query
  select coalesce(w.status, 'not_configured'),
         coalesce(w.status = 'connected' and w.instance_name is not null, false),
         w.phone_number, w.last_sync_at, coalesce(s.paused, false),
         (select max(d.sent_at) from public.automation_dispatches d where d.company_id = p_company_id and d.status = 'sent'),
         (select count(*)::int from public.automation_dispatches d where d.company_id = p_company_id and d.status in ('pending','processing')),
         (select count(*)::int from public.automation_dispatches d where d.company_id = p_company_id and d.status = 'held'),
         (select count(*)::int from public.automation_dispatches d where d.company_id = p_company_id and d.status = 'needs_action'),
         (select count(*)::int from public.automation_dispatches d where d.company_id = p_company_id and d.status = 'failed'),
         (select count(*)::int from public.automation_dispatches d where d.company_id = p_company_id and d.status = 'pending'
            and d.scheduled_for < now() - interval '15 minutes'),
         (select min(d.scheduled_for) from public.automation_dispatches d where d.company_id = p_company_id and d.status = 'pending'),
         coalesce(s.notify_on_disconnect, false) and s.alert_whatsapp_number is not null,
         s.alert_last_sent_at;
end;
$$;

-- "Nao enviar esta" (pending -> held)
create or replace function public.hold_automation_dispatch(p_dispatch_id uuid)
returns public.automation_dispatches
language plpgsql security definer set search_path = public as $$
declare d public.automation_dispatches;
begin
  select * into d from public.automation_dispatches where id = p_dispatch_id for update;
  if not found then raise exception 'not_found'; end if;
  if not public.is_company_member(d.company_id) then raise exception 'forbidden'; end if;
  if d.status <> 'pending' then raise exception 'invalid_status'; end if;
  update public.automation_dispatches
  set status = 'held', held_at = now(), held_by = auth.uid(),
      status_reason_code = 'held_by_user', status_reason = 'Marcada para não enviar'
  where id = d.id returning * into d;
  return d;
end;
$$;

-- Desfazer "Nao enviar esta" (held -> pending, mantem o horario planejado)
create or replace function public.release_automation_dispatch(p_dispatch_id uuid)
returns public.automation_dispatches
language plpgsql security definer set search_path = public as $$
declare d public.automation_dispatches;
begin
  select * into d from public.automation_dispatches where id = p_dispatch_id for update;
  if not found then raise exception 'not_found'; end if;
  if not public.is_company_member(d.company_id) then raise exception 'forbidden'; end if;
  if d.status <> 'held' then raise exception 'invalid_status'; end if;
  update public.automation_dispatches
  set status = 'pending', held_at = null, held_by = null,
      status_reason_code = null, status_reason = null
  where id = d.id returning * into d;
  return d;
end;
$$;

-- Reenviar / enviar agora: volta para a fila agora. O worker revalida TODAS
-- as regras (consulta cancelada/no passado, paciente ativo, SAIR, janela,
-- intervalo); se algo impedir, volta com o motivo.
create or replace function public.resend_automation_dispatch(p_dispatch_id uuid)
returns public.automation_dispatches
language plpgsql security definer set search_path = public as $$
declare d public.automation_dispatches;
begin
  select * into d from public.automation_dispatches where id = p_dispatch_id for update;
  if not found then raise exception 'not_found'; end if;
  if not public.is_company_member(d.company_id) then raise exception 'forbidden'; end if;
  if d.status not in ('needs_action', 'failed', 'skipped', 'held', 'pending') then raise exception 'invalid_status'; end if;
  update public.automation_dispatches
  set status = 'pending', scheduled_for = now(), attempts = 0, held_at = null, held_by = null,
      status_reason_code = null, status_reason = null, blocked_since = null, processing_started_at = null
  where id = d.id returning * into d;
  return d;
end;
$$;

-- Retorno: pacientes elegiveis (ultima consulta realizada ha >= N dias, sem
-- consulta futura, ativos, filtro de profissionais da automacao).
create or replace function public.get_recall_candidates(p_automation_id uuid)
returns table (
  patient_id uuid, patient_name text, last_appointment_id uuid, last_appointment_at timestamptz,
  professional_name text, days_since integer, recipient_number text, has_whatsapp boolean,
  opted_out boolean, already_queued boolean)
language plpgsql stable security definer set search_path = public as $$
declare au public.automations;
begin
  select * into au from public.automations where id = p_automation_id;
  if not found then raise exception 'not_found'; end if;
  if not public.is_company_member(au.company_id) then raise exception 'forbidden'; end if;
  if au.type <> 'patient_recall' then raise exception 'invalid_type'; end if;

  return query
  with ultima as (
    select distinct on (a.patient_id) a.patient_id, a.id as appt_id, a.ends_at, a.professional_id
    from public.appointments a
    where a.company_id = au.company_id and a.status = 'completed'
    order by a.patient_id, a.ends_at desc
  )
  select u.patient_id, p.full_name, u.appt_id, u.ends_at, pr.name,
         (now()::date - u.ends_at::date)::int,
         public.patient_whatsapp_number(p.whatsapp, p.phone),
         coalesce(length(public.patient_whatsapp_number(p.whatsapp, p.phone)) >= 10, false),
         p.whatsapp_opt_out_at is not null,
         exists (select 1 from public.automation_dispatches x
                 where x.automation_id = au.id and x.dedupe_key = u.patient_id::text || ':' || u.appt_id::text)
  from ultima u
  join public.patients p on p.id = u.patient_id and p.status = 'active'
  left join public.professionals pr on pr.id = u.professional_id
  where u.ends_at <= now() - make_interval(days => greatest(1, au.advance_minutes / 1440))
    and (au.professional_ids is null or u.professional_id = any (au.professional_ids))
    and not exists (
      select 1 from public.appointments f
      where f.patient_id = u.patient_id and f.company_id = au.company_id
        and f.status in ('scheduled', 'confirmed') and f.starts_at > now())
  order by u.ends_at;
end;
$$;

-- Retorno: coloca na fila os pacientes escolhidos (revalida elegibilidade).
-- Devolve quantos entraram na fila (repetidos sao ignorados).
create or replace function public.queue_recall_messages(p_automation_id uuid, p_patient_ids uuid[])
returns integer
language plpgsql security definer set search_path = public as $$
declare
  au public.automations;
  n integer;
begin
  select * into au from public.automations where id = p_automation_id;
  if not found then raise exception 'not_found'; end if;
  if not public.is_company_member(au.company_id) then raise exception 'forbidden'; end if;
  if au.type <> 'patient_recall' then raise exception 'invalid_type'; end if;
  if not au.enabled then raise exception 'automation_disabled'; end if;

  insert into public.automation_dispatches
    (company_id, automation_id, appointment_id, patient_id, recipient_number,
     status, dedupe_key, due_at, scheduled_for)
  select au.company_id, au.id, null, c.patient_id, c.recipient_number, 'pending',
         c.patient_id::text || ':' || c.last_appointment_id::text, now(),
         coalesce(public.messaging_next_send_at(au.company_id, now()), now())
  from public.get_recall_candidates(p_automation_id) c
  where c.patient_id = any (coalesce(p_patient_ids, '{}'))
    and not c.already_queued
  on conflict (automation_id, dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Privilegios -------------------------------------------------------------------
revoke execute on function public.messaging_prev_send_at(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.reminder_send_at(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.enqueue_due_automation_dispatches() from public, anon, authenticated;
revoke execute on function public.prepare_automation_dispatch(uuid) from public, anon, authenticated;
revoke execute on function public.mark_whatsapp_opt_out(uuid, text) from public, anon, authenticated;
revoke execute on function public.claim_messaging_alerts() from public, anon, authenticated;
grant execute on function public.prepare_automation_dispatch(uuid) to service_role;
grant execute on function public.mark_whatsapp_opt_out(uuid, text) to service_role;
grant execute on function public.claim_messaging_alerts() to service_role;

revoke execute on function public.get_automation_reach(uuid, text, integer, uuid[], integer) from public, anon;
revoke execute on function public.get_messaging_health(uuid) from public, anon;
revoke execute on function public.hold_automation_dispatch(uuid) from public, anon;
revoke execute on function public.release_automation_dispatch(uuid) from public, anon;
revoke execute on function public.resend_automation_dispatch(uuid) from public, anon;
revoke execute on function public.get_recall_candidates(uuid) from public, anon;
revoke execute on function public.queue_recall_messages(uuid, uuid[]) from public, anon;
grant execute on function public.get_automation_reach(uuid, text, integer, uuid[], integer) to authenticated;
grant execute on function public.get_messaging_health(uuid) to authenticated;
grant execute on function public.hold_automation_dispatch(uuid) to authenticated;
grant execute on function public.release_automation_dispatch(uuid) to authenticated;
grant execute on function public.resend_automation_dispatch(uuid) to authenticated;
grant execute on function public.get_recall_candidates(uuid) to authenticated;
grant execute on function public.queue_recall_messages(uuid, uuid[]) to authenticated;
