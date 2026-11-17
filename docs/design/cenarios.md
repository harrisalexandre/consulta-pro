# Mapa de cenários do design — Consulta Pro

Revisão de 17/11/2026 do canvas https://claude.ai/artifact/7T3rPwZ41NXmQpqmshYPng (versão `1794958359-5b5a`), comparado com `docs/superpowers/specs/2026-11-17-mensagens-automaticas-design.md`, `docs/ai/BUSINESS_RULES.md`, `docs/ai/CONTEXT.md`, `docs/WHATSAPP.md` e as rotas reais de `src/App.tsx`.

Legenda: **sim** = desenhado e resolve; **parcial** = aparece mas falta estado, destino ou regra; **não** = não existe no canvas.
Nomes de telas = título do board no canvas. "Tela N" = linha "Mensagens automáticas — proposta v2".

---

## 0. Visão geral: o que o app tem e o canvas não

| Rota real (`src/App.tsx`) | No canvas? | Observação |
|---|---|---|
| `/` Landing | não | Fora do escopo da recepção; ok deixar. |
| `/login` | não | Falta login, erro de senha, "esqueci a senha", sessão expirada. |
| `/dashboard` | sim | Board "Dashboard" (versão antiga, com termos técnicos). |
| `/agenda` (Dia/Semana/Mês/Lista) | parcial | Dia, Mês e celular. **Semana e Lista não**. Formulário de atendimento e detalhe do atendimento **não**. |
| `/pacientes` | parcial | Lista + ficha somente leitura. Sem formulário de novo/editar, sem inativar. |
| `/profissionais` | parcial | Cartões. Sem formulário, sem confirmação de inativar. |
| `/whatsapp` | parcial | Board "WhatsApp" antigo (termos técnicos, modelos com `{nome}`). Fluxo de QR não desenhado. |
| `/automacoes` | sim | Telas 1–8 (proposta v2). O board "Automações" antigo contradiz a v2. |
| `/configuracoes` | não | Existe no app (dados do consultório, endereço, fuso, senha). Tela 8 tem "← Configurações", mas a tela de Configurações em si não foi desenhada. |
| `/admin/*` (superadmin) | não | 11 rotas; `admin/whatsapp` e `admin/automacoes` ainda são placeholder no app. Nenhuma desenhada. |
| Troca de empresa (TenantProvider) | parcial | Só o seletor "Clínica Santiago" no board "Agenda — Dia". Sem destino. |

Papéis reais no app: `superadmin` (plataforma), `owner` e `admin` (empresa). **Não existe papel "Recepção"**, mas o canvas mostra o usuário logado como "Recepção" (board "Agenda — Dia").

---

## 1. Tabelas por tela

### 1.1 Agenda — Dia (board `Main.dc.html`)

| Cenário | Coberto? | Onde no canvas | O que falta |
|---|---|---|---|
| Recepção abre o dia e vê quem vem | sim | Linha do tempo "Atendimentos de hoje" | — |
| Ver quem não confirmou | sim | "Precisa de ação → Sem confirmação" | — |
| Marcar novo atendimento | parcial | Botão "Novo atendimento", "+ Encaixar atendimento" | Formulário não desenhado (paciente, profissional, data, hora, duração, tipo). Falta aviso "o paciente vai receber a mensagem Avisar quando agendar" antes de salvar. |
| Remarcar | não | — | Clique no cartão do atendimento não leva a lugar nenhum. Falta detalhe do atendimento com Remarcar e aviso de que "Avisar se remarcar" vai sair e o lembrete antigo será trocado. |
| Cancelar | não | — | Falta ação + confirmação + aviso "o paciente vai receber Avisar se cancelar" + opção "cancelar sem avisar". |
| Paciente chegou / atendimento realizado | não | — | Não há botão "Chegou" nem "Realizado". Sem isso, "Agradecer", "Pedir avaliação" e "Chamar para retorno" nunca disparam (dependem de status realizado). |
| Paciente faltou | parcial | "Faltou ontem → Reagendar e avisar" | Falta como marcar a falta no dia; falta fluxo do "Reagendar e avisar"; falta desfazer falta marcada por engano (a mensagem "Chamar quem faltou" já pode estar na fila). |
| Confirmar manualmente (paciente ligou) | não | — | Chip "Aguardando" não tem ação para virar "Confirmado". |
| Enviar lembrete manual | parcial | "Enviar lembrete", "Reenviar lembrete aos 2" | Sem confirmação, sem prévia do texto, sem feedback de enviado/falhou. Não diz se respeita horário, limite e SAIR. |
| Paciente sem WhatsApp | sim | "Sem WhatsApp cadastrado → Completar cadastro" | Destino ("Completar cadastro") não desenhado. |
| Dois atendimentos no mesmo horário / mesmo profissional | não | — | Conflito de horário (regra Agenda 4) não tem estado visual nem bloqueio. |
| Dia sem nenhum atendimento | não | — | Vazio real com ação ("Marcar atendimento"). |
| Empresa nova sem profissionais | não | — | "Novo atendimento" precisa explicar "cadastre um profissional primeiro" com botão. |
| Carregando / erro ao carregar | não | — | Falta estado de carregamento e erro com "Tentar de novo" (regra UX 1: erro não pode parecer agenda vazia). |
| WhatsApp desconectado | parcial | Ponto verde no menu e "WhatsApp conectado" na faixa | Só o estado bom foi desenhado. Falta faixa vermelha "Mensagens paradas" com ação. |
| Navegar dias | sim | Hoje / ← / → | — |
| Visão Semana | não | Botão "Semana" | Não desenhada (existe no app). |
| Visão Lista | não | — | Existe no app, sumiu do design. Decidir se fica. |
| Filtros (profissional, status, busca) | não | — | Existem no app; sumiram do design. |
| Trocar de consultório (usuário com 2 empresas) | parcial | Seletor "Clínica Santiago" | Lista de empresas, troca e aviso de qual empresa está ativa não desenhados. |

