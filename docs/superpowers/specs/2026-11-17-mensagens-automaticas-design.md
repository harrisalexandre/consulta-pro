# Mensagens automáticas — design aprovado (17/11/2026)

Referência visual (aprovada): canvas https://claude.ai/artifact/7T3rPwZ41NXmQpqmshYPng — linha "Mensagens automáticas — proposta v2", telas 1 a 8 (`project/Automacoes*.dc.html`, exceto `Automacoes.dc.html`, que é a versão antiga).

## Por quê
O usuário final não é de tecnologia. Medos principais: sistema parar sem ninguém saber, disparo em massa/pessoa errada, mensagem quebrada ("Olá {cliente}"), automação que não roda. Tudo tem que ser intuitivo e cada problema tem que dizer **como resolver, ali mesmo**.

## Regras de produto (não negociáveis)
- Nenhuma chave técnica na UI (`{{nome}}`, nomes de API, erros crus). Campos aparecem como etiquetas: "Nome do paciente", "Data", "Hora", "Dia da semana", "Profissional", "Nome do consultório", "Endereço do consultório".
- Mensagem com campo não preenchível **não sai**: vira item em "Mensagens que não saíram" com ação de correção.
- Toda mensagem automática passa por uma fila visível; o usuário pode "Não enviar esta" até o horário de envio (e desfazer).
- Janela de envio por empresa (padrão 08:00–20:00, seg–sex), fora dela: adiar para o próximo horário (padrão) ou não enviar.
- Máximo 1 mensagem automática por paciente a cada N horas (padrão 2h).
- Paciente que responder SAIR (ou PARAR) não recebe mais automações.
- Números BR sem DDI recebem `55` no envio (já implementado).
- Segurança backend-first: RLS por `company_id`; regras de janela/limite/opt-out aplicadas no servidor, não na UI.

## Situações (tipo de automação)
| Tela | `automations.type` | Gatilho | `advance_minutes` |
|---|---|---|---|
| Avisar quando agendar | `appointment_confirmation` | consulta criada | ignorado (imediato) |
| Lembrar antes | `appointment_reminder` | `starts_at - offset` | minutos antes |
| Avisar se cancelar | `appointment_cancelled` | status → cancelled | ignorado |
| Avisar se remarcar | `appointment_rescheduled` | `starts_at` alterado | ignorado |
| Agradecer / Pedir avaliação | `appointment_followup` | status completed, `ends_at + offset` | minutos depois |
| Chamar quem faltou | `appointment_no_show` | status no_show, `ends_at + offset` | minutos depois |
| Aniversário | `birthday` | `birth_date` = hoje (fuso da empresa) | minutos após 00:00 (540 = 09:00) |
| Chamar para retorno | `patient_recall` | última consulta realizada há N dias, sem consulta futura | N dias × 1440 |

Filtro opcional por profissionais: `automations.professional_ids uuid[]` (null = todos). Lembretes ignoram consultas canceladas.

## Dados novos (proposta; o implementador confere o schema atual antes)
- `automations.professional_ids uuid[]`.
- `messaging_settings` (1 por empresa): janela início/fim, dias da semana, política fora da janela (`defer|skip`), intervalo mínimo por paciente (min), respeitar SAIR.
- `patients.whatsapp_opt_out_at timestamptz`.
- `automation_dispatches`: estados para "segurada pelo usuário" e "precisa de ação" com motivo legível em pt-BR + código; desfazer = voltar para pendente.
- Variável `endereco` = endereço montado de `companies` (street, number, neighborhood, city).

## Backend
- Enfileiramento para todos os tipos acima (pg_cron + triggers nas mudanças de status/horário), idempotente (`automation_id, appointment_id` / paciente+data para aniversário e retorno).
- Dispatcher aplica janela, intervalo, opt-out, renderização; falha vira "precisa de ação" com motivo claro.
- Edge Function de **teste**: envia a mensagem renderizada com um paciente de exemplo para um número informado (owner/admin), sem afetar pacientes, registrando no histórico como teste.
- RPC de **alcance**: quem receberia uma automação nos próximos 7 dias (e quem não, por falta de WhatsApp).
- RPC de **saúde**: conectado?, último envio, pendentes, precisando de ação.
- **Keepalive** a cada 10 min (pg_cron → Edge Function) consultando o estado da instância na Evolution e atualizando `whatsapp_integrations`.
- Webhook: resposta SAIR/PARAR marca opt-out.

## Fora deste escopo
- Alerta no celular pessoal quando o WhatsApp cai (o canal de aviso está em aberto: o próprio WhatsApp pode estar fora). A tela 7 mostra o toggle; implementar só o aviso in-app por enquanto.
- Confirmação automática da consulta pela resposta SIM.
