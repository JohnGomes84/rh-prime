import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { usePersistedState } from "@/hooks/usePersistedState";
import {
  Search,
  FileText,
  BriefcaseBusiness,
  ShieldCheck,
  UserPlus,
  ClipboardList,
  CircleAlert,
} from "lucide-react";
import { toast } from "sonner";

const CONTRACT_TYPES = ["CLT", "Estágio", "Temporário", "Experiência"] as const;
const DOCUMENT_FILTERS = ["todos", "documentado", "pendente"] as const;
const PIPELINE_FILTERS = ["todos", "concluidos", "pendentes"] as const;
const CONTRACT_SORTS = ["recentes", "antigos", "salario", "nome"] as const;
const PIPELINE_SORTS = ["progresso", "menor-progresso", "nome"] as const;
const PAGE_SIZE = 6;

function parseNumberValue(value: string) {
  if (!value.trim()) return null;
  const normalized = Number(value.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : NaN;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export default function Recruitment() {
  const [searchTerm, setSearchTerm] = usePersistedState("recruitment:search", "");
  const [pipelineSearch, setPipelineSearch] = usePersistedState("recruitment:pipeline-search", "");
  const [activeTab, setActiveTab] = usePersistedState("recruitment:tab", "contratacoes");
  const [documentFilter, setDocumentFilter] = usePersistedState<(typeof DOCUMENT_FILTERS)[number]>("recruitment:document-filter", "todos");
  const [pipelineFilter, setPipelineFilter] = usePersistedState<(typeof PIPELINE_FILTERS)[number]>("recruitment:pipeline-filter", "todos");
  const [contractSort, setContractSort] = usePersistedState<(typeof CONTRACT_SORTS)[number]>("recruitment:contract-sort", "recentes");
  const [pipelineSort, setPipelineSort] = usePersistedState<(typeof PIPELINE_SORTS)[number]>("recruitment:pipeline-sort", "progresso");
  const [contractsPage, setContractsPage] = usePersistedState("recruitment:contracts-page", 1);
  const [pipelinePage, setPipelinePage] = usePersistedState("recruitment:pipeline-page", 1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({
    employeeId: "",
    positionId: "",
    contractType: "CLT" as (typeof CONTRACT_TYPES)[number],
    hireDate: new Date().toISOString().slice(0, 10),
    salary: "",
    weeklyHours: "44",
    workSchedule: "Segunda a sexta",
  });

  const { data: positions = [] } = trpc.positions.list.useQuery();
  const { data: contracts = [] } = trpc.contracts.list.useQuery();
  const { data: employees = [] } = trpc.employees.list.useQuery({});
  const { data: contractualDocs = [] } = trpc.documents.list.useQuery({ category: "Contratual" });
  const { data: checklistItems = [] } = trpc.checklist.list.useQuery(
    { employeeId: Number(admissionForm.employeeId || 0) },
    { enabled: !!admissionForm.employeeId }
  );
  const utils = trpc.useUtils();

  const createChecklist = trpc.checklist.createDefault.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const createContract = trpc.contracts.create.useMutation({
    onSuccess: async (_, variables) => {
      await Promise.all([
        utils.contracts.list.invalidate(),
        utils.checklist.list.invalidate(),
      ]);
      await createChecklist.mutateAsync({ employeeId: variables.employeeId });
      toast.success("Admissao criada com checklist inicial.");
      setDialogOpen(false);
      setAdmissionForm({
        employeeId: "",
        positionId: "",
        contractType: "CLT",
        hireDate: new Date().toISOString().slice(0, 10),
        salary: "",
        weeklyHours: "44",
        workSchedule: "Segunda a sexta",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const selectedEmployee = employees.find((item: any) => item.id === Number(admissionForm.employeeId));
  const selectedPosition = positions.find((item: any) => item.id === Number(admissionForm.positionId));
  const selectedEmployeeContracts = contracts.filter((item: any) => item.employeeId === Number(admissionForm.employeeId));
  const selectedChecklistDone = checklistItems.filter((item: any) => item.isCompleted).length;
  const salaryValue = parseNumberValue(admissionForm.salary);
  const weeklyHoursValue = parseNumberValue(admissionForm.weeklyHours);

  const admissionErrors = useMemo(() => {
    const errors: string[] = [];
    if (!admissionForm.employeeId) errors.push("Selecione o funcionario.");
    if (!admissionForm.positionId) errors.push("Selecione o cargo.");
    if (!admissionForm.hireDate) errors.push("Informe a data de admissao.");
    if (salaryValue === null || Number.isNaN(salaryValue) || salaryValue <= 0) {
      errors.push("Informe um salario valido maior que zero.");
    }
    if (weeklyHoursValue === null || Number.isNaN(weeklyHoursValue) || weeklyHoursValue <= 0 || weeklyHoursValue > 60) {
      errors.push("Horas semanais devem ficar entre 1 e 60.");
    }
    if (!admissionForm.workSchedule.trim()) errors.push("Informe a jornada.");
    return errors;
  }, [admissionForm, salaryValue, weeklyHoursValue]);

  const filteredContracts = useMemo(() => {
    const normalized = normalizeText(searchTerm);
    return contracts.filter((contract: any) => {
      const employee = employees.find((item: any) => item.id === contract.employeeId);
      const position = positions.find((item: any) => item.id === contract.positionId);
      const docsCount = contractualDocs.filter((doc: any) => doc.employeeId === contract.employeeId).length;
      const matchesSearch = normalizeText(
        [
          employee?.fullName ?? "",
          employee?.cpf ?? "",
          position?.title ?? "",
          contract.contractType ?? "",
        ].join(" ")
      ).includes(normalized);
      const matchesDocumentFilter =
        documentFilter === "todos" ||
        (documentFilter === "documentado" && docsCount > 0) ||
        (documentFilter === "pendente" && docsCount === 0);
      return matchesSearch && matchesDocumentFilter;
    });
  }, [contracts, contractualDocs, documentFilter, employees, positions, searchTerm]);

  const sortedContracts = useMemo(() => {
    return filteredContracts.slice().sort((a: any, b: any) => {
      const employeeA = employees.find((item: any) => item.id === a.employeeId);
      const employeeB = employees.find((item: any) => item.id === b.employeeId);
      if (contractSort === "antigos") return +new Date(a.hireDate) - +new Date(b.hireDate);
      if (contractSort === "salario") return Number(b.salary ?? 0) - Number(a.salary ?? 0);
      if (contractSort === "nome") return (employeeA?.fullName ?? "").localeCompare(employeeB?.fullName ?? "");
      return +new Date(b.hireDate) - +new Date(a.hireDate);
    });
  }, [contractSort, employees, filteredContracts]);

  const hiresThisYear = contracts.filter((contract: any) => new Date(contract.hireDate).getFullYear() === new Date().getFullYear()).length;
  const pendingContractualDocs = employees.filter((employee: any) => {
    const hasDocument = contractualDocs.some((doc: any) => doc.employeeId === employee.id);
    const hasContract = contracts.some((contract: any) => contract.employeeId === employee.id);
    return hasContract && !hasDocument;
  }).length;

  const onboardingStatus = useMemo(() => {
    const normalized = normalizeText(pipelineSearch);
    return employees
      .map((employee: any) => {
        const employeeContracts = contracts.filter((contract: any) => contract.employeeId === employee.id);
        if (employeeContracts.length === 0) return null;
        const employeeDocs = contractualDocs.filter((doc: any) => doc.employeeId === employee.id).length;
        const progress = Math.min(100, (employeeDocs > 0 ? 60 : 20) + 40);
        const matchesSearch = normalizeText([employee.fullName, employee.cpf].join(" ")).includes(normalized);
        const matchesFilter =
          pipelineFilter === "todos" ||
          (pipelineFilter === "concluidos" && progress === 100) ||
          (pipelineFilter === "pendentes" && progress < 100);
        if (!matchesSearch || !matchesFilter) return null;
        return {
          employee,
          contracts: employeeContracts.length,
          documents: employeeDocs,
          progress,
          statusLabel: progress === 100 ? "Completo" : progress >= 60 ? "Documental pendente" : "Em abertura",
        };
      })
      .filter(Boolean) as Array<{ employee: any; contracts: number; documents: number; progress: number; statusLabel: string }>;
  }, [contracts, contractualDocs, employees, pipelineFilter, pipelineSearch]);

  const sortedPipeline = useMemo(() => {
    return onboardingStatus.slice().sort((a, b) => {
      if (pipelineSort === "menor-progresso") return a.progress - b.progress;
      if (pipelineSort === "nome") return a.employee.fullName.localeCompare(b.employee.fullName);
      return b.progress - a.progress;
    });
  }, [onboardingStatus, pipelineSort]);

  const pipelineSummary = {
    total: onboardingStatus.length,
    completed: onboardingStatus.filter((item) => item.progress === 100).length,
    pending: onboardingStatus.filter((item) => item.progress < 100).length,
  };

  const totalContractPages = Math.max(1, Math.ceil(sortedContracts.length / PAGE_SIZE));
  const totalPipelinePages = Math.max(1, Math.ceil(sortedPipeline.length / PAGE_SIZE));
  const pagedContracts = paginate(sortedContracts, contractsPage, PAGE_SIZE);
  const pagedPipeline = paginate(sortedPipeline, pipelinePage, PAGE_SIZE);

  useEffect(() => {
    setContractsPage(1);
  }, [contractSort, documentFilter, searchTerm, setContractsPage]);

  useEffect(() => {
    setPipelinePage(1);
  }, [pipelineFilter, pipelineSearch, pipelineSort, setPipelinePage]);

  useEffect(() => {
    if (contractsPage > totalContractPages) {
      setContractsPage(totalContractPages);
    }
  }, [contractsPage, setContractsPage, totalContractPages]);

  useEffect(() => {
    if (pipelinePage > totalPipelinePages) {
      setPipelinePage(totalPipelinePages);
    }
  }, [pipelinePage, setPipelinePage, totalPipelinePages]);

  const handleCreateAdmission = async () => {
    if (admissionErrors.length > 0) {
      toast.error(admissionErrors[0]);
      return;
    }

    await createContract.mutateAsync({
      employeeId: Number(admissionForm.employeeId),
      positionId: Number(admissionForm.positionId),
      contractType: admissionForm.contractType,
      hireDate: admissionForm.hireDate,
      salary: String(salaryValue),
      weeklyHours: String(weeklyHoursValue),
      workSchedule: admissionForm.workSchedule.trim(),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Recrutamento e Admissoes</h1>
            <p className="text-muted-foreground mt-2">
              Fluxo de admissao com checklist, filtros persistentes, ordenacao e navegacao operacional.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" asChild>
              <a href="/cargos">
                <BriefcaseBusiness className="w-4 h-4" />
                Gerenciar cargos
              </a>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Nova admissao
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nova admissao</DialogTitle>
                  <DialogDescription>
                    Cria o contrato inicial e prepara o checklist obrigatorio do colaborador.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Funcionario</Label>
                    <Select value={admissionForm.employeeId} onValueChange={(value) => setAdmissionForm((current) => ({ ...current, employeeId: value }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione um funcionario" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((employee: any) => (
                          <SelectItem key={employee.id} value={String(employee.id)}>
                            {employee.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Select value={admissionForm.positionId} onValueChange={(value) => setAdmissionForm((current) => ({ ...current, positionId: value }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione um cargo" /></SelectTrigger>
                      <SelectContent>
                        {positions.map((position: any) => (
                          <SelectItem key={position.id} value={String(position.id)}>
                            {position.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de contrato</Label>
                    <Select value={admissionForm.contractType} onValueChange={(value: (typeof CONTRACT_TYPES)[number]) => setAdmissionForm((current) => ({ ...current, contractType: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTRACT_TYPES.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de admissao</Label>
                    <Input type="date" value={admissionForm.hireDate} onChange={(event) => setAdmissionForm((current) => ({ ...current, hireDate: event.target.value }))} />
                  </div>

                  <div className="space-y-2">
                    <Label>Salario</Label>
                    <Input value={admissionForm.salary} onChange={(event) => setAdmissionForm((current) => ({ ...current, salary: event.target.value }))} placeholder="3500,00" />
                  </div>

                  <div className="space-y-2">
                    <Label>Horas semanais</Label>
                    <Input value={admissionForm.weeklyHours} onChange={(event) => setAdmissionForm((current) => ({ ...current, weeklyHours: event.target.value }))} />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Jornada</Label>
                    <Input value={admissionForm.workSchedule} onChange={(event) => setAdmissionForm((current) => ({ ...current, workSchedule: event.target.value }))} />
                  </div>
                </div>

                {selectedEmployee && (
                  <div className="rounded border bg-muted/40 p-4 text-sm space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <ClipboardList className="w-4 h-4" />
                      Contexto da admissao
                    </div>
                    <p className="text-muted-foreground">
                      Funcionario: <span className="font-medium text-foreground">{selectedEmployee.fullName}</span>
                      {selectedPosition ? <> • Cargo: <span className="font-medium text-foreground">{selectedPosition.title}</span></> : null}
                    </p>
                    <p className="text-muted-foreground">
                      Checklist atual: {selectedChecklistDone}/{checklistItems.length} itens concluidos.
                    </p>
                    {selectedEmployeeContracts.length > 0 && (
                      <div className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-amber-900">
                        <CircleAlert className="w-4 h-4 shrink-0" />
                        <span>{selectedEmployeeContracts.length} contrato(s) ja encontrado(s) para este colaborador. Revise antes de abrir novo vinculo.</span>
                      </div>
                    )}
                  </div>
                )}

                {admissionErrors.length > 0 && (
                  <div className="rounded border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    <p className="font-medium mb-2">Ajustes necessarios</p>
                    <ul className="space-y-1">
                      {admissionErrors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateAdmission} disabled={createContract.isPending || createChecklist.isPending || admissionErrors.length > 0}>
                    {createContract.isPending || createChecklist.isPending ? "Salvando..." : "Criar admissao"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-blue-600">{positions.length}</p><p className="text-sm text-muted-foreground">Cargos disponiveis</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-green-600">{contracts.length}</p><p className="text-sm text-muted-foreground">Contratos registrados</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-orange-600">{hiresThisYear}</p><p className="text-sm text-muted-foreground">Admissoes no ano</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-purple-600">{pendingContractualDocs}</p><p className="text-sm text-muted-foreground">Sem documento contratual</p></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contratacoes">Contratacoes</TabsTrigger>
            <TabsTrigger value="cargos">Cargos</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="contratacoes" className="space-y-4">
            <Card>
              <CardHeader className="gap-4">
                <CardTitle>Historico de contratacoes</CardTitle>
                <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-10" placeholder="Buscar colaborador, CPF ou cargo" />
                  </div>
                  <Select value={documentFilter} onValueChange={(value: (typeof DOCUMENT_FILTERS)[number]) => setDocumentFilter(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os documentos</SelectItem>
                      <SelectItem value="documentado">Somente documentados</SelectItem>
                      <SelectItem value="pendente">Somente pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={contractSort} onValueChange={(value: (typeof CONTRACT_SORTS)[number]) => setContractSort(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recentes">Mais recentes</SelectItem>
                      <SelectItem value="antigos">Mais antigos</SelectItem>
                      <SelectItem value="salario">Maior salario</SelectItem>
                      <SelectItem value="nome">Nome A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pagedContracts.length === 0 && (
                    <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Nenhuma contratacao encontrada com os filtros atuais.
                    </div>
                  )}
                  {pagedContracts.map((contract: any) => {
                    const employee = employees.find((item: any) => item.id === contract.employeeId);
                    const position = positions.find((item: any) => item.id === contract.positionId);
                    const docsCount = contractualDocs.filter((doc: any) => doc.employeeId === contract.employeeId).length;
                    return (
                      <div key={contract.id} className="rounded border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">{employee?.fullName ?? `Funcionario #${contract.employeeId}`}</h3>
                            <p className="text-sm text-muted-foreground">{position?.title ?? "Cargo nao vinculado"}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge>{contract.contractType}</Badge>
                            <Badge variant={docsCount > 0 ? "default" : "secondary"}>{docsCount > 0 ? "Documentado" : "Sem doc"}</Badge>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                          <div><p className="text-muted-foreground">CPF</p><p className="font-medium">{employee?.cpf ?? "-"}</p></div>
                          <div><p className="text-muted-foreground">Admissao</p><p className="font-medium">{new Date(contract.hireDate).toLocaleDateString("pt-BR")}</p></div>
                          <div><p className="text-muted-foreground">Salario</p><p className="font-medium">{contract.salary ? `R$ ${Number(contract.salary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</p></div>
                          <div><p className="text-muted-foreground">Jornada</p><p className="font-medium">{contract.workSchedule || "-"}</p></div>
                          <div><p className="text-muted-foreground">Documento</p><p className="font-medium">{docsCount > 0 ? `${docsCount} anexo(s)` : "Pendente"}</p></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {sortedContracts.length > PAGE_SIZE && (
                  <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Pagina {contractsPage} de {totalContractPages} • {sortedContracts.length} registro(s)
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setContractsPage(Math.max(1, contractsPage - 1))} disabled={contractsPage === 1}>
                        Anterior
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setContractsPage(Math.min(totalContractPages, contractsPage + 1))} disabled={contractsPage === totalContractPages}>
                        Proxima
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cargos" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Cargos em uso</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {positions.map((position: any) => {
                    const linkedContracts = contracts.filter((contract: any) => contract.positionId === position.id).length;
                    return (
                      <div key={position.id} className="rounded border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{position.title}</h3>
                            <p className="text-sm text-muted-foreground">{position.department || "Sem departamento"}</p>
                          </div>
                          <Badge variant="secondary">{linkedContracts} contratos</Badge>
                        </div>
                        <div className="mt-3 text-sm space-y-1">
                          <p><span className="text-muted-foreground">CBO:</span> {position.cboCode || "-"}</p>
                          <p><span className="text-muted-foreground">Salario base:</span> {position.baseSalary ? `R$ ${Number(position.baseSalary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{pipelineSummary.total}</p><p className="text-sm text-muted-foreground">Em onboarding</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{pipelineSummary.completed}</p><p className="text-sm text-muted-foreground">Fluxos completos</p></CardContent></Card>
              <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{pipelineSummary.pending}</p><p className="text-sm text-muted-foreground">Pendentes</p></CardContent></Card>
            </div>
            <Card>
              <CardHeader className="gap-4">
                <CardTitle>Pipeline de onboarding</CardTitle>
                <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
                  <Input value={pipelineSearch} onChange={(event) => setPipelineSearch(event.target.value)} placeholder="Buscar colaborador no pipeline" />
                  <Select value={pipelineFilter} onValueChange={(value: (typeof PIPELINE_FILTERS)[number]) => setPipelineFilter(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os status</SelectItem>
                      <SelectItem value="concluidos">Somente concluidos</SelectItem>
                      <SelectItem value="pendentes">Somente pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={pipelineSort} onValueChange={(value: (typeof PIPELINE_SORTS)[number]) => setPipelineSort(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="progresso">Maior progresso</SelectItem>
                      <SelectItem value="menor-progresso">Menor progresso</SelectItem>
                      <SelectItem value="nome">Nome A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pagedPipeline.length === 0 && (
                    <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Nenhum colaborador encontrado no pipeline atual.
                    </div>
                  )}
                  {pagedPipeline.map((item) => (
                    <div key={item.employee.id} className="rounded border p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{item.employee.fullName}</p>
                          <p className="text-sm text-muted-foreground">{item.contracts} contrato(s) • {item.documents} documento(s) contratual(is)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.progress === 100 ? "default" : "secondary"}>{item.statusLabel}</Badge>
                          <Badge variant="outline">{item.progress}%</Badge>
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded bg-muted">
                        <div className="h-2 rounded bg-primary" style={{ width: `${item.progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {sortedPipeline.length > PAGE_SIZE && (
                  <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Pagina {pipelinePage} de {totalPipelinePages} • {sortedPipeline.length} registro(s)
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPipelinePage(Math.max(1, pipelinePage - 1))} disabled={pipelinePage === 1}>
                        Anterior
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPipelinePage(Math.min(totalPipelinePages, pipelinePage + 1))} disabled={pipelinePage === totalPipelinePages}>
                        Proxima
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Documentos contratuais</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contractualDocs.map((doc: any) => (
                    <div key={doc.id} className="rounded border p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{doc.documentName}</p>
                        <p className="text-sm text-muted-foreground">Funcionario ID {doc.employeeId} • Upload em {new Date(doc.uploadedAt ?? doc.uploadDate).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        <Badge variant="outline">Contratual</Badge>
                      </div>
                    </div>
                  ))}
                  {contractualDocs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      Nenhum documento contratual encontrado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
