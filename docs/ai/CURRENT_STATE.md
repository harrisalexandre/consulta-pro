# Consulta Pro — Estado atual

**Atualizado em:** 29/08/2026  
**Branch canônica:** `main`

## 1. Onde estamos
O projeto já possui fundação funcional de autenticação, tenant e área administrativa. O fluxo principal de operação está sendo fechado módulo a módulo.

## 2. Concluído
### Fundação
- Login via Supabase Auth.
- Sessão persistente.
- Proteção de rotas.
- Separação entre área Superadmin e área da empresa.
- Tenant ativo persistido.
- Rota desconhecida retorna para a landing.

### Superadmin
- Dashboard global.
- CRUD inicial de empresas.
- Cadastro de primeiro acesso da empresa via Edge Function.
- Gestão inicial de usuários da empresa, incluindo edição e reset de senha pelo fluxo privilegiado.
- Tela de permissões existente.

### Operação
- Dashboard do consultório.
- Pacientes: listar, buscar, criar, editar e ativar/inativar.
- Histórico de atendimentos do paciente.
- Profissionais: listar, buscar, criar, editar e ativar/inativar.
- Histórico de atendimentos do profissional.
- Agenda: calendário diário, criação, edição, confirmação e cancelamento.
- WhatsApp: configuração por tenant, templates e histórico.
- Automações: CRUD por tenant, gatilho, antecedência, canal, template e ativação/desativação.

## 3. Documentação
A árvore `docs/ai/` foi criada nesta etapa com:
- `CONTEXT.md`;
- `CURRENT_STATE.md`;
- `BUSINESS_RULES.md`;
- `ARCHITECTURE.md`;
- `SECURITY.md`;
- `DECISIONS.md`.

`AGENTS.md` define o protocolo de trabalho dos agentes.

## 4. Atividade desta etapa — WhatsApp
- Revisada a tela de WhatsApp usando as tabelas existentes.
- Configuração por tenant: provedor, instância, número e status.
- Templates: criação, edição, ativação/desativação.
- Histórico: últimas 50 mensagens, status, direção, número e filtro.
- Corrigido o fluxo de abertura/fechamento do formulário de template.
- **Importante:** esta etapa não inventa nem implementa um endpoint de envio real; a integração de transporte deve ser validada contra a Edge Function/infra existente.

## 5. Atividade desta etapa — Automações
- Tela de automações revisada e conectada às tabelas existentes.
- CRUD da regra: criar, editar, ativar/desativar e excluir.
- Validação de template ativo para canal WhatsApp.
- Resumo de automações ativas e disparos por status.
- Histórico dos últimos 50 registros de `automation_dispatches`.
- Estados de carregamento, erro e vazio tratados.
- **Pendente:** não existe Edge Function de execução listada atualmente no projeto Supabase; portanto esta etapa não afirma que os disparos estão sendo executados automaticamente.

## 6. Atividade desta etapa — Configurações
- Tela `/configuracoes` deixou de ser placeholder.
- Dados completos do consultório: identificação, contato e endereço.
- Edição do perfil autenticado.
- Alteração opcional de senha com olhinho de privacidade.
- Persistência via Supabase respeitando o tenant ativo.

## 7. Ajuste transversal — Fuso horário
- `companies.timezone` criado com padrão `America/Sao_Paulo`.
- Configurações agora permitem selecionar o fuso do consultório.
- O fuso é persistido por tenant e deve ser usado como referência para agenda e automações.
- **Pendente:** revisar todos os pontos de conversão/exibição de datas e o executor das automações para garantir uso consistente do timezone do tenant.

## 8. Segurança temporal — concluída
- O horário atual usado pelo frontend pode ser obtido de `public.server_now()`, diretamente no PostgreSQL/Supabase, em vez do relógio do PC.
- Agenda converte horários digitados pelo usuário usando o `timezone` do tenant antes de persistir em UTC.
- Agenda e Dashboard calculam o início/fim do dia no fuso do consultório.
- Exibição de horários da agenda usa o fuso do tenant.
- Isso impede que alterar o relógio local do computador faça o sistema considerar outro “agora” para estas operações.
- **Regra arquitetural:** automações que efetivamente enviam mensagens devem ser disparadas por backend/Edge Function usando `now()` do servidor + `companies.timezone`; nunca pelo relógio do navegador.

## 9. Etapa 8 de 13 — Baseline de arquitetura, integrações, segurança e desempenho
Esta etapa foi adicionada ao plano sem reiniciar o progresso. O Karate ERP será usado como referência técnica comprovada, adaptando os padrões ao modelo multi-tenant do Consulta Pro.

- Capacitor: adotar como padrão para transformar a aplicação React em Android/iOS.
- WhatsApp/WAHA: validar a implementação efetivamente usada no Karate antes de conectar o transporte real do Consulta Pro.
- Segurança: reaproveitar padrões comprovados do Karate para autenticação, secrets, permissões, CI e auditoria de dependências, adaptando-os ao RLS/tenant isolation.
- CI/CD: incorporar instalação reprodutível (npm ci) e auditoria de dependências como baseline.
- Mobile: considerar push notifications e plugins Capacitor do Karate somente quando houver requisito real.
- Desempenho: revisar bundle, consultas, índices, paginação, cache e chamadas repetidas.
- Regra: uma integração só é considerada pronta quando houver transporte, autenticação, persistência necessária, tratamento de erro e teste do fluxo completo.
- Resultado esperado: checklist técnica do Karate aplicada ao Consulta Pro e lacunas registradas antes das integrações reais.

## 10. Onde está o desenvolvimento agora
**Fase atual: fechamento operacional e validação.**

A base visual e os CRUDs principais existem, mas ainda precisam de revisão sistemática de integração, UX, estados, autorização e fluxos entre telas.

## 11. Próximas etapas
1. **WhatsApp real:** revisar conexão, templates, histórico, estados e preparar/validar envio pela integração existente.
2. **Automações:** validar execução real, histórico de disparos, deduplicação, retries e associação com agendamentos.
3. **Configurações:** transformar a tela em configuração real da empresa, não placeholder.
4. **Usuários e permissões:** fechar edição, status, reset de senha, papéis e autorização por tenant.
5. **Dashboard/KPIs:** validar métricas reais de dia/semana/mês e estados de erro.
6. **Revisão de rotas:** garantir acesso direto a todas as rotas sem tela branca/404 e com fallback correto.
7. **UX completa:** revisar loading, empty, error, feedback, modais, responsividade e consistência dos ícones.
8. **Segurança/RLS:** auditoria completa do isolamento entre empresas e operações privilegiadas.
9. **E2E:** executar os fluxos principais com usuário Superadmin e usuário de empresa.
10. **README/deploy:** alinhar documentação final ao estado real.

## 12. Pendências conhecidas
- Nem todos os módulos possuem profundidade funcional equivalente.
- Algumas telas administrativas ainda são placeholders.
- Execução real de automações/WhatsApp precisa ser validada além do CRUD.
- Dashboard precisa de validação de métricas e tratamento de falhas.
- Ainda falta uma bateria E2E final.
