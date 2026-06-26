# Relatórios Gerenciais — MVP (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o fluxo manual completo de Relatórios Gerenciais — criar relatório a partir de template, preencher itens e seções, enviar e validar/devolver — fiel ao PDF e encaixado na stack do rh-prime.

**Architecture:** Módulo isolado. Schema próprio (`drizzle/schema-managerial-reports.ts`, 2 tabelas) re-exportado pelo `drizzle/schema.ts`. Catálogo de templates em config TS (não no banco). Helpers de período puros e testáveis. Acesso a dados num módulo dedicado. Router tRPC `managerialReports` registrado no `appRouter`. Página React em `/relatorios-gerenciais`. Sem nomes de funcionário em lugar nenhum — papéis: autor (responsável do setor), validador (gestor/admin).

**Tech Stack:** Drizzle ORM (MySQL), tRPC v11, Zod v4, React 19 + Vite + shadcn/ui + wouter, Vitest.

**Fora deste plano (Phases 2–3, planos próprios):** materialização automática (scheduler), carry-over entre períodos, notificações, geração do "resumido", dashboard de tendências/índice no prazo, setor Financeiro na UI, aba Vencimentos. As colunas/keys necessárias já nascem aqui para evitar migrations futuras.

**Spec de referência:** `docs/superpowers/specs/2026-06-26-relatorios-gerenciais-design.md`

---

## File Structure

- Create: `drizzle/schema-managerial-reports.ts` — 2 tabelas (`mr_reports`, `mr_report_items`) + tipos.
- Modify: `drizzle/schema.ts` — re-export do novo schema.
- Create: `drizzle/0032_managerial_reports.sql` — migration gerada por `drizzle-kit`.
- Create: `server/modules/managerial-reports/templates.ts` — catálogo dos 6 templates (config).
- Create: `server/modules/managerial-reports/templates.test.ts` — integridade do catálogo.
- Create: `server/modules/managerial-reports/period.ts` — helpers de período (puros + due date).
- Create: `server/modules/managerial-reports/period.test.ts` — round-trips de período.
- Create: `server/modules/managerial-reports/view.ts` — derivações puras (atraso, rollup de itens).
- Create: `server/modules/managerial-reports/view.test.ts` — testes das derivações.
- Create: `server/modules/managerial-reports/db.ts` — acesso a dados (Drizzle).
- Create: `server/routers/managerial-reports.ts` — router tRPC.
- Create: `server/routers/managerial-reports.test.ts` — autorização (sem DB).
- Modify: `server/routers.ts` — import + registro `managerialReports`.
- Create: `client/src/pages/ManagerialReports.tsx` — página (lista + criar + editor + validar).
- Modify: `client/src/App.tsx` — lazy import + Route.
- Modify: `client/src/components/DashboardLayout.tsx` — link na sidebar.

---

## Task 1: Schema das tabelas + migration

**Files:**
- Create: `drizzle/schema-managerial-reports.ts`
- Modify: `drizzle/schema.ts:1178` (após `export * from "./schema-kanban.js";`)
- Create: `drizzle/0032_managerial_reports.sql` (gerado)

- [ ] **Step 1: Criar o arquivo de schema**

Create `drizzle/schema-managerial-reports.ts`:

```ts
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  boolean,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ============================================================
// MR_REPORTS (Relatórios Gerenciais — uma entrega por período)
// ============================================================
export const mrReports = mysqlTable(
  "mr_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    templateKey: varchar("template_key", { length: 48 }).notNull(),
    sector: mysqlEnum("sector", ["rh_admin", "financeiro"]).notNull(),
    cadence: mysqlEnum("cadence", ["semanal", "mensal"]).notNull(),
    periodRef: varchar("period_ref", { length: 10 }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    authorId: int("author_id").notNull(),
    status: mysqlEnum("status", ["rascunho", "enviado", "validado", "devolvido"])
      .default("rascunho")
      .notNull(),
    wasOnTime: boolean("was_on_time"),
    summary: text("summary"),
    pointsForValidator: text("points_for_validator"),
    nextPriorities: text("next_priorities"),
    submittedAt: timestamp("submitted_at"),
    validatedAt: timestamp("validated_at"),
    validatedBy: int("validated_by"),
    rejectionNote: text("rejection_note"),
    lockedSnapshot: json("locked_snapshot"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    periodUnique: uniqueIndex("uq_mr_reports_period").on(
      table.sector,
      table.cadence,
      table.periodRef,
    ),
    authorIdx: index("idx_mr_reports_author").on(table.authorId),
    statusIdx: index("idx_mr_reports_status").on(table.status),
  }),
);

export type MrReport = typeof mrReports.$inferSelect;
export type InsertMrReport = typeof mrReports.$inferInsert;

// ============================================================
// MR_REPORT_ITEMS (Itens estruturados de cada relatório)
// ============================================================
export const mrReportItems = mysqlTable(
  "mr_report_items",
  {
    id: int("id").autoincrement().primaryKey(),
    reportId: int("report_id").notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    expectedContent: text("expected_content"),
    value: text("value"),
    itemStatus: mysqlEnum("item_status", ["pendente", "em_andamento", "concluido"])
      .default("pendente")
      .notNull(),
    carriedOver: boolean("carried_over").default(false).notNull(),
    sortOrder: int("sort_order").default(0).notNull(),
  },
  (table) => ({
    reportIdx: index("idx_mr_items_report").on(table.reportId),
  }),
);

export type MrReportItem = typeof mrReportItems.$inferSelect;
export type InsertMrReportItem = typeof mrReportItems.$inferInsert;
```

- [ ] **Step 2: Re-exportar no schema agregado**

