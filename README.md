# Consulta Pro

SaaS multi-tenant para gestão de consultórios e clínicas.

## Arquitetura
- React + TypeScript + Vite
- Supabase Auth + PostgreSQL + RLS
- Tenant = empresa (companies)
- company_users vincula usuários aos tenants
- profissionais, pacientes, agenda, WhatsApp e automações possuem company_id
- WhatsApp pertence à empresa e está preparado para Evolution API
- automation_dispatches possui deduplicação por company + automation + appointment + recipient

## Segurança
O TenantContext controla somente o contexto da interface. O isolamento real é feito pelo Supabase/RLS. Nunca usar service role key no frontend.

## Variáveis
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

## Deploy Render
Build: npm install && npm run build
Publish directory: dist
SPA Rewrite: /* -> /index.html

## Desenvolvimento
npm install
npm run dev
npm run build
