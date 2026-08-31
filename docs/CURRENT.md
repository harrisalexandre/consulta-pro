# CURRENT — Consulta Pro

## Onde estamos
**Etapa 8/13 — Integrações, automações e WhatsApp**  
**Status: restauração das telas concluída; build Render pendente de nova validação**

### Concluído
- Scheduler/pg_cron.
- Enfileiramento, claim e worker de dispatch.
- Estados pending/processing/sent/failed.
- Retry com backoff e limite de tentativas.
- Timezone por empresa, padrão America/Sao_Paulo.
- Integração WAHA por empresa.
- Edge Function `manage-waha-session`.
- Controle JWT + Owner/Admin.
- Tela WhatsApp com conexão, QR, status e reconexão.
- Templates e histórico preparados.
- Landing pública em `/`.
- Login em `/login`.

### Histórico / causa da perda das telas
- O último estado conhecido com as telas operacionais completas está no commit `d8f3ed2c3c073a225eb94f9d4e56cb31741857d5`.
- O `src/App.tsx` foi posteriormente reduzido, removendo os componentes operacionais apesar de os menus permanecerem.
- O problema não era apenas roteamento: os componentes tinham sido removidos do arquivo.

### Restauração atual
- Restaurado o conteúdo funcional baseado no commit `d8f3ed2c...`, recuperando:
  - `TenantDashboard`;
  - `PatientsPage`;
  - `ProfessionalsPage`;
  - `AgendaPage`;
  - `WhatsAppPage`;
  - `AutomationsPage`;
  - telas administrativas existentes;
  - `CompanyDetail`, `Permissions`, `AdminMessages` e placeholders administrativos.
- Recriada a árvore de rotas com `SessionGate` → `TenantProvider` → `RoleGate` → layout.
- A landing permanece pública.
- Corrigidos os acessos principais ao Supabase para evitar o problema recorrente de nullable TypeScript.
- Commit de restauração atual: `38278c33b927e9d8298c64bee52edaefbaf6c454`.

### Último build Render
O Render reportou no commit anterior:
- `TS2741: Property 'children' is missing in type '{}'` para `TenantProvider`.
- `TS2304: Cannot find name 'RoleGate'`.
- O `App.tsx` foi corrigido novamente a partir do estado completo conhecido de `d8f3ed2c...`.
- Novo commit de correção: `38278c33b927e9d8298c64bee52edaefbaf6c454`.

### Próximo passo obrigatório
1. Rodar novamente o build no Render usando o commit atual do `main`.
2. Corrigir somente erros efetivamente reportados pelo `tsc`/`vite`.
3. Com build verde, validar `/`, `/login`, dashboard, agenda, pacientes, profissionais, WhatsApp, automações, configurações e telas administrativas.
4. Depois executar auditoria funcional e fluxo ponta a ponta.

### Pendência WAHA
Ainda dependem de configuração real no ambiente:
- `WAHA_URL`
- `WAHA_API_KEY`

Sem essas secrets, não concluir teste real de QR/conexão/envio.

### Regra
Não considerar Etapa 8 concluída apenas porque o build passa; validar o fluxo real ponta a ponta.


### Revisão e restauração das etapas 1–7 — 31/08/2026
- Histórico Git revisado: o último `App.tsx` completo e funcional antes da regressão foi o commit `59f4462c5d7bfce5e73177bcea51b77459d57d51`.
- Restaurado esse baseline completo, preservando Auth, tenant, Superadmin, pacientes, profissionais, agenda, WhatsApp, automações e configurações.
- O baseline restaurado contém CRUD/edição/status e históricos de pacientes/profissionais, agenda com edição/cancelamento e timezone, WhatsApp com templates/histórico e `manage-waha-session`, automações com CRUD e histórico de dispatches e configurações da empresa/conta.
- Corrigido o uso do timezone no Dashboard e incluído `timezone` no tipo do `TenantContext`.
- Banco Supabase real revisado: 9 tabelas operacionais com RLS habilitado, migrations até `waha_connection_state_stage8` e 5 Edge Functions ativas, incluindo `manage-waha-session` e processamento de dispatch.
- Policies atuais cobrem isolamento por `company_id` em pacientes, profissionais, agenda, WhatsApp, templates, automações e dispatches; `profiles` permite leitura do próprio usuário.
- Advisors de segurança ainda reportam funções `SECURITY DEFINER` expostas e proteção contra senhas vazadas desabilitada. Não alteradas nesta revisão porque algumas funções fazem parte dos contratos atuais de autorização/tempo e exigem validação específica antes de revogar execução.
- Novo baseline restaurado no frontend: `d9aeda53fc5c620fc7b07fa31cc30240c610c1ae` + ajuste de contexto `652cdb448c582d8085bfa1421b7226b9b5030171`.
- **Próximo:** validar o build Render e executar testes funcionais 1–7 com usuário real. Só então avançar a Etapa 8/13.


