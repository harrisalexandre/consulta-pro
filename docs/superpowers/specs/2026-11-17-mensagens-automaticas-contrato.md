# Mensagens automáticas — contrato backend → frontend (17/11/2026)

Base: `2026-11-17-mensagens-automaticas-design.md` + decisões do dono de 17/11.
Tudo aqui está **aplicado** no projeto Supabase `swrsjwmuqxrzgapqiacb` e versionado em
`supabase/migrations/20261117234128…20261118002127` e `supabase/functions/`.

Regra de UI (não negociável): nunca mostrar chaves (`{{nome}}`), códigos (`missing_address`),
nomes de serviço ou erro cru. Mostrar `status_reason` (pt-BR) e usar `status_reason_code` só para
decidir a ação de correção.

---

## 1. Tabelas e colunas

### `automations` (RLS: membro lê; owner/admin grava — já existia)
| coluna | tipo | observação |
|---|---|---|
| `type` | text | um de: `appointment_confirmation`, `appointment_reminder`, `appointment_cancelled`, `appointment_rescheduled`, `appointment_followup`, `appointment_no_show`, `birthday`, `patient_recall` (check constraint) |
| `advance_minutes` | int ≥ 0 | ver tabela da seção 4 |
| `professional_ids` | uuid[] null | **novo**. `null` = todos os profissionais |
| `enabled` | bool | |
| `enabled_at` | timestamptz | **novo**, mantido por trigger (não gravar). Agradecer/faltou/aniversário só consideram o que acontecer depois da última ativação |
| `message_template_id` / `message_template` | | modelo ligado tem prioridade; texto solto é fallback |

### `messaging_settings` (**nova**, 1 linha por empresa, PK `company_id`)
RLS: membro lê; owner/admin insere/atualiza. Linha criada automaticamente para toda empresa.
| coluna | tipo | padrão | observação |
|---|---|---|---|
| `send_window_start` | time | `08:00` | |
| `send_window_end` | time | `20:00` | exclusivo; precisa ser > início |
| `send_weekdays` | smallint[] | `{1,2,3,4,5}` | 0=domingo … 6=sábado |
| `outside_window_policy` | text | `defer` | `defer` (adiar) ou `skip` (não enviar) |
| `min_interval_minutes` | int | `120` | 0–10080. **Por paciente** |
| `respect_opt_out` | bool | `true` | respeitar SAIR |
| `paused` | bool | `false` | **pausa geral**: nada automático sai; fila fica pendente |
| `paused_at` | timestamptz | | trigger (não gravar) |
| `notify_on_disconnect` | bool | `false` | toggle "Avisar quando algo parar" |
| `alert_whatsapp_number` | text | null | número (com DDD) que recebe o aviso |
| `alert_last_sent_at`, `alert_outage_started_at` | timestamptz | | uso interno/leitura |

### `patients`
| coluna | observação |
|---|---|
| `whatsapp_opt_out_at` timestamptz | **novo**. Preenchido = pediu SAIR. "Voltar a receber" = gravar `null` (UPDATE normal; RLS de patients) |
| `whatsapp` / `phone` | envio usa `whatsapp`; se vazio, `phone` |

### `automation_dispatches` (fila) — **somente leitura** para o frontend
RLS: membro faz SELECT. INSERT/UPDATE/DELETE pelo cliente foram revogados; use as RPCs.
| coluna | observação |
|---|---|
| `id`, `company_id`, `automation_id` | |
| `appointment_id` | null em aniversário/retorno |
| `patient_id` | **novo**, sempre preenchido |
| `recipient_number` | número usado/planejado (pode ser null se paciente sem WhatsApp) |
| `status` | ver abaixo |
| `status_reason` | **texto pt-BR para a tela** |
| `status_reason_code` | código estável (seção 3) |
| `status_changed_at` | última mudança de status |
| `due_at` | horário pela regra (antes de janela/intervalo) |
| `scheduled_for` | **quando sai** (já ajustado pela janela) |
| `sent_at`, `held_at`, `held_by`, `attempts`, `created_at` | |
| `last_error`, `error_message`, `provider_message_id` | técnicos — **não mostrar** |

