# CURRENT — Consulta Pro

## Onde estamos
**Etapa 8/13 — Integrações, automações e WhatsApp**  
**Status: build em correção; Render identificou erro JSX no App.tsx**

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

### Último bloqueio de build
O Render clonou o commit `920690a4816f8c8f2a6d09f4f7c2f7e4d1b8d7a2` informado no log, mas o build falhou em `src/App.tsx` com erros de sintaxe JSX:
- `TS1381 Unexpected token`
- `TS1382 Unexpected token`
- `TS17002 Expected corresponding JSX closing tag for TenantProvider`
- `TS1005 '}' expected`

### Causa identificada
A composição de `TenantProvider` dentro da árvore de rotas foi escrita com JSX inválido. O fechamento da tag do provider estava incorreto.

### Correção atual
- Reescrito o trecho final de `src/App.tsx` com JSX válido.
- A rota pública `/` continua renderizando `Landing` sem depender de Auth/Tenant.
- `/login` continua pública.
- Rotas autenticadas passam por `SessionGate`, `TenantProvider`, `RoleGate` e seus layouts.
- `TenantProvider` recebe explicitamente `<Outlet />` como filho.
- O login navega diretamente para `/dashboard` após sucesso.
- Commit: `c82f9dcb73c2f55ddbef6e6f5ad7d0b9d378e832`.

### Auditoria fina
- A versão anterior tinha um problema real de JSX que impedia qualquer build, portanto as correções de runtime não podiam ser validadas pelo Render.
- A árvore atual ainda não declara as rotas operacionais `/dashboard`, `/agenda`, `/pacientes`, `/profissionais`, `/whatsapp`, `/automacoes` e `/configuracoes`; não criar novas telas neste bloco.
- `public/_redirects` não configura rewrite do Render; o serviço deve ter o rewrite SPA configurado no próprio Render.
- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são obrigatórias para autenticação; não inventar valores.

### Próximo passo obrigatório
1. Aguardar o Render construir o commit `c82f9dcb73c2f55ddbef6e6f5ad7d0b9d378e832`.
2. Confirmar `npm run build` verde.
3. Abrir `/` e confirmar landing.
4. Abrir `/login` e confirmar login.
5. Só então continuar a auditoria funcional.

### Pendência WAHA
Ainda dependem de configuração real no ambiente:
- `WAHA_URL`
- `WAHA_API_KEY`

Sem essas secrets, não concluir o teste real de QR/conexão/envio.

### Regra
Não considerar Etapa 8 concluída apenas porque o build passa; validar o fluxo real ponta a ponta.

### Build Render — 30/08/2026
- O Render clonou corretamente o commit `920690a4816f...` da branch `main`, portanto o deploy está acompanhando o repositório.
- O build falhou por `TS18047: 'supabase' is possibly 'null'` em `src/App.tsx`, dentro do `RoleGate`.
- Corrigido com narrowing local (`const client=supabase`) antes de `auth.getUser()`.
- Commit da correção: `63e147ae7f2eb6a4e803fa91c9a8a9d59fc97eac`.
- **Próximo:** aguardar novo build do Render. Não avançar para auditoria funcional até `tsc -b && vite build` ficar verde.


### Build Render — correção complementar
- O erro `TS18047` persistiu porque o narrowing anterior cobria `auth.getUser()`, mas a consulta seguinte ainda usava o `supabase` nullable diretamente em `from('profiles')`.
- Corrigido para usar o cliente já narrowed (`client.from(...)`).
- Commit: `56200eded3acf904f2207633211714d0331b00f1`.
- **Próximo:** aguardar novo build do Render e continuar corrigindo somente erros reais reportados pelo `tsc`.
