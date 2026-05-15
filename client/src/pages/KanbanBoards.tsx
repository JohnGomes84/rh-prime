import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Globe, Loader2, Lock, Users } from "lucide-react";
import { NewBoardDialog } from "@/components/kanban/NewBoardDialog";
import { MultiSelectPopover } from "@/components/kanban/MultiSelectPopover";
import { KanbanCalendarView } from "@/components/kanban/KanbanCalendarView";
import { CardDetailDrawer } from "@/components/kanban/CardDetailDrawer";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import type {
  KanbanAssigneeData,
  KanbanCardData,
  KanbanLabelData,
} from "@/components/kanban/KanbanCard";

type ViewTab = "boards" | "all-tasks" | "calendar";

function readInitialFilters() {
  if (typeof window === "undefined") {
    return {
      q: "",
      a: [] as string[],
      l: [] as string[],
      b: [] as string[],
      p: "all",
      d: "all",
      view: "boards" as ViewTab,
    };
  }
  const params = new URLSearchParams(window.location.search);
  const viewRaw = params.get("view");
  const view: ViewTab =
    viewRaw === "all-tasks" ? "all-tasks" : viewRaw === "calendar" ? "calendar" : "boards";
  return {
    q: params.get("q") ?? "",
    a: (params.get("a") ?? "").split(",").filter(Boolean),
    l: (params.get("l") ?? "").split(",").filter(Boolean),
    b: (params.get("b") ?? "").split(",").filter(Boolean),
    p: params.get("p") ?? "all",
    d: params.get("d") ?? "all",
    view,
  };
}

