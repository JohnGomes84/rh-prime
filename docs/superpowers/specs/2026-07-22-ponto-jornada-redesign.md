# Ponto e Jornada V2 — Functional and Architecture Spec

> **Status (July 22, 2026):** Spec inicial para o novo núcleo de ponto e jornada.
> - Documento derivado do plano mestre `docs/superpowers/plans/2026-07-22-redesenho-ponto-e-jornada.md`.
> - Este documento fecha escopo, regras de MVP, responsabilidades de domínio e limites da convivência com o legado.

## Objective

Definir o comportamento funcional do novo módulo de ponto e jornada para pequenas e médias empresas com operação de terceirização para logística, com foco em:

- CLT;
- intermitentes;
- obrigatoriedade de ponto dependente de cliente/contrato;
- múltiplos cenários de posto/alocação;
- transição segura a partir do módulo atual.

---

## Product Scope

## O que este módulo é

Um motor de controle de jornada baseado em eventos, com:

- marcação operacional pelo colaborador;
- interpretação e cálculo de jornada;
- workflow de inconsistências e ajustes;
- fechamento mensal;
- trilha de auditoria.

## O que este módulo não é, nesta fase

- sistema completo de convocação de diaristas;
- folha completa;
- motor final de todas as regras sindicais do Brasil;
- substituto imediato de todos os fluxos legados.

---

## User and Business Context

### Público principal

- pequenas e médias empresas;
- terceirização para logística;
- colaboradores alocados em clientes/postos;
- parte do quadro com rotina fixa e parte com rotina variável.

### Tipos de trabalhador cobertos nesta fase

- CLT;
- intermitente.

### Tipos fora do foco desta fase

- diaristas;
- prestadores sem controle formal de jornada;
- terceiros externos sem vínculo de ponto.

Eles podem existir no cadastro geral da plataforma, mas não serão o centro do V2.

---

## Foundational Assumptions

1. Nem todo colaborador cadastrado precisa bater ponto.
2. Nem todo intermitente precisa bater ponto sempre.
3. A necessidade de ponto pode depender de cliente e contrato.
4. O mesmo colaborador pode atuar em posto fixo, múltiplos postos no mês e, em casos controlados, múltiplos postos no dia.
5. O cadastro e o contrato devem informar o contexto mínimo para o motor de jornada operar corretamente.

---

## Operational Classification

O V2 não deve depender apenas de `employmentType` ou `contractType`.

Ele deve introduzir o conceito funcional de **categoria operacional de jornada**, que governa regras de ponto.

### Categorias operacionais iniciais

- `clt_padrao`
- `clt_alocado`
- `clt_multiposto`
- `intermitente_com_ponto_condicional`
- `sem_ponto`

### Significado

#### `clt_padrao`

- colaborador CLT;
- jornada relativamente estável;
- ponto obrigatório;
- escala e horários definidos.

#### `clt_alocado`

- colaborador CLT;
- vinculado a cliente/posto principal;
- ponto obrigatório;
- regra pode variar por contrato/posto.

#### `clt_multiposto`

- colaborador CLT;
- pode atuar em mais de um posto;
- ponto obrigatório;
- sistema precisa associar marcação ao contexto de trabalho aplicável.

#### `intermitente_com_ponto_condicional`

- colaborador intermitente;
- ponto só obrigatório quando cliente/contrato exigir;
- jornada nasce do contexto ativo.

#### `sem_ponto`

- existe no RH, mas não usa este motor de jornada.

### Regra-mestra

As obrigações do módulo devem ser determinadas por:

`categoria operacional + contrato + cliente + posto + política da empresa`

---

## Minimal Dependencies from RH Base

Para o V2 funcionar, cada colaborador elegível a ponto deve ter no mínimo:

- identificação do funcionário;
- vínculo contratual ativo;
- categoria operacional;
- status de elegibilidade para ponto;
- política de jornada aplicável;
- quando necessário: cliente/posto/alocação principal.

### Campos obrigatórios para elegibilidade de ponto

- `employee_id`
- `employmentType`
- `contract_id` ativo
- `operationalCategory`
- `requiresTimeTracking`
- `journeyPolicyId` ou regra equivalente

### Campos opcionais, mas desejáveis

- `client_id`
- `post_id`
- `cost_center`
- `manager_id`
- `assignment_mode`

---

## Time Tracking Eligibility Rules

O sistema deve conseguir responder, por colaborador:

- ele precisa bater ponto?
- ele pode bater ponto hoje?
- em qual contexto ele pode bater ponto?
- que jornada é esperada?

### Regra de decisão

`canTrackTime(employee, date, context)` deve considerar:

- status do colaborador;
- contrato ativo;
- categoria operacional;
- regra por cliente/contrato;
- política da empresa;
- bloqueios operacionais, se houver.

### Regras mínimas

