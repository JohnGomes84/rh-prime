import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { UserMinus, Plus, Loader2, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  INICIADO: { label: "Iniciado", variant: "outline" },
  DOCUMENTOS: { label: "Documentos", variant: "secondary" },
  DEVOLUCAO_EQUIP: { label: "Devolução de equip.", variant: "secondary" },
  CALCULO_VERBAS: { label: "Cálculo de verbas", variant: "secondary" },
  APROVADO: { label: "Aprovado", variant: "default" },
  FINALIZADO: { label: "Finalizado", variant: "default" },
  CANCELADO: { label: "Cancelado", variant: "outline" },
};

const REASON_LABEL: Record<string, string> = {
  sem_justa_causa: "Sem justa causa",
  pedido_demissao: "Pedido de demissão",
  justa_causa: "Justa causa",
  fim_contrato_determinado: "Fim de contrato determinado",
  acordo_mutuo: "Acordo mútuo",
  aposentadoria: "Aposentadoria",
  obito: "Óbito",
};

export default function TerminationList() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    employeeId: "",
    noticeDate: today,
    lastWorkingDay: today,
    reason: "sem_justa_causa",
    noticeType: "indenizado",
    notes: "",
  });

  const utils = trpc.useUtils();
  const list = trpc.lifecycle.termination.list.useQuery(filter ? { status: filter } : undefined);
  const employeesQuery = trpc.employees.list.useQuery({});
  const employees = useMemo(() => {
    const data = employeesQuery.data as any;
    return Array.isArray(data) ? data : data?.data ?? [];
  }, [employeesQuery.data]);

  const create = trpc.lifecycle.termination.create.useMutation({
    onSuccess: (r: any) => {
      toast.success("Desligamento iniciado");
      utils.lifecycle.termination.list.invalidate();
      setDialogOpen(false);
      if (r?.id) setLocation(`/desligamento/${r.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.employeeId || !form.noticeDate || !form.lastWorkingDay) {
      toast.error("Preencha funcionário, data do aviso e último dia trabalhado");
      return;
    }
    create.mutate({
      employeeId: Number(form.employeeId),
      noticeDate: form.noticeDate,
      lastWorkingDay: form.lastWorkingDay,
      reason: form.reason as any,
      noticeType: form.noticeType as any,
      notes: form.notes || undefined,
    });
  };

  const items = (list.data as any[]) ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserMinus className="h-6 w-6" /> Desligamentos
            </h1>
            <p className="text-muted-foreground mt-1">
              Workflow de desligamento com checklist de devolução e cálculo de verbas.
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={filter || "todos"} onValueChange={(v) => setFilter(v === "todos" ? "" : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="INICIADO">Iniciado</SelectItem>
                <SelectItem value="DOCUMENTOS">Documentos</SelectItem>
                <SelectItem value="DEVOLUCAO_EQUIP">Devolução de equip.</SelectItem>
                <SelectItem value="CALCULO_VERBAS">Cálculo de verbas</SelectItem>
                <SelectItem value="APROVADO">Aprovado</SelectItem>
                <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                <SelectItem value="CANCELADO">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Novo desligamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Iniciar desligamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Funcionário *</Label>
                    <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e: any) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Motivo *</Label>
                    <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(REASON_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Data do aviso *</Label>
                      <Input
                        type="date"
                        value={form.noticeDate}
                        onChange={(e) => setForm({ ...form, noticeDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Último dia trabalhado *</Label>
                      <Input
                        type="date"
                        value={form.lastWorkingDay}
                        onChange={(e) => setForm({ ...form, lastWorkingDay: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Tipo de aviso prévio</Label>
                    <Select value={form.noticeType} onValueChange={(v) => setForm({ ...form, noticeType: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trabalhado">Trabalhado</SelectItem>
                        <SelectItem value="indenizado">Indenizado</SelectItem>
                        <SelectItem value="dispensado">Dispensado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={submit} disabled={create.isPending}>
                      {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Iniciar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desligamentos ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {list.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum desligamento {filter ? `no status ${filter}` : "registrado"}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Funcionário</th>
                      <th className="text-left p-2">Motivo</th>
                      <th className="text-left p-2">Aviso</th>
                      <th className="text-left p-2">Último dia</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Iniciado em</th>
                      <th className="text-left p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any) => {
                      const sl = STATUS_LABEL[item.status] ?? { label: item.status, variant: "outline" as const };
                      const emp = employees.find((e: any) => e.id === item.employeeId);
                      return (
                        <tr key={item.id} className="border-t hover:bg-muted/30">
                          <td className="p-2 font-medium">{emp?.fullName ?? `#${item.employeeId}`}</td>
                          <td className="p-2">{REASON_LABEL[item.reason] ?? item.reason}</td>
                          <td className="p-2">{new Date(item.noticeDate).toLocaleDateString("pt-BR")}</td>
                          <td className="p-2">{new Date(item.lastWorkingDay).toLocaleDateString("pt-BR")}</td>
                          <td className="p-2">
                            <Badge variant={sl.variant}>{sl.label}</Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {new Date(item.initiatedAt).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="p-2">
                            <Button size="sm" variant="ghost" onClick={() => setLocation(`/desligamento/${item.id}`)}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Abrir
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
