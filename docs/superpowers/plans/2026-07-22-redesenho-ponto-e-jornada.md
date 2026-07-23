# Redesenho Completo de Ponto e Jornada — Master Plan

> **Status (July 22, 2026):** Plano mestre para refazer o módulo de ponto/jornada do RH Prime do início ao fim, com migração segura e foco em não quebrar o legado.
> - Escopo deste documento: estratégia, arquitetura, ordem de execução, compatibilidade, migração, cutover e rollback.
> - Escopo fora deste documento: detalhe de layout de telas, redação jurídica final de políticas e implementação linha a linha.

> **For agentic workers:** Este documento é a trilha principal. Não pule fases. Não comece pelo frontend. Não altere o legado para “parecer o novo”. Use o novo domínio por trás de feature flags e preserve comparabilidade entre os dois fluxos.

## Goal

Refazer o domínio de ponto e jornada para transformá-lo em um motor operacional de controle de jornada adequado a pequenas e médias empresas com mão de obra terceirizada para logística, sem perder compatibilidade com o que hoje já funciona em RH, cadastro, admissão, contratos, férias e banco de horas.

O foco é ponto, mas o ponto deve ser redesenhado de forma coerente com:

- cadastro de funcionário;
- contrato e jornada;
- admissão;
- workflow de gestor/RH;
- fechamento mensal;
- integração futura com folha e compliance mais robusto.

---

## Executive Summary

O módulo atual de ponto deve ser tratado como **legado operacional**.

Ele já resolve partes úteis:

- vínculo do usuário ao funcionário;
- consulta de jornada;
- cálculo básico de atraso, hora extra, noturno e banco de horas;
- comprovante operacional na UI;
- pedidos de ajuste;
- base de contratos com algumas regras de jornada;
- exportações iniciais de compliance.

Mas ele tem limites estruturais:

- a marcação é tratada como `clockIn/clockOut` agregado;
- intervalo não é nativo;
- o cálculo está acoplado ao router e ao formato atual;
- o bruto e o tratado estão próximos demais;
- a integridade ainda é simplificada.

Portanto, a estratégia recomendada é:

1. criar um novo domínio de jornada;
2. manter o legado vivo;
3. ativar o novo fluxo por feature flag;
4. rodar os dois em paralelo por período controlado;
5. só então cortar.

---

## Current State

### O que já existe e deve ser preservado

**Cadastro e RH base**

- `employees` já contém dados cadastrais, pessoais, bancários, status, centro de custo, gestor e tipo de vínculo.
- `contracts` já contém `contractType`, jornada, horários, tolerância, banco de horas e adicional noturno.
- há workflows de admissão com checklist, evidências, documentos e finalização.
- o vínculo usuário-funcionário já está operacional.

**Ponto atual**

- registro de entrada e saída;
- geolocalização opcional;
- selfie opcional;
- fingerprint de dispositivo;
- regra de cálculo baseada no último contrato;
- saldo básico de banco de horas;
- aprovação em massa;
- relatório operacional;
- exportações iniciais de AFD/AFDT/ACJEF.

### O que não deve ser mantido como base final

- `time_records` como entidade central do domínio;
- cálculo baseado em “um row = uma jornada”;
- intervalo implícito por desconto de almoço padrão;
- edição/ajuste próximos demais do registro base;
- geração de compliance sobre modelo simplificado.

---

## Product Direction

### Público-alvo

- pequenas e médias empresas;
- forte aderência a operações com terceirização para logística;
- plataforma reutilizável para empresas semelhantes.

### Cenário operacional considerado

- CLT e intermitentes;
- obrigatoriedade de ponto variável por cliente/contrato;
- postos fixos, múltiplos postos no mês e múltiplos postos no dia;
- cadastro/admissão relevantes como base do ponto, mas sem desviar o foco do redesenho.

### Decisão de escopo

O novo desenho deve resolver **ponto para quem precisa bater ponto** e **cadastro suficiente para quem precisa existir no fluxo de ponto**.

