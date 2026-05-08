import { useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertCircle, Loader2, Lock, Calculator } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATUS_FLOW = [
  { value: "INICIADO", label: "Iniciado" },
  { value: "DOCUMENTOS", label: "Documentos" },
  { value: "DEVOLUCAO_EQUIP", label: "Devolução de equip." },
  { value: "CALCULO_VERBAS", label: "Cálculo de verbas" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const REASON_LABEL: Record<string, string> = {
  sem_justa_causa: "Sem justa causa",
  pedido_demissao: "Pedido de demissão",
  justa_causa: "Justa causa",
  fim_contrato_determinado: "Fim de contrato determinado",
  acordo_mutuo: "Acordo mútuo",
  aposentadoria: "Aposentadoria",
  obito: "Óbito",
};

export default function TerminationDetail() {
  const [, params] = useRoute("/desligamento/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? Number(params.id) : 0;

  const utils = trpc.useUtils();
  const detail = trpc.lifecycle.termination.get.useQuery({ id }, { enabled: id > 0 });
  const employeesQuery = trpc.employees.list.useQuery({});
  const employees = useMemo(() => {
    const data = employeesQuery.data as any;
    return Array.isArray(data) ? data : data?.data ?? [];
  }, [employeesQuery.data]);

  const updateMutation = trpc.lifecycle.termination.update.useMutation({
    onSuccess: () => {
      toast.success("Desligamento atualizado");
      utils.lifecycle.termination.get.invalidate({ id });
      utils.lifecycle.termination.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const completeDevolution = trpc.lifecycle.termination.completeDevolution.useMutation({
    onSuccess: () => {
      utils.lifecycle.termination.get.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const finalize = trpc.lifecycle.termination.finalize.useMutation({
    onSuccess: () => {
      toast.success("Desligamento finalizado. Funcionário marcado como Inativo.");
      utils.lifecycle.termination.get.invalidate({ id });
      utils.lifecycle.termination.list.invalidate();
      utils.employees.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [verbas, setVerbas] = useState<string>("");

  if (id <= 0) return <DashboardLayout><div className="p-6">ID inválido</div></DashboardLayout>;
  if (detail.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      </DashboardLayout>
    );
  }
  if (!detail.data) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Button variant="ghost" onClick={() => setLocation("/desligamento")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <p className="text-sm text-muted-foreground">Desligamento não encontrado.</p>
        </div>
      </DashboardLayout>
    );
  }

  const { termination, devolution } = detail.data as any;
  const emp = employees.find((e: any) => e.id === termination.employeeId);
  const totalDev = devolution.length;
  const returnedDev = devolution.filter((d: any) => d.returned).length;
  const allReturned = totalDev > 0 && returnedDev === totalDev;
  const isFinalized = termination.status === "FINALIZADO";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/desligamento")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{emp?.fullName ?? `Funcionário #${termination.employeeId}`}</h1>
              <p className="text-muted-foreground text-sm">
                Desligamento #{termination.id} · {REASON_LABEL[termination.reason] ?? termination.reason} ·
                aviso em {new Date(termination.noticeDate).toLocaleDateString("pt-BR")} ·
                último dia em {new Date(termination.lastWorkingDay).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <Badge variant={isFinalized ? "default" : "outline"}>
            {STATUS_FLOW.find((s) => s.value === termination.status)?.label ?? termination.status}
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Itens devolvidos</p>
              <p className="text-2xl font-bold">{returnedDev} / {totalDev}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Aviso prévio</p>
              <p className="text-sm font-medium">{termination.noticeType ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total de verbas</p>
              <p className="text-sm font-medium">
                {termination.totalVerbas
                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(termination.totalVerbas))
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status e ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select
                  value={termination.status}
                  onValueChange={(v) => updateMutation.mutate({ id, status: v as any })}
                  disabled={updateMutation.isPending || isFinalized}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FLOW.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Total de verbas (R$)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={verbas}
                    placeholder={termination.totalVerbas ?? "0.00"}
                    onChange={(e) => setVerbas(e.target.value)}
                    disabled={isFinalized}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!verbas) {
                        toast.error("Informe o valor");
                        return;
                      }
                      updateMutation.mutate({ id, totalVerbas: parseFloat(verbas) });
                    }}
                    disabled={updateMutation.isPending || isFinalized}
                  >
                    <Calculator className="h-4 w-4 mr-1" /> Salvar
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <Button
                onClick={() => {
                  if (!confirm("Finalizar desligamento? Funcionário será marcado como Inativo.")) return;
                  finalize.mutate({ id });
                }}
                disabled={finalize.isPending || isFinalized || !allReturned}
                variant={isFinalized ? "outline" : "default"}
              >
                {finalize.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Lock className="h-4 w-4 mr-2" />
                {isFinalized ? "Finalizado" : "Finalizar desligamento"}
              </Button>
              {!allReturned && !isFinalized && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Conclua a devolução de todos os itens antes de finalizar.
                </p>
              )}
            </div>

            {termination.notes && (
              <div className="border-t pt-3">
                <Label className="text-xs text-muted-foreground">Observações</Label>
                <p className="text-sm">{termination.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Devolução de equipamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {devolution.map((item: any) => (
                <li key={item.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/40">
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!item.returned}
                      disabled={completeDevolution.isPending || isFinalized}
                      onChange={(e) =>
                        completeDevolution.mutate({ id: item.id, returned: e.target.checked })
                      }
                    />
                    <span className={item.returned ? "line-through text-muted-foreground" : ""}>
                      {item.itemDescription}
                    </span>
                  </label>
                  {item.returnedAt && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.returnedAt).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
