# RH Prime - Unificação do Ponto no Journey V2 (fonte única, migração segura)

> **Status (2026-07-24):** Plano de execução. Aguardando revisão antes de qualquer `git checkout -b`.
> - Deriva de: `2026-07-22-redesenho-ponto-e-jornada.md`, `2026-07-22-app-colaborador-ponto-execution-backlog.md`, specs `2026-07-22-ponto-jornada-redesign.md`.
> - Objetivo: acabar com a arquitetura dividida do ponto (entrada/saída no legado, intervalo no V2) e ter **uma fonte única de verdade** = `journey_punch_events`, sem corte direto.

---

## Problema (verificado em prod, 2026-07-24)

| Fato | Valor |
|---|---|
| Tabelas `journey_*` | 12 (setupPilot já rodou) |
| `journey_policies` / `journey_policy_assignments` | 1 política piloto / 2 vínculos |
| `journey_punch_events` | 0 (V2 nunca usado) |
| `time_records` (legado) | 9 registros em uso |
| `employees` | 2 |
| Flags `JOURNEY_V2_API_ENABLED` / `VITE_JOURNEY_V2_API_ENABLED` | OFF no Vercel |

`client/src/app-mobile/pages/AppTimesheetHome.tsx`:
- entrada/saída → `trpc.timesheet.clockIn/clockOut` → grava em `time_records`;
- intervalo → `trpc.journeyV2.registerPunchEvent` → grava em `journey_punch_events`;
- a UI V2 (timeline, `openSession`, botão de intervalo, "Hoje") **lê** de `journey_punch_events`.

Consequência: ligar o V2 hoje **quebra** — sem `clock_in` no V2 a sessão nunca abre, o botão de intervalo nunca aparece, a timeline fica `--:--`. "Ligar 4 batidas" não é flipar flag.

---

## Princípios (right-sized para 2 funcionários)

Adotados (alto valor / baixo custo):
1. **Dual-write** como ponte: durante a transição a batida grava nos dois lados e a paridade é verificada — nada de corte direto.
2. **Fonte única = `journey_punch_events`**; legado vira sombra/histórico.
3. **Rollback por flag** (grátis): legado fica intacto; desligar a flag volta o comportamento na hora.
4. **Migração dos 9 registros** como eventos-sombra (schema já tem `is_shadow_from_legacy` + `legacy_time_record_id`), com trilha em `journey_audit_trail`.
5. **Política dirige as batidas** (não hardcodar 4): `journey_policies.break_mode` / `default_break_minutes` / `requires_time_tracking`.
6. **Gating granular por usuário**: reaproveitar `COLLABORATOR_APP_ALLOWED_ROLES/EMAILS/USER_IDS`.
7. **Testes de paridade** no vitest.

Right-size / fora de escopo agora (enterprise para milhares de users, exagero para 2):
- Painel de reconciliação com UI dedicada → começar com **query de diff** / report admin.
- Infra de métricas/alertas dia 0 → usar telemetria Umami existente + logs.
- Framework formal de versionamento/sunset de API → routers `timesheet` (v1) e `journeyV2` (v2) já são a separação; sunset é decisão pós-paridade.

---

## Fases

### Fase 0 - Rede de segurança (sem mudança de comportamento)
**Objetivo:** travar o comportamento legado atual em teste antes de mexer.
- Arquivos:
  - `server/routers/timesheet.test.ts` (estender: entrada abre registro, saída fecha, `getOpenRecord`).
  - `docs/.../rollback.md` (curto): rollback = flags OFF.
- Testar: `pnpm test` verde; fluxo 2-batidas legado coberto.
- Rollback: n/a (só testes).

### Fase 1 - Ponte dual-write (server-side)
**Objetivo:** `clock_in`/`clock_out` passam a gravar também em `journey_punch_events`, sem o app mudar.
- Decisão: dual-write **no servidor** (um lugar, os dois stores sempre em sincronia, independe do cliente).
- Arquivos:
  - `server/routers/timesheet.ts` — após `clockIn`/`clockOut`, emitir o punch event V2 correspondente.
  - `server/modules/journey-v2/service.ts` — reusar `registerJourneyPunchEventForUser` (mapear clock_in/clock_out).
  - `server/_core/feature-flags.ts` — flag `JOURNEY_DUAL_WRITE` (default off).
  - `server/modules/journey-v2/pilot-setup.ts` — garantir política/vínculo do funcionário antes do 1º evento (idempotente, já existe).
