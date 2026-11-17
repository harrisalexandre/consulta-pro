# Consulta Pro — Estado atual

**Atualizado em:** 17/11/2026 (fim do dia)
**Projeto Supabase:** `swrsjwmuqxrzgapqiacb` (`consulta-pro`)
**Branch canônica:** `main`
**Produção:** https://consulta-pro.onrender.com/

> Este documento foi reescrito após uma auditoria que encontrou divergência total
> entre a documentação anterior e o código em `main`. As seções antigas
> declaravam concluídas funcionalidades que não existiam na working tree.
> O histórico cronológico continua em `docs/CURRENT.md`.

## 1. O que aconteceu — regressão de 01/09/2026

O `src/App.tsx` foi destruído por quatro commits consecutivos rotulados `fix: restore ...`:

| commit | data | linhas | bytes | queries Supabase |
| --- | --- | --- | --- | --- |
| `861a879` | 01/09 | 571 | 82.358 | 37 |
| `0042168` | 01/09 | 50 | 60.023 | 30 |
| `69abeab` | 01/09 | 44 | 13.832 | 1 |
| `0591606` | 01/09 | 28 | 11.323 | 1 |
| `4b2bf79` | 01/09 | 29 | 9.991 | 1 |

Causa raiz: `861a879` continha **6 erros de sintaxe** introduzidos por escape de
script — um `\n` literal (barra invertida + n) fora de string na linha 346 e
quatro `{'}'}` super-escapados na linha 392. Em vez de corrigir os 6 caracteres,
as tentativas de conserto apagaram ~540 linhas.

Nenhum documento registrou a perda: o último commit de doc (`7bd44d0`) é
**anterior** à destruição. A documentação passou a descrever com fidelidade um
código que só existia no histórico git.

O build continuou **verde** durante toda a regressão (`tsc -b` exit 0, `vite build` OK).
`noUnusedLocals` está desligado e declarações de nível de módulo não usadas nunca
são erro de compilação em TypeScript — por isso 13 telas ficaram órfãs sem um
único aviso.

## 2. Restauração aplicada

`src/App.tsx` recuperado de `861a879` com os 6 erros de sintaxe corrigidos.
Nenhum outro arquivo precisou de recuperação: `styles.css`, `Landing.tsx`,
`TenantContext.tsx`, `lib/supabase.ts`, `main.tsx`, `mock.ts` e `types.ts` no HEAD
eram blobs **idênticos** a `861a879`.

Estado verificado após a restauração:

| Métrica | Antes (`4b2bf79`) | Depois |
| --- | --- | --- |
| Linhas / bytes | 29 / 9.991 | 573 / 82.341 |
| Rotas | 11 | 29 |
| Rotas `admin/*` | 0 | 9 |
| `RoleGate` montado | não | sim (2×) |
| Tabelas acessadas | 3 | 11 |
| Leituras (`.from`) | 1 | 37 |
| Escritas | 0 | 13 (4 insert, 7 update, 1 delete, 1 upsert) |
| Edge Functions invocadas | 0 | 3 |
| RPC | 0 | `server_now`, `superadmin_create_company` |
| `setLoading` / `setError` | 2 | 17 / 58 |
| Componentes | 23 (13 órfãos) | 30 |

Validação executada: `npm ci` → ok; `npx tsc -b --force` → **0 erros**;
`npm run build` → ok, 1.635 módulos, bundle 294,91 kB (84,31 kB gzip).

## 3. O que está de fato implementado no frontend

- Landing pública em `/` (`Landing.tsx`, 841 linhas, CSS próprio).
- Login Supabase em `/login`, com loading e erro.
- `SessionGate`: guard de sessão com `onAuthStateChange`.
- `TenantProvider`: resolve tenant com timeout de 8s, trata superadmin, persiste
  empresa ativa em `localStorage`.
- `RoleGate`: separação superadmin / empresa por rota.
- Área empresa: dashboard, agenda, pacientes, profissionais, WhatsApp,
  automações, configurações.