### 1.2 Agenda — Mês (`Mes.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Ver mês inteiro em tela pequena | sim | Grade `minmax(0,1fr)` | — |
| Dia com muitos atendimentos | parcial | Mostra 2 + número total | O número só aparece com 3 ou mais e sem rótulo ("3" solto). Usar "+1 mais". |
| Dias com pendência | sim | "N sem confirmar" | Depende só de cor âmbar + texto; ok. |
| Clicar no dia | parcial | Célula é botão | Destino presumido (Dia), não indicado. |
| Feriado / consultório fechado | não | — | Não há marcação. |
| Carregando / erro / mês vazio | não | — | — |

### 1.3 Agenda — celular (`Mobile.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Ver o dia no celular | sim | Lista do dia | — |
| Menu no celular | parcial | "Abrir menu" | Menu aberto (gaveta) não desenhado. |
| Novo atendimento no celular | parcial | Botão "+" | Formulário no celular não desenhado. |
| Marcar chegou/faltou no celular | não | — | Principal uso do celular na recepção. |
| Outras telas no celular | não | — | Nenhuma tela de mensagens automáticas, pacientes ou WhatsApp tem versão celular. "Não enviar esta" e "Resolver agora" são os usos mais prováveis no celular. |
| Conectar WhatsApp pelo celular | não | — | **Se o QR aparecer no próprio celular do consultório, não dá para escaneá-lo.** Precisa de alternativa (código de pareamento por número). |

### 1.4 Dashboard (`Dashboard.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Visão rápida do dia/semana | sim | Cartões | Cartões não são clicáveis (ex.: "7 sem confirmação" deveria abrir a lista). |
| Saúde do WhatsApp | parcial | "Saúde da operação" | Usa linguagem técnica (ver seção 4). Só estado bom. |
| Faltas | parcial | "Taxa de falta" | Texto é nota de designer ("não existe automação…"), não texto de produto. Agora existe "Chamar quem faltou". |
| Faturamento | não | Bloco tracejado | É nota de análise, não tela. Fora do escopo; remover do design final. |
| Empresa nova (tudo zero) | não | — | Falta estado "Comece por aqui" (cadastrar profissional, paciente, conectar WhatsApp, endereço). |
| Carregando / erro | não | — | — |
| Sidebar inconsistente | — | — | Sem seletor de consultório e sem "Sair" (as outras telas têm). |

### 1.5 Pacientes (`Pacientes.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Buscar paciente | sim | Busca "Nome, CPF ou telefone" | Estado "nenhum resultado" não desenhado. |
| Ver quem não recebe mensagens | sim | Faixa "3 sem WhatsApp e 5 sem consentimento" | "Ver os 8" sem destino. |
| Cadastrar paciente | não | "+ Novo paciente" | Formulário, validação de telefone, duplicidade, feedback de salvo. |
| Editar paciente | parcial | "Ficha do paciente" | Ficha é somente leitura, sem Salvar. Mostra "não existe no banco" na tela. |
| Inativar paciente | não | — | Confirmação + o que acontece com consultas futuras e mensagens na fila. |
| Número inválido / fixo / estrangeiro | não | — | Validação e mensagem clara ("Esse número parece ser fixo, não recebe WhatsApp"). |
| Número que não tem WhatsApp | não | — | Diferente de "sem número": número existe mas não é WhatsApp. |
| Dois pacientes com o mesmo número (mãe e filhos) | não | — | Aviso ao cadastrar; efeito no limite "1 mensagem a cada 2h" (o 2º filho perde o lembrete) e no SAIR. |
| Paciente que respondeu SAIR | não | — | Selo "Não recebe mensagens (pediu para sair)" e ação "Voltar a receber" (só com pedido do paciente). |
| Paciente menor de idade / responsável | parcial | Campo "Responsável (menor)" tracejado | Sem regra de para quem vai a mensagem. |
| Paciente falecido | não | — | Inativar precisa parar "Parabéns no aniversário" e "Chamar para retorno". |
| Aniversário 29/02 | não | — | Definir: em ano não bissexto, enviar em 28/02. |
| Lista vazia (empresa nova) | não | — | Vazio real com "Cadastrar primeiro paciente". |
| Carregando / erro | não | — | — |
| Muitos pacientes (paginação) | não | — | 142 ativos; sem paginação desenhada. |

