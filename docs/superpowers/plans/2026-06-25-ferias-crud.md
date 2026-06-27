# Férias CRUD + Solicitação/Aprovação — Implementation Plan

> **Status (2026-06-27):** Implementado no branch `feat/ferias-crud`.
> - Tasks 1–5: concluídas. Task 6: `pnpm check`/`pnpm test` (206)/`pnpm build` verdes; teste manual no navegador continua pendente (requer stack + login).
> - Reforços além do plano original (revisão): validação CLT aplicada no **servidor** em `inbox.create` + hook de aprovação (o `days` é derivado das datas no servidor, nunca confiado do cliente); `decide` agora é idempotente (não decide solicitação já resolvida); `vacations.listWithEmployee` e `vacationPeriods.list/listByEmployee` escopados por papel/escopo (IDOR); dedup do scheduler passou a considerar o título para não suprimir o alerta de 30 dias com o de 90.
> - Testes adicionais: `server/routers/inbox-ferias.test.ts` (hook, payload adulterado, idempotência, rejeição).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the read-only `/ferias` page into a complete vacation management module with CLT-compliant request/approval workflow via Inbox integration.

**Architecture:** Employee requests vacation from `/ferias` → system validates CLT rules → creates Inbox request with `kind: "ferias"` and structured payload → admin approves in `/inbox` → backend hook creates `vacationPeriod`, updates `vacation.daysTaken`/`status`, and notifies employee. Admin can also schedule vacations directly without Inbox flow.

**Tech Stack:** React 19, tRPC v11, Drizzle ORM, shadcn/ui, wouter, sonner (toasts), WebSocket notifications

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `client/src/pages/Vacations.tsx` | Full rewrite: employee request form, admin direct scheduling, vacation periods detail, CLT validation, calculation preview |
| Modify | `server/routers/inbox.ts` | Post-approval hook: when `kind: "ferias"` is approved, create vacationPeriod + update vacation record |
| Modify | `server/routers.ts` | Add `vacations.listWithEmployee` query (joins employee name for the list view) |
| Modify | `client/src/pages/Inbox.tsx` | Rich payload rendering for `kind: "ferias"` requests |
| Modify | `server/_core/notification-scheduler.ts` | Add 90-day concessão alert scan |
| Create | `server/utils/vacation-rules.ts` | CLT validation logic (Art. 134/143): fraction limits, minimum days, abono cap |
| Test | `server/utils/vacation-rules.test.ts` | Unit tests for CLT validation rules |

---

### Task 1: CLT Vacation Validation Rules

**Files:**
- Create: `server/utils/vacation-rules.ts`
- Create: `server/utils/vacation-rules.test.ts`

- [ ] **Step 1: Write failing tests for CLT rules**

```typescript
// server/utils/vacation-rules.test.ts
import { describe, it, expect } from "vitest";
import { validateVacationRequest } from "./vacation-rules";

describe("validateVacationRequest", () => {
  const base = {
    daysEntitled: 30,
    daysTaken: 0,
    existingPeriods: [] as Array<{ days: number }>,
    startDate: "2026-08-01",
    endDate: "2026-08-30",
    days: 30,
    abonoDays: 0,
  };

  it("accepts a valid 30-day request", () => {
    const result = validateVacationRequest(base);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects when days exceed remaining balance", () => {
    const result = validateVacationRequest({ ...base, daysTaken: 25, days: 10 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("saldo"))).toBe(true);
  });

  it("rejects fraction shorter than 5 days (Art. 134 §1)", () => {
    const result = validateVacationRequest({ ...base, days: 4, endDate: "2026-08-04" });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("5 dias"))).toBe(true);
  });

  it("rejects 4th fraction (max 3 per Art. 134 §1)", () => {
    const existing = [{ days: 14 }, { days: 8 }, { days: 5 }];
    const result = validateVacationRequest({
      ...base,
      existingPeriods: existing,
      daysTaken: 27,
      days: 3,
      endDate: "2026-08-03",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("3 períodos"))).toBe(true);
  });

  it("rejects if no fraction has at least 14 days", () => {
    const existing = [{ days: 10 }];
    const result = validateVacationRequest({
      ...base,
      existingPeriods: existing,
      daysTaken: 10,
      days: 10,
      endDate: "2026-08-10",
    });
    // existing 10 + new 10 = two fractions, neither >= 14
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("14 dias"))).toBe(true);
  });

  it("accepts when one existing fraction is 14+ days", () => {
    const existing = [{ days: 15 }];
    const result = validateVacationRequest({
      ...base,
      existingPeriods: existing,
      daysTaken: 15,
      days: 10,
      endDate: "2026-08-10",
    });
    expect(result.valid).toBe(true);
  });

  it("rejects abono exceeding 1/3 of entitled days (Art. 143)", () => {
    const result = validateVacationRequest({ ...base, abonoDays: 11 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("1/3"))).toBe(true);
  });

  it("accepts abono of exactly 10 days on 30 entitled", () => {
    const result = validateVacationRequest({ ...base, abonoDays: 10 });
    expect(result.valid).toBe(true);
  });

  it("rejects start date less than 30 days from now", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = validateVacationRequest({
      ...base,
      startDate: tomorrow.toISOString().slice(0, 10),
      endDate: "2026-12-31",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("30 dias"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test server/utils/vacation-rules.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement validation rules**

```typescript
// server/utils/vacation-rules.ts
export interface VacationRequestInput {
  daysEntitled: number;
  daysTaken: number;
  existingPeriods: Array<{ days: number }>;
  startDate: string;
  endDate: string;
  days: number;
  abonoDays: number;
}

