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