### 1.6 Profissionais (`Profissionais.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Ver equipe | sim | Cartões com cor | — |
| Cadastrar / editar | não | "+ Novo profissional", "Editar" | Formulário não desenhado. |
| Inativar profissional com consultas futuras | não | "Inativar" | **Sem confirmação.** Deve listar consultas futuras e mensagens na fila e perguntar o que fazer (remarcar, cancelar avisando, manter). |
| Profissional inativo filtrado em automação | não | — | Automação com "Só alguns profissionais" que inclui um inativo. |
| Ver agenda do profissional | parcial | "Ver agenda" | Agenda filtrada não desenhada. |
| Empresa sem profissionais | não | — | Vazio real com ação. |
| Carregando / erro | não | — | — |

### 1.7 WhatsApp (`WhatsApp.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Ver se está conectado | sim | "Conectado · número" | Texto técnico ("Evolution API · instância"). |
| Conectar pela primeira vez | não | — | Tela "Conectar o WhatsApp do consultório" com passo a passo e QR. |
| QR expirou / demorou | não | — | Gerar novo código, sem derrubar pareamento em andamento (ver `docs/WHATSAPP.md`). |
| Conectou um número diferente do esperado | não | — | Mostrar o número conectado e pedir confirmação. |
| Reconectar | parcial | "Reconectar" | Sem destino. |
| Desconectar | parcial | "Desconectar" | **Sem confirmação.** Desconectar para todas as mensagens automáticas da empresa. |
| Celular do consultório sem internet / desligado | não | — | Estado distinto de "desconectado". |
| Número bloqueado pelo WhatsApp | não | — | Estado e orientação. |
| Modelos de mensagem com `{nome}` | parcial | "Modelos de mensagem" | Conflita com o editor v2 (etiquetas). Decidir se esta seção some ou usa o mesmo editor. |
| Ler respostas dos pacientes | parcial | "Mensagens recentes" | Resposta "posso remarcar pra quinta?" fica perdida no histórico; sem aviso em "Precisa de ação". |
| Histórico vazio / erro | não | — | — |

### 1.8 Automações — versão antiga (`Automacoes.dc.html`)

Substituída pela proposta v2 (spec). Deve ser marcada como descartada no canvas: contradiz a v2 ("Regras", "worker", "1440 min", `no_show`, `birth_date`) e tem os termos técnicos listados na seção 4.

### 1.9 Tela 1 · Mensagens automáticas (`AutomacoesLista.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Tudo funcionando | sim | Faixa verde "Tudo funcionando" | — |
| Há mensagens que não saíram | sim | "2 mensagens não saíram → Resolver agora" | — |
| WhatsApp desconectado | não | — | Variação da faixa do topo em vermelho, com "Conectar agora". |
| WhatsApp nunca conectado (empresa nova) | não | — | Ligar mensagens antes de conectar: permitir? Faixa "Conecte o WhatsApp para as mensagens saírem". |
| Ligar uma mensagem pronta | parcial | Interruptores em "Prontas para ligar" | **Liga direto, sem mostrar quantos recebem agora.** Para "Chamar para retorno" e "Parabéns" pode virar disparo em massa no primeiro dia. Precisa de confirmação com número e prévia. |
| Desligar uma mensagem com envios na fila | não | — | Confirmar: "3 mensagens já programadas não vão sair". Desfazer. |
| Pausar tudo (emergência) | não | — | **Falta botão "Pausar todas as mensagens"** para o medo de disparo errado. |
| Ver próximas | sim | "Próximas mensagens" | — |
| Lista de próximas vazia | não | — | — |
| Escrever do zero | parcial | "+ Escrever uma do zero" | Editor (Tela 2) não tem escolha da situação/gatilho; não dá para criar uma mensagem do zero com ele. |
| Texto fixo "amanhã" na mensagem | parcial | "Lembrar 1 dia antes" | Se o usuário mudar para "2 dias antes", o texto continua dizendo "amanhã". Sugerir "Dia da semana"/"Data" ou alertar no editor. |
| Carregando / erro | não | — | — |
| Admin x owner podem ligar/desligar? | não | — | Sem regra de papel desenhada. |

