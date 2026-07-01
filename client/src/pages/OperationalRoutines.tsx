import { useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type RoutineType =
  | "medicao"
  | "nota_fiscal"
  | "envio_boleto"
  | "cobranca_retorno"
  | "lancamento"
  | "pagamento_operacional"
  | "conferencia_baixa"
  | "fechamento"
  | "outro";

const ROUTINE_TYPES: Array<{ value: RoutineType; label: string }> = [
  { value: "medicao", label: "Medição" },
  { value: "nota_fiscal", label: "Nota fiscal" },
  { value: "envio_boleto", label: "Envio de boleto" },
  { value: "cobranca_retorno", label: "Cobrança / retorno" },
  { value: "lancamento", label: "Lançamento" },
  { value: "pagamento_operacional", label: "Pagamento operacional" },
  { value: "conferencia_baixa", label: "Conferência de baixa" },
  { value: "fechamento", label: "Fechamento" },
  { value: "outro", label: "Outro" },
];

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-slate-100 text-slate-700" },
  in_progress: { label: "Em andamento", className: "bg-blue-100 text-blue-800" },
  waiting_return: { label: "Aguardando retorno", className: "bg-amber-100 text-amber-800" },
  waiting_review: { label: "Aguardando conferência", className: "bg-violet-100 text-violet-800" },
  done: { label: "Concluído", className: "bg-emerald-100 text-emerald-800" },
  overdue: { label: "Em atraso", className: "bg-red-100 text-red-800" },
  not_applicable: { label: "Não aplicável", className: "bg-zinc-100 text-zinc-700" },
};

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("pt-BR");
}

