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

## Gestão de acesso das empresas
- O superadmin cria a empresa em **Administração > Empresas > Nova empresa**.
- Dentro da empresa, em **Acesso da empresa**, pode criar o primeiro login com nome, e-mail, senha e perfil Owner/Admin.
- A criação do usuário é feita pela Edge Function `superadmin-create-company-user`, nunca com service role no frontend.
- O usuário criado é confirmado no Supabase Auth, recebe um registro em `profiles` e é vinculado à empresa em `company_users`.
- O login da empresa é feito pela rota `/login`.
