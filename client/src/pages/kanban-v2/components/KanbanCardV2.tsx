import { useEffect, useState } from "react";
import {
  Archive,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  ExternalLink,
  Hourglass,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
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
  acceptedAt?: Date | string | null;
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
  dragHandle,
  onOpenDetail,
  onArchive,
  onDelete,
}: {
  card: KanbanCardV2Data;
  slaDays: number | null;
  assignees: AssigneeData[];
  labels: LabelData[];
  checklist?: ChecklistCount;
  commentsCount?: number;
  attachmentsCount?: number;
  canEdit: boolean;
  dragHandle?: React.ReactNode;
  onOpenDetail?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const { user: currentUser } = useAuth();
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
    onSuccess: () => {
      utils.kanban.cards.listByBoard.invalidate({ boardId: card.boardId });
      utils.kanban.cards.listAcrossUserBoards.invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Falha ao salvar"),
  });

  const acceptMut = trpc.kanban.cards.acceptAssignment.useMutation({
    onSuccess: () => {
      utils.kanban.cards.listAcrossUserBoards.invalidate();
      toast.success("Demanda aceita");
    },
    onError: (e) => toast.error(e.message ?? "Falha ao aceitar"),
  });

  const myAssignment = currentUser?.id
    ? assignees.find((a) => a.userId === currentUser.id)
    : null;
  const pendingAccept = myAssignment && !myAssignment.acceptedAt;
  const hasPendingAssignees = assignees.some((a) => !a.acceptedAt);

  const sla = computeSla(card.enteredListAt, slaDays);
  const slaStyle = slaStyles[sla.state];
  const prioStyle = priorityStyles[card.priority];

  const due = (() => {
    if (!card.dueDate) return null;
    const d = typeof card.dueDate === "string" ? new Date(card.dueDate) : card.dueDate;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  })();

  const visibleAssignees = assignees.slice(0, 3);
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

  const hasMenu = !!(onOpenDetail || onArchive || onDelete);

  return (
    <div
      className={cn(
        "group/card rounded-md border border-l-[3px] bg-card p-2.5 shadow-sm transition-all",
        slaStyle.border,
        !expanded && "hover:shadow-md cursor-pointer",
      )}
      onClick={() => {
        if (!editingTitle) setExpanded((v) => !v);
      }}
    >
      {/* Row 1: drag + title + actions */}
      <div className="flex items-start gap-1.5">
        {dragHandle && (
          <div className="mt-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
            {dragHandle}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Title — click to edit */}
          {editingTitle && canEdit ? (
            <Input
              value={titleDraft}
              autoFocus
              className="h-6 text-sm font-semibold px-1"
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
                "text-sm font-medium leading-snug",
                canEdit && "cursor-text hover:bg-muted/50 -mx-0.5 px-0.5 rounded",
              )}
              onClick={(e) => {
                if (!canEdit) return;
                e.stopPropagation();
                setEditingTitle(true);
              }}
              title={canEdit ? "Clique para editar" : undefined}
            >
              {card.title}
            </div>
          )}
        </div>

        {/* Expand + menu (menu only on hover) */}
        <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-transform"
            style={{ transform: expanded ? "rotate(180deg)" : "" }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            <ChevronDown className="h-3 w-3" />
          </button>

          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Acoes do card"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onOpenDetail && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetail();
                    }}
                  >
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Abrir detalhes
                  </DropdownMenuItem>
                )}
                {(onArchive || onDelete) && onOpenDetail && <DropdownMenuSeparator />}
                {onArchive && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive();
                    }}
                  >
                    <Archive className="mr-2 h-3.5 w-3.5" />
                    Arquivar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Accept button */}
      {pendingAccept && (
        <div className="mt-1.5">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
            disabled={acceptMut.isPending}
            onClick={(e) => {
              e.stopPropagation();
              acceptMut.mutate({ cardId: card.id });
            }}
          >
            <Check className="h-3.5 w-3.5" />
            {acceptMut.isPending ? "Aceitando..." : "Aceitar demanda"}
          </button>
        </div>
      )}

      {/* Row 2: badges */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold leading-none", prioStyle.pill)}>
          {prioStyle.label}
        </span>
        {hasPendingAssignees && !pendingAccept && (
          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] leading-none bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
            <Hourglass className="h-2.5 w-2.5" />
            Aguardando aceite
          </span>
        )}
        {sla.state !== "none" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] leading-none",
              slaStyle.badge,
            )}
            title={`SLA: ${slaDays} dias`}
          >
            <Clock className="h-2.5 w-2.5" />
            {sla.state === "overdue"
              ? `${Math.abs(sla.daysRemaining ?? 0)}d atraso`
              : `${sla.daysElapsed}/${slaDays}d`}
          </span>
        )}
        {due && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground leading-none">
            <Calendar className="h-2.5 w-2.5" />
            {due}
          </span>
        )}
      </div>

      {/* Row 3: assignees + labels + counters */}
      {(assignees.length > 0 || labels.length > 0 || (hasCounters && !expanded)) && (
        <div className="mt-2 flex items-center gap-2 text-[10px]">
          {/* Assignees */}
          {assignees.length > 0 && (
            <div className="flex -space-x-1">
              {visibleAssignees.map((a) => (
                <Avatar
                  key={`${card.id}-${a.userId}`}
                  className="h-5 w-5 border-2 border-card"
                  title={a.fullName ?? a.name ?? a.email ?? "Responsavel"}
                >
                  <AvatarFallback className="bg-primary text-[8px] font-semibold text-primary-foreground">
                    {a.avatarFallback ?? "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
              {extraAssignees > 0 && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted border-2 border-card text-[8px] font-semibold">
                  +{extraAssignees}
                </span>
              )}
            </div>
          )}

          {/* Labels */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {labels.map((l) => (
                <span
                  key={l.labelId}
                  className="h-2 w-5 rounded-full"
                  style={{ backgroundColor: l.color }}
                  title={l.name}
                />
              ))}
            </div>
          )}

          {/* Spacer */}
          {(assignees.length > 0 || labels.length > 0) && hasCounters && !expanded && (
            <div className="flex-1" />
          )}

          {/* Inline counters */}
          {hasCounters && !expanded && (
            <div className="flex items-center gap-2 text-muted-foreground">
              {(checklist?.total ?? 0) > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <CheckSquare className="h-2.5 w-2.5" />
                  {checklist!.done}/{checklist!.total}
                </span>
              )}
              {commentsCount > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <MessageSquare className="h-2.5 w-2.5" />
                  {commentsCount}
                </span>
              )}
              {attachmentsCount > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <Paperclip className="h-2.5 w-2.5" />
                  {attachmentsCount}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Expanded: inline quick edit */}
      {expanded && (
        <div
          className="mt-2.5 space-y-2.5 border-t pt-2.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Descricao
            </div>
            <Textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={saveDescIfChanged}
              disabled={!canEdit}
              rows={2}
              placeholder="Adicionar descricao..."
              className="text-xs resize-none"
            />
          </div>

          <div className="grid gap-2 grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Prioridade
              </div>
              <Select value={priorityDraft} onValueChange={onPriorityChange} disabled={!canEdit}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Prazo
              </div>
              <Input
                type="date"
                value={dueDateDraft}
                onChange={(e) => onDueDateChange(e.target.value)}
                disabled={!canEdit}
                className="h-7 text-xs"
              />
            </div>
          </div>

          {sla.state !== "none" && (
            <div className="rounded border bg-muted/40 p-2 text-[11px]">
              <div className="font-semibold text-foreground">SLA: {slaDays} dias</div>
              <div className="text-muted-foreground">
                {sla.daysElapsed}d decorridos.{" "}
                {sla.daysRemaining != null && sla.daysRemaining >= 0
                  ? `${sla.daysRemaining}d restantes`
                  : `vencido ha ${Math.abs(sla.daysRemaining ?? 0)}d`}
              </div>
            </div>
          )}

          {onOpenDetail && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-7"
              onClick={onOpenDetail}
            >
              <ExternalLink className="mr-1.5 h-3 w-3" />
              Detalhes completos
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