### 1.10 Tela 2 · Editar mensagem (`AutomacoesEditor.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Mudar quando enviar | sim | "1. Quando enviar" + exemplo | Validação (0, negativo, 999 dias) não desenhada. |
| Horário fora da janela | sim | "Mensagens só saem entre 08:00 e 20:00 · Mudar horário" | — |
| Inserir campo do paciente | sim | Etiquetas "+ Nome do paciente" etc. | Comportamento por teclado/leitor de tela das etiquetas dentro do texto. |
| Campo sem dado (endereço) | sim | Aviso + formulário inline | — |
| Campo sem dado de um paciente específico (nome vazio, profissional sem nome) | não | — | Só o endereço da empresa foi tratado. |
| Texto vazio / muito longo | não | — | Limite e validação. |
| Filtrar por profissionais | parcial | "Só pacientes de alguns profissionais" | Seletor não desenhado. |
| Ver quem recebe | sim | "Ver quem" → Tela 6 | — |
| Prévia com dados reais | sim | "Como o paciente vai ver" | — |
| Testar | sim | → Tela 3 | — |
| Salvar bloqueado por falta de dado | sim | "Falta só o endereço…" + Salvar desabilitado | — |
| Salvar com sucesso | não | — | Feedback "Salvo. Vale para as próximas mensagens". |
| Erro ao salvar / sessão expirada no meio da edição | não | — | Não perder o texto. |
| Cancelar com alterações | não | "Cancelar" | Confirmar "Descartar alterações?". |
| Duas pessoas editando a mesma mensagem | não | — | Aviso de conflito. |
| Desligar pelo interruptor do topo | parcial | "Ligada" | Mesmo problema da Tela 1 (fila). |

### 1.11 Tela 3 · Testar no meu WhatsApp (`AutomacoesTeste.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Enviar teste para mim | sim | Janela "Enviar um teste para você" | — |
| Teste enviado | sim | "Teste enviado!" | — |
| WhatsApp desconectado na hora do teste | não | — | Erro com "Conectar agora". |
| Número digitado inválido | não | — | Validação. |
| Teste falhou | parcial | "Não chegou? Ver o que aconteceu" → Tela 5 | Tela 5 não tem nenhum item de teste desenhado. |
| Enviando (botão ocupado, clique duplo) | não | — | — |
| Teste não conta no limite do paciente | — | — | Garantir no backend; nada a desenhar. |

### 1.12 Tela 4 · Próximas mensagens (`AutomacoesFila.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Ver o que vai sair hoje/amanhã/7 dias | sim | Abas | Só "Hoje" desenhada. |
| Não enviar uma | sim | Confirmação inline | — |
| Desfazer | sim | "Desfazer" | Estado "já passou do horário, não dá mais para desfazer". |
| Ver o texto da mensagem | parcial | "Ver mensagem" | Destino não desenhado. |
| Consulta cancelada/remarcada com lembrete na fila | não | — | O item deve sumir ou aparecer como "trocado pela nova data". |
| Mensagem adiada pelo horário | não | — | Mostrar "sai às 08:00 (fora do horário)". |
| Mensagem que não vai sair pelo limite de 1 a cada 2h | não | — | Mostrar o motivo. |
| Fila vazia | não | — | — |
| Muitas mensagens (100 aniversários) | não | — | Agrupamento, "não enviar nenhuma desta mensagem". |
| Pausar tudo | não | — | Ver Tela 1. |

### 1.13 Tela 5 · Mensagens que não saíram (`AutomacoesProblemas.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Paciente sem WhatsApp | sim | Formulário inline | Validação do número; e se já passou o horário da consulta? |
| Falta endereço | sim | Formulário inline | — |
| WhatsApp ficou desconectado | sim | "Enviar os 3 agora" | **Não verifica se as consultas já passaram ou foram canceladas.** Lembrete enviado depois da consulta. |
| Número não tem WhatsApp | não | — | Motivo próprio + "Corrigir número". |
| Paciente pediu SAIR | não | — | Item informativo, sem botão de enviar. |
| Fora do horário com política "não enviar" | não | — | — |
| Teste que falhou | não | — | Destino de "Ver o que aconteceu". |
| Erro desconhecido | não | — | Texto genérico humano + "Tentar de novo" + "Falar com o suporte". |
| Nada para resolver | não | — | Vazio real ("Tudo certo, nenhuma mensagem parada"). |
| Resolvidas nos últimos 7 dias | parcial | Linha recolhida | Conteúdo não desenhado. |
| "Salvar e enviar agora" fora do horário permitido | não | — | Envia mesmo assim? Avisar. |

