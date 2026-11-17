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


### Agenda v2 — Etapa 3 concluída — 31/08/2026

- Implementada busca por **paciente**.
- Implementado filtro por **profissional**.
- Implementado filtro por **status**.
- Adicionado **Limpar filtros**.
- Filtros funcionam em Dia, Semana, Mês e Lista.
- Busca é client-side sobre o período carregado; não altera os dados.
- Mantida a navegação e as quatro visões da Agenda.
- A implementação foi reconstruída a partir do estado estável anterior para preservar o SessionGate e evitar regressões da edição anterior.
- Commit App: 237c5fc7f98c5e425d511015b8126276383a9ba7.
- Commit CSS: 990a878866a5b1376355c7bc6be924ecefe1eabf.


### Agenda v2 — Etapa 4 concluída — 31/08/2026

- Atendimento agora é clicável para abrir edição.
- Ações de confirmar, concluir e cancelar continuam disponíveis sem disparar a edição por acidente.
- Cards da visão Semana ficam compactos para aproveitar a coluna.
- Status exibido em português.
- Melhorados hover, cursor e feedback visual dos cards.
- Duração já é calculada no formulário e o próximo refinamento da grade poderá posicionar/ocupar visualmente os minutos.
- Commit App: 3dfa77f378981ff9ceabe3a2363559fae9700fc3.
- Commit CSS: b0ee0b7d71dda6a326fb4c42895f16ac4b87aabf.


### Agenda v2 — Etapa 5 concluída — 31/08/2026

- Formulário de atendimento reforçado com validações de paciente, profissional, data e horário.
- Duração validada entre 15 minutos e 8 horas.
- Bloqueada criação de novos atendimentos em horário passado.
- Bloqueado atendimento atravessando a virada do dia.
- Mantida validação de conflito por profissional, ignorando o próprio registro durante edição.
- Mensagens de erro ficaram mais seguras e orientadas ao usuário, sem expor detalhes internos do banco.
- Cabeçalho do modal agora mostra data, horário e duração selecionados.
- Botão do formulário explicitamente definido como submit.
- Commit App: bb? 


### Agenda v2 — Etapa 6 concluída — 31/08/2026

- Refinado comportamento responsivo da Agenda em mobile.
- Toolbar, seletor de visão e filtros reorganizam sem estourar a tela.
- Semana mantém scroll horizontal controlado em telas pequenas.
- Mês mantém grade navegável sem quebrar o layout.
- Modal de atendimento respeita viewport móvel e permite rolagem interna.
- Melhorado estado de carregamento com mensagem contextual.
- Estados de lista vazia e filtros sem resultado permanecem explícitos.
- Commit App: 36c79dc33ce966352c30ca49c8956e40716c1225.
- Commit CSS: e4d07d18618a3de25cdb4215664021d637c5a814.


### Agenda v3 — início da virada visual — 31/08/2026

- A referência visual enviada pelo usuário foi incorporada como direção: **calendário mensal como visão principal**, eventos visíveis dentro das células e navegação clara.
- A Agenda agora abre na visão **Mês**, em vez de Dia.
- Cada dia mostra os atendimentos diretamente na grade, com horário, paciente e indicador de quantidade.
- Eventos recebem tratamento visual por status e podem ser clicados para edição.
- Mantidas as visões Dia, Semana e Lista para detalhamento.
- Corrigidos dois erros TypeScript que impediam o build: import do ícone `Search` e callback da lista de atendimentos.
- Commits: `bdd1d28` (Agenda) e `6e0cad7` (estilos).
- A referência enviada é inspiração de composição, não cópia literal: priorizamos a identidade já existente do Consulta Pro.


### Agenda v3 — Etapa 7 concluída — 31/08/2026

- Implementado shell visual inspirado na referência enviada.
- Visão Mês ganhou **mini-calendário lateral**.
- Mini-calendário permite trocar o dia diretamente.
- Dias com atendimentos recebem indicador visual.
- Adicionado CTA `Novo atendimento` na lateral.
- Resumo do dia exibe quantidade de atendimentos.
- Navegação de mês disponível na lateral.
- Layout se reorganiza para mobile.
- Mantida a identidade visual do Consulta Pro em vez de copiar a referência literalmente.
- Commit App: `7f02a1394348921bc30f3338fb3e9706b40c71b5`.
- Commit CSS: `c4378a046cd68efad3cd33d95330194443981b12`.


### Agenda v3 — Etapa 8 concluída — 31/08/2026

