import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { trpc } from "@/lib/trpc";

type Priority = "low" | "medium" | "high" | "urgent";

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

  const boardsQuery = trpc.kanban.boards.list.useQuery(undefined, { enabled: open });
  const listsQuery = trpc.kanban.lists.listByBoard.useQuery(
    { boardId: boardId ?? 0 },
    { enabled: open && !!boardId },
  );

  useEffect(() => {
    if (!open) {
      setBoardId(null);
      setListId(null);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
    }
  }, [open]);

  useEffect(() => {
    setListId(null);
  }, [boardId]);

  const createCard = trpc.kanban.cards.create.useMutation({
    onSuccess: async () => {
      toast.success("Card criado");
      await utils.kanban.cards.listAcrossUserBoards.invalidate();
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error(e.message || "Falha ao criar card");
    },
  });

  const handleSubmit = () => {
    if (!boardId || !listId || !title.trim()) {
      toast.error("Board, coluna e titulo sao obrigatorios");
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

  const boards = boardsQuery.data ?? [];
  const lists = listsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo card
          </DialogTitle>
          <DialogDescription>
            Crie um card em qualquer board acessivel. Status global comeca em "todo".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nc-board">Board *</Label>
            <Select
              value={boardId ? String(boardId) : ""}
              onValueChange={(v) => setBoardId(Number(v))}
            >
              <SelectTrigger id="nc-board">
                <SelectValue placeholder={boardsQuery.isLoading ? "Carregando..." : "Selecione"} />
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

          <div className="space-y-1.5">
            <Label htmlFor="nc-list">Coluna *</Label>
            <Select
              value={listId ? String(listId) : ""}
              onValueChange={(v) => setListId(Number(v))}
              disabled={!boardId || listsQuery.isLoading}
            >
              <SelectTrigger id="nc-list">
                <SelectValue
                  placeholder={
                    !boardId
                      ? "Selecione um board primeiro"
                      : listsQuery.isLoading
                        ? "Carregando..."
                        : "Selecione"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {lists.map((l: any) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nc-title">Titulo *</Label>
            <Input
              id="nc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Revisar contrato"
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nc-desc">Descricao</Label>
            <Textarea
              id="nc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes (opcional)"
              rows={3}
              maxLength={10000}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nc-prio">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger id="nc-prio">
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
            <div className="space-y-1.5">
              <Label htmlFor="nc-due">Prazo</Label>
              <Input
                id="nc-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createCard.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={createCard.isPending}>
            {createCard.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Criar card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
