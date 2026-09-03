# Consulta Pro — Arquitetura

## Visão

```text
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
Evolution API
  ↓
WhatsApp
```

## Frontend
- React + TypeScript + Vite.
- React Router.
- Lucide para ícones.
- Layout separado entre Superadmin e tenant.
- `TenantContext` mantém empresa ativa.
- `SessionGate` aguarda a sessão antes de renderizar a aplicação protegida.
- O loading de acesso também aguarda a resolução do tenant para evitar flash de “nenhuma empresa vinculada” durante o carregamento.
- Páginas operacionais ficam em `src/pages/`; Agenda está isolada em `src/pages/tenant/AgendaPage.tsx`.

## Backend
Supabase fornece Auth, PostgreSQL, RLS, RPCs e Edge Functions.

## Multi-tenant
`company_id` é a chave funcional do tenant. O frontend usa o tenant para contexto e filtragem conveniente. A autorização definitiva é garantida por RLS e validação server-side.

## WhatsApp
O transporte operacional é a Evolution API.

Edge Functions:
- `manage-evolution-session`: cria/consulta sessão, gera QR e configura o webhook.
- `receive-evolution-webhook`: recebe mudanças de conexão e eventos de mensagens.
- `process-automation-dispatches`: processa dispatches e envia mensagens pela Evolution.

Secrets:
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

Essas secrets nunca devem chegar ao browser.

## Agenda
- Dia, Semana, Mês e Lista.
- Mês é a visão inicial.
- Dia/Semana posicionam eventos por horário e duração.
- Filtros: paciente, profissional, status e tipo.
- Criação/edição/confirmação/cancelamento.
- Datas respeitam o timezone do tenant.

## Deploy
Render executa `npm install && npm run build`.

Publicação: `dist`

SPA: `/* → /index.html`

## Regra arquitetural
Código/schema atual prevalece sobre documentação. Não criar nova camada, tabela ou integração sem inspecionar a estrutura existente.
