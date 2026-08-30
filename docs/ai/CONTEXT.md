# Consulta Pro — Contexto

Consulta Pro é um SaaS multi-tenant para gestão de consultórios e clínicas.

## Usuários
- Superadmin da plataforma.
- Owner da empresa.
- Admin da empresa.
- Profissionais e demais usuários conforme permissões que forem implementadas.

## Produto
O sistema centraliza:
- empresas/consultórios;
- usuários e acessos;
- dashboard operacional;
- pacientes;
- profissionais;
- agenda;
- WhatsApp;
- templates de mensagens;
- automações;
- configurações.

## Plataforma
- React + TypeScript + Vite.
- React Router.
- Supabase Auth.
- PostgreSQL + RLS.
- Edge Functions para operações privilegiadas.
- Deploy web no Render.
- SPA com rewrite para `/index.html`.

## Tenant
Empresa é o tenant. Dados operacionais são associados à empresa por `company_id`.

## Rotas principais
Públicas:
- `/` landing;
- `/login`.

Superadmin:
- `/admin/dashboard`;
- `/admin/empresas`;
- `/admin/empresas/nova`;
- `/admin/empresas/:id`;
- `/admin/usuarios`;
- `/admin/permissoes`;
- `/admin/whatsapp`;
- `/admin/mensagens`;
- `/admin/automacoes`;
- `/admin/atividade`;
- `/admin/configuracoes`.

Empresa:
- `/dashboard`;
- `/agenda`;
- `/pacientes`;
- `/profissionais`;
- `/whatsapp`;
- `/automacoes`;
- `/configuracoes`.

## Regra de estado
O código e o schema Supabase atuais são a fonte da verdade para detalhes verificáveis. Esta documentação registra contexto e decisões, não substitui a implementação.