export interface VacationValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateVacationRequest(input: VacationRequestInput): VacationValidationResult {
  const errors: string[] = [];
  const remaining = input.daysEntitled - input.daysTaken;

  if (input.days + input.abonoDays > remaining) {
    errors.push(`Dias solicitados (${input.days + input.abonoDays}) excedem o saldo disponível (${remaining} dias).`);
  }

  if (input.days < 5) {
    errors.push("Cada período de férias deve ter no mínimo 5 dias corridos (CLT Art. 134 §1).");
  }

  const totalFractions = input.existingPeriods.length + 1;
  if (totalFractions > 3) {
    errors.push("Férias podem ser fracionadas em no máximo 3 períodos (CLT Art. 134 §1).");
  }

  const allFractions = [...input.existingPeriods.map((p) => p.days), input.days];
  if (allFractions.length > 0 && !allFractions.some((d) => d >= 14)) {
    errors.push("Pelo menos um período deve ter no mínimo 14 dias corridos (CLT Art. 134 §1).");
  }

  const maxAbono = Math.floor(input.daysEntitled / 3);
  if (input.abonoDays > maxAbono) {
    errors.push(`Abono pecuniário limitado a 1/3 dos dias de direito (máximo ${maxAbono} dias, CLT Art. 143).`);
  }

  const start = new Date(input.startDate);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 30) {
    errors.push("A data de início deve ser pelo menos 30 dias no futuro (aviso prévio, CLT Art. 135).");
  }

  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test server/utils/vacation-rules.test.ts`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/vacation-rules.ts server/utils/vacation-rules.test.ts
git commit -m "feat(ferias): add CLT vacation validation rules with tests"
```

---

### Task 2: Backend — Inbox Approval Hook

**Files:**
- Modify: `server/routers/inbox.ts` (the `decide` mutation, lines ~126-156)
- Modify: `server/routers.ts` (add `vacations.listWithEmployee` query)

- [ ] **Step 1: Add vacation period creation on approval in inbox.ts**

After the existing `db.updateRequest()` call in the `decide` mutation, add a post-approval hook:

```typescript
// In server/routers/inbox.ts — inside the decide mutation, after db.updateRequest():

      // Post-approval hooks
      if (input.decision === "APPROVED") {
        const reqData = req as any;
        if (reqData.kind === "ferias" && reqData.payload) {
          const p = reqData.payload as Record<string, any>;
          if (p.vacationId && p.startDate && p.endDate && p.days) {
            await db.createVacationPeriod({
              vacationId: p.vacationId,
              employeeId: reqData.employeeId,
              startDate: new Date(p.startDate),
              endDate: new Date(p.endDate),
              days: p.days,
              isPecuniaryAllowance: p.abonoDays > 0,
              pecuniaryDays: p.abonoDays ?? 0,
              noticeDate: new Date(),
              status: "Agendada",
            });
            const totalDaysUsed = p.days + (p.abonoDays ?? 0);
            const vacation = await db.getVacation(p.vacationId);
            if (vacation) {
              await db.updateVacation(p.vacationId, {
                daysTaken: (vacation.daysTaken ?? 0) + totalDaysUsed,
                status: "Agendada",
              });
            }
          }
        }
      }
```

