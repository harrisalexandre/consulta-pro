# Consulta Pro — Regras de negócio

## Tenant
1. Cada empresa é um tenant isolado.
2. Dados operacionais devem possuir vínculo com a empresa.
3. Usuário só pode operar empresas para as quais possui vínculo autorizado.
4. Trocar o tenant ativo não concede privilégios novos.

## Empresas
1. Superadmin pode criar empresas.
2. A empresa deve possuir pelo menos um acesso administrativo para operar o sistema.
3. O primeiro acesso pode ser Owner ou Admin.
4. Operações privilegiadas de criação/alteração de Auth não devem usar service role no frontend.

## Usuários
1. Owner representa acesso administrativo total dentro da empresa, conforme matriz de permissões.
2. Admin representa gestão da empresa conforme permissões atribuídas.
3. Alterar status deve preservar histórico e vínculo.
4. Reset de senha deve ocorrer por fluxo privilegiado seguro; senha nunca deve ser persistida em tabela própria.
5. Usuário não deve conseguir alterar o tenant pelo payload para escapar do próprio escopo.

## Pacientes
1. Paciente pertence a uma empresa.
2. Cadastro pode ser criado, editado e ativado/inativado.
3. Inativação não deve apagar histórico.
4. Histórico de atendimento permanece associado ao paciente.

## Profissionais
1. Profissional pertence a uma empresa.
2. Cadastro pode ser criado, editado e ativado/inativado.
3. Inativação não deve apagar histórico.
4. Agendamentos devem referenciar o profissional da mesma empresa.

## Agenda
1. Agendamento pertence a uma empresa.
2. Agendamento deve referenciar paciente e profissional do mesmo tenant.
3. Cancelamento não equivale a exclusão histórica.
4. Conflitos de horário por profissional devem ser tratados explicitamente.
5. Alterações de status devem ser visíveis na agenda e nos históricos.

## WhatsApp
1. Configuração pertence à empresa.
2. Histórico de mensagens pertence à empresa.
3. Templates pertencem à empresa.
4. Envio real deve passar pela integração configurada; não criar atalhos externos que contornem o histórico.
5. Falha de conexão não deve apagar histórico.

## Automações
1. Automação pertence à empresa.
2. Apenas automações habilitadas podem executar.
3. Template usado pelo WhatsApp deve respeitar o tenant.
4. Disparos devem possuir proteção contra duplicação.
5. Execução e falha devem ser rastreáveis.

## UX e dados
1. Falha de backend não pode ser apresentada como lista vazia.
2. Loading, erro e vazio real são estados diferentes.
3. Ações destrutivas ou irreversíveis devem pedir confirmação.
4. Rotas internas devem possuir navegação coerente e fallback.