### Validação de infraestrutura das etapas 1–7 — 31/08/2026
- Supabase confirmado no projeto real: 1 empresa, 2 perfis, 1 paciente, 1 profissional e 1 agendamento existentes.
- RLS está habilitado nas 11 tabelas públicas operacionais.
- `pg_cron` possui 3 jobs ativos: enqueue, worker e retry, todos a cada minuto.
- Funções `SECURITY DEFINER` de autorização/dispatch continuam presentes; não removidas sem teste de regressão.
- Templates, automações, dispatches e integrações WhatsApp estão vazios no banco atual; portanto o CRUD da UI precisa ser exercitado com dados reais antes de declarar essas partes validadas.
- Frontend restaurado está novamente com as implementações completas: `PatientsPage`, `ProfessionalsPage`, `AgendaPage`, `WhatsAppPage`, `AutomationsPage`, `TenantSettingsPage` e `manage-waha-session`.
- **Próximo:** validar build do commit atual no Render; em seguida testar CRUD de paciente/profissional/agenda com a empresa existente e então WhatsApp/templates/automações. Não criar dados de teste automaticamente.


### Auditoria Etapa 8 — divergência de checkout e bloqueio autenticado — 31/08/2026

- O Render está conectado à branch `main` no commit `08d7baccc020ce6e89e7addcd6bfb55490f9e2da`, não ao checkout local antigo que estava em `53d51c2`. O deploy `dep-daaetfn10e5c73bq1f9g` ficou Live e compilou com `tsc -b && vite build`.
- O `origin/main` atualizado contém as telas e rotas completas: `PatientsPage`, `ProfessionalsPage`, `AgendaPage`, `WhatsAppPage`, `AutomationsPage`, `TenantSettingsPage` e `/agenda`, `/pacientes`, `/profissionais`, `/whatsapp`, `/automacoes`, `/configuracoes`.
- A infraestrutura real do Supabase foi confirmada: 11 tabelas públicas, 5 Edge Functions publicadas e a migração `waha_connection_state_stage8`. O projeto está saudável e não possui repositório GitHub conectado ao Supabase.
- A seção de secrets do Supabase informa `No custom secrets created`; `WAHA_URL` e `WAHA_API_KEY` continuam pendentes, portanto não é possível validar conexão/envio real pelo WAHA.
- A abertura autenticada de `/dashboard` e `/agenda` no deploy `08d7bac` foi reproduzida com bloqueio em `Carregando acesso...`/tela sem conteúdo.
- Causa frontend confirmada no baseline: as rotas protegidas eram filhas de `SessionGate`, mas não estavam envolvidas por `TenantProvider`, enquanto `TenantLayout`, `TenantDashboard` e telas administrativas chamam `useTenant()`. Além disso, `RoleGate` não tinha timeout, cleanup nem tratamento de erro e `TenantContext` não selecionava `timezone` nas queries de empresa.
- Correção aplicada no commit `4348240a3dec38936a7f8c4ea6ea23454e60c512`: importar e montar `TenantProvider` em torno de todas as rotas protegidas; restaurar timeout/cleanup e tratamento de erro no `RoleGate`; incluir `timezone` nas consultas de `companies` e `company_users`.
- `npm run build` passou após a correção. O commit ainda precisa ser publicado na branch `main` e validado no Render com login real antes de declarar a Etapa 8 concluída.


### Validação pós-deploy da correção — 31/08/2026

O commit `716486e384b33075d8567eb3d93225c93990c0e1` foi publicado na branch `main` e o Render marcou o deploy `dep-daag6l8ae00c73bd4kb0` como `Live`; o build passou com `tsc -b && vite build`. Após o deploy, o acesso a `/dashboard` deixou de ficar preso em `Carregando acesso...` e passou a renderizar corretamente o estado funcional `Nenhuma empresa vinculada`.

Esse resultado confirma que as rotas e o fluxo de autenticação foram destravados. O bloqueio restante não é ausência de páginas: é dado de autorização/tenant. O usuário autenticado não aparece associado a uma empresa via `company_users`, então `TenantContext` retorna `activeCompany = null` e `TenantLayout` não exibe o menu de Agenda, Pacientes, Profissionais, WhatsApp, Automações e Configurações. A associação deve ser confirmada/criada no banco para o usuário correto; não foi criada automaticamente nesta auditoria.

As secrets customizadas do Supabase continuam inexistentes (`No custom secrets created`), portanto o WAHA ainda não está pronto para teste real de conexão ou envio. As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão presentes no Render. O próximo teste end-to-end, após o vínculo `company_users`, deve navegar por todas as rotas tenant e exercitar CRUD sem inserir dados de teste automaticamente.
