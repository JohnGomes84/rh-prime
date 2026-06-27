import { Fragment, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useRole } from "@/_core/hooks/useRole";
import {
  Loader2, CalendarDays, AlertTriangle, Plus, ChevronDown, ChevronRight, Plane,
} from "lucide-react";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

function diffCalendarDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

type VacationRow = {
  id: number;
  employeeId: number;
  employeeName: string;
  acquisitionStart: string;
  acquisitionEnd: string;
  concessionLimit: string;
  daysEntitled: number;
  daysTaken: number;
  status: string;
};

const STATUS_VARIANT: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  Vencida: "destructive",
  "Em Gozo": "default",
  Concluída: "default",
  Agendada: "outline",
  Pendente: "secondary",
};

function validateRequest(input: {
  daysEntitled: number;
  daysTaken: number;
  existingPeriods: Array<{ days: number }>;
  startDate: string;
  endDate: string;
  days: number;
  abonoDays: number;
}): string[] {
  const errors: string[] = [];
  const remaining = input.daysEntitled - input.daysTaken;
  if (input.days + input.abonoDays > remaining)
    errors.push(`Dias solicitados (${input.days + input.abonoDays}) excedem saldo (${remaining}).`);
  if (input.days < 5)
    errors.push("Mínimo 5 dias corridos por período (CLT Art. 134 §1).");
  if (input.existingPeriods.length + 1 > 3)
    errors.push("Máximo 3 frações por período aquisitivo (CLT Art. 134 §1).");
  const all = [...input.existingPeriods.map((p) => p.days), input.days];
  if (!all.some((d) => d >= 14))
    errors.push("Ao menos 1 período deve ter 14+ dias (CLT Art. 134 §1).");
  const maxAbono = Math.floor(input.daysEntitled / 3);
  if (input.abonoDays > maxAbono)
    errors.push(`Abono máximo: ${maxAbono} dias = 1/3 do direito (CLT Art. 143).`);
  const start = new Date(input.startDate);
  const diffMs = start.getTime() - Date.now();
  if (Math.floor(diffMs / 86400000) < 30)
    errors.push("Início deve ser 30+ dias no futuro (aviso prévio, CLT Art. 135).");
  return errors;
}

