# Ponto Legado — Inventory and Dependency Map

> **Status (July 22, 2026):** Inventário técnico do módulo legado de ponto.
> - Objetivo: mapear o que existe hoje, o que depende do legado e o que precisa ser protegido durante o redesenho.
> - Documento de apoio ao plano mestre e à spec do V2.

## Purpose

Identificar, com precisão suficiente para migração segura:

- entidades legadas;
- rotas legadas;
- telas legadas;
- cálculos legados;
- integrações e dependências;
- pontos de acoplamento com RH/DP.

---

## Legacy Domain Summary

O legado do ponto gira em torno de uma entidade agregada de jornada:

- `time_records`

e de estruturas auxiliares:

- `overtime_records`
- `compliance_exports`
- `time_bank` / movimentação de banco de horas já existente no domínio geral

O desenho atual assume que uma jornada é registrada principalmente como:

- entrada (`clockIn`)
- saída (`clockOut`)
- cálculo posterior

Isso significa que o legado já mistura:

- registro bruto;
- interpretação da jornada;
- aprovação;
- exportação de compliance;
- geração de saldo de banco.

---

## Database Inventory

## Core tables

### `time_records`

Arquivo: [`drizzle/schema.ts`](C:/Finhub/drizzle/schema.ts:680)

Campos relevantes:

- `employeeId`
- `clockIn`
- `clockOut`
- `hoursWorked`
- `location`
- `notes`
- `status`
- `approvedById`
- `approvedAt`
- `updatedById`
- `nsr`
- `previousHash`
- `recordHash`
- `selfieUrl`
- `geofenceStatus`
- `deviceFingerprint`

Leitura:

- tabela central do legado;
- representa uma jornada agregada, não eventos individuais;
- `nsr/hash` existem, mas sobre o modelo agregado.

### `overtime_records`

Arquivo: [`drizzle/schema.ts`](C:/Finhub/drizzle/schema.ts:738)

Uso:

- pedidos e aprovação de hora extra derivados do `time_record`;
- depende de `timeRecordId`.

Impacto no redesign:

- forte acoplamento ao modelo legado;
- deverá ser desacoplado no V2.

### `compliance_exports`

Arquivo: [`drizzle/schema.ts`](C:/Finhub/drizzle/schema.ts:714)

Uso:

- guarda metadados de exportações AFD/AFDT/ACJEF.

Impacto no redesign:

- pode continuar existindo como catálogo de exportações;
- o conteúdo exportado precisará mudar quando o V2 virar fonte oficial.

---

## Backend Route Inventory

## Router principal do ponto

Arquivo: [`server/routers/timesheet.ts`](C:/Finhub/server/routers/timesheet.ts:31)

Rotas existentes:

- `uploadSelfie`
- `clockIn`
- `clockOut`
- `getOpenRecord`
- `listRecords`
- `monthlySummary`
- `requestOvertime`
- `listOvertimeRequests`
- `approveOvertime`
- `preauthorizeOvertime`
- `listAuthorizations`
- `bulkApprove`
- `report`
- `evaluate`
- `overtimeStats`

### Leitura funcional

O router atual faz, ao mesmo tempo:

- captura de marcação;
- captura de evidência;
- consulta operacional;
- cálculo;
- aprovação;
- pré-autorização;
- geração de relatório;
- saldo de extra.

Isto confirma que o legado é um router “inchado” do ponto de vista de domínio.

## Router de compliance

Arquivo: [`server/routers/compliance-portaria.ts`](C:/Finhub/server/routers/compliance-portaria.ts:1)

Rotas existentes:

- `list`
- `generateAfd`
- `generateAfdt`
- `generateAcjef`
- `verifyChain`

### Leitura funcional

- o compliance atual deriva da tabela agregada `time_records`;
- a verificação de cadeia recompõe hash usando `clockIn` como referência principal;
- não há modelo independente de evento bruto.

---

## DB Function Inventory

Arquivo: [`server/db.ts`](C:/Finhub/server/db.ts:2210)

Funções legadas de ponto:

- `createTimeRecord`
- `listTimeRecords`
- `getTimeRecord`
- `getOpenTimeRecord`
- `updateTimeRecord`
- `getMonthlyTimeSummary`
- `createOvertimeRequest`
- `listOvertimeRequests`
- `findOvertimeAuthorizationFor`
- `createTimeBankEntry`
- `getTimesheetReport`

### Observações

#### `createTimeRecord`

- cria registro agregado;
- gera `nsr`, `previousHash`, `recordHash`;
- o hash é calculado como `type: "IN"`;
- não existe criação independente de evento de saída.

#### `getOpenTimeRecord`

- considera “aberto” qualquer `time_record` com `clockOut` nulo;
- confirma o modelo de sessão única agregada.

#### `updateTimeRecord`

- atualiza o mesmo row com a saída e os dados tratados;
- reforça que o bruto não é separado do tratado.

#### `getMonthlyTimeSummary`

- soma horas com base em diferença entre `clockIn` e `clockOut`;
- hoje devolve `overtimeHours`, `absences` e `delays` zerados no cálculo consolidado;
- isto mostra que o resumo mensal ainda é simplificado.

---

## Calculation Inventory

