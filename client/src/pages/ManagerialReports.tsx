import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Loader2,
  Plus,
  Search,
  Send,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const STORED_TEMPLATES = [
  { key: "rh_admin.semanal.detalhado", label: "RH - Semanal", sector: "RH Administrativo", cadence: "Semanal" },
  { key: "rh_admin.mensal", label: "RH - Mensal", sector: "RH Administrativo", cadence: "Mensal" },
  { key: "financeiro.semanal.detalhado", label: "Financeiro - Semanal", sector: "Financeiro", cadence: "Semanal" },
  { key: "financeiro.mensal", label: "Financeiro - Mensal", sector: "Financeiro", cadence: "Mensal" },
] as const;

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-slate-100 text-slate-700 border-slate-200" },
  enviado: { label: "Em validação", className: "bg-amber-100 text-amber-800 border-amber-200" },
  validado: { label: "Validado", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  devolvido: { label: "Devolvido", className: "bg-red-100 text-red-800 border-red-200" },
};

const ITEM_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-slate-100 text-slate-700" },
  em_andamento: { label: "Em andamento", className: "bg-blue-100 text-blue-800" },
  concluido: { label: "Concluído", className: "bg-emerald-100 text-emerald-800" },
};

function sectorLabel(sector: string) {
  return sector === "rh_admin" ? "RH Administrativo" : "Financeiro";
}

function cadenceLabel(cadence: string) {
  return cadence === "semanal" ? "Semanal" : "Mensal";
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("pt-BR");
}