In `drizzle/schema.ts`, after the line `export * from "./schema-kanban.js";` (line 1178), add:

```ts
export * from "./schema-managerial-reports.js";
```

- [ ] **Step 3: Verificar tipos**

Run: `pnpm check`
Expected: PASS (sem erros novos de TypeScript).

- [ ] **Step 4: Gerar a migration**

Run: `pnpm exec drizzle-kit generate`
Expected: cria `drizzle/0032_managerial_reports.sql` com `CREATE TABLE mr_reports` e `CREATE TABLE mr_report_items`. Abrir o arquivo e confirmar que só contém essas duas tabelas (não deve mexer em outras).

- [ ] **Step 5: Commit**

```bash
git add drizzle/schema-managerial-reports.ts drizzle/schema.ts drizzle/0032_managerial_reports.sql
git commit -m "feat(mr): add managerial reports schema and migration"
```

---

## Task 2: Catálogo de templates (config TS)

**Files:**
- Create: `server/modules/managerial-reports/templates.ts`
- Test: `server/modules/managerial-reports/templates.test.ts`

- [ ] **Step 1: Escrever o teste de integridade do catálogo**

Create `server/modules/managerial-reports/templates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { REPORT_TEMPLATES, getTemplate, STORED_TEMPLATE_KEYS } from "./templates.js";

describe("REPORT_TEMPLATES", () => {
  it("tem keys únicas", () => {
    const keys = REPORT_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("todo template tem ao menos 1 item", () => {
    for (const t of REPORT_TEMPLATES) {
      expect(t.items.length).toBeGreaterThan(0);
    }
  });

  it("todo item tem label e expectedContent não vazios", () => {
    for (const t of REPORT_TEMPLATES) {
      for (const item of t.items) {
        expect(item.label.trim().length).toBeGreaterThan(0);
        expect(item.expectedContent.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("getTemplate resolve por key e retorna undefined p/ inexistente", () => {
    expect(getTemplate("rh_admin.semanal.detalhado")?.sector).toBe("rh_admin");
    expect(getTemplate("inexistente")).toBeUndefined();
  });

  it("STORED_TEMPLATE_KEYS são detalhado/mensal (nunca resumido)", () => {
    for (const key of STORED_TEMPLATE_KEYS) {
      expect(getTemplate(key)?.variant).not.toBe("resumido");
    }
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `pnpm test server/modules/managerial-reports/templates.test.ts`
Expected: FAIL — "Cannot find module './templates.js'".

- [ ] **Step 3: Implementar o catálogo**

Create `server/modules/managerial-reports/templates.ts`:

```ts
export type Sector = "rh_admin" | "financeiro";
export type Cadence = "semanal" | "mensal";
export type Variant = "detalhado" | "resumido" | "mensal";

export interface TemplateItemDef {
  label: string;
  expectedContent: string;
}