Não é objetivo desta fase resolver toda a cadeia de convocação de diaristas nem absorver sistemas externos não prioritários.

---

## Core Design Principles

1. O colaborador registra eventos, não “fecha um dia”.
2. O sistema separa bruto, tratado, aprovado e fechado.
3. O cálculo precisa ser reprocessável.
4. Ajuste nunca apaga o histórico base.
5. O legado não é quebrado durante a transição.
6. O frontend não define regra trabalhista.
7. Feature flag é obrigatória em toda virada funcional.
8. O novo núcleo nasce preparado para operar com backend próprio ou motor externo no futuro.

---

## Target Architecture

## 1. Domain Model

### 1.1 Registro bruto

Entidade central: `punch_events`

Cada marcação deve ser um evento individual:

- `clock_in`
- `break_start`
- `break_end`
- `clock_out`
- `manual_adjustment`
- `imported_event`
- `system_correction`

Campos essenciais:

- `id`
- `employee_id`
- `contract_id`
- `occurred_at`
- `event_type`
- `source`
- `source_reference`
- `company_id` ou equivalente lógico
- `client_id` / `assignment_id` / `post_id` quando aplicável
- `nsr`
- `previous_hash`
- `event_hash`
- `timezone`
- `captured_by_user_id`
- `device_id`
- `device_fingerprint`
- `geo_lat`
- `geo_lng`
- `geo_accuracy_m`
- `selfie_url`
- `integrity_status`
- `created_at`

### 1.2 Estruturas derivadas

- `work_sessions`
- `work_segments`
- `journey_evaluations`
- `journey_evaluation_versions`
- `time_adjustment_requests`
- `time_adjustment_decisions`
- `employee_receipts`
- `audit_trail_entries`
- `journey_closures`

### 1.3 Papel do legado

`time_records` passa a ser:

- fonte de comparação durante migração;
- histórico legado;
- origem de importação eventual;
- nunca mais o modelo mestre do domínio novo.

---

## 2. Separation of Concerns

### 2.1 Registro

Responsável por:

- criar marcações;
- validar sequência mínima;
- gerar comprovante por evento;
- aplicar trilha de integridade.

### 2.2 Interpretação

Responsável por:

- agrupar eventos;
- formar segmentos;
- detectar inconsistências;
- projetar estado da jornada em tempo real.

### 2.3 Cálculo

Responsável por:

- atraso;
- extra;
- noturno;
- intervalo;
- banco de horas;
- faltas;
- jornada inválida;
- exceções parametrizadas.

### 2.4 Workflow

Responsável por:

- pendência;
- solicitação de ajuste;
- revisão gestor/RH;
- fechamento;
- ciência do colaborador.

### 2.5 Exportação

Responsável por:

- espelho;
- comprovantes;
- trilhas;
- exportações derivadas.

---

## What Must Keep Working During Transition

Enquanto o V2 não assume o tráfego real, estes itens não podem parar:

- login e vínculo usuário-funcionário;
- consulta de funcionário no cadastro;
- contratos;
- férias;
- fluxo de admissão atual;
- `timesheet` legado para usuários existentes;
- banco de horas atual;
- rotas administrativas existentes;
- exportações atuais, ainda que provisórias;
- indicadores básicos usados hoje.

---

## Compatibility Strategy

## Feature Flags obrigatórias

Criar pelo menos:

- `journey-v2-schema`
- `journey-v2-api`
- `journey-v2-ui-employee`
- `journey-v2-ui-admin`
- `journey-v2-dual-run`
- `journey-v2-cutover`

## Modos operacionais

### Modo 0 — legado puro

- tudo segue como hoje.

### Modo 1 — V2 invisível

- novo schema ativo;
- sem uso por usuários;
- só ingestão/importação de teste.

### Modo 2 — dual-run técnico

- ação do usuário ainda usa legado;
- eventos equivalentes são espelhados no V2;
- divergências começam a ser medidas.

### Modo 3 — piloto operacional

