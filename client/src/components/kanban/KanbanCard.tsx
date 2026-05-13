import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, Calendar } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

const priorityColor: Record<KanbanCardData["priority"], string> = {
  low: "bg-slate-200 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function formatDueDate(value: Date | string | null) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function isOverdue(value: Date | string | null) {
  if (!value) return false;
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

export function KanbanCard({
  card,
  labels,
  assignees,
  onClick,
  readonly,
}: {
  card: KanbanCardData;
  labels: KanbanLabelData[];
  assignees: KanbanAssigneeData[];
  onClick: () => void;
  readonly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", card },
    disabled: readonly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const due = formatDueDate(card.dueDate);
  const overdue = isOverdue(card.dueDate);
  const visibleAssignees = assignees.slice(0, 3);
  const extraAssignees = Math.max(0, assignees.length - visibleAssignees.length);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-md border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
        isDragging && "ring-2 ring-primary",
      )}
    >
      {labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
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

      <div className="text-sm font-medium leading-snug">{card.title}</div>

      {(due || card.priority !== "medium" || assignees.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {card.priority !== "medium" && (
            <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5", priorityColor[card.priority])}>
              <AlertCircle className="h-3 w-3" />
              {card.priority}
            </span>
          )}
          {due && (
            <span className={cn("inline-flex items-center gap-1 text-muted-foreground", overdue && "font-medium text-red-600")}>
              <Calendar className="h-3 w-3" />
              {due}
            </span>
          )}
          {assignees.length > 0 && (
            <div className="ml-auto flex items-center gap-1">
              <div className="flex -space-x-2">
                {visibleAssignees.map((assignee) => (
                  <Avatar
                    key={`${assignee.cardId}-${assignee.userId}`}
                    className="size-5 border border-background bg-muted"
                    title={assignee.fullName ?? assignee.name ?? assignee.email ?? "Responsavel"}
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
    </div>
  );
}
