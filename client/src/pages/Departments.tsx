import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DepartmentNode {
  id: number;
  name: string;
  parentId: number | null;
  costCenter: string | null;
  active: boolean;
  children: DepartmentNode[];
}

function buildTree(list: any[]): DepartmentNode[] {
  const map = new Map<number, DepartmentNode>();
  list.forEach((d: any) =>
    map.set(d.id, {
      id: d.id,
      name: d.name,
      parentId: d.parentId ?? null,
      costCenter: d.costCenter ?? null,
      active: !!d.active,
      children: [],
    })
  );
  const roots: DepartmentNode[] = [];
  Array.from(map.values()).forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function TreeRow({
  node,
  depth,
  onEdit,
  onDelete,
}: {
  node: DepartmentNode;
  depth: number;
  onEdit: (d: DepartmentNode) => void;
  onDelete: (d: DepartmentNode) => void;
}) {
  return (
    <>
      <div
        className="flex items-center justify-between py-2 px-3 hover:bg-muted/40 rounded-md"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className={node.active ? "font-medium" : "text-muted-foreground line-through"}>
            {node.name}
          </span>
          {node.costCenter && (
            <span className="text-xs text-muted-foreground">CC: {node.costCenter}</span>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => onEdit(node)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(node)}>
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
          </Button>
        </div>
      </div>
      {node.children.map((child) => (
        <TreeRow key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
}

export default function Departments() {
  const utils = trpc.useUtils();
  const list = trpc.departments.list.useQuery();
  const tree = useMemo(() => buildTree((list.data as any[]) ?? []), [list.data]);
  const flat = (list.data as any[]) ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentNode | null>(null);
  const [form, setForm] = useState({ name: "", parentId: "" as string, costCenter: "" });

  const create = trpc.departments.create.useMutation({
    onSuccess: () => {
      toast.success("Departamento criado");
      utils.departments.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.departments.update.useMutation({
    onSuccess: () => {
      toast.success("Departamento atualizado");
      utils.departments.list.invalidate();
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.departments.delete.useMutation({
    onSuccess: () => {
      toast.success("Departamento removido");
      utils.departments.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", parentId: "", costCenter: "" });
    setDialogOpen(true);
  };

  const openEdit = (d: DepartmentNode) => {
    setEditing(d);
    setForm({
      name: d.name,
      parentId: d.parentId ? String(d.parentId) : "",
      costCenter: d.costCenter ?? "",
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name || form.name.length < 2) {
      toast.error("Informe o nome (mínimo 2 caracteres)");
      return;
    }
    const payload: any = {
      name: form.name,
      costCenter: form.costCenter || undefined,
      parentId: form.parentId ? Number(form.parentId) : undefined,
    };
    if (editing) {
      if (form.parentId === "") payload.parentId = null;
      update.mutate({ id: editing.id, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  const handleDelete = (d: DepartmentNode) => {
    if (!confirm(`Remover departamento "${d.name}"? Filhos ficarão órfãos.`)) return;
    remove.mutate({ id: d.id });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6" /> Departamentos
            </h1>
            <p className="text-muted-foreground mt-1">
              Estrutura hierárquica da empresa. Aninhe departamentos via campo &quot;Pai&quot;.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Novo departamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar departamento" : "Novo departamento"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Departamento pai (opcional)</Label>
                  <Select value={form.parentId || "none"} onValueChange={(v) => setForm({ ...form, parentId: v === "none" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sem pai (raiz) —</SelectItem>
                      {flat
                        .filter((d: any) => !editing || d.id !== editing.id)
                        .map((d: any) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Centro de custo (opcional)</Label>
                  <Input value={form.costCenter} onChange={(e) => setForm({ ...form, costCenter: e.target.value })} placeholder="Ex: CC-001" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={submit} disabled={create.isPending || update.isPending}>
                    {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editing ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estrutura</CardTitle>
          </CardHeader>
          <CardContent>
            {list.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : tree.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum departamento cadastrado. Comece criando o departamento raiz.
              </p>
            ) : (
              <div className="space-y-1">
                {tree.map((node) => (
                  <TreeRow
                    key={node.id}
                    node={node}
                    depth={0}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