- Visões **Dia** e **Semana** agora posicionam os atendimentos pelo horário real, incluindo minutos.
- A altura do atendimento representa visualmente sua **duração**.
- Atendimentos que coincidem no mesmo período são distribuídos em colunas para evitar sobreposição de conteúdo.
- Eventos continuam clicáveis para edição.
- Status permanece visível no próprio bloco.
- Na visão Semana, os blocos ficam compactos para manter a leitura das sete colunas.
- O botão `+` continua disponível nos horários livres para criação rápida.
- Ajustado o alinhamento da camada de eventos compactos.
- Commit App: `be72663ec8917cf34005c291211e17a10f46e5db`.
- Commit CSS: `f515db3702adfbed0640f25d6c08705b1be308fd`.


### Agenda v3 — Etapa 9 concluída — 31/08/2026

- Filtros consolidados: **paciente, profissional, status e tipo**.
- Busca de paciente permanece instantânea sobre os atendimentos carregados.
- `Limpar filtros` agora remove todos os critérios ativos.
- Botão `Hoje` retorna para a data atual e abre diretamente a visão Dia.
- Filtros reorganizados visualmente e responsivos para desktop/mobile.
- CURRENT atualizado após implementação.
- Commit App: `40e2424`.
- Commit CSS: `f028739`.


### Agenda v3 — Etapa 10 concluída — 31/08/2026

- Adicionados indicadores operacionais do dia: total, agendados, confirmados e realizados.
- Indicadores são calculados a partir dos atendimentos do dia selecionado.
- Cards responsivos: 4 colunas no desktop e 2 no mobile.
- Mantida a leitura rápida sem transformar a Agenda em dashboard pesado.
- Commit App: `147bb07`.
- Commit CSS: `b022a3a`.


### Auditoria independente e restauração do App.tsx — 17/11/2026

Quatro auditorias independentes rodaram em paralelo sobre `main` em `4b2bf79`:
arqueologia do histórico git, estado real do Supabase, divergência docs-vs-código
e validação de build/dependências. As três que puderam concluir chegaram ao mesmo
diagnóstico.

**Achado principal: o frontend estava destruído e a documentação não registrou.**

Em `4b2bf79` o `src/App.tsx` tinha 29 linhas e 9.991 bytes. Todas as sete telas de
empresa e todas as seis telas administrativas eram funções que retornavam um
`<h2>` e um `<p>`, e nenhuma estava montada em rota alguma. As oito rotas de tenant
renderizavam `<TenantLayout/>` sem rota filha, deixando o `<Outlet/>` vazio: o
usuário autenticado via sidebar e header com a área de conteúdo em branco. Não
existia nenhuma rota `admin/*`. O `RoleGate` nunca era montado, então não havia
autorização por rota. O app inteiro lia 3 tabelas (`profiles`, `companies`,
`company_users`) e não executava nenhuma escrita, nenhum RPC e nenhuma Edge Function.

**Causa raiz.** O último estado completo é `861a879` (571 linhas, 82.358 bytes,
37 queries sobre 11 tabelas, 29 rotas). Ele contém 6 erros de sintaxe vindos de
escape de script: um `\n` literal fora de string na linha 346 e quatro `{'}'}`
super-escapados na linha 392. Quatro commits rotulados `fix: restore ...` em
01/09/2026 tentaram consertar isso apagando código — `0042168` removeu 546 linhas
de uma vez, `69abeab` levou o resto do CRUD.

O build permaneceu verde durante toda a regressão. `noUnusedLocals` está desligado
e, em TypeScript, declarações de nível de módulo não usadas nunca são erro de
compilação — por isso 13 telas ficaram órfãs sem nenhum aviso.

**Os documentos não inventaram commits.** Os 30 SHAs citados aqui existem todos no
histórico. O problema é de data: o último commit de doc (`7bd44d0`) é anterior à
destruição, então estes registros descrevem com fidelidade um código que saiu da
working tree e ficou só no git.

**Restauração aplicada.** `src/App.tsx` recuperado de `861a879` com os 6 erros de
sintaxe corrigidos (1 `\n` literal + 4 `{'}'}`). Nenhum outro arquivo precisou de
recuperação: `styles.css`, `Landing.tsx`, `TenantContext.tsx`, `lib/supabase.ts`,
`main.tsx`, `mock.ts` e `types.ts` já eram blobs idênticos a `861a879` — ou seja,
o CSS da Agenda v2/v3 nunca foi perdido, só ficou órfão.

