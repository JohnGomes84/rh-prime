import { useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Loader2, UserCheck, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATUS_FLOW = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "DOCS_PENDING", label: "Aguardando docs" },
  { value: "VALIDATING", label: "Em validação" },
  { value: "APPROVED", label: "Aprovado" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "REJECTED", label: "Rejeitado" },
  { value: "CANCELLED", label: "Cancelado" },
];

export default function AdmissionDetail() {
  const [, params] = useRoute("/admissao/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? Number(params.id) : 0;

  const utils = trpc.useUtils();
  const detail = trpc.lifecycle.admission.get.useQuery({ id }, { enabled: id > 0 });
  const employeesQuery = trpc.employees.list.useQuery({});
  const employees = useMemo(() => {
    const data = employeesQuery.data as any;
    return Array.isArray(data) ? data : data?.data ?? [];
  }, [employeesQuery.data]);

  const updateMutation = trpc.lifecycle.admission.update.useMutation({
    onSuccess: () => {
      toast.success("Workflow atualizado");
      utils.lifecycle.admission.get.invalidate({ id });
      utils.lifecycle.admission.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const completeItem = trpc.lifecycle.admission.completeChecklistItem.useMutation({
    onSuccess: () => {
      utils.lifecycle.admission.get.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const finalize = trpc.lifecycle.admission.finalize.useMutation({
    onSuccess: () => {
      toast.success("Admissão finalizada e vinculada ao funcionário");
      utils.lifecycle.admission.get.invalidate({ id });
      utils.lifecycle.admission.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [linkEmpId, setLinkEmpId] = useState<string>("");

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
          <Button variant="ghost" onClick={() => setLocation("/admissao")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <p className="text-sm text-muted-foreground">Workflow não encontrado.</p>
        </div>
      </DashboardLayout>
    );
  }

  const { workflow, checklist } = detail.data as any;
  const totalRequired = checklist.filter((c: any) => c.required).length;
  const completedRequired = checklist.filter((c: any) => c.required && c.completed).length;
  const allRequiredDone = totalRequired > 0 && completedRequired === totalRequired;

  const grouped: Record<string, any[]> = {};
  for (const item of checklist) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admissao")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{workflow.candidateName}</h1>
              <p className="text-muted-foreground text-sm">
                Admissão #{workflow.id} · {workflow.contractType} · iniciada em{" "}
                {new Date(workflow.startedAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <Badge>{STATUS_FLOW.find((s) => s.value === workflow.status)?.label ?? workflow.status}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Documentos obrigatórios</p>
              <p className="text-2xl font-bold">{completedRequired} / {totalRequired}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">CPF</p>
              <p className="font-mono text-sm">{workflow.candidateCpf ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Salário proposto</p>
              <p className="text-sm font-medium">
                {workflow.proposedSalary
                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(workflow.proposedSalary))
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
                  value={workflow.status}
                  onValueChange={(v) => updateMutation.mutate({ id, status: v as any })}
                  disabled={updateMutation.isPending || workflow.status === "ACTIVE"}
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
                <Label>Vincular ao funcionário criado</Label>
                <div className="flex gap-2">
                  <Select value={linkEmpId} onValueChange={setLinkEmpId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funcionário criado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (!linkEmpId) {
                        toast.error("Selecione o funcionário");
                        return;
                      }
                      finalize.mutate({ id, employeeId: Number(linkEmpId) });
                    }}
                    disabled={finalize.isPending || !allRequiredDone || workflow.status === "ACTIVE"}
                  >
                    <UserCheck className="h-4 w-4 mr-2" /> Finalizar
                  </Button>
                </div>
                {!allRequiredDone && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Complete os itens obrigatórios antes de finalizar.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  {category}
                </h3>
                <ul className="space-y-1">
                  {items.map((item: any) => (
                    <li key={item.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/40">
                      <label className="flex items-center gap-2 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!item.completed}
                          disabled={completeItem.isPending}
                          onChange={(e) =>
                            completeItem.mutate({ id: item.id, completed: e.target.checked })
                          }
                        />
                        <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                          {item.itemDescription}
                        </span>
                        {item.required && !item.completed && (
                          <span className="text-xs text-red-600">(obrigatório)</span>
                        )}
                        {item.completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 ml-1" />}
                      </label>
                      {item.completedAt && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.completedAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
