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
## Plano de implementação

O desenvolvimento segue por fases e uma fase só é considerada concluída quando a funcionalidade estiver funcionando de ponta a ponta: UI → ação → validação → persistência → feedback → refresh → autorização → isolamento do tenant.

### Fases
1. Fundação: autenticação, sessão persistente, rotas, tenant, RBAC e RLS.
2. Superadmin: dashboard global, empresas, usuários e permissões.
3. Onboarding: configuração do consultório e primeiro Owner.
4. Operação: profissionais, pacientes e agenda com CRUD real. **Base atual:** pacientes e profissionais possuem criação, edição, status e busca; agenda possui criação, edição, confirmação e cancelamento.
5. Comunicação: WhatsApp, templates e histórico de mensagens. **Base atual:** configuração do WhatsApp, CRUD de templates e leitura do histórico já persistem no Supabase por tenant.
6. Automações: gatilhos, regras, execução e histórico.
7. Qualidade: loading, empty/error states, responsividade e acesso direto às rotas.
8. Segurança: revisão de RLS, autorização e isolamento entre tenants.
9. Teste de fluxo real ponta a ponta.
10. README e deploy.

### Regra de desenvolvimento
Antes de criar uma tela ou rota, verificar se ela já existe. Não considerar uma tela pronta apenas por renderizar: todos os botões e links devem executar ações reais ou indicar explicitamente uma funcionalidade ainda não disponível.


## Estado atual
- Login Supabase com sessão persistente e proteção por rota.
- Superadmin: dashboard global, empresas, acessos e permissões.
- Empresa: troca de tenant persistida no navegador.
- Pacientes: listar, buscar, criar, editar e ativar/inativar.
- Profissionais: listar, buscar, criar, editar e ativar/inativar.
- Agenda: calendário diário, criação, edição, confirmação e cancelamento.
- WhatsApp: configuração por tenant, templates de mensagens e histórico das últimas mensagens registrados no Supabase.\n- Automações: CRUD e execução ainda serão aprofundados na próxima fase.
