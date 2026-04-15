import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "email" | "select" | "date" | "number" | "textarea";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  showInTable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
};

type CrudPageProps = {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  fields: FieldDef[];
  data: any[];
  isLoading: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onCreate?: (data: any) => Promise<void>;
  onUpdate?: (data: any) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  searchPlaceholder?: string;
  headerExtra?: React.ReactNode;
  renderEditExtra?: (item: any) => React.ReactNode;
};

export default function CrudPage({
  title,
  subtitle,
  icon,
  fields,
  data,
  isLoading,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  onCreate,
  onUpdate,
  onDelete,
  searchPlaceholder = "Buscar...",
  headerExtra,
  renderEditExtra,
}: CrudPageProps) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const tableFields = fields.filter(f => f.showInTable !== false);

  const filteredData = data.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return fields.some(f => {
      const val = item[f.key];
      return val && String(val).toLowerCase().includes(s);
    });
  });

  const openCreate = () => {
    setEditItem(null);
    const defaults: Record<string, any> = {};
    fields.forEach(f => { defaults[f.key] = ""; });
    setFormData(defaults);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    const data: Record<string, any> = {};
    fields.forEach(f => {
      let val = item[f.key];
      if (f.type === "date" && val) {
        val = new Date(val).toISOString().split("T")[0];
      }
      data[f.key] = val ?? "";
    });
    setFormData(data);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editItem) {
        await onUpdate?.({ id: editItem.id, ...formData });
        toast.success("Atualizado com sucesso");
      } else {
        await onCreate?.(formData);
        toast.success("Criado com sucesso");
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null) return;
    try {
      await onDelete?.(deleteId);
      toast.success("Removido com sucesso");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover");
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {icon} {title}
          </h1>
          {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          {canCreate && onCreate && (
            <Button onClick={openCreate} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 max-w-xs bg-background"
            />
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredData.length} registro(s)
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum registro encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {tableFields.map(f => (
                      <TableHead key={f.key} className="text-xs font-semibold uppercase tracking-wider">
                        {f.label}
                      </TableHead>
                    ))}
                    {(canEdit || canDelete) && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-accent/30">
                      {tableFields.map(f => (
                        <TableCell key={f.key} className="text-sm">
                          {f.render ? f.render(item[f.key], item) : (
                            f.type === "date" && item[f.key]
                              ? new Date(item[f.key]).toLocaleDateString("pt-BR")
                              : item[f.key] ?? "—"
                          )}
                        </TableCell>
                      ))}
                      {(canEdit || canDelete) && (
                        <TableCell>
                          <div className="flex gap-1">
                            {canEdit && onUpdate && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {canDelete && onDelete && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar" : "Novo"} {title.replace(/s$/, "")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {fields.map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs font-medium">{f.label}{f.required && " *"}</Label>
                {f.type === "select" ? (
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={formData[f.key] || ""}
                    onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                  >
                    <option value="">Selecione...</option>
                    {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                    value={formData[f.key] || ""}
                    onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                ) : (
                  <Input
                    type={f.type || "text"}
                    value={formData[f.key] || ""}
                    onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="h-9"
                  />
                )}
              </div>
            ))}
            {editItem && renderEditExtra ? (
              <div className="pt-3">
                {renderEditExtra(editItem)}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editItem ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Deseja realmente excluir este registro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