Valores de `status`:
| status | tela |
|---|---|
| `pending` | na fila (vai sair em `scheduled_for`). Pode ter `status_reason` informativo (`deferred_window`, `deferred_interval`, `whatsapp_disconnected_waiting`, `paused`) |
| `processing` | saindo agora |
| `held` | "Não enviar esta" (desfazer = `release`) |
| `sent` | enviada |
| `needs_action` | **"Mensagens que não saíram"** (precisa de ação) |
| `failed` | falhou, vai tentar de novo sozinho (`retrying`) |
| `skipped` | não saiu por regra (SAIR, fora do horário, consulta já passou…) |
| `cancelled` | saiu da fila (consulta cancelada/remarcada, automação desligada…) |

### `whatsapp_messages`
`kind` ganhou `test` (envio de teste). Valores: `manual`, `automatic`, `test`.

---

## 2. Etiqueta → variável
| Etiqueta na tela | Texto salvo |
|---|---|
| Nome do paciente | `{{nome}}` (primeiro nome) |
| Data | `{{data}}` (dd/mm/aaaa) |
| Hora | `{{hora}}` (HH:mm) |
| Dia da semana | `{{dia_semana}}` ("sexta-feira") |
| Profissional | `{{profissional}}` |
| Nome do consultório | `{{consultorio}}` |
| Endereço do consultório | `{{endereco}}` ("Rua X, 123 - Sala 2 - Bairro, Cidade/UF"; exige rua e cidade em `companies`) |

Legado aceito: `{{nome_completo}}`, `{{empresa}}`, `{{dia}}`, `{{tipo}}`.
Mensagem com campo não preenchível, chave desconhecida, `{x}` com chave simples ou resto de `{{`/`}}` **não sai**: vira `needs_action` com motivo.
Aniversário e retorno não têm consulta: Data/Hora/Dia/Profissional nelas geram `missing_appointment_fields`.

---

## 3. Códigos de motivo (`status_reason_code`) e ação sugerida
| código | status | `status_reason` | ação na tela |
|---|---|---|---|
| `missing_whatsapp` | needs_action | Paciente sem WhatsApp no cadastro | Completar cadastro do paciente → Reenviar |
| `invalid_whatsapp` | needs_action | O WhatsApp do paciente está incompleto no cadastro | idem |
| `number_not_on_whatsapp` | needs_action | Este número não tem WhatsApp… | idem |
| `missing_address` | needs_action | Falta o endereço do consultório | Configurações (endereço) → Reenviar |
| `missing_company_name` | needs_action | Falta o nome do consultório | Configurações → Reenviar |
| `missing_patient_name` | needs_action | Paciente sem nome no cadastro | Cadastro → Reenviar |
| `missing_professional` / `missing_appointment_type` | needs_action | A consulta está sem profissional / tipo | Editar consulta → Reenviar |
| `missing_appointment_fields` | needs_action | A mensagem usa dados de consulta… | Editar texto |
| `unknown_field` / `malformed_field` / `missing_field` | needs_action | campo não reconhecido / escrito errado | Editar texto |
| `template_missing` / `template_inactive` | needs_action | mensagem sem texto / modelo desativado | Editar mensagem |
| `channel_not_whatsapp` | needs_action | | Editar mensagem |
| `whatsapp_disconnected` | needs_action | O WhatsApp do consultório estava desconectado na hora do envio | Reconectar → Reenviar |
| `send_failed` | needs_action | Não conseguimos enviar depois de várias tentativas… | Reenviar |
| `retrying` | failed | Falha no envio; vamos tentar de novo automaticamente | nenhuma |
| `deferred_window` | pending | Aguardando o horário de envio | nenhuma |
| `deferred_interval` | pending | Aguardando o intervalo mínimo… | nenhuma |
| `whatsapp_disconnected_waiting` | pending | Aguardando o WhatsApp do consultório reconectar (até 2h, depois vira `whatsapp_disconnected`) | Reconectar |
| `paused` | pending | Envios automáticos pausados pelo consultório | Retomar |
| `held_by_user` | held | Marcada para não enviar | Desfazer |
| `patient_opted_out` | skipped | O paciente pediu para não receber mensagens (respondeu SAIR) | — |
| `patient_inactive` | skipped | O paciente está inativo | — |
| `outside_window` | skipped | Fora do horário de envio configurado | — |
| `outside_window_too_late` / `min_interval_too_late` | skipped | …o próximo horário seria depois da consulta | — |
| `appointment_passed` | skipped | O horário da consulta passou antes do envio | — |
| `reminder_time_passed` | skipped | A consulta foi marcada depois do horário deste lembrete | — |
| `appointment_cancelled`, `appointment_rescheduled`, `appointment_reactivated`, `appointment_status_changed`, `appointment_missing`, `patient_has_appointment`, `professional_filtered`, `automation_disabled`, `automation_deleted`, `patient_missing` | cancelled | (texto pt-BR) | — |