### 1.14 Tela 6 · Quem vai receber (`AutomacoesAlcance.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Lista real com hora | sim | Lista | — |
| Sem WhatsApp | sim | "Sem WhatsApp — não recebe · Adicionar número" | Formulário do botão não desenhado. |
| Pediu SAIR | não | — | Linha "Não recebe (pediu para sair)". |
| Fora do horário (adiada / não vai) | não | — | — |
| Bloqueado pelo limite por paciente | não | — | — |
| Ninguém vai receber | não | — | Vazio real. |
| Aniversário / retorno (sem consulta) | não | — | Texto "Consulta quinta" não serve para essas situações. |

### 1.15 Tela 7 · Status do WhatsApp (`AutomacoesStatus.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Tudo bem | sim | "Tudo funcionando" | — |
| Desconectou | sim | "O WhatsApp desconectou" + passos | — |
| Mostrar código para conectar | parcial | Botão | QR, expiração, sucesso e falha não desenhados. Alternativa sem QR para quem só tem o celular. |
| Conectado mas mensagens paradas (sistema travado) | não | — | **O medo "sistema parado sem ninguém saber"**: verificação recente falhou, última mensagem há 3h com fila cheia. |
| Sistema não verificado há muito tempo | não | — | "Última verificação há 2 horas" deve virar alerta. |
| Aviso no celular pessoal | parcial | Interruptor "Me avisar se algo parar" | Fora do escopo pela spec. Se ficar na tela, marcar "em breve" para não prometer o que não existe. |
| Aviso dentro do app em todas as telas | não | — | Faixa global quando cair. |
| Superadmin vê todas as empresas com problema | não | — | `/admin/whatsapp` é placeholder; nenhuma tela. |

### 1.16 Tela 8 · Horários das mensagens (`AutomacoesHorarios.dc.html`)

| Cenário | Coberto? | Onde | O que falta |
|---|---|---|---|
| Definir janela e dias | sim | Início/fim + dias | Validação (fim antes do início, nenhum dia marcado). |
| Fora da janela: adiar ou não enviar | sim | Rádios + exemplo | **Adiar pode fazer o lembrete chegar depois da consulta** (consulta às 07:30, janela abre às 08:00). |
| Consulta de madrugada / sábado com janela seg–sex | não | — | Lembrete de consulta de sábado adiado para segunda. |
| Limite por paciente | sim | "1 a cada 2 horas" | O que acontece com a mensagem barrada (adiada ou perdida)? Não diz. |
| Respeitar SAIR | sim | Interruptor | Desligar exige confirmação forte (risco legal). Falta onde ver quem saiu. |
| Fuso horário | não | — | A janela é no fuso da empresa (Configurações). Mostrar "horário de Brasília" e o que acontece se o fuso mudar. |
| Salvar / erro / quem pode alterar | não | — | — |

### 1.17 Telas que não existem no canvas

| Tela | Por quê importa |
|---|---|
| Login, esqueci a senha, sessão expirada | Recepção perde o trabalho se a sessão cair no meio de uma edição. |
| Novo/editar atendimento | Tudo nas automações depende de criar, remarcar e cancelar. |
| Detalhe do atendimento (chegou, realizado, faltou, cancelar, remarcar, confirmar) | Sem isso as mensagens de pós-consulta, falta e retorno nunca disparam. |
| Novo/editar paciente | Destino de "Completar cadastro", "Adicionar número", "+ Novo paciente". |
| Novo/editar profissional + inativar | Idem. |
| Configurações (consultório, endereço, fuso, conta) | Existe no app; destino de "← Configurações" da Tela 8. |
| Conectar WhatsApp (QR / código) | Onboarding e reconexão. |
| Primeira vez (empresa nova) | Ordem: profissional → paciente → endereço → WhatsApp → ligar mensagens. |
| Pacientes que pediram para sair | Ver e reativar. |
| Erro geral / sem internet / sem permissão | Estados globais. |
| Área do superadmin (`/admin/*`) | Saúde de todas as empresas. |

---

## 2. Cenários transversais (sistema como um todo)

### 2.1 Riscos que o dono teme

| Risco | Coberto? | Onde | O que falta |
|---|---|---|---|
| Disparo em massa por engano | parcial | Fila com "Não enviar esta" (Tela 4) | Botão "Pausar todas"; confirmação com número ao ligar uma mensagem; teto diário por empresa. |
| Mensagem para pessoa errada | parcial | Fila, prévia | "Avisar quando agendar" sai na hora: atendimento criado no paciente errado não dá tempo de segurar. Sugerir espera de alguns minutos. Número compartilhado entre pacientes. |
| Mensagem quebrada (campo vazio) | sim | Etiquetas, Tela 2 e 5 | Telas antigas (WhatsApp → Modelos) ainda usam `{nome}` livre. |
| Automação que não roda | parcial | "Próxima: …" em cada cartão | Mensagens que dependem de status "realizado"/"faltou" não rodam se ninguém marca o status — e não há tela para marcar. |
| Sistema parado sem ninguém saber | parcial | Tela 7, faixa na Tela 1 | Estado "conectado mas parado"; faixa global; superadmin. |

