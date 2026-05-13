import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function NewBoardDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]!);
  const [visibility, setVisibility] = useState<"private" | "team" | "public">("private");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const departmentsQuery = trpc.departments.list.useQuery(undefined, { enabled: open });
  const sessionQuery = trpc.auth.session.useQuery(undefined, { enabled: open });

  const departments = useMemo(() => (departmentsQuery.data as Array<{ id: number; name: string }> | undefined) ?? [], [departmentsQuery.data]);

  useEffect(() => {
    if (!open) return;
    if (visibility !== "team") return;
    if (departmentId) return;
    const ownDepartmentId = sessionQuery.data?.employee?.departmentId;
    if (ownDepartmentId) setDepartmentId(String(ownDepartmentId));
  }, [departmentId, open, sessionQuery.data?.employee?.departmentId, visibility]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setColor(COLORS[0]!);
    setVisibility("private");
    setDepartmentId("");
  };

  const create = trpc.kanban.boards.create.useMutation({
    onSuccess: (result) => {
      utils.kanban.boards.list.invalidate();
      toast.success("Board criado");
      setOpen(false);
      resetForm();
      navigate(`/kanban/${result.id}`);
    },
    onError: (error) => toast.error(error.message ?? "Falha ao criar board"),
  });

  const handleCreate = () => {
    if (!name.trim()) return;
    if (visibility === "team" && !departmentId) {
      toast.error("Selecione um departamento para boards de departamento");
      return;
    }

    create.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      visibility,
      departmentId: visibility === "team" ? Number(departmentId) : undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" />
          Novo board
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar board</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="board-name">Nome</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Admissoes 2026"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="board-desc">Descricao</Label>
            <Textarea
              id="board-desc"
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

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || create.isPending || (visibility === "team" && !departmentId)}
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