---

## 4. Situações (tipos)
| Tela | `type` | gatilho | `advance_minutes` |
|---|---|---|---|
| Avisar quando agendar | `appointment_confirmation` | trigger ao criar consulta futura | ignorado |
| Lembrar antes | `appointment_reminder` | `starts_at − advance` (fila criada até 7 dias antes) | minutos antes |
| Avisar se cancelar | `appointment_cancelled` | trigger status → `cancelled` (consulta futura) | ignorado |
| Avisar se remarcar | `appointment_rescheduled` | trigger `starts_at` alterado | ignorado |
| Agradecer / Pedir avaliação | `appointment_followup` | status `completed`, `ends_at + advance` | minutos depois |
| Chamar quem faltou | `appointment_no_show` | status `no_show`, `ends_at + advance` | minutos depois |
| Aniversário | `birthday` | `birth_date` = dia (fuso da empresa); 29/02 → 28/02 em ano não bissexto | minutos após 00:00 (540 = 09:00) |
| Chamar para retorno | `patient_recall` | **manual**: usuário escolhe na lista de elegíveis (seção 5) | N dias × 1440 |

Regras no servidor (não replicar na UI, só explicar):
- Lembrete nunca sai depois do início da consulta. Se o horário cai fora da janela, sai no **último horário permitido antes** (ex.: dia anterior 19:59); se esse já passou, no próximo permitido antes da consulta; senão `skipped`.
- Consulta marcada depois do horário do lembrete → `reminder_time_passed`.
- Remarcar cancela lembretes/avisos do horário antigo e cria os do novo. Cancelar tira da fila o que era da consulta. Reabrir consulta cancelada devolve à fila.
- Intervalo mínimo e SAIR são **por paciente**. SAIR vindo de número compartilhado marca o paciente da última mensagem automática enviada para esse número (sem envio anterior: único paciente com o número; vários e nenhum envio: todos).
- Paciente inativo não recebe nada. Automação desligada não envia o que estava na fila.
- WhatsApp desconectado: espera até 2h (`whatsapp_disconnected_waiting`), depois `needs_action`.

---

## 5. RPCs (`supabase.rpc(nome, params)`)
Erros: `error.message` ∈ `forbidden`, `not_found`, `invalid_status`, `invalid_type`, `automation_disabled`. Traduzir na UI.
Todas exigem usuário autenticado e membro ativo da empresa (o papel "recepção" ainda não existe; ver Pendências).

### `get_automation_reach(p_company_id uuid, p_type text, p_advance_minutes int, p_professional_ids uuid[] = null, p_days int = 7)`
Funciona antes de salvar (usa os valores do formulário). Retorna linhas:
`patient_id, patient_name, appointment_id, appointment_starts_at, professional_name, send_at, recipient_number, reach_status`
`reach_status` ∈ `will_send` | `no_whatsapp` ("sem WhatsApp") | `opted_out` | `outside_window` (política `skip`) | `too_late` (não daria para enviar antes da consulta).
Tipos por evento (`confirmation`, `cancelled`, `rescheduled`) e `patient_recall` → lista vazia (não há alcance previsível; retorno usa `get_recall_candidates`).