### 2.2 Bordas

| Borda | Coberto? | O que falta |
|---|---|---|
| Paciente sem WhatsApp | sim | — |
| Dois pacientes com o mesmo número | não | Regra de limite e SAIR por número ou por paciente. |
| Consulta remarcada várias vezes | não | Só a última remarcação deveria avisar? Lembretes antigos somem da fila. |
| Consulta cancelada depois do lembrete sair | parcial | "Avisar se cancelar" cobre; falta o caso de lembrete na fila (some) e de cancelar sem avisar. |
| Consulta criada no passado (registro atrasado) | não | Não enviar "Avisar quando agendar" nem "Lembrar 1 dia antes" para consulta que já passou. |
| Consulta marcada para daqui a 3h com "Lembrar 1 dia antes" | não | Pular, sem mandar "amanhã" por engano. |
| Fuso / horário de verão | não | Usar o fuso da empresa; mostrar o fuso na Tela 8. |
| Consulta de madrugada fora da janela | não | Ver Tela 8. |
| Aniversário em 29/02 | não | Enviar em 28/02 em ano não bissexto (decisão de produto simples). |
| Paciente respondeu SAIR | parcial | Lista, reativação, falso positivo ("vou sair mais cedo"). |
| Profissional desativado com consultas futuras | não | Ver 1.6. |
| Paciente inativado / falecido | não | Parar todas as mensagens. |
| Várias empresas e usuário com acesso a mais de uma | parcial | Seletor só no board Dia. Cada empresa tem seu WhatsApp, horários e mensagens; mostrar sempre o nome da empresa ativa nas telas de mensagens. |
| Atendimentos em série (10 sessões) | não | 10 "Avisar quando agendar" de uma vez; agrupar ou mandar só um. |

### 2.3 Erros e falhas

| Erro | Coberto? | O que falta |
|---|---|---|
| WhatsApp caiu | sim | Telas 5 e 7. |
| Sistema fora / erro ao carregar | não | Estado de erro com "Tentar de novo" em todas as telas. |
| Mensagem não saiu | sim | Tela 5. |
| Número inválido | não | Validação nos formulários. |
| Campo obrigatório faltando | parcial | Só endereço. |
| Sem internet | não | Faixa "Sem internet — suas alterações não foram salvas". |
| Sessão expirada | não | Voltar ao login sem perder o rascunho. |
| Permissão negada | não | Admin tentando desconectar WhatsApp ou mudar horários (se for restrito ao owner). |

### 2.4 Papéis

| Papel | Coberto? | O que falta |
|---|---|---|
| Owner | parcial | Nenhuma tela diz o que é exclusivo do owner. |
| Admin | parcial | Idem. |
| Recepção | não | Papel não existe no app; o canvas mostra "Recepção" como usuário. Ver Perguntas. |
| Superadmin (plataforma) | não | Nenhuma tela; `admin/whatsapp` e `admin/automacoes` são placeholder. |

### 2.5 Celular x computador e acessibilidade

- Só a Agenda tem versão celular. Telas 1–8, Pacientes, WhatsApp, Configurações: não.
- Contraste baixo (cálculo aproximado contra branco, mínimo AA 4,5:1 para texto pequeno):
  - "+ Encaixar atendimento" `#9aa49e` (~2,6:1) — Agenda Dia.
  - Horas da linha do tempo `#79837c` em 11px (~4:1) — Agenda Dia.
  - Texto âmbar `#b08314` / pontos de status (~3,4:1) — Agenda Dia, Pacientes ("sem WhatsApp"), Dashboard.
  - Textos de 9–10px na grade do Mês e em rótulos.
- Status só por cor: ponto verde do WhatsApp no menu (o `aria-label` está num `<span>` sem `role="img"`, o leitor de tela ignora); pontos de "Lembretes de hoje".
- Botões repetidos sem nome distinto para leitor de tela: "Enviar lembrete", "Editar", "Testar no meu WhatsApp", "Ver mensagem", "Não enviar esta" (precisam incluir o nome do paciente/da mensagem no `aria-label`).
- Células do Mês: botão sem nome acessível com data e quantidade.
- Etiquetas dentro do texto (Tela 2): definir como se navega e apaga por teclado e como o leitor de tela lê.
- Confirmação inline da Tela 4: foco precisa ir para a pergunta e voltar ao item depois.
- Celular: alvos de toque de 30–34px ("Enviar lembrete", chips) abaixo de 44px.