- [ ] **Step 2: Add `vacations.listWithEmployee` query in routers.ts**

After the existing `vacations.upcoming` query (~line 699), add:

```typescript
    listWithEmployee: protectedProcedure
      .input(z.object({ employeeId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const allVacations = await db.listVacations(input?.employeeId);
        const allEmployees = await db.listEmployees();
        const empMap = new Map((allEmployees as any[]).map((e) => [e.id, e.fullName]));
        return (allVacations as any[]).map((v) => ({
          ...v,
          employeeName: empMap.get(v.employeeId) ?? `ID ${v.employeeId}`,
        }));
      }),
```

- [ ] **Step 3: Verify build compiles**

Run: `pnpm check`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add server/routers/inbox.ts server/routers.ts
git commit -m "feat(ferias): inbox approval hook creates vacation period + listWithEmployee query"
```

---

### Task 3: Frontend — Rewrite Vacations.tsx

**Files:**
- Modify: `client/src/pages/Vacations.tsx` (full rewrite)

This is the largest task. The new page has:
- **Stats cards**: vencidas, próximas 60d, total agendadas
- **Tabela principal**: todos os períodos aquisitivos com employee name, saldo, status
- **Expandir row**: mostra períodos de gozo (vacationPeriods) já agendados para aquele aquisitivo
- **Dialog "Solicitar Férias"** (colaborador): seleciona período aquisitivo → datas → abono → cálculo preview → valida CLT → cria inbox request
- **Dialog "Agendar Férias"** (admin): mesma UI mas cria vacationPeriod direto sem inbox

- [ ] **Step 1: Rewrite Vacations.tsx**

```typescript
// client/src/pages/Vacations.tsx
import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRole } from "@/_core/hooks/useRole";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Loader2, CalendarDays, AlertTriangle, Plus, ChevronDown, ChevronRight, Plane,
} from "lucide-react";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function diffCalendarDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

type VacationRow = {
  id: number;
  employeeId: number;
  employeeName: string;
  acquisitionStart: string;
  acquisitionEnd: string;
  concessionLimit: string;
  daysEntitled: number;
  daysTaken: number;
  status: string;
};

const STATUS_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  Vencida: "destructive",
  "Em Gozo": "default",
  Concluída: "default",
  Agendada: "outline",
  Pendente: "secondary",
};

function validateRequest(input: {
  daysEntitled: number;
  daysTaken: number;
  existingPeriods: Array<{ days: number }>;
  startDate: string;
  endDate: string;
  days: number;
  abonoDays: number;
}): string[] {
  const errors: string[] = [];
  const remaining = input.daysEntitled - input.daysTaken;
  if (input.days + input.abonoDays > remaining)
    errors.push(`Dias solicitados (${input.days + input.abonoDays}) excedem saldo (${remaining}).`);
  if (input.days < 5)
    errors.push("Mínimo 5 dias corridos por período (CLT Art. 134 §1).");
  if (input.existingPeriods.length + 1 > 3)
    errors.push("Máximo 3 frações por período aquisitivo (CLT Art. 134 §1).");
  const all = [...input.existingPeriods.map((p) => p.days), input.days];
  if (!all.some((d) => d >= 14))
    errors.push("Ao menos 1 período deve ter 14+ dias (CLT Art. 134 §1).");
  const maxAbono = Math.floor(input.daysEntitled / 3);
  if (input.abonoDays > maxAbono)
    errors.push(`Abono máximo: ${maxAbono} dias = 1/3 do direito (CLT Art. 143).`);
  const start = new Date(input.startDate);
  const diffMs = start.getTime() - Date.now();
  if (Math.floor(diffMs / 86400000) < 30)
    errors.push("Início deve ser 30+ dias no futuro (aviso prévio, CLT Art. 135).");
  return errors;
}