- empresa/unidade piloto usa UI V2;
- legado permanece comparável;
- time acompanha divergências e corrige.

### Modo 4 — cutover controlado

- novos usuários entram no V2;
- legado fica só consulta/histórico para aquele escopo.

### Modo 5 — legado congelado

- sem novas gravações no legado para aquele escopo;
- apenas leitura e exportação histórica.

---

## Migration Rules

1. Não reaproveitar `time_records` como tabela principal do novo fluxo.
2. Não alterar o significado dos campos atuais do legado.
3. Não trocar a UI de todos de uma vez.
4. Não migrar dados históricos sem marcação explícita de origem.
5. Não inferir “intervalo real” onde o legado só tinha desconto automático de almoço.
6. Não chamar a saída V2 de compliance final antes de fechar a trilha do bruto.

---

## Detailed Workstreams

## Workstream A — Modelagem de domínio

Objetivo:

- definir entidades novas sem tocar a semântica do legado.

Entregas:

- `schema-journey-v2`
- contratos de tipos
- enums de eventos
- chaves de integridade
- índices

Risco principal:

- exagerar o escopo do schema já na primeira versão.

Mitigação:

- MVP com poucas entidades, mas corretas.

## Workstream B — Motor de eventos

Objetivo:

- criar API de marcação por evento.

Entregas:

- criação de evento;
- verificação de sequência;
- comprovante por evento;
- captura opcional de evidência;
- idempotência mínima.

Risco principal:

- copiar a lógica atual de `clockIn/clockOut`.

Mitigação:

- proibir qualquer gravação agregada no V2.

## Workstream C — Interpretação e cálculo

Objetivo:

- transformar eventos em jornada interpretável.

Entregas:

- parser de eventos;
- sessão em aberto;
- segmentos do dia;
- inconsistências;
- cálculo base;
- versionamento do cálculo.

Risco principal:

- misturar regra de negócio com endpoint.

Mitigação:

- tudo fica em módulos puros com testes.

## Workstream D — UI do colaborador

Objetivo:

- permitir uso operacional simples.

Entregas:

- `Registrar entrada`
- `Iniciar intervalo`
- `Voltar do intervalo`
- `Registrar saída`
- timeline do dia
- recibos
- pendências
- pedido de ajuste

Risco principal:

- UI sofisticada demais antes de validar fluxo.

Mitigação:

- foco em clareza operacional.

## Workstream E — UI de gestor/RH

Objetivo:

- transformar ponto em processo gerenciável.

Entregas:

- pendências da equipe
- inconsistências
- acertos
- fechamento mensal
- comparação legado x V2

Risco principal:

- tentar reproduzir todo o admin atual em uma fase.

Mitigação:

- priorizar fila de exceções e fechamento.

## Workstream F — Migração e observabilidade

Objetivo:

- garantir transição segura.

Entregas:

- dual-run
- relatório de divergências
- dashboard de saúde do piloto
- scripts de importação histórica
- critérios de cutover
- rollback documentado

---

## Phased Execution Plan

## Phase 0 — Discovery Freeze

Objetivo:

- parar expansão do legado como solução final.

Ações:

- congelar novas features grandes no ponto legado;
- aceitar apenas hotfixes;
- listar dependências do legado;
- mapear rotas, tabelas e telas dependentes.

Saída:

- inventário de dependências do legado.

## Phase 1 — Spec and Architecture Lock

Objetivo:

- fechar a verdade do V2 antes de mexer em código estrutural.

Ações:

- detalhar cenários de jornada cobertos pelo MVP;
- definir políticas de evidência;
- definir escopos de cliente/contrato/posto;
- definir interpretação para CLT e intermitentes;
- definir comparabilidade com o legado.

Saída:

- spec detalhada aprovada.

## Phase 2 — Schema V2

Objetivo:

- criar a base persistente nova.

Ações:

- criar novo schema;
- adicionar migration;
- re-exportar sem conectar o tráfego ainda.

