import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  pointerWithin,
  rectIntersection,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, GripVertical, KanbanSquare, Loader2, Search, Sparkles, UserCheck } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { KanbanCardV2 } from "./components/KanbanCardV2";
import { GLOBAL_STATUS_COLUMNS, type GlobalStatus, type KanbanCardV2Data } from "./types";

type CardWithBoard = KanbanCardV2Data & {
  boardName: string;
  boardColor: string | null;
  listName: string;
};

type AssigneeData = {
  cardId: number;
  userId: number;
  employeeId: number | null;
  name: string | null;
  email: string | null;
  fullName: string | null;
  avatarFallback: string | null;
};

type LabelData = {
  cardId: number;
  labelId: number;
  name: string;
  color: string;
};

function SortableCard({
  card,
  assignees,
  labels,
  checklist,
  canEdit,
}: {
  card: CardWithBoard;
  assignees: AssigneeData[];
  labels: LabelData[];
  checklist?: { total: number; done: number };
  canEdit: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCardV2
        card={card}
        slaDays={null}
        assignees={assignees.map((a) => ({
          userId: a.userId,
          fullName: a.fullName,
          name: a.name,
          email: a.email,
          avatarFallback: a.avatarFallback,
        }))}
        labels={labels.map((l) => ({ labelId: l.labelId, name: l.name, color: l.color }))}
        checklist={checklist}
        canEdit={canEdit}
        boardLabel={card.boardName}
        boardColor={card.boardColor}
        dragHandle={
          <button
            type="button"
            className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Arrastar"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        }
      />
    </div>
  );
}

function StatusColumn({
  status,
  label,
  emoji,
  cards,
  children,
}: {
  status: GlobalStatus;
  label: string;
  emoji: string;
  cards: CardWithBoard[];
  children: React.ReactNode;
}) {
  const { setNodeRef: setOuterRef, isOver: outerOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });
  const { setNodeRef: setInnerRef, isOver: innerOver } = useDroppable({
    id: `column-inner-${status}`,
    data: { type: "column", status },
  });
  const isOver = outerOver || innerOver;

  return (
    <div
      ref={setOuterRef}
      className={cn(
        "flex min-h-[400px] w-full flex-col rounded-lg bg-muted/60 p-4 shadow-sm transition-colors",
        isOver && "ring-2 ring-primary bg-primary/5",
      )}
    >
      <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide">
          {emoji} {label}
        </h3>
        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
          {cards.length}
        </span>
      </div>
      <div ref={setInnerRef} className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "warning" }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center shadow-sm">
      <div
        className={cn(
          "text-2xl font-bold tabular-nums",
          tone === "warning" ? "text-orange-600" : "text-primary",
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export default function KanbanBoardV2() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const flagsQuery = trpc.system.flags.useQuery();
  const cardsQuery = trpc.kanban.cards.listAcrossUserBoards.useQuery();
  const { user: currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [activeCard, setActiveCard] = useState<CardWithBoard | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Collision: prefer pointer-within (catches empty columns), fallback to rectIntersection
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  };

  const updateCard = trpc.kanban.cards.update.useMutation({
    onMutate: async (variables) => {
      await utils.kanban.cards.listAcrossUserBoards.cancel();
      const previous = utils.kanban.cards.listAcrossUserBoards.getData();
      if (previous && variables.globalStatus) {
        const next = {
          ...previous,
          cards: previous.cards.map((c) =>
            c.id === variables.id ? { ...c, globalStatus: variables.globalStatus } : c,
          ),
        };
        utils.kanban.cards.listAcrossUserBoards.setData(undefined, next as any);
      }
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) utils.kanban.cards.listAcrossUserBoards.setData(undefined, ctx.previous);
      toast.error("Falha ao mover card");
    },
    onSettled: () => utils.kanban.cards.listAcrossUserBoards.invalidate(),
  });

  const cardsRaw = useMemo(
    () => (cardsQuery.data?.cards ?? []) as CardWithBoard[],
    [cardsQuery.data],
  );

  const assigneesByCard = useMemo(() => {
    const map = new Map<number, AssigneeData[]>();
    for (const a of cardsQuery.data?.assignees ?? []) {
      const arr = map.get(a.cardId) ?? [];
      arr.push(a as AssigneeData);
      map.set(a.cardId, arr);
    }
    return map;
  }, [cardsQuery.data]);

  const labelsByCard = useMemo(() => {
    const map = new Map<number, LabelData[]>();
    for (const l of cardsQuery.data?.labels ?? []) {
      const arr = map.get(l.cardId) ?? [];
      arr.push(l as LabelData);
      map.set(l.cardId, arr);
    }
    return map;
  }, [cardsQuery.data]);

  const checklistByCard = useMemo(() => {
    const map = new Map<number, { total: number; done: number }>();
    for (const e of cardsQuery.data?.checklistCounts ?? []) {
      map.set(e.cardId, { total: e.total, done: e.done });
    }
    return map;
  }, [cardsQuery.data]);

  const filteredCards = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return cardsRaw.filter((card) => {
      const matchesSearch =
        term.length === 0 ||
        card.title.toLowerCase().includes(term) ||
        (card.description ?? "").toLowerCase().includes(term) ||
        card.boardName.toLowerCase().includes(term) ||
        (assigneesByCard.get(card.id) ?? []).some((a) =>
          (a.fullName ?? a.name ?? a.email ?? "").toLowerCase().includes(term),
        ) ||
        (labelsByCard.get(card.id) ?? []).some((l) => l.name.toLowerCase().includes(term));

      const matchesMine =
        !mineOnly ||
        (currentUser?.id != null &&
          (assigneesByCard.get(card.id) ?? []).some((a) => a.userId === currentUser.id));

      return matchesSearch && matchesMine;
    });
  }, [cardsRaw, assigneesByCard, labelsByCard, searchTerm, mineOnly, currentUser?.id]);

  const cardsByStatus = useMemo(() => {
    const map: Record<GlobalStatus, CardWithBoard[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const c of filteredCards) {
      const status = (c.globalStatus ?? "todo") as GlobalStatus;
      (map[status] ?? map.todo).push(c);
    }
    return map;
  }, [filteredCards]);

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current;
    if (data?.type === "card") setActiveCard(data.card as CardWithBoard);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = e;
    if (!over) return;
    const activeData = active.data.current;
    const overData = over.data.current;
    if (activeData?.type !== "card") return;
    const card = activeData.card as CardWithBoard;

    let targetStatus: GlobalStatus | null = null;
    if (overData?.type === "column") {
      targetStatus = overData.status as GlobalStatus;
    } else if (overData?.type === "card") {
      targetStatus = (overData.card as CardWithBoard).globalStatus;
    }
    if (!targetStatus || targetStatus === card.globalStatus) return;

    updateCard.mutate({
      id: card.id,
      boardId: card.boardId,
      globalStatus: targetStatus,
    });
  };

  if (flagsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-muted-foreground">Carregando...</div>
      </DashboardLayout>
    );
  }

  if (!flagsQuery.data?.kanbanV2) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-md py-16 text-center">
          <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h1 className="mt-4 text-xl font-bold">Kanban v2 desabilitado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Feature flag{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">KANBAN_V2_ENABLED</code> nao
            esta ativa.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => navigate("/kanban")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar ao Kanban v1
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const total = cardsRaw.length;
  const todoCount = cardsByStatus.todo.length;
  const inProgressCount = cardsByStatus.in_progress.length;
  const doneCount = cardsByStatus.done.length;
  const highPriorityCount = cardsRaw.filter(
    (c) => c.priority === "high" || c.priority === "urgent",
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* HEADER */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/kanban")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <KanbanSquare className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Kanban v2</h1>
            <p className="text-sm text-muted-foreground">
              Vista unificada cross-board. Arraste cards entre colunas pra mudar o status global.
            </p>
          </div>
        </div>

        {/* Controles: busca + atribuido a mim */}
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por titulo, board, responsavel ou label"
              className="h-9 pl-8 text-sm"
            />
          </div>
          <Button
            variant={mineOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setMineOnly((v) => !v)}
            disabled={!currentUser?.id}
            className="h-9 gap-1.5"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Atribuido a mim
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          <StatCard label="Total" value={total} />
          <StatCard label="A Fazer" value={todoCount} />
          <StatCard label="Em Progresso" value={inProgressCount} />
          <StatCard label="Concluido" value={doneCount} />
          <StatCard label="Alta Prioridade" value={highPriorityCount} tone="warning" />
        </div>

        {/* Board */}
        {cardsQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid gap-4 md:grid-cols-3">
              {GLOBAL_STATUS_COLUMNS.map((col) => {
                const colCards = cardsByStatus[col.value];
                return (
                  <StatusColumn
                    key={col.value}
                    status={col.value}
                    label={col.label}
                    emoji={col.emoji}
                    cards={colCards}
                  >
                    <SortableContext
                      items={colCards.map((c) => `card-${c.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {colCards.length === 0 ? (
                        <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                          Arraste um card aqui
                        </div>
                      ) : (
                        colCards.map((card) => (
                          <SortableCard
                            key={card.id}
                            card={card}
                            assignees={assigneesByCard.get(card.id) ?? []}
                            labels={labelsByCard.get(card.id) ?? []}
                            checklist={checklistByCard.get(card.id)}
                            canEdit
                          />
                        ))
                      )}
                    </SortableContext>
                  </StatusColumn>
                );
              })}
            </div>

            <DragOverlay>
              {activeCard && (
                <div className="opacity-90">
                  <KanbanCardV2
                    card={activeCard}
                    slaDays={null}
                    assignees={(assigneesByCard.get(activeCard.id) ?? []).map((a) => ({
                      userId: a.userId,
                      fullName: a.fullName,
                      name: a.name,
                      email: a.email,
                      avatarFallback: a.avatarFallback,
                    }))}
                    labels={(labelsByCard.get(activeCard.id) ?? []).map((l) => ({
                      labelId: l.labelId,
                      name: l.name,
                      color: l.color,
                    }))}
                    checklist={checklistByCard.get(activeCard.id)}
                    canEdit
                    boardLabel={activeCard.boardName}
                    boardColor={activeCard.boardColor}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </DashboardLayout>
  );
}
