import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox as InboxIcon, Plus, CheckCircle2, XCircle, Loader2, Clock, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRole } from "@/_core/hooks/useRole";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

const KIND_LABEL: Record<string, string> = {
  ferias: "Férias",
  atestado: "Atestado",
  ajuste_ponto: "Ajuste de ponto",
  abono: "Abono",
  horas_extras: "Horas extras",
  declaracao: "Declaração",
  adiantamento: "Adiantamento",
  outro: "Outro",
};

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Pendente", variant: "secondary" },
  IN_REVIEW: { label: "Em análise", variant: "secondary" },
  APPROVED: { label: "Aprovado", variant: "default" },
  REJECTED: { label: "Rejeitado", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "outline" },
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-gray-500",
  NORMAL: "text-blue-600",
  HIGH: "text-amber-600",
  URGENT: "text-red-600",
};

export default function Inbox() {
  const { isManager, isAdmin } = useRole();
  const utils = trpc.useUtils();
  const [scope, setScope] = useState<"mine" | "team" | "all">("mine");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");

  const counts = trpc.inbox.counts.useQuery();
  const feed = trpc.inbox.feed.useQuery({
    scope,
    status: statusFilter || undefined,
  });

  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    kind: "ajuste_ponto",
    subject: "",
    description: "",
    priority: "NORMAL",
  });

  const createMutation = trpc.inbox.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitação criada");
      utils.inbox.feed.invalidate();
      utils.inbox.counts.invalidate();
      setNewOpen(false);
      setNewForm({ kind: "ajuste_ponto", subject: "", description: "", priority: "NORMAL" });
    },
    onError: (e) => toast.error(e.message),
  });

  const decideMutation = trpc.inbox.decide.useMutation({
    onSuccess: () => {
      toast.success("Decisão registrada");
      utils.inbox.feed.invalidate();
      utils.inbox.counts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelMutation = trpc.inbox.cancel.useMutation({
    onSuccess: () => {
      toast.success("Solicitação cancelada");
      utils.inbox.feed.invalidate();
      utils.inbox.counts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const items = (feed.data?.items as any[]) ?? [];

  const submit = () => {
    if (!newForm.subject || newForm.subject.length < 2) {
      toast.error("Informe o assunto");
      return;
    }
    createMutation.mutate({
      kind: newForm.kind as any,
      subject: newForm.subject,
      description: newForm.description || undefined,
      priority: newForm.priority as any,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <InboxIcon className="h-6 w-6" /> Caixa de entrada
            </h1>
            <p className="text-muted-foreground mt-1">
              Solicitações, aprovações e pendências consolidadas.
            </p>
          </div>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Nova solicitação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova solicitação</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={newForm.kind} onValueChange={(v) => setNewForm({ ...newForm, kind: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(KIND_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Assunto *</Label>
                  <Input
                    value={newForm.subject}
                    onChange={(e) => setNewForm({ ...newForm, subject: e.target.value })}
                    placeholder="Ex: Ajustar ponto de 08/05"
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    rows={4}
                    value={newForm.description}
                    onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={newForm.priority} onValueChange={(v) => setNewForm({ ...newForm, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Baixa</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="URGENT">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
                  <Button onClick={submit} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={scope} onValueChange={(v) => setScope(v as any)}>
          <TabsList>
            <TabsTrigger value="mine" className="gap-2">
              Minhas
              {(counts.data?.mine ?? 0) > 0 && (
                <Badge variant="secondary" className="text-xs">{counts.data?.mine}</Badge>
              )}
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="team" className="gap-2">
                Equipe
                {(counts.data?.team ?? 0) > 0 && (
                  <Badge variant="secondary" className="text-xs">{counts.data?.team}</Badge>
                )}
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="all" className="gap-2">
                Todas
                {(counts.data?.all ?? 0) > 0 && (
                  <Badge variant="secondary" className="text-xs">{counts.data?.all}</Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value={scope} className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm">Status:</Label>
              <Select value={statusFilter || "todos"} onValueChange={(v) => setStatusFilter(v === "todos" ? "" : v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="PENDING">Pendentes</SelectItem>
                  <SelectItem value="IN_REVIEW">Em análise</SelectItem>
                  <SelectItem value="APPROVED">Aprovados</SelectItem>
                  <SelectItem value="REJECTED">Rejeitados</SelectItem>
                  <SelectItem value="CANCELLED">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{items.length} item(s)</CardTitle>
              </CardHeader>
              <CardContent>
                {feed.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma solicitação no escopo atual.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {items.map((item: any) => {
                      const sl = STATUS_LABEL[item.status] ?? { label: item.status, variant: "outline" as const };
                      const sla = item.slaDueAt ? new Date(item.slaDueAt) : null;
                      const overdue = sla && sla < new Date() && item.status === "PENDING";
                      return (
                        <li key={item.id} className="py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{item.subject}</span>
                                <Badge variant="outline" className="text-xs">{KIND_LABEL[item.kind] ?? item.kind}</Badge>
                                <Badge variant={sl.variant} className="text-xs">{sl.label}</Badge>
                                <span className={`text-xs ${PRIORITY_COLOR[item.priority] ?? ""}`}>
                                  {item.priority}
                                </span>
                                {overdue && (
                                  <span className="text-xs text-red-600 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> SLA vencido
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                              )}
                              {item.kind === "ferias" && item.payload && (() => {
                                const p = item.payload as Record<string, any>;
                                return (
                                  <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs space-y-1">
                                    <p><strong>Período aquisitivo:</strong> {formatDate(p.acquisitionStart)} a {formatDate(p.acquisitionEnd)}</p>
                                    <p><strong>Gozo solicitado:</strong> {formatDate(p.startDate)} a {formatDate(p.endDate)} ({p.days} dias)</p>
                                    {p.abonoDays > 0 && <p><strong>Abono pecuniário:</strong> {p.abonoDays} dias</p>}
                                  </div>
                                );
                              })()}
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(item.createdAt).toLocaleString("pt-BR")}
                                </span>
                                {sla && (
                                  <span className={overdue ? "text-red-600" : ""}>
                                    SLA: {sla.toLocaleDateString("pt-BR")}
                                  </span>
                                )}
                              </div>
                            </div>
                            {item.status === "PENDING" && (
                              <div className="flex flex-col gap-1">
                                {(scope === "team" || scope === "all") && isManager && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => decideMutation.mutate({ id: item.id, decision: "APPROVED" })}
                                      disabled={decideMutation.isPending}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => {
                                        const reason = prompt("Motivo (obrigatório):");
                                        if (!reason) return;
                                        decideMutation.mutate({ id: item.id, decision: "REJECTED", reason });
                                      }}
                                      disabled={decideMutation.isPending}
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                                    </Button>
                                  </>
                                )}
                                {scope === "mine" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => cancelMutation.mutate({ id: item.id })}
                                    disabled={cancelMutation.isPending}
                                  >
                                    Cancelar
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