export default function Vacations() {
  const { isAdmin, isManager } = useRole();
  const { user } = useAuth();
  const canManage = isAdmin || isManager;

  const vacationsQuery = trpc.vacations.listWithEmployee.useQuery({});
  const overdueQuery = trpc.vacations.overdue.useQuery();
  const upcomingQuery = trpc.vacations.upcoming.useQuery({ daysAhead: 60 });
  const calcQuery = trpc.laborCalc.feriasProporcionais;

  const utils = trpc.useUtils();

  const vacations = (vacationsQuery.data ?? []) as VacationRow[];
  const overdue = (overdueQuery.data ?? []) as any[];
  const upcoming = (upcomingQuery.data ?? []) as any[];

  // Expanded rows to show vacation periods
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVacationId, setSelectedVacationId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [abonoEnabled, setAbonoEnabled] = useState(false);
  const [abonoDays, setAbonoDays] = useState(0);
  const [observations, setObservations] = useState("");

  const selectedVacation = vacations.find((v) => String(v.id) === selectedVacationId);
  const days = startDate && endDate ? diffCalendarDays(startDate, endDate) : 0;
  const remaining = selectedVacation ? selectedVacation.daysEntitled - selectedVacation.daysTaken : 0;

  // Fetch existing periods for selected vacation (for fraction validation)
  const periodsQuery = trpc.vacationPeriods.list.useQuery(
    { vacationId: Number(selectedVacationId) },
    { enabled: !!selectedVacationId }
  );
  const existingPeriods = (periodsQuery.data ?? []) as Array<{ days: number }>;

  // Calculation preview
  const salary = 0; // Will be enhanced when employee contract is available
  const vacationValue = selectedVacation && days > 0 ? (salary / 30) * days : 0;

  // CLT validation
  const validationErrors = selectedVacation && days > 0 ? validateRequest({
    daysEntitled: selectedVacation.daysEntitled,
    daysTaken: selectedVacation.daysTaken,
    existingPeriods,
    startDate,
    endDate,
    days,
    abonoDays: abonoEnabled ? abonoDays : 0,
  }) : [];

  // Mutations
  const createInboxRequest = trpc.inbox.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitação de férias enviada para aprovação");
      resetDialog();
      utils.vacations.listWithEmployee.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createPeriodDirect = trpc.vacationPeriods.create.useMutation({
    onSuccess: async () => {
      toast.success("Férias agendadas com sucesso");
      resetDialog();
      if (selectedVacation) {
        const totalUsed = days + (abonoEnabled ? abonoDays : 0);
        await updateVacation.mutateAsync({
          id: selectedVacation.id,
          data: {
            daysTaken: selectedVacation.daysTaken + totalUsed,
            status: "Agendada",
          },
        });
      }
      utils.vacations.listWithEmployee.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateVacation = trpc.vacations.update.useMutation({
    onError: (e) => toast.error(e.message),
  });

  function resetDialog() {
    setDialogOpen(false);
    setSelectedVacationId("");
    setStartDate("");
    setEndDate("");
    setAbonoEnabled(false);
    setAbonoDays(0);
    setObservations("");
  }

  function handleSubmitRequest() {
    if (!selectedVacation || validationErrors.length > 0) return;
    const effectiveAbono = abonoEnabled ? abonoDays : 0;

    createInboxRequest.mutate({
      kind: "ferias",
      subject: `Férias ${days} dias — ${formatDate(startDate)} a ${formatDate(endDate)}`,
      description: observations || undefined,
      priority: "NORMAL",
      payload: {
        vacationId: selectedVacation.id,
        startDate,
        endDate,
        days,
        abonoDays: effectiveAbono,
        acquisitionStart: selectedVacation.acquisitionStart,
        acquisitionEnd: selectedVacation.acquisitionEnd,
      },
      relatedResourceType: "vacations",
      relatedResourceId: selectedVacation.id,
    });
  }

  function handleDirectSchedule() {
    if (!selectedVacation || validationErrors.length > 0) return;
    const effectiveAbono = abonoEnabled ? abonoDays : 0;

    createPeriodDirect.mutate({
      vacationId: selectedVacation.id,
      employeeId: selectedVacation.employeeId,
      startDate,
      endDate,
      days,
      isPecuniaryAllowance: effectiveAbono > 0,
      pecuniaryDays: effectiveAbono,
      noticeDate: new Date().toISOString().slice(0, 10),
    });
  }

  if (vacationsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Controle de Férias</h1>
            <p className="text-muted-foreground">
              Gerencie períodos aquisitivos, concessivos e agendamentos conforme a CLT.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {canManage ? "Agendar Férias" : "Solicitar Férias"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-0 shadow-sm border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Férias Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{overdue.length}</p>
              <p className="text-xs text-muted-foreground">Ação imediata necessária</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Vencendo em 60 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{upcoming.length}</p>
              <p className="text-xs text-muted-foreground">Prazo concessivo se aproximando</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                <Plane className="h-4 w-4" /> Agendadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {vacations.filter((v) => v.status === "Agendada").length}
              </p>
              <p className="text-xs text-muted-foreground">Férias futuras confirmadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Main table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Períodos Aquisitivos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {vacations.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum período de férias registrado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Período Aquisitivo</TableHead>
                    <TableHead>Limite Concessivo</TableHead>
                    <TableHead>Direito</TableHead>
                    <TableHead>Gozados</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacations.map((v) => {
                    const saldo = v.daysEntitled - (v.daysTaken || 0);
                    const isExpanded = expanded.has(v.id);
                    return (
                      <>
                        <TableRow
                          key={v.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpand(v.id)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{v.employeeName}</TableCell>
                          <TableCell>
                            {formatDate(v.acquisitionStart)} a {formatDate(v.acquisitionEnd)}
                          </TableCell>
                          <TableCell>{formatDate(v.concessionLimit)}</TableCell>
                          <TableCell>{v.daysEntitled}</TableCell>
                          <TableCell>{v.daysTaken || 0}</TableCell>
                          <TableCell className="font-semibold">{saldo}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[v.status] ?? "secondary"}>
                              {v.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && <VacationPeriodsRow vacationId={v.id} />}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Solicitar / Agendar Férias */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {canManage ? "Agendar Férias" : "Solicitar Férias"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Período aquisitivo</Label>
              <Select value={selectedVacationId} onValueChange={setSelectedVacationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {vacations
                    .filter((v) => v.status === "Pendente" || v.status === "Agendada")
                    .filter((v) => v.daysEntitled - v.daysTaken > 0)
                    .map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.employeeName} — {formatDate(v.acquisitionStart)} a{" "}
                        {formatDate(v.acquisitionEnd)} (saldo: {v.daysEntitled - v.daysTaken}d)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVacation && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data início</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Data fim</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {days > 0 && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <p>
                      <strong>{days}</strong> dias corridos · Saldo restante após:{" "}
                      <strong>{remaining - days - (abonoEnabled ? abonoDays : 0)}</strong> dias
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={abonoEnabled}
                    onCheckedChange={(v) => {
                      setAbonoEnabled(!!v);
                      if (!v) setAbonoDays(0);
                    }}
                  />
                  <Label>Abono pecuniário (converter dias em dinheiro, Art. 143)</Label>
                </div>

                {abonoEnabled && (
                  <div>
                    <Label>Dias de abono (máx. {Math.floor(selectedVacation.daysEntitled / 3)})</Label>
                    <Input
                      type="number"
                      min={1}
                      max={Math.floor(selectedVacation.daysEntitled / 3)}
                      value={abonoDays}
                      onChange={(e) => setAbonoDays(Number(e.target.value))}
                    />
                  </div>
                )}

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Informações adicionais (opcional)"
                    rows={2}
                  />
                </div>

                {validationErrors.length > 0 && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-1">
                    {validationErrors.map((err, i) => (
                      <p key={i} className="text-destructive flex items-start gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        {err}
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Cancelar
            </Button>
            {canManage ? (
              <Button
                onClick={handleDirectSchedule}
                disabled={
                  !selectedVacation ||
                  days <= 0 ||
                  validationErrors.length > 0 ||
                  createPeriodDirect.isPending
                }
              >
                {createPeriodDirect.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Agendar
              </Button>
            ) : (
              <Button
                onClick={handleSubmitRequest}
                disabled={
                  !selectedVacation ||
                  days <= 0 ||
                  validationErrors.length > 0 ||
                  createInboxRequest.isPending
                }
              >
                {createInboxRequest.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Enviar solicitação
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function VacationPeriodsRow({ vacationId }: { vacationId: number }) {
  const periodsQuery = trpc.vacationPeriods.list.useQuery({ vacationId });
  const periods = (periodsQuery.data ?? []) as Array<{
    id: number;
    startDate: string;
    endDate: string;
    days: number;
    status: string;
    isPecuniaryAllowance: boolean;
    pecuniaryDays: number;
  }>;

  if (periodsQuery.isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30 py-2 pl-12">
          <Loader2 className="h-4 w-4 animate-spin" />
        </TableCell>
      </TableRow>
    );
  }

  if (periods.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30 py-2 pl-12 text-xs text-muted-foreground">
          Nenhum período de gozo agendado.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {periods.map((p) => (
        <TableRow key={p.id} className="bg-muted/30">
          <TableCell />
          <TableCell colSpan={2} className="text-sm pl-8">
            ↳ {formatDate(p.startDate)} a {formatDate(p.endDate)}
          </TableCell>
          <TableCell className="text-sm">{p.days} dias</TableCell>
          <TableCell className="text-sm">
            {p.isPecuniaryAllowance ? `Abono: ${p.pecuniaryDays}d` : "—"}
          </TableCell>
          <TableCell />
          <TableCell />
          <TableCell>
            <Badge variant="outline" className="text-xs">
              {p.status}
            </Badge>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm check`
Expected: No TypeScript errors

- [ ] **Step 3: Start dev server and test the page visually**

Run: `pnpm dev`
Navigate to `http://localhost:3002/ferias`
Verify:
- Stats cards render (vencidas, próximas, agendadas)
- Table shows all vacation periods with employee names
- Clicking a row expands to show gozo periods
- "Solicitar Férias" / "Agendar Férias" button opens dialog
- CLT validation errors appear when rules are violated
- Submit creates inbox request (colaborador) or vacation period (admin)

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Vacations.tsx
git commit -m "feat(ferias): complete vacation CRUD with CLT validation and inbox integration"
```

---

### Task 4: Inbox Rich Payload for Vacation Requests

**Files:**
- Modify: `client/src/pages/Inbox.tsx`

- [ ] **Step 1: Add rich vacation payload rendering**

Find the section in Inbox.tsx where request items are rendered (around the `item.kind` badge area). After the description text, add conditional rendering for vacation payloads:

```typescript
// Inside the request item rendering, after the description/subject display:

{item.kind === "ferias" && item.payload && (() => {
  const p = item.payload as Record<string, any>;
  return (
    <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs space-y-1">
      <p><strong>Período aquisitivo:</strong> {formatDate(p.acquisitionStart)} a {formatDate(p.acquisitionEnd)}</p>
      <p><strong>Gozo solicitado:</strong> {formatDate(p.startDate)} a {formatDate(p.endDate)} ({p.days} dias)</p>
      {p.abonoDays > 0 && <p><strong>Abono pecuniário:</strong> {p.abonoDays} dias</p>}
    </div>
  );
})()}
```

Also add a `formatDate` helper at the top of Inbox.tsx if it doesn't exist:

```typescript
function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm check`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Inbox.tsx
git commit -m "feat(inbox): rich payload rendering for vacation requests"
```

---

### Task 5: 90-Day Concessão Alert in Notification Scheduler

**Files:**
- Modify: `server/_core/notification-scheduler.ts`

- [ ] **Step 1: Add 90-day scan to existing `scanVacations` function**

In `notification-scheduler.ts`, find the `scanVacations` function (~line 63). After the existing overdue loop, add a 90-day scan:

```typescript
  // 90-day concessão warning for admins
  const ninetyDay = await db.getUpcomingVacationDeadlines(90);
  for (const v of ninetyDay as any[]) {
    const dueDate = new Date(v.concessionLimit).toISOString().slice(0, 10);
    const fired = await notifyOnce({
      type: "Férias",
      title: "📋 Férias: prazo concessivo em 90 dias",
      message: `Período concessivo termina em ${dueDate}. Providencie o agendamento.`,
      severity: "Info",
      relatedEmployeeId: v.employeeId ?? null,
      dueDate,
    });
    if (fired) created++;
  }
```

- [ ] **Step 2: Verify build compiles**

Run: `pnpm check`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add server/_core/notification-scheduler.ts
git commit -m "feat(notifications): 90-day vacation concessão deadline alert"
```

---

### Task 6: Integration Test — Full Flow

- [ ] **Step 1: Test the complete flow end-to-end in the browser**

1. Navigate to `/ferias`
2. Click "Solicitar Férias" (as colaborador) or "Agendar Férias" (as admin)
3. Select a vacation period with available balance
4. Enter dates 30+ days in the future
5. Verify CLT validation: try < 5 days (should error), try > saldo (should error)
6. Submit valid request
7. If colaborador: go to `/inbox`, verify request appears with rich payload
8. If admin: verify vacation period was created, table updated

- [ ] **Step 2: Run all existing tests to verify no regressions**

Run: `pnpm test`
Expected: All existing tests PASS

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test(ferias): verify full vacation flow end-to-end"
```