- Agenda: visões Dia/Semana/Mês/Lista, mini-calendário, filtros
  (paciente/profissional/status/tipo), indicadores do dia, posicionamento por
  duração com tratamento de sobreposição.
- Área superadmin: dashboard, empresas (lista/nova/detalhe), usuários,
  permissões, WhatsApp, mensagens, automações, atividade, configurações.

## 4. Backend — risco sistêmico aberto

**O diretório `supabase/` nunca existiu no repositório.** Verificado em todos os
209 commits do histórico: nenhuma migration, nenhuma Edge Function, nenhum
`config.toml` jamais foi versionado.

Consequências:
- Schema, RLS e as Edge Functions existem **somente no projeto Supabase remoto**.
- Sem code review, sem histórico, sem rollback, sem reprodução de ambiente.
- As afirmações de `SECURITY.md` sobre isolamento por tenant são **inauditáveis
  a partir do repositório**.
- O frontend foi recuperável porque estava no git. O backend não tem essa rede.

### Backend localizado e auditado — 17/11/2026

Projeto: `swrsjwmuqxrzgapqiacb` (`consulta-pro`), org `uiuycznuzvecueilqzto`,
região `us-west-2`, Postgres 17.6.1.147, status `ACTIVE_HEALTHY`, criado em
28/07/2026. Não é a mesma org do outro produto do autor, o que explica a primeira
auditoria não tê-lo encontrado.

**O backend está em bom estado — bem melhor do que os docs sugeriam.**

Tabelas (11, todas com RLS habilitado e todas com policy, nenhuma permissiva sem
condição):

| tabela | linhas |
| --- | --- |
| `companies` | 1 |
| `profiles` | 2 |
| `company_users` | 1 |
| `professionals` | 1 |
| `patients` | 1 |
| `appointments` | 1 |
| `whatsapp_integrations` | 1 |
| `message_templates` | 8 |
| `whatsapp_messages` | 0 |
| `automations` | 0 |
| `automation_dispatches` | 0 |

**Isolamento por tenant verificado e correto:** `patients`, `professionals`,
`appointments`, `whatsapp_messages`, `whatsapp_integrations`, `automations` e
`automation_dispatches` usam `is_company_member(company_id)` em `ALL`.
`companies` usa `is_superadmin() OR is_company_member(id)` em SELECT e
`is_superadmin() OR is_company_admin(id)` em UPDATE. `company_users`,
`message_templates` e `profiles` têm policies por comando.

**O bloqueio "Nenhuma empresa vinculada" está resolvido:** existe 1 vínculo em
`company_users` (empresa `consultorio`, role `owner`), 1 superadmin em `profiles`,
2 usuários em `auth.users`. `companies.timezone` = `America/Sao_Paulo`.

**WhatsApp:** `whatsapp_integrations` com `status=connected`, `provider=evolution`.

**Pipeline de automação existe por inteiro:** 21 migrations aplicadas (última
`20260902165559 switch_whatsapp_provider_to_evolution`), 15 funções no `public`
(`enqueue_due_automation_dispatches`, `claim_automation_dispatches`,
`mark_automation_dispatch_sent`, `mark_automation_dispatch_failed`,
`requeue_failed_automation_dispatches`, `server_now`, `company_local_now`,
`is_superadmin`, `is_company_member`, `is_company_admin`, …) e 3 jobs `pg_cron`
ativos, todos a cada minuto: `consulta-pro-automation-enqueue`,
`consulta-pro-automation-worker` (via `net.http_post`) e
`consulta-pro-automation-retry`.

`server_now()` **existe** — a chamada `rpc('server_now')` do frontend restaurado
funciona.

8 Edge Functions `ACTIVE`: `superadmin-create-company-user` (v5),
`superadmin-update-company-user` (v3), `process-automation-dispatches` (v4),
`process-automation-claim` (v3), `manage-evolution-session` (v13),
`receive-evolution-webhook` (v4), `manage-waha-session` (v3), `enviar-mensagem` (v3).

### Achados de segurança do backend