---

## 3. Botões sem destino desenhado

| Tela | Botão |
|---|---|
| Agenda — Dia | Seletor "Clínica Santiago"; "Semana"; "Novo atendimento"; "+ Encaixar atendimento"; cartão do atendimento (clique); "Enviar lembrete"; "Reenviar lembrete aos 2"; "Reagendar e avisar"; "Completar cadastro"; "Ver histórico de mensagens"; "Sair" |
| Agenda — Mês | Célula do dia (destino presumido); "Semana"; "Novo atendimento" |
| Agenda — celular | "Abrir menu"; "Novo atendimento" (+); "Reenviar lembrete aos 2"; "Enviar lembrete" |
| Dashboard | Cartões (não clicáveis); itens de "Saúde da operação" |
| Pacientes | "+ Novo paciente"; "Ver os 8"; linha do paciente → ficha (só leitura, sem Salvar/Inativar) |
| Profissionais | "+ Novo profissional"; "Editar"; "Ver agenda"; "Inativar" |
| WhatsApp | "Reconectar"; "Desconectar"; "+ Novo modelo"; filtro de direção |
| Tela 1 | "+ Escrever uma do zero" (editor sem escolha de situação); interruptores de "Prontas para ligar" (sem confirmação) |
| Tela 2 | Seletor "Só pacientes de alguns profissionais"; "Salvar" (sucesso/erro); "Cancelar" (descartar) |
| Tela 3 | "Ver o que aconteceu" (Tela 5 não tem item de teste) |
| Tela 4 | "Ver mensagem"; abas "Amanhã" e "Próximos 7 dias" |
| Tela 5 | "Resolvidas nos últimos 7 dias (4)" |
| Tela 6 | "Adicionar número"; "Mostrar mais 13" |
| Tela 7 | "Mostrar o código para conectar" |
| Tela 8 | "Salvar" (sucesso/erro) |

---

## 4. Linguagem técnica que escapou para a tela

| Tela | Texto |
|---|---|
| Dashboard | "Evolution API · instância consultorio"; "confirmados pelo provedor"; "o worker roda a cada minuto"; "Nenhuma tabela guarda valor, pagamento ou convênio"; "Hoje o sistema registra a falta e para por aí: não existe automação…" |
| WhatsApp | "Evolution API · instância consultorio · última checagem há 40 s"; modelos com `{nome}`, `{profissional}`, `{data}`, `{hora}`; "Falta: vocabulário de variáveis… `{paciente}` em vez de `{nome}`… chave crua"; categorias "reengajamento", "financeiro"; "O buraco maior do produto" |
| Automações (antiga) | "o worker roda a cada minuto"; "aguardando o worker"; "confirmadas pelo provedor"; "Dispara 1440 min antes"; "no_show não dispara automação"; "tabela automations só tem advance_minutes"; "O banco tem birth_date"; "campo de consentimento em patients"; "webhook"; "Regras"/"Nova regra"; `{nome}`, `{data}`, `{hora}` |
| Pacientes | "campos que existem no banco hoje, mais os que faltam"; "não existe no banco" (3×); "Os campos com borda tracejada não existem no banco" |
| Profissionais | "não existe no banco" (6×); "Não existe tabela de disponibilidade" |
| Agenda — Mês | "Texto âmbar marca dia com paciente sem confirmação" (legenda de designer) |
| Menu | "Automações" nas telas antigas x "Mensagens automáticas" nas novas — escolher um nome só ("Mensagens automáticas"). |
| Agenda | "Novo atendimento" x "consulta" nas mensagens — escolher um termo. |

Observação: telefones aparecem como "(55) 9…". 55 é o DDD de Santa Maria, mas para quem lê pode parecer o código do país. Usar exemplos com outro DDD evita confusão com a regra "adicionar 55 no envio".

---

## 5. Lista priorizada do que falta desenhar