export default function Vacations() {
  const { isAdmin, isManager } = useRole();
  const canManage = isAdmin || isManager;

  const vacationsQuery = trpc.vacations.listWithEmployee.useQuery({});
  const overdueQuery = trpc.vacations.overdue.useQuery();
  const upcomingQuery = trpc.vacations.upcoming.useQuery({ daysAhead: 60 });

  const utils = trpc.useUtils();

  const vacations = (vacationsQuery.data ?? []) as VacationRow[];
  const overdue = (overdueQuery.data ?? []) as any[];
  const upcoming = (upcomingQuery.data ?? []) as any[];

  // Expanded rows to show vacation periods
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVacationId, setSelectedVacationId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [abonoEnabled, setAbonoEnabled] = useState(false);
  const [abonoDays, setAbonoDays] = useState(0);
  const [observations, setObservations] = useState("");

  const selectedVacation = vacations.find((v) => String(v.id) === selectedVacationId);
  const days = startDate && endDate ? diffCalendarDays(startDate, endDate) : 0;
  const remaining = selectedVacation ? selectedVacation.daysEntitled - selectedVacation.daysTaken : 0;

  // Fetch existing periods for selected vacation (for fraction validation)
  const periodsQuery = trpc.vacationPeriods.list.useQuery(
    { vacationId: Number(selectedVacationId) },
    { enabled: !!selectedVacationId }
  );
  const existingPeriods = (periodsQuery.data ?? []) as Array<{ days: number }>;

  // CLT validation
  const validationErrors = selectedVacation && days > 0 ? validateRequest({
    daysEntitled: selectedVacation.daysEntitled,
    daysTaken: selectedVacation.daysTaken,
    existingPeriods,
    startDate,
    endDate,
    days,
    abonoDays: abonoEnabled ? abonoDays : 0,
  }) : [];

  const updateVacation = trpc.vacations.update.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const createInboxRequest = trpc.inbox.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitação de férias enviada para aprovação");
      resetDialog();
      utils.vacations.listWithEmployee.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createPeriodDirect = trpc.vacationPeriods.create.useMutation({
    onSuccess: async () => {
      if (selectedVacation) {
        const totalUsed = days + (abonoEnabled ? abonoDays : 0);
        await updateVacation.mutateAsync({
          id: selectedVacation.id,
          data: {
            daysTaken: selectedVacation.daysTaken + totalUsed,
            status: "Agendada",
          },
        });
      }
      toast.success("Férias agendadas com sucesso");
      resetDialog();
      utils.vacations.listWithEmployee.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function resetDialog() {
    setDialogOpen(false);
    setSelectedVacationId("");
    setStartDate("");
    setEndDate("");
    setAbonoEnabled(false);
    setAbonoDays(0);
    setObservations("");
  }

  function handleSubmitRequest() {
    if (!selectedVacation || validationErrors.length > 0) return;
    const effectiveAbono = abonoEnabled ? abonoDays : 0;

    createInboxRequest.mutate({
      kind: "ferias",
      subject: `Férias ${days} dias — ${formatDate(startDate)} a ${formatDate(endDate)}`,
      description: observations || undefined,
      priority: "NORMAL",
      payload: {
        vacationId: selectedVacation.id,
        startDate,
        endDate,
        days,
        abonoDays: effectiveAbono,
        acquisitionStart: selectedVacation.acquisitionStart,
        acquisitionEnd: selectedVacation.acquisitionEnd,
      },
      relatedResourceType: "vacations",
      relatedResourceId: selectedVacation.id,
    });
  }

  function handleDirectSchedule() {
    if (!selectedVacation || validationErrors.length > 0) return;
    const effectiveAbono = abonoEnabled ? abonoDays : 0;

    createPeriodDirect.mutate({
      vacationId: selectedVacation.id,
      employeeId: selectedVacation.employeeId,
      startDate,
      endDate,
      days,
      isPecuniaryAllowance: effectiveAbono > 0,
      pecuniaryDays: effectiveAbono,
      noticeDate: new Date().toISOString().slice(0, 10),
    });
  }

  if (vacationsQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Controle de Férias</h1>
            <p className="text-muted-foreground">
              Gerencie períodos aquisitivos, concessivos e agendamentos conforme a CLT.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {canManage ? "Agendar Férias" : "Solicitar Férias"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-0 shadow-sm border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Férias Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{overdue.length}</p>
              <p className="text-xs text-muted-foreground">Ação imediata necessária</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Vencendo em 60 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{upcoming.length}</p>
              <p className="text-xs text-muted-foreground">Prazo concessivo se aproximando</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                <Plane className="h-4 w-4" /> Agendadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {vacations.filter((v) => v.status === "Agendada").length}
              </p>
              <p className="text-xs text-muted-foreground">Férias futuras confirmadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Main table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Períodos Aquisitivos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {vacations.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum período de férias registrado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Período Aquisitivo</TableHead>
                    <TableHead>Limite Concessivo</TableHead>
                    <TableHead>Direito</TableHead>
                    <TableHead>Gozados</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacations.map((v) => {
                    const saldo = v.daysEntitled - (v.daysTaken || 0);
                    const isExpanded = expanded.has(v.id);
                    return (
                      <Fragment key={v.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpand(v.id)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{v.employeeName}</TableCell>
                          <TableCell>
                            {formatDate(v.acquisitionStart)} a {formatDate(v.acquisitionEnd)}
                          </TableCell>
                          <TableCell>{formatDate(v.concessionLimit)}</TableCell>
                          <TableCell>{v.daysEntitled}</TableCell>
                          <TableCell>{v.daysTaken || 0}</TableCell>
                          <TableCell className="font-semibold">{saldo}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANT[v.status] ?? "secondary"}>
                              {v.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        {isExpanded && <VacationPeriodsRow vacationId={v.id} />}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Solicitar / Agendar Férias */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && resetDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {canManage ? "Agendar Férias" : "Solicitar Férias"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Período aquisitivo</Label>
              <Select value={selectedVacationId} onValueChange={setSelectedVacationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {vacations
                    .filter((v) => v.status === "Pendente" || v.status === "Agendada")
                    .filter((v) => v.daysEntitled - v.daysTaken > 0)
                    .map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.employeeName} — {formatDate(v.acquisitionStart)} a{" "}
                        {formatDate(v.acquisitionEnd)} (saldo: {v.daysEntitled - v.daysTaken}d)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedVacation && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data início</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Data fim</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {days > 0 && (
                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <p>
                      <strong>{days}</strong> dias corridos · Saldo restante após:{" "}
                      <strong>{remaining - days - (abonoEnabled ? abonoDays : 0)}</strong> dias
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={abonoEnabled}
                    onCheckedChange={(v) => {
                      setAbonoEnabled(!!v);
                      if (!v) setAbonoDays(0);
                    }}
                  />
                  <Label>Abono pecuniário (converter dias em dinheiro, Art. 143)</Label>
                </div>

                {abonoEnabled && (
                  <div>
                    <Label>Dias de abono (máx. {Math.floor(selectedVacation.daysEntitled / 3)})</Label>
                    <Input
                      type="number"
                      min={1}
                      max={Math.floor(selectedVacation.daysEntitled / 3)}
                      value={abonoDays}
                      onChange={(e) => setAbonoDays(Number(e.target.value))}
                    />
                  </div>
                )}

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Informações adicionais (opcional)"
                    rows={2}
                  />
                </div>

                {validationErrors.length > 0 && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-1">
                    {validationErrors.map((err, i) => (
                      <p key={i} className="text-destructive flex items-start gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        {err}
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Cancelar
            </Button>
            {canManage ? (
              <Button
                onClick={handleDirectSchedule}
                disabled={
                  !selectedVacation ||
                  days <= 0 ||
                  validationErrors.length > 0 ||
                  createPeriodDirect.isPending
                }
              >
                {createPeriodDirect.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Agendar
              </Button>
            ) : (
              <Button
                onClick={handleSubmitRequest}
                disabled={
                  !selectedVacation ||
                  days <= 0 ||
                  validationErrors.length > 0 ||
                  createInboxRequest.isPending
                }
              >
                {createInboxRequest.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Enviar solicitação
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function VacationPeriodsRow({ vacationId }: { vacationId: number }) {
  const periodsQuery = trpc.vacationPeriods.list.useQuery({ vacationId });
  const periods = (periodsQuery.data ?? []) as unknown as Array<{
    id: number;
    startDate: string | Date;
    endDate: string | Date;
    days: number;
    status: string;
    isPecuniaryAllowance: boolean;
    pecuniaryDays: number;
  }>;

  if (periodsQuery.isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30 py-2 pl-12">
          <Loader2 className="h-4 w-4 animate-spin" />
        </TableCell>
      </TableRow>
    );
  }

  if (periods.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30 py-2 pl-12 text-xs text-muted-foreground">
          Nenhum período de gozo agendado.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {periods.map((p) => (
        <TableRow key={p.id} className="bg-muted/30">
          <TableCell />
          <TableCell colSpan={2} className="text-sm pl-8">
            ↳ {formatDate(p.startDate)} a {formatDate(p.endDate)}
          </TableCell>
          <TableCell className="text-sm">{p.days} dias</TableCell>
          <TableCell className="text-sm">
            {p.isPecuniaryAllowance ? `Abono: ${p.pecuniaryDays}d` : "—"}
          </TableCell>
          <TableCell />
          <TableCell />
          <TableCell>
            <Badge variant="outline" className="text-xs">
              {p.status}
            </Badge>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