export interface ReportTemplate {
  key: string;
  sector: Sector;
  cadence: Cadence;
  variant: Variant;
  title: string;
  items: TemplateItemDef[];
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    key: "rh_admin.semanal.detalhado",
    sector: "rh_admin",
    cadence: "semanal",
    variant: "detalhado",
    title: "RH Administrativo — Semanal detalhado",
    items: [
      { label: "Admissões da semana", expectedContent: "Nome, função, cliente/local, data de início e status da documentação" },
      { label: "Rescisões/desligamentos", expectedContent: "Nome, motivo, data, pendências e documentos necessários" },
      { label: "Contratos pendentes", expectedContent: "Contratos a emitir, assinar, atualizar ou regularizar" },
      { label: "Documentação pendente", expectedContent: "Colaboradores/prestadores com documentos faltando ou incompletos" },
      { label: "Controle de ponto/assinaturas", expectedContent: "Faltas de assinatura, divergências, dias pendentes, info aguardando líder/operacional" },
      { label: "Demandas administrativas recebidas", expectedContent: "Demandas da semana, status, responsável e prazo de retorno" },
      { label: "Pendências com líderes", expectedContent: "Info, assinaturas, documentos ou confirmações que dependem dos líderes operacionais" },
      { label: "Problemas da semana", expectedContent: "Atrasos, falhas, retrabalho, falta de info, documentos incorretos" },
      { label: "Prioridade da próxima semana", expectedContent: "O que precisa ser resolvido primeiro na semana seguinte" },
    ],
  },
  {
    key: "rh_admin.semanal.resumido",
    sector: "rh_admin",
    cadence: "semanal",
    variant: "resumido",
    title: "RH Administrativo — Semanal resumido",
    items: [
      { label: "Admissões realizadas", expectedContent: "Quantidade e nomes principais" },
      { label: "Desligamentos realizados", expectedContent: "Quantidade e nomes principais" },
      { label: "Contratos pendentes", expectedContent: "Quantidade e motivo da pendência" },
      { label: "Documentos pendentes", expectedContent: "Quantidade, nomes e prazo para regularização" },
      { label: "Demandas concluídas", expectedContent: "Quantidade e resumo das principais entregas" },
      { label: "Demandas em atraso", expectedContent: "Quantidade, motivo do atraso e ação necessária" },
    ],
  },
  {
    key: "rh_admin.mensal",
    sector: "rh_admin",
    cadence: "mensal",
    variant: "mensal",
    title: "RH Administrativo — Mensal",
    items: [
      { label: "Admissões do mês", expectedContent: "Quantidade total, nomes, funções, clientes/locais e datas de início" },
      { label: "Desligamentos do mês", expectedContent: "Quantidade total, nomes, motivos, clientes/locais e pendências finais" },
      { label: "Colaboradores/prestadores ativos", expectedContent: "Quantidade por cliente, setor ou operação" },
      { label: "Contratos emitidos", expectedContent: "Qtd. emitida, qtd. assinada e contratos pendentes de assinatura/ajuste" },
      { label: "Pendências documentais", expectedContent: "Quem está irregular/incompleto, com prazo de regularização" },
      { label: "Vencimento de documentos", expectedContent: "Documentos a vencer no mês: ASO, exames, certificados, treinamentos, integrações" },
      { label: "Controle de vencimentos de certidões", expectedContent: "Certidões da empresa com validade, status, responsável e prazo" },
      { label: "Atestados, faltas e ausências", expectedContent: "Quantidade, principais ocorrências e situações que exigem acompanhamento" },
      { label: "Demandas concluídas no mês", expectedContent: "Total finalizado e resumo das principais entregas" },
      { label: "Demandas pendentes p/ próximo mês", expectedContent: "Demandas em aberto, motivo, responsável e prazo previsto" },
      { label: "Problemas recorrentes", expectedContent: "Falha de documentos, atrasos, erros de info, falhas de comunicação, retrabalho" },
      { label: "Plano de melhoria", expectedContent: "Ações sugeridas para corrigir falhas e melhorar o processo" },
    ],
  },
  {
    key: "financeiro.semanal.detalhado",
    sector: "financeiro",
    cadence: "semanal",
    variant: "detalhado",
    title: "Financeiro — Semanal detalhado",
    items: [
      { label: "Notas fiscais emitidas", expectedContent: "Cliente, competência, valor, vencimento e status de envio" },
      { label: "Boletos emitidos", expectedContent: "Cliente, valor, vencimento, data de envio e confirmação" },
      { label: "Contas a receber", expectedContent: "Valores recebidos, a vencer, vencidos e pendentes de baixa" },
      { label: "Cobranças realizadas", expectedContent: "Cliente, data, forma de contato e retorno recebido" },
      { label: "Contas a pagar", expectedContent: "Pagamentos feitos, pendentes e vencimentos próximos" },
      { label: "Conciliação bancária", expectedContent: "O que foi conciliado e o que ficou pendente de identificação/baixa" },
      { label: "Medições em andamento", expectedContent: "Cliente, período, valor previsto, status de conferência e pendências" },
      { label: "Fechamento quinzenal de medição", expectedContent: "Medições fechadas, conferidas, enviadas, aguardando aprovação ou pendentes" },
      { label: "Pendências financeiras", expectedContent: "Valores sem baixa, boletos vencidos, comprovantes faltantes, divergências" },
      { label: "Prioridades da próxima semana", expectedContent: "Cobranças, emissões, pagamentos, conferências ou ajustes urgentes" },
    ],
  },
  {
    key: "financeiro.semanal.resumido",
    sector: "financeiro",
    cadence: "semanal",
    variant: "resumido",
    title: "Financeiro — Semanal resumido",
    items: [
      { label: "Total faturado na semana", expectedContent: "Valor total e principais clientes faturados" },
      { label: "Total recebido na semana", expectedContent: "Valor total recebido, clientes e datas" },
      { label: "Total em aberto", expectedContent: "A receber, separado entre a vencer e vencidos" },
      { label: "Notas e boletos emitidos", expectedContent: "Quantidade e principais emissões da semana" },
      { label: "Cobranças realizadas", expectedContent: "Quantidade e clientes cobrados" },
      { label: "Medições fechadas e pendentes", expectedContent: "Quantidade, cliente, período e status" },
    ],
  },
  {
    key: "financeiro.mensal",
    sector: "financeiro",
    cadence: "mensal",
    variant: "mensal",
    title: "Financeiro — Mensal",
    items: [
      { label: "Faturamento do mês", expectedContent: "Cliente, competência, valor, vencimento e status de envio" },
      { label: "Recebimentos do mês", expectedContent: "Cliente, valor, data, forma de pagamento e baixa realizada" },
      { label: "Valores em aberto", expectedContent: "Clientes que não pagaram, valor, vencimento e situação" },
      { label: "Valores vencidos", expectedContent: "Cliente, valor, dias em atraso, histórico de cobrança e próximos passos" },
      { label: "Contas pagas", expectedContent: "Principais pagamentos do mês, por categoria/fornecedor" },
      { label: "Contas pendentes", expectedContent: "Pagamentos adiados para o próximo mês e motivo" },
      { label: "Conciliação bancária", expectedContent: "Status geral e pendências de identificação/baixa" },
      { label: "Medições fechadas", expectedContent: "Cliente, período, valor, status de conferência, envio e aprovação" },
      { label: "Medições pendentes", expectedContent: "O que ainda não foi fechado, aprovado ou ajustado" },
      { label: "Notas/boletos cancelados ou corrigidos", expectedContent: "Motivo, cliente, valor e nova emissão" },
      { label: "Problemas recorrentes", expectedContent: "Atraso de cliente, falta de comprovante, divergência, erro em boleto/nota, retrabalho" },
      { label: "Prioridades do próximo mês", expectedContent: "Cobranças, conferências, emissões, pagamentos, ajustes de medição" },
    ],
  },
];

// Apenas templates que viram relatório armazenado (resumido é gerado, não armazenado)
export const STORED_TEMPLATE_KEYS = [
  "rh_admin.semanal.detalhado",
  "rh_admin.mensal",
  "financeiro.semanal.detalhado",
  "financeiro.mensal",
] as const;

const BY_KEY = new Map(REPORT_TEMPLATES.map((t) => [t.key, t]));

