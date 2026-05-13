import { useEffect, useMemo, useState } from "react";
import { Settings2, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

type BoardSettingsData = {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  visibility: "private" | "team" | "public";
  departmentId: number | null;
};

export function BoardSettingsDialog({
  board,
}: {
  board: BoardSettingsData;
}) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? "");
  const [color, setColor] = useState(board.color ?? COLORS[0]!);
  const [visibility, setVisibility] = useState<"private" | "team" | "public">(board.visibility);
  const [departmentId, setDepartmentId] = useState(board.departmentId ? String(board.departmentId) : "");
  const departmentsQuery = trpc.departments.list.useQuery(undefined, { enabled: open });

  const departments = useMemo(
    () => (departmentsQuery.data as Array<{ id: number; name: string }> | undefined) ?? [],
    [departmentsQuery.data],
  );

  useEffect(() => {
    if (!open) return;
    setName(board.name);
    setDescription(board.description ?? "");
    setColor(board.color ?? COLORS[0]!);
    setVisibility(board.visibility);
    setDepartmentId(board.departmentId ? String(board.departmentId) : "");
  }, [board, open]);

  const updateBoard = trpc.kanban.boards.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.kanban.boards.get.invalidate({ id: board.id }),
        utils.kanban.boards.list.invalidate(),
      ]);
      toast.success("Board atualizado");
      setOpen(false);
    },
    onError: (error) => toast.error(error.message ?? "Falha ao atualizar board"),
  });

  const archiveBoard = trpc.kanban.boards.archive.useMutation({
    onSuccess: async () => {
      await utils.kanban.boards.list.invalidate();
      toast.success("Board arquivado");
      setOpen(false);
      navigate("/kanban");
    },
    onError: (error) => toast.error(error.message ?? "Falha ao arquivar board"),
  });

  const handleSave = () => {
    if (!name.trim()) return;
    if (visibility === "team" && !departmentId) {
      toast.error("Selecione um departamento para boards de departamento");
      return;
    }

    updateBoard.mutate({
      id: board.id,
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      visibility,
      departmentId: visibility === "team" ? Number(departmentId) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 className="mr-2 h-4 w-4" />
          Configurar board
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar board</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="board-edit-name">Nome</Label>
            <Input
              id="board-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Admissoes 2026"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="board-edit-desc">Descricao</Label>
            <Textarea
              id="board-edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 ${color === option ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: option }}
                  onClick={() => setColor(option)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Visibilidade</Label>
            <Select
              value={visibility}
              onValueChange={(value) => {
                const nextValue = value as "private" | "team" | "public";
                setVisibility(nextValue);
                if (nextValue !== "team") setDepartmentId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Privado (somente convidados)</SelectItem>
                <SelectItem value="team">Departamento</SelectItem>
                <SelectItem value="public">Publico (toda a equipe visualiza)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibility === "team" && (
            <div className="space-y-1">
              <Label>Departamento</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={String(department.id)}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            className="text-red-600"
            onClick={() => archiveBoard.mutate({ id: board.id })}
            disabled={archiveBoard.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Arquivar
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || updateBoard.isPending || (visibility === "team" && !departmentId)}
            >
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
