# WhatsApp (Evolution API) — operação e teste

## Onde roda
- Serviço Render: `consulta-pro-evolution` (Docker, build do repo oficial `evolution-foundation/evolution-api`, branch `main`).
- URL: https://consulta-pro-evolution.onrender.com
- Painel (manager): https://consulta-pro-evolution.onrender.com/manager
- Banco da Evolution: Render Postgres `consulta-pro-evolution-db` (plano Free, **expira em 17/12/2026** — fazer upgrade ou recriar antes; ao recriar, atualizar `DATABASE_CONNECTION_URI` no serviço com a *Internal Database URL*).
- Cache: Render Key Value `consulta-pro-evolution-redis`.

## Chave da API
- Render → serviço `consulta-pro-evolution` → **Environment** → `AUTHENTICATION_API_KEY` (ícone de olho).
- No Supabase a mesma chave fica no secret `EVOLUTION_API_KEY` (junto com `EVOLUTION_API_URL`). As duas precisam ser iguais.
- Nunca colar a chave em commits, docs ou chats.

## Teste isolado (sem o app)
Serve para saber se o problema é da Evolution/WhatsApp ou do nosso fluxo.
1. Abrir o manager, colar a `AUTHENTICATION_API_KEY` e entrar.
2. **Instance +** → nome `teste` → canal **Baileys** → salvar.
3. Abrir a instância → **Get QR Code** → escanear no celular (WhatsApp → Aparelhos conectados) na hora.
4. Conectou → Evolution ok; o problema está no app/Edge Function. Recusou → problema na Evolution/WhatsApp.
5. Apagar a instância `teste` depois (cada número só pode estar numa instância).

Alternativa via Bruno/Postman: `GET {URL}/instance/connect/{instancia}` com header `apikey: <AUTHENTICATION_API_KEY>`; o campo `base64` é a imagem do QR.

## Saúde rápida
`GET https://consulta-pro-evolution.onrender.com/` deve responder `"Welcome to the Evolution API, it is working!"`. Sem resposta → ver logs do serviço no Render (ex.: `P1001` = banco fora do ar).

## Pontos aprendidos (17/11/2026)
- Não fixar `CONFIG_SESSION_PHONE_VERSION`; deixar a Evolution usar a versão padrão.
- `/webhook/set` na v2 exige o corpo `{ webhook: { ... } }`.
- O webhook precisa enviar header `apikey`, senão `receive-evolution-webhook` responde 401.
- Não chamar `/instance/connect` enquanto o pareamento conclui (estado `close` logo após o scan) — derruba a conexão e o celular mostra "não é possível conectar novos dispositivos".
- Edge Functions não são publicadas por commit; precisam de deploy no Supabase.
- Números de pacientes são salvos sem DDI; o envio adiciona `55` quando o número tem 10 ou 11 dígitos.