- `clt_padrao`: sim, salvo bloqueio explícito.
- `clt_alocado`: sim, usando contexto do posto/contrato aplicável.
- `clt_multiposto`: sim, com contexto explícito quando necessário.
- `intermitente_com_ponto_condicional`: depende do contrato/cliente/contexto ativo.
- `sem_ponto`: não.

---

## Event Model

### Eventos suportados no MVP

- `clock_in`
- `break_start`
- `break_end`
- `clock_out`
- `manual_adjustment`
- `imported_event`

### Eventos fora do MVP

- `on_call_start`
- `on_call_end`
- `travel_start`
- `travel_end`
- `shift_transfer`

Podem entrar depois se o piloto provar necessidade real.

### Regras de sequência do MVP

Sequências válidas típicas:

1. `clock_in -> clock_out`
2. `clock_in -> break_start -> break_end -> clock_out`
3. `clock_in -> break_start -> break_end -> break_start -> break_end -> clock_out`

Sequências inválidas:

- `clock_out` sem `clock_in`
- `break_start` sem sessão aberta
- `break_end` sem intervalo aberto
- dois `clock_in` seguidos na mesma sessão
- dois `break_start` seguidos
- dois `clock_out` na mesma sessão

---

## Session Semantics

Uma sessão de trabalho é aberta por `clock_in` e encerrada por `clock_out`.

Dentro dela podem existir segmentos:

- trabalho ativo;
- intervalo;
- retorno.

### Sessão em aberto

Enquanto não houver `clock_out`, a sessão permanece aberta.

### Múltiplas sessões no dia

O MVP deve permitir:

- mais de uma sessão no mesmo dia;
- desde que a sequência de eventos seja válida.

Isso é necessário para parte das operações com múltiplos postos ou retornos no mesmo dia.

---

## Break Policy

O sistema atual presume almoço por desconto de minutos.

O V2 muda essa lógica:

- intervalo passa a ser evento explícito quando a política exigir;
- desconto automático só deve existir como política transitória controlada, nunca como regra estrutural do V2.

### Modos de intervalo no MVP

- `explicit_break_required`
- `explicit_break_optional`
- `auto_deduct_legacy_compat`

### Recomendação

Para pilotos novos:

- preferir `explicit_break_required` ou `explicit_break_optional`.

Para convivência com o legado:

- permitir `auto_deduct_legacy_compat` apenas em escopos temporários e comparáveis.

---

## Real-Time vs Closing-Time Calculation

### Cálculo em tempo real

Objetivo:

- mostrar estado atual da jornada;
- prever próxima ação;
- indicar inconsistências imediatas.

Inclui:

- sessão aberta;
- tempo decorrido;
- intervalo em andamento;
- possível inconsistência básica.

### Cálculo de fechamento

Objetivo:

- consolidar a jornada do período;
- calcular regras contratuais;
- aplicar banco de horas;
- produzir dados de aprovação e espelho.

Inclui:

- atraso;
- hora extra;
- adicional noturno;
- saldo de banco;
- faltas/inconsistências;
- encerramento do período.

### Regra

O cálculo de fechamento é a fonte oficial.

O cálculo em tempo real é informativo e pode ser reprojetado.

---

## MVP Coverage of Journey Scenarios

O MVP deve cobrir obrigatoriamente:

- jornada simples com entrada e saída;
- jornada com um intervalo;
- jornada com múltiplos intervalos;
- mais de uma sessão no dia;
- atraso;
- hora extra em dia útil;
- adicional noturno simples;
- banco de horas simples;
- esquecimento de marcação;
- pedido de ajuste;
- fechamento mensal.

### Não precisa cobrir no MVP

- todos os cenários sindicais específicos;
- prontidão e sobreaviso complexos;
- revezamento altamente customizado;
- compensações multi-período avançadas;
- integrações com relógio físico.

---

## Calculation Rules for MVP

### Atraso

- comparar `clock_in` com horário esperado da política ativa;
- respeitar tolerância configurada.

### Hora extra

- comparar tempo trabalhado com jornada esperada;
- no MVP, suportar pelo menos:
  - extra dia útil;
  - extra em domingo/feriado, se já houver suporte no policy layer.

### Adicional noturno

- suportar sobreposição simples com janela noturna configurada.

### Banco de horas

- no MVP, suportar crédito e débito simples por fechamento;
- sem carry-over complexo entre múltiplos regimes nesta fase.

### Inconsistências

- sessão sem encerramento;
- pausa não encerrada;
- saída sem entrada;
- sequência inválida;
- contexto contratual insuficiente.

---

## Adjustment Workflow

Toda divergência deve ir para fluxo formal.

### Ações do colaborador

- visualizar pendências;
- solicitar ajuste;
- informar justificativa;
- anexar evidência quando política exigir.

### Ações do gestor/RH

- aprovar;
- rejeitar;
- devolver para complemento;
- encerrar pendência.

### Regra importante

