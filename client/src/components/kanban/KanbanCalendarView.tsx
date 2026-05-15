import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CalendarOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  KanbanAssigneeData,
  KanbanCardData,
  KanbanLabelData,
} from "./KanbanCard";

const PRIORITY_RING: Record<KanbanCardData["priority"], string> = {
  low: "border-l-slate-400",
  medium: "border-l-blue-400",
  high: "border-l-orange-500",
  urgent: "border-l-red-500",
};

function dueAsUtcDay(value: Date | string | null): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function localDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatLocalKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function formatCellKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CardChip({
  card,
  labels,
  onClick,
}: {
  card: KanbanCardData;
  labels: KanbanLabelData[];
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `cal-card-${card.id}`,
    data: { card },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const firstLabel = labels[0];

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "w-full truncate rounded border-l-2 bg-card px-1.5 py-0.5 text-left text-[11px] shadow-sm hover:bg-accent",
        PRIORITY_RING[card.priority],
        isDragging && "opacity-30",
      )}
      title={card.title}
    >
      {firstLabel && (
        <span
          className="mr-1 inline-block size-1.5 rounded-full align-middle"
          style={{ backgroundColor: firstLabel.color }}
        />
      )}
      <span className="align-middle">{card.title}</span>
    </button>
  );
}

function DayCell({
  date,
  inMonth,
  cards,
  labelsByCard,
  onCardClick,
  canEdit,
}: {
  date: Date;
  inMonth: boolean;
  cards: KanbanCardData[];
  labelsByCard: Map<number, KanbanLabelData[]>;
  onCardClick: (id: number) => void;
  canEdit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${formatCellKey(date)}`,
    data: { dateKey: formatCellKey(date), type: "calendar-day" },
    disabled: !canEdit,
  });

  const todayFlag = isToday(date);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[88px] rounded border bg-background p-1 transition-colors",
        !inMonth && "bg-muted/30 opacity-60",
        isOver && canEdit && "ring-2 ring-primary",
      )}
    >
      <div
        className={cn(
          "mb-1 flex items-center justify-between text-[10px]",
          todayFlag ? "font-bold text-primary" : "text-muted-foreground",
        )}
      >
        <span>{date.getDate()}</span>
        {cards.length > 0 && (
          <span className="rounded bg-muted px-1 text-[9px]">{cards.length}</span>
        )}
      </div>
      <div className="space-y-0.5">
        {cards.slice(0, 4).map((c) => (
          <CardChip
            key={c.id}
            card={c}
            labels={labelsByCard.get(c.id) ?? []}
            onClick={() => onCardClick(c.id)}
          />
        ))}
        {cards.length > 4 && (
          <span className="text-[9px] text-muted-foreground">+ {cards.length - 4} mais</span>
        )}
      </div>
    </div>
  );
}

export function KanbanCalendarView({
  cards,
  labelsByCard,
  assigneesByCard: _assigneesByCard,
  onCardClick,
  onCardDateChange,
  canEdit,
}: {
  cards: KanbanCardData[];
  labelsByCard: Map<number, KanbanLabelData[]>;
  assigneesByCard: Map<number, KanbanAssigneeData[]>;
  onCardClick: (cardId: number) => void;
  onCardDateChange: (cardId: number, isoDate: string | null) => void;
  canEdit: boolean;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [draggingCard, setDraggingCard] = useState<KanbanCardData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const cardsByDay = useMemo(() => {
    const map = new Map<string, KanbanCardData[]>();
    for (const card of cards) {
      const day = dueAsUtcDay(card.dueDate);
      if (!day) continue;
      // Mapeia UTC day para chave local-equivalente do mesmo dia civil
      const key = formatLocalKey(day);
      const list = map.get(key) ?? [];
      list.push(card);
      map.set(key, list);
    }
    return map;
  }, [cards]);

  const cardsWithoutDue = useMemo(
    () => cards.filter((c) => !c.dueDate),
    [cards],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = event.active.data.current?.card as KanbanCardData | undefined;
    if (card) setDraggingCard(card);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingCard(null);
    const { active, over } = event;
    if (!over) return;
    const card = active.data.current?.card as KanbanCardData | undefined;
    if (!card) return;
    const dateKey = over.data.current?.dateKey as string | undefined;
    if (!dateKey) return;

    // Compara com prazo atual (UTC day key)
    const current = card.dueDate ? dueAsUtcDay(card.dueDate) : null;
    const currentKey = current ? formatLocalKey(current) : null;
    if (currentKey === dateKey) return;

    onCardDateChange(card.id, dateKey);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </h3>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={() => setCurrentMonth(new Date())}
              >
                Hoje
              </Button>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              aria-label="Proximo mes"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = formatCellKey(day);
              const dayCards = cardsByDay.get(key) ?? [];
              return (
                <DayCell
                  key={key}
                  date={day}
                  inMonth={isSameMonth(day, currentMonth)}
                  cards={dayCards}
                  labelsByCard={labelsByCard}
                  onCardClick={onCardClick}
                  canEdit={canEdit}
                />
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-1 text-sm font-semibold">
            <CalendarOff className="h-3.5 w-3.5" />
            Sem prazo ({cardsWithoutDue.length})
          </div>
          {cardsWithoutDue.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Todos os cards visiveis tem prazo.
            </p>
          ) : (
            <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
              {cardsWithoutDue.map((c) => (
                <CardChip
                  key={c.id}
                  card={c}
                  labels={labelsByCard.get(c.id) ?? []}
                  onClick={() => onCardClick(c.id)}
                />
              ))}
            </div>
          )}
          {canEdit && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Arraste um card pra um dia do calendario pra definir prazo.
            </p>
          )}
        </div>
      </div>

      <DragOverlay>
        {draggingCard && (
          <div className="rounded border border-primary/40 bg-card px-1.5 py-0.5 text-[11px] shadow-md">
            {draggingCard.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
