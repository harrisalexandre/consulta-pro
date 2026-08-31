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


### Migração WhatsApp: WAHA → Evolution API — 31/08/2026

- Confirmada a arquitetura do Karate ERP: o WhatsApp operacional utiliza **Evolution API**.
- A implementação do Consulta Pro foi ajustada para seguir o mesmo provider.
- Criada Edge Function `manage-evolution-session` com autenticação JWT + Owner/Admin.
- Criada Edge Function `receive-evolution-webhook` para `CONNECTION_UPDATE` e `MESSAGES_UPSERT`.
- Atualizada `process-automation-dispatches` para enviar por Evolution API em `/message/sendText/{instance}`.
- O worker passou a usar o campo real `automations.message_template`; o código anterior referenciava `message_template_id/content`, incompatível com o schema atual.
- Provider padrão de `whatsapp_integrations` alterado de `waha` para `evolution`.
- Frontend `/whatsapp` atualizado para chamar `manage-evolution-session`.
- Commit frontend: `7e7bad9ca28855928a7bc7ad187aad104824af7d`.
- Edge Function `process-automation-dispatches` está na versão 2.
- **Pendente:** configurar no ambiente Supabase as secrets `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`.
- Enquanto essas secrets não existirem, a conexão/QR e o envio real não podem ser validados.

### Próximo passo
1. Configurar `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`.
2. Abrir `/whatsapp` e conectar a instância.
3. Escanear QR.
4. Confirmar `connected` no banco.
5. Criar paciente/template/automação/agendamento de teste.
6. Validar dispatch → Evolution → WhatsApp → histórico.


### Revisão visual — Agenda / Novo atendimento — 31/08/2026

- Identificado bug visual no formulário do modal: `.form-grid` não possuía layout CSS, fazendo os campos perderem a organização em colunas.
- Corrigidos inputs/selects/textarea para ocupar corretamente a largura do campo.
- Corrigido textarea de Observações, que estava com largura mínima/nativa e desalinhado.
- Padronizados espaçamento, labels, foco e altura dos campos.
- Modal recebeu padding e hierarquia visual mais consistente.
- Adicionado comportamento responsivo: formulário passa para uma coluna em telas menores.
- Commit CSS: `acbd910f68a734236cc0b6a55eec31df99531d8f`.


## Plano de implementação — Agenda v2

Objetivo: transformar a Agenda em uma agenda operacional, com visão Dia/Semana/Mês/Lista, filtros por paciente/profissional/status e criação rápida de atendimento.

### 1. Estrutura e navegação
- Corrigir o header da agenda e remover o botão/controle quebrado.
- Adicionar ação principal “+ Novo atendimento”.
- Implementar navegação Hoje / anterior / próximo / seletor de data.
- Manter o fuso da empresa como fonte para datas e horários.

### 2. Visões da agenda
- **Dia:** grade horária detalhada, foco no atendimento individual.
- **Semana:** colunas por dia com atendimentos posicionados por horário.
- **Mês:** calendário mensal com quantidade/resumo dos atendimentos.
- **Lista:** tabela/linha do tempo para busca e operação rápida.
- Persistir a última visão escolhida localmente.

### 3. Filtros e busca
- Busca por paciente.
- Filtro por profissional.
- Filtro por status.
- Botão “Limpar filtros”.
- Filtros devem afetar todas as visões sem alterar os dados.

### 4. Interação dos horários
- Clique no “+” abre o novo atendimento já com data/hora preenchidas.
- Clique no atendimento abre detalhes/edição.
- Menu contextual para editar, cancelar/concluir e demais ações já suportadas pelo sistema.
- Respeitar duração real do atendimento na grade.

### 5. Novo atendimento
- Reorganizar o modal já corrigido visualmente.
- Paciente e profissional obrigatórios.
- Data/hora, tipo, duração, status e observações.
- Validar conflito de horário antes de salvar.
- Após salvar, atualizar a agenda sem reload.

### 6. Estados e responsividade
- Loading, vazio e erro consistentes.
- Desktop com grade completa.
- Tablet/mobile com navegação simplificada e lista/agenda diária priorizada.
- Evitar overflow horizontal e controles nativos desalinhados.

### 7. Validação final
- Testar CRUD de atendimento.
- Testar filtros combinados.
- Testar troca Dia/Semana/Mês/Lista.
- Testar mudança de data.
- Testar conflito de horários.
- Testar timezone da empresa.
- Rodar TypeScript/Vite build antes do deploy.

### Ordem de execução
**1 → 2 → 3 → 4 → 5 → 6 → 7**

Não alterar banco ou integrações de WhatsApp nesta etapa sem necessidade. A prioridade é deixar a Agenda operacional e visualmente consistente.


### Agenda v2 — Etapa 1 concluída — 31/08/2026

- Refeito o toolbar de navegação da Agenda.
- Corrigido o botão `Hoje`, removendo o estilo genérico que aparecia desalinhado.
- Adicionados controles dedicados para dia anterior/próximo dia.
- Adicionado seletor de data por calendário, mantendo o timezone da empresa no processamento da agenda.
- Ajustada responsividade dos controles.
- Commit App: `3b431c85d999f54a31f2f7cbfaa9c13a45386a41`.
- Commit CSS: `4457acd3ec59e8903438c9c20d2864af5f9c30c7`.


### Agenda v2 — Etapa 2 concluída — 31/08/2026

- Implementadas as visões **Dia, Semana, Mês e Lista**.
- Navegação anterior/próximo agora respeita a visão ativa: dia/lista navegam 1 dia, semana 1 semana e mês 1 mês.
- Adicionado seletor visual de visão no toolbar.
- Visão Dia mantém a grade horária e criação rápida por horário.
- Visão Semana apresenta os sete dias em colunas.
- Visão Mês apresenta calendário com quantidade de atendimentos por dia e clique para abrir o Dia.
- Visão Lista apresenta os atendimentos do período de forma operacional.
- Busca/filtros permanecem para a próxima etapa.
- Commits: `2c735d0` (App) e `03188e9` (CSS).
