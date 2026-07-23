> **Status (July 22, 2026):** Backlog técnico e matriz de transição do legado de ponto para o `Journey V2`.
> - Documento derivado do plano mestre `docs/superpowers/plans/2026-07-22-redesenho-ponto-e-jornada.md`.
> - Complementa:
>   - `docs/superpowers/specs/2026-07-22-ponto-jornada-redesign.md`
>   - `docs/superpowers/specs/2026-07-22-ponto-legado-inventory.md`
>   - `docs/superpowers/specs/2026-07-22-schema-journey-v2.md`

# Objetivo

Transformar o redesenho do ponto em uma sequência de entregas controladas, com três preocupações explícitas:

- não quebrar o que hoje funciona;
- não prolongar o legado como arquitetura definitiva;
- criar critérios claros para sair de cada fase até o cutover.

Este documento responde:

1. o que precisa ser construído primeiro;
2. o que do legado continua vivo em cada fase;
3. como cada tela, rota e cálculo migra;
4. quais são os riscos por item;
5. quando um escopo pode sair do legado.

# Princípios de execução

1. O V2 nasce ao lado do legado.
2. O legado continua fonte oficial até haver critério de corte por escopo.
3. O primeiro objetivo não é “trocar a tela”; é “isolar o domínio”.
4. Nada no V2 depende de inventar comportamento que o legado nunca registrou.
5. Ajuste de ponto, fechamento, inconsistência e recibo são parte do MVP, não pós-MVP.

# Macrobacklog

## Bloco A — Fundação de domínio

Objetivo: criar o núcleo técnico sem impacto operacional.

Entregas:

- criar schema `journey_*` sem alterar a semântica de `time_records`;
- criar enums, tipos compartilhados e contratos tRPC do V2;
- criar feature flags do programa de transição;
- criar trilha de auditoria e versionamento de apuração;
- preparar seeds e fixtures mínimos para cenários CLT e intermitente.

Dependências:

- nenhuma dependência funcional do frontend;
- alinhamento com contratos e vínculo usuário-funcionário já existentes.

Critério de saída:

- banco sobe com o schema novo;
- nenhuma rota atual quebra;
- testes atuais continuam verdes;
- é possível inserir e consultar entidades V2 isoladamente.

## Bloco B — Elegibilidade e política de jornada

Objetivo: decidir corretamente quem bate ponto, quando e sob qual contexto.

Entregas:

- modelar política de jornada;
- modelar assignment de política por colaborador/contrato/contexto;
- introduzir categoria operacional de jornada;
- criar resolvedor de elegibilidade de ponto do dia;
- criar resolvedor de contexto ativo para CLT alocado, multiposto e intermitente.

Dependências:

- leitura de `employees`, `contracts`, vínculo usuário-funcionário;
- definição de fallback para colaborador sem contexto ativo.

Critério de saída:

- sistema responde para um colaborador:
  - se ele deve bater ponto;
  - se pode bater ponto agora;
  - qual política está valendo;
  - em qual contrato/cliente/posto o registro será feito.

## Bloco C — Captura de eventos

Objetivo: sair de `clockIn/clockOut` agregado para timeline real.

Entregas:

- endpoint de `registerPunchEvent`;
- suporte a `clock_in`, `break_start`, `break_end`, `clock_out`;
- validação de sequência de eventos;
- captura de metadados de origem;
- geração de recibo por evento.

Dependências:

- Bloco A e B concluídos;
- contrato mínimo de autenticação e escopo de funcionário já existente.

Critério de saída:

- um usuário elegível consegue registrar uma jornada completa em V2;
- sequências inválidas são bloqueadas;
- cada evento gera recibo auditável.

## Bloco D — Motor de sessões, segmentos e apuração

Objetivo: transformar eventos em jornada calculável.

Entregas:

- montagem de sessões de trabalho;
- segmentação de trabalho e intervalo;
- cálculo preliminar em tempo real;
- cálculo oficial de fechamento;
- versionamento de apuração;
- classificação de inconsistências.

Dependências:

- eventos do V2 funcionando;
- política de intervalo e tolerâncias definidas.

Critério de saída:

- a timeline do dia pode ser interpretada automaticamente;
- o sistema distingue jornada em aberto, concluída e inconsistente;
- existe comparação repetível entre cálculo preliminar e oficial.

## Bloco E — Workflow operacional

Objetivo: transformar o ponto em processo administrável.

Entregas:

- ajuste/solicitação de ajuste;
- decisão de ajuste;
- fechamento diário/mensal;
- trilha de pendências e inconsistências;
- status operacional por colaborador/período.

Dependências:

- apuração V2 concluída;
- integração com permissões já existentes.

Critério de saída:

- operação consegue tratar faltas, esquecimentos e divergências sem mexer direto no banco;
- colaborador consegue pedir ajuste;
- gestor/admin consegue decidir com rastreabilidade.

## Bloco F — Experiência do colaborador