export default function KanbanBoards() {
  const [, navigate] = useLocation();
  const { data: boards, isLoading } = trpc.kanban.boards.list.useQuery();
  const allCardsQuery = trpc.kanban.cards.listAcrossUserBoards.useQuery();

  const initial = useMemo(() => readInitialFilters(), []);
  const [view, setView] = useState<ViewTab>(initial.view);
  const [searchTerm, setSearchTerm] = useState(initial.q);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>(initial.a);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(initial.l);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>(initial.b);
  const [selectedPriority, setSelectedPriority] = useState(initial.p);
  const [dueFilter, setDueFilter] = useState(initial.d);
  const [detailCardId, setDetailCardId] = useState<number | null>(null);
  const [detailBoardId, setDetailBoardId] = useState<number | null>(null);

  // Sync URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("q", searchTerm.trim());
    if (selectedAssigneeIds.length > 0) params.set("a", selectedAssigneeIds.join(","));
    if (selectedLabelIds.length > 0) params.set("l", selectedLabelIds.join(","));
    if (selectedBoardIds.length > 0) params.set("b", selectedBoardIds.join(","));
    if (selectedPriority !== "all") params.set("p", selectedPriority);
    if (dueFilter !== "all") params.set("d", dueFilter);
    if (view !== "boards") params.set("view", view);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [searchTerm, selectedAssigneeIds, selectedLabelIds, selectedBoardIds, selectedPriority, dueFilter, view]);

  const allCardsData = allCardsQuery.data;
  const cardsRaw = useMemo(
    () => (allCardsData?.cards ?? []) as Array<
      KanbanCardData & { boardName: string; boardColor: string | null; listName: string }
    >,
    [allCardsData],
  );

  const labelsByCard = useMemo(() => {
    const map = new Map<number, KanbanLabelData[]>();
    for (const l of allCardsData?.labels ?? []) {
      const list = map.get(l.cardId) ?? [];
      list.push(l as KanbanLabelData);
      map.set(l.cardId, list);
    }
    return map;
  }, [allCardsData]);

  const assigneesByCard = useMemo(() => {
    const map = new Map<number, KanbanAssigneeData[]>();
    for (const a of allCardsData?.assignees ?? []) {
      const list = map.get(a.cardId) ?? [];
      list.push(a as KanbanAssigneeData);
      map.set(a.cardId, list);
    }
    return map;
  }, [allCardsData]);

  const uniqueAssignees = useMemo(() => {
    const map = new Map<number, { userId: number; label: string }>();
    for (const a of allCardsData?.assignees ?? []) {
      if (!map.has(a.userId)) {
        map.set(a.userId, {
          userId: a.userId,
          label: a.fullName ?? a.name ?? a.email ?? `Usuario ${a.userId}`,
        });
      }
    }
    return Array.from(map.values());
  }, [allCardsData]);

  const uniqueLabels = useMemo(() => {
    const map = new Map<number, { labelId: number; name: string; color: string }>();
    for (const l of allCardsData?.labels ?? []) {
      if (!map.has(l.labelId)) {
        map.set(l.labelId, { labelId: l.labelId, name: l.name, color: l.color });
      }
    }
    return Array.from(map.values());
  }, [allCardsData]);

  const filteredCards = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAheadUtc = todayUtc + 7 * 86_400_000;

    return cardsRaw.filter((card) => {
      const matchesSearch =
        term.length === 0 ||
        card.title.toLowerCase().includes(term) ||
        (card.description ?? "").toLowerCase().includes(term);

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

      const matchesBoard =
        selectedBoardIds.length === 0 ||
        selectedBoardIds.includes(String(card.boardId));

      const matchesPriority =
        selectedPriority === "all" || card.priority === selectedPriority;

      let matchesDue = true;
      if (dueFilter !== "all") {
        if (!card.dueDate) {
          matchesDue = dueFilter === "none";
        } else {
          const d =
            typeof card.dueDate === "string" ? new Date(card.dueDate) : card.dueDate;
          const dueUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
          if (dueFilter === "overdue") matchesDue = dueUtc < todayUtc;
          else if (dueFilter === "today") matchesDue = dueUtc === todayUtc;
          else if (dueFilter === "week")
            matchesDue = dueUtc >= todayUtc && dueUtc <= weekAheadUtc;
          else if (dueFilter === "none") matchesDue = false;
        }
      }

      return (
        matchesSearch &&
        matchesAssignee &&
        matchesLabel &&
        matchesBoard &&
        matchesPriority &&
        matchesDue
      );
    });
  }, [
    cardsRaw,
    assigneesByCard,
    labelsByCard,
    searchTerm,
    selectedAssigneeIds,
    selectedLabelIds,
    selectedBoardIds,
    selectedPriority,
    dueFilter,
  ]);

  const activeFiltersCount =
    (searchTerm.trim() ? 1 : 0) +
    (selectedAssigneeIds.length > 0 ? 1 : 0) +
    (selectedLabelIds.length > 0 ? 1 : 0) +
    (selectedBoardIds.length > 0 ? 1 : 0) +
    (selectedPriority !== "all" ? 1 : 0) +
    (dueFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    setSearchTerm("");
    setSelectedAssigneeIds([]);
    setSelectedLabelIds([]);
    setSelectedBoardIds([]);
    setSelectedPriority("all");
    setDueFilter("all");
  };

  const updateCard = trpc.kanban.cards.update.useMutation({
    onSuccess: () => allCardsQuery.refetch(),
  });

  const handleCardClick = (cardId: number) => {
    const card = cardsRaw.find((c) => c.id === cardId);
    if (!card) return;
    setDetailBoardId(card.boardId);
    setDetailCardId(cardId);
  };

  const filteredBoards = useMemo(() => {
    const list = boards ?? [];
    const term = searchTerm.trim().toLowerCase();
    return list.filter((b) => {
      if (selectedBoardIds.length > 0 && !selectedBoardIds.includes(String(b.id))) return false;
      if (term.length > 0) {
        return (
          b.name.toLowerCase().includes(term) ||
          (b.description ?? "").toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [boards, searchTerm, selectedBoardIds]);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kanban</h1>
            <p className="mt-1 text-muted-foreground">Boards de tarefas e processos</p>
          </div>
          <NewBoardDialog />
        </div>

        {/* Filter bar */}
        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por titulo, descricao ou board"
            />
            <MultiSelectPopover
              placeholder="Board"
              triggerLabel="Boards"
              selected={selectedBoardIds}
              onChange={setSelectedBoardIds}
              options={(boards ?? []).map((b) => ({
                value: String(b.id),
                label: b.name,
                color: b.color ?? undefined,
              }))}
            />
            <MultiSelectPopover
              placeholder="Responsavel"
              triggerLabel="Responsaveis"
              selected={selectedAssigneeIds}
              onChange={setSelectedAssigneeIds}
              options={uniqueAssignees.map((a) => ({
                value: String(a.userId),
                label: a.label,
              }))}
            />
            <MultiSelectPopover
              placeholder="Label"
              triggerLabel="Labels"
              selected={selectedLabelIds}
              onChange={setSelectedLabelIds}
              options={uniqueLabels.map((l) => ({
                value: String(l.labelId),
                label: l.name,
                color: l.color,
              }))}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[180px_180px_1fr_auto] md:items-center">
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda prioridade</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dueFilter} onValueChange={setDueFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Prazo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer prazo</SelectItem>
                <SelectItem value="overdue">Vencidos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Proximos 7 dias</SelectItem>
                <SelectItem value="none">Sem prazo</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground md:text-right">
              {view === "boards"
                ? `${filteredBoards.length} board(s)`
                : `${filteredCards.length} card(s)`}
              {activeFiltersCount > 0 ? " filtrado(s)" : ""}
            </span>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Limpar
                </Button>
              )}
              <div className="inline-flex rounded-md border bg-background p-0.5">
                <Button
                  variant={view === "boards" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setView("boards")}
                >
                  Boards
                </Button>
                <Button
                  variant={view === "all-tasks" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setView("all-tasks")}
                >
                  Tarefas
                </Button>
                <Button
                  variant={view === "calendar" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setView("calendar")}
                >
                  Calendario
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Views */}
        {isLoading || allCardsQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : view === "boards" ? (
          filteredBoards.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBoards.map((board) => (
                <Card
                  key={board.id}
                  className="cursor-pointer overflow-hidden border-0 shadow-sm transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/kanban/${board.id}`)}
                >
                  <div className="h-2" style={{ backgroundColor: board.color ?? "#6366f1" }} />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{board.name}</h3>
                      <VisibilityIcon visibility={board.visibility} />
                    </div>
                    {board.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {board.description}
                      </p>
                    )}
                    <div className="mt-3 text-xs text-muted-foreground">
                      Atualizado em{" "}
                      {new Date(board.updatedAt as never).toLocaleDateString("pt-BR")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <p className="text-muted-foreground">
                {activeFiltersCount > 0
                  ? "Nenhum board com esses filtros."
                  : "Nenhum board ainda."}
              </p>
              {activeFiltersCount === 0 && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Clique em <strong>Novo board</strong> para comecar.
                </p>
              )}
            </div>
          )
        ) : view === "all-tasks" ? (
          <TaskList
            cards={filteredCards}
            labelsByCard={labelsByCard}
            assigneesByCard={assigneesByCard}
            onCardClick={handleCardClick}
            onBoardClick={(id) => navigate(`/kanban/${id}`)}
          />
        ) : (
          <KanbanCalendarView
            cards={filteredCards as KanbanCardData[]}
            labelsByCard={labelsByCard}
            assigneesByCard={assigneesByCard}
            canEdit={true}
            onCardClick={handleCardClick}
            onCardDateChange={(id, isoDate) => {
              const card = cardsRaw.find((c) => c.id === id);
              if (!card) return;
              updateCard.mutate({ id, boardId: card.boardId, dueDate: isoDate });
            }}
          />
        )}

        {detailCardId !== null && detailBoardId !== null && (
          <CardDetailDrawer
            cardId={detailCardId}
            boardId={detailBoardId}
            open={detailCardId !== null}
            onClose={() => {
              setDetailCardId(null);
              setDetailBoardId(null);
            }}
            canEdit={true}
            boardMembers={[]}
            boardLabels={[]}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function TaskList({
  cards,
  labelsByCard,
  assigneesByCard,
  onCardClick,
  onBoardClick,
}: {
  cards: Array<KanbanCardData & { boardName: string; boardColor: string | null; listName: string }>;
  labelsByCard: Map<number, KanbanLabelData[]>;
  assigneesByCard: Map<number, KanbanAssigneeData[]>;
  onCardClick: (id: number) => void;
  onBoardClick: (boardId: number) => void;
}) {
  if (cards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <p className="text-muted-foreground">Nenhuma tarefa com esses filtros.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {cards.map((c) => {
        const labels = labelsByCard.get(c.id) ?? [];
        const assignees = assigneesByCard.get(c.id) ?? [];
        const due = c.dueDate
          ? new Date(c.dueDate).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              timeZone: "UTC",
            })
          : null;
        return (
          <div
            key={c.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
            onClick={() => onCardClick(c.id)}
          >
            <div
              className="h-8 w-1 rounded"
              style={{ backgroundColor: c.boardColor ?? "#6366f1" }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{c.title}</span>
                {labels.slice(0, 2).map((l) => (
                  <span
                    key={l.labelId}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.name}
                  </span>
                ))}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  className="hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBoardClick(c.boardId);
                  }}
                >
                  {c.boardName}
                </button>
                <span>·</span>
                <span>{c.listName}</span>
                {assignees.length > 0 && (
                  <>
                    <span>·</span>
                    <span>
                      {assignees
                        .slice(0, 3)
                        .map((a) => a.fullName ?? a.name ?? a.email ?? "?")
                        .join(", ")}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {c.priority !== "medium" && (
                <span
                  className={
                    c.priority === "urgent"
                      ? "rounded bg-red-100 px-1.5 py-0.5 text-red-700"
                      : c.priority === "high"
                        ? "rounded bg-orange-100 px-1.5 py-0.5 text-orange-700"
                        : "rounded bg-slate-200 px-1.5 py-0.5 text-slate-700"
                  }
                >
                  {c.priority}
                </span>
              )}
              {due && <span className="text-muted-foreground">{due}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VisibilityIcon({ visibility }: { visibility: string }) {
  if (visibility === "private") return <Lock className="h-4 w-4 text-muted-foreground" />;
  if (visibility === "team") return <Users className="h-4 w-4 text-muted-foreground" />;
  return <Globe className="h-4 w-4 text-muted-foreground" />;
}
