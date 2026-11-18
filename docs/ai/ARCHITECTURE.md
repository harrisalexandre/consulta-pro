# Consulta Pro — Arquitetura

## Visão

```
Browser
  ↓
React / React Router
  ↓
Supabase Auth + Supabase API
  ↓
RLS / validação server-side
  ↓
PostgreSQL

Browser
  ↓
Supabase Edge Functions
  ↓
Integrações externas / operações privilegiadas
```

## Frontend
- React + TypeScript.
- Vite.
- React Router.
- Lucide para ícones.
- Layout separado entre Superadmin e tenant.
- `TenantContext` mantém empresa ativa.
- Componentes devem reutilizar services/contextos existentes antes de duplicar acesso ao backend.

## Backend
Supabase fornece:
- Auth;
- PostgreSQL;
- RLS;
- RPCs;
- Edge Functions.

## Auth
Login usa Supabase Auth. Sessão é recuperada no carregamento e observada por `onAuthStateChange`.

Operações administrativas de Auth devem ficar em Edge Functions.

## Multi-tenant
`company_id` é a chave funcional do tenant. O frontend usa o tenant apenas para contexto e filtragem conveniente. A autorização definitiva deve ser garantida no backend/RLS.

## Domínios
- Empresas e acessos.
- Pacientes.
- Profissionais.
- Agenda.
- WhatsApp.
- Automações.
- Dashboard.
- Configurações.

## Deploy
Render executa:
`npm install && npm run build`

Publicação:
`dist`

A aplicação SPA precisa de rewrite:
`/* → /index.html`

## Regra arquitetural
Não criar nova camada, tabela ou integração sem confirmar primeiro a estrutura existente. Código/schema atual prevalece sobre documentação.

## Mensagens automáticas (WhatsApp)
```
pg_cron (1 min) → enqueue_due_automation_dispatches()  ─┐
triggers em appointments (criar/cancelar/remarcar)      ─┼→ automation_dispatches (fila, RLS só leitura p/ membros)
RPC queue_recall_messages (retorno manual)              ─┘
pg_cron (1 min) → Edge process-automation-dispatches
                 → claim_automation_dispatches → prepare_automation_dispatch (regras no banco)
                 → render (_shared/mensagem.ts) → Evolution → mark_*_sent/failed/needs_action
pg_cron (10 min) → Edge whatsapp-keepalive → connectionState → whatsapp_integrations + claim_messaging_alerts
Evolution webhook → receive-evolution-webhook → whatsapp_messages + SAIR/PARAR (mark_whatsapp_opt_out)
Frontend → RPCs get_automation_reach / get_messaging_health / hold|release|resend_automation_dispatch /
           get_recall_candidates / queue_recall_messages ; Edge send-test-message
```
- Regras por empresa em `messaging_settings` (janela, dias, adiar/pular, intervalo, SAIR, pausa, aviso).
- Funções internas (`claim_*`, `prepare_*`, `mark_*`, `enqueue_*`, `automation_candidates`, `messaging_*`) só executam com service role/cron.
- Contrato: `docs/superpowers/specs/2026-11-17-mensagens-automaticas-contrato.md`.
