import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { Archive, ArrowLeft, Loader2, Plus, Tags, Users, X } from "lucide-react";
import { toast } from "sonner";
import { ArchivedItemsDialog } from "@/components/kanban/ArchivedItemsDialog";
import { BoardMembersDialog } from "@/components/kanban/BoardMembersDialog";
import { BoardSettingsDialog } from "@/components/kanban/BoardSettingsDialog";
import { CardDetailDrawer } from "@/components/kanban/CardDetailDrawer";
import { KanbanCard, type KanbanAssigneeData, type KanbanCardData, type KanbanLabelData } from "@/components/kanban/KanbanCard";
import { KanbanList, type KanbanListData } from "@/components/kanban/KanbanList";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";

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

type ChecklistCountData = { cardId: number; total: number; done: number };

function applyOptimisticCardMove<TCard extends { id: number; listId: number; position: number }>(
  previous: { cards: TCard[]; labels: KanbanLabelData[]; assignees: KanbanAssigneeData[]; checklistCounts: ChecklistCountData[] },
  cardId: number,
  toListId: number,
  toIndex: number,
): { cards: TCard[]; labels: KanbanLabelData[]; assignees: KanbanAssigneeData[]; checklistCounts: ChecklistCountData[] } {
  const sortedCards = [...previous.cards].sort((left, right) => {
    if (left.listId !== right.listId) return left.listId - right.listId;
    return left.position - right.position;
  });

  const movingCard = sortedCards.find((card) => card.id === cardId);
  if (!movingCard) return previous;

  const remainingCards = sortedCards.filter((card) => card.id !== cardId);
  const targetCards = remainingCards.filter((card) => card.listId === toListId);
  const safeIndex = Math.max(0, Math.min(toIndex, targetCards.length));
  const nextPosition = (safeIndex + 1) * 1024;

  const movedCard: TCard = {
    ...movingCard,
    listId: toListId,
    position: nextPosition,
  };

  const rebuiltCards = [...remainingCards];
  let inserted = false;
  let targetSeen = 0;

  for (let index = 0; index < rebuiltCards.length; index++) {
    if (rebuiltCards[index]!.listId !== toListId) continue;
    if (targetSeen === safeIndex) {
      rebuiltCards.splice(index, 0, movedCard);
      inserted = true;
      break;
    }
    targetSeen += 1;
  }

  if (!inserted) rebuiltCards.push(movedCard);

  const rebalanced = rebuiltCards.map((card, index) => ({
    ...card,
    position: (index + 1) * 1024,
  }));

  return {
    ...previous,
    cards: rebalanced,
  };
}

