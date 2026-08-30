# AGENTS.md — Consulta Pro

## Antes de trabalhar
1. Leia `docs/ai/CONTEXT.md` e `docs/ai/CURRENT_STATE.md`.
2. Consulte `docs/ai/BUSINESS_RULES.md` ao tocar comportamento funcional.
3. Consulte `docs/ai/ARCHITECTURE.md` ao tocar Supabase, Edge Functions, integração ou estrutura de dados.
4. Consulte `docs/ai/SECURITY.md` ao tocar Auth, RLS, tenant, permissões ou dados privados.
5. Consulte `docs/ai/DECISIONS.md` antes de modificar padrões existentes.
6. Inspecione código e schema atuais antes de inventar contratos.

## Regra de execução
- Pedido → intenção → dependências → correlatos → regressões → validação.
- Antes de criar uma tela/rota, verifique se ela já existe.
- Uma tela só é considerada pronta quando UI, ação, persistência, feedback, refresh, autorização e tenant estiverem conectados.
- Estados loading, erro e vazio real devem ser distintos.
- Não invente tabelas, colunas, RPCs, Edge Functions ou regras.
- Não faça refactors oportunistas.
- Segurança é backend-first: UI não substitui RLS ou validação server-side.
- Cada etapa relevante fecha com implementação + documentação afetada + validação + um commit.

## Multi-tenant
`company_id` é o contexto do tenant. O frontend pode selecionar o tenant ativo, mas o isolamento real pertence ao Supabase/RLS.

## Validação
Execute pelo menos `npm run build` após alterações TypeScript/React. Para mudanças de backend, Auth ou RLS, valide também o fluxo funcional aplicável.

## Comunicação
Use:
- Etapa X/Y
- Ação
- Alterações
- Validação
- Resultado
- Próximo
- Pendência

Nunca declare uma validação que não foi executada.