export function getTemplate(key: string): ReportTemplate | undefined {
  return BY_KEY.get(key);
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `pnpm test server/modules/managerial-reports/templates.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add server/modules/managerial-reports/templates.ts server/modules/managerial-reports/templates.test.ts
git commit -m "feat(mr): add report template catalog from PDF models"
```

---

## Task 3: Helpers de período

**Files:**
- Create: `server/modules/managerial-reports/period.ts`
- Test: `server/modules/managerial-reports/period.test.ts`

- [ ] **Step 1: Escrever os testes (round-trip, sem datas hardcoded frágeis)**

Create `server/modules/managerial-reports/period.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { fridayOfIsoWeek, isoWeekRef, firstDayOfNextMonth, monthRef } from "./period.js";

describe("period helpers", () => {
  it("fridayOfIsoWeek retorna sempre uma sexta (UTC)", () => {
    expect(fridayOfIsoWeek("2026-W26").getUTCDay()).toBe(5);
    expect(fridayOfIsoWeek("2026-W01").getUTCDay()).toBe(5);
    expect(fridayOfIsoWeek("2025-W52").getUTCDay()).toBe(5);
  });

  it("isoWeekRef ∘ fridayOfIsoWeek é identidade", () => {
    for (const ref of ["2026-W01", "2026-W26", "2026-W52", "2025-W10"]) {
      expect(isoWeekRef(fridayOfIsoWeek(ref))).toBe(ref);
    }
  });

  it("firstDayOfNextMonth avança o mês (e o ano em dezembro)", () => {
    const jun = firstDayOfNextMonth("2026-06");
    expect(jun.getUTCFullYear()).toBe(2026);
    expect(jun.getUTCMonth()).toBe(6); // julho (0-indexed)
    expect(jun.getUTCDate()).toBe(1);

    const dec = firstDayOfNextMonth("2026-12");
    expect(dec.getUTCFullYear()).toBe(2027);
    expect(dec.getUTCMonth()).toBe(0); // janeiro
  });

  it("monthRef formata YYYY-MM", () => {
    expect(monthRef(new Date(Date.UTC(2026, 6, 1)))).toBe("2026-07");
    expect(monthRef(new Date(Date.UTC(2027, 0, 15)))).toBe("2027-01");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test server/modules/managerial-reports/period.test.ts`
Expected: FAIL — "Cannot find module './period.js'".

- [ ] **Step 3: Implementar os helpers**

Create `server/modules/managerial-reports/period.ts`:

```ts
import { addBusinessDays } from "../../utils/business-days.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function mondayOfIsoWeek(year: number, week: number): Date {
  // 4 de janeiro está sempre na semana ISO 1
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = (jan4.getUTCDay() + 6) % 7; // segunda = 0
  const week1Monday = new Date(jan4.getTime() - jan4Dow * DAY_MS);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * DAY_MS);
}

/** Sexta-feira (prazo) da semana ISO de um period_ref "YYYY-Www". */
export function fridayOfIsoWeek(periodRef: string): Date {
  const [yStr, wStr] = periodRef.split("-W");
  const monday = mondayOfIsoWeek(Number(yStr), Number(wStr));
  return new Date(monday.getTime() + 4 * DAY_MS);
}

/** period_ref ISO "YYYY-Www" de uma data qualquer. */
export function isoWeekRef(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  // Quinta-feira desta semana define o ano ISO
  const thursday = new Date(d.getTime() + (3 - dow) * DAY_MS);
  const isoYear = thursday.getUTCFullYear();
  const week1Monday = mondayOfIsoWeek(isoYear, 1);
  const week = Math.floor((thursday.getTime() - week1Monday.getTime()) / (7 * DAY_MS)) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/** Primeiro dia (UTC) do mês seguinte ao period_ref mensal "YYYY-MM". */
export function firstDayOfNextMonth(periodRef: string): Date {
  const [yStr, mStr] = periodRef.split("-");
  const year = Number(yStr);
  const month = Number(mStr); // 1-12
  return new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));
}

/** period_ref mensal "YYYY-MM" de uma data. */
export function monthRef(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Prazo do relatório:
 * - semanal: sexta-feira da semana ISO;
 * - mensal: 3º dia útil do mês seguinte (2 dias úteis após o 1º dia).
 * Retorna ISO date "YYYY-MM-DD" (coluna `date` do Drizzle).
 */
export async function computeDueDate(cadence: "semanal" | "mensal", periodRef: string): Promise<string> {
  if (cadence === "semanal") {
    return fridayOfIsoWeek(periodRef).toISOString().slice(0, 10);
  }
  const due = await addBusinessDays(firstDayOfNextMonth(periodRef), 2);
  return due.toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test server/modules/managerial-reports/period.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add server/modules/managerial-reports/period.ts server/modules/managerial-reports/period.test.ts
git commit -m "feat(mr): add period helpers (ISO week + monthly due date)"
```

---

## Task 4: Derivações puras (atraso + rollup de itens)

**Files:**
- Create: `server/modules/managerial-reports/view.ts`
- Test: `server/modules/managerial-reports/view.test.ts`

- [ ] **Step 1: Escrever os testes**

Create `server/modules/managerial-reports/view.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isOverdue, itemRollup } from "./view.js";

describe("isOverdue", () => {
  const now = new Date("2026-06-26T12:00:00Z");

  it("é true quando passou do prazo e não está validado", () => {
    expect(isOverdue({ dueDate: "2026-06-20", status: "rascunho" }, now)).toBe(true);
    expect(isOverdue({ dueDate: "2026-06-20", status: "enviado" }, now)).toBe(true);
  });

  it("é false quando validado, mesmo passado o prazo", () => {
    expect(isOverdue({ dueDate: "2026-06-20", status: "validado" }, now)).toBe(false);
  });

  it("é false quando ainda dentro do prazo", () => {
    expect(isOverdue({ dueDate: "2026-06-30", status: "rascunho" }, now)).toBe(false);
  });
});

describe("itemRollup", () => {
  it("conta itens por status", () => {
    const r = itemRollup([
      { itemStatus: "pendente" },
      { itemStatus: "pendente" },
      { itemStatus: "em_andamento" },
      { itemStatus: "concluido" },
    ]);
    expect(r).toEqual({ pendente: 2, em_andamento: 1, concluido: 1, total: 4 });
  });

  it("lida com lista vazia", () => {
    expect(itemRollup([])).toEqual({ pendente: 0, em_andamento: 0, concluido: 0, total: 0 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test server/modules/managerial-reports/view.test.ts`
Expected: FAIL — "Cannot find module './view.js'".

- [ ] **Step 3: Implementar**

Create `server/modules/managerial-reports/view.ts`:

```ts
export type ReportStatus = "rascunho" | "enviado" | "validado" | "devolvido";
export type ItemStatus = "pendente" | "em_andamento" | "concluido";

/** Atraso é derivado, nunca persistido: passou do prazo e ainda não validado. */
export function isOverdue(
  report: { dueDate: string; status: ReportStatus },
  now: Date = new Date(),
): boolean {
  if (report.status === "validado") return false;
  // dueDate "YYYY-MM-DD" → fim do dia do prazo
  const due = new Date(`${report.dueDate}T23:59:59Z`);
  return now.getTime() > due.getTime();
}

export interface ItemRollup {
  pendente: number;
  em_andamento: number;
  concluido: number;
  total: number;
}

export function itemRollup(items: Array<{ itemStatus: ItemStatus }>): ItemRollup {
  const r: ItemRollup = { pendente: 0, em_andamento: 0, concluido: 0, total: 0 };
  for (const it of items) {
    r[it.itemStatus] += 1;
    r.total += 1;
  }
  return r;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm test server/modules/managerial-reports/view.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add server/modules/managerial-reports/view.ts server/modules/managerial-reports/view.test.ts
git commit -m "feat(mr): add pure derivations (overdue + item rollup)"
```

---

## Task 5: Módulo de acesso a dados

**Files:**
- Create: `server/modules/managerial-reports/db.ts`

> Sem teste unitário próprio (acesso direto ao banco). A corretude é exercida pelo router e pela verificação manual na Task 7. Cobertura de tipos via `pnpm check`.

- [ ] **Step 1: Implementar o módulo de dados**

Create `server/modules/managerial-reports/db.ts`:

```ts
import { getDb } from "../../db.js";
import { mrReports, mrReportItems } from "../../../drizzle/schema.js";
import { and, eq, desc } from "drizzle-orm";
import { getTemplate } from "./templates.js";
import type { MrReport, MrReportItem } from "../../../drizzle/schema-managerial-reports.js";

export interface ListFilter {
  sector?: "rh_admin" | "financeiro";
  cadence?: "semanal" | "mensal";
  status?: "rascunho" | "enviado" | "validado" | "devolvido";
  periodRef?: string;
}

export async function listReports(filter: ListFilter = {}): Promise<MrReport[]> {
  const db = await getDb();
  if (!db) return [];
  const conds: any[] = [];
  if (filter.sector) conds.push(eq(mrReports.sector, filter.sector));
  if (filter.cadence) conds.push(eq(mrReports.cadence, filter.cadence));
  if (filter.status) conds.push(eq(mrReports.status, filter.status));
  if (filter.periodRef) conds.push(eq(mrReports.periodRef, filter.periodRef));
  const q = db.select().from(mrReports);
  const rows = conds.length ? await q.where(and(...conds)) : await q;
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getReport(
  id: number,
): Promise<{ report: MrReport; items: MrReportItem[] } | null> {
  const db = await getDb();
  if (!db) return null;
  const [report] = await db.select().from(mrReports).where(eq(mrReports.id, id));
  if (!report) return null;
  const items = await db
    .select()
    .from(mrReportItems)
    .where(eq(mrReportItems.reportId, id));
  items.sort((a, b) => a.sortOrder - b.sortOrder);
  return { report, items };
}

export async function findByPeriod(
  sector: string,
  cadence: string,
  periodRef: string,
): Promise<MrReport | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(mrReports)
    .where(
      and(
        eq(mrReports.sector, sector as any),
        eq(mrReports.cadence, cadence as any),
        eq(mrReports.periodRef, periodRef),
      ),
    );
  return row ?? null;
}

export interface CreateFromTemplateArgs {
  templateKey: string;
  periodRef: string;
  dueDate: string;
  authorId: number;
}

export async function createFromTemplate(args: CreateFromTemplateArgs): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB indisponível");
  const template = getTemplate(args.templateKey);
  if (!template) throw new Error(`Template inexistente: ${args.templateKey}`);

  const [res] = await db.insert(mrReports).values({
    templateKey: template.key,
    sector: template.sector,
    cadence: template.cadence,
    periodRef: args.periodRef,
    dueDate: args.dueDate,
    authorId: args.authorId,
    status: "rascunho",
  });
  const reportId = Number((res as any).insertId);

  await db.insert(mrReportItems).values(
    template.items.map((item, idx) => ({
      reportId,
      label: item.label,
      expectedContent: item.expectedContent,
      itemStatus: "pendente" as const,
      sortOrder: idx,
    })),
  );
  return reportId;
}

export async function updateReportFields(
  id: number,
  patch: Partial<Pick<MrReport, "summary" | "pointsForValidator" | "nextPriorities">>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(mrReports).set(patch).where(eq(mrReports.id, id));
}

export async function updateItemFields(
  itemId: number,
  patch: Partial<Pick<MrReportItem, "value" | "itemStatus">>,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(mrReportItems).set(patch).where(eq(mrReportItems.id, itemId));
}

export async function setReportStatus(
  id: number,
  patch: Partial<
    Pick<
      MrReport,
      "status" | "wasOnTime" | "submittedAt" | "validatedAt" | "validatedBy" | "rejectionNote" | "lockedSnapshot"
    >
  >,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(mrReports).set(patch).where(eq(mrReports.id, id));
}
```

- [ ] **Step 2: Verificar tipos**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/modules/managerial-reports/db.ts
git commit -m "feat(mr): add data access module"
```

---

## Task 6: Router tRPC + registro

**Files:**
- Create: `server/routers/managerial-reports.ts`
- Test: `server/routers/managerial-reports.test.ts`
- Modify: `server/routers.ts:6` (já importa procedures) e `server/routers.ts:1357` (registro)

- [ ] **Step 1: Escrever o teste de autorização (sem DB)**

Create `server/routers/managerial-reports.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { appRouter } from "../routers.js";

function caller(role: string) {
  return appRouter.createCaller({
    user: { id: 1, email: "x@y.z", role },
    req: { headers: {} },
    res: { setHeader: () => {}, clearCookie: () => {}, cookie: () => {} },
  } as any);
}

describe("managerialReports authorization", () => {
  it("colaborador não pode validar (FORBIDDEN antes do DB)", async () => {
    await expect(
      caller("colaborador").managerialReports.validate({ id: 1, approve: true }),
    ).rejects.toThrow();
  });

  it("user comum não pode validar", async () => {
    await expect(
      caller("user").managerialReports.validate({ id: 1, approve: true }),
    ).rejects.toThrow();
  });

  it("usuário não autenticado é bloqueado em listReports", async () => {
    const anon = appRouter.createCaller({
      user: null,
      req: { headers: {} },
      res: { setHeader: () => {}, clearCookie: () => {}, cookie: () => {} },
    } as any);
    await expect(anon.managerialReports.listReports({})).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm test server/routers/managerial-reports.test.ts`
Expected: FAIL — `managerialReports` não existe em `appRouter`.

- [ ] **Step 3: Implementar o router**

Create `server/routers/managerial-reports.ts`:

```ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc.js";
import * as mrDb from "../modules/managerial-reports/db.js";
import { getTemplate, STORED_TEMPLATE_KEYS } from "../modules/managerial-reports/templates.js";
import { computeDueDate } from "../modules/managerial-reports/period.js";
import { isOverdue, itemRollup } from "../modules/managerial-reports/view.js";

const SECTORS = ["rh_admin", "financeiro"] as const;
const CADENCES = ["semanal", "mensal"] as const;
const STATUSES = ["rascunho", "enviado", "validado", "devolvido"] as const;
const ITEM_STATUSES = ["pendente", "em_andamento", "concluido"] as const;

function isValidator(role: string | undefined): boolean {
  return role === "admin" || role === "gestor";
}

export const managerialReportsRouter = router({
  listReports: protectedProcedure
    .input(
      z
        .object({
          sector: z.enum(SECTORS).optional(),
          cadence: z.enum(CADENCES).optional(),
          status: z.enum(STATUSES).optional(),
          periodRef: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const reports = await mrDb.listReports(input ?? {});
      const now = new Date();
      return reports.map((r) => ({ ...r, overdue: isOverdue(r, now) }));
    }),

  getReport: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const data = await mrDb.getReport(input.id);
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Relatório não encontrado" });
      return {
        ...data,
        overdue: isOverdue(data.report, new Date()),
        rollup: itemRollup(data.items),
      };
    }),

  createFromTemplate: protectedProcedure
    .input(z.object({ templateKey: z.enum(STORED_TEMPLATE_KEYS), periodRef: z.string().min(4) }))
    .mutation(async ({ input, ctx }) => {
      const template = getTemplate(input.templateKey)!;
      const existing = await mrDb.findByPeriod(template.sector, template.cadence, input.periodRef);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe relatório para este setor/cadência/período",
        });
      }
      const dueDate = await computeDueDate(template.cadence, input.periodRef);
      const id = await mrDb.createFromTemplate({
        templateKey: template.key,
        periodRef: input.periodRef,
        dueDate,
        authorId: ctx.user.id,
      });
      return { id };
    }),

  updateReport: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        summary: z.string().optional(),
        pointsForValidator: z.string().optional(),
        nextPriorities: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const data = await mrDb.getReport(input.id);
      if (!data) throw new TRPCError({ code: "NOT_FOUND" });
      if (data.report.status === "validado") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Relatório validado é imutável" });
      }
      const { id, ...patch } = input;
      await mrDb.updateReportFields(id, patch);
      return { ok: true };
    }),

  updateItem: protectedProcedure
    .input(
      z.object({
        reportId: z.number(),
        itemId: z.number(),
        value: z.string().optional(),
        itemStatus: z.enum(ITEM_STATUSES).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const data = await mrDb.getReport(input.reportId);
      if (!data) throw new TRPCError({ code: "NOT_FOUND" });
      if (data.report.status === "validado") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Relatório validado é imutável" });
      }
      await mrDb.updateItemFields(input.itemId, {
        value: input.value,
        itemStatus: input.itemStatus,
      });
      return { ok: true };
    }),

  submitForValidation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const data = await mrDb.getReport(input.id);
      if (!data) throw new TRPCError({ code: "NOT_FOUND" });
      if (!["rascunho", "devolvido"].includes(data.report.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Só rascunho/devolvido podem ser enviados" });
      }
      const now = new Date();
      const wasOnTime = !isOverdue({ dueDate: data.report.dueDate, status: "enviado" }, now);
      await mrDb.setReportStatus(input.id, {
        status: "enviado",
        submittedAt: now,
        wasOnTime,
      });
      return { ok: true };
    }),

  validate: protectedProcedure
    .input(z.object({ id: z.number(), approve: z.boolean(), rejectionNote: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (!isValidator(ctx.user.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas validador (gestor/admin)" });
      }
      const data = await mrDb.getReport(input.id);
      if (!data) throw new TRPCError({ code: "NOT_FOUND" });
      if (data.report.status !== "enviado") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Só relatórios enviados podem ser validados" });
      }
      if (input.approve) {
        await mrDb.setReportStatus(input.id, {
          status: "validado",
          validatedAt: new Date(),
          validatedBy: ctx.user.id,
          lockedSnapshot: data as any,
        });
      } else {
        await mrDb.setReportStatus(input.id, {
          status: "devolvido",
          rejectionNote: input.rejectionNote ?? null,
        });
      }
      return { ok: true };
    }),
});
```

- [ ] **Step 4: Registrar no appRouter**

In `server/routers.ts`, add the import near the other router imports (after line 30, `import { kanbanRouter } from './routers/kanban.js';`):

```ts
import { managerialReportsRouter } from './routers/managerial-reports.js';
```

Then, in the `appRouter` object, right after the line `reports: reportsRouter,` (line ~1357), add:

```ts
  managerialReports: managerialReportsRouter,
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `pnpm test server/routers/managerial-reports.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 6: Verificar tipos**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/routers/managerial-reports.ts server/routers/managerial-reports.test.ts server/routers.ts
git commit -m "feat(mr): add managerialReports tRPC router with authorization"
```

