# Journey V2 — Technical Schema Proposal

> **Status (July 22, 2026):** Proposta técnica inicial do schema do novo módulo de ponto/jornada.
> - Objetivo: servir como base para implementação do `drizzle/schema-journey-v2.ts`.
> - Este documento ainda não é migration; é o contrato técnico do domínio.

## Purpose

Definir a estrutura persistente mínima do V2 para:

- registrar eventos;
- montar sessões e segmentos;
- calcular jornada;
- tratar ajustes;
- fechar períodos;
- preservar trilha de auditoria.

---

## Design Rules

1. O schema novo não altera semanticamente o legado.
2. O bruto deve existir separado do tratado.
3. O cálculo precisa ser versionável.
4. O ajuste precisa ser rastreável.
5. O V2 deve suportar dual-run.

---

## Table 1 — `journey_punch_events`

### Papel

Tabela central do V2.

Cada linha representa uma marcação individual ou evento equivalente.

### Campos propostos

- `id` — PK
- `employee_id` — FK para funcionário
- `contract_id` — FK para contrato aplicável
- `occurred_at` — timestamp do evento
- `event_type` — enum
- `source` — enum
- `source_reference` — identificador externo/opcional
- `context_client_id` — opcional
- `context_post_id` — opcional
- `context_assignment_ref` — opcional
- `nsr` — inteiro sequencial
- `previous_hash` — varchar(64)
- `event_hash` — varchar(64)
- `timezone` — varchar(64)
- `captured_by_user_id` — FK opcional
- `device_id` — opcional
- `device_fingerprint` — opcional
- `geo_lat` — decimal opcional
- `geo_lng` — decimal opcional
- `geo_accuracy_m` — inteiro opcional
- `selfie_url` — varchar opcional
- `integrity_status` — enum
- `is_shadow_from_legacy` — boolean
- `legacy_time_record_id` — FK lógica/opcional
- `created_at`
- `updated_at`

### `event_type`

Enum inicial:

- `clock_in`
- `break_start`
- `break_end`
- `clock_out`
- `manual_adjustment`
- `imported_event`
- `system_correction`

### `source`

Enum inicial:

- `web`
- `mobile`
- `admin_manual`
- `legacy_shadow`
- `import`
- `api`

### `integrity_status`

Enum inicial:

- `valid`
- `pending_verification`
- `broken_chain`
- `legacy_unverified`

### Índices

- `idx_jpe_employee_occurred_at` on `(employee_id, occurred_at)`
- `idx_jpe_contract_occurred_at` on `(contract_id, occurred_at)`
- `idx_jpe_nsr` unique or near-unique conforme estratégia
- `idx_jpe_event_hash`
- `idx_jpe_legacy_shadow` on `(is_shadow_from_legacy, legacy_time_record_id)`

---

## Table 2 — `journey_work_sessions`

### Papel

Representa uma sessão lógica entre `clock_in` e `clock_out`.

Não é fonte primária; é derivada e atualizável.

### Campos propostos

- `id`
- `employee_id`
- `contract_id`
- `session_date` — data de referência operacional
- `started_at`
- `ended_at`
- `status` — enum
- `first_event_id`
- `last_event_id`
- `context_client_id`
- `context_post_id`
- `generated_from_version` — versão do parser
- `created_at`
- `updated_at`

### `status`

- `open`
- `closed`
- `inconsistent`
- `superseded`

### Índices

- `idx_jws_employee_session_date`
- `idx_jws_status`
- `idx_jws_started_at`

---

## Table 3 — `journey_work_segments`

### Papel

Quebra da sessão em blocos interpretáveis.

Exemplos:

- trabalho ativo;
- intervalo;
- retorno após intervalo.

### Campos propostos

- `id`
- `session_id`
- `employee_id`
- `segment_type`
- `started_at`
- `ended_at`
- `minutes`
- `origin_start_event_id`
- `origin_end_event_id`
- `created_at`

### `segment_type`

- `active_work`
- `break`
- `unknown_gap`
- `manual_segment`

### Índices

- `idx_jsg_session`
- `idx_jsg_employee_started_at`

---

## Table 4 — `journey_policies`

### Papel

Policy master de jornada aplicável ao cálculo.

### Campos propostos

- `id`
- `name`
- `operational_category`
- `requires_time_tracking`
- `break_mode`
- `schedule_type`
- `default_work_days` — json
- `default_start_time`
- `default_end_time`
- `default_break_minutes`
- `tolerance_minutes`
- `hour_bank_enabled`
- `night_shift_enabled`
- `requires_context_binding`
- `allow_multiple_sessions_per_day`
- `allow_cross_post_day`
- `evidence_policy_geo`
- `evidence_policy_selfie`
- `evidence_policy_fingerprint`
- `status`
- `created_at`
- `updated_at`

### `break_mode`

- `explicit_break_required`
- `explicit_break_optional`
- `auto_deduct_legacy_compat`

### `operational_category`

- `clt_padrao`
- `clt_alocado`
- `clt_multiposto`
- `intermitente_com_ponto_condicional`
- `sem_ponto`

---

## Table 5 — `journey_policy_assignments`

### Papel

Atribui policy a funcionário/contrato/contexto.

### Campos propostos

- `id`
- `employee_id`
- `contract_id`
- `client_id`
- `post_id`
- `journey_policy_id`
- `starts_on`
- `ends_on`
- `priority`
- `created_at`

### Regra

Permite sobrescrita por contexto sem alterar o cadastro-base do funcionário.

---

## Table 6 — `journey_evaluations`

### Papel

