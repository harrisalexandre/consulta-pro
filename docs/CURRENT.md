# CURRENT — Consulta Pro

## Onde estamos
**Etapa 8/13 — Integrações, automações e WhatsApp**  
**Status: build TypeScript validado estaticamente; validação E2E pendente**

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
- `main` avançou para `f4404f5349c2736c1b397858fe55a88ed1a472fe` com atualização da documentação.

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
- Nenhuma alteração de código foi necessária neste ciclo.
- `docs/CURRENT.md` atualizado para registrar a validação e as limitações reais do ambiente.

### Próximo passo
Executar `npm run build` em ambiente com rede/dependências disponíveis ou aguardar o novo deploy no Render. Se o build ficar verde, iniciar a auditoria funcional completa e o teste ponta a ponta. Não considerar a Etapa 8 concluída antes da validação real de WhatsApp/WAHA e automações.

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
