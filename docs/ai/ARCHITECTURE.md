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
