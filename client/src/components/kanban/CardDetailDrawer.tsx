import { useEffect, useMemo, useState } from "react";
import { Archive, Plus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type Priority = "low" | "medium" | "high" | "urgent";

type BoardMemberOption = {
  id: number;
  userId: number;
  role: "admin" | "editor" | "viewer";
  userName: string | null;
  userEmail: string | null;
  employeeName: string | null;
};

type LabelOption = {
  id: number;
  boardId: number;
  name: string;
  color: string;
};

const LABEL_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function CardDetailDrawer({
  cardId,
  boardId,
  open,
  onClose,
  canEdit,
  boardMembers,
  boardLabels,
}: {
  cardId: number | null;
  boardId: number;
  open: boolean;
  onClose: () => void;
  canEdit: boolean;
  boardMembers: BoardMemberOption[];
  boardLabels: LabelOption[];
}) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.kanban.cards.get.useQuery(
    { id: cardId ?? 0 },
    { enabled: open && !!cardId },
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]!);
  const [newChecklistContent, setNewChecklistContent] = useState("");

  useEffect(() => {
    if (!data?.card) return;

    setTitle(data.card.title);
    setDescription(data.card.description ?? "");
    setPriority(data.card.priority as Priority);

    const rawDueDate = data.card.dueDate;
    if (rawDueDate) {
      const date = typeof rawDueDate === "string" ? new Date(rawDueDate) : rawDueDate;
      setDueDate(date.toISOString().slice(0, 10));
    } else {
      setDueDate("");
    }

    setSelectedAssigneeIds(data.assignees.map((assignee) => assignee.userId));
    setSelectedLabelIds(data.labels.map((label) => label.labelId));
  }, [data]);

  const uniqueBoardMembers = useMemo(() => {
    const byUserId = new Map<number, BoardMemberOption>();
    for (const member of boardMembers) {
      if (!byUserId.has(member.userId)) byUserId.set(member.userId, member);
    }
    return Array.from(byUserId.values());
  }, [boardMembers]);

  const update = trpc.kanban.cards.update.useMutation({
    onError: (error) => toast.error(error.message ?? "Falha ao salvar"),
  });

  const setAssignees = trpc.kanban.cards.setAssignees.useMutation({
    onError: (error) => toast.error(error.message ?? "Falha ao salvar responsaveis"),
  });

  const setLabels = trpc.kanban.cards.setLabels.useMutation({
    onError: (error) => toast.error(error.message ?? "Falha ao salvar labels"),
  });

  const createLabel = trpc.kanban.labels.create.useMutation({
    onSuccess: async (result) => {
      await utils.kanban.labels.listByBoard.invalidate({ boardId });
      setSelectedLabelIds((current) => (current.includes(result.id) ? current : [...current, result.id]));
      setNewLabelName("");
      toast.success("Label criada");
    },
    onError: (error) => toast.error(error.message ?? "Falha ao criar label"),
  });

  const archive = trpc.kanban.cards.archive.useMutation({
    onSuccess: async () => {
      await utils.kanban.cards.listByBoard.invalidate({ boardId });
      toast.success("Card arquivado");
      onClose();
    },
    onError: (error) => toast.error(error.message ?? "Falha ao arquivar"),
  });

  const createChecklistItem = trpc.kanban.checklist.create.useMutation({
    onSuccess: async () => {
      await utils.kanban.cards.get.invalidate({ id: cardId ?? 0 });
      setNewChecklistContent("");
      toast.success("Item adicionado");
    },
    onError: (error) => toast.error(error.message ?? "Falha ao adicionar item"),
  });

  const updateChecklistItem = trpc.kanban.checklist.update.useMutation({
    onSuccess: async () => {
      await utils.kanban.cards.get.invalidate({ id: cardId ?? 0 });
    },
    onError: (error) => toast.error(error.message ?? "Falha ao atualizar item"),
  });

  const deleteChecklistItem = trpc.kanban.checklist.delete.useMutation({
    onSuccess: async () => {
      await utils.kanban.cards.get.invalidate({ id: cardId ?? 0 });
      toast.success("Item removido");
    },
    onError: (error) => toast.error(error.message ?? "Falha ao remover item"),
  });

  const invalidateBoardCardData = async () => {
    await Promise.all([
      utils.kanban.cards.listByBoard.invalidate({ boardId }),
      utils.kanban.cards.get.invalidate({ id: cardId ?? 0 }),
    ]);
  };

  const toggleAssignee = (userId: number, checked: boolean) => {
    setSelectedAssigneeIds((current) =>
      checked ? [...current, userId] : current.filter((value) => value !== userId),
    );
  };

  const toggleLabel = (labelId: number, checked: boolean) => {
    setSelectedLabelIds((current) =>
      checked ? [...current, labelId] : current.filter((value) => value !== labelId),
    );
  };

  const handleSave = async () => {
    if (!cardId) return;

    try {
      await update.mutateAsync({
        id: cardId,
        boardId,
        title,
        description: description || null,
        priority,
        dueDate: dueDate || null,
      });
      await setAssignees.mutateAsync({
        cardId,
        boardId,
        userIds: selectedAssigneeIds,
      });
      await setLabels.mutateAsync({
        cardId,
        boardId,
        labelIds: selectedLabelIds,
      });
      await invalidateBoardCardData();
      toast.success("Card atualizado");
    } catch {
      return;
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    await createLabel.mutateAsync({
      boardId,
      name: newLabelName.trim(),
      color: newLabelColor,
    });
  };

  const checklistItems = data?.checklist ?? [];
  const checklistDoneCount = checklistItems.filter((item) => item.isDone).length;

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Editar card</SheetTitle>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-5 py-4">
            <div className="space-y-1">
              <Label htmlFor="card-title">Titulo</Label>
              <Input
                id="card-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="card-desc">Descricao</Label>
              <Textarea
                id="card-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                disabled={!canEdit}
                placeholder="Descreva o contexto, checklist ou criterios de pronto"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as Priority)} disabled={!canEdit}>
                  <SelectTrigger>
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

              <div className="space-y-1">
                <Label htmlFor="card-due">Prazo</Label>
                <Input
                  id="card-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Responsaveis</Label>
                <span className="text-xs text-muted-foreground">{selectedAssigneeIds.length} selecionado(s)</span>
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                {uniqueBoardMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum membro disponivel para atribuicao.</p>
                ) : (
                  uniqueBoardMembers.map((member) => {
                    const displayName = member.employeeName ?? member.userName ?? member.userEmail ?? `Usuario ${member.userId}`;
                    const initials = displayName
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase();

                    return (
                      <label
                        key={member.userId}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedAssigneeIds.includes(member.userId)}
                          disabled={!canEdit}
                          onCheckedChange={(checked) => toggleAssignee(member.userId, checked === true)}
                        />
                        <Avatar className="size-7">
                          <AvatarFallback className="text-[10px] font-semibold">{initials || "?"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{displayName}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {member.userEmail ?? "Sem email"} • {member.role}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Labels</Label>
                <span className="text-xs text-muted-foreground">{selectedLabelIds.length} selecionada(s)</span>
              </div>

              {boardLabels.length > 0 && (
                <div className="flex flex-wrap gap-2 rounded-lg border p-3">
                  {boardLabels.map((label) => (
                    <label
                      key={label.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1"
                    >
                      <Checkbox
                        checked={selectedLabelIds.includes(label.id)}
                        disabled={!canEdit}
                        onCheckedChange={(checked) => toggleLabel(label.id, checked === true)}
                      />
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                      <span className="text-sm">{label.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {selectedLabelIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {boardLabels
                    .filter((label) => selectedLabelIds.includes(label.id))
                    .map((label) => (
                      <Badge key={label.id} className="border-transparent text-white" style={{ backgroundColor: label.color }}>
                        {label.name}
                      </Badge>
                    ))}
                </div>
              )}

              {canEdit && (
                <div className="rounded-lg border border-dashed p-3">
                  <div className="mb-2 text-sm font-medium">Nova label</div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Ex: Bloqueado, Urgente RH"
                    />
                    <div className="flex gap-2">
                      {LABEL_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`h-7 w-7 rounded-full border-2 ${newLabelColor === color ? "border-foreground" : "border-transparent"}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewLabelColor(color)}
                        />
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleCreateLabel}
                      disabled={!newLabelName.trim() || createLabel.isPending}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Criar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Checklist</Label>
                <span className="text-xs text-muted-foreground">
                  {checklistDoneCount}/{checklistItems.length} concluido(s)
                </span>
              </div>

              <div className="space-y-2 rounded-lg border p-3">
                {checklistItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>
                ) : (
                  checklistItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
                      <Checkbox
                        checked={item.isDone}
                        disabled={!canEdit}
                        onCheckedChange={(checked) =>
                          updateChecklistItem.mutate({
                            id: item.id,
                            boardId,
                            isDone: checked === true,
                          })
                        }
                      />
                      <div className={`min-w-0 flex-1 text-sm ${item.isDone ? "text-muted-foreground line-through" : ""}`}>
                        {item.content}
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => deleteChecklistItem.mutate({ id: item.id, boardId })}
                          disabled={deleteChecklistItem.isPending}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  ))
                )}

                {canEdit && (
                  <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">
                    <Input
                      value={newChecklistContent}
                      onChange={(e) => setNewChecklistContent(e.target.value)}
                      placeholder="Adicionar item do checklist"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newChecklistContent.trim() && cardId) {
                          createChecklistItem.mutate({
                            cardId,
                            boardId,
                            content: newChecklistContent.trim(),
                          });
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        cardId &&
                        createChecklistItem.mutate({
                          cardId,
                          boardId,
                          content: newChecklistContent.trim(),
                        })
                      }
                      disabled={!newChecklistContent.trim() || createChecklistItem.isPending}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {canEdit && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={update.isPending || setAssignees.isPending || setLabels.isPending}
                >
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600"
                  onClick={() => cardId && archive.mutate({ id: cardId, boardId })}
                  disabled={archive.isPending}
                >
                  <Archive className="mr-1 h-4 w-4" />
                  Arquivar
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
