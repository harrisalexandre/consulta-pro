# Consulta Pro — Decisões

## Multi-tenant por empresa
Empresa é o tenant principal do SaaS. Dados operacionais são associados por `company_id`.

## Segurança backend-first
RLS e validação server-side são a fonte definitiva de autorização. UI apenas melhora experiência.

## Auth privilegiado via Edge Function
Operações administrativas de Auth não usam service role no browser.

## Evolution API como provider WhatsApp
O Consulta Pro usa Evolution API como transporte WhatsApp. A infraestrutura é separada do Karate ERP e não compartilha credenciais ou instâncias.

## Webhook como fonte de estado
Mudanças de conexão devem ser recebidas por `CONNECTION_UPDATE` via webhook e refletidas no estado persistido do tenant. O frontend não deve depender exclusivamente de polling para detectar desconexões.

## Estados de carregamento
Erro de backend não pode virar vazio falso. Componentes críticos distinguem loading, erro e vazio. A resolução de sessão e tenant deve ocorrer antes de exibir estados finais, evitando flashes de “nenhuma empresa”.

## UX de integração
Detalhes internos como provider, Redis, endpoints, timeout e códigos técnicos não pertencem à interface do usuário. A UI apresenta somente estados e ações compreensíveis para o negócio.

## SPA com rewrite
Render deve encaminhar rotas desconhecidas da SPA para `index.html`.

## Código/schema como fonte da verdade
Documentação não pode inventar contratos. Antes de alterar banco ou integração, inspecionar a implementação atual.

## Etapas fechadas
Uma etapa relevante só é concluída após implementação, documentação pertinente, validação e commit.

## Escopo controlado
Investigar dependências e regressões relacionadas, mas não fazer refactors ou features não solicitadas sem necessidade.
