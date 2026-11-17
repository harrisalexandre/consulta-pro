# Consulta Pro

SaaS multi-tenant para gestão de consultórios e clínicas.

**Produção:** https://consulta-pro.onrender.com/

| Ambiente | URL | Rota de entrada |
| --- | --- | --- |
| Landing pública | https://consulta-pro.onrender.com/ | `/` |
| Login | https://consulta-pro.onrender.com/login | `/login` |

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
- URL de produção: https://consulta-pro.onrender.com/
- Branch: `main` (deploy automático a cada push)
- Build: `npm install && npm run build`
- Publish directory: `dist`
- SPA Rewrite: `/* -> /index.html` (ver `public/_redirects`)
- Variáveis obrigatórias no Render: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

Sem as duas variáveis o cliente Supabase é inicializado como `null` e a aplicação cai no caminho "Supabase não configurado" — a landing carrega, mas o login não funciona.

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
4. Operação: profissionais, pacientes e agenda com CRUD real.
5. Comunicação: WhatsApp, templates e histórico de mensagens.
6. Automações: gatilhos, regras, execução e histórico.
7. Qualidade: loading, empty/error states, responsividade e acesso direto às rotas.
8. Segurança: revisão de RLS, autorização e isolamento entre tenants.
9. Teste de fluxo real ponta a ponta.
10. README e deploy.

### Regra de desenvolvimento
Antes de criar uma tela ou rota, verificar se ela já existe. Não considerar uma tela pronta apenas por renderizar: todos os botões e links devem executar ações reais ou indicar explicitamente uma funcionalidade ainda não disponível.


## Estado atual

Estado detalhado e auditado em [`docs/ai/CURRENT_STATE.md`](docs/ai/CURRENT_STATE.md).
Histórico cronológico em [`docs/CURRENT.md`](docs/CURRENT.md).

**Implementado no frontend** (código presente e roteado, compila e serve):
- Landing pública em `/` e login Supabase em `/login`.
- `SessionGate` (sessão) e `RoleGate` (separação superadmin/empresa por rota).
- Tenant resolvido com timeout, superadmin-aware, empresa ativa persistida no navegador.
- Área empresa: dashboard, agenda, pacientes, profissionais, WhatsApp, automações, configurações.
- Agenda: visões Dia/Semana/Mês/Lista, mini-calendário, filtros, indicadores do dia, posicionamento por duração com sobreposição.
- Área superadmin: dashboard, empresas (lista/nova/detalhe), usuários, permissões, WhatsApp, mensagens, automações, atividade, configurações.

**Não validado.** O build compila (`tsc -b` sem erros, `vite build` ok), mas nenhum
fluxo foi exercitado com dados reais. Compilar não é funcionar.

**Riscos abertos:**
- `supabase/` **nunca foi versionado** — migrations e Edge Functions existem só na nuvem, sem review nem rollback.
- A conta Supabase auditada não contém projeto do Consulta Pro; é preciso confirmar onde o backend vive.
- `TenantLayout` colapsa loading, erro e vazio real na mesma tela "Nenhuma empresa vinculada".
- Sem testes, sem lint, sem CI. A regressão de 01/09/2026 (perda de ~540 linhas) passou com build verde.
- 2 vulnerabilidades high em dependências de build (`vite`, `source-map-js`), fora do bundle de produção.