### `get_messaging_health(p_company_id uuid)` → 1 linha
`whatsapp_status` (`connected|disconnected|connecting|error|not_configured`), `is_connected`, `phone_number`, `last_sync_at`, `paused`, `last_sent_at`, `pending_count`, `held_count`, `needs_action_count`, `retrying_count`, `stuck_count` (pendentes atrasados >15 min), `next_send_at`, `alert_enabled`, `alert_last_sent_at`.

### `hold_automation_dispatch(p_dispatch_id uuid)` → linha de `automation_dispatches`
`pending` → `held` ("Não enviar esta"). Outro status → `invalid_status`.

### `release_automation_dispatch(p_dispatch_id uuid)` → linha
`held` → `pending` (desfazer; mantém `scheduled_for`).

### `resend_automation_dispatch(p_dispatch_id uuid)` → linha
"Reenviar" / "Enviar agora". Aceita `needs_action|failed|skipped|held|pending` → `pending` agora. O worker **revalida tudo** (consulta, paciente ativo, SAIR, janela, intervalo, pausa); se algo impedir, volta com novo motivo. Atualizar a lista ~1 min depois.

### `get_recall_candidates(p_automation_id uuid)` (só `patient_recall`)
Elegíveis: última consulta realizada há ≥ N dias, sem consulta futura, paciente ativo, filtro de profissionais.
Retorna `patient_id, patient_name, last_appointment_id, last_appointment_at, professional_name, days_since, recipient_number, has_whatsapp, opted_out, already_queued`.

### `queue_recall_messages(p_automation_id uuid, p_patient_ids uuid[])` → int
Coloca na fila os pacientes marcados (revalida elegibilidade; repetidos e já enfileirados são ignorados). Exige automação ligada (`automation_disabled`). Saem no próximo horário da janela.

---

## 6. Edge Functions

### `send-test-message` (POST, JWT do usuário, owner/admin ou superadmin; CORS `https://consulta-pro.onrender.com`)
Body: `{ company_id, to, automation_id? , body?, with_appointment? }`
- `to`: número com DDD (10–13 dígitos; DDI 55 adicionado se faltar).
- `automation_id`: usa o texto da automação (ou `body`, se enviado, para testar o texto ainda não salvo); define se há consulta (aniversário/retorno = sem consulta).
- Sem `automation_id`: `body` obrigatório; `with_appointment` (default `true`).
Exemplo usado: paciente "Maria Silva", consulta no próximo dia útil às 14:30, profissional real da empresa (respeita `professional_ids`), endereço/nome reais da empresa.
Respostas: `200 {ok:true, text, to}` · `422 {ok:false, code, reason, preview?}` (mesmos códigos da seção 3 + `invalid_number`, `number_not_on_whatsapp`) · `409 whatsapp_disconnected` · `403 forbidden` · `400 company_id_required|invalid_number` · `429 rate_limited` (20/h por empresa) · `502 send_failed`.
Não cria disparo de paciente; registra em `whatsapp_messages` com `kind='test'`.

### Internas (não chamar do frontend)
- `process-automation-dispatches` (cron 1 min), `whatsapp-keepalive` (cron 10 min: estado da instância + avisos), `receive-evolution-webhook` (SAIR/PARAR).

---

## 7. Aviso "algo parou"
Ligar: `messaging_settings.notify_on_disconnect = true` + `alert_whatsapp_number`.
O keepalive (10 min) envia por WhatsApp, **no máximo 1 por hora**, só com o WhatsApp conectado:
1. resumo ao reconectar após queda (desde quando caiu, pendentes, não saíram);
2. novas mensagens em "não saíram";
3. fila atrasada (>15 min, sem pausa).
Durante a queda **não há como avisar pelo WhatsApp** — a tela deve mostrar o estado pela RPC de saúde.

---

## 8. Pendências / decisões provisórias
- Papel **recepção**: decidido pelo dono, **não implementado**. Hoje: owner/admin configuram (`messaging_settings`, `automations`, teste); qualquer membro ativo segura/reenvia e vê alcance/saúde.
- Validação do webhook SAIR com resposta real ainda não feita (função publicada; lógica do banco validada).
- `send-test-message` não foi chamada com JWT real de owner (só recusas 401/403 validadas); validar pela tela.
- `company_local_now` continua executável por `anon` (anterior a esta etapa).
