# CURRENT — Consulta Pro

## Onde estamos
**Etapa 8/13 — Integrações, automações e WhatsApp**  
**Status: em andamento / build em correção**

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
- Auditoria funcional ponta a ponta aprovada como próximo bloco.

### Situação atual
O deploy no Render ainda não está verde.

Último erro:
`src/App.tsx(20,239): TS18047: 'client' is possibly 'null'`

Correção aplicada no commit:
`a8bab0a3cb119b18a9715bb6e054c15ac37b0e7b`

Foi adicionado narrowing explícito dentro de `load()`.

**Próxima ação imediata:** executar novo build/deploy no Render. Se houver novo erro, corrigir a causa e repetir até o build passar.

### Pendência WAHA
Ainda dependem de configuração real no ambiente:
- `WAHA_URL`
- `WAHA_API_KEY`

Sem essas secrets, não concluir o teste real de QR/conexão/envio.

### Depois do build verde
Executar auditoria aprovada:
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
