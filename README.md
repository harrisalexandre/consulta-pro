# Consulta Pro

SaaS multi-tenant para gestão de consultórios e clínicas.

## Stack
- React + TypeScript + Vite
- Supabase Auth + PostgreSQL + RLS
- Supabase Edge Functions
- Render
- Evolution API para WhatsApp
- Redis/Valkey na infraestrutura da Evolution

## Arquitetura
- Tenant = empresa (`companies`)
- `company_users` vincula usuários aos tenants
- Dados operacionais usam `company_id`
- RLS é a barreira definitiva de isolamento entre tenants
- Operações privilegiadas ficam nas Edge Functions
- O frontend nunca recebe secrets de integração
- WhatsApp pertence à empresa e usa instância Evolution isolada por tenant

## Módulos
- Dashboard
- Pacientes
- Profissionais
- Agenda
- WhatsApp
- Templates
- Automações
- Configurações
- Administração/Superadmin

### Agenda
A Agenda possui visões Dia, Semana, Mês e Lista. A visão Mês é a entrada principal e mostra os atendimentos diretamente no calendário. Dia e Semana posicionam os eventos pelo horário e duração. Há filtros por paciente, profissional, status e tipo, além de criação/edição/confirmação/cancelamento de atendimentos.

### WhatsApp
A integração usa Evolution API. O fluxo é:
1. Frontend chama `manage-evolution-session`.
2. Edge Function autentica o usuário e resolve o tenant.
3. Edge Function conversa com a Evolution API usando `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`.
4. Evolution retorna estado/QR.
5. `receive-evolution-webhook` recebe `CONNECTION_UPDATE` e atualiza o estado da conexão.
6. O frontend consulta o estado/QR durante a conexão.

O usuário não precisa conhecer Evolution, Redis, endpoints ou detalhes internos. A interface deve apresentar apenas estados e ações de negócio: conectar, escanear QR, conectado, número conectado e desconectar.

A Evolution usada pelo Consulta Pro é infraestrutura separada do Karate ERP; URL, API key e instâncias não são compartilhadas.

### Automações
Automações são associadas ao tenant e podem definir gatilho, antecedência, canal, template e ativação. `automation_dispatches` controla execução, estados e deduplicação por empresa + automação + agendamento + destinatário.

## Segurança
- Nunca usar `service_role` no frontend.
- Nunca colocar `EVOLUTION_API_KEY` em `VITE_*`.
- RLS e validação server-side são a fonte definitiva de autorização.
- Erros internos de infraestrutura não devem ser expostos ao usuário final.

## Variáveis

### Frontend
```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Secrets das Edge Functions
```text
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
```

A API da Evolution é acessada exclusivamente pelas Edge Functions.

## Deploy Render
Build:
```text
npm install && npm run build
```

Publish directory: `dist`

SPA Rewrite:
```text
/* -> /index.html
```

A aplicação precisa publicar a porta configurada pelo serviço; o backend Evolution expõe HTTP na porta 8080 quando executado no Render.

## Desenvolvimento
```text
npm install
npm run dev
npm run build
```

## Gestão de acesso das empresas
- O superadmin cria a empresa em **Administração > Empresas > Nova empresa**.
- Em **Acesso da empresa**, pode criar o primeiro login com nome, e-mail, senha e perfil Owner/Admin.
- A criação privilegiada é feita pela Edge Function `superadmin-create-company-user`.
- O login da empresa é feito pela rota `/login`.

## Estado funcional atual
- Auth e sessão persistente.
- Multi-tenant e RBAC.
- Dashboard do consultório.
- CRUD de pacientes e profissionais.
- Histórico de pacientes/profissionais.
- Agenda operacional.
- WhatsApp com conexão Evolution, QR, status e webhook.
- Templates de mensagens.
- Automações por tenant.
- Configurações da empresa e conta.
- Loading inicial unificado para evitar flash de estados intermediários.

## Regra de desenvolvimento
Uma funcionalidade só é considerada pronta quando funciona de ponta a ponta: UI → ação → validação → persistência → feedback → refresh → autorização → isolamento do tenant.

Antes de criar uma tela ou rota, verificar se ela já existe. Todos os botões devem executar ações reais ou indicar explicitamente uma funcionalidade ainda indisponível.
