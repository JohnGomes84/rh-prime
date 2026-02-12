import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Loader2, Pencil, Trash2, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DocumentTemplates() {
  const { data: templates, isLoading } = trpc.documentTemplates.list.useQuery();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const createMutation = trpc.documentTemplates.create.useMutation({
    onSuccess: () => {
      utils.documentTemplates.list.invalidate();
      toast.success("Template criado!");
      setDialogOpen(false);
      setEditingId(null);
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const updateMutation = trpc.documentTemplates.update.useMutation({
    onSuccess: () => {
      utils.documentTemplates.list.invalidate();
      toast.success("Template atualizado!");
      setDialogOpen(false);
      setEditingId(null);
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  // Delete not available via API - templates are immutable

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      templateName: fd.get("name") as string,
      templateType: "Outros" as const,
      content: fd.get("content") as string,
      placeholders: (fd.get("description") as string) || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const editingTemplate = editingId ? templates?.find((t: any) => t.id === editingId) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Templates de Documentos</h1>
            <p className="text-muted-foreground">Crie e gerencie modelos de documentos para geração automática.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingId(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{editingId ? "Editar Template" : "Novo Template"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome do Template *</Label>
                  <Input name="name" required defaultValue={editingTemplate?.templateName ?? ""} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input name="description" defaultValue={editingTemplate?.placeholders ?? ""} />
                </div>
                <div>
                  <Label>Conteúdo (HTML/Texto) *</Label>
                  <Textarea name="content" required rows={10} defaultValue={editingTemplate?.content ?? ""} placeholder="Use {{nomeDoFuncionario}}, {{cpf}}, {{dataAtual}}, etc. para variáveis dinâmicas" />
                </div>
                <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  <p className="font-semibold mb-1">Variáveis disponíveis:</p>
                  <p>{'{{nomeDoFuncionario}}'} {'{{cpf}}'} {'{{dataAtual}}'} {'{{cargo}}'} {'{{departamento}}'} {'{{salario}}'} {'{{dataAdmissao}}'}</p>
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
            ) : !templates || templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum template criado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tpl: any) => (
                    <TableRow key={tpl.id}>
                      <TableCell className="font-medium">{tpl.templateName}</TableCell>
                      <TableCell>{tpl.placeholders || "-"}</TableCell>
                      <TableCell>{new Date(tpl.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingId(tpl.id); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
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