---

## Task 7: Página React + rota + sidebar

**Files:**
- Create: `client/src/pages/ManagerialReports.tsx`
- Modify: `client/src/App.tsx` (lazy import + Route)
- Modify: `client/src/components/DashboardLayout.tsx` (link sidebar)

- [ ] **Step 1: Implementar a página**

Create `client/src/pages/ManagerialReports.tsx`:

```tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const STORED_TEMPLATES = [
  { key: "rh_admin.semanal.detalhado", label: "RH — Semanal" },
  { key: "rh_admin.mensal", label: "RH — Mensal" },
  { key: "financeiro.semanal.detalhado", label: "Financeiro — Semanal" },
  { key: "financeiro.mensal", label: "Financeiro — Mensal" },
] as const;

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-slate-100 text-slate-700" },
  enviado: { label: "Aguardando validação", className: "bg-amber-100 text-amber-800" },
  validado: { label: "Validado", className: "bg-green-100 text-green-800" },
  devolvido: { label: "Devolvido", className: "bg-red-100 text-red-800" },
};

function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  if (overdue && status !== "validado") {
    return <Badge className="bg-red-100 text-red-800">Em atraso</Badge>;
  }
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.rascunho;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export default function ManagerialReports() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId !== null) {
    return <ReportEditor id={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return <ReportList onOpen={setSelectedId} />;
}

function ReportList({ onOpen }: { onOpen: (id: number) => void }) {
  const utils = trpc.useUtils();
  const { data: reports, isLoading } = trpc.managerialReports.listReports.useQuery({});
  const [open, setOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState(STORED_TEMPLATES[0].key);
  const [periodRef, setPeriodRef] = useState("");

  const create = trpc.managerialReports.createFromTemplate.useMutation({
    onSuccess: ({ id }) => {
      toast.success("Relatório criado");
      setOpen(false);
      utils.managerialReports.listReports.invalidate();
      onOpen(id);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatórios Gerenciais</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Novo relatório</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo relatório</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={templateKey} onValueChange={(v) => setTemplateKey(v as typeof templateKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORED_TEMPLATES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Período (ex.: 2026-W26 ou 2026-06)"
                value={periodRef}
                onChange={(e) => setPeriodRef(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={!periodRef || create.isPending}
                onClick={() => create.mutate({ templateKey, periodRef })}
              >
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p>Carregando…</p>}
      <div className="grid gap-3">
        {reports?.map((r) => (
          <Card key={r.id} className="cursor-pointer hover:bg-accent/40" onClick={() => onOpen(r.id)}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">
                  {r.sector === "rh_admin" ? "RH Administrativo" : "Financeiro"} · {r.cadence} · {r.periodRef}
                </p>
                <p className="text-sm text-muted-foreground">Prazo: {r.dueDate}</p>
              </div>
              <StatusBadge status={r.status} overdue={(r as any).overdue} />
            </CardContent>
          </Card>
        ))}
        {reports?.length === 0 && !isLoading && (
          <p className="text-muted-foreground">Nenhum relatório ainda.</p>
        )}
      </div>
    </div>
  );
}

function ReportEditor({ id, onBack }: { id: number; onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.managerialReports.getReport.useQuery({ id });

  const updateItem = trpc.managerialReports.updateItem.useMutation({
    onSuccess: () => utils.managerialReports.getReport.invalidate({ id }),
    onError: (e) => toast.error(e.message),
  });
  const updateReport = trpc.managerialReports.updateReport.useMutation({
    onSuccess: () => utils.managerialReports.getReport.invalidate({ id }),
    onError: (e) => toast.error(e.message),
  });
  const submit = trpc.managerialReports.submitForValidation.useMutation({
    onSuccess: () => {
      toast.success("Enviado para validação");
      utils.managerialReports.getReport.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });
  const validate = trpc.managerialReports.validate.useMutation({
    onSuccess: () => {
      toast.success("Validação registrada");
      utils.managerialReports.getReport.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="p-6">Carregando…</div>;
  const { report, items } = data;
  const locked = report.status === "validado";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Voltar
        </Button>
        <StatusBadge status={report.status} overdue={(data as any).overdue} />
      </div>

      <h1 className="text-xl font-bold">
        {report.sector === "rh_admin" ? "RH Administrativo" : "Financeiro"} · {report.cadence} · {report.periodRef}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="border-b pb-3">
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.expectedContent}</p>
              <Textarea
                className="mt-2"
                defaultValue={item.value ?? ""}
                disabled={locked}
                onBlur={(e) => updateItem.mutate({ reportId: id, itemId: item.id, value: e.target.value })}
              />
              <Select
                value={item.itemStatus}
                disabled={locked}
                onValueChange={(v) =>
                  updateItem.mutate({ reportId: id, itemId: item.id, itemStatus: v as any })
                }
              >
                <SelectTrigger className="mt-2 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Síntese</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Resumo geral"
            defaultValue={report.summary ?? ""}
            disabled={locked}
            onBlur={(e) => updateReport.mutate({ id, summary: e.target.value })}
          />
          <Textarea
            placeholder="Pontos para validação"
            defaultValue={report.pointsForValidator ?? ""}
            disabled={locked}
            onBlur={(e) => updateReport.mutate({ id, pointsForValidator: e.target.value })}
          />
          <Textarea
            placeholder="Próximas prioridades"
            defaultValue={report.nextPriorities ?? ""}
            disabled={locked}
            onBlur={(e) => updateReport.mutate({ id, nextPriorities: e.target.value })}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {(report.status === "rascunho" || report.status === "devolvido") && (
          <Button onClick={() => submit.mutate({ id })}>Enviar para validação</Button>
        )}
        {report.status === "enviado" && (
          <>
            <Button onClick={() => validate.mutate({ id, approve: true })}>Aprovar</Button>
            <Button
              variant="destructive"
              onClick={() => validate.mutate({ id, approve: false, rejectionNote: "Revisar e reenviar" })}
            >
              Devolver
            </Button>
          </>
        )}
      </div>
      {report.status === "devolvido" && report.rejectionNote && (
        <p className="text-sm text-red-700">Devolução: {report.rejectionNote}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Registrar a rota**

In `client/src/App.tsx`, add the lazy import near the other page imports (after line 29, `const Reports = lazy(...)`):

```tsx
const ManagerialReports = lazy(() => import("./pages/ManagerialReports"));
```

Then add the route inside the `<Switch>` block, right after the `/relatorios` route (search for `component={guarded(Reports`):

```tsx
        <Route path="/relatorios-gerenciais" component={guarded(ManagerialReports, "manager")} />
```

- [ ] **Step 3: Adicionar o link na sidebar**

In `client/src/components/DashboardLayout.tsx`:
- Add `ClipboardList` to the existing `lucide-react` import (find the line that imports `FileText` and add `ClipboardList` to the same import list).
- Add this entry right after the `Relatórios` item (line 103):

```tsx
  { icon: ClipboardList, label: "Relatórios Gerenciais", path: "/relatorios-gerenciais", section: "Análise", requiredRoles: [...ADMIN_OR_MANAGER] },
```

- [ ] **Step 4: Verificar tipos e build**

Run: `pnpm check`
Expected: PASS.

- [ ] **Step 5: Verificação manual**

Run: `pnpm dev`, fazer login como gestor/admin, abrir `/relatorios-gerenciais`. Verificar:
1. "Novo relatório" → escolher "RH — Semanal", período `2026-W26` → cria e abre o editor com 9 itens.
2. Preencher um item (blur salva), mudar status, preencher as 3 seções de síntese.
3. "Enviar para validação" → badge vira "Aguardando validação".
4. "Aprovar" → badge vira "Validado" e os campos ficam desabilitados (imutável).

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/ManagerialReports.tsx client/src/App.tsx client/src/components/DashboardLayout.tsx
git commit -m "feat(mr): add managerial reports page, route and sidebar link"
```

---

## Verificação final

- [ ] Rodar a suíte do módulo:

Run: `pnpm test server/modules/managerial-reports server/routers/managerial-reports.test.ts`
Expected: todos PASS.

- [ ] Rodar `pnpm check` — PASS.
- [ ] Rodar `pnpm build` — PASS.
- [ ] Aplicar migration no banco de dev: `pnpm exec drizzle-kit migrate` — cria `mr_reports` e `mr_report_items`.

---

## Notas para Phases 2–3 (planos próprios, não implementar agora)

- **Carry-over:** ao criar período N, copiar de N-1 os itens com `item_status != concluido` (preencher `value`, `carriedOver = true`). Coluna já existe.
- **Materialização automática:** `server/modules/managerial-reports/scheduler.ts` via `notification-scheduler`, criando o relatório do período e notificando o autor.
- **Notificações:** no `submitForValidation` (→ validador), `validate` devolução (→ autor); seguir o padrão `notifyVacationApproval` em `server/_core/notification-events.ts`.
- **Resumido auto-gerado:** derivar do detalhado na leitura (templates `*.resumido` já no catálogo).
- **Dashboard de tendências:** `dashboard()` com contagens por setor + `wasOnTime` (índice de entrega no prazo).
- **Aba Vencimentos:** ler `medical_exams` + tabela de alertas existentes; sem tabela nova.
- **Restrição por setor:** a matriz de permissões da spec diz "autor mexe só no relatório do seu setor". O MVP simplifica — `validate` já é só validador (gestor/admin), mas criar/editar não checa setor do autor. Adicionar mapa `usuário→setor` e o guard correspondente quando o vínculo setor↔responsável existir.
```
