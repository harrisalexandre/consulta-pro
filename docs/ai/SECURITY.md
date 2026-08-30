# Consulta Pro — Segurança

## Modelo de ameaça

O browser é cliente não confiável. Tudo que chega ao frontend pode ser observado ou manipulado.

```
Browser
  → JWT / identidade
  → Supabase API / Edge Function
  → RLS / validação server-side
  → PostgreSQL
```

## Regras obrigatórias
- Nunca colocar `service_role` no frontend.
- Nunca colocar senhas de integração no bundle.
- URL Supabase e chave pública não são segredos.
- Esconder menu, botão ou rota não é autorização.
- Filtros enviados pelo frontend não são isolamento de tenant.
- Toda operação sensível deve ser validada no backend.
- RLS é obrigatório para isolamento de dados por empresa.
- Edge Functions devem validar identidade e autorização antes de executar operações privilegiadas.

## Auth
- Login via Supabase Auth.
- Sessão persistente.
- Rotas protegidas no frontend melhoram UX, mas não substituem backend.
- Criação/reset de usuários administrativos deve ocorrer em Edge Function privilegiada.

## Tenant isolation
Toda consulta e mutação sensível deve respeitar a empresa autorizada no JWT/sessão e nas policies.

Um usuário malicioso não deve conseguir:
- trocar `company_id` no payload e acessar outro tenant;
- ler pacientes de outra empresa;
- alterar profissionais de outra empresa;
- consultar agenda de outra empresa;
- ler histórico de WhatsApp de outra empresa;
- operar automações de outro tenant.

## Segredos
Segredos devem permanecer em:
- secrets do Supabase Edge Functions;
- variáveis protegidas de CI/deploy;
- nunca em arquivos versionados ou variáveis `VITE_*` que sejam realmente secretas.

## Validação
Mudanças de Auth, RLS, RPC ou Edge Function exigem revisão de autorização e teste de isolamento, não apenas build.
