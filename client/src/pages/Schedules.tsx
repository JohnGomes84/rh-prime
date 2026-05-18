import { useState, useMemo, type ChangeEvent } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays, Plus, Pencil, Copy, Trash2, Check, Loader2,
  Users, Search, X, ChevronDown, ChevronUp, Lock, Upload,
} from "lucide-react";
import { toast } from "sonner";

const BRL = (v: string | number | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(String(v || "0")));

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("pt-BR") : "\u2014";

export default function SchedulesPage() {
  const { canCreate, canEdit, canDelete, canView } = usePermissions();
  const utils = trpc.useUtils();

  // Filtros
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [filterClient, setFilterClient] = useState<string>("");
  const [filterShift, setFilterShift] = useState<string>("");
  const [filterUnit, setFilterUnit] = useState<string>("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [activeTab, setActiveTab] = useState("todos");

  // Dados
  const { data: schedules, isLoading } = trpc.planejamentos.list.useQuery({
    dateStart: dateStart || undefined,
    dateEnd: dateEnd || undefined,
    clientId: filterClient && filterClient !== "all" ? parseInt(filterClient) : undefined,
    shiftId: filterShift && filterShift !== "all" ? parseInt(filterShift) : undefined,
    clientUnitId: filterUnit && filterUnit !== "all" ? parseInt(filterUnit) : undefined,
    employeeSearch: filterEmployee || undefined,
  });
  const { data: formData } = trpc.planejamentos.formData.useQuery();

  // Mutations
  const createMut = trpc.planejamentos.create.useMutation({ onSuccess: () => { utils.planejamentos.list.invalidate(); toast.success("Planejamento criado!"); } });
  const createRecurringMut = trpc.planejamentos.createRecurring.useMutation({ onSuccess: (result) => { utils.planejamentos.list.invalidate(); toast.success(`${result.created} planejamento(s) recorrente(s) criado(s)!`); } });
  const importCsvMut = trpc.planejamentos.importCsv.useMutation({ onSuccess: (result) => { utils.planejamentos.list.invalidate(); toast.success(`Importacao concluida: ${result.imported} criado(s), ${result.skipped} ignorado(s)`); } });
  const updateMut = trpc.planejamentos.update.useMutation({ onSuccess: () => { utils.planejamentos.list.invalidate(); utils.planejamentos.getById.invalidate(); toast.success("Atualizado!"); } });
  const deleteMut = trpc.planejamentos.delete.useMutation({ onSuccess: () => { utils.planejamentos.list.invalidate(); toast.success("Excluído!"); } });
  const duplicateMut = trpc.planejamentos.duplicate.useMutation({ onSuccess: () => { utils.planejamentos.list.invalidate(); toast.success("Duplicado!"); } });
  const validateMut = trpc.planejamentos.validate.useMutation({ onSuccess: () => { utils.planejamentos.list.invalidate(); utils.planejamentos.getById.invalidate(); toast.success("Validado!"); } });
  const addFuncMut = trpc.planejamentos.functions.add.useMutation({ onSuccess: () => utils.planejamentos.getById.invalidate() });
  const removeFuncMut = trpc.planejamentos.functions.remove.useMutation({ onSuccess: () => utils.planejamentos.getById.invalidate() });
  const addAllocMut = trpc.planejamentos.allocations.addBatch.useMutation({ onSuccess: () => utils.planejamentos.getById.invalidate() });
  const updateAllocMut = trpc.planejamentos.allocations.update.useMutation({ onSuccess: () => utils.planejamentos.getById.invalidate() });
  const removeAllocMut = trpc.planejamentos.allocations.remove.useMutation({ onSuccess: () => utils.planejamentos.getById.invalidate() });

  // Modais
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [allocFuncId, setAllocFuncId] = useState<number | null>(null);
  const [allocScheduleId, setAllocScheduleId] = useState<number | null>(null);

  // Form criar
  const [newDate, setNewDate] = useState("");
  const [newShift, setNewShift] = useState<string>("");
  const [newClient, setNewClient] = useState<string>("");
  const [newUnit, setNewUnit] = useState<string>("");
  const [newLeader, setNewLeader] = useState<string>("");
  const [newNotes, setNewNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState("4");
  const [importCsvContent, setImportCsvContent] = useState("");

  const clientIdForCreateUnits = newClient ? parseInt(newClient) : 0;
  const { data: createClientUnits } = trpc.planejamentos.unitsByClient.useQuery(clientIdForCreateUnits, {
    enabled: !!clientIdForCreateUnits,
  });

  // Filtrar por aba
  const filtered = useMemo(() => {
    if (!schedules) return [];
    if (activeTab === "pendentes") return schedules.filter(s => s.status === "pendente");
    if (activeTab === "validados") return schedules.filter(s => s.status === "validado");
    return schedules;
  }, [schedules, activeTab]);

  const handleCreate = async () => {
    if (!newDate || !newClient) { toast.error("Data e Cliente são obrigatórios"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) { toast.error("Data inválida (use AAAA-MM-DD)"); return; }
    if (isRecurring) {
      await createRecurringMut.mutateAsync({
        date: newDate,
        shiftId: newShift ? parseInt(newShift) : undefined,
        clientId: parseInt(newClient),
        clientUnitId: newUnit ? parseInt(newUnit) : undefined,
        leaderId: newLeader ? parseInt(newLeader) : undefined,
        notes: newNotes || undefined,
        recurrence: {
          frequency: recurrenceFrequency,
          occurrences: parseInt(recurrenceOccurrences || "0"),
        },
      });
    } else {
      await createMut.mutateAsync({
        date: newDate,
        shiftId: newShift ? parseInt(newShift) : undefined,
        clientId: parseInt(newClient),
        clientUnitId: newUnit ? parseInt(newUnit) : undefined,
        leaderId: newLeader ? parseInt(newLeader) : undefined,
        notes: newNotes || undefined,
      });
    }
    setCreateOpen(false);
    setNewDate(""); setNewShift(""); setNewClient(""); setNewUnit(""); setNewLeader(""); setNewNotes("");
    setIsRecurring(false); setRecurrenceFrequency("weekly"); setRecurrenceOccurrences("4");
  };

  const handleImportCsv = async () => {
    if (!importCsvContent.trim()) { toast.error("Cole o CSV ou carregue um arquivo"); return; }
    const result = await importCsvMut.mutateAsync({ csvContent: importCsvContent });
    if (result.errors.length > 0) {
      toast.warning(`Importacao concluida com ${result.errors.length} linha(s) com erro`);
    }
    setImportOpen(false);
    setImportCsvContent("");
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportCsvContent(await file.text());
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pendente: { variant: "outline", label: "Pendente" },
      validado: { variant: "default", label: "Validado" },
      cancelado: { variant: "destructive", label: "Cancelado" },
    };
    const cfg = map[s] || map.pendente;
    return <Badge variant={cfg.variant} className={s === "validado" ? "bg-emerald-600 text-white" : ""}>{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold">Planejamentos</h1>
            <p className="text-muted-foreground text-sm">Gerencie os planejamentos e escalas de trabalho</p>
          </div>
        </div>
        {canCreate("schedules") && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5">
              <Upload className="h-4 w-4" /> Importar CSV
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo Planejamento
            </Button>
          </div>
        )}
      </div>

      {/* Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes de Validação</TabsTrigger>
          <TabsTrigger value="validados">Validados</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filtros */}
      <Card className="border-border/50">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Data início</Label>
              <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} min="1900-01-01" max="2200-12-31" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data fim</Label>
              <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} min="1900-01-01" max="2200-12-31" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {formData?.clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Turno</Label>
              <Select value={filterShift} onValueChange={setFilterShift}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Todos os turnos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os turnos</SelectItem>
                  {formData?.shifts.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Funcionário</Label>
              <Input placeholder="Buscar funcionário..." value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className="mt-1" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={() => { setDateStart(""); setDateEnd(""); setFilterClient(""); setFilterShift(""); setFilterUnit(""); setFilterEmployee(""); }}>
                <X className="h-4 w-4 mr-1" /> Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contagem */}
      <div className="text-right text-sm text-muted-foreground">
        {filtered.length} planejamento(s)
      </div>

      {/* Tabela */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Nenhum planejamento encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left p-3 font-medium">Data</th>
                    <th className="text-left p-3 font-medium">Turno</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Cliente</th>
                    <th className="text-center p-3 font-medium">Pessoas</th>
                    <th className="text-right p-3 font-medium">Valor Total</th>
                    <th className="text-right p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{fmtDate(s.date)}</td>
                      <td className="p-3">
                        {s.shiftName !== "\u2014" ? (
                          <span className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{s.shiftName} ({s.shiftTime})</span>
                        ) : "\u2014"}
                      </td>
                      <td className="p-3">{statusBadge(s.status)}</td>
                      <td className="p-3">
                        <div>{s.clientName}</div>
                        {s.unitName && s.unitName !== "\u2014" && <div className="text-xs text-muted-foreground">{"\uD83D\uDCCD"} {s.unitName}</div>}
                      </td>
                      <td className="p-3 text-center">
                        <span className="flex items-center justify-center gap-1"><Users className="h-3.5 w-3.5" /> {s.totalPeople} pessoas</span>
                      </td>
                      <td className="p-3 text-right font-medium">{BRL(s.totalReceiveValue)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit("schedules") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditId(s.id)} title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canCreate("schedules") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateMut.mutate({ scheduleId: s.id })} title="Duplicar">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canDelete("schedules") && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => { if (confirm("Excluir este planejamento?")) deleteMut.mutate(s.id); }} title="Excluir">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle>Novo Planejamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0">
              <Label>Data *</Label>
              <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} min="1900-01-01" max="2200-12-31" className="mt-1" />
            </div>
            <div className="min-w-0">
              <Label>Turno</Label>
              <Select value={newShift} onValueChange={setNewShift}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o turno" /></SelectTrigger>
                <SelectContent>
                  {formData?.shifts.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.startTime} - {s.endTime})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 md:col-span-2">
              <Label>Cliente *</Label>
              <Select value={newClient} onValueChange={(value) => { setNewClient(value); setNewUnit(""); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {formData?.clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="min-w-0">
              <Label>Local</Label>
              <Select value={newUnit} onValueChange={setNewUnit}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o local" /></SelectTrigger>
                <SelectContent>
                  {createClientUnits?.map(unit => <SelectItem key={unit.id} value={String(unit.id)}>{unit.name}</SelectItem>)}
                  {(!createClientUnits || createClientUnits.length === 0) && <SelectItem value="none" disabled>Nenhuma unidade disponivel</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label>Lider</Label>
              <Select value={newLeader} onValueChange={setNewLeader}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o lider" /></SelectTrigger>
                <SelectContent>
                  {formData?.employees.map(employee => <SelectItem key={employee.id} value={String(employee.id)}>{employee.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Observacoes</Label>
            <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} className="mt-1" rows={3} />
          </div>
          <div className="rounded-lg border border-border/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox checked={isRecurring} onCheckedChange={(checked) => setIsRecurring(Boolean(checked))} />
              <Label>Criar como planejamento recorrente</Label>
            </div>
            {isRecurring && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Frequencia</Label>
                  <Select value={recurrenceFrequency} onValueChange={(value: "weekly" | "biweekly" | "monthly") => setRecurrenceFrequency(value)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="biweekly">Quinzenal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ocorrencias</Label>
                  <Input type="number" min={2} max={52} value={recurrenceOccurrences} onChange={e => setRecurrenceOccurrences(e.target.value)} className="mt-1" />
                </div>
              </div>
            )}
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending || createRecurringMut.isPending}>
              {createMut.isPending || createRecurringMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {isRecurring ? "Criar recorrencia" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Importar Planejamentos por CSV</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Use as colunas: <span className="font-mono">data,cliente,turno,unidade,lider,observacoes</span>.
              Cliente e data sao obrigatorios.
            </div>
            <Input type="file" accept=".csv,text/csv" onChange={handleImportFile} />
            <Textarea
              value={importCsvContent}
              onChange={e => setImportCsvContent(e.target.value)}
              rows={12}
              placeholder={"data,cliente,turno,unidade,lider,observacoes\n2026-04-10,Logistica Aurora,MLT-1,Base Sul,Carlos Lima,Operacao especial"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportCsv} disabled={importCsvMut.isPending}>
              {importCsvMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      {editId && <EditScheduleModal id={editId} onClose={() => setEditId(null)} formData={formData} />}

      {/* Modal Alocar */}
      {allocFuncId && allocScheduleId && (
        <AllocateModal
          scheduleFunctionId={allocFuncId}
          scheduleId={allocScheduleId}
          employees={formData?.employees || []}
          onClose={() => { setAllocFuncId(null); setAllocScheduleId(null); }}
        />
      )}
    </div>
  );
}

// ============ MODAL EDITAR PLANEJAMENTO ============
function EditScheduleModal({ id, onClose, formData }: { id: number; onClose: () => void; formData: any }) {
  const { data: schedule, isLoading } = trpc.planejamentos.getById.useQuery(id);
  const utils = trpc.useUtils();
  const updateMut = trpc.planejamentos.update.useMutation({ onSuccess: () => { utils.planejamentos.getById.invalidate(); utils.planejamentos.list.invalidate(); } });
  const validateMut = trpc.planejamentos.validate.useMutation({ onSuccess: () => { utils.planejamentos.getById.invalidate(); utils.planejamentos.list.invalidate(); toast.success("Validado!"); } });
  const addFuncMut = trpc.planejamentos.functions.add.useMutation({ onSuccess: () => utils.planejamentos.getById.invalidate() });
  const removeFuncMut = trpc.planejamentos.functions.remove.useMutation({ onSuccess: () => utils.planejamentos.getById.invalidate() });
  const addAllocMut = trpc.planejamentos.allocations.addBatch.useMutation({ onSuccess: () => utils.planejamentos.getById.invalidate() });
  const updateAllocMut = trpc.planejamentos.allocations.update.useMutation({ onSuccess: () => utils.planejamentos.getById.invalidate() });
  const removeAllocMut = trpc.planejamentos.allocations.remove.useMutation({ onSuccess: () => utils.planejamentos.getById.invalidate() });

  const [editDate, setEditDate] = useState("");
  const [editShift, setEditShift] = useState("");
  const [editClient, setEditClient] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [addFuncOpen, setAddFuncOpen] = useState(false);
  const [newFuncId, setNewFuncId] = useState("");
  const [allocOpen, setAllocOpen] = useState<number | null>(null);

  // Unidades do cliente selecionado
  const clientIdForUnits = editClient ? parseInt(editClient) : schedule?.clientId;
  const { data: clientUnits } = trpc.planejamentos.unitsByClient.useQuery(clientIdForUnits || 0, { enabled: !!clientIdForUnits });

  // Inicializar form quando dados carregam
  useMemo(() => {
    if (schedule) {
      setEditDate(schedule.date ? new Date(schedule.date).toISOString().split("T")[0] : "");
      setEditShift(schedule.shiftId ? String(schedule.shiftId) : "");
      setEditClient(String(schedule.clientId));
      setEditUnit(schedule.clientUnitId ? String(schedule.clientUnitId) : "");
    }
  }, [schedule?.id]);

  const handleUpdate = async () => {
    await updateMut.mutateAsync({
      id,
      date: editDate || undefined,
      shiftId: editShift ? parseInt(editShift) : null,
      clientId: editClient ? parseInt(editClient) : undefined,
      clientUnitId: editUnit ? parseInt(editUnit) : null,
    });
    toast.success("Planejamento atualizado!");
  };

  const handleAddFunction = async () => {
    if (!newFuncId) return;
    await addFuncMut.mutateAsync({ scheduleId: id, jobFunctionId: parseInt(newFuncId) });
    setNewFuncId("");
    setAddFuncOpen(false);
  };

  if (isLoading) return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </DialogContent>
    </Dialog>
  );

  if (!schedule) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Planejamento</DialogTitle></DialogHeader>

        {/* Campos principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Data *</Label>
            <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} min="1900-01-01" max="2200-12-31" className="mt-1" />
          </div>
          <div>
            <Label>Turno</Label>
            <Select value={editShift} onValueChange={setEditShift}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o turno" /></SelectTrigger>
              <SelectContent>
                {formData?.shifts.map((s: any) => <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.startTime} - {s.endTime})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cliente *</Label>
            <Select value={editClient} onValueChange={v => { setEditClient(v); setEditUnit(""); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {formData?.clients.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Local *</Label>
          <Select value={editUnit} onValueChange={setEditUnit}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o local" /></SelectTrigger>
            <SelectContent>
              {clientUnits?.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
              {(!clientUnits || clientUnits.length === 0) && <SelectItem value="none" disabled>Nenhuma unidade cadastrada</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        {/* Funções */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Funções</h3>
            <Button variant="outline" size="sm" onClick={() => setAddFuncOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar Função
            </Button>
          </div>

          {schedule.functions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border/50 rounded-lg">
              Nenhuma função adicionada. Clique em "Adicionar Função" para começar.
            </div>
          ) : (
            <div className="space-y-4">
              {schedule.functions.map((f: any) => (
                <Card key={f.id} className="border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">{f.jobFunctionName}</CardTitle>
                        <Badge variant="secondary">{f.allocatedCount} pessoa(s) alocada(s)</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setAllocOpen(f.id)}>
                          <Plus className="h-3.5 w-3.5" /> Alocar
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => {
                          if (confirm("Remover esta função e todas as alocações?"))
                            removeFuncMut.mutate({ id: f.id, scheduleId: id });
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      $ Paga: {BRL(f.payValue)} &nbsp;&nbsp; Recebe: {BRL(f.receiveValue)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {f.allocations.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-2">Nenhum funcionário alocado.</div>
                    ) : (
                      <div className="space-y-2">
                        {f.allocations.map((a: any) => (
                          <AllocationRow key={a.id} alloc={a} scheduleId={id} onUpdate={updateAllocMut} onRemove={removeAllocMut} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Adicionar Função Dialog */}
        <Dialog open={addFuncOpen} onOpenChange={setAddFuncOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Adicionar Função</DialogTitle></DialogHeader>
            <Select value={newFuncId} onValueChange={setNewFuncId}>
              <SelectTrigger><SelectValue placeholder="Selecione a função" /></SelectTrigger>
              <SelectContent>
                {formData?.jobFunctions.map((jf: any) => (
                  <SelectItem key={jf.id} value={String(jf.id)}>
                    {jf.name} (Paga: {BRL(jf.defaultPayValue)} / Recebe: {BRL(jf.defaultReceiveValue)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddFuncOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddFunction} disabled={addFuncMut.isPending}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Alocar Funcionários Dialog */}
        {allocOpen && (
          <AllocateModal
            scheduleFunctionId={allocOpen}
            scheduleId={id}
            employees={formData?.employees || []}
            onClose={() => setAllocOpen(null)}
          />
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {schedule.status === "pendente" && (
            <Button variant="secondary" onClick={() => validateMut.mutate(id)} disabled={validateMut.isPending} className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Check className="h-4 w-4" /> Validar
            </Button>
          )}
          <Button onClick={handleUpdate} disabled={updateMut.isPending}>
            {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Atualizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ LINHA DE ALOCAÇÃO ============
function AllocationRow({ alloc, scheduleId, onUpdate, onRemove }: { alloc: any; scheduleId: number; onUpdate: any; onRemove: any }) {
  const [pay, setPay] = useState(String(alloc.payValue || "0"));
  const [recv, setRecv] = useState(String(alloc.receiveValue || "0"));
  const [meal, setMeal] = useState(String(alloc.mealAllowance || "0"));
  const [vouch, setVouch] = useState(String(alloc.voucher || "0"));
  const [bonus, setBonus] = useState(String(alloc.bonus || "0"));

  const isPaid = alloc.isPaid;

  const handleBlur = (field: string, value: string) => {
    if (isPaid) return;
    const data: any = { id: alloc.id, scheduleId };
    data[field] = value;
    onUpdate.mutate(data);
  };

  return (
    <div className={`p-3 rounded-lg border ${isPaid ? "border-amber-500/30 bg-amber-500/5" : "border-border/30 bg-muted/20"}`}>
      <div className="flex items-center gap-2 mb-2">
        {isPaid && <Lock className="h-3.5 w-3.5 text-amber-500" />}
        <span className="font-medium text-sm flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {alloc.employeeName}
        </span>
        {isPaid && <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">Lote Pago</Badge>}
        {!isPaid && (
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-red-400" onClick={() => {
            if (confirm("Remover este funcionário?")) onRemove.mutate({ id: alloc.id, scheduleId });
          }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2 text-xs">
        <div>
          <Label className="text-xs text-muted-foreground">Paga:</Label>
          <Input value={pay} onChange={e => setPay(e.target.value)} onBlur={() => handleBlur("payValue", pay)} disabled={isPaid} className="h-7 text-xs mt-0.5" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Recebe:</Label>
          <Input value={recv} onChange={e => setRecv(e.target.value)} onBlur={() => handleBlur("receiveValue", recv)} disabled={isPaid} className="h-7 text-xs mt-0.5" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Marmita:</Label>
          <Input value={meal} onChange={e => setMeal(e.target.value)} onBlur={() => handleBlur("mealAllowance", meal)} disabled={isPaid} className="h-7 text-xs mt-0.5" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Vale:</Label>
          <Input value={vouch} onChange={e => setVouch(e.target.value)} onBlur={() => handleBlur("voucher", vouch)} disabled={isPaid} className="h-7 text-xs mt-0.5" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Bônus:</Label>
          <Input value={bonus} onChange={e => setBonus(e.target.value)} onBlur={() => handleBlur("bonus", bonus)} disabled={isPaid} className="h-7 text-xs mt-0.5" />
        </div>
      </div>
    </div>
  );
}

// ============ MODAL ALOCAR FUNCIONÁRIOS ============
function AllocateModal({ scheduleFunctionId, scheduleId, employees, onClose }: {
  scheduleFunctionId: number; scheduleId: number; employees: any[]; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const utils = trpc.useUtils();
  const addBatchMut = trpc.planejamentos.allocations.addBatch.useMutation({
    onSuccess: (data) => {
      utils.planejamentos.getById.invalidate();
      toast.success(`${data.added} funcionário(s) alocado(s)!`);
      onClose();
    },
    onError: (error) => {
      // Tratamento específico para erro de duplicidade
      if (error.data?.code === "CONFLICT") {
        toast.error(error.message || "Funcionário já alocado em outro planejamento nesta data");
      } else if (error.data?.code === "BAD_REQUEST") {
        toast.error(error.message || "Erro ao alocar funcionários");
      } else {
        toast.error("Erro ao alocar funcionários. Tente novamente.");
      }
    },
  });

  const filtered = useMemo(() => {
    if (!search) return employees;
    const s = search.toLowerCase();
    return employees.filter(e =>
      e.name.toLowerCase().includes(s) || e.cpf?.includes(s) || e.city?.toLowerCase().includes(s)
    );
  }, [employees, search]);

  const toggle = (id: number) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Alocar Funcionários</DialogTitle>
          <p className="text-sm text-muted-foreground">Busque e clique nos funcionários para adicioná-los. ⚠️ Funcionários não podem ser alocados em múltiplos planejamentos no mesmo dia.</p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, cidade ou CPF..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="max-h-[40vh] overflow-y-auto space-y-1 border rounded-lg p-2">
          {filtered.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Nenhum funcionário encontrado.</div>
          ) : (
            filtered.map(e => (
              <div
                key={e.id}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${selected.includes(e.id) ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}
                onClick={() => toggle(e.id)}
              >
                <Checkbox checked={selected.includes(e.id)} />
                <div>
                  <div className="font-medium text-sm">{e.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.cpf && <span>{"\uD83D\uDCC7"} {e.cpf}</span>}
                    {e.city && <span className="ml-2">{"\uD83D\uDCCD"} {e.city}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => addBatchMut.mutate({ scheduleFunctionId, scheduleId, employeeIds: selected })}
            disabled={selected.length === 0 || addBatchMut.isPending}
          >
            {addBatchMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Confirmar ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