1. **`company_local_now(uuid)` é executável pelo role `anon`** como
   `SECURITY DEFINER`, via `/rest/v1/rpc/company_local_now`. É a única função
   alcançável sem login. Revogar `EXECUTE` de `anon`.
2. **6 funções `SECURITY DEFINER` executáveis por `authenticated`**:
   `company_local_now`, `create_company_with_owner`, `is_company_admin`,
   `is_company_member`, `is_superadmin`, `superadmin_create_company`. As de
   predicado (`is_*`) são usadas pelas policies e precisam continuar; mas
   `create_company_with_owner` e `superadmin_create_company` serem chamáveis por
   qualquer usuário autenticado merece revisão — a proteção depende inteiramente
   da checagem interna de cada função.
3. **Proteção contra senha vazada desabilitada** no Supabase Auth (HaveIBeenPwned).
4. **`receive-evolution-webhook` está com `verify_jwt: false`.** Correto para um
   webhook, mas exige validação de assinatura ou token interno no corpo da função.
   Não auditei o código dela.
5. **A migration `20260830015114 automation_scheduler_secure_http_stage8` contém um
   JWT literal** (`vault.create_secret('eyJ...','consulta_pro_legacy_anon_key')`).
   Ao versionar `supabase/`, essa migration **não pode ir verbatim** para o repo,
   que é público: substituir o literal por placeholder e setar o valor fora do git.
   O vault tem exatamente 2 secrets: `consulta_pro_project_url` e
   `consulta_pro_legacy_anon_key`.

`EVOLUTION_API_URL` e `EVOLUTION_API_KEY` ficam no store de secrets de Edge
Functions, que não é legível por MCP — não foram verificadas. O
`status=connected` sugere que estão configuradas, mas isso não é prova.

### O que continua aberto

Versionar `supabase/` segue **pendente** e segue sendo o maior risco. O schema e
as 8 Edge Functions são recuperáveis do projeto remoto (as 21 migrations têm o SQL
completo em `supabase_migrations.schema_migrations`), mas ainda não estão no git.

## 5. Defeitos conhecidos no código restaurado

1. **Falso-vazio no `TenantLayout`.** O layout desestrutura só
   `{activeCompany, companies, setActiveCompany}` e decide por `if(!activeCompany)`.
   Carregando, erro de rede, RLS negando e vazio real colapsam todos na mesma tela
   "Nenhuma empresa vinculada". O `TenantContext` expõe `loading`, que nunca é
   consumido. Isso viola `BUSINESS_RULES.md` §UX 1-2 e `DECISIONS.md`.
2. **`TenantProvider` envolve a landing pública**, disparando `auth.getUser()` no
   carregamento de `/` para visitante anônimo.
3. **CSS sem regra**: `company-select` (seletor de empresa) e `placeholder` são
   usados sem nenhuma regra em `styles.css`.
4. **`src/mock.ts` e `src/types.ts` são código morto.** `types.ts` usa `camelCase`
   (`companyId`, `legalName`), incompatível com o schema real snake_case e com o
   tipo `Company` do `TenantContext`. Dois modelos de domínio divergentes.
5. **`tsconfig.app.json` e `tsconfig.node.json` são órfãos**: `tsconfig.json` não
   tem `references`. Efeitos: `vite.config.ts` nunca é type-checado; o `target`
   efetivo é ES2020, não o ES2022 escrito em `app.json`; endurecer regras nesses
   arquivos não tem efeito nenhum.

## 6. Débito de infraestrutura

| Item | Estado |
| --- | --- |
| Testes | nenhum (0 arquivos, 0 runners, sem script `test`) |
| ESLint | nenhum |
| Prettier / editorconfig | nenhum — daí o código em uma linha por componente |
| CI | nenhuma (`.github/` não existe; nunca existiu) |
| `.env.example` | criado nesta etapa |
| `engines` / `.nvmrc` | ausentes — Node não fixado (validado em v22.23.4) |
| Reprodutibilidade | Render roda `npm install`, não `npm ci`: o lock não é garantido |
| Code splitting | nenhum — 1 chunk único, sem `React.lazy` nem `manualChunks` |
| Vulnerabilidades | 2 high: `vite` 6.4.3 (5 advisories) e `source-map-js` ≤1.2.1 (CVSS 7.5). Ambas de build/dev-server, não vão para o bundle. `vite@6.4.6` corrige dentro do `^6` |