function daysUntil(value: string) {
  const due = new Date(`${value}T23:59:59`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  if (overdue && status !== "validado") {
    return <Badge className="border-red-200 bg-red-100 text-red-800">Em atraso</Badge>;
  }
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.rascunho;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

function KpiCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: typeof FileText;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const toneClass = {
    default: "text-primary bg-primary/10",
    warning: "text-amber-700 bg-amber-100",
    success: "text-emerald-700 bg-emerald-100",
    danger: "text-red-700 bg-red-100",
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className={cn("rounded-md p-2", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ManagerialReports() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <DashboardLayout>
      {selectedId !== null ? (
        <ReportEditor id={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <ReportList onOpen={setSelectedId} />
      )}
    </DashboardLayout>
  );
}

function ReportList({ onOpen }: { onOpen: (id: number) => void }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState(STORED_TEMPLATES[0].key);
  const [periodRef, setPeriodRef] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sectorFilter, setSectorFilter] = useState("todos");
  const [cadenceFilter, setCadenceFilter] = useState("todos");

  const queryInput = useMemo(
    () => ({
      status: statusFilter === "todos" ? undefined : (statusFilter as any),
      sector: sectorFilter === "todos" ? undefined : (sectorFilter as any),
      cadence: cadenceFilter === "todos" ? undefined : (cadenceFilter as any),
    }),
    [cadenceFilter, sectorFilter, statusFilter],
  );
  const { data: reports = [], isLoading } = trpc.managerialReports.listReports.useQuery(queryInput);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((r: any) =>
      [sectorLabel(r.sector), cadenceLabel(r.cadence), r.periodRef, r.dueDate, STATUS_BADGE[r.status]?.label]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [reports, search]);

  const stats = useMemo(() => {
    const total = reports.length;
    const overdue = reports.filter((r: any) => r.overdue).length;
    const pendingValidation = reports.filter((r: any) => r.status === "enviado").length;
    const validated = reports.filter((r: any) => r.status === "validado").length;
    const completion = total > 0 ? Math.round((validated / total) * 100) : 0;
    return { total, overdue, pendingValidation, validated, completion };
  }, [reports]);

  const create = trpc.managerialReports.createFromTemplate.useMutation({
    onSuccess: ({ id }) => {
      toast.success("Relatório criado");
      setOpen(false);
      setPeriodRef("");
      utils.managerialReports.listReports.invalidate();
      onOpen(id);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios Gerenciais</h1>
          <p className="text-muted-foreground">
            Acompanhe entregas periódicas, pendências de validação e atrasos por área.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo relatório
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo relatório gerencial</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={templateKey} onValueChange={(v) => setTemplateKey(v as typeof templateKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORED_TEMPLATES.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Período: 2026-W26 ou 2026-06"
                value={periodRef}
                onChange={(event) => setPeriodRef(event.target.value)}
              />
              <Button
                className="w-full gap-2"
                disabled={!periodRef.trim() || create.isPending}
                onClick={() => create.mutate({ templateKey, periodRef: periodRef.trim() })}
              >
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar relatório
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Relatórios" value={stats.total} detail={`${filteredReports.length} visíveis no filtro`} icon={FileText} />
        <KpiCard title="Validados" value={stats.validated} detail={`${stats.completion}% da carteira`} icon={CheckCircle2} tone="success" />
        <KpiCard title="Aguardando validação" value={stats.pendingValidation} detail="Enviados para gestor/admin" icon={Clock3} tone="warning" />
        <KpiCard title="Em atraso" value={stats.overdue} detail="Ainda não validados" icon={AlertTriangle} tone={stats.overdue ? "danger" : "default"} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_160px_160px_160px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por setor, período, prazo ou status"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="enviado">Em validação</SelectItem>
              <SelectItem value="validado">Validado</SelectItem>
              <SelectItem value="devolvido">Devolvido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos setores</SelectItem>
              <SelectItem value="rh_admin">RH</SelectItem>
              <SelectItem value="financeiro">Financeiro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cadenceFilter} onValueChange={setCadenceFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Cadência</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setStatusFilter("todos");
              setSectorFilter("todos");
              setCadenceFilter("todos");
            }}
          >
            Limpar
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {isLoading && (
          <Card>
            <CardContent className="flex items-center gap-2 p-6 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando relatórios...
            </CardContent>
          </Card>
        )}

        {!isLoading &&
          filteredReports.map((report: any) => {
            const days = daysUntil(report.dueDate);
            return (
              <Card
                key={report.id}
                className="cursor-pointer transition-colors hover:bg-accent/40"
                onClick={() => onOpen(report.id)}
              >
                <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">
                        {sectorLabel(report.sector)} · {cadenceLabel(report.cadence)} · {report.periodRef}
                      </p>
                      <StatusBadge status={report.status} overdue={report.overdue} />
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Prazo {formatDate(report.dueDate)}
                      </span>
                      <span>
                        {report.status === "validado"
                          ? `Validado em ${formatDate(report.validatedAt)}`
                          : days < 0
                            ? `${Math.abs(days)} dia(s) em atraso`
                            : days === 0
                              ? "Vence hoje"
                              : `${days} dia(s) até o prazo`}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Abrir
                  </Button>
                </CardContent>
              </Card>
            );
          })}

        {!isLoading && filteredReports.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 font-medium">Nenhum relatório encontrado</p>
              <p className="text-sm text-muted-foreground">
                Ajuste os filtros ou crie um relatório para o período desejado.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReportEditor({ id, onBack }: { id: number; onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.managerialReports.getReport.useQuery({ id });

  const updateItem = trpc.managerialReports.updateItem.useMutation({
    onSuccess: () => utils.managerialReports.getReport.invalidate({ id }),
    onError: (e) => toast.error(e.message),
  });
  const updateReport = trpc.managerialReports.updateReport.useMutation({
    onSuccess: () => utils.managerialReports.getReport.invalidate({ id }),
    onError: (e) => toast.error(e.message),
  });
  const submit = trpc.managerialReports.submitForValidation.useMutation({
    onSuccess: () => {
      toast.success("Enviado para validação");
      utils.managerialReports.getReport.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });
  const validate = trpc.managerialReports.validate.useMutation({
    onSuccess: () => {
      toast.success("Validação registrada");
      utils.managerialReports.getReport.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando relatório...
      </div>
    );
  }

  const { report, items } = data as any;
  const rollup = (data as any).rollup ?? { total: items.length, concluido: 0, em_andamento: 0, pendente: items.length };
  const progress = rollup.total > 0 ? Math.round((rollup.concluido / rollup.total) * 100) : 0;
  const locked = report.status === "validado";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button variant="ghost" className="w-fit gap-2 px-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {sectorLabel(report.sector)} · {cadenceLabel(report.cadence)} · {report.periodRef}
              </h1>
              <StatusBadge status={report.status} overdue={(data as any).overdue} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Prazo {formatDate(report.dueDate)} · criado em {formatDate(report.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(report.status === "rascunho" || report.status === "devolvido") && (
            <Button className="gap-2" disabled={submit.isPending} onClick={() => submit.mutate({ id })}>
              {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar para validação
            </Button>
          )}
          {report.status === "enviado" && (
            <>
              <Button className="gap-2" disabled={validate.isPending} onClick={() => validate.mutate({ id, approve: true })}>
                <CheckCircle2 className="h-4 w-4" />
                Aprovar
              </Button>
              <Button
                variant="destructive"
                disabled={validate.isPending}
                onClick={() => validate.mutate({ id, approve: false, rejectionNote: "Revisar e reenviar" })}
              >
                Devolver
              </Button>
            </>
          )}
        </div>
      </div>

      {report.status === "devolvido" && report.rejectionNote && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex gap-3 p-4 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Devolução: {report.rejectionNote}</span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Itens do relatório</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {items.map((item: any, index: number) => {
                const cfg = ITEM_STATUS_BADGE[item.itemStatus] ?? ITEM_STATUS_BADGE.pendente;
                return (
                  <div key={item.id} className="space-y-3 rounded-md border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium">
                          {index + 1}. {item.label}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.expectedContent}</p>
                      </div>
                      <Badge className={cfg.className}>{cfg.label}</Badge>
                    </div>
                    <Textarea
                      className="min-h-28"
                      defaultValue={item.value ?? ""}
                      disabled={locked}
                      placeholder="Registre números, responsáveis, pendências e próximos passos."
                      onBlur={(event) => updateItem.mutate({ reportId: id, itemId: item.id, value: event.target.value })}
                    />
                    <Select
                      value={item.itemStatus}
                      disabled={locked}
                      onValueChange={(value) =>
                        updateItem.mutate({ reportId: id, itemId: item.id, itemStatus: value as any })
                      }
                    >
                      <SelectTrigger className="w-full sm:w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Síntese executiva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                className="min-h-24"
                placeholder="Resumo geral do período"
                defaultValue={report.summary ?? ""}
                disabled={locked}
                onBlur={(event) => updateReport.mutate({ id, summary: event.target.value })}
              />
              <Textarea
                className="min-h-24"
                placeholder="Pontos que exigem validação ou decisão"
                defaultValue={report.pointsForValidator ?? ""}
                disabled={locked}
                onBlur={(event) => updateReport.mutate({ id, pointsForValidator: event.target.value })}
              />
              <Textarea
                className="min-h-24"
                placeholder="Próximas prioridades"
                defaultValue={report.nextPriorities ?? ""}
                disabled={locked}
                onBlur={(event) => updateReport.mutate({ id, nextPriorities: event.target.value })}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progresso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Itens concluídos</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xl font-bold">{rollup.pendente}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{rollup.em_andamento}</p>
                  <p className="text-xs text-muted-foreground">Em andamento</p>
                </div>
                <div>
                  <p className="text-xl font-bold">{rollup.concluido}</p>
                  <p className="text-xs text-muted-foreground">Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Controle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={report.status} overdue={(data as any).overdue} />
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Prazo</span>
                <span className="font-medium">{formatDate(report.dueDate)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Enviado</span>
                <span className="font-medium">{formatDate(report.submittedAt)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Validado</span>
                <span className="font-medium">{formatDate(report.validatedAt)}</span>
              </div>
              {locked && (
                <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  Relatório validado fica bloqueado para preservar a versão auditável.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
