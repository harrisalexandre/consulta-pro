# Consulta Pro — Decisões

## Multi-tenant por empresa
Empresa é o tenant principal do SaaS. Dados operacionais são associados por `company_id`.

## Segurança backend-first
RLS e validação server-side são a fonte definitiva de autorização. UI apenas melhora experiência.

## Auth privilegiado via Edge Function
Criação, edição e reset de usuários que exigem privilégio administrativo não devem usar service role no browser.

## SPA com rewrite
Render deve encaminhar rotas desconhecidas da SPA para `index.html`, evitando 404 em acesso direto a rotas React.

## Código/schema como fonte da verdade
Documentação não pode inventar contratos. Antes de alterar banco ou integração, inspecionar a implementação atual.

## Estados de carregamento
Erro de backend não pode virar vazio falso. Componentes críticos distinguem loading, erro e vazio.

## Etapas fechadas
Uma etapa relevante só é concluída após implementação, documentação pertinente, validação e commit.

## Escopo controlado
Investigar dependências e regressões relacionadas, mas não fazer refactors ou features não solicitadas sem necessidade.