Objetivo: entregar a nova tela de ponto de forma segura.

Entregas:

- tela `/ponto` V2 sob flag;
- card de elegibilidade;
- timeline do dia;
- próxima ação recomendada;
- recibo do último evento;
- alertas de inconsistência e atalho para ajuste.

Dependências:

- captura de eventos e apuração preliminar;
- sessão autenticada e vínculo com funcionário.

Critério de saída:

- piloto controlado consegue usar a nova jornada sem depender do legado;
- a UX comunica quando não pode registrar e por quê.

## Bloco G — Experiência administrativa

Objetivo: substituir a visão operacional do legado.

Entregas:

- lista operacional de jornadas;
- filtro por cliente, contrato, posto, colaborador e status;
- visão de timeline auditável;
- fila de inconsistências;
- fila de ajustes;
- fechamento e reabertura controlada.

Dependências:

- workflow operacional;
- escopo e permissões de gestão/admin.

Critério de saída:

- operação consegue acompanhar o piloto por V2;
- não precisa usar leitura crua de tabela ou remendos no legado para tratar exceções.

## Bloco H — Dual-run e comparabilidade

Objetivo: provar que o V2 é confiável antes do corte.

Entregas:

- shadow write opcional a partir do legado;
- comparação legado x V2 por dia/colaborador;
- painel de divergência;
- classificação de divergência:
  - esperada por diferença de modelo;
  - bug de implementação;
  - dado legado insuficiente;
  - regra nova corretamente mais precisa.

Dependências:

- captura V2;
- motor de apuração V2;
- dados comparáveis por escopo piloto.

Critério de saída:

- divergências relevantes são rastreadas;
- existe taxa de convergência por piloto;
- os casos não comparáveis estão documentados.

## Bloco I — Cutover por escopo

Objetivo: trocar a gravação oficial sem big bang.

Entregas:

- bloqueio de novas gravações no legado por escopo;
- manutenção de leitura histórica do legado;
- ativação de V2 como fonte oficial do piloto;
- playbook de rollback por escopo.

Dependências:

- dual-run validado;
- operação treinada;
- critérios de corte satisfeitos.

Critério de saída:

- escopo piloto opera oficialmente em V2;
- rollback pode ser acionado sem corromper histórico.

# Matriz legado -> V2

## Entidades

| Legado atual | Papel hoje | Limite do legado | Equivalente V2 | Estratégia |
| --- | --- | --- | --- | --- |
| `time_records` | row agregada de jornada | não representa eventos reais | `journey_punch_events` + `journey_work_sessions` + `journey_work_segments` | coexistir; não migrar semanticamente por suposição |
| `overtime_records` | solicitação/movimento de hora extra | acoplado ao fechamento do row legado | derivação a partir de `journey_evaluations` e workflow próprio | manter legado até fechamento V2 amadurecer |
| `compliance_exports` | exportações de Portaria | depende de consolidação legado | `journey_closures` + export layer V2 | reimplementar só após apuração oficial |

## Rotas backend

| Legado atual | Destino V2 | Fase | Observação |
| --- | --- | --- | --- |
| `timesheet.clockIn` | `journeyV2.registerPunchEvent(clock_in)` | dual-run | legado continua oficial no início |
| `timesheet.clockOut` | `journeyV2.registerPunchEvent(clock_out)` | dual-run | desligamento do legado só no cutover |
| `timesheet.uploadSelfie` | `journeyV2.attachEvidence` ou embutido no evento | V2 API | definir se selfie é política ou evidência opcional |
| `timesheet.getOpenRecord` | `journeyV2.getTodayStatus` | V2 UI | resposta passa a ser orientada por sessão/evento |
| `timesheet.getRecords` | `journeyV2.listTimeline` | V2 UI | timeline diária/submensal |
| `timesheet.getMonthlySummary` | `journeyV2.getPeriodSummary` | V2 admin/employee | cálculo precisa vir de avaliações |
| `timesheet.adjustTimeRecord` | `journeyV2.requestAdjustment` | workflow V2 | não editar row fechado direto |
| `timesheet.approveTimeRecord` | `journeyV2.decideAdjustment` | workflow V2 | decisão auditável |
| `timesheet.rejectTimeRecord` | `journeyV2.decideAdjustment` | workflow V2 | mesma trilha de decisão |
| `timesheet.exportPortaria` | `journeyV2.exportCompliance` | pós-fechamento | só depois de fechamento oficial |

## Telas frontend

| Tela atual | Papel hoje | Substituição planejada | Estratégia |
| --- | --- | --- | --- |
| `client/src/pages/Timesheet.tsx` | ponto do colaborador | mesma rota com branch V2 por flag | manter experiência atual até piloto |
| `client/src/pages/JourneyAdmin.tsx` | gestão operacional do ponto | evoluir para visão operacional V2 | provável convivência temporária por abas |
| `client/src/pages/CompliancePortaria.tsx` | export/compliance | preservar até V2 fechar apuração | migrar por último |

