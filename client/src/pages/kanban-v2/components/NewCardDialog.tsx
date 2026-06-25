import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckSquare,
  ClipboardList,
  Loader2,
  Plus,
  Tag,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

type Priority = "low" | "medium" | "high" | "urgent";

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string }> = {
  low: { label: "Baixa", dot: "bg-emerald-500" },
  medium: { label: "Normal", dot: "bg-amber-500" },
  high: { label: "Alta", dot: "bg-orange-500" },
  urgent: { label: "Urgente", dot: "bg-red-500" },
};

const LABEL_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function NewCardDialog({ open, onOpenChange }: Props) {
  const utils = trpc.useUtils();

  const [boardId, setBoardId] = useState<number | null>(null);
  const [listId, setListId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([]);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]!);

  const boardsQuery = trpc.kanban.boards.list.useQuery(undefined, { enabled: open });
  const listsQuery = trpc.kanban.lists.listByBoard.useQuery(
    { boardId: boardId ?? 0 },
    { enabled: open && !!boardId },
  );
  const membersQuery = trpc.kanban.boards.listMembers.useQuery(
    { boardId: boardId ?? 0 },
    { enabled: open && !!boardId },
  );
  const candidatesQuery = trpc.kanban.boards.listUserCandidates.useQuery(
    { boardId: boardId ?? 0 },
    { enabled: open && !!boardId },
  );
  const labelsQuery = trpc.kanban.labels.listByBoard.useQuery(
    { boardId: boardId ?? 0 },
    { enabled: open && !!boardId },
  );

  const boards = boardsQuery.data ?? [];
  const lists = listsQuery.data ?? [];
  const labels = labelsQuery.data ?? [];

  // Auto-select board if only one exists
  useEffect(() => {
    if (open && boards.length === 1 && !boardId) {
      setBoardId((boards[0] as any).id);
    }
  }, [open, boards, boardId]);

  // Auto-select first list (A Fazer) when lists load
  useEffect(() => {
    if (lists.length > 0 && !listId) {
      setListId((lists[0] as any).id);
    }
  }, [lists, listId]);

  useEffect(() => {
    if (!open) {
      setBoardId(null);
      setListId(null);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setSelectedAssigneeIds([]);
      setSelectedLabelIds([]);
      setChecklistItems([]);
      setNewCheckItem("");
      setNewLabelName("");
      setNewLabelColor(LABEL_COLORS[0]!);
    }
  }, [open]);

  useEffect(() => {
    setListId(null);
    setSelectedAssigneeIds([]);
    setSelectedLabelIds([]);
  }, [boardId]);

  const uniqueMembers = useMemo(() => {
    const byUserId = new Map<number, any>();
    for (const m of membersQuery.data ?? []) {
      if (!byUserId.has(m.userId)) byUserId.set(m.userId, m);
    }
    for (const candidate of candidatesQuery.data ?? []) {
      if (!byUserId.has(candidate.userId)) {
        byUserId.set(candidate.userId, { ...candidate, role: "novo" });
      }
    }
    return Array.from(byUserId.values());
  }, [candidatesQuery.data, membersQuery.data]);

  const createCard = trpc.kanban.cards.create.useMutation({
    onSuccess: async (result) => {
      const cardId = result.id;

      const promises: Promise<unknown>[] = [];
      if (selectedAssigneeIds.length > 0 && boardId) {
        promises.push(setAssigneesMut.mutateAsync({ cardId, boardId, userIds: selectedAssigneeIds }));
      }
      if (selectedLabelIds.length > 0 && boardId) {
        promises.push(setLabelsMut.mutateAsync({ cardId, boardId, labelIds: selectedLabelIds }));
      }
      for (const content of checklistItems) {
        if (content.trim() && boardId) {
          promises.push(createChecklistItem.mutateAsync({ cardId, boardId, content: content.trim() }));
        }
      }
      await Promise.all(promises);

      toast.success("Demanda criada");
      await utils.kanban.cards.listAcrossUserBoards.invalidate();
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error(e.message || "Falha ao criar demanda");
    },
  });

  const setAssigneesMut = trpc.kanban.cards.setAssignees.useMutation();
  const setLabelsMut = trpc.kanban.cards.setLabels.useMutation();
  const createChecklistItem = trpc.kanban.checklist.create.useMutation();

  const createLabel = trpc.kanban.labels.create.useMutation({
    onSuccess: async (result) => {
      await utils.kanban.labels.listByBoard.invalidate({ boardId: boardId ?? 0 });
      setSelectedLabelIds((prev) => [...prev, result.id]);
      setNewLabelName("");
      toast.success("Label criada");
    },
    onError: (e) => toast.error(e.message ?? "Falha ao criar label"),
  });

  const handleSubmit = () => {
    if (!boardId || !listId || !title.trim()) {
      toast.error("Preencha o titulo da demanda");
      return;
    }
    createCard.mutate({
      boardId,
      listId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
    });
  };

  const addCheckItem = () => {
    const val = newCheckItem.trim();
    if (!val) return;
    setChecklistItems((prev) => [...prev, val]);
    setNewCheckItem("");
  };

  const removeCheckItem = (index: number) => {
    setChecklistItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateLabel = () => {
    if (!newLabelName.trim() || !boardId) return;
    createLabel.mutate({ boardId, name: newLabelName.trim(), color: newLabelColor });
  };

  const toggleAssignee = (userId: number, checked: boolean) => {
    setSelectedAssigneeIds((prev) =>
      checked ? [...prev, userId] : prev.filter((id) => id !== userId),
    );
  };

  const toggleLabel = (labelId: number, checked: boolean) => {
    setSelectedLabelIds((prev) =>
      checked ? [...prev, labelId] : prev.filter((id) => id !== labelId),
    );
  };

  const isPending = createCard.isPending || setAssigneesMut.isPending || setLabelsMut.isPending;
  const showBoardSelector = boards.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Nova demanda
          </DialogTitle>
          <DialogDescription>
            Descreva a demanda e atribua os responsaveis. Eles receberao uma notificacao para aceitar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Board selector — only shown when multiple boards exist */}
          {showBoardSelector && (
            <div className="space-y-1.5">
              <Label htmlFor="nc-board">Quadro</Label>
              <Select
                value={boardId ? String(boardId) : ""}
                onValueChange={(v) => setBoardId(Number(v))}
              >
                <SelectTrigger id="nc-board">
                  <SelectValue placeholder={boardsQuery.isLoading ? "Carregando..." : "Selecione o quadro"} />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="nc-title">O que precisa ser feito? *</Label>
            <Input
              id="nc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Revisar contrato de admissao do Joao"
              maxLength={200}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="nc-desc">Detalhes</Label>
            <Textarea
              id="nc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto, instrucoes, criterios de conclusao..."
              rows={2}
              maxLength={10000}
              className="resize-none"
            />
          </div>

          {/* Priority + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", PRIORITY_CONFIG[priority].dot)} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG.low][]).map(
                    ([val, cfg]) => (
                      <SelectItem key={val} value={val}>
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
                          {cfg.label}
                        </div>
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Assignees */}
          {boardId && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Responsaveis
                </Label>
                {selectedAssigneeIds.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    ({selectedAssigneeIds.length} selecionado{selectedAssigneeIds.length > 1 ? "s" : ""})
                  </span>
                )}
              </div>
              {membersQuery.isLoading || candidatesQuery.isLoading ? (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Carregando usuarios...
                </div>
              ) : uniqueMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-1">Nenhum usuario disponivel.</p>
              ) : (
                <div className="max-h-[120px] overflow-y-auto rounded-md border p-1 space-y-0.5">
                  {uniqueMembers.map((member) => {
                    const name = member.employeeName ?? member.userName ?? member.userEmail ?? `Usuario ${member.userId}`;
                    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p: string) => p[0]).join("").toUpperCase();
                    const isSelected = selectedAssigneeIds.includes(member.userId);
                    return (
                      <label
                        key={member.userId}
                        className={cn(
                          "flex items-center gap-2 rounded px-2 py-1 text-sm cursor-pointer transition-colors",
                          isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => toggleAssignee(member.userId, !!c)}
                        />
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] font-semibold">
                            {initials || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate flex-1">{name}</span>
                        <span className="text-[10px] text-muted-foreground">{member.role}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Labels */}
          {boardId && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Labels
                </Label>
              </div>
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((label: any) => {
                    const isSelected = selectedLabelIds.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => toggleLabel(label.id, !isSelected)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                          isSelected
                            ? "border-transparent text-white"
                            : "border-border text-foreground hover:bg-muted",
                        )}
                        style={isSelected ? { backgroundColor: label.color } : undefined}
                      >
                        {!isSelected && (
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                        )}
                        {label.name}
                        {isSelected && <X className="h-3 w-3 opacity-70" />}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder="Nova label..."
                  className="h-7 text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateLabel();
                    }
                  }}
                />
                <div className="flex gap-1">
                  {LABEL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "h-4 w-4 rounded-full border-2 transition-transform",
                        newLabelColor === color
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-110",
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewLabelColor(color)}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={handleCreateLabel}
                  disabled={!newLabelName.trim() || createLabel.isPending}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Checklist */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Checklist
              </Label>
              {checklistItems.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  ({checklistItems.length} {checklistItems.length === 1 ? "item" : "itens"})
                </span>
              )}
            </div>
            {checklistItems.length > 0 && (
              <div className="rounded-md border divide-y">
                {checklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-1.5 text-sm group/ci">
                    <CheckSquare className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="flex-1">{item}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover/ci:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCheckItem(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <Input
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                placeholder="Adicionar item..."
                className="h-7 text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCheckItem();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={addCheckItem}
                disabled={!newCheckItem.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !title.trim() || !boardId || !listId}>
            {isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Criar demanda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