O ajuste não altera silenciosamente o bruto.

Ele gera:

- decisão formal;
- rastro de auditoria;
- recálculo da jornada afetada.

---

## Monthly Closing

O módulo deve suportar fechamento mensal do ponto.

### Fases do fechamento

1. apuração técnica;
2. tratamento de pendências;
3. revisão do gestor/RH;
4. fechamento da competência;
5. ciência do colaborador, quando habilitada.

### Estado mínimo do período

- `open`
- `under_review`
- `closed`
- `reopened`

---

## Receipts and Audit

Cada marcação válida deve gerar um comprovante operacional.

### No MVP

O comprovante deve registrar:

- colaborador;
- tipo de evento;
- data/hora;
- identificador do evento;
- origem;
- contexto disponível;
- hash/identificador técnico quando aplicável.

### Regra

O recibo de UI não é a única verdade.

Ele deve ser derivado de dado persistido, não só montado em memória no frontend.

---

## Evidence Policy

### Princípio

Evidência antifraude é apoio, não o núcleo do domínio.

### Políticas possíveis no MVP

- `none`
- `geo_optional`
- `geo_required`
- `selfie_optional`
- `selfie_required`
- `fingerprint_enabled`

### Recomendação do MVP

- geolocalização: opcional/configurável;
- selfie: opcional, só para cenários controlados;
- fingerprint: habilitado como apoio técnico, não como prova principal.

### Proibição de design

Não tornar selfie obrigatória globalmente no MVP.

Isso aumenta fricção operacional e risco de privacidade sem resolver a base do problema.

---

## Context Binding: Client / Contract / Post

Para operações com terceirização logística, o ponto pode depender do contexto de trabalho.

### No MVP, o sistema deve suportar ao menos:

- colaborador com contexto padrão do contrato;
- colaborador com posto principal;
- colaborador com contexto variável informado no momento da marcação, quando necessário.

### Estratégia

O V2 deve aceitar contexto explícito no evento, mas usar defaults quando houver vínculo claro e unívoco.

### Regra

Se o contexto for necessário para cálculo e não puder ser inferido com segurança, a marcação deve:

- ser aceita com pendência, ou
- ser bloqueada conforme política.

Isso será definido pela política operacional.

---

## Legacy Coexistence Rules

### Regra 1

O legado continua sendo a fonte oficial enquanto o escopo não entrar em cutover.

### Regra 2

Durante dual-run:

- o usuário pode continuar usando o fluxo antigo;
- o V2 espelha e calcula em paralelo;
- divergências são registradas.

### Regra 3

Não inferir equivalência perfeita entre:

- row legado `clockIn/clockOut`
- sequência real de eventos V2

Especialmente por causa do intervalo.

### Regra 4

Importação histórica deve ser marcada como:

- `imported_event`
- com `source_reference` do legado.

---

## API Boundaries

O novo V2 deve nascer em router próprio, sem substituir de cara o `timesheetRouter`.

### Estrutura sugerida

- `journeyV2.clockEvent.create`
- `journeyV2.clockEvent.listDay`
- `journeyV2.session.getCurrent`
- `journeyV2.timeline.getDay`
- `journeyV2.adjustment.request`
- `journeyV2.adjustment.review`
- `journeyV2.closing.runPreview`
- `journeyV2.closing.closePeriod`

### Regra de compatibilidade

Nenhuma rota legada deve ser removida antes do cutover.

---

## UI Scope

### TimesheetV2

Deve mostrar:

- ação principal do momento;
- timeline do dia;
- estado da sessão;
- pendências;
- recibos recentes;
- pedido de ajuste.

### JourneyAdminV2

Deve mostrar:

- inconsistências por colaborador/equipe;
- pendências de ajuste;
- sessões abertas;
- visão de fechamento;
- comparação legado x V2 no piloto.

---

## Success Criteria for MVP

O MVP será considerado funcional se:

- registrar eventos múltiplos corretamente;
- permitir jornada com intervalo explícito;
- detectar inconsistências básicas;
- recalcular jornada a partir do bruto;
- suportar ajuste formal;
- permitir fechamento mensal;
- conviver com o legado sem quebrá-lo.

---

## Open Decisions Intentionally Deferred

Estas decisões não precisam bloquear a implementação inicial:

- operar como REP-P próprio ou não;
- cobertura de convenções altamente específicas;
- integração com dispositivos físicos;
- automações avançadas de alocação multi-posto.

---

## Out of Scope for MVP

- diaristas;
- convocação nativa de mão de obra avulsa;
- folha completa;
- motor sindical avançado;
- analytics sofisticado;
- IA de auditoria.

---

## Immediate Follow-Up Documents

Depois desta spec, os próximos artefatos devem ser:

1. inventário do legado;
2. schema técnico V2;
3. contrato das policies;
4. matriz de divergência legado x V2;
5. checklist de piloto e cutover.
