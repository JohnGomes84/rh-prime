export type Priority = "low" | "medium" | "high" | "urgent";
export type GlobalStatus = "todo" | "in_progress" | "done";

export type KanbanCardV2Data = {
  id: number;
  listId: number;
  boardId: number;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: Date | string | null;
  position: number;
  // V2 fields
  entityType: string | null;
  entityId: number | null;
  enteredListAt: Date | string;
  globalStatus: GlobalStatus;
};

export const GLOBAL_STATUS_COLUMNS: { value: GlobalStatus; label: string; emoji: string }[] = [
  { value: "todo", label: "A Fazer", emoji: "📋" },
  { value: "in_progress", label: "Em Progresso", emoji: "⚙️" },
  { value: "done", label: "Concluido", emoji: "✅" },
];

export type KanbanListV2Data = {
  id: number;
  boardId: number;
  name: string;
  position: number;
  archived: boolean;
  // V2 fields
  slaDays: number | null;
};

export type SlaState = "none" | "ok" | "warning" | "alert" | "overdue";

export function computeSla(
  enteredListAt: Date | string,
  slaDays: number | null,
): { state: SlaState; daysElapsed: number; daysRemaining: number | null } {
  const entered =
    typeof enteredListAt === "string" ? new Date(enteredListAt) : enteredListAt;
  const now = new Date();
  const msElapsed = now.getTime() - entered.getTime();
  const daysElapsed = Math.max(0, Math.floor(msElapsed / 86_400_000));

  if (slaDays == null || slaDays <= 0) {
    return { state: "none", daysElapsed, daysRemaining: null };
  }

  const daysRemaining = slaDays - daysElapsed;
  const ratio = daysElapsed / slaDays;

  let state: SlaState;
  if (ratio >= 1) state = "overdue";
  else if (ratio >= 0.8) state = "alert";
  else if (ratio >= 0.5) state = "warning";
  else state = "ok";

  return { state, daysElapsed, daysRemaining };
}

export const slaStyles: Record<SlaState, { border: string; badge: string; label: string }> = {
  none: {
    border: "border-l-slate-300",
    badge: "bg-slate-200 text-slate-700",
    label: "sem prazo",
  },
  ok: {
    border: "border-l-emerald-500",
    badge: "bg-emerald-100 text-emerald-700",
    label: "no prazo",
  },
  warning: {
    border: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-800",
    label: "atencao",
  },
  alert: {
    border: "border-l-orange-500",
    badge: "bg-orange-100 text-orange-800",
    label: "alerta",
  },
  overdue: {
    border: "border-l-red-500",
    badge: "bg-red-500 text-white font-semibold",
    label: "vencido",
  },
};

export const priorityStyles: Record<Priority, { pill: string; label: string }> = {
  low: { pill: "bg-emerald-500 text-white", label: "BAIXA" },
  medium: { pill: "bg-amber-500 text-white", label: "NORMAL" },
  high: { pill: "bg-orange-500 text-white", label: "ALTA" },
  urgent: { pill: "bg-red-500 text-white", label: "URGENTE" },
};
