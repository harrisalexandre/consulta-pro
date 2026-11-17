-- Liga a automacao ao modelo cadastrado em message_templates.
-- Ate aqui automations guardava o texto solto em message_template e a tabela
-- message_templates nao era lida por ninguem no caminho de disparo.
-- Coluna anulavel: as automacoes existentes seguem usando o texto solto como
-- fallback, entao nada quebra.
alter table public.automations
  add column if not exists message_template_id uuid
  references public.message_templates(id) on delete set null;

create index if not exists automations_message_template_id_idx
  on public.automations(message_template_id);

comment on column public.automations.message_template_id is
  'Modelo usado no disparo. Quando nulo, o worker cai para automations.message_template.';