Saída:

- banco pronto para V2.

## Phase 3 — Core Engine

Objetivo:

- tornar o cálculo independente do router atual.

Ações:

- criar parser de eventos;
- criar avaliador;
- criar reprocessador;
- cobrir com testes.

Saída:

- núcleo puro de jornada.

## Phase 4 — API V2

Objetivo:

- disponibilizar criação e leitura de eventos no V2.

Ações:

- endpoints de marcação;
- endpoints de timeline diária;
- endpoints de pendências;
- endpoint de comprovante.

Saída:

- API pronta para UI e dual-run.

## Phase 5 — Dual-Run

Objetivo:

- comparar V2 sem mudar o uso principal.

Ações:

- espelhar ações do legado para o V2;
- gerar divergências;
- construir relatórios de diferença.

Saída:

- visibilidade objetiva de gaps.

## Phase 6 — Employee UI V2

Objetivo:

- liberar novo ponto para piloto controlado.

Ações:

- tela de ponto V2;
- ações por evento;
- feedback de consistência;
- recibo por marcação.

Saída:

- colaborador piloto usando V2.

## Phase 7 — Admin UI V2

Objetivo:

- permitir fechamento e exceções no novo fluxo.

Ações:

- fila gestor/RH;
- revisão;
- ajuste;
- fechamento.

Saída:

- operação RH/gestor viável no V2.

## Phase 8 — Pilot and Hardening

Objetivo:

- validar em operação real.

Ações:

- selecionar empresa/unidade piloto;
- acompanhar divergências;
- corrigir bugs;
- medir fechamento.

Saída:

- go/no-go do cutover.

## Phase 9 — Controlled Cutover

Objetivo:

- migrar escopos aprovados.

Ações:

- ativar V2 por empresa/unidade;
- impedir novas gravações no legado para esse escopo;
- manter histórico legado disponível.

Saída:

- tráfego principal no V2.

## Phase 10 — Legacy Retirement

Objetivo:

- congelar legado e simplificar manutenção.

Ações:

- tornar tabelas/rotas legadas somente leitura;
- remover dependências ativas gradualmente;
- manter exportação histórica enquanto necessário.

Saída:

- legado desativado como fluxo operacional.

---

## Task Breakdown

## Task 1 — Inventário do legado

- [ ] listar telas do ponto atual;
- [ ] listar rotas tRPC do ponto atual;
- [ ] listar tabelas e campos tocados;
- [ ] listar dependências indiretas: banco de horas, pedidos de ajuste, contratos, relatórios.

## Task 2 — Spec detalhada de negócio

- [ ] definir sequência de eventos válida;
- [ ] definir comportamentos inválidos;
- [ ] definir regra para intermitente com e sem ponto;
- [ ] definir papel de cliente/contrato/posto;
- [ ] definir política padrão de intervalo;
- [ ] definir política de evidência.

## Task 3 — Schema V2

- [ ] criar `punch_events`;
- [ ] criar `work_sessions`;
- [ ] criar `journey_evaluations`;
- [ ] criar `journey_evaluation_versions`;
- [ ] criar `time_adjustment_requests`;
- [ ] criar `journey_closures`;
- [ ] criar `employee_receipts`;
- [ ] criar `audit_trail_entries`.

## Task 4 — Core Engine

- [ ] event parser;
- [ ] segment builder;
- [ ] evaluator;
- [ ] inconsistency detector;
- [ ] calculator versioning;
- [ ] tests.

## Task 5 — API de marcação

- [ ] `clockEvent.create`
- [ ] `clockEvent.listDay`
- [ ] `clockEvent.getOpenSession`
- [ ] `clockEvent.getReceipt`
- [ ] `clockEvent.requestAdjustment`

## Task 6 — Dual-run adapter

- [ ] adaptar `clockIn` legado;
- [ ] adaptar `clockOut` legado;
- [ ] espelhar para V2 quando flag ativa;
- [ ] registrar divergências.

## Task 7 — UI colaborador

