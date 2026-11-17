# Consulta Pro — Estado atual

**Atualizado em:** 17/11/2026
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

Além disso, a conta Supabase conectada na auditoria **não contém nenhum projeto
do Consulta Pro** — o único projeto existente é de outro produto. O backend está
em outra conta/organização, ou não existe mais. **Isto precisa ser confirmado
antes de qualquer afirmação sobre RLS, cron, automações ou WhatsApp.**

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

1. **Confirmar onde vive o projeto Supabase do Consulta Pro.** Sem isso, nada
   abaixo pode ser testado.
2. **Versionar `supabase/`** — migrations + as Edge Functions. Maior risco aberto.
3. Validar o build no Render com o commit atual e abrir `/` e `/login`.
4. Conferir o vínculo em `company_users` para o usuário de teste (bug conhecido
   "Nenhuma empresa vinculada").
5. Corrigir o falso-vazio do `TenantLayout` consumindo `loading` e expondo erro
   com retry.
6. Configurar `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` e validar QR/conexão.
7. Exercitar CRUD real: paciente → profissional → agendamento → template →
   automação → dispatch → histórico.
8. Rede de segurança mínima: CI com `npm ci && npm run build`, ESLint com
   `no-unused-vars`, e um smoke test de rota. Os itens 1-5 da seção 5 são
   exatamente o tipo de regressão que isso teria pego.
9. Auditoria de RLS e isolamento entre tenants, com o projeto correto em mãos.

## 9. Regra que falhou e precisa valer

`AGENTS.md` já dizia "Nunca declare uma validação que não foi executada". A
documentação anterior declarou dezenas. Daqui para frente: nenhuma seção de
estado afirma algo que não tenha saída de comando ou teste correspondente.