# Ordem de implementação recomendada

1. schema novo e tipos base;
2. política de jornada e elegibilidade;
3. captura de eventos;
4. motor de sessão e timeline do dia;
5. tela do colaborador V2;
6. ajustes e workflow;
7. visão administrativa V2;
8. dual-run comparável;
9. fechamento oficial V2;
10. exportação/compliance V2;
11. cutover por escopo;
12. congelamento do legado.

Essa ordem evita o erro de construir tela antes de existir semântica sólida de evento, sessão e regra.

# Backlog priorizado por sprint/onda

## Onda 1 — Fundar o V2 sem efeito operacional

- criar `drizzle/schema-journey-v2.ts`;
- registrar novas tabelas no schema principal;
- criar flags;
- criar tipos compartilhados do domínio;
- criar fixtures de testes.

Saída esperada:

- infraestrutura pronta e isolada.

## Onda 2 — Decisão de elegibilidade

- criar resolvedor de categoria operacional;
- criar resolvedor de política ativa;
- criar resolvedor de contexto do dia;
- criar endpoint de status do dia sem gravação.

Saída esperada:

- sistema sabe se a pessoa pode ou não bater ponto.

## Onda 3 — Registro real do ponto

- implementar `registerPunchEvent`;
- implementar recibo;
- bloquear sequências inválidas;
- adicionar leitura de timeline do dia.

Saída esperada:

- uma jornada simples pode ser registrada toda em V2.

## Onda 4 — Cálculo e inconsistência

- montar sessões;
- montar segmentos;
- calcular jornada;
- classificar pendências e inconsistências;
- expor resumo do dia e do período.

Saída esperada:

- V2 deixa de ser só repositório de eventos e vira motor de jornada.

## Onda 5 — Operação e ajuste

- request/decision de ajuste;
- filtros operacionais;
- fila de pendências;
- fechamento preliminar.

Saída esperada:

- operação já consegue trabalhar em V2 no piloto.

## Onda 6 — Comparação e corte

- dual-run;
- painel de divergência;
- cutover por escopo;
- rollback operacional.

Saída esperada:

- piloto entra oficialmente em V2.

# Critérios de cutover por escopo

Um escopo só sai do legado quando todos os itens abaixo forem verdadeiros:

1. elegibilidade está correta para aquele grupo;
2. colaborador consegue completar os eventos necessários;
3. operação consegue tratar exceções sem usar o legado;
4. resumo diário e do período está consistente;
5. divergências com o legado foram explicadas ou corrigidas;
6. histórico legado continua legível;
7. rollback do escopo foi ensaiado.

Escopo aqui pode ser:

- empresa;
- cliente;
- contrato;
- posto;
- categoria operacional;
- grupo piloto de colaboradores.

# Riscos principais e contenção

## Risco 1 — Tentar migrar semanticamente `time_records`

Problema:

- o legado não registra a verdade completa da timeline.

Contenção:

- nunca inventar `break_start` e `break_end` retroativos a partir de desconto automático;
- tratar histórico legado como histórico legado.

## Risco 2 — Misturar política de jornada com UI

Problema:

- decisões de obrigatoriedade acabam espalhadas em tela, router e banco.

Contenção:

- centralizar elegibilidade e política em resolvedores de domínio.

## Risco 3 — Fazer big bang

Problema:

- erro de cálculo ou exceção operacional paralisa a operação.

Contenção:

- dual-run;
- cutover por escopo;
- rollback por flag.

## Risco 4 — Acoplar fechamento V2 cedo demais à hora extra legado

Problema:

- fechamento pode herdar limitações do modelo antigo.

Contenção:

- manter integração de hora extra em modo compatível até o fechamento V2 estabilizar.

## Risco 5 — Não fechar o workflow de exceção

Problema:

- capturar eventos sem ajuste/decisão só desloca o problema.

Contenção:

- workflow de ajuste entra antes do cutover.

# Decisões já tomadas

1. O módulo atual de `timesheet` é legado operacional.
2. O novo núcleo será event-driven.
3. O foco inicial é CLT e intermitente com ponto dependente de contrato/contexto.
4. Cadastro amplo de RH continua existindo, mas o V2 depende só do mínimo necessário para elegibilidade.
5. O legado não será “remendado” para virar o V2.
6. O corte será incremental, nunca total de uma vez.

# Próximo passo recomendado de implementação

O próximo passo técnico certo é:

1. converter `docs/superpowers/specs/2026-07-22-schema-journey-v2.md` em código real;
2. criar `drizzle/schema-journey-v2.ts`;
3. registrar as novas tabelas no `drizzle/schema.ts`;
4. preparar a primeira migration sem uso em produção;
5. só depois abrir a camada `server/modules/journey-v2`.

Se a ordem for invertida, o time tende a escrever rota e tela em cima de contratos de dados ainda instáveis.