### P1 — risco ao paciente ou ao negócio
1. **Detalhe do atendimento + formulário de novo/editar atendimento**: chegou, realizado, faltou, confirmar, cancelar (com ou sem aviso), remarcar; aviso de qual mensagem vai sair ao salvar. Sem isso "Agradecer", "Pedir avaliação", "Chamar quem faltou" e "Chamar para retorno" nunca disparam e remarcar/cancelar não têm fluxo.
2. **Pausar todas as mensagens** (botão de emergência) e **confirmação ao ligar uma mensagem** mostrando quantos recebem hoje — "Chamar para retorno" ligado pela primeira vez pode atingir todos os pacientes antigos de uma vez.
3. **Lembrete que chegaria tarde demais**: adiado pela janela para depois da consulta, consulta criada no passado, consulta marcada para daqui a poucas horas com "1 dia antes", "Enviar os 3 agora" depois da consulta. Estado "não vai sair porque a consulta já passou".
4. **Estados de erro, carregando e vazio real em todas as telas** + sem internet + sessão expirada + sem permissão. Hoje só o caminho feliz existe (viola a regra UX 1 e 2).
5. **Faixa global "Mensagens paradas"** em todas as telas e o estado "conectado mas parado" na Tela 7; tela de saúde para o superadmin (`/admin/whatsapp`).
6. **Fluxo completo de conectar o WhatsApp**: primeira vez, QR, QR expirado, número diferente, alternativa sem QR para quem só tem o celular do consultório; **confirmação em "Desconectar"**.
7. **Envio manual com confirmação e prévia** ("Enviar lembrete", "Reenviar aos 2", "Salvar e enviar agora", "Enviar os 3 agora"), deixando claro se respeita horário, limite e SAIR.
8. **Inativar profissional/paciente com consultas futuras e mensagens na fila** (confirmação + escolha do que fazer); paciente inativo/falecido não recebe aniversário nem retorno.
9. **SAIR visível**: selo no paciente, linha na Tela 6, item na Tela 5, lista "Pediram para sair" com reativação; confirmação forte para desligar "Respeitar SAIR".
10. **Uma só forma de escrever mensagens**: remover/refazer "Modelos de mensagem" (WhatsApp) e o board "Automações" antigo, que ainda usam `{nome}` livre e termos técnicos.
11. **"Avisar quando agendar" com alguns minutos de espera** (aparece na Tela 4) para dar tempo de corrigir paciente errado.
12. **Mesmo número em vários pacientes**: aviso no cadastro e regra de limite/SAIR.

### P2 — confusão de uso
1. Primeira vez / empresa nova: roteiro "Comece por aqui" no Dashboard e vazios com ação em Agenda, Pacientes, Profissionais, Tela 1.
2. Formulários de paciente e profissional (validação de telefone fixo/estrangeiro, "número sem WhatsApp", duplicidade).
3. Tela de Configurações (endereço, fuso, conta) no padrão novo — destino da Tela 8 e do endereço.
4. Tela 4: abas Amanhã/7 dias, "Ver mensagem", itens adiados/barrados pelo limite, consultas canceladas/remarcadas, muitos itens.
5. Tela 5: motivos "número sem WhatsApp", "pediu SAIR", "teste falhou", "erro desconhecido"; vazio "Tudo certo"; conteúdo de "Resolvidas".
6. Editor: escolha da situação em "Escrever do zero", seletor de profissionais, texto "amanhã" fixo x antecedência mudada, salvar/descartar.
7. Respostas dos pacientes ("posso remarcar?") aparecendo em "Precisa de ação"; confirmar atendimento manualmente.
8. Papéis: o que owner, admin (e recepção, se existir) podem ver e fazer em cada tela.
9. Troca de empresa e nome da empresa ativa visível nas telas de mensagens.
10. Versão celular das Telas 1, 4, 5 e 7 e do menu aberto.
11. Visão Semana (e decidir Lista/filtros, que existem no app).

### P3 — polimento
1. Contraste e tamanhos de fonte (seção 2.5); alvos de toque ≥ 44px.
2. Nomes acessíveis em botões repetidos, células do Mês, ponto de status do menu.
3. Sidebar igual em todas as telas (seletor de consultório e "Sair" faltam no Dashboard e telas antigas).
4. Nome único no menu ("Mensagens automáticas") e termo único ("consulta" ou "atendimento").
5. Cartões do Dashboard clicáveis; "+N mais" na grade do Mês; feriados.
6. Remover notas de designer de dentro das telas (faturamento, "não existe no banco").
7. Aniversário 29/02 → 28/02 (registrar a regra).

---

## 6. Perguntas para o dono

1. **Recepção como papel próprio?** Hoje só existem dono e administrador. A recepção deve poder ligar/desligar mensagens, editar textos, mudar horários e desconectar o WhatsApp, ou só operar a agenda e "Não enviar esta"?
2. **Ao ligar "Chamar para retorno" pela primeira vez**, mandar para todos os pacientes antigos que se encaixam (pode ser muita gente no mesmo dia) ou só para quem passar a se encaixar dali em diante?
3. **Lembrete que cairia fora do horário permitido e depois da consulta** (ex.: consulta 07:30, horário abre 08:00): mandar antes, no último horário permitido do dia anterior, ou não mandar?
4. **Mesmo WhatsApp para vários pacientes** (mãe e filhos): o limite "1 mensagem a cada 2h" e o SAIR valem por número (todos juntos) ou por paciente?
5. **Aviso quando o WhatsApp cair**: por qual canal avisar fora do app (e-mail, SMS, notificação do navegador, WhatsApp de outro número)? O próprio WhatsApp do consultório pode estar fora.
