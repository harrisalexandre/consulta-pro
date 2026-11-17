# Backend Supabase — Consulta Pro

Projeto: `swrsjwmuqxrzgapqiacb` (`consulta-pro`).

Até agora **nada deste diretório estava versionado**: o schema, as funções SQL,
os jobs de cron e as Edge Functions existiam só na nuvem, aplicados direto no
projeto Supabase. Este diretório é a extração do que está publicado hoje
(22 migrations + 8 Edge Functions), para que o backend passe a viver no git.

## Como aplicar

```bash
supabase link --project-ref swrsjwmuqxrzgapqiacb
supabase db push

# uma função por vez
supabase functions deploy superadmin-create-company-user
supabase functions deploy superadmin-update-company-user
supabase functions deploy process-automation-dispatches
supabase functions deploy process-automation-claim
supabase functions deploy manage-evolution-session
supabase functions deploy receive-evolution-webhook
supabase functions deploy manage-waha-session
supabase functions deploy enviar-mensagem
```

As migrations são idempotentes só em parte (vários `create table`/`add
constraint` sem `if not exists`). Em um projeto que já tem o schema aplicado,
use `supabase migration repair` para marcar as versões como aplicadas em vez de
rodar `db push`.

## Secret mascarado (repo público)

A migration `20260830015114_automation_scheduler_secure_http_stage8.sql` grava
dois secrets no Vault. O segundo, `consulta_pro_legacy_anon_key`, está com o
valor substituído por `<DEFINIR_FORA_DO_GIT>` — o valor real é uma chave JWT e
**não pode entrar neste repositório**, que é público.

Defina o valor real fora do git, de uma destas formas:

- Dashboard do projeto → Integrations → Vault → secret
  `consulta_pro_legacy_anon_key` → colar a anon key do projeto; ou
- rodar uma vez, fora do versionamento (psql/SQL editor):

```sql
select vault.create_secret('<anon key real>', 'consulta_pro_legacy_anon_key');
-- se o secret já existir:
-- select vault.update_secret(
--   (select id from vault.secrets where name = 'consulta_pro_legacy_anon_key'),
--   '<anon key real>'
-- );
```

O job `consulta-pro-automation-worker` lê esse secret em
`vault.decrypted_secrets` para chamar a Edge Function
`process-automation-dispatches`. Sem o valor real, o worker não dispara.

## Secrets das Edge Functions

Configurar no projeto (`supabase secrets set ...` ou Dashboard → Edge Functions
→ Secrets):

- `EVOLUTION_API_URL` — URL base da Evolution API
- `EVOLUTION_API_KEY` — apikey da Evolution API; também é o segredo que
  `receive-evolution-webhook` valida no header `apikey` das chamadas recebidas

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas
pela plataforma.

As funções `manage-waha-session` (legado WAHA) e `process-automation-claim`
esperam, respectivamente, `WAHA_URL` / `WAHA_API_KEY` e `CRON_WORKER_TOKEN`.
Elas seguem publicadas, mas o caminho de disparo atual é o da Evolution.

## Jobs pg_cron

O projeto tem 3 jobs ativos, todos em `* * * * *`:

| job | o que faz |
| --- | --- |
| `consulta-pro-automation-enqueue` | `select public.enqueue_due_automation_dispatches();` |
| `consulta-pro-automation-worker` | `net.http_post` para `process-automation-dispatches` |
| `consulta-pro-automation-retry` | reenfileira falhas (`requeue_failed_automation_dispatches`) |

Os dois primeiros são agendados pelas migrations
`20260830014536_automation_scheduler_stage8.sql` e
`20260830015123_automation_worker_cron_http_stage8.sql`, e ambas só criam o job
se ele ainda não existir (o enqueue tem `where not exists`; o worker faz
`cron.unschedule` antes de reagendar).

O `consulta-pro-automation-retry` **não é criado por nenhum arquivo deste
diretório** — foi agendado fora das migrations e existe só na nuvem. Em um
projeto novo ele teria de ser agendado à mão.
