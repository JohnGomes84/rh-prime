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
import {
  ArrowLeft,
  Filter,
  GripVertical,
  KanbanSquare,
  Loader2,
  Plus,
  Search,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { CardDetailDrawer } from "@/components/kanban/CardDetailDrawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { KanbanCardV2 } from "./components/KanbanCardV2";
import { NewCardDialog } from "./components/NewCardDialog";
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

type BoardMemberData = {
  id: number;
  userId: number;
  role: "admin" | "editor" | "viewer";
  userName: string | null;
  userEmail: string | null;
  employeeName: string | null;
};

type BoardLabelData = {
  id: number;
  boardId: number;
  name: string;
  color: string;
};

const COLUMN_STYLES: Record<GlobalStatus, { accent: string; bg: string; badge: string }> = {
  todo: {
    accent: "border-t-2 border-t-slate-400",
    bg: "bg-slate-50/50 dark:bg-slate-900/20",
    badge: "bg-slate-500",
  },
  in_progress: {
    accent: "border-t-2 border-t-blue-500",
    bg: "bg-blue-50/30 dark:bg-blue-950/20",
    badge: "bg-blue-500",
  },
  done: {
    accent: "border-t-2 border-t-emerald-500",
    bg: "bg-emerald-50/30 dark:bg-emerald-950/20",
    badge: "bg-emerald-500",
  },
};

function SortableCard({
  card,
  assignees,
  labels,
  checklist,
  canEdit,
  onOpenDetail,
  onArchive,
  onDelete,
}: {
  card: CardWithBoard;
  assignees: AssigneeData[];
  labels: LabelData[];
  checklist?: { total: number; done: number };
  canEdit: boolean;
  onOpenDetail?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
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
        onOpenDetail={onOpenDetail}
        onArchive={onArchive}
        onDelete={onDelete}
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
  const styles = COLUMN_STYLES[status];

  return (
    <div
      ref={setOuterRef}
      className={cn(
        "flex flex-col rounded-lg border transition-colors min-h-0",
        styles.accent,
        styles.bg,
        isOver && "ring-2 ring-primary/50 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {emoji} {label}
        </h3>
        <span
          className={cn(
            "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white",
            styles.badge,
          )}
        >
          {cards.length}
        </span>
      </div>
      <div
        ref={setInnerRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 scrollbar-thin"
      >
        {children}
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
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [activeCard, setActiveCard] = useState<CardWithBoard | null>(null);
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<CardWithBoard | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  };

  const boardMembersQuery = trpc.kanban.boards.listMembers.useQuery(
    { boardId: detailCard?.boardId ?? 0 },
    { enabled: !!detailCard },
  );
  const boardLabelsQuery = trpc.kanban.labels.listByBoard.useQuery(
    { boardId: detailCard?.boardId ?? 0 },
    { enabled: !!detailCard },
  );

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

  const archiveCard = trpc.kanban.cards.archive.useMutation({
    onSuccess: async () => {
      await utils.kanban.cards.listAcrossUserBoards.invalidate();
      toast.success("Card arquivado");
    },
    onError: (e) => toast.error(e.message ?? "Falha ao arquivar"),
  });

  const deleteCardHard = trpc.kanban.cards.deleteHard.useMutation({
    onSuccess: async () => {
      await utils.kanban.cards.listAcrossUserBoards.invalidate();
      toast.success("Card excluido permanentemente");
    },
    onError: (e) => toast.error(e.message ?? "Falha ao excluir"),
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

  const uniqueAssignees = useMemo(() => {
    const map = new Map<number, { userId: number; label: string }>();
    for (const a of cardsQuery.data?.assignees ?? []) {
      if (!map.has(a.userId)) {
        map.set(a.userId, {
          userId: a.userId,
          label: (a as AssigneeData).fullName ?? (a as AssigneeData).name ?? (a as AssigneeData).email ?? `Usuario ${a.userId}`,
        });
      }
    }
    return Array.from(map.values());
  }, [cardsQuery.data]);

  const uniqueLabels = useMemo(() => {
    const map = new Map<number, { labelId: number; name: string; color: string }>();
    for (const l of cardsQuery.data?.labels ?? []) {
      if (!map.has((l as LabelData).labelId)) {
        map.set((l as LabelData).labelId, {
          labelId: (l as LabelData).labelId,
          name: l.name,
          color: l.color,
        });
      }
    }
    return Array.from(map.values());
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

      const matchesAssignee =
        selectedAssigneeIds.length === 0 ||
        (assigneesByCard.get(card.id) ?? []).some((a) =>
          selectedAssigneeIds.includes(String(a.userId)),
        );

      const matchesLabel =
        selectedLabelIds.length === 0 ||
        (labelsByCard.get(card.id) ?? []).some((l) =>
          selectedLabelIds.includes(String(l.labelId)),
        );

      return matchesSearch && matchesMine && matchesAssignee && matchesLabel;
    });
  }, [cardsRaw, assigneesByCard, labelsByCard, searchTerm, mineOnly, currentUser?.id, selectedAssigneeIds, selectedLabelIds]);

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
  const highPriorityCount = cardsRaw.filter(
    (c) => c.priority === "high" || c.priority === "urgent",
  ).length;

  const activeFiltersCount =
    (mineOnly ? 1 : 0) +
    (selectedAssigneeIds.length > 0 ? 1 : 0) +
    (selectedLabelIds.length > 0 ? 1 : 0);

  const clearAllFilters = () => {
    setSearchTerm("");
    setMineOnly(false);
    setSelectedAssigneeIds([]);
    setSelectedLabelIds([]);
  };

  const toggleAssignee = (id: string, checked: boolean) => {
    setSelectedAssigneeIds((prev) =>
      checked ? [...prev, id] : prev.filter((v) => v !== id),
    );
  };

  const toggleLabel = (id: string, checked: boolean) => {
    setSelectedLabelIds((prev) =>
      checked ? [...prev, id] : prev.filter((v) => v !== id),
    );
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-6.5rem)] flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/kanban")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <KanbanSquare className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold leading-none">Kanban</h1>

          <div className="hidden sm:flex items-center gap-1.5 ml-1 text-xs text-muted-foreground">
            <span className="font-medium">{total} cards</span>
            {highPriorityCount > 0 && (
              <>
                <span>·</span>
                <span className="font-medium text-orange-600">{highPriorityCount} urgentes</span>
              </>
            )}
          </div>

          <div className="flex-1" />

          <Button size="sm" className="h-8 text-xs" onClick={() => setNewCardOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Novo card
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 pb-3 shrink-0">
          <div className="relative w-56 lg:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cards..."
              className="h-8 pl-8 text-xs"
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Filter className="h-3.5 w-3.5" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground leading-none py-0.5">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[260px] p-0" align="start">
              <div className="p-3 space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={mineOnly}
                    onCheckedChange={(c) => setMineOnly(!!c)}
                    disabled={!currentUser?.id}
                  />
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Atribuido a mim</span>
                </label>

                {uniqueAssignees.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Responsaveis
                    </div>
                    <div className="max-h-[120px] overflow-y-auto space-y-0.5">
                      {uniqueAssignees.map((a) => (
                        <label
                          key={a.userId}
                          className="flex items-center gap-2 rounded px-1.5 py-1 text-sm cursor-pointer hover:bg-muted"
                        >
                          <Checkbox
                            checked={selectedAssigneeIds.includes(String(a.userId))}
                            onCheckedChange={(c) => toggleAssignee(String(a.userId), !!c)}
                          />
                          <span className="truncate">{a.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {uniqueLabels.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Labels
                    </div>
                    <div className="max-h-[120px] overflow-y-auto space-y-0.5">
                      {uniqueLabels.map((l) => (
                        <label
                          key={l.labelId}
                          className="flex items-center gap-2 rounded px-1.5 py-1 text-sm cursor-pointer hover:bg-muted"
                        >
                          <Checkbox
                            checked={selectedLabelIds.includes(String(l.labelId))}
                            onCheckedChange={(c) => toggleLabel(String(l.labelId), !!c)}
                          />
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded"
                            style={{ backgroundColor: l.color }}
                          />
                          <span className="truncate">{l.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {activeFiltersCount > 0 && (
                  <div className="border-t pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs h-7"
                      onClick={() => {
                        setMineOnly(false);
                        setSelectedAssigneeIds([]);
                        setSelectedLabelIds([]);
                      }}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {(activeFiltersCount > 0 || searchTerm.trim()) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearAllFilters}>
              <X className="h-3 w-3" />
              Limpar tudo
            </Button>
          )}
        </div>

        <NewCardDialog open={newCardOpen} onOpenChange={setNewCardOpen} />

        {/* Board */}
        {cardsQuery.isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid gap-3 md:grid-cols-3 flex-1 min-h-0">
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
                        <div className="flex flex-1 items-center justify-center rounded border border-dashed py-8 text-xs text-muted-foreground">
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
                            onOpenDetail={() => setDetailCard(card)}
                            onArchive={() => {
                              if (!confirm("Arquivar este card?")) return;
                              archiveCard.mutate({ id: card.id, boardId: card.boardId });
                            }}
                            onDelete={() => {
                              if (
                                !confirm(
                                  `Excluir "${card.title}" permanentemente?\n\nComentarios, anexos, checklist e responsaveis serao removidos.\nEsta acao nao pode ser desfeita.`,
                                )
                              )
                                return;
                              deleteCardHard.mutate({ id: card.id, boardId: card.boardId });
                            }}
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
                <div className="opacity-90 rotate-2">
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

        <CardDetailDrawer
          cardId={detailCard?.id ?? null}
          boardId={detailCard?.boardId ?? 0}
          open={detailCard !== null}
          onClose={() => {
            setDetailCard(null);
            utils.kanban.cards.listAcrossUserBoards.invalidate();
          }}
          canEdit
          boardMembers={(boardMembersQuery.data ?? []) as BoardMemberData[]}
          boardLabels={(boardLabelsQuery.data ?? []) as BoardLabelData[]}
        />
      </div>
    </DashboardLayout>
  );
}
