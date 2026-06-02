import { useEffect, useState } from "react";
import { Calendar, CheckSquare, ChevronDown, Clock, MessageSquare, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  computeSla,
  type KanbanCardV2Data,
  priorityStyles,
  type Priority,
  slaStyles,
} from "../types";

type AssigneeData = {
  userId: number;
  fullName: string | null;
  name: string | null;
  email: string | null;
  avatarFallback: string | null;
};

type LabelData = {
  labelId: number;
  name: string;
  color: string;
};

type ChecklistCount = { total: number; done: number };

export function KanbanCardV2({
  card,
  slaDays,
  assignees,
  labels,
  checklist,
  commentsCount = 0,
  attachmentsCount = 0,
  canEdit,
  boardLabel,
  boardColor,
  dragHandle,
}: {
  card: KanbanCardV2Data;
  slaDays: number | null;
  assignees: AssigneeData[];
  labels: LabelData[];
  checklist?: ChecklistCount;
  commentsCount?: number;
  attachmentsCount?: number;
  canEdit: boolean;
  boardLabel?: string;
  boardColor?: string | null;
  dragHandle?: React.ReactNode;
}) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(card.title);
  const [descDraft, setDescDraft] = useState(card.description ?? "");
  const [priorityDraft, setPriorityDraft] = useState<Priority>(card.priority);
  const [dueDateDraft, setDueDateDraft] = useState<string>(() => {
    if (!card.dueDate) return "";
    const d = typeof card.dueDate === "string" ? new Date(card.dueDate) : card.dueDate;
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    setTitleDraft(card.title);
    setDescDraft(card.description ?? "");
    setPriorityDraft(card.priority);
    setDueDateDraft(() => {
      if (!card.dueDate) return "";
      const d = typeof card.dueDate === "string" ? new Date(card.dueDate) : card.dueDate;
      return d.toISOString().slice(0, 10);
    });
  }, [card]);

  const updateCard = trpc.kanban.cards.update.useMutation({
    onSuccess: () => utils.kanban.cards.listByBoard.invalidate({ boardId: card.boardId }),
    onError: (e) => toast.error(e.message ?? "Falha ao salvar"),
  });

  const sla = computeSla(card.enteredListAt, slaDays);
  const slaStyle = slaStyles[sla.state];
  const prioStyle = priorityStyles[card.priority];

  const due = (() => {
    if (!card.dueDate) return null;
    const d = typeof card.dueDate === "string" ? new Date(card.dueDate) : card.dueDate;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  })();

  const visibleAssignees = assignees.slice(0, 4);
  const extraAssignees = Math.max(0, assignees.length - visibleAssignees.length);
  const hasCounters =
    (checklist?.total ?? 0) > 0 || commentsCount > 0 || attachmentsCount > 0;

  const saveTitleIfChanged = () => {
    const next = titleDraft.trim();
    if (!next || next === card.title) {
      setTitleDraft(card.title);
      return;
    }
    updateCard.mutate({ id: card.id, boardId: card.boardId, title: next });
  };

  const saveDescIfChanged = () => {
    const next = descDraft.trim();
    if (next === (card.description ?? "")) return;
    updateCard.mutate({
      id: card.id,
      boardId: card.boardId,
      description: next.length === 0 ? null : next,
    });
  };

  const onPriorityChange = (v: string) => {
    const next = v as Priority;
    setPriorityDraft(next);
    if (next !== card.priority) {
      updateCard.mutate({ id: card.id, boardId: card.boardId, priority: next });
    }
  };

  const onDueDateChange = (v: string) => {
    setDueDateDraft(v);
    const current = (() => {
      if (!card.dueDate) return "";
      const d = typeof card.dueDate === "string" ? new Date(card.dueDate) : card.dueDate;
      return d.toISOString().slice(0, 10);
    })();
    if (v !== current) {
      updateCard.mutate({
        id: card.id,
        boardId: card.boardId,
        dueDate: v.length === 0 ? null : v,
      });
    }
  };

  return (
    <div
      className={cn(
        "rounded-md border border-l-4 bg-card p-3 shadow-sm transition-all",
        slaStyle.border,
        !expanded && "hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
      )}
      onClick={() => {
        if (!editingTitle) setExpanded((v) => !v);
      }}
    >
      {/* Board context chip (cross-board view) */}
      {boardLabel && (
        <div className="mb-1.5 flex items-center gap-1.5">
          {dragHandle}
          <span
            className="inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium text-white"
            style={{ backgroundColor: boardColor ?? "#6366f1" }}
          >
            <span className="truncate">{boardLabel}</span>
          </span>
        </div>
      )}

      {/* Linha 1: titulo + expand toggle */}
      <div className="mb-1.5 flex items-start gap-2">
        {!boardLabel && dragHandle}
        {editingTitle && canEdit ? (
          <Input
            value={titleDraft}
            autoFocus
            className="h-7 text-sm font-semibold"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              saveTitleIfChanged();
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setTitleDraft(card.title);
                setEditingTitle(false);
              }
            }}
          />
        ) : (
          <div
            className={cn(
              "flex-1 text-sm font-semibold leading-tight",
              canEdit && "cursor-text hover:bg-muted/50 -mx-1 px-1 rounded",
            )}
            onDoubleClick={(e) => {
              if (!canEdit) return;
              e.stopPropagation();
              setEditingTitle(true);
            }}
            title={canEdit ? "Duplo-clique para editar" : undefined}
          >
            {card.title}
          </div>
        )}
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform"
          style={{ transform: expanded ? "rotate(180deg)" : "" }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Linha 2: badges (prioridade + SLA) */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", prioStyle.pill)}>
          {prioStyle.label}
        </span>
        {sla.state !== "none" && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]",
              slaStyle.badge,
            )}
            title={`SLA: ${slaDays} dias`}
          >
            <Clock className="h-3 w-3" />
            {sla.state === "overdue"
              ? `VENCIDO ${Math.abs(sla.daysRemaining ?? 0)}d`
              : `${sla.daysElapsed}/${slaDays}d`}
          </span>
        )}
        {due && (
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {due}
          </span>
        )}
      </div>

      {/* Linha 3: assignees + labels */}
      {(assignees.length > 0 || labels.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {assignees.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {visibleAssignees.map((a) => (
                <Avatar
                  key={`${card.id}-${a.userId}`}
                  className="h-5 w-5 border border-card"
                  title={a.fullName ?? a.name ?? a.email ?? "Responsavel"}
                >
                  <AvatarFallback className="bg-primary text-[9px] font-semibold text-primary-foreground">
                    {a.avatarFallback ?? "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
              {extraAssignees > 0 && (
                <span className="inline-flex h-5 items-center justify-center rounded-full bg-muted px-1.5 text-[9px] font-semibold">
                  +{extraAssignees}
                </span>
              )}
            </div>
          )}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {labels.map((l) => (
                <span
                  key={l.labelId}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Linha 4: counters */}
      {hasCounters && !expanded && (
        <div className="mt-2 flex items-center gap-3 border-t border-border pt-1.5 text-[11px] text-muted-foreground">
          {(checklist?.total ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {checklist!.done}/{checklist!.total}
            </span>
          )}
          {commentsCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {commentsCount}
            </span>
          )}
          {attachmentsCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {attachmentsCount}
            </span>
          )}
        </div>
      )}

      {/* Expanded: edicao inline */}
      {expanded && (
        <div
          className="mt-3 space-y-3 border-t pt-3"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Descricao
            </div>
            <Textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={saveDescIfChanged}
              disabled={!canEdit}
              rows={3}
              placeholder="Adicionar descricao..."
              className="text-xs"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Prioridade
              </div>
              <Select value={priorityDraft} onValueChange={onPriorityChange} disabled={!canEdit}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Prazo
              </div>
              <Input
                type="date"
                value={dueDateDraft}
                onChange={(e) => onDueDateChange(e.target.value)}
                disabled={!canEdit}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {sla.state !== "none" && (
            <div className="rounded border bg-muted/40 p-2 text-[11px]">
              <div className="font-semibold text-foreground">SLA da coluna: {slaDays} dias</div>
              <div className="text-muted-foreground">
                Entrou ha {sla.daysElapsed}d.{" "}
                {sla.daysRemaining != null && sla.daysRemaining >= 0
                  ? `${sla.daysRemaining}d restantes (${slaStyle.label})`
                  : `vencido ha ${Math.abs(sla.daysRemaining ?? 0)}d`}
              </div>
            </div>
          )}

          <div className="text-[10px] text-muted-foreground">
            Comentarios/anexos/checklist editaveis disponiveis no Kanban v1. Inline edit v2: titulo (duplo-clique), descricao, prioridade, prazo.
          </div>
        </div>
      )}
    </div>
  );
}