export default function KanbanBoard() {
  const params = useParams();
  const [, navigate] = useLocation();
  const boardId = Number(params.id);
  const utils = trpc.useUtils();

  const { data: board, isLoading: boardLoading } = trpc.kanban.boards.get.useQuery(
    { id: boardId },
    { enabled: !isNaN(boardId) },
  );
  const { data: lists, isLoading: listsLoading } = trpc.kanban.lists.listByBoard.useQuery(
    { boardId },
    { enabled: !isNaN(boardId) },
  );
  const { data: cardsData, isLoading: cardsLoading } = trpc.kanban.cards.listByBoard.useQuery(
    { boardId },
    { enabled: !isNaN(boardId) },
  );
  const membersQuery = trpc.kanban.boards.listMembers.useQuery(
    { boardId },
    { enabled: !isNaN(boardId) },
  );
  const labelsQuery = trpc.kanban.labels.listByBoard.useQuery(
    { boardId },
    { enabled: !isNaN(boardId) },
  );

  const [activeCard, setActiveCard] = useState<KanbanCardData | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [detailCardId, setDetailCardId] = useState<number | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [archivedDialogOpen, setArchivedDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState("all");
  const [selectedLabelFilter, setSelectedLabelFilter] = useState("all");

  const canEdit = board?.viewerRole === "admin" || board?.viewerRole === "editor";
  const isBoardAdmin = board?.viewerRole === "admin";
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const cards = useMemo(() => (cardsData?.cards ?? []) as KanbanCardData[], [cardsData]);
  const labelsByCard = useMemo(() => {
    const map = new Map<number, KanbanLabelData[]>();
    for (const label of cardsData?.labels ?? []) {
      const list = map.get(label.cardId) ?? [];
      list.push(label as KanbanLabelData);
      map.set(label.cardId, list);
    }
    return map;
  }, [cardsData]);
  const assigneesByCard = useMemo(() => {
    const map = new Map<number, KanbanAssigneeData[]>();
    for (const assignee of cardsData?.assignees ?? []) {
      const list = map.get(assignee.cardId) ?? [];
      list.push(assignee as KanbanAssigneeData);
      map.set(assignee.cardId, list);
    }
    return map;
  }, [cardsData]);
  const checklistByCard = useMemo(() => {
    const map = new Map<number, { total: number; done: number }>();
    for (const entry of cardsData?.checklistCounts ?? []) {
      map.set(entry.cardId, { total: entry.total, done: entry.done });
    }
    return map;
  }, [cardsData]);
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (card.description ?? "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAssignee =
        selectedAssigneeFilter === "all" ||
        (assigneesByCard.get(card.id) ?? []).some((assignee) => String(assignee.userId) === selectedAssigneeFilter);

      const matchesLabel =
        selectedLabelFilter === "all" ||
        (labelsByCard.get(card.id) ?? []).some((label) => String(label.labelId) === selectedLabelFilter);

      return matchesSearch && matchesAssignee && matchesLabel;
    });
  }, [assigneesByCard, cards, labelsByCard, searchTerm, selectedAssigneeFilter, selectedLabelFilter]);

  const cardsByList = useMemo(() => {
    const map = new Map<number, KanbanCardData[]>();
    for (const card of filteredCards) {
      const list = map.get(card.listId) ?? [];
      list.push(card);
      map.set(card.listId, list);
    }
    return map;
  }, [filteredCards]);
  const sortedLists = useMemo(() => ((lists ?? []) as KanbanListData[]), [lists]);
  const boardMembers = useMemo(() => ((membersQuery.data ?? []) as BoardMemberData[]), [membersQuery.data]);
  const boardLabels = useMemo(() => ((labelsQuery.data ?? []) as BoardLabelData[]), [labelsQuery.data]);
  const uniqueFilterMembers = useMemo(() => {
    const byUser = new Map<number, BoardMemberData>();
    for (const member of boardMembers) {
      if (!byUser.has(member.userId)) byUser.set(member.userId, member);
    }
    return Array.from(byUser.values());
  }, [boardMembers]);
  const activeFiltersCount =
    (searchTerm.trim() ? 1 : 0) +
    (selectedAssigneeFilter !== "all" ? 1 : 0) +
    (selectedLabelFilter !== "all" ? 1 : 0);

  const createList = trpc.kanban.lists.create.useMutation({
    onSuccess: () => utils.kanban.lists.listByBoard.invalidate({ boardId }),
    onError: (error) => toast.error(error.message),
  });
  const renameList = trpc.kanban.lists.update.useMutation({
    onSuccess: () => utils.kanban.lists.listByBoard.invalidate({ boardId }),
    onError: (error) => toast.error(error.message),
  });
  const archiveList = trpc.kanban.lists.archive.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.kanban.lists.listByBoard.invalidate({ boardId }),
        utils.kanban.cards.listByBoard.invalidate({ boardId }),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  const reorderLists = trpc.kanban.lists.reorder.useMutation({
    onMutate: async (variables) => {
      await utils.kanban.lists.listByBoard.cancel({ boardId });
      const previous = utils.kanban.lists.listByBoard.getData({ boardId });
      if (previous) {
        const byId = new Map(previous.map((list) => [list.id, list]));
        const next = variables.orderedIds
          .map((id, index) => {
            const list = byId.get(id);
            return list ? { ...list, position: (index + 1) * 1024 } : null;
          })
          .filter(Boolean) as typeof previous;
        utils.kanban.lists.listByBoard.setData({ boardId }, next);
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) utils.kanban.lists.listByBoard.setData({ boardId }, context.previous);
      toast.error("Falha ao reordenar listas");
    },
    onSettled: () => utils.kanban.lists.listByBoard.invalidate({ boardId }),
  });
  const createCard = trpc.kanban.cards.create.useMutation({
    onSuccess: () => utils.kanban.cards.listByBoard.invalidate({ boardId }),
    onError: (error) => toast.error(error.message),
  });
  const archiveCard = trpc.kanban.cards.archive.useMutation({
    onSuccess: async () => {
      await utils.kanban.cards.listByBoard.invalidate({ boardId });
      toast.success("Card arquivado");
    },
    onError: (error) => toast.error(error.message ?? "Falha ao arquivar"),
  });
  const deleteCardHard = trpc.kanban.cards.deleteHard.useMutation({
    onSuccess: async () => {
      await utils.kanban.cards.listByBoard.invalidate({ boardId });
      toast.success("Card excluido permanentemente");
    },
    onError: (error) => toast.error(error.message ?? "Falha ao excluir"),
  });
  const moveCard = trpc.kanban.cards.move.useMutation({
    onMutate: async (variables) => {
      await utils.kanban.cards.listByBoard.cancel({ boardId });
      const previous = utils.kanban.cards.listByBoard.getData({ boardId });
      if (previous) {
        utils.kanban.cards.listByBoard.setData(
          { boardId },
          applyOptimisticCardMove(previous, variables.cardId, variables.toListId, variables.toIndex),
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        utils.kanban.cards.listByBoard.setData({ boardId }, context.previous);
      }
      toast.error("Falha ao mover card");
    },
    onSettled: () => utils.kanban.cards.listByBoard.invalidate({ boardId }),
  });

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "card") setActiveCard(data.card as KanbanCardData);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData) return;

    if (activeData.type === "list" && overData?.type === "list") {
      const sortedLists = (lists ?? []) as KanbanListData[];
      const oldIndex = sortedLists.findIndex((list) => `list-${list.id}` === active.id);
      const newIndex = sortedLists.findIndex((list) => `list-${list.id}` === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const reordered = arrayMove(sortedLists, oldIndex, newIndex);
      reorderLists.mutate({ boardId, orderedIds: reordered.map((list) => list.id) });
      return;
    }

    if (activeData.type !== "card") return;

    const card = activeData.card as KanbanCardData;
    let targetListId: number | null = null;
    let targetIndex = 0;

    if (overData?.type === "list-drop") {
      targetListId = overData.listId as number;
      targetIndex = cardsByList.get(targetListId)?.length ?? 0;
    } else if (overData?.type === "list") {
      targetListId = (overData.list as KanbanListData).id;
      targetIndex = 0;
    } else if (overData?.type === "card") {
      const overCard = overData.card as KanbanCardData;
      targetListId = overCard.listId;
      const listCards = cardsByList.get(targetListId) ?? [];
      targetIndex = listCards.findIndex((listCard) => listCard.id === overCard.id);
      if (targetIndex < 0) targetIndex = 0;
    }

    if (targetListId == null) return;
    if (targetListId === card.listId) {
      const listCards = cardsByList.get(targetListId) ?? [];
      const currentIndex = listCards.findIndex((listCard) => listCard.id === card.id);
      if (currentIndex === targetIndex) return;
    }

    moveCard.mutate({
      cardId: card.id,
      boardId,
      toListId: targetListId,
      toIndex: targetIndex,
    });
  };

  if (isNaN(boardId)) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-muted-foreground">Board invalido</div>
      </DashboardLayout>
    );
  }

  if (boardLoading || listsLoading || cardsLoading || membersQuery.isLoading || labelsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!board) {
    return (
      <DashboardLayout>
        <div className="py-16 text-center text-muted-foreground">Board nao encontrado</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate("/kanban")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-10 w-1 rounded" style={{ backgroundColor: board.color ?? "#6366f1" }} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold">{board.name}</h1>
              <Badge variant="outline">{board.viewerRole}</Badge>
            </div>
            {board.description && (
              <p className="mt-1 text-sm text-muted-foreground">{board.description}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <Users className="h-3.5 w-3.5" />
              {boardMembers.length} membro(s)
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <Tags className="h-3.5 w-3.5" />
              {boardLabels.length} label(s)
            </span>
            {board.viewerRole === "admin" && (
              <>
                <BoardMembersDialog boardId={boardId} members={boardMembers} />
                <BoardSettingsDialog
                  board={{
                    id: board.id,
                    name: board.name,
                    description: board.description ?? null,
                    color: board.color ?? null,
                    visibility: board.visibility,
                    departmentId: board.departmentId ?? null,
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setArchivedDialogOpen(true)}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Ver arquivados
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_220px_220px_auto]">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por titulo ou descricao"
          />
          <Select value={selectedAssigneeFilter} onValueChange={setSelectedAssigneeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Responsavel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsaveis</SelectItem>
              {uniqueFilterMembers.map((member) => (
                <SelectItem key={member.userId} value={String(member.userId)}>
                  {member.employeeName ?? member.userName ?? member.userEmail ?? `Usuario ${member.userId}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedLabelFilter} onValueChange={setSelectedLabelFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Label" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as labels</SelectItem>
              {boardLabels.map((label) => (
                <SelectItem key={label.id} value={String(label.id)}>
                  {label.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {activeFiltersCount > 0 ? `${filteredCards.length} card(s) filtrado(s)` : `${cards.length} card(s)`}
            </span>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedAssigneeFilter("all");
                  setSelectedLabelFilter("all");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4">
            <SortableContext
              items={sortedLists.map((list) => `list-${list.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {sortedLists.map((list) => (
                <KanbanList
                  key={list.id}
                  list={list}
                  cards={cardsByList.get(list.id) ?? []}
                  labelsByCard={labelsByCard}
                  assigneesByCard={assigneesByCard}
                  checklistByCard={checklistByCard}
                  readonly={!canEdit}
                  canDelete={isBoardAdmin}
                  expandedCardId={expandedCardId}
                  onToggleExpandCard={(id) =>
                    setExpandedCardId((cur) => (cur === id ? null : id))
                  }
                  onEditCard={(id) => setDetailCardId(id)}
                  onArchiveCard={(id) => {
                    if (!confirm("Arquivar este card?")) return;
                    archiveCard.mutate({ id, boardId });
                    if (expandedCardId === id) setExpandedCardId(null);
                  }}
                  onDeleteCard={(id) => {
                    if (
                      !confirm(
                        "Excluir card permanentemente?\n\nComentarios, anexos, checklist e responsaveis serao removidos.\nEsta acao nao pode ser desfeita.",
                      )
                    )
                      return;
                    deleteCardHard.mutate({ id, boardId });
                    if (expandedCardId === id) setExpandedCardId(null);
                  }}
                  onAddCard={(listId, title) => createCard.mutate({ listId, boardId, title })}
                  onRenameList={(listId, name) => renameList.mutate({ id: listId, boardId, name })}
                  onArchiveList={(listId) => archiveList.mutate({ id: listId, boardId })}
                />
              ))}
            </SortableContext>

            {canEdit && (
              <div className="w-72 shrink-0">
                {addingList ? (
                  <div className="space-y-2 rounded-lg bg-muted/40 p-2">
                    <Input
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="Nome da lista"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newListName.trim()) {
                          createList.mutate({ boardId, name: newListName.trim() });
                          setNewListName("");
                          setAddingList(false);
                        }
                        if (e.key === "Escape") {
                          setNewListName("");
                          setAddingList(false);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!newListName.trim()) return;
                          createList.mutate({ boardId, name: newListName.trim() });
                          setNewListName("");
                          setAddingList(false);
                        }}
                      >
                        Adicionar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setNewListName("");
                          setAddingList(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => setAddingList(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    Adicionar lista
                  </Button>
                )}
              </div>
            )}
          </div>

          <DragOverlay>
            {activeCard && (
              <div className="opacity-90">
                <KanbanCard
                  card={activeCard}
                  labels={labelsByCard.get(activeCard.id) ?? []}
                  assignees={assigneesByCard.get(activeCard.id) ?? []}
                  checklist={checklistByCard.get(activeCard.id)}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>

        <CardDetailDrawer
          cardId={detailCardId}
          boardId={boardId}
          open={detailCardId !== null}
          onClose={() => setDetailCardId(null)}
          canEdit={canEdit}
          boardMembers={boardMembers}
          boardLabels={boardLabels}
        />

        <ArchivedItemsDialog
          boardId={boardId}
          open={archivedDialogOpen}
          onClose={() => setArchivedDialogOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
