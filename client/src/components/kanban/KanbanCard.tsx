import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, Calendar, CheckSquare, ChevronDown, MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CardInlineExpanded } from "./CardInlineExpanded";

export type KanbanCardData = {
  id: number;
  listId: number;
  boardId: number;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: Date | string | null;
  position: number;
};

export type KanbanLabelData = {
  cardId: number;
  labelId: number;
  name: string;
  color: string;
};

export type KanbanAssigneeData = {
  cardId: number;
  userId: number;
  employeeId: number | null;
  name: string | null;
  email: string | null;
  fullName: string | null;
  avatarFallback: string | null;
};

export type KanbanChecklistCountData = {
  cardId: number;
  total: number;
  done: number;
};

const priorityColor: Record<KanbanCardData["priority"], string> = {
  low: "bg-slate-200 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

type DueState = "none" | "future" | "soon" | "today" | "overdue";

function daysUntilDue(value: Date | string | null): number | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return null;
  // dueDate gravada como UTC midnight (YYYY-MM-DDT00:00:00Z) — comparar em UTC para evitar shift de timezone
  const dueUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((dueUtc - todayUtc) / 86_400_000);
}

function dueState(value: Date | string | null): DueState {
  const diff = daysUntilDue(value);
  if (diff === null) return "none";
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 2) return "soon";
  return "future";
}

function formatDueDate(value: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

const dueStyles: Record<Exclude<DueState, "none">, string> = {
  future: "bg-emerald-100 text-emerald-700",
  soon: "bg-amber-100 text-amber-800",
  today: "bg-orange-100 text-orange-800 font-medium",
  overdue: "bg-red-100 text-red-700 font-semibold",
};

function dueLabelPrefix(state: DueState): string {
  if (state === "today") return "Hoje · ";
  if (state === "overdue") return "Vencido · ";
  return "";
}

export function KanbanCard({
  card,
  labels,
  assignees,
  checklist,
  expanded = false,
  onToggleExpand,
  onEdit,
  onArchive,
  onDelete,
  canEdit = false,
  canDelete = false,
  readonly,
}: {
  card: KanbanCardData;
  labels: KanbanLabelData[];
  assignees: KanbanAssigneeData[];
  checklist?: { total: number; done: number };
  expanded?: boolean;
  onToggleExpand?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  readonly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", card },
    disabled: readonly || expanded,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const due = formatDueDate(card.dueDate);
  const dueStateValue = dueState(card.dueDate);
  const visibleAssignees = assignees.slice(0, 3);
  const extraAssignees = Math.max(0, assignees.length - visibleAssignees.length);
  const hasChecklist = (checklist?.total ?? 0) > 0;
  const checklistComplete = hasChecklist && checklist!.done === checklist!.total;
  const showMenu = !!(onEdit || onArchive || (canDelete && onDelete));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(expanded ? {} : attributes)}
      {...(expanded ? {} : listeners)}
      onClick={(e) => {
        // Ignora clicks vindos do kebab / area expandida
        if ((e.target as HTMLElement).closest("[data-no-toggle]")) return;
        onToggleExpand?.();
      }}
      title={expanded ? "Clique para recolher" : "Clique para expandir"}
      className={cn(
        "group relative rounded-md border border-border bg-card p-3 shadow-sm transition-colors",
        !expanded && "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
        expanded && "ring-1 ring-primary/40 shadow-md cursor-default",
        isDragging && "ring-2 ring-primary",
      )}
    >
      {/* Kebab + indicador */}
      <div
        className="absolute right-1 top-1 flex items-center gap-0.5"
        data-no-toggle
      >
        {expanded && (
          <ChevronDown
            className="pointer-events-none h-3.5 w-3.5 rotate-180 text-muted-foreground"
            aria-hidden
          />
        )}
        {showMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Acoes do card"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={onArchive}>Arquivar</DropdownMenuItem>
              )}
              {canDelete && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    Excluir permanentemente
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1 pr-8">
          {labels.map((label) => (
            <span
              key={label.labelId}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="pr-8 text-sm font-medium leading-snug">{card.title}</div>

      {!expanded && card.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {card.description}
        </p>
      )}
      {expanded && card.description && (
        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
          {card.description}
        </p>
      )}

      {(due || card.priority !== "medium" || assignees.length > 0 || hasChecklist) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {card.priority !== "medium" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
                priorityColor[card.priority],
              )}
            >
              <AlertCircle className="h-3 w-3" />
              {card.priority}
            </span>
          )}
          {due && dueStateValue !== "none" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
                dueStyles[dueStateValue],
              )}
            >
              <Calendar className="h-3 w-3" />
              {dueLabelPrefix(dueStateValue)}
              {due}
            </span>
          )}
          {hasChecklist && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
                checklistComplete
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <CheckSquare className="h-3 w-3" />
              {checklist!.done}/{checklist!.total}
            </span>
          )}
          {assignees.length > 0 && (
            <div className="ml-auto flex items-center gap-1">
              <div className="flex -space-x-2">
                {visibleAssignees.map((assignee) => (
                  <Avatar
                    key={`${assignee.cardId}-${assignee.userId}`}
                    className="size-5 border border-background bg-muted"
                    title={
                      assignee.fullName ??
                      assignee.name ??
                      assignee.email ??
                      "Responsavel"
                    }
                  >
                    <AvatarFallback className="text-[9px] font-semibold">
                      {assignee.avatarFallback ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {extraAssignees > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                  +{extraAssignees}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div data-no-toggle>
          <CardInlineExpanded
            cardId={card.id}
            boardId={card.boardId}
            canEdit={canEdit}
          />
        </div>
      )}
    </div>
  );
}