Resultado: 573 linhas, 82.341 bytes, 29 rotas (9 delas `admin/*`), `RoleGate`
montado 2×, 11 tabelas, 37 leituras, 13 escritas, `rpc('server_now')`,
`rpc('superadmin_create_company')` e as invocações de `manage-evolution-session`,
`superadmin-create-company-user` e `superadmin-update-company-user`.

Validação executada: `npm ci` ok; `npx tsc -b --force` com **0 erros**;
`npm run build` ok (1.635 módulos, 294,91 kB / 84,31 kB gzip).

**Backend: risco aberto.** O diretório `supabase/` nunca existiu em nenhum dos 209
commits. Migrations e Edge Functions existem só na nuvem, sem versionamento, sem
review e sem rollback. Pior: a conta Supabase conectada na auditoria não contém
nenhum projeto do Consulta Pro — o único projeto é de outro produto. Confirmar em
qual conta/organização o projeto vive é pré-requisito para qualquer teste de RLS,
cron, automações ou WhatsApp.

**Também nesta etapa:** removido o arquivo `hello world` (12 bytes, versionado
desde o commit mais antigo do repo), criado `.env.example`, e README e
`docs/ai/CURRENT_STATE.md` reescritos para o estado real, com a URL de produção.

**Não validado:** nada foi exercitado com dados reais. O build compila e serve; não
se afirma aqui que qualquer fluxo funciona ponta a ponta.


### Backend localizado e auditado — 17/11/2026

A primeira auditoria não encontrou o projeto porque o conector apontava para outra
organização. Projeto correto: `swrsjwmuqxrzgapqiacb` (`consulta-pro`), org
`uiuycznuzvecueilqzto`, `us-west-2`, Postgres 17.6.1.147, `ACTIVE_HEALTHY`.

**O backend está em bom estado.** 11 tabelas, todas com RLS habilitado e policy,
nenhuma permissiva sem condição. Isolamento por tenant verificado:
`is_company_member(company_id)` nas operacionais; `companies` com
`is_superadmin() OR is_company_member(id)`.

21 migrations aplicadas, 15 funções no `public`, 3 jobs `pg_cron` ativos a cada
minuto (enqueue, worker via `net.http_post`, retry) e 8 Edge Functions `ACTIVE`,
incluindo `manage-evolution-session` (v13) e `receive-evolution-webhook` (v4).
`server_now()` existe, então o `rpc('server_now')` do frontend restaurado funciona.

**Dois bloqueios dos registros anteriores caíram:** o vínculo em `company_users`
existe (empresa `consultorio`, role `owner`) e `whatsapp_integrations` está com
`status=connected`, `provider=evolution`.

Dados atuais: 1 empresa, 2 perfis (1 superadmin), 2 usuários em `auth.users`,
1 paciente, 1 profissional, 1 agendamento, 8 templates. `automations`,
`automation_dispatches` e `whatsapp_messages` estão vazias — o CRUD dessas partes
nunca foi exercitado.

**Achados de segurança:** `company_local_now` executável por `anon`;
6 funções `SECURITY DEFINER` executáveis por `authenticated`, entre elas
`create_company_with_owner` e `superadmin_create_company`; proteção contra senha
vazada desabilitada; `receive-evolution-webhook` com `verify_jwt: false` (esperado
para webhook, mas exige validação própria, não auditada).

**Bloqueio para versionar `supabase/`:** a migration `20260830015114` contém um JWT
literal em `vault.create_secret(...)`. O repositório é público, então essa migration
precisa ir com placeholder. As outras 20 estão limpas (escaneadas por padrão de
chave/token). O SQL completo das 21 está em `supabase_migrations.schema_migrations`,
então a recuperação é possível.

**Não verificado:** `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` ficam no store de
secrets de Edge Functions, que o MCP não lê. O `status=connected` sugere que estão
setadas; não é prova. Nenhum fluxo foi exercitado ponta a ponta.


### Revisão UX/UI — consolidação da folha de estilo — 17/11/2026