Estado oficial calculado de uma sessão ou de um dia.

### Campos propostos

- `id`
- `employee_id`
- `session_id` — opcional se avaliação por dia
- `evaluation_scope` — enum
- `reference_date`
- `status`
- `expected_minutes`
- `worked_minutes`
- `delay_minutes`
- `overtime_50_minutes`
- `overtime_100_minutes`
- `night_minutes`
- `hour_bank_credit_minutes`
- `hour_bank_debit_minutes`
- `has_inconsistency`
- `inconsistency_code`
- `computed_version`
- `computed_at`
- `approved_state`
- `approved_by_user_id`
- `approved_at`
- `created_at`
- `updated_at`

### `evaluation_scope`

- `session`
- `day`
- `period`

### `approved_state`

- `pending`
- `approved`
- `rejected`
- `superseded`

### Índices

- `idx_je_employee_reference_date`
- `idx_je_session`
- `idx_je_approved_state`

---

## Table 7 — `journey_evaluation_versions`

### Papel

Histórico de reprocessamento do cálculo.

### Campos propostos

- `id`
- `evaluation_id`
- `version_number`
- `engine_version`
- `input_snapshot_json`
- `output_snapshot_json`
- `trigger_type`
- `triggered_by_user_id`
- `created_at`

### `trigger_type`

- `initial_compute`
- `adjustment`
- `policy_change`
- `legacy_replay`
- `manual_reprocess`

---

## Table 8 — `journey_adjustment_requests`

### Papel

Solicitação formal de ajuste.

### Campos propostos

- `id`
- `employee_id`
- `session_id` — opcional
- `reference_date`
- `request_type`
- `requested_by_user_id`
- `justification`
- `status`
- `requested_payload_json`
- `created_at`
- `updated_at`

### `request_type`

- `missing_clock_in`
- `missing_break_start`
- `missing_break_end`
- `missing_clock_out`
- `wrong_context`
- `manual_correction`

### `status`

- `open`
- `under_review`
- `approved`
- `rejected`
- `cancelled`

---

## Table 9 — `journey_adjustment_decisions`

### Papel

Guarda a decisão formal do gestor/RH.

### Campos propostos

- `id`
- `request_id`
- `decision`
- `decided_by_user_id`
- `decision_notes`
- `applied_payload_json`
- `created_at`

### `decision`

- `approve`
- `reject`
- `return_for_completion`

---

## Table 10 — `journey_receipts`

### Papel

Comprovante persistido por evento ou sessão.

### Campos propostos

- `id`
- `employee_id`
- `event_id`
- `receipt_type`
- `payload_json`
- `pdf_url` — opcional
- `sha256`
- `generated_at`

### `receipt_type`

- `event_receipt`
- `day_summary`
- `period_statement`

---

## Table 11 — `journey_closures`

### Papel

Fechamento de competência.

### Campos propostos

- `id`
- `employee_id`
- `period_start`
- `period_end`
- `status`
- `closed_by_user_id`
- `closed_at`
- `reopened_by_user_id`
- `reopened_at`
- `notes`
- `created_at`
- `updated_at`

### `status`

- `open`
- `under_review`
- `closed`
- `reopened`

---

## Table 12 — `journey_audit_trail`

### Papel

Trilha auditável transversal do módulo.

### Campos propostos

- `id`
- `entity_type`
- `entity_id`
- `action_type`
- `actor_user_id`
- `payload_json`
- `created_at`

### `entity_type`

- `punch_event`
- `work_session`
- `evaluation`
- `adjustment_request`
- `closure`

---

## Legacy Compatibility Hooks

Para dual-run, o schema deve suportar origem do legado:

- `is_shadow_from_legacy`
- `legacy_time_record_id`
- `source = legacy_shadow`

### Regra

Esses campos existem para comparação e migração, não para perpetuar o modelo legado.

---

## Relationships Overview

- `journey_punch_events` -> núcleo bruto
- `journey_work_sessions` deriva de `journey_punch_events`
- `journey_work_segments` deriva de `journey_work_sessions`
- `journey_evaluations` deriva de sessão/dia
- `journey_evaluation_versions` versiona a avaliação
- `journey_adjustment_requests` afeta evento/sessão/dia
- `journey_adjustment_decisions` decide request
- `journey_receipts` documenta evento ou fechamento
- `journey_closures` fecha período
- `journey_audit_trail` registra ações relevantes

---

## Migration Strategy Constraints Reflected in Schema

O schema foi proposto para permitir:

- criação sem tocar no legado;
- preenchimento por espelhamento;
- comparação de comportamento;
- corte por feature flag;
- rollback sem perda de dados.

---

## Explicit Non-Goals in Schema V1

Não incluir ainda:

- modelagem completa de convocação;
- engine sindical avançado em tabela própria;
- suporte a dispositivos físicos específicos;
- billing/produtividade/faturamento por posto;
- prontidão/sobreaviso sofisticados.

---

## Recommended Implementation Order

1. `journey_policies`
2. `journey_policy_assignments`
3. `journey_punch_events`
4. `journey_work_sessions`
5. `journey_work_segments`
6. `journey_evaluations`
7. `journey_evaluation_versions`
8. `journey_adjustment_requests`
9. `journey_adjustment_decisions`
10. `journey_receipts`
11. `journey_closures`
12. `journey_audit_trail`

---

## Immediate Follow-Up

Próximo passo técnico recomendado:

- converter esta proposta em `drizzle/schema-journey-v2.ts`
- mantendo comentários de intenção no schema
- e criando a migration sem conectar nenhuma rota existente
