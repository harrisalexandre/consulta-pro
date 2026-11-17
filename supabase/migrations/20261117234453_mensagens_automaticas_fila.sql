-- Mensagens automaticas: regras de envio, candidatos, enfileiramento,
-- triggers de consulta, preparo do disparo (janela/intervalo/opt-out) e
-- marcacoes do worker.

-- Regras efetivas (linha da empresa ou padrao) --------------------------------
create or replace function public.messaging_settings_effective(p_company uuid)
returns public.messaging_settings
language plpgsql stable security definer set search_path = public as $$
declare s public.messaging_settings;
begin
  select * into s from public.messaging_settings where company_id = p_company;
  if not found then
    s.company_id := p_company;
    s.send_window_start := '08:00';
    s.send_window_end := '20:00';
    s.send_weekdays := '{1,2,3,4,5}';
    s.outside_window_policy := 'defer';
    s.min_interval_minutes := 120;
    s.respect_opt_out := true;
    s.notify_on_disconnect := false;
    s.paused := false;
  end if;
  return s;
end;
$$;

-- Proximo instante permitido pela janela de envio (>= p_at). Fuso da empresa.
create or replace function public.messaging_next_send_at(p_company uuid, p_at timestamptz)
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
    d := local_ts::date + i;
    if extract(dow from d)::smallint = any (s.send_weekdays) then
      if i = 0 then
        if local_ts::time < s.send_window_start then
          return (d + s.send_window_start) at time zone tz;
        elsif local_ts::time < s.send_window_end then
          return p_at;
        end if;
      else
        return (d + s.send_window_start) at time zone tz;
      end if;
    end if;
  end loop;
  return null;
end;
$$;

-- Numero de WhatsApp do paciente: prefere `whatsapp`, cai para `phone`.
create or replace function public.patient_whatsapp_number(p_whatsapp text, p_phone text)
returns text language sql immutable set search_path = public as $$
  select nullif(regexp_replace(coalesce(nullif(btrim(p_whatsapp), ''), nullif(btrim(p_phone), ''), ''), '\D', '', 'g'), '');
$$;

-- Candidatos de uma automacao baseada em tempo, com due_at em [p_from, p_to].
-- Tipos por evento (confirmacao, cancelamento, remarcacao) sao enfileirados
-- pelos triggers de appointments e nao tem candidatos previsiveis.
create or replace function public.automation_candidates(
  p_company uuid, p_type text, p_advance integer, p_professional_ids uuid[],
  p_created_at timestamptz, p_from timestamptz, p_to timestamptz)