## 7. Onde o desenvolvimento está de verdade

Pelo critério do próprio `AGENTS.md` — "uma tela só é pronta quando UI, ação,
persistência, feedback, refresh, autorização e tenant estiverem conectados" — o
código restaurado traz as telas de volta ao estado de 01/09/2026, mas **nenhuma
foi validada com dados reais desde então**. A documentação anterior declarava
"Etapa 8/13 concluída"; isso não foi verificado por execução.

**Fase real: código restaurado, validação funcional pendente.**

## 8. Próximos passos, em ordem

**Fechados hoje** (commits em `main`, build verde em cada um):
`ab9cb3d` restauração do App.tsx · `e024eff` backend localizado ·
`3021511` folha consolidada em tokens · `0fab076` redesenho da agenda ·
`1a4a6ea` escopo dos seletores do shell · `feae462` agenda igual ao design ·
`87ae376` variáveis de template no worker · `d79ba45` formulários completos.

**Em aberto, por ordem:**

1. **Versionar `supabase/`** — 21 migrations + 8 Edge Functions. Maior risco
   aberto. Mascarar o JWT literal da migration `20260830015114` antes de
   commitar: o repositório é público.
2. **Revogar `EXECUTE` de `anon`** em `company_local_now`, e revisar se
   `create_company_with_owner` e `superadmin_create_company` devem ser
   chamáveis por qualquer `authenticated`.
3. **Exercitar o fluxo de disparo de ponta a ponta.** O worker v5 resolve as
   variáveis, mas `automations` está vazia: nada foi disparado de verdade
   desde a correção. Criar automação → agendamento → esperar o cron → conferir
   `automation_dispatches` e `whatsapp_messages`.
4. **Confirmação do paciente fecha o ciclo.** Ligar a resposta `inbound` ao
   agendamento e mudar o status sozinho. É a maior lacuna de produto: hoje o
   lembrete é mão única e alguém lê o WhatsApp e muda na mão.
5. **Consentimento e descadastro** em `patients`. Disparo automático no Brasil
   exige saída. Migration + tratamento de palavra-chave no webhook.
6. **Horário de atendimento** por profissional. Sem ele a agenda não mostra
   vaga livre nem bloqueia marcação fora do expediente.
7. **Cobrança.** Nenhuma tabela guarda valor, pagamento ou convênio, então a
   cobrança automática que o produto promete não tem de onde sair.
8. Corrigir o falso-vazio do `TenantLayout` consumindo `loading` e expondo
   erro com retry.
9. Gatilhos de automação além de `advance_minutes`: falta, retorno,
   aniversário, paciente inativo, pós-consulta.
10. Papéis `attendant` e `professional` do enum `company_role`, hoje ignorados:
    o médico enxerga a clínica inteira.
11. Ligar o botão "Enviar lembrete" da coluna Precisa de ação. Dispara
    mensagem real para paciente, então precisa de confirmação antes de enviar.
12. Rede de segurança mínima: CI com `npm ci && npm run build`, ESLint com
    `no-unused-vars` e um smoke test de rota. As regressões desta semana são
    exatamente o que isso teria pego.
13. Nome do produto. "Consulta Pro" já tem dono no mercado, assim como
    "Por Perto" e "Pro Saúde". Mantido por ora; validar domínio e INPI depois.
    Trocar mexe em repo, Render, `package.json`, landing e instância Evolution.

## 9. Regra que falhou e precisa valer

`AGENTS.md` já dizia "Nunca declare uma validação que não foi executada". A
documentação anterior declarou dezenas. Daqui para frente: nenhuma seção de
estado afirma algo que não tenha saída de comando ou teste correspondente.
