import { useState } from "react";
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
import { UserPlus, Plus, Loader2, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "Rascunho", variant: "outline" },
  DOCS_PENDING: { label: "Aguardando docs", variant: "secondary" },
  VALIDATING: { label: "Em validação", variant: "secondary" },
  APPROVED: { label: "Aprovado", variant: "default" },
  ACTIVE: { label: "Ativo (vinculado)", variant: "default" },
  REJECTED: { label: "Rejeitado", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "outline" },
};

export default function AdmissionList() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidateCpf: "",
    candidatePhone: "",
    proposedSalary: "",
    proposedHireDate: new Date().toISOString().slice(0, 10),
    contractType: "CLT" as "CLT" | "Estágio" | "Temporário" | "Experiência",
  });

  const utils = trpc.useUtils();
  const list = trpc.lifecycle.admission.list.useQuery(filter ? { status: filter } : undefined);

  const create = trpc.lifecycle.admission.create.useMutation({
    onSuccess: (r: any) => {
      toast.success("Workflow de admissão criado");
      utils.lifecycle.admission.list.invalidate();
      setDialogOpen(false);
      setForm({
        candidateName: "",
        candidateEmail: "",
        candidateCpf: "",
        candidatePhone: "",
        proposedSalary: "",
        proposedHireDate: new Date().toISOString().slice(0, 10),
        contractType: "CLT",
      });
      if (r?.id) setLocation(`/admissao/${r.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    if (!form.candidateName || form.candidateName.length < 2) {
      toast.error("Informe o nome do candidato");
      return;
    }
    create.mutate({
      candidateName: form.candidateName,
      candidateEmail: form.candidateEmail || undefined,
      candidateCpf: form.candidateCpf || undefined,
      candidatePhone: form.candidatePhone || undefined,
      proposedSalary: form.proposedSalary ? parseFloat(form.proposedSalary) : undefined,
      proposedHireDate: form.proposedHireDate || undefined,
      contractType: form.contractType,
    });
  };

  const items = (list.data as any[]) ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <UserPlus className="h-6 w-6" /> Admissões
            </h1>
            <p className="text-muted-foreground mt-1">
              Workflow de admissão com checklist de documentos e validações por etapa.
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={filter || "todos"} onValueChange={(v) => setFilter(v === "todos" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="DRAFT">Rascunho</SelectItem>
                <SelectItem value="DOCS_PENDING">Aguardando docs</SelectItem>
                <SelectItem value="VALIDATING">Em validação</SelectItem>
                <SelectItem value="APPROVED">Aprovado</SelectItem>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="REJECTED">Rejeitado</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Nova admissão
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Iniciar admissão</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Nome do candidato *</Label>
                    <Input
                      value={form.candidateName}
                      onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.candidateEmail}
                        onChange={(e) => setForm({ ...form, candidateEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={form.candidatePhone}
                        onChange={(e) => setForm({ ...form, candidatePhone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={form.candidateCpf}
                      onChange={(e) => setForm({ ...form, candidateCpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Tipo de contrato</Label>
                      <Select
                        value={form.contractType}
                        onValueChange={(v) => setForm({ ...form, contractType: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CLT">CLT</SelectItem>
                          <SelectItem value="Experiência">Experiência</SelectItem>
                          <SelectItem value="Temporário">Temporário</SelectItem>
                          <SelectItem value="Estágio">Estágio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data prevista admissão</Label>
                      <Input
                        type="date"
                        value={form.proposedHireDate}
                        onChange={(e) => setForm({ ...form, proposedHireDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Salário proposto (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.proposedSalary}
                      onChange={(e) => setForm({ ...form, proposedSalary: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={submit} disabled={create.isPending}>
                      {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Criar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflows ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {list.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma admissão {filter ? `no status ${filter}` : "registrada"}. Crie a primeira no botão acima.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Candidato</th>
                      <th className="text-left p-2">CPF</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Contrato</th>
                      <th className="text-left p-2">Admissão prevista</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Iniciado em</th>
                      <th className="text-left p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any) => {
                      const sl = STATUS_LABEL[item.status] ?? { label: item.status, variant: "outline" as const };
                      return (
                        <tr key={item.id} className="border-t hover:bg-muted/30">
                          <td className="p-2 font-medium">{item.candidateName}</td>
                          <td className="p-2 font-mono text-xs">{item.candidateCpf ?? "—"}</td>
                          <td className="p-2">{item.candidateEmail ?? "—"}</td>
                          <td className="p-2">{item.contractType}</td>
                          <td className="p-2">
                            {item.proposedHireDate ? new Date(item.proposedHireDate).toLocaleDateString("pt-BR") : "—"}
                          </td>
                          <td className="p-2">
                            <Badge variant={sl.variant}>{sl.label}</Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {new Date(item.startedAt).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="p-2">
                            <Button size="sm" variant="ghost" onClick={() => setLocation(`/admissao/${item.id}`)}>
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
