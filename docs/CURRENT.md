# CURRENT — Consulta Pro

## Onde estamos
**Etapa 8/13 — Integrações, automações e WhatsApp**  
**Status: auditoria fina em andamento; código atual corrigido, Render ainda serve versão incompatível**

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
- Correção de narrowing nullable do Supabase no `SessionGate` no commit `a8bab0a3cb119b18a9715bb6e054c15ac37b0e7b`.
- `main` está atualmente em `5b5b84a3246f9cc065ca54228465b45d2a61aa14`.

### Situação atual
- `src/App.tsx` no `main` contém o narrowing explícito de `client` dentro de `SessionGate`, eliminando a causa conhecida de `TS18047: 'client' is possibly 'null'`.
- `package.json` mantém `npm run build` como `tsc -b && vite build`.
- A integração GitHub não expôs runs de GitHub Actions para o commit atual, e o status combinado do commit anterior retornou 403.
- Tentativa de clone local para executar `npm run build` falhou por indisponibilidade de DNS/rede no ambiente de execução, não por erro do projeto.
- Portanto, o build foi verificado por inspeção do código/configuração, mas **não foi executado localmente neste ciclo**.

### Problemas encontrados
- Não há erro TypeScript adicional identificado por inspeção estática do `App.tsx` atual.
- Não foi possível obter prova de build do Render/CI por falta de acesso aos runs.
- A API Supabase não pôde ser consultada porque o identificador de projeto exigido pela ferramenta não está disponível neste contexto.

### Correções
- Corrigido o travamento em “Carregando acesso...” no `SessionGate`.
- Causa: `onAuthStateChange` chamava `getSession()` dentro do próprio callback, criando potencial deadlock no fluxo de autenticação.
- O callback agora usa diretamente a sessão recebida pelo evento; `getSession()` fica apenas na inicialização.
- Commit: `9016c93f8bc559e9e1935e8328c343a6f4bd6264`.
- `docs/CURRENT.md` atualizado para registrar a validação e as limitações reais do ambiente.

### Próximo passo
Aguardar/validar o novo deploy no Render e recarregar `https://consulta-pro.onrender.com/`. Se o acesso avançar, executar `npm run build`/validação do deploy e então iniciar a auditoria funcional completa. Se o build ficar verde, iniciar a auditoria funcional completa e o teste ponta a ponta. Não considerar a Etapa 8 concluída antes da validação real de WhatsApp/WAHA e automações.

### Pendência WAHA
Ainda dependem de configuração real no ambiente:
- `WAHA_URL`
- `WAHA_API_KEY`

Sem essas secrets, não concluir o teste real de QR/conexão/envio.

### Auditoria pós-build
1. Rotas e navegação.
2. Login/sessão persistente.
3. Tenant/RLS/permissões.
4. Dashboard.
5. Agenda.
6. Pacientes.
7. Profissionais.
8. Usuários da empresa.
9. Templates.
10. Automações.
11. WhatsApp/WAHA.
12. Timezone.
13. Dispatch/retry.
14. Histórico/logs.
15. UI/UX/responsividade.
16. Persistência.

### Teste ponta a ponta
Login → profissional → paciente → WhatsApp → template → automação → agendamento → dispatch → WAHA → mensagem → histórico.

Não considerar a etapa concluída apenas porque compila; validar o fluxo real.

### Correção — TenantProvider
- Identificado outro uso inseguro do Supabase Auth: `onAuthStateChange` chamava `refresh()` diretamente, e `refresh()` executa `auth.getUser()`.
- Isso pode bloquear a autenticação e explicar a tela presa em “Carregando acesso...”.
- Corrigido usando `setTimeout(..., 0)` para executar `refresh()` fora do callback do Auth.
- Commit: `7302626fdd522dfe3f9b3a887306aa51823e53d1`.
- **Próximo:** validar o novo deploy do Render em `/` e `/login`.


### Correção — isolamento da landing e RoleGate
- A landing pública estava no mesmo bootstrap do TenantProvider, que inicializa Supabase/Auth mesmo para `/`.
- O TenantProvider foi removido do bootstrap global e passou a envolver somente as rotas autenticadas.
- O RoleGate agora trata erros e possui timeout de 8s, evitando ficar indefinidamente em “Carregando acesso...”.
- Commits: `3f61f84b031d78ddd1a289fb8fa194456104865d` e `b63d7e741b7f065d13a5e2ab18c505ba3f49fe62`.
- **Próximo:** validar o novo deploy do Render abrindo `/` diretamente. A landing não depende mais do Supabase para montar.


### Auditoria fina — 30/08/2026
- O código atual da rota `/` é público e retorna `<Landing/>` diretamente, antes de `SessionGate`, `RoleGate`, `TenantProvider` ou qualquer chamada Supabase.
- Portanto, se `/` continua exibindo **“Carregando acesso...”**, o navegador/Render não está executando o bundle correspondente ao `main` atual. Essa tela existe somente em `RoleGate`, que não participa da rota pública atual.
- Auditoria encontrou um segundo problema estrutural: `TenantProvider` estava sendo usado como `Route element` sem renderizar `<Outlet/>`; corrigido no commit `5b5b84a3246f9cc065ca54228465b45d2a61aa14`.
- A árvore atual também mostra que as rotas de operação listadas na navegação (`/dashboard`, `/agenda`, `/pacientes`, `/profissionais`, `/whatsapp`, `/automacoes`, `/configuracoes`) não estão declaradas no `App.tsx` atual. Não criar telas novas nesta auditoria; registrar como lacuna funcional para o próximo bloco.
- `public/_redirects` não é configuração de rewrite do Render; o README exige rewrite `/* -> /index.html` no serviço. Isso afeta acesso direto às rotas SPA, mas não explica a tela de “Carregando acesso...” na raiz.
- Não foi possível consultar o serviço Render diretamente deste ambiente: DNS/rede externa está indisponível. A validação da versão publicada precisa ser feita no próprio serviço Render.

### Próximo passo obrigatório
1. Confirmar no Render: repositório `harrisalexandre/consulta-pro`, branch `main`, root directory correto, build `npm install && npm run build`, publish `dist` e último deploy apontando para `5b5b84a3246f9cc065ca54228465b45d2a61aa14`.
2. Se o deploy estiver em outro commit/branch, corrigir o deploy antes de qualquer nova alteração de React.
3. Se o deploy estiver exatamente nesse commit e ainda mostrar “Carregando acesso...” em `/`, investigar cache/serviço errado, porque o código atual torna esse estado impossível na rota raiz.
4. Depois disso, validar build e somente então iniciar a auditoria funcional das rotas existentes.
