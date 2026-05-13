import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, FileText, Stamp, Clock, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const formatHM = (minutes: number) => {
  const sign = minutes < 0 ? "-" : "";
  const m = Math.abs(minutes);
  return `${sign}${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, "0")}`;
};

export default function JourneyAdmin() {
  const utils = trpc.useUtils();
  const employeesQuery = trpc.employees.list.useQuery({});
  const employees = useMemo(() => {
    const data = employeesQuery.data as any;
    return Array.isArray(data) ? data : data?.data ?? [];
  }, [employeesQuery.data]);

  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));

  // === Espelho ===
  const reportQuery = trpc.timesheet.report.useQuery(
    { employeeId: employeeId ?? 0, startDate, endDate },
    { enabled: !!employeeId }
  );

  // === Bulk approve (PENDING records) ===
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const bulkApprove = trpc.timesheet.bulkApprove.useMutation({
    onSuccess: (r) => {
      toast.success(`${r.updated} registros atualizados`);
      setSelectedIds(new Set());
      utils.timesheet.report.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // === Pré-autorização ===
  const [authForm, setAuthForm] = useState({
    employeeId: 0,
    authorizedDate: today.toISOString().slice(0, 10),
    maxHours: 2,
    type: "50%" as "50%" | "100%" | "NOTURNO",
    reason: "",
  });
  const authsQuery = trpc.timesheet.listAuthorizations.useQuery({});
  const preauthorize = trpc.timesheet.preauthorizeOvertime.useMutation({
    onSuccess: () => {
      toast.success("Horas extras pré-autorizadas");
      utils.timesheet.listAuthorizations.invalidate();
      setAuthForm((f) => ({ ...f, reason: "" }));
    },
    onError: (e) => toast.error(e.message),
  });

  const days = (reportQuery.data?.days ?? []) as any[];
  const totals = reportQuery.data?.totals;
  const pendingDays = days.filter((d: any) => d.status === "PENDING");

  const toggleSelect = (id: number) => {
    setSelectedIds((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  };

  const selectAllPending = () => {
    setSelectedIds(new Set(pendingDays.map((d: any) => d.id)));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Stamp className="h-6 w-6" /> Jornada — Admin
          </h1>
          <p className="text-muted-foreground mt-1">Espelho de ponto, aprovação em massa e pré-autorização de horas extras.</p>
        </div>

        <Tabs defaultValue="espelho" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="espelho" className="gap-1"><FileText className="h-4 w-4" />Espelho</TabsTrigger>
            <TabsTrigger value="aprovacao" className="gap-1"><CheckCircle2 className="h-4 w-4" />Aprovação</TabsTrigger>
            <TabsTrigger value="autorizacao" className="gap-1"><Clock className="h-4 w-4" />Pré-autorização</TabsTrigger>
          </TabsList>

          {/* ESPELHO */}
          <TabsContent value="espelho" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filtros</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Funcionário</Label>
                  <Select value={employeeId ? String(employeeId) : ""} onValueChange={(v) => setEmployeeId(Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>De</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Até</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {employeeId && totals && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Stat label="Esperado" value={formatHM(totals.expectedMinutes)} />
                <Stat label="Trabalhado" value={formatHM(totals.workedMinutes)} highlight={totals.workedMinutes >= totals.expectedMinutes} />
                <Stat label="Atraso" value={formatHM(totals.delayMinutes)} danger={totals.delayMinutes > 0} />
                <Stat label="Horas extras" value={formatHM(totals.overtimeMinutes)} highlight={totals.overtimeMinutes > 0} />
                <Stat label="Banco horas" value={formatHM(totals.hourBankBalance)} />
              </div>
            )}

            {employeeId && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Registros</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>Imprimir / PDF</Button>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Data</th>
                        <th className="text-left p-2">Entrada</th>
                        <th className="text-left p-2">Saída</th>
                        <th className="text-left p-2">Esperado</th>
                        <th className="text-left p-2">Trabalhado</th>
                        <th className="text-left p-2">Atraso</th>
                        <th className="text-left p-2">HE</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((d: any) => (
                        <tr key={d.id} className="border-t">
                          <td className="p-2">{d.date}</td>
                          <td className="p-2">{d.clockIn ? new Date(d.clockIn).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                          <td className="p-2">{d.clockOut ? new Date(d.clockOut).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                          <td className="p-2">{d.evaluation ? formatHM(d.evaluation.expectedMinutes) : "—"}</td>
                          <td className="p-2">{d.evaluation ? formatHM(d.evaluation.workedMinutes) : "—"}</td>
                          <td className="p-2">{d.evaluation && d.evaluation.delayMinutes > 0 ? <span className="text-amber-600">{formatHM(d.evaluation.delayMinutes)}</span> : "—"}</td>
                          <td className="p-2">{d.evaluation && d.evaluation.overtime.total > 0 ? <span className="text-emerald-600">{formatHM(d.evaluation.overtime.total)}</span> : "—"}</td>
                          <td className="p-2"><Badge variant="outline">{d.status}</Badge></td>
                        </tr>
                      ))}
                      {days.length === 0 && (
                        <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Nenhum registro no período.</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* APROVAÇÃO EM MASSA */}
          <TabsContent value="aprovacao" className="space-y-4">
            {!employeeId ? (
              <Card><CardContent className="py-6 text-center text-muted-foreground">Selecione um funcionário na aba Espelho.</CardContent></Card>
            ) : pendingDays.length === 0 ? (
              <Card><CardContent className="py-6 text-center text-muted-foreground">Nenhum registro pendente neste período.</CardContent></Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Pendentes ({pendingDays.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={selectAllPending}>Selecionar todos</Button>
                    <Button
                      size="sm"
                      disabled={selectedIds.size === 0 || bulkApprove.isPending}
                      onClick={() => bulkApprove.mutate({ ids: Array.from(selectedIds), status: "APPROVED" })}
                    >
                      {bulkApprove.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Aprovar {selectedIds.size}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={selectedIds.size === 0 || bulkApprove.isPending}
                      onClick={() => bulkApprove.mutate({ ids: Array.from(selectedIds), status: "REJECTED" })}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar {selectedIds.size}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2"><input type="checkbox" checked={selectedIds.size === pendingDays.length} onChange={(e) => e.target.checked ? selectAllPending() : setSelectedIds(new Set())} /></th>
                        <th className="text-left p-2">Data</th>
                        <th className="text-left p-2">Entrada</th>
                        <th className="text-left p-2">Saída</th>
                        <th className="text-left p-2">Atraso</th>
                        <th className="text-left p-2">HE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDays.map((d: any) => (
                        <tr key={d.id} className="border-t">
                          <td className="p-2"><input type="checkbox" checked={selectedIds.has(d.id)} onChange={() => toggleSelect(d.id)} /></td>
                          <td className="p-2">{d.date}</td>
                          <td className="p-2">{new Date(d.clockIn).toLocaleTimeString("pt-BR")}</td>
                          <td className="p-2">{d.clockOut ? new Date(d.clockOut).toLocaleTimeString("pt-BR") : "—"}</td>
                          <td className="p-2">{d.evaluation && d.evaluation.delayMinutes > 0 ? formatHM(d.evaluation.delayMinutes) : "—"}</td>
                          <td className="p-2">{d.evaluation && d.evaluation.overtime.total > 0 ? formatHM(d.evaluation.overtime.total) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PRÉ-AUTORIZAÇÃO */}
          <TabsContent value="autorizacao" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Pré-autorizar horas extras</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Funcionário</Label>
                    <Select value={authForm.employeeId ? String(authForm.employeeId) : ""} onValueChange={(v) => setAuthForm({ ...authForm, employeeId: Number(v) })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((e: any) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data</Label>
                    <Input type="date" value={authForm.authorizedDate} onChange={(e) => setAuthForm({ ...authForm, authorizedDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Horas máximas</Label>
                    <Input type="number" step="0.5" min={0.5} max={24} value={authForm.maxHours} onChange={(e) => setAuthForm({ ...authForm, maxHours: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={authForm.type} onValueChange={(v) => setAuthForm({ ...authForm, type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50%">50% (diurno comum)</SelectItem>
                        <SelectItem value="100%">100% (domingo/feriado)</SelectItem>
                        <SelectItem value="NOTURNO">Noturno (20%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Motivo</Label>
                  <Input value={authForm.reason} onChange={(e) => setAuthForm({ ...authForm, reason: e.target.value })} placeholder="Ex: pico de demanda fechamento mensal" />
                </div>
                <Button
                  disabled={!authForm.employeeId || preauthorize.isPending}
                  onClick={() => preauthorize.mutate({
                    employeeId: authForm.employeeId,
                    authorizedDate: authForm.authorizedDate,
                    maxHours: authForm.maxHours,
                    type: authForm.type,
                    reason: authForm.reason || undefined,
                  })}
                >
                  {preauthorize.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Pré-autorizar
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Autorizações ativas</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2">Funcionário</th>
                      <th className="text-left p-2">Data</th>
                      <th className="text-left p-2">Horas</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(authsQuery.data ?? []).map((a: any) => {
                      const emp = employees.find((e: any) => e.id === a.employeeId);
                      return (
                        <tr key={a.id} className="border-t">
                          <td className="p-2">{emp?.fullName ?? `#${a.employeeId}`}</td>
                          <td className="p-2">{new Date(a.authorizedDate).toLocaleDateString("pt-BR")}</td>
                          <td className="p-2">{a.maxHours}h</td>
                          <td className="p-2">{a.type}</td>
                          <td className="p-2">{a.consumed ? <Badge variant="outline">Consumida</Badge> : <Badge>Ativa</Badge>}</td>
                          <td className="p-2 text-muted-foreground">{a.reason ?? "—"}</td>
                        </tr>
                      );
                    })}
                    {(authsQuery.data ?? []).length === 0 && (
                      <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma autorização cadastrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? "bg-emerald-50 border-emerald-200" : danger ? "bg-amber-50 border-amber-200" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${highlight ? "text-emerald-700" : danger ? "text-amber-700" : ""}`}>{value}</p>
    </div>
  );
}