returns table (appointment_id uuid, patient_id uuid, dedupe_key text, due_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  tz text;
  v_min timestamptz := greatest(p_from, coalesce(p_created_at, '-infinity'::timestamptz));
begin
  select coalesce(c.timezone, 'America/Sao_Paulo') into tz from public.companies c where c.id = p_company;

  if p_type = 'appointment_reminder' then
    -- lembrete vale para consultas ja existentes (sem filtro por created_at)
    return query
      select a.id, a.patient_id,
             a.id::text || ':' || extract(epoch from a.starts_at)::bigint,
             a.starts_at - make_interval(mins => p_advance)
      from public.appointments a
      join public.patients p on p.id = a.patient_id and p.company_id = a.company_id
      where a.company_id = p_company
        and a.status in ('scheduled', 'confirmed')
        and p.status = 'active'
        and (p_professional_ids is null or a.professional_id = any (p_professional_ids))
        and a.starts_at > now()
        and a.starts_at - make_interval(mins => p_advance) between p_from and p_to;

  elsif p_type in ('appointment_followup', 'appointment_no_show') then
    return query
      select a.id, a.patient_id, a.id::text,
             a.ends_at + make_interval(mins => p_advance)
      from public.appointments a
      join public.patients p on p.id = a.patient_id and p.company_id = a.company_id
      where a.company_id = p_company
        and a.status = (case when p_type = 'appointment_followup' then 'completed' else 'no_show' end)::public.appointment_status
        and p.status = 'active'
        and (p_professional_ids is null or a.professional_id = any (p_professional_ids))
        and a.ends_at + make_interval(mins => p_advance) between v_min and p_to;

  elsif p_type = 'birthday' then
    -- 29/02 em ano nao bissexto vira 28/02. Filtro de profissional nao se aplica.
    return query
      with dias as (
        select g::date as dia
        from generate_series((p_from at time zone tz)::date, (p_to at time zone tz)::date, interval '1 day') g
      )
      select null::uuid, p.id,
             p.id::text || ':' || extract(year from dd.dia)::int,
             (dd.dia + make_interval(mins => p_advance)) at time zone tz
      from dias dd
      join public.patients p on p.company_id = p_company and p.status = 'active' and p.birth_date is not null
      where ((extract(month from p.birth_date) = extract(month from dd.dia)
              and extract(day from p.birth_date) = extract(day from dd.dia))
          or (extract(month from p.birth_date) = 2 and extract(day from p.birth_date) = 29
              and extract(month from dd.dia) = 2 and extract(day from dd.dia) = 28
              and extract(day from (date_trunc('year', dd.dia) + interval '1 month 28 days')) <> 29))
        and ((dd.dia + make_interval(mins => p_advance)) at time zone tz) between v_min and p_to;

  elsif p_type = 'patient_recall' then
    -- ultima consulta realizada ha N dias (advance_minutes / 1440), sem consulta futura.
    -- Sai as 09:00 no fuso da empresa (a janela de envio ainda se aplica).
    return query
      with ultima as (
        select distinct on (a.patient_id) a.patient_id, a.id as appointment_id, a.ends_at, a.professional_id
        from public.appointments a
        where a.company_id = p_company and a.status = 'completed'
        order by a.patient_id, a.ends_at desc
      )
      select null::uuid, u.patient_id,
             u.patient_id::text || ':' || u.appointment_id::text,
             (((u.ends_at at time zone tz)::date + greatest(1, p_advance / 1440)) + time '09:00') at time zone tz
      from ultima u
      join public.patients p on p.id = u.patient_id and p.status = 'active'
      where (p_professional_ids is null or u.professional_id = any (p_professional_ids))
        and not exists (
          select 1 from public.appointments f
          where f.patient_id = u.patient_id and f.company_id = p_company
            and f.status in ('scheduled', 'confirmed') and f.starts_at > now())
        and ((((u.ends_at at time zone tz)::date + greatest(1, p_advance / 1440)) + time '09:00') at time zone tz)
            between v_min and p_to;
  end if;
end;
$$;

-- Enfileiramento (pg_cron, a cada minuto): cria os disparos dos proximos 7
-- dias para os tipos baseados em tempo. Idempotente por (automation_id, dedupe_key).
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
      and type in ('appointment_reminder','appointment_followup','appointment_no_show','birthday','patient_recall')
  loop
    s := public.messaging_settings_effective(au.company_id);
    insert into public.automation_dispatches
      (company_id, automation_id, appointment_id, patient_id, recipient_number,
       status, dedupe_key, due_at, scheduled_for)
    select au.company_id, au.id, c.appointment_id, c.patient_id,
           public.patient_whatsapp_number(p.whatsapp, p.phone),
           'pending', c.dedupe_key, c.due_at,
           case when s.outside_window_policy = 'defer'
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

-- Triggers de consulta: confirmacao (criada), cancelamento, remarcacao --------
create or replace function public.enqueue_appointment_event(
  p_appointment public.appointments, p_type text, p_dedupe_key text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  insert into public.automation_dispatches
    (company_id, automation_id, appointment_id, patient_id, recipient_number,
     status, dedupe_key, due_at, scheduled_for)
  select au.company_id, au.id, p_appointment.id, p.id,
         public.patient_whatsapp_number(p.whatsapp, p.phone),
         'pending', p_dedupe_key, now(),
         case when s.outside_window_policy = 'defer'
              then coalesce(public.messaging_next_send_at(au.company_id, now()), now())
              else now() end
  from public.automations au
  join public.patients p on p.id = p_appointment.patient_id and p.company_id = au.company_id
  cross join lateral public.messaging_settings_effective(au.company_id) s
  where au.company_id = p_appointment.company_id
    and au.enabled and au.channel = 'whatsapp' and au.type = p_type
    and p.status = 'active'
    and not (s.respect_opt_out and p.whatsapp_opt_out_at is not null)
    and (au.professional_ids is null or p_appointment.professional_id = any (au.professional_ids))
  on conflict (automation_id, dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.appointments_automation_events()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'INSERT' then
      if new.status in ('scheduled', 'confirmed') and new.starts_at > now() then
        perform public.enqueue_appointment_event(new, 'appointment_confirmation', new.id::text);
      end if;
      return new;
    end if;

    -- cancelada: segura o que estava na fila desta consulta e avisa o paciente
    if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      update public.automation_dispatches d
      set status = 'cancelled', status_reason_code = 'appointment_cancelled',
          status_reason = 'A consulta foi cancelada', processing_started_at = null
      from public.automations au
      where d.appointment_id = new.id and au.id = d.automation_id
        and au.type <> 'appointment_cancelled'
        and d.status in ('pending', 'held');
      if new.starts_at > now() then
        perform public.enqueue_appointment_event(new, 'appointment_cancelled', new.id::text);
      end if;
      return new;
    end if;

    -- reaberta: o que foi cancelado por causa do cancelamento volta para a fila
    if old.status = 'cancelled' and new.status in ('scheduled', 'confirmed') then
      update public.automation_dispatches
      set status = 'pending', status_reason_code = null, status_reason = null
      where appointment_id = new.id and status = 'cancelled'
        and status_reason_code = 'appointment_cancelled';
      update public.automation_dispatches d
      set status = 'cancelled', status_reason_code = 'appointment_reactivated',
          status_reason = 'A consulta voltou a ser agendada'
      from public.automations au
      where d.appointment_id = new.id and au.id = d.automation_id
        and au.type = 'appointment_cancelled' and d.status in ('pending', 'held');
    end if;

    -- remarcada: lembretes do horario antigo saem da fila; o novo lembrete
    -- e criado pelo enfileiramento; aviso de remarcacao para o novo horario.
    if new.starts_at is distinct from old.starts_at and new.status in ('scheduled', 'confirmed') then
      update public.automation_dispatches d
      set status = 'cancelled', status_reason_code = 'appointment_rescheduled',
          status_reason = 'A consulta foi remarcada; vale o novo horário', processing_started_at = null
      from public.automations au
      where d.appointment_id = new.id and au.id = d.automation_id
        and au.type in ('appointment_reminder', 'appointment_rescheduled')
        and d.status in ('pending', 'held');
      if new.starts_at > now() then
        perform public.enqueue_appointment_event(
          new, 'appointment_rescheduled', new.id::text || ':' || extract(epoch from new.starts_at)::bigint);
      end if;
    end if;
  exception when others then
    -- a agenda nao pode quebrar por causa da fila de mensagens
    raise warning 'appointments_automation_events: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists appointments_automation_events on public.appointments;
create trigger appointments_automation_events
  after insert or update of status, starts_at on public.appointments
  for each row execute function public.appointments_automation_events();

-- Claim: agora marca processing_started_at e devolve patient_id ----------------
drop function if exists public.claim_automation_dispatches(integer);
create function public.claim_automation_dispatches(batch_size integer default 20)
returns table (id uuid, company_id uuid, automation_id uuid, appointment_id uuid,
               patient_id uuid, recipient_number text, scheduled_for timestamptz)
language sql security definer set search_path = public as $$
  with claimed as (
    select d.id
    from public.automation_dispatches d
    where d.status = 'pending'
      and (d.scheduled_for is null or d.scheduled_for <= now())
      and not exists (select 1 from public.messaging_settings ms
                      where ms.company_id = d.company_id and ms.paused)
    order by d.scheduled_for nulls first, d.created_at
    for update skip locked
    limit greatest(1, least(batch_size, 100))
  )
  update public.automation_dispatches d
  set status = 'processing', processing_started_at = now()
  from claimed c
  where d.id = c.id
  returning d.id, d.company_id, d.automation_id, d.appointment_id, d.patient_id,
            d.recipient_number, d.scheduled_for;
$$;

-- Desfecho de um disparo em processamento (uso interno) ------------------------
create or replace function public.set_dispatch_outcome(
  p_dispatch_id uuid, p_status text, p_code text, p_reason text,
  p_scheduled_for timestamptz default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update public.automation_dispatches
  set status = p_status,
      status_reason_code = p_code,
      status_reason = p_reason,
      scheduled_for = coalesce(p_scheduled_for, scheduled_for),
      processing_started_at = null,
      blocked_since = case when p_code = 'whatsapp_disconnected_waiting'
                           then coalesce(blocked_since, now()) else null end
  where id = p_dispatch_id;
  return jsonb_build_object('action', p_status, 'code', p_code, 'reason', p_reason,
                            'scheduled_for', p_scheduled_for);
end;
$$;

-- Preparo do envio: aplica TODAS as regras no servidor e devolve o contexto
-- para o worker renderizar e enviar. action = send | pending | held | skipped |
-- cancelled | needs_action | ignore.
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
  v_key text;
  v_has_appt boolean := false;
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

  -- consulta ainda vale para este tipo?
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

  if au.type = 'patient_recall' and exists (
    select 1 from public.appointments f
    where f.patient_id = p.id and f.company_id = d.company_id
      and f.status in ('scheduled', 'confirmed') and f.starts_at > now()) then
    return public.set_dispatch_outcome(d.id, 'cancelled', 'patient_has_appointment', 'O paciente já tem consulta marcada');
  end if;

  -- numero
  v_number := public.patient_whatsapp_number(p.whatsapp, p.phone);
  v_key := public.whatsapp_number_key(v_number);

  -- SAIR / PARAR: vale para o paciente e para qualquer paciente da empresa
  -- com o mesmo numero (decisao provisoria: mae e filhos com o mesmo numero)
  if s.respect_opt_out and (p.whatsapp_opt_out_at is not null or (v_key is not null and exists (
       select 1 from public.patients o
       where o.company_id = d.company_id and o.whatsapp_opt_out_at is not null
         and public.whatsapp_number_key(public.patient_whatsapp_number(o.whatsapp, o.phone)) = v_key))) then
    return public.set_dispatch_outcome(d.id, 'skipped', 'patient_opted_out', 'O paciente pediu para não receber mensagens (respondeu SAIR)');
  end if;

  if v_number is null then
    return public.set_dispatch_outcome(d.id, 'needs_action', 'missing_whatsapp', 'Paciente sem WhatsApp no cadastro');
  end if;
  if length(v_number) < 10 then
    return public.set_dispatch_outcome(d.id, 'needs_action', 'invalid_whatsapp', 'O WhatsApp do paciente está incompleto no cadastro');
  end if;

  -- texto
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
    if v_has_appt and au.type in ('appointment_reminder', 'appointment_confirmation', 'appointment_rescheduled', 'appointment_cancelled')
       and v_next >= a.starts_at then
      return public.set_dispatch_outcome(d.id, 'skipped', 'outside_window_too_late', 'Fora do horário de envio, e o próximo horário seria depois da consulta');
    end if;
    return public.set_dispatch_outcome(d.id, 'pending', 'deferred_window', 'Aguardando o horário de envio', v_next);
  end if;

  -- intervalo minimo por NUMERO normalizado (decisao provisoria: mae e filhos
  -- com o mesmo numero contam juntos). Outro disparo do mesmo numero em
  -- processamento agora: so o de menor id segue.
  if s.min_interval_minutes > 0 then
    select max(x.sent_at) into v_last from public.automation_dispatches x
    where x.company_id = d.company_id and x.status = 'sent' and x.id <> d.id
      and x.sent_at > now() - make_interval(mins => s.min_interval_minutes)
      and public.whatsapp_number_key(x.recipient_number) = v_key;
    if v_last is not null then
      v_next := public.messaging_next_send_at(d.company_id, v_last + make_interval(mins => s.min_interval_minutes));
    elsif exists (select 1 from public.automation_dispatches x
                  where x.company_id = d.company_id and x.status = 'processing' and x.id < d.id
                    and public.whatsapp_number_key(coalesce(x.recipient_number,
                          (select public.patient_whatsapp_number(o.whatsapp, o.phone) from public.patients o where o.id = x.patient_id))) = v_key) then
      v_next := public.messaging_next_send_at(d.company_id, now() + make_interval(mins => s.min_interval_minutes));
    else
      v_next := null;
    end if;
    if v_next is not null then
      if v_has_appt and au.type in ('appointment_reminder', 'appointment_confirmation', 'appointment_rescheduled', 'appointment_cancelled')
         and v_next >= a.starts_at then
        return public.set_dispatch_outcome(d.id, 'skipped', 'min_interval_too_late', 'O paciente recebeu outra mensagem há pouco, e o próximo horário seria depois da consulta');
      end if;
      return public.set_dispatch_outcome(d.id, 'pending', 'deferred_interval', 'Aguardando o intervalo mínimo entre mensagens para este paciente', v_next);
    end if;
  end if;

  -- WhatsApp conectado? Espera ate 2h antes de pedir acao.
  select * into w from public.whatsapp_integrations
  where company_id = d.company_id and provider = 'evolution'
    and status = 'connected' and instance_name is not null;
  if not found then
    if coalesce(d.blocked_since, now()) > now() - interval '2 hours' then
      return public.set_dispatch_outcome(d.id, 'pending', 'whatsapp_disconnected_waiting',
        'Aguardando o WhatsApp do consultório reconectar', now() + interval '5 minutes');
    end if;
    return public.set_dispatch_outcome(d.id, 'needs_action', 'whatsapp_disconnected',
      'O WhatsApp do consultório está desconectado. Reconecte e reenvie.');
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

-- Marcacoes do worker -----------------------------------------------------------
create or replace function public.mark_automation_dispatch_sent(dispatch_id uuid, provider_id text)
returns void language sql security definer set search_path = public as $$
  update public.automation_dispatches
  set status = 'sent', sent_at = now(), provider_message_id = left(provider_id, 500),
      processing_started_at = null, status_reason_code = null, status_reason = null,
      blocked_since = null
  where id = dispatch_id and status = 'processing';
$$;

-- Falha tecnica: tenta de novo (requeue com backoff); na 6a falha vira
-- needs_action. O detalhe tecnico fica so em last_error (nao vai para a tela).
create or replace function public.mark_automation_dispatch_failed(dispatch_id uuid, error_message text)
returns void language sql security definer set search_path = public as $$
  update public.automation_dispatches
  set status = case when attempts + 1 >= 6 then 'needs_action' else 'failed' end,
      status_reason_code = case when attempts + 1 >= 6 then 'send_failed' else 'retrying' end,
      status_reason = case when attempts + 1 >= 6
                           then 'Não conseguimos enviar depois de várias tentativas. Tente reenviar.'
                           else 'Falha no envio; vamos tentar de novo automaticamente' end,
      attempts = least(attempts + 1, 10),
      last_error = left(error_message, 1000),
      processing_started_at = null
  where id = dispatch_id and status = 'processing';
$$;

create or replace function public.mark_automation_dispatch_needs_action(p_dispatch_id uuid, p_code text, p_reason text)
returns void language sql security definer set search_path = public as $$
  update public.automation_dispatches
  set status = 'needs_action', status_reason_code = left(p_code, 100), status_reason = left(p_reason, 500),
      processing_started_at = null
  where id = p_dispatch_id and status = 'processing';
$$;

-- Retry + recuperacao de disparo preso em processing (worker caiu) ------------
create or replace function public.requeue_failed_automation_dispatches()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer; m integer;
begin
  update public.automation_dispatches
  set status = 'pending',
      scheduled_for = now() + make_interval(secs => least(3600, greatest(30, power(2, attempts)::integer * 30))),
      processing_started_at = null
  where status = 'failed' and attempts < 6
    and scheduled_for <= now() and scheduled_for > now() - interval '24 hours';
  get diagnostics n = row_count;

  update public.automation_dispatches
  set status = 'pending', processing_started_at = null
  where status = 'processing' and processing_started_at < now() - interval '10 minutes';
  get diagnostics m = row_count;
  return n + m;
end;
$$;

-- Opt-out (webhook SAIR/PARAR) -------------------------------------------------
-- Marca opt-out em TODOS os pacientes da empresa com o mesmo numero
-- normalizado e tira da fila o que estava pendente/segurado. Devolve quantos
-- pacientes foram marcados.
create or replace function public.mark_whatsapp_opt_out(p_company_id uuid, p_number text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_key text := public.whatsapp_number_key(p_number);
  v_ids uuid[];
begin
  if v_key is null then return 0; end if;
  select coalesce(array_agg(id), '{}') into v_ids from public.patients
  where company_id = p_company_id
    and public.whatsapp_number_key(public.patient_whatsapp_number(whatsapp, phone)) = v_key;

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

-- Privilegios: tudo acima e interno (cron, triggers, worker com service role)
revoke execute on function public.messaging_settings_effective(uuid) from public, anon, authenticated;
revoke execute on function public.messaging_next_send_at(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.patient_whatsapp_number(text, text) from public, anon;
revoke execute on function public.automation_candidates(uuid, text, integer, uuid[], timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.enqueue_due_automation_dispatches() from public, anon, authenticated;
revoke execute on function public.enqueue_appointment_event(public.appointments, text, text) from public, anon, authenticated;
revoke execute on function public.appointments_automation_events() from public, anon, authenticated;
revoke execute on function public.claim_automation_dispatches(integer) from public, anon, authenticated;
revoke execute on function public.set_dispatch_outcome(uuid, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.prepare_automation_dispatch(uuid) from public, anon, authenticated;
revoke execute on function public.mark_automation_dispatch_sent(uuid, text) from public, anon, authenticated;
revoke execute on function public.mark_automation_dispatch_failed(uuid, text) from public, anon, authenticated;
revoke execute on function public.mark_automation_dispatch_needs_action(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.requeue_failed_automation_dispatches() from public, anon, authenticated;
revoke execute on function public.mark_whatsapp_opt_out(uuid, text) from public, anon, authenticated;
revoke execute on function public.whatsapp_number_key(text) from public, anon;

grant execute on function public.claim_automation_dispatches(integer) to service_role;
grant execute on function public.prepare_automation_dispatch(uuid) to service_role;
grant execute on function public.mark_automation_dispatch_sent(uuid, text) to service_role;
grant execute on function public.mark_automation_dispatch_failed(uuid, text) to service_role;
grant execute on function public.mark_automation_dispatch_needs_action(uuid, text, text) to service_role;
grant execute on function public.mark_whatsapp_opt_out(uuid, text) to service_role;
grant execute on function public.messaging_next_send_at(uuid, timestamptz) to service_role;