A folha era **acretada**: cada etapa da Agenda anexava um bloco novo sem
consolidar o anterior. Resultado medido em `4b2bf79`/`ab9cb3d`: 210 linhas com
`.agenda-toolbar`, `.agenda-toolbar h2`, `.modal`, `.modal .head`,
`.modal .head p`, `.agenda-filters`, `.month-grid`, `.month-cell`,
`.calendar-slot` e `.calendar-day` definidos duas vezes com valores
conflitantes; 11 cinzas de borda diferentes (`#ddd`, `#eee`, `#dfe5e0`,
`#e1e6e2`, `#e4e8e5`, `#e8ece9`, `#dce3de`, `#d9e0db`, `#e5ebe7`, `#e6ebe7`,
`#e7ebe7`); 8 breakpoints (1000, 850, 800, 700, 650, 520, 500, 420); alturas de
controle em 38, 40, 41, 42 e 44px; e zero variáveis CSS.

**Defeitos corrigidos, cada um verificado por leitura do código:**

1. **`.icon-btn` não tinha regra base** — só `{border:0;background:none;cursor:pointer}`.
   Ganhava aparência apenas dentro de `.password-wrap` e `.mini-head`. Os 12
   botões de ícone do app (Profissionais, Pacientes, Agenda) renderizavam como
   `<button>` nativo sem tamanho, padding ou hover. Agora tem base com
   `--ctl`, raio, hover e variante `.danger`.
2. **`.back-link` não tinha regra base nenhuma** — apenas `.row .back-link` e
   `.calendar-slot .back-link`. Fora desses dois contextos era botão cru.
   Agora é um botão secundário completo.
3. **`.hero-btn` carregava `margin-top:12px`** herdado do CTA da landing,
   anulado só dentro de `.modal`. Todo botão de toolbar e de cabeçalho de
   página vinha com 12px de sobra no topo. Removido da base.
4. **Dois `<button onClick={logout}>` sem `className`** — botão nativo na
   sidebar. Agora `icon-btn` com `title="Sair"`.
5. **`.company-select` não existia no CSS** e era usado no markup: o `<select>`
   de troca de empresa era um select nativo cru. Criado.
6. **`.agenda-controls-left .agenda-stats{display:none}`** escondia os
   indicadores operacionais. Como `.agenda-stats` aparece exatamente uma vez no
   markup, e é dentro de `.agenda-controls-left`, a feature da etapa 10 estava
   **100% invisível**. Agora aparece em versão compacta, honrando a intenção de
   "controles compactos" sem matar o indicador.
7. **`.agenda-toolbar` somava espaçamentos** — `margin-bottom:18px` da primeira
   definição + `padding:4px 0 18px` e `border-bottom` da segunda, porque a
   segunda não resetava a margem. Uma definição só agora.
8. **`.appointment-card` tinha `border-left:3px solid #222`** (preto) enquanto
   `.calendar-event` usava verde para o mesmo conceito. Unificado no token, e o
   card passou a receber `status-${a.status}` no markup — as regras
   `.appointment-card.status-*` existiam mas estavam mortas por falta da classe.
9. **`.form-success` e `.placeholder`** eram usados sem regra. Criados.
10. **Jargão interno vazando para a UI**: "Tenant ativo", "Tenant protegido por
    RLS" e "Cadastre um novo tenant do Consulta Pro." viravam texto na tela para
    o usuário final. Trocados por "Empresa ativa", "Sessão ativa" e "Cadastre
    uma nova empresa no Consulta Pro.".
11. **`.head` usava `align-items:end`** com `.head p` sem reset de margem,
    desalinhando título e ação. Agora `flex-start` com margem controlada.
12. **`.profile` era `position:absolute;bottom:25px`** dentro da aside fixa;
    agora a aside é flex e o bloco usa `margin-top:auto`, sem sobreposição
    quando o menu cresce.

**Também:** camada `:root` com tokens (cor, escala de espaçamento 4–32,
raios, sombras, altura de controle única, anel de foco); breakpoints reduzidos
de 8 para 4 (1000/850/650/420); `:focus-visible` global para acessibilidade de
teclado, que não existia.

**Colisão evitada:** `Landing.tsx` injeta CSS próprio inline que já define
`.btn` e `.btn-ghost`. Os aliases com esses nomes foram removidos da folha para
não disputar ordem de cascata com a landing.

Folha: 210 → 462 linhas (23.588 → 26.2 kB no bundle, +2,6 kB), **sem perder
nenhum dos 96 seletores originais** (conferido por diff de conjuntos) e com 3
novos que faltavam.

Validação: `npx tsc -b --force` com 0 erros; `npm run build` ok.

**Não validado visualmente.** Não há navegador nesta sessão que alcance
`localhost` nem sessão autenticada no deploy, então as correções acima foram
derivadas por leitura do CSS e do markup, não por inspeção da tela renderizada.
As telas de empresa precisam de login real para conferência visual.