- Testar:
  - após `clockIn` com dual-write on, existe 1 row em `journey_punch_events` com `event_type=clock_in`, `is_shadow_from_legacy=0`, timestamp igual;
  - `pnpm test` (paridade timestamp legado x V2);
  - dual-write off → comportamento idêntico ao atual.
- Rollback: `JOURNEY_DUAL_WRITE=off`.

### Fase 2 - Backfill dos dados existentes
**Objetivo:** os 9 `time_records` viram eventos-sombra no V2.
- Arquivos:
  - `scripts/backfill-journey-from-timerecords.mjs` (novo; usa `DATABASE_URL`; idempotente por `legacy_time_record_id`).
  - `scripts/verify-backfill.mjs` (novo; ou flag `--verify` no mesmo script).
- Passos: por registro, criar `clock_in` (+`clock_out` se fechado) com `is_shadow_from_legacy=1`, `legacy_time_record_id=<id>`, `integrity_status='legacy_unverified'`; log em `journey_audit_trail`.
- **Validação pós-backfill (obrigatória):** rodar o verify e assertar, senão aborta/alerta "backfill incompleto":
  - `COUNT(DISTINCT legacy_time_record_id) FROM journey_punch_events WHERE is_shadow_from_legacy=1` **==** `COUNT(*) FROM time_records` (hoje 9);
  - total de eventos-sombra **==** (nº de `clock_in` esperado + nº de `clock_out` esperado, i.e. registros fechados);
  - zero `time_records.id` sem evento-sombra correspondente.
- Testar: rodar em dev/cópia; verify passa; **rerun não duplica** (verify continua batendo).
- Rollback: `DELETE FROM journey_punch_events WHERE is_shadow_from_legacy=1` (script reverso).

### Fase 3 - App lê V2 como verdade (ainda dual-writing)
**Objetivo:** ligar V2 para piloto; timeline/intervalo funcionam porque `clock_in` agora existe no V2.
- Arquivos:
  - `client/src/app-mobile/config.ts` / `AppTimesheetHome.tsx` — sem hardcode; intervalo aparece via `openSession` real.
  - Vercel env: `VITE_JOURNEY_V2_API_ENABLED=true` + `JOURNEY_V2_API_ENABLED=true` (produção) — redeploy.
  - Gating por user: `COLLABORATOR_APP_ALLOWED_USER_IDS` / `_EMAILS` para o piloto.
- Testar (piloto, 1 funcionário real): entrada → intervalo → retorno → saída; `journeyV2.getDayTimeline` correto; `time_records` e `journey_punch_events` concordam.
- Rollback: `VITE_JOURNEY_V2_API_ENABLED=false` + redeploy → volta pro 2-batidas legado.

### Fase 4 - Batidas dirigidas por política
**Objetivo:** intervalo obrigatório/opcional vem da política, não do código.
- Arquivos:
  - `server/modules/journey-v2/service.ts` — `getTodayStatus` expõe `break_mode` da política vigente.
  - `AppTimesheetHome.tsx` — mostra/esconde intervalo conforme política.
- Testar: política com `explicit_break_optional` vs `explicit_break_required` → UI e validação mudam.
- Rollback: default = comportamento atual (intervalo opcional).

### Fase 5 - Reconciliação leve + decisão de corte
**Objetivo:** provar paridade e decidir quando V2 vira autoritativo.
- Arquivos:
  - `server/routers/journey-v2.ts` — proc admin `reconcileLegacyVsV2` (diff simples, sem UI nova).
- Passos: relatório legado x V2 por dia/funcionário; quando 0 divergências por N dias, decidir parar dual-write ou manter legado como sombra pura.
- Testar: relatório = 0 divergências no piloto.
- Rollback: manter dual-write (estado estável) até decisão.

---

## Ordem de execução

`Fase 0 → 1 → 2 → 3 → 4 → 5`. Cada fase é um PR pequeno, atrás de flag, com rollback próprio. Nada de big-bang.

## Branch

`git checkout -b feat/ponto-unificacao-journey-v2` (só após teu aval). Um commit por fase.

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Dual-write divergir | teste de paridade (F1) + reconciliação (F5) |
| Backfill duplicar | idempotente por `legacy_time_record_id` (F2) |
| V2 quebrar app no piloto | flag por user + rollback 1-flag (F3) |
| Política errada travar batida | default seguro = intervalo opcional (F4) |
| Regressão no legado | rede de testes da F0 |

## Fora de escopo (adiado por escala)
Painel de reconciliação com UI; infra de métricas/alertas; framework de sunset de API. Reavaliar após piloto estável.
