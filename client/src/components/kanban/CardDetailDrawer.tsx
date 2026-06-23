import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CheckSquare,
  ExternalLink,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Priority = "low" | "medium" | "high" | "urgent";
type GlobalStatus = "todo" | "in_progress" | "done";

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

const STATUS_OPTIONS: { value: GlobalStatus; label: string; color: string; activeColor: string }[] = [
  { value: "todo", label: "A Fazer", color: "border-slate-300 text-slate-600", activeColor: "bg-slate-600 text-white border-slate-600" },
  { value: "in_progress", label: "Em Progresso", color: "border-blue-300 text-blue-600", activeColor: "bg-blue-600 text-white border-blue-600" },
  { value: "done", label: "Concluido", color: "border-emerald-300 text-emerald-600", activeColor: "bg-emerald-600 text-white border-emerald-600" },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; dot: string }> = {
  low: { label: "Baixa", dot: "bg-emerald-500" },
  medium: { label: "Media", dot: "bg-amber-500" },
  high: { label: "Alta", dot: "bg-orange-500" },
  urgent: { label: "Urgente", dot: "bg-red-500" },
};

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
  const [globalStatus, setGlobalStatus] = useState<GlobalStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]!);
  const [newChecklistContent, setNewChecklistContent] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commentsQuery = trpc.kanban.comments.list.useQuery(
    { cardId: cardId ?? 0, boardId },
    { enabled: open && !!cardId },
  );

  const attachmentsQuery = trpc.kanban.attachments.list.useQuery(
    { cardId: cardId ?? 0, boardId },
    { enabled: open && !!cardId },
  );

  const candidatesQuery = trpc.kanban.boards.listUserCandidates.useQuery(
    { boardId },
    { enabled: open && !!cardId && addMemberOpen },
  );

  const addMemberMut = trpc.kanban.boards.addMember.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.kanban.boards.listMembers.invalidate({ boardId }),
        utils.kanban.boards.listUserCandidates.invalidate({ boardId }),
      ]);
      toast.success("Membro adicionado ao board");
    },
    onError: (error) => toast.error(error.message ?? "Falha ao adicionar membro"),
  });

  const invalidateAll = async () => {
    await Promise.all([
      utils.kanban.cards.get.invalidate({ id: cardId ?? 0 }),
      utils.kanban.cards.listByBoard.invalidate({ boardId }),
      utils.kanban.cards.listAcrossUserBoards.invalidate(),
    ]);
  };

  const update = trpc.kanban.cards.update.useMutation({
    onSuccess: () => invalidateAll(),
    onError: (error) => toast.error(error.message ?? "Falha ao salvar"),
  });

  const setAssigneesMut = trpc.kanban.cards.setAssignees.useMutation({
    onSuccess: () => invalidateAll(),
    onError: (error) => toast.error(error.message ?? "Falha ao salvar responsaveis"),
  });

  const setLabelsMut = trpc.kanban.cards.setLabels.useMutation({
    onSuccess: () => invalidateAll(),
    onError: (error) => toast.error(error.message ?? "Falha ao salvar labels"),
  });

  const createLabel = trpc.kanban.labels.create.useMutation({
    onSuccess: async (result) => {
      await utils.kanban.labels.listByBoard.invalidate({ boardId });
      const next = [...selectedLabelIds, result.id];
      setSelectedLabelIds(next);
      if (cardId) setLabelsMut.mutate({ cardId, boardId, labelIds: next });
      setNewLabelName("");
      toast.success("Label criada");
    },
    onError: (error) => toast.error(error.message ?? "Falha ao criar label"),
  });

  const archive = trpc.kanban.cards.archive.useMutation({
    onSuccess: async () => {
      await invalidateAll();
      toast.success("Card arquivado");
      onClose();
    },
    onError: (error) => toast.error(error.message ?? "Falha ao arquivar"),
  });

  const createChecklistItem = trpc.kanban.checklist.create.useMutation({
    onSuccess: async () => {
      await invalidateAll();
      setNewChecklistContent("");
    },
    onError: (error) => toast.error(error.message ?? "Falha ao adicionar item"),
  });

  const updateChecklistItem = trpc.kanban.checklist.update.useMutation({
    onSuccess: () => invalidateAll(),
    onError: (error) => toast.error(error.message ?? "Falha ao atualizar item"),
  });

  const deleteChecklistItem = trpc.kanban.checklist.delete.useMutation({
    onSuccess: () => invalidateAll(),
    onError: (error) => toast.error(error.message ?? "Falha ao remover item"),
  });

  const createComment = trpc.kanban.comments.create.useMutation({
    onSuccess: async () => {
      await utils.kanban.comments.list.invalidate({ cardId: cardId ?? 0, boardId });
      setNewCommentBody("");
    },
    onError: (error) => toast.error(error.message ?? "Falha ao comentar"),
  });

  const deleteComment = trpc.kanban.comments.delete.useMutation({
    onSuccess: () => utils.kanban.comments.list.invalidate({ cardId: cardId ?? 0, boardId }),
    onError: (error) => toast.error(error.message ?? "Falha ao remover comentario"),
  });

  const registerAttachment = trpc.kanban.attachments.register.useMutation({
    onSuccess: async () => {
      await utils.kanban.attachments.list.invalidate({ cardId: cardId ?? 0, boardId });
      toast.success("Anexo carregado");
    },
    onError: (error) => toast.error(error.message ?? "Falha ao registrar anexo"),
  });

  const deleteAttachment = trpc.kanban.attachments.delete.useMutation({
    onSuccess: () => utils.kanban.attachments.list.invalidate({ cardId: cardId ?? 0, boardId }),
    onError: (error) => toast.error(error.message ?? "Falha ao remover anexo"),
  });

  const handleUploadFile = async (file: File) => {
    if (!cardId) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Arquivo maior que 4MB.");
      return;
    }
    try {
      setAttachmentUploading(true);
      const resp = await fetch(
        `/api/upload-attachment?cardId=${cardId}&filename=${encodeURIComponent(file.name)}`,
        {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
          credentials: "include",
        },
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText }));
        throw new Error(err.error ?? "Falha no upload");
      }
      const blob = (await resp.json()) as {
        url: string;
        pathname?: string;
        contentType?: string;
        size?: number;
      };
      await registerAttachment.mutateAsync({
        cardId,
        boardId,
        fileName: file.name,
        fileUrl: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        sizeBytes: blob.size,
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAttachmentUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!data?.card) return;
    setTitle(data.card.title);
    setDescription(data.card.description ?? "");
    setPriority(data.card.priority as Priority);
    setGlobalStatus((data.card.globalStatus as GlobalStatus) ?? "todo");
    const rawDueDate = data.card.dueDate;
    if (rawDueDate) {
      const date = typeof rawDueDate === "string" ? new Date(rawDueDate) : rawDueDate;
      setDueDate(date.toISOString().slice(0, 10));
    } else {
      setDueDate("");
    }
    setSelectedAssigneeIds(data.assignees.map((a) => a.userId));
    setSelectedLabelIds(data.labels.map((l) => l.labelId));
  }, [data]);

  const uniqueBoardMembers = useMemo(() => {
    const byUserId = new Map<number, BoardMemberOption>();
    for (const member of boardMembers) {
      if (!byUserId.has(member.userId)) byUserId.set(member.userId, member);
    }
    return Array.from(byUserId.values());
  }, [boardMembers]);

  const availableCandidates = useMemo(() => {
    const memberIds = new Set(uniqueBoardMembers.map((m) => m.userId));
    return (candidatesQuery.data ?? []).filter((c) => !memberIds.has(c.userId));
  }, [candidatesQuery.data, uniqueBoardMembers]);

  // --- Auto-save handlers ---

  const saveField = (fields: Record<string, unknown>) => {
    if (!cardId) return;
    update.mutate({ id: cardId, boardId, ...fields } as any);
  };

  const saveTitleOnBlur = () => {
    const next = title.trim();
    if (!next || next === data?.card?.title) {
      if (data?.card) setTitle(data.card.title);
      return;
    }
    saveField({ title: next });
  };

  const saveDescOnBlur = () => {
    const next = description.trim();
    if (next === (data?.card?.description ?? "")) return;
    saveField({ description: next || null });
  };

  const onPriorityChange = (v: string) => {
    const next = v as Priority;
    setPriority(next);
    saveField({ priority: next });
  };

  const onStatusChange = (v: GlobalStatus) => {
    setGlobalStatus(v);
    saveField({ globalStatus: v });
  };

  const onDueDateChange = (v: string) => {
    setDueDate(v);
    saveField({ dueDate: v || null });
  };

  const toggleAssignee = (userId: number, checked: boolean) => {
    const next = checked
      ? [...selectedAssigneeIds, userId]
      : selectedAssigneeIds.filter((id) => id !== userId);
    setSelectedAssigneeIds(next);
    if (cardId) setAssigneesMut.mutate({ cardId, boardId, userIds: next });
  };

  const toggleLabel = (labelId: number, checked: boolean) => {
    const next = checked
      ? [...selectedLabelIds, labelId]
      : selectedLabelIds.filter((id) => id !== labelId);
    setSelectedLabelIds(next);
    if (cardId) setLabelsMut.mutate({ cardId, boardId, labelIds: next });
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    await createLabel.mutateAsync({
      boardId,
      name: newLabelName.trim(),
      color: newLabelColor,
    });
  };

  const submitChecklist = () => {
    if (!newChecklistContent.trim() || !cardId) return;
    createChecklistItem.mutate({
      cardId,
      boardId,
      content: newChecklistContent.trim(),
    });
  };

  const checklistItems = data?.checklist ?? [];
  const checklistDoneCount = checklistItems.filter((item) => item.isDone).length;

  return (
    <Sheet open={open} onOpenChange={(value) => !value && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg p-0">
        {isLoading || !data ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Header with title */}
            <div className="sticky top-0 z-10 border-b bg-background px-5 py-4">
              <SheetHeader className="mb-0 p-0">
                <SheetTitle className="sr-only">Editar card</SheetTitle>
              </SheetHeader>
              {canEdit ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={saveTitleOnBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="border-none px-0 text-lg font-bold shadow-none focus-visible:ring-0 h-auto"
                  placeholder="Titulo do card"
                />
              ) : (
                <h2 className="text-lg font-bold">{title}</h2>
              )}

              {/* Status selector */}
              <div className="mt-3 flex gap-1">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => onStatusChange(opt.value)}
                    className={cn(
                      "flex-1 rounded-md border py-1.5 text-xs font-semibold transition-colors",
                      globalStatus === opt.value ? opt.activeColor : opt.color,
                      canEdit && globalStatus !== opt.value && "hover:bg-muted cursor-pointer",
                      !canEdit && "opacity-60",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="space-y-5 px-5 py-4">
              {/* Properties */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Prioridade
                  </Label>
                  <Select value={priority} onValueChange={onPriorityChange} disabled={!canEdit}>
                    <SelectTrigger className="mt-1 h-8 text-sm">
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
                <div>
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Prazo
                  </Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => onDueDateChange(e.target.value)}
                    disabled={!canEdit}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Assignees */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Responsaveis
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {selectedAssigneeIds.length} de {uniqueBoardMembers.length}
                    </span>
                    {canEdit && (
                      <Popover open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] gap-1">
                            <UserPlus className="h-3 w-3" />
                            Adicionar
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="end">
                          <div className="px-3 py-2 border-b">
                            <div className="text-xs font-semibold">Adicionar membro ao board</div>
                            <div className="text-[10px] text-muted-foreground">
                              Usuarios disponiveis para este board
                            </div>
                          </div>
                          <div className="max-h-[200px] overflow-y-auto p-1">
                            {candidatesQuery.isLoading ? (
                              <div className="flex justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : availableCandidates.length === 0 ? (
                              <p className="px-3 py-3 text-xs text-muted-foreground text-center">
                                Todos os usuarios ja sao membros.
                              </p>
                            ) : (
                              availableCandidates.map((candidate) => {
                                const name =
                                  candidate.employeeName ?? candidate.userName ?? candidate.userEmail ?? `Usuario ${candidate.userId}`;
                                const initials = name
                                  .split(/\s+/)
                                  .filter(Boolean)
                                  .slice(0, 2)
                                  .map((p) => p[0])
                                  .join("")
                                  .toUpperCase();
                                return (
                                  <button
                                    key={candidate.userId}
                                    type="button"
                                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-muted transition-colors"
                                    onClick={() => {
                                      addMemberMut.mutate({ boardId, userId: candidate.userId });
                                    }}
                                    disabled={addMemberMut.isPending}
                                  >
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-[9px] font-semibold">
                                        {initials || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-sm">{name}</div>
                                      {candidate.userEmail && (
                                        <div className="truncate text-[10px] text-muted-foreground">
                                          {candidate.userEmail}
                                        </div>
                                      )}
                                    </div>
                                    <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {uniqueBoardMembers.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">Nenhum membro disponivel.</p>
                  ) : (
                    uniqueBoardMembers.map((member) => {
                      const displayName =
                        member.employeeName ?? member.userName ?? member.userEmail ?? `Usuario ${member.userId}`;
                      const initials = displayName
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase();
                      const isSelected = selectedAssigneeIds.includes(member.userId);

                      return (
                        <label
                          key={member.userId}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors",
                            isSelected ? "bg-primary/5" : "hover:bg-muted/50",
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            disabled={!canEdit}
                            onCheckedChange={(checked) => toggleAssignee(member.userId, checked === true)}
                          />
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px] font-semibold">
                              {initials || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm">{displayName}</div>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{member.role}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Labels */}
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Labels
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedLabelIds.length} selecionada(s)
                  </span>
                </div>
                {boardLabels.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {boardLabels.map((label) => {
                      const isSelected = selectedLabelIds.includes(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => toggleLabel(label.id, !isSelected)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                            isSelected
                              ? "border-transparent text-white"
                              : "border-border text-foreground hover:bg-muted",
                          )}
                          style={isSelected ? { backgroundColor: label.color } : undefined}
                        >
                          {!isSelected && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                          )}
                          {label.name}
                          {isSelected && <X className="h-3 w-3 opacity-70" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {canEdit && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="Nova label..."
                      className="h-7 text-xs flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateLabel();
                      }}
                    />
                    <div className="flex gap-1">
                      {LABEL_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            "h-5 w-5 rounded-full border-2 transition-transform",
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
                )}
              </div>

              {/* Description */}
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Descricao
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={saveDescOnBlur}
                  rows={3}
                  disabled={!canEdit}
                  placeholder="Contexto, criterios de pronto, notas..."
                  className="mt-1 text-sm resize-none"
                />
              </div>

              {/* Checklist */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Checklist
                    </Label>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {checklistDoneCount}/{checklistItems.length}
                  </span>
                </div>

                {checklistItems.length > 0 && (
                  <div className="mt-1.5 rounded-md border">
                    {checklistItems.length > 0 && (
                      <div className="h-1 bg-muted overflow-hidden rounded-t-md">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{
                            width: checklistItems.length > 0
                              ? `${(checklistDoneCount / checklistItems.length) * 100}%`
                              : "0%",
                          }}
                        />
                      </div>
                    )}
                    {checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 border-b last:border-b-0 px-3 py-1.5 group/item"
                      >
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
                        <span
                          className={cn(
                            "flex-1 text-sm",
                            item.isDone && "text-muted-foreground line-through",
                          )}
                        >
                          {item.content}
                        </span>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteChecklistItem.mutate({ id: item.id, boardId })}
                            disabled={deleteChecklistItem.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canEdit && (
                  <div className="mt-1.5 flex gap-1.5">
                    <Input
                      value={newChecklistContent}
                      onChange={(e) => setNewChecklistContent(e.target.value)}
                      placeholder="Adicionar item..."
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitChecklist();
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      onClick={submitChecklist}
                      disabled={!newChecklistContent.trim() || createChecklistItem.isPending}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Anexos
                    </Label>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {attachmentsQuery.data?.length ?? 0}
                  </span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {attachmentsQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground py-1">Carregando...</p>
                  ) : (
                    (attachmentsQuery.data ?? []).map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs group/att"
                      >
                        <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <a
                          href={`/api/blob/proxy?url=${encodeURIComponent(att.fileUrl)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 truncate hover:underline"
                        >
                          {att.fileName}
                        </a>
                        {att.sizeBytes != null && (
                          <span className="shrink-0 text-muted-foreground">
                            {(att.sizeBytes / 1024).toFixed(0)}KB
                          </span>
                        )}
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover/att:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteAttachment.mutate({ id: att.id, boardId })}
                            disabled={deleteAttachment.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}

                  {canEdit && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUploadFile(file);
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={attachmentUploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {attachmentUploading ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="mr-1 h-3 w-3" />
                        )}
                        {attachmentUploading ? "Enviando..." : "Anexar"}
                        {!attachmentUploading && (
                          <span className="ml-1 text-muted-foreground">max 4MB</span>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Comentarios
                    </Label>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {commentsQuery.data?.length ?? 0}
                  </span>
                </div>

                {canEdit && (
                  <div className="mt-1.5 flex items-end gap-2">
                    <Textarea
                      value={newCommentBody}
                      onChange={(e) => setNewCommentBody(e.target.value)}
                      placeholder="Escreva um comentario..."
                      rows={2}
                      className="text-sm resize-none"
                      disabled={createComment.isPending}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && newCommentBody.trim() && cardId) {
                          createComment.mutate({ cardId, boardId, body: newCommentBody.trim() });
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      disabled={!newCommentBody.trim() || createComment.isPending}
                      onClick={() =>
                        cardId &&
                        createComment.mutate({ cardId, boardId, body: newCommentBody.trim() })
                      }
                    >
                      {createComment.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}

                {(commentsQuery.data?.length ?? 0) > 0 && (
                  <div className="mt-3 space-y-3">
                    {commentsQuery.data!.map((comment) => (
                      <div key={comment.id} className="flex gap-2 group/comment">
                        <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                          <AvatarFallback className="text-[9px] font-semibold">
                            {(comment.authorName ?? comment.authorEmail ?? "?")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {comment.authorName ?? comment.authorEmail ?? "Autor"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 opacity-0 group-hover/comment:opacity-100 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteComment.mutate({ id: comment.id, boardId })}
                                disabled={deleteComment.isPending}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-snug mt-0.5">
                            {comment.body}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Archive */}
              {canEdit && (
                <div className="border-t pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => cardId && archive.mutate({ id: cardId, boardId })}
                    disabled={archive.isPending}
                  >
                    <Archive className="mr-1.5 h-3.5 w-3.5" />
                    Arquivar card
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
