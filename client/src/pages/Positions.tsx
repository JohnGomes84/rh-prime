import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Loader2, Pencil, Trash2, Briefcase } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Positions() {
  const { data: positions, isLoading } = trpc.positions.list.useQuery();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createMutation = trpc.positions.create.useMutation({
    onSuccess: () => {
      utils.positions.list.invalidate();
      toast.success("Cargo cadastrado com sucesso!");
      setDialogOpen(false);
      setEditingId(null);
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const updateMutation = trpc.positions.update.useMutation({
    onSuccess: () => {
      utils.positions.list.invalidate();
      toast.success("Cargo atualizado!");
      setDialogOpen(false);
      setEditingId(null);
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const deleteMutation = trpc.positions.delete.useMutation({
    onSuccess: () => {
      utils.positions.list.invalidate();
      toast.success("Cargo removido!");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      title: fd.get("title") as string,
      department: (fd.get("department") as string) || undefined,
      description: (fd.get("description") as string) || undefined,
      baseSalary: (fd.get("baseSalary") as string) || undefined,
      cboCode: (fd.get("cbo") as string) || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const editingPosition = editingId ? positions?.find((p: any) => p.id === editingId) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cargos e Funções</h1>
            <p className="text-muted-foreground">Gerencie os cargos, departamentos e faixas salariais.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Cargo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingId ? "Editar Cargo" : "Novo Cargo"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Título do Cargo *</Label>
                  <Input name="title" required defaultValue={editingPosition?.title ?? ""} />
                </div>
                <div>
                  <Label>Departamento</Label>
                  <Input name="department" defaultValue={editingPosition?.department ?? ""} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input name="description" defaultValue={editingPosition?.description ?? ""} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Salário Base (R$)</Label>
                    <Input name="baseSalary" type="number" step="0.01" defaultValue={editingPosition?.baseSalary ?? ""} />
                  </div>
                  <div>
                    <Label>CBO</Label>
                    <Input name="cbo" placeholder="Ex: 2521-05" defaultValue={editingPosition?.cboCode ?? ""} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingId(null); }}>Cancelar</Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Salvar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !positions || positions.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum cargo cadastrado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>CBO</TableHead>
                    <TableHead>Salário Base</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((pos: any) => (
                    <TableRow key={pos.id}>
                      <TableCell className="font-medium">{pos.title}</TableCell>
                      <TableCell>{pos.department || "-"}</TableCell>
                      <TableCell><Badge variant="secondary">{pos.cboCode || "-"}</Badge></TableCell>
                      <TableCell>{pos.baseSalary ? `R$ ${Number(pos.baseSalary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingId(pos.id); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (confirm("Deseja realmente excluir este cargo?")) deleteMutation.mutate({ id: pos.id });
                          }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