export default function OperationalRoutines() {
  const utils = trpc.useUtils();
  const clientsQuery = trpc.operationalRoutines.clients.list.useQuery();
  const routinesQuery = trpc.operationalRoutines.routines.list.useQuery({});
  const occurrencesQuery = trpc.operationalRoutines.occurrences.list.useQuery({});
  const summaryQuery = trpc.operationalRoutines.dashboard.summary.useQuery();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const occurrences = useMemo(() => {
    const rows = (occurrencesQuery.data ?? []) as any[];
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        [row.routineTitle, row.clientName, row.routineType, row.nextAction, row.operationalNotes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [occurrencesQuery.data, search, statusFilter]);

  const updateOccurrence = trpc.operationalRoutines.occurrences.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.operationalRoutines.occurrences.list.invalidate(),
        utils.operationalRoutines.dashboard.summary.invalidate(),
      ]);
      toast.success("Ocorrência atualizada");
    },
    onError: (error) => toast.error(error.message),
  });

  const markNotApplicable = trpc.operationalRoutines.occurrences.markNotApplicable.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.operationalRoutines.occurrences.list.invalidate(),
        utils.operationalRoutines.dashboard.summary.invalidate(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  const isLoading = clientsQuery.isLoading || routinesQuery.isLoading || occurrencesQuery.isLoading;
  const summary = summaryQuery.data;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rotinas Operacionais</h1>
            <p className="text-muted-foreground">
              Apoio de prazos, recorrências e lembretes sem armazenar dados financeiros sensíveis.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <NewClientDialog />
            <NewRoutineDialog clients={(clientsQuery.data ?? []) as any[]} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="Hoje" value={summary?.today ?? 0} icon={Clock3} />
          <KpiCard title="Próx. 7 dias" value={summary?.next7Days ?? 0} icon={CalendarClock} />
          <KpiCard title="Atrasadas" value={summary?.overdue ?? 0} icon={TriangleAlert} danger />
          <KpiCard title="Aguardando retorno" value={summary?.waitingReturn ?? 0} icon={RefreshCw} />
          <KpiCard title="Sem responsável" value={summary?.noAssignee ?? 0} icon={Search} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle>Agenda operacional</CardTitle>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,260px)_180px]">
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar cliente, rotina ou observação"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos status</SelectItem>
                      {Object.entries(STATUS).map(([key, item]) => (
                        <SelectItem key={key} value={key}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando rotinas...
                </div>
              ) : occurrences.length === 0 ? (
                <div className="rounded-md border border-dashed py-10 text-center text-muted-foreground">
                  Nenhuma ocorrência encontrada.
                </div>
              ) : (
                <div className="space-y-3">
                  {occurrences.map((item) => {
                    const status = STATUS[item.status] ?? STATUS.pending;
                    return (
                      <div key={item.id} className="rounded-md border p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{item.routineTitle}</p>
                              <Badge className={status.className}>{status.label}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {item.clientName} · {ROUTINE_TYPES.find((t) => t.value === item.routineType)?.label ?? item.routineType} · prazo {formatDate(item.dueDate)}
                            </p>
                            {item.nextAction && <p className="mt-2 text-sm">Próxima ação: {item.nextAction}</p>}
                            {item.operationalNotes && <p className="mt-1 text-sm text-muted-foreground">{item.operationalNotes}</p>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Select
                              value={item.status}
                              onValueChange={(value) => updateOccurrence.mutate({ id: item.id, status: value as any })}
                            >
                              <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS).map(([key, cfg]) => (
                                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateOccurrence.mutate({ id: item.id, status: "done" })}
                            >
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Concluir
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markNotApplicable.mutate({ id: item.id })}
                            >
                              Não aplicável
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rotinas cadastradas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {((routinesQuery.data ?? []) as any[]).length === 0 ? (
                <p className="text-sm text-muted-foreground">Cadastre uma rotina para começar.</p>
              ) : (
                ((routinesQuery.data ?? []) as any[]).map((routine) => (
                  <div key={routine.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{routine.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {routine.clientName} · {ROUTINE_TYPES.find((t) => t.value === routine.routineType)?.label ?? routine.routineType}
                        </p>
                      </div>
                      <Badge variant={routine.isActive ? "default" : "secondary"}>
                        {routine.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <GenerateOccurrenceButton routineId={routine.id} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ title, value, icon: Icon, danger = false }: { title: string; value: number; icon: typeof Clock3; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <Icon className={danger ? "h-5 w-5 text-red-600" : "h-5 w-5 text-primary"} />
      </CardContent>
    </Card>
  );
}

function NewClientDialog() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const create = trpc.operationalRoutines.clients.create.useMutation({
    onSuccess: async () => {
      await utils.operationalRoutines.clients.list.invalidate();
      setName("");
      setNotes("");
      setOpen(false);
      toast.success("Cliente criado");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Cliente</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo cliente/setor</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Observação operacional</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          <Button className="w-full" disabled={!name.trim() || create.isPending} onClick={() => create.mutate({ name: name.trim(), notes: notes.trim() || undefined })}>
            {create.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewRoutineDialog({ clients }: { clients: any[] }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [routineType, setRoutineType] = useState<RoutineType>("medicao");
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("5");
  const [dayOfWeek, setDayOfWeek] = useState("5");
  const [generateLeadDays, setGenerateLeadDays] = useState("7");
  const [reminderDays, setReminderDays] = useState("3,1");
  const [checklist, setChecklist] = useState("Conferir informações\nExecutar no sistema oficial\nRegistrar retorno operacional");

  const create = trpc.operationalRoutines.routines.create.useMutation({
    onSuccess: async () => {
      await utils.operationalRoutines.routines.list.invalidate();
      setOpen(false);
      toast.success("Rotina criada");
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = () => {
    create.mutate({
      clientId: Number(clientId),
      title: title.trim(),
      routineType,
      frequency,
      dayOfMonth: frequency === "monthly" ? Number(dayOfMonth) : undefined,
      dayOfWeek: frequency !== "monthly" ? Number(dayOfWeek) : undefined,
      generateLeadDays: Number(generateLeadDays),
      reminderDays: reminderDays.split(",").map((item) => Number(item.trim())).filter((item) => Number.isInteger(item)),
      checklistTemplate: checklist.split("\n").map((item) => item.trim()).filter(Boolean),
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Rotina</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova rotina operacional</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cliente/setor</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex: Medição mensal" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={routineType} onValueChange={(value) => setRoutineType(value as RoutineType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROUTINE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={(value) => setFrequency(value as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="biweekly">Quinzenal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {frequency === "monthly" ? (
              <div className="space-y-1.5">
                <Label>Dia do mês</Label>
                <Input type="number" min={1} max={31} value={dayOfMonth} onChange={(event) => setDayOfMonth(event.target.value)} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Dia da semana</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Segunda</SelectItem>
                    <SelectItem value="2">Terça</SelectItem>
                    <SelectItem value="3">Quarta</SelectItem>
                    <SelectItem value="4">Quinta</SelectItem>
                    <SelectItem value="5">Sexta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Gerar antes</Label>
              <Input type="number" min={0} max={60} value={generateLeadDays} onChange={(event) => setGenerateLeadDays(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Lembretes</Label>
              <Input value={reminderDays} onChange={(event) => setReminderDays(event.target.value)} placeholder="3,1" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Checklist padrão</Label>
            <Textarea rows={4} value={checklist} onChange={(event) => setChecklist(event.target.value)} />
          </div>
          <Button className="w-full" disabled={!clientId || !title.trim() || create.isPending} onClick={submit}>
            {create.isPending ? "Salvando..." : "Salvar rotina"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GenerateOccurrenceButton({ routineId }: { routineId: number }) {
  const utils = trpc.useUtils();
  const generate = trpc.operationalRoutines.occurrences.generateNow.useMutation({
    onSuccess: async (result: any) => {
      await Promise.all([
        utils.operationalRoutines.occurrences.list.invalidate(),
        utils.operationalRoutines.dashboard.summary.invalidate(),
      ]);
      toast.success(result.created ? "Ocorrência gerada" : "Ocorrência já existia para o período");
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Button
      variant="outline"
      size="sm"
      className="mt-3 w-full"
      disabled={generate.isPending}
      onClick={() => generate.mutate({ routineId })}
    >
      {generate.isPending ? "Gerando..." : "Gerar ocorrência agora"}
    </Button>
  );
}