- [ ] `TimesheetV2`
- [ ] timeline
- [ ] recibo
- [ ] pendências
- [ ] pedido de ajuste

## Task 8 — UI gestor/RH

- [ ] `JourneyAdminV2`
- [ ] fila de inconsistências
- [ ] revisão em lote
- [ ] fechamento mensal
- [ ] comparação legado x V2

## Task 9 — Observabilidade

- [ ] métricas de taxa de divergência;
- [ ] número de pendências;
- [ ] tempo de fechamento;
- [ ] taxa de sessões inválidas;
- [ ] volume de ajustes.

## Task 10 — Cutover e rollback

- [ ] definir checklist de go-live;
- [ ] definir rollback por empresa/unidade;
- [ ] validar leitura histórica no legado;
- [ ] documentar decisão final.

---

## Tests and Verification Strategy

## Testes obrigatórios

- unitários para parser e evaluator;
- integração para APIs V2;
- comparação legado x V2 em cenários equivalentes;
- testes de sequência inválida;
- testes de intermitente;
- testes de múltiplos segmentos no mesmo dia;
- testes de fechamento.

## Testes manuais obrigatórios

- entrada -> intervalo -> retorno -> saída;
- esquecimento de intervalo;
- dupla entrada;
- saída sem entrada;
- marcação fora da jornada;
- ajuste formal;
- visão gestor;
- fechamento mensal.

---

## Cutover Criteria

O V2 só corta o legado quando, no escopo piloto:

- divergência com o legado estiver explicada ou corrigida;
- fechamento mensal puder ser executado integralmente no V2;
- ajustes puderem ser tratados por gestor/RH no V2;
- usuário colaborador conseguir operar sem treinamento excessivo;
- dashboard de saúde indicar estabilidade por período mínimo acordado.

---

## Rollback Strategy

Se o piloto falhar:

- desativar `journey-v2-cutover`;
- manter `journey-v2-dual-run` opcional para investigação;
- voltar gravação oficial ao legado para o escopo;
- preservar dados V2 para diagnóstico;
- emitir relatório de causa do rollback antes de nova tentativa.

Rollback não deve apagar dados V2.

---

## Risks and Guardrails

## Riscos técnicos

- acoplamento precoce ao legado;
- tentativa de refatorar tudo no lugar;
- ausência de versionamento do cálculo;
- UI assumindo regra de negócio.

## Riscos operacionais

- piloto em cliente errado;
- falta de governança de fechamento;
- divergência silenciosa entre os dois motores.

## Riscos de produto

- superestimar escopo do MVP;
- tentar resolver folha inteira junto com ponto;
- transformar evidência antifraude em fricção desnecessária.

## Guardrails

- hotfix no legado permitido; feature nova estrutural, não;
- toda grande mudança atrás de flag;
- toda regra nova com teste;
- toda fase com critério explícito de saída.

---

## Implementation Order Recommendation

Ordem correta:

1. inventário do legado;
2. spec detalhada;
3. schema V2;
4. core engine;
5. API V2;
6. dual-run;
7. UI colaborador;
8. UI gestor/RH;
9. piloto;
10. cutover;
11. congelamento do legado.

Ordem errada:

1. redesenhar tela;
2. trocar fluxo do usuário;
3. adaptar regra depois.

---

## Immediate Next Steps

1. Criar a spec detalhada em `docs/superpowers/specs/2026-07-22-ponto-jornada-redesign.md`.
2. Escrever o inventário do legado e a matriz de dependências.
3. Fechar a modelagem mínima de `punch_events` e `journey_evaluations`.
4. Só então começar implementação.

---

## Final Recommendation

O ponto deve ser reconstruído como um produto novo dentro do monorepo, não como continuação do `timesheet` atual.

O sucesso do redesenho depende menos de código rápido e mais de disciplina:

- separar bruto e tratado;
- manter o legado comparável;
- ativar por fases;
- cortar só quando o novo fluxo provar que fecha a operação.
