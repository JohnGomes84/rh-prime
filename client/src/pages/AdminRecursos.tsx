import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { usePersistedState } from "@/hooks/usePersistedState";
import { Plus, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

const HOLIDAY_SORTS = ["data-recente", "data-antiga", "nome"] as const;
const DEPENDENT_SORTS = ["nome", "parentesco"] as const;
const LOAN_SORTS = ["ativos-primeiro", "mais-recentes", "mais-antigos"] as const;

function EmptyState({ label }: { label: string }) {
  return <p className="py-6 text-sm text-muted-foreground">Nenhum registro de {label} encontrado.</p>;
}

function MetricCards({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="text-2xl font-bold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function parseMoney(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function toggleSelection(current: number[], id: number) {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

export default function AdminRecursos() {
  const [activeTab, setActiveTab] = usePersistedState("admin-recursos:tab", "employeePositions");
  const [employeeId, setEmployeeId] = usePersistedState("admin-recursos:employee-id", "1");
  const [vacationId, setVacationId] = usePersistedState("admin-recursos:vacation-id", "1");
  const [resourceSearch, setResourceSearch] = usePersistedState("admin-recursos:search", "");
  const [holidaySort, setHolidaySort] = usePersistedState<(typeof HOLIDAY_SORTS)[number]>("admin-recursos:holiday-sort", "data-recente");
  const [dependentSort, setDependentSort] = usePersistedState<(typeof DEPENDENT_SORTS)[number]>("admin-recursos:dependent-sort", "nome");
  const [loanSort, setLoanSort] = usePersistedState<(typeof LOAN_SORTS)[number]>("admin-recursos:loan-sort", "ativos-primeiro");
  const [selectedHolidayIds, setSelectedHolidayIds] = useState<number[]>([]);
  const [selectedDependentIds, setSelectedDependentIds] = useState<number[]>([]);
  const [selectedLoanIds, setSelectedLoanIds] = useState<number[]>([]);
  const [benefitForm, setBenefitForm] = useState({
    benefitType: "Vale Transporte",
    provider: "",
    value: "",
    employeeContribution: "",
    startDate: new Date().toISOString().slice(0, 10),
    observations: "",
  });
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "Medico",
    startDate: new Date().toISOString().slice(0, 10),
    expectedReturnDate: "",
    observations: "",
  });
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    date: new Date().toISOString().slice(0, 10),
    type: "Nacional",
    recurring: false,
  });
  const [dependentForm, setDependentForm] = useState({
    name: "",
    relationship: "Filho(a)",
    birthDate: "",
    cpf: "",
  });
  const [absenceForm, setAbsenceForm] = useState({
    absenceDate: new Date().toISOString().slice(0, 10),
    justified: false,
    reason: "",
  });
  const [loanForm, setLoanForm] = useState({
    equipmentId: "",
    loanDate: new Date().toISOString().slice(0, 10),
    conditionAtLoan: "",
  });

  const employeeNumber = Number(employeeId);
  const vacationNumber = Number(vacationId);
  const utils = trpc.useUtils();

  const { data: employees = [] } = trpc.employees.list.useQuery({});
  const { data: positions = [] } = trpc.positions.list.useQuery();
  const employeePositions = trpc.employeePositions.list.useQuery({ employeeId: employeeNumber }, { enabled: !!employeeNumber });
  const vacationPeriods = trpc.vacationPeriods.list.useQuery({ vacationId: vacationNumber }, { enabled: !!vacationNumber });
  const leaves = trpc.leaves.list.useQuery({ employeeId: employeeNumber });
  const benefits = trpc.benefits.list.useQuery({ employeeId: employeeNumber });
  const equipment = trpc.equipment.list.useQuery();
  const equipmentLoans = trpc.equipmentLoans.list.useQuery({ employeeId: employeeNumber });
  const holidays = trpc.holidays.list.useQuery();
  const dependents = trpc.dependents.list.useQuery({ employeeId: employeeNumber }, { enabled: !!employeeNumber });
  const absences = trpc.absences.list.useQuery({ employeeId: employeeNumber }, { enabled: !!employeeNumber });

  const refreshSelected = async () => {
    await Promise.all([
      utils.leaves.list.invalidate(),
      utils.benefits.list.invalidate(),
      utils.holidays.list.invalidate(),
      utils.dependents.list.invalidate(),
      utils.absences.list.invalidate(),
      utils.equipmentLoans.list.invalidate(),
      utils.equipment.list.invalidate(),
    ]);
  };

  const createBenefit = trpc.benefits.create.useMutation({
    onSuccess: async () => {
      await refreshSelected();
      toast.success("Beneficio cadastrado.");
      setBenefitForm((current) => ({ ...current, provider: "", value: "", employeeContribution: "", observations: "" }));
    },
    onError: (error) => toast.error(error.message),
  });
  const createLeave = trpc.leaves.create.useMutation({
    onSuccess: async () => {
      await refreshSelected();
      toast.success("Licenca registrada.");
      setLeaveForm((current) => ({ ...current, expectedReturnDate: "", observations: "" }));
    },
    onError: (error) => toast.error(error.message),
  });
  const createHoliday = trpc.holidays.create.useMutation({
    onSuccess: async () => {
      await refreshSelected();
      toast.success("Feriado cadastrado.");
      setHolidayForm({ name: "", date: new Date().toISOString().slice(0, 10), type: "Nacional", recurring: false });
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteHoliday = trpc.holidays.delete.useMutation({
    onSuccess: async () => {
      await refreshSelected();
    },
    onError: (error) => toast.error(error.message),
  });
  const createDependent = trpc.dependents.create.useMutation({
    onSuccess: async () => {
      await refreshSelected();
      toast.success("Dependente cadastrado.");
      setDependentForm({ name: "", relationship: "Filho(a)", birthDate: "", cpf: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteDependent = trpc.dependents.delete.useMutation({
    onSuccess: async () => {
      await refreshSelected();
    },
    onError: (error) => toast.error(error.message),
  });
  const createAbsence = trpc.absences.create.useMutation({
    onSuccess: async () => {
      await refreshSelected();
      toast.success("Ausencia registrada.");
      setAbsenceForm({ absenceDate: new Date().toISOString().slice(0, 10), justified: false, reason: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const createLoan = trpc.equipmentLoans.create.useMutation({
    onSuccess: async () => {
      await refreshSelected();
      toast.success("Emprestimo registrado.");
      setLoanForm({ equipmentId: "", loanDate: new Date().toISOString().slice(0, 10), conditionAtLoan: "" });
    },
    onError: (error) => toast.error(error.message),
  });
  const returnLoan = trpc.equipmentLoans.return.useMutation({
    onSuccess: async () => {
      await refreshSelected();
    },
    onError: (error) => toast.error(error.message),
  });

  const employeeName = employees.find((employee: any) => employee.id === employeeNumber)?.fullName ?? `#${employeeId}`;
  const normalizedSearch = resourceSearch.toLowerCase();
  const availableEquipment = (equipment.data ?? []).filter((item: any) => item.status === "Disponivel" || item.status === "Disponível");
  const benefitValue = parseMoney(benefitForm.value);
  const benefitContributionValue = parseMoney(benefitForm.employeeContribution);

  const benefitErrors = useMemo(() => {
    const errors: string[] = [];
    if (benefitValue === null || Number.isNaN(benefitValue) || benefitValue <= 0) errors.push("Informe um valor de beneficio valido.");
    if (benefitContributionValue !== null && (Number.isNaN(benefitContributionValue) || benefitContributionValue < 0)) {
      errors.push("Contribuicao deve ser zero ou positiva.");
    }
    if (!benefitForm.startDate) errors.push("Informe a data inicial do beneficio.");
    return errors;
  }, [benefitContributionValue, benefitForm.startDate, benefitValue]);

  const leaveErrors = useMemo(() => {
    const errors: string[] = [];
    if (!leaveForm.startDate) errors.push("Informe a data inicial da licenca.");
    if (leaveForm.expectedReturnDate && leaveForm.expectedReturnDate < leaveForm.startDate) {
      errors.push("Retorno previsto nao pode ser anterior ao inicio.");
    }
    return errors;
  }, [leaveForm.expectedReturnDate, leaveForm.startDate]);

  const holidayErrors = useMemo(() => {
    const errors: string[] = [];
    if (!holidayForm.name.trim()) errors.push("Informe o nome do feriado.");
    if (!holidayForm.date) errors.push("Informe a data do feriado.");
    return errors;
  }, [holidayForm.date, holidayForm.name]);

  const dependentErrors = useMemo(() => {
    const errors: string[] = [];
    if (!dependentForm.name.trim()) errors.push("Informe o nome do dependente.");
    if (dependentForm.cpf && dependentForm.cpf.replace(/\D/g, "").length !== 11) {
      errors.push("CPF do dependente deve ter 11 digitos.");
    }
    return errors;
  }, [dependentForm.cpf, dependentForm.name]);

  const absenceErrors = useMemo(() => {
    const errors: string[] = [];
    if (!absenceForm.absenceDate) errors.push("Informe a data da ausencia.");
    if (!absenceForm.reason.trim()) errors.push("Informe o motivo da ausencia.");
    return errors;
  }, [absenceForm.absenceDate, absenceForm.reason]);

  const loanErrors = useMemo(() => {
    const errors: string[] = [];
    if (!loanForm.equipmentId) errors.push("Selecione um equipamento.");
    if (!loanForm.loanDate) errors.push("Informe a data do emprestimo.");
    if (!loanForm.conditionAtLoan.trim()) errors.push("Descreva a condicao do equipamento na retirada.");
    return errors;
  }, [loanForm.conditionAtLoan, loanForm.equipmentId, loanForm.loanDate]);

  const filteredLeaves = (leaves.data ?? []).filter((item: any) => [item.leaveType, item.status].join(" ").toLowerCase().includes(normalizedSearch));
  const filteredBenefits = (benefits.data ?? []).filter((item: any) => [item.benefitType, item.provider, item.planName].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch));
  const filteredEquipment = (equipment.data ?? []).filter((item: any) => [item.equipmentType, item.brand, item.model, item.patrimonyCode, item.status].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch));
  const filteredLoans = (equipmentLoans.data ?? []).filter((item: any) => {
    const equipmentItem = (equipment.data ?? []).find((equipmentValue: any) => equipmentValue.id === item.equipmentId);
    return [equipmentItem?.equipmentType, equipmentItem?.patrimonyCode, item.status].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch);
  });
  const filteredHolidays = (holidays.data ?? []).filter((item: any) => [item.name, item.type].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch));
  const filteredDependents = (dependents.data ?? []).filter((item: any) => [item.name, item.relationship, item.cpf].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch));
  const filteredAbsences = (absences.data ?? []).filter((item: any) => [item.reason, item.justified ? "justificada" : "nao justificada"].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch));

  const sortedHolidays = useMemo(() => {
    return filteredHolidays.slice().sort((a: any, b: any) => {
      if (holidaySort === "data-antiga") return +new Date(a.date) - +new Date(b.date);
      if (holidaySort === "nome") return a.name.localeCompare(b.name);
      return +new Date(b.date) - +new Date(a.date);
    });
  }, [filteredHolidays, holidaySort]);

  const sortedDependents = useMemo(() => {
    return filteredDependents.slice().sort((a: any, b: any) => {
      if (dependentSort === "parentesco") return (a.relationship ?? "").localeCompare(b.relationship ?? "");
      return a.name.localeCompare(b.name);
    });
  }, [dependentSort, filteredDependents]);

  const sortedLoans = useMemo(() => {
    return filteredLoans.slice().sort((a: any, b: any) => {
      if (loanSort === "mais-antigos") return +new Date(a.loanDate) - +new Date(b.loanDate);
      if (loanSort === "mais-recentes") return +new Date(b.loanDate) - +new Date(a.loanDate);
      const aActive = a.status === "Ativo" ? 1 : 0;
      const bActive = b.status === "Ativo" ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return +new Date(b.loanDate) - +new Date(a.loanDate);
    });
  }, [filteredLoans, loanSort]);

  useEffect(() => {
    setSelectedHolidayIds([]);
    setSelectedDependentIds([]);
    setSelectedLoanIds([]);
  }, [employeeId, resourceSearch]);

  const handleBatchHolidayDelete = async () => {
    if (selectedHolidayIds.length === 0) return;
    await Promise.all(selectedHolidayIds.map((id) => deleteHoliday.mutateAsync({ id })));
    toast.success(`${selectedHolidayIds.length} feriado(s) removido(s).`);
    setSelectedHolidayIds([]);
  };

  const handleBatchDependentDelete = async () => {
    if (selectedDependentIds.length === 0) return;
    await Promise.all(selectedDependentIds.map((id) => deleteDependent.mutateAsync({ id })));
    toast.success(`${selectedDependentIds.length} dependente(s) removido(s).`);
    setSelectedDependentIds([]);
  };

  const handleBatchLoanReturn = async () => {
    const activeSelected = sortedLoans.filter((item: any) => selectedLoanIds.includes(item.id) && item.status === "Ativo");
    if (activeSelected.length === 0) return;
    await Promise.all(
      activeSelected.map((item: any) =>
        returnLoan.mutateAsync({
          id: item.id,
          equipmentId: item.equipmentId,
          returnDate: new Date().toISOString().slice(0, 10),
        })
      )
    );
    toast.success(`${activeSelected.length} emprestimo(s) devolvido(s).`);
    setSelectedLoanIds([]);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Recursos do sistema</h1>
          <p className="text-muted-foreground mt-2">
            Operacao dos modulos auxiliares com contexto persistido, ordenacao e acoes em lote.
          </p>
        </div>

        <MetricCards
          items={[
            { label: "Cargos no historico", value: employeePositions.data?.length ?? 0 },
            { label: "Beneficios ativos", value: benefits.data?.length ?? 0 },
            { label: "Emprestimos ativos", value: equipmentLoans.data?.filter((item: any) => item.status === "Ativo").length ?? 0 },
          ]}
        />

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1.2fr]">
          <div className="space-y-2">
            <Label htmlFor="employeeId">Funcionario base</Label>
            <Input id="employeeId" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} />
            <p className="text-xs text-muted-foreground">Fluxos abaixo serao aplicados a {employeeName}.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vacationId">Periodo aquisitivo base</Label>
            <Input id="vacationId" value={vacationId} onChange={(event) => setVacationId(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Busca operacional</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={resourceSearch} onChange={(event) => setResourceSearch(event.target.value)} className="pl-10" placeholder="Filtrar tabelas por nome, status ou motivo" />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="employeePositions">Cargos</TabsTrigger>
            <TabsTrigger value="vacationPeriods">Ferias</TabsTrigger>
            <TabsTrigger value="leaves">Licencas</TabsTrigger>
            <TabsTrigger value="benefits">Beneficios</TabsTrigger>
            <TabsTrigger value="equipment">Equipamentos</TabsTrigger>
            <TabsTrigger value="equipmentLoans">Emprestimos</TabsTrigger>
            <TabsTrigger value="holidays">Feriados</TabsTrigger>
            <TabsTrigger value="dependents">Dependentes</TabsTrigger>
            <TabsTrigger value="absences">Ausencias</TabsTrigger>
          </TabsList>

          <TabsContent value="employeePositions">
            <Card><CardHeader><CardTitle>Historico de cargos</CardTitle></CardHeader><CardContent>
              {!employeePositions.data?.length ? <EmptyState label="cargos" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Cargo</TableHead><TableHead>Salario</TableHead><TableHead>Inicio</TableHead><TableHead>Fim</TableHead></TableRow></TableHeader>
                  <TableBody>{employeePositions.data.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{positions.find((position: any) => position.id === item.positionId)?.title ?? item.positionId}</TableCell>
                      <TableCell>{item.salary}</TableCell>
                      <TableCell>{new Date(item.startDate).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>{item.endDate ? new Date(item.endDate).toLocaleDateString("pt-BR") : "-"}</TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="vacationPeriods">
            <Card><CardHeader><CardTitle>Periodos de ferias</CardTitle></CardHeader><CardContent>
              {!vacationPeriods.data?.length ? <EmptyState label="periodos de ferias" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Inicio</TableHead><TableHead>Fim</TableHead><TableHead>Dias</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>{vacationPeriods.data.map((item: any) => (
                    <TableRow key={item.id}><TableCell>{new Date(item.startDate).toLocaleDateString("pt-BR")}</TableCell><TableCell>{new Date(item.endDate).toLocaleDateString("pt-BR")}</TableCell><TableCell>{item.days}</TableCell><TableCell><Badge variant="outline">{item.status}</Badge></TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="leaves">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Licencas e afastamentos</CardTitle>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Nova licenca</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Registrar licenca</DialogTitle><DialogDescription>Lanca um afastamento para o funcionario base.</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={leaveForm.leaveType} onValueChange={(value) => setLeaveForm((current) => ({ ...current, leaveType: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{["Medico", "INSS", "Maternidade", "Paternidade", "Acidente de Trabalho", "Outros"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2"><Label>Inicio</Label><Input type="date" value={leaveForm.startDate} onChange={(event) => setLeaveForm((current) => ({ ...current, startDate: event.target.value }))} /></div>
                        <div className="space-y-2"><Label>Retorno previsto</Label><Input type="date" value={leaveForm.expectedReturnDate} onChange={(event) => setLeaveForm((current) => ({ ...current, expectedReturnDate: event.target.value }))} /></div>
                      </div>
                      <div className="space-y-2"><Label>Observacoes</Label><Textarea value={leaveForm.observations} onChange={(event) => setLeaveForm((current) => ({ ...current, observations: event.target.value }))} /></div>
                      {leaveErrors.length > 0 && <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{leaveErrors[0]}</div>}
                      <Button onClick={() => createLeave.mutate({ employeeId: employeeNumber, leaveType: leaveForm.leaveType as any, startDate: leaveForm.startDate, expectedReturnDate: leaveForm.expectedReturnDate || undefined, observations: leaveForm.observations || undefined })} disabled={createLeave.isPending || leaveErrors.length > 0}>{createLeave.isPending ? "Salvando..." : "Salvar licenca"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!filteredLeaves.length ? <EmptyState label="licencas" /> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Inicio</TableHead><TableHead>Retorno</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>{filteredLeaves.map((item: any) => (
                      <TableRow key={item.id}><TableCell>{item.leaveType}</TableCell><TableCell>{new Date(item.startDate).toLocaleDateString("pt-BR")}</TableCell><TableCell>{item.expectedReturnDate ? new Date(item.expectedReturnDate).toLocaleDateString("pt-BR") : "-"}</TableCell><TableCell><Badge>{item.status}</Badge></TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benefits">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Beneficios</CardTitle>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Novo beneficio</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Cadastrar beneficio</DialogTitle><DialogDescription>Vincula um beneficio ao funcionario base.</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={benefitForm.benefitType} onValueChange={(value) => setBenefitForm((current) => ({ ...current, benefitType: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{["Vale Transporte", "Vale Alimentacao", "Vale Refeicao", "Plano de Saude", "Plano Odontologico", "Seguro de Vida", "Outros"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2"><Label>Fornecedor</Label><Input value={benefitForm.provider} onChange={(event) => setBenefitForm((current) => ({ ...current, provider: event.target.value }))} /></div>
                        <div className="space-y-2"><Label>Inicio</Label><Input type="date" value={benefitForm.startDate} onChange={(event) => setBenefitForm((current) => ({ ...current, startDate: event.target.value }))} /></div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2"><Label>Valor</Label><Input value={benefitForm.value} onChange={(event) => setBenefitForm((current) => ({ ...current, value: event.target.value }))} /></div>
                        <div className="space-y-2"><Label>Contribuicao</Label><Input value={benefitForm.employeeContribution} onChange={(event) => setBenefitForm((current) => ({ ...current, employeeContribution: event.target.value }))} /></div>
                      </div>
                      <div className="space-y-2"><Label>Observacoes</Label><Textarea value={benefitForm.observations} onChange={(event) => setBenefitForm((current) => ({ ...current, observations: event.target.value }))} /></div>
                      {benefitErrors.length > 0 && <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{benefitErrors[0]}</div>}
                      <Button onClick={() => createBenefit.mutate({ employeeId: employeeNumber, benefitType: benefitForm.benefitType as any, provider: benefitForm.provider.trim() || undefined, value: String(benefitValue), employeeContribution: benefitContributionValue === null ? undefined : String(benefitContributionValue), startDate: benefitForm.startDate, observations: benefitForm.observations.trim() || undefined })} disabled={createBenefit.isPending || benefitErrors.length > 0}>{createBenefit.isPending ? "Salvando..." : "Salvar beneficio"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!filteredBenefits.length ? <EmptyState label="beneficios" /> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Fornecedor</TableHead><TableHead>Valor</TableHead><TableHead>Contribuicao</TableHead></TableRow></TableHeader>
                    <TableBody>{filteredBenefits.map((item: any) => (
                      <TableRow key={item.id}><TableCell>{item.benefitType}</TableCell><TableCell>{item.provider || "-"}</TableCell><TableCell>{item.value || "-"}</TableCell><TableCell>{item.employeeContribution || "-"}</TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment">
            <Card><CardHeader><CardTitle>Equipamentos</CardTitle></CardHeader><CardContent>
              {!filteredEquipment.length ? <EmptyState label="equipamentos" /> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Marca/Modelo</TableHead><TableHead>Patrimonio</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>{filteredEquipment.map((item: any) => (
                    <TableRow key={item.id}><TableCell>{item.equipmentType}</TableCell><TableCell>{[item.brand, item.model].filter(Boolean).join(" / ") || "-"}</TableCell><TableCell>{item.patrimonyCode || "-"}</TableCell><TableCell><Badge variant="outline">{item.status}</Badge></TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="equipmentLoans">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-2">
                  <CardTitle>Emprestimos de equipamentos</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={loanSort} onValueChange={(value: (typeof LOAN_SORTS)[number]) => setLoanSort(value)}>
                      <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativos-primeiro">Ativos primeiro</SelectItem>
                        <SelectItem value="mais-recentes">Mais recentes</SelectItem>
                        <SelectItem value="mais-antigos">Mais antigos</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setSelectedLoanIds(sortedLoans.filter((item: any) => item.status === "Ativo").map((item: any) => item.id))}>
                      Selecionar ativos
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBatchLoanReturn} disabled={selectedLoanIds.length === 0 || returnLoan.isPending}>
                      Devolver selecionados
                    </Button>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Novo emprestimo</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Registrar emprestimo</DialogTitle><DialogDescription>Empresta um equipamento disponivel ao funcionario base.</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Equipamento</Label>
                        <Select value={loanForm.equipmentId} onValueChange={(value) => setLoanForm((current) => ({ ...current, equipmentId: value }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {availableEquipment.map((item: any) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.equipmentType} {item.patrimonyCode ? `(${item.patrimonyCode})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2"><Label>Data</Label><Input type="date" value={loanForm.loanDate} onChange={(event) => setLoanForm((current) => ({ ...current, loanDate: event.target.value }))} /></div>
                        <div className="space-y-2"><Label>Condicao na retirada</Label><Input value={loanForm.conditionAtLoan} onChange={(event) => setLoanForm((current) => ({ ...current, conditionAtLoan: event.target.value }))} /></div>
                      </div>
                      {loanErrors.length > 0 && <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{loanErrors[0]}</div>}
                      <Button onClick={() => createLoan.mutate({ equipmentId: Number(loanForm.equipmentId), employeeId: employeeNumber, loanDate: loanForm.loanDate, conditionAtLoan: loanForm.conditionAtLoan.trim() || undefined })} disabled={createLoan.isPending || loanErrors.length > 0}>{createLoan.isPending ? "Salvando..." : "Salvar emprestimo"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!sortedLoans.length ? <EmptyState label="emprestimos" /> : (
                  <Table>
                    <TableHeader><TableRow><TableHead></TableHead><TableHead>Equipamento</TableHead><TableHead>Emprestimo</TableHead><TableHead>Devolucao</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>{sortedLoans.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell><Checkbox checked={selectedLoanIds.includes(item.id)} onCheckedChange={() => setSelectedLoanIds((current) => toggleSelection(current, item.id))} /></TableCell>
                        <TableCell>{(equipment.data ?? []).find((equipmentItem: any) => equipmentItem.id === item.equipmentId)?.equipmentType ?? item.equipmentId}</TableCell>
                        <TableCell>{new Date(item.loanDate).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>{item.returnDate ? new Date(item.returnDate).toLocaleDateString("pt-BR") : "-"}</TableCell>
                        <TableCell><Badge>{item.status}</Badge></TableCell>
                        <TableCell>
                          {item.status === "Ativo" && (
                            <Button size="sm" variant="outline" className="gap-2" onClick={() => returnLoan.mutate({ id: item.id, equipmentId: item.equipmentId, returnDate: new Date().toISOString().slice(0, 10) })} disabled={returnLoan.isPending}>
                              <RotateCcw className="w-4 h-4" />
                              Devolver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="holidays">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-2">
                  <CardTitle>Feriados</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={holidaySort} onValueChange={(value: (typeof HOLIDAY_SORTS)[number]) => setHolidaySort(value)}>
                      <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="data-recente">Data mais recente</SelectItem>
                        <SelectItem value="data-antiga">Data mais antiga</SelectItem>
                        <SelectItem value="nome">Nome A-Z</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setSelectedHolidayIds(sortedHolidays.map((item: any) => item.id))}>
                      Selecionar filtrados
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBatchHolidayDelete} disabled={selectedHolidayIds.length === 0 || deleteHoliday.isPending}>
                      Remover selecionados
                    </Button>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Novo feriado</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Cadastrar feriado</DialogTitle><DialogDescription>Registra um novo feriado no calendario do sistema.</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Nome</Label><Input value={holidayForm.name} onChange={(event) => setHolidayForm((current) => ({ ...current, name: event.target.value }))} /></div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2"><Label>Data</Label><Input type="date" value={holidayForm.date} onChange={(event) => setHolidayForm((current) => ({ ...current, date: event.target.value }))} /></div>
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select value={holidayForm.type} onValueChange={(value) => setHolidayForm((current) => ({ ...current, type: value }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{["Nacional", "Estadual", "Municipal"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={holidayForm.recurring} onChange={(event) => setHolidayForm((current) => ({ ...current, recurring: event.target.checked }))} />
                        <span className="text-sm">Feriado recorrente</span>
                      </div>
                      {holidayErrors.length > 0 && <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{holidayErrors[0]}</div>}
                      <Button onClick={() => createHoliday.mutate({ name: holidayForm.name.trim(), date: holidayForm.date, type: holidayForm.type as any, recurring: holidayForm.recurring })} disabled={createHoliday.isPending || holidayErrors.length > 0}>{createHoliday.isPending ? "Salvando..." : "Salvar feriado"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!sortedHolidays.length ? <EmptyState label="feriados" /> : (
                  <Table>
                    <TableHeader><TableRow><TableHead></TableHead><TableHead>Nome</TableHead><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Recorrente</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>{sortedHolidays.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell><Checkbox checked={selectedHolidayIds.includes(item.id)} onCheckedChange={() => setSelectedHolidayIds((current) => toggleSelection(current, item.id))} /></TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{new Date(item.date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>{item.type || "-"}</TableCell>
                        <TableCell>{item.recurring ? "Sim" : "Nao"}</TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => deleteHoliday.mutate({ id: item.id })} disabled={deleteHoliday.isPending}>Remover</Button></TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dependents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="space-y-2">
                  <CardTitle>Dependentes</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={dependentSort} onValueChange={(value: (typeof DEPENDENT_SORTS)[number]) => setDependentSort(value)}>
                      <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nome">Nome A-Z</SelectItem>
                        <SelectItem value="parentesco">Parentesco</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setSelectedDependentIds(sortedDependents.map((item: any) => item.id))}>
                      Selecionar filtrados
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBatchDependentDelete} disabled={selectedDependentIds.length === 0 || deleteDependent.isPending}>
                      Remover selecionados
                    </Button>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Novo dependente</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Cadastrar dependente</DialogTitle><DialogDescription>Vincula um dependente ao funcionario base.</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Nome</Label><Input value={dependentForm.name} onChange={(event) => setDependentForm((current) => ({ ...current, name: event.target.value }))} /></div>
                      <div className="space-y-2">
                        <Label>Parentesco</Label>
                        <Select value={dependentForm.relationship} onValueChange={(value) => setDependentForm((current) => ({ ...current, relationship: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{["Conjuge", "Filho(a)", "Enteado(a)", "Pai/Mae", "Outros"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2"><Label>Nascimento</Label><Input type="date" value={dependentForm.birthDate} onChange={(event) => setDependentForm((current) => ({ ...current, birthDate: event.target.value }))} /></div>
                        <div className="space-y-2"><Label>CPF</Label><Input value={dependentForm.cpf} onChange={(event) => setDependentForm((current) => ({ ...current, cpf: event.target.value }))} /></div>
                      </div>
                      {dependentErrors.length > 0 && <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{dependentErrors[0]}</div>}
                      <Button onClick={() => createDependent.mutate({ employeeId: employeeNumber, name: dependentForm.name.trim(), relationship: dependentForm.relationship as any, birthDate: dependentForm.birthDate || undefined, cpf: dependentForm.cpf || undefined })} disabled={createDependent.isPending || dependentErrors.length > 0}>{createDependent.isPending ? "Salvando..." : "Salvar dependente"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!sortedDependents.length ? <EmptyState label="dependentes" /> : (
                  <Table>
                    <TableHeader><TableRow><TableHead></TableHead><TableHead>Nome</TableHead><TableHead>Parentesco</TableHead><TableHead>CPF</TableHead><TableHead>IR</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>{sortedDependents.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell><Checkbox checked={selectedDependentIds.includes(item.id)} onCheckedChange={() => setSelectedDependentIds((current) => toggleSelection(current, item.id))} /></TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.relationship}</TableCell>
                        <TableCell>{item.cpf || "-"}</TableCell>
                        <TableCell>{item.irDeduction ? "Sim" : "Nao"}</TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => deleteDependent.mutate({ id: item.id })} disabled={deleteDependent.isPending}>Remover</Button></TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="absences">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ausencias</CardTitle>
                <Dialog>
                  <DialogTrigger asChild><Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Nova ausencia</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Registrar ausencia</DialogTitle><DialogDescription>Lanca uma ausencia para o funcionario base.</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Data</Label><Input type="date" value={absenceForm.absenceDate} onChange={(event) => setAbsenceForm((current) => ({ ...current, absenceDate: event.target.value }))} /></div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={absenceForm.justified} onChange={(event) => setAbsenceForm((current) => ({ ...current, justified: event.target.checked }))} />
                        <span className="text-sm">Ausencia justificada</span>
                      </div>
                      <div className="space-y-2"><Label>Motivo</Label><Textarea value={absenceForm.reason} onChange={(event) => setAbsenceForm((current) => ({ ...current, reason: event.target.value }))} /></div>
                      {absenceErrors.length > 0 && <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{absenceErrors[0]}</div>}
                      <Button onClick={() => createAbsence.mutate({ employeeId: employeeNumber, absenceDate: absenceForm.absenceDate, justified: absenceForm.justified, reason: absenceForm.reason.trim() || undefined })} disabled={createAbsence.isPending || absenceErrors.length > 0}>{createAbsence.isPending ? "Salvando..." : "Salvar ausencia"}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!filteredAbsences.length ? <EmptyState label="ausencias" /> : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Motivo</TableHead><TableHead>Justificada</TableHead></TableRow></TableHeader>
                    <TableBody>{filteredAbsences.map((item: any) => (
                      <TableRow key={item.id}><TableCell>{new Date(item.absenceDate).toLocaleDateString("pt-BR")}</TableCell><TableCell>{item.reason || "-"}</TableCell><TableCell><Badge variant={item.justified ? "default" : "destructive"}>{item.justified ? "Sim" : "Nao"}</Badge></TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