Arquivo: [`server/utils/journey-engine.ts`](C:/Finhub/server/utils/journey-engine.ts:1)

O motor atual recebe:

- `clockIn`
- `clockOut`
- `ScheduleRule`

e retorna:

- `expectedMinutes`
- `workedMinutes`
- `delayMinutes`
- `overtime`
- `hourBank`
- `notes`

### Pontos fortes

- já existe um módulo de cálculo relativamente isolado;
- já suporta atraso, extra, noturno e banco de horas;
- já lê regra a partir do contrato.

### Limites

- opera sobre uma jornada agregada, não sobre eventos;
- o intervalo é tratado por desconto de `lunchBreakMinutes`;
- não há parser de sequência de marcações;
- múltiplos segmentos não fazem parte do modelo.

---

## Frontend Inventory

## Colaborador

Arquivo: [`client/src/pages/Timesheet.tsx`](C:/Finhub/client/src/pages/Timesheet.tsx:1)

Funções existentes:

- registrar entrada;
- registrar saída;
- capturar geolocalização;
- capturar selfie;
- exibir jornada do dia;
- mostrar “intervalo” e “retorno” apenas como placeholders;
- listar registros do mês;
- copiar comprovante operacional;
- solicitar ajuste via Inbox.

### Limite central

- a UI já insinua um modelo com intervalo, mas o backend não sustenta isso de forma nativa.

## Gestor/RH

Arquivo: [`client/src/pages/JourneyAdmin.tsx`](C:/Finhub/client/src/pages/JourneyAdmin.tsx:1)

Funções existentes:

- espelho por funcionário e período;
- aprovação em massa de pendências;
- pré-autorização de horas extras.

### Limite central

- a visão administrativa trabalha em cima do mesmo modelo agregado;
- não existe fila de eventos, pendências de sequência ou sessões incompletas por evento.

## Compliance

Arquivo: [`client/src/pages/CompliancePortaria.tsx`](C:/Finhub/client/src/pages/CompliancePortaria.tsx:1)

Funções existentes:

- gerar AFD;
- gerar AFDT;
- gerar ACJEF;
- verificar cadeia.

---

## Cross-Domain Dependencies

## Contratos

O cálculo atual depende do contrato mais recente do funcionário:

- `scheduleType`
- `workDays`
- `startTime`
- `endTime`
- `lunchBreakMinutes`
- `toleranceMinutes`
- `hourBankEnabled`
- `nightShiftEnabled`

Arquivo base: [`drizzle/schema.ts`](C:/Finhub/drizzle/schema.ts:154)

## Vínculo usuário-funcionário

O ponto depende do vínculo entre usuário autenticado e funcionário ativo.

## Banco de horas

O legado já cria movimentação automática de banco no `clockOut`.

Risco:

- no V2, isso precisará acontecer no fechamento/cálculo com separação melhor entre bruto e tratado.

## Horas extras

O legado já cria pedido de hora extra derivado da jornada.

Risco:

- hoje o pedido nasce acoplado a `timeRecordId`.

## Inbox / ajuste

A UI do colaborador já usa o Inbox como rota de ajuste.

Risco:

- é preciso decidir se o V2 mantém ajuste no Inbox ou cria domínio próprio com integração posterior.

---

## Legacy Strengths to Reuse

- vínculo usuário-funcionário;
- captura opcional de evidências;
- rule engine inicial baseado em contrato;
- noção de aprovação administrativa;
- pré-autorização de hora extra;
- base de exportação e rastreio de compliance;
- fluxo administrativo inicial já conhecido pela operação.

---

## Legacy Weaknesses to Replace

- jornada como row agregado;
- intervalo implícito;
- bruto e tratado na mesma entidade;
- resumo mensal simplificado;
- overtime acoplado a `timeRecordId`;
- compliance derivado de modelo não event-driven;
- inexistência de timeline de eventos;
- inexistência de estados formais de sessão.

---

## Migration Protection Checklist

Estes pontos precisam ser preservados enquanto o V2 nasce:

- `timesheet.clockIn`
- `timesheet.clockOut`
- `timesheet.getOpenRecord`
- `timesheet.listRecords`
- `timesheet.monthlySummary`
- `timesheet.report`
- `timesheet.bulkApprove`
- `timesheet.preauthorizeOvertime`
- exportações de compliance atuais

### Regra

Nenhum destes fluxos pode ser removido antes de existir:

- equivalente no V2;
- comparação objetiva de comportamento;
- plano de rollback.

---

## Main Technical Conclusions

1. O legado não é um motor de eventos; é um motor de jornada agregada.
2. O cálculo atual é parcialmente reaproveitável conceitualmente, mas não estruturalmente.
3. O redesenho não deve tentar “esticar” `time_records`.
4. O maior ponto de compatibilidade é o contrato.
5. O maior ponto de risco é a falsa equivalência entre row legado e timeline real de eventos.

---

## Immediate Follow-Up

Próximo artefato técnico:

- proposta de schema V2 com tabelas, campos, enums e índices

Este documento deve ser lido junto com:

- `docs/superpowers/plans/2026-07-22-redesenho-ponto-e-jornada.md`
- `docs/superpowers/specs/2026-07-22-ponto-jornada-redesign.md`
