import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { usePersistedState } from "@/hooks/usePersistedState";
import { BarChart3, GraduationCap, HeartPulse, ShieldCheck, PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";

const EXAM_TYPES = ["Admissional", "Periódico", "Demissional", "Retorno", "Mudança de Função"] as const;
const READINESS_FILTERS = ["todos", "prontos", "atencao", "criticos"] as const;
const EMPLOYEE_SORTS = ["prontos-primeiro", "criticos-primeiro", "nome", "menor-prontidao"] as const;
const RECORD_SORTS = ["mais-recentes", "mais-antigos", "funcionario"] as const;
const PAGE_SIZE = 6;

function buildReadiness(exams: any[], trainings: any[], documents: any[]) {
  let score = 0;
  if (exams.some((item) => item.status === "Valido" || item.status === "Válido")) score += 35;
  score += Math.min(trainings.length * 15, 45);
  score += Math.min(documents.length * 5, 20);
  return Math.min(score, 100);
}

function getReadinessBucket(readiness: number) {
  if (readiness >= 70) return "prontos";
  if (readiness >= 50) return "atencao";
  return "criticos";
}

function parseHours(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ProfessionalAssessment() {
  const [activeTab, setActiveTab] = usePersistedState("assessment:tab", "colaboradores");
  const [selectedEmployeeId, setSelectedEmployeeId] = usePersistedState("assessment:selected-employee", "");
  const [employeeSearch, setEmployeeSearch] = usePersistedState("assessment:search", "");
  const [readinessFilter, setReadinessFilter] = usePersistedState<(typeof READINESS_FILTERS)[number]>("assessment:readiness-filter", "todos");
  const [employeeSort, setEmployeeSort] = usePersistedState<(typeof EMPLOYEE_SORTS)[number]>("assessment:employee-sort", "prontos-primeiro");
  const [trainingSort, setTrainingSort] = usePersistedState<(typeof RECORD_SORTS)[number]>("assessment:training-sort", "mais-recentes");
  const [examSort, setExamSort] = usePersistedState<(typeof RECORD_SORTS)[number]>("assessment:exam-sort", "mais-recentes");
  const [employeePage, setEmployeePage] = usePersistedState("assessment:employee-page", 1);
  const [trainingForm, setTrainingForm] = useState({
    employeeId: "",
    trainingName: "",
    trainingDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    hours: "8",
    provider: "",
  });
  const [examForm, setExamForm] = useState({
    employeeId: "",
    examType: "Periódico" as (typeof EXAM_TYPES)[number],
    examDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    doctorName: "",
    clinicName: "",
  });

  const { data: employees = [] } = trpc.employees.list.useQuery({});
  const { data: trainings = [] } = trpc.trainings.list.useQuery({});
  const { data: exams = [] } = trpc.medicalExams.list.useQuery({});
  const { data: docs = [] } = trpc.documents.list.useQuery({ category: "Treinamentos" });
  const utils = trpc.useUtils();

  const createTraining = trpc.trainings.create.useMutation({
    onSuccess: async () => {
      await utils.trainings.list.invalidate();
      toast.success("Treinamento registrado.");
      setTrainingForm({
        employeeId: "",
        trainingName: "",
        trainingDate: new Date().toISOString().slice(0, 10),
        expiryDate: "",
        hours: "8",
        provider: "",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const createExam = trpc.medicalExams.create.useMutation({
    onSuccess: async () => {
      await utils.medicalExams.list.invalidate();
      toast.success("Exame ocupacional registrado.");
      setExamForm({
        employeeId: "",
        examType: "Periódico",
        examDate: new Date().toISOString().slice(0, 10),
        expiryDate: "",
        doctorName: "",
        clinicName: "",
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const employeeCards = useMemo(() => {
    const normalized = normalizeText(employeeSearch);
    const filtered = employees
      .map((employee: any) => {
        const employeeTrainings = trainings.filter((item: any) => item.employeeId === employee.id);
        const employeeExams = exams.filter((item: any) => item.employeeId === employee.id);
        const employeeDocs = docs.filter((item: any) => item.employeeId === employee.id);
        const readiness = buildReadiness(employeeExams, employeeTrainings, employeeDocs);
        const bucket = getReadinessBucket(readiness);
        const matchesSearch = normalizeText([employee.fullName, employee.cpf].join(" ")).includes(normalized);
        const matchesFilter = readinessFilter === "todos" || readinessFilter === bucket;
        if (!matchesSearch || !matchesFilter) return null;
        return {
          employee,
          readiness,
          bucket,
          trainings: employeeTrainings,
          exams: employeeExams,
          documents: employeeDocs,
        };
      })
      .filter(Boolean) as Array<{ employee: any; readiness: number; bucket: string; trainings: any[]; exams: any[]; documents: any[] }>;

    return filtered.sort((a, b) => {
      if (employeeSort === "criticos-primeiro") return a.readiness - b.readiness;
      if (employeeSort === "nome") return a.employee.fullName.localeCompare(b.employee.fullName);
      if (employeeSort === "menor-prontidao") return a.readiness - b.readiness;
      return b.readiness - a.readiness;
    });
  }, [docs, employeeSearch, employeeSort, employees, exams, readinessFilter, trainings]);

  const selectedCard = employeeCards.find((item) => item.employee.id === Number(selectedEmployeeId))
    ?? employees
      .map((employee: any) => {
        const employeeTrainings = trainings.filter((item: any) => item.employeeId === employee.id);
        const employeeExams = exams.filter((item: any) => item.employeeId === employee.id);
        const employeeDocs = docs.filter((item: any) => item.employeeId === employee.id);
        return {
          employee,
          readiness: buildReadiness(employeeExams, employeeTrainings, employeeDocs),
          trainings: employeeTrainings,
          exams: employeeExams,
          documents: employeeDocs,
        };
      })
      .find((item) => item.employee.id === Number(selectedEmployeeId));

  const readyCount = employeeCards.filter((item) => item.readiness >= 70).length;
  const criticalEmployees = employeeCards.filter((item) => item.readiness < 50).length;
  const pendingExamCount = exams.filter((item: any) => item.status === "Vencido" || item.status === "Proximo do Vencimento" || item.status === "Próximo do Vencimento").length;
  const upcomingExpirations = exams.filter((item: any) => item.status === "Proximo do Vencimento" || item.status === "Próximo do Vencimento").length;
  const totalEmployeePages = Math.max(1, Math.ceil(employeeCards.length / PAGE_SIZE));
  const pagedEmployeeCards = employeeCards.slice((employeePage - 1) * PAGE_SIZE, employeePage * PAGE_SIZE);

  const trainingHoursValue = parseHours(trainingForm.hours);
  const trainingErrors = useMemo(() => {
    const errors: string[] = [];
    if (!trainingForm.employeeId) errors.push("Selecione o funcionario do treinamento.");
    if (!trainingForm.trainingName.trim()) errors.push("Informe o nome do treinamento.");
    if (!trainingForm.trainingDate) errors.push("Informe a data do treinamento.");
    if (Number.isNaN(trainingHoursValue) || trainingHoursValue <= 0 || trainingHoursValue > 200) {
      errors.push("Carga horaria deve ficar entre 0,5 e 200 horas.");
    }
    if (trainingForm.expiryDate && trainingForm.expiryDate < trainingForm.trainingDate) {
      errors.push("Validade do treinamento nao pode ser anterior a data de realizacao.");
    }
    return errors;
  }, [trainingForm, trainingHoursValue]);

  const examErrors = useMemo(() => {
    const errors: string[] = [];
    if (!examForm.employeeId) errors.push("Selecione o funcionario do exame.");
    if (!examForm.examDate) errors.push("Informe a data do exame.");
    if (!examForm.expiryDate) errors.push("Informe a validade do exame.");
    if (examForm.expiryDate && examForm.examDate && examForm.expiryDate < examForm.examDate) {
      errors.push("Validade do exame nao pode ser anterior a data de realizacao.");
    }
    return errors;
  }, [examForm]);

  const sortedTrainings = useMemo(() => {
    const list = selectedEmployeeId ? trainings.filter((item: any) => item.employeeId === Number(selectedEmployeeId)) : trainings;
    return list.slice().sort((a: any, b: any) => {
      if (trainingSort === "mais-antigos") return +new Date(a.trainingDate) - +new Date(b.trainingDate);
      if (trainingSort === "funcionario") {
        const employeeA = employees.find((item: any) => item.id === a.employeeId);
        const employeeB = employees.find((item: any) => item.id === b.employeeId);
        return (employeeA?.fullName ?? "").localeCompare(employeeB?.fullName ?? "");
      }
      return +new Date(b.trainingDate) - +new Date(a.trainingDate);
    });
  }, [employees, selectedEmployeeId, trainingSort, trainings]);

  const sortedExams = useMemo(() => {
    const list = selectedEmployeeId ? exams.filter((item: any) => item.employeeId === Number(selectedEmployeeId)) : exams;
    return list.slice().sort((a: any, b: any) => {
      if (examSort === "mais-antigos") return +new Date(a.expiryDate) - +new Date(b.expiryDate);
      if (examSort === "funcionario") {
        const employeeA = employees.find((item: any) => item.id === a.employeeId);
        const employeeB = employees.find((item: any) => item.id === b.employeeId);
        return (employeeA?.fullName ?? "").localeCompare(employeeB?.fullName ?? "");
      }
      return +new Date(b.expiryDate) - +new Date(a.expiryDate);
    });
  }, [employees, exams, examSort, selectedEmployeeId]);

  useEffect(() => {
    setEmployeePage(1);
  }, [employeeSearch, employeeSort, readinessFilter, setEmployeePage]);

  useEffect(() => {
    if (employeePage > totalEmployeePages) {
      setEmployeePage(totalEmployeePages);
    }
  }, [employeePage, setEmployeePage, totalEmployeePages]);

  const handleCreateTraining = async () => {
    if (trainingErrors.length > 0) {
      toast.error(trainingErrors[0]);
      return;
    }
    await createTraining.mutateAsync({
      employeeId: Number(trainingForm.employeeId),
      trainingName: trainingForm.trainingName.trim(),
      trainingDate: trainingForm.trainingDate,
      expiryDate: trainingForm.expiryDate || undefined,
      hours: String(trainingHoursValue),
      provider: trainingForm.provider.trim() || undefined,
    });
  };

  const handleCreateExam = async () => {
    if (examErrors.length > 0) {
      toast.error(examErrors[0]);
      return;
    }
    await createExam.mutateAsync({
      employeeId: Number(examForm.employeeId),
      examType: examForm.examType,
      examDate: examForm.examDate,
      expiryDate: examForm.expiryDate,
      doctorName: examForm.doctorName.trim() || undefined,
      clinicName: examForm.clinicName.trim() || undefined,
    });
  };

  const fillActionsForSelected = () => {
    if (!selectedCard) return;
    const employeeId = String(selectedCard.employee.id);
    setTrainingForm((current) => ({ ...current, employeeId }));
    setExamForm((current) => ({ ...current, employeeId }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Avaliacoes de prontidao</h1>
          <p className="text-muted-foreground mt-2">
            Desenvolvimento, saude ocupacional e cobertura documental com persistencia de contexto e listas ordenaveis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-blue-600">{employeeCards.length}</p><p className="text-sm text-muted-foreground">Colaboradores no filtro</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-green-600">{readyCount}</p><p className="text-sm text-muted-foreground">Prontos</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-orange-600">{upcomingExpirations}</p><p className="text-sm text-muted-foreground">Expiram em breve</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-red-600">{criticalEmployees || pendingExamCount}</p><p className="text-sm text-muted-foreground">Criticidade</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Plano individual</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[280px_1fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selecionar colaborador</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Escolha um colaborador" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((employee: any) => (
                      <SelectItem key={employee.id} value={String(employee.id)}>{employee.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" className="w-full" onClick={fillActionsForSelected} disabled={!selectedCard}>
                Usar colaborador nas acoes
              </Button>
            </div>

            <div className="rounded border p-4">
              {!selectedCard ? (
                <p className="text-sm text-muted-foreground">Selecione um colaborador para ver a situacao detalhada.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{selectedCard.employee.fullName}</p>
                      <p className="text-sm text-muted-foreground">{selectedCard.employee.cpf}</p>
                    </div>
                    <Badge variant={selectedCard.readiness >= 70 ? "default" : selectedCard.readiness >= 50 ? "secondary" : "destructive"}>
                      {selectedCard.readiness}%
                    </Badge>
                  </div>
                  <Progress value={selectedCard.readiness} className="h-2" />
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded bg-muted p-3"><p className="text-muted-foreground">Treinamentos</p><p className="text-xl font-bold">{selectedCard.trainings.length}</p></div>
                    <div className="rounded bg-muted p-3"><p className="text-muted-foreground">Exames</p><p className="text-xl font-bold">{selectedCard.exams.length}</p></div>
                    <div className="rounded bg-muted p-3"><p className="text-muted-foreground">Documentos</p><p className="text-xl font-bold">{selectedCard.documents.length}</p></div>
                  </div>
                  <div className="rounded border bg-muted/30 p-4 text-sm">
                    <p className="font-medium mb-1">Proxima acao sugerida</p>
                    <p className="text-muted-foreground">
                      {selectedCard.exams.length === 0
                        ? "Registrar exame ocupacional."
                        : selectedCard.trainings.length === 0
                          ? "Cadastrar treinamento obrigatorio."
                          : selectedCard.documents.length === 0
                            ? "Anexar documento de treinamento."
                            : "Fluxo principal concluido."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
            <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
            <TabsTrigger value="saude">Saude</TabsTrigger>
            <TabsTrigger value="acoes">Acoes</TabsTrigger>
          </TabsList>

          <TabsContent value="colaboradores" className="space-y-4">
            <Card>
              <CardHeader className="gap-4">
                <CardTitle>Mapa de prontidao</CardTitle>
                <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={employeeSearch} onChange={(event) => setEmployeeSearch(event.target.value)} className="pl-10" placeholder="Buscar colaborador ou CPF" />
                  </div>
                  <Select value={readinessFilter} onValueChange={(value: (typeof READINESS_FILTERS)[number]) => setReadinessFilter(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os niveis</SelectItem>
                      <SelectItem value="prontos">Prontos</SelectItem>
                      <SelectItem value="atencao">Atencao</SelectItem>
                      <SelectItem value="criticos">Criticos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={employeeSort} onValueChange={(value: (typeof EMPLOYEE_SORTS)[number]) => setEmployeeSort(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prontos-primeiro">Maior prontidao</SelectItem>
                      <SelectItem value="criticos-primeiro">Criticos primeiro</SelectItem>
                      <SelectItem value="nome">Nome A-Z</SelectItem>
                      <SelectItem value="menor-prontidao">Menor prontidao</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pagedEmployeeCards.length === 0 && (
                    <div className="md:col-span-2 rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Nenhum colaborador encontrado com os filtros atuais.
                    </div>
                  )}
                  {pagedEmployeeCards.map(({ employee, readiness, trainings: employeeTrainings, exams: employeeExams, documents }) => (
                    <Card key={employee.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between gap-3">
                          <span>{employee.fullName}</span>
                          <Badge variant={readiness >= 70 ? "default" : readiness >= 50 ? "secondary" : "destructive"}>{readiness}%</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Progress value={readiness} className="h-2" />
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div className="rounded bg-muted p-3 text-center"><GraduationCap className="w-4 h-4 mx-auto mb-1" /><p className="font-semibold">{employeeTrainings.length}</p><p className="text-muted-foreground">Trein.</p></div>
                          <div className="rounded bg-muted p-3 text-center"><HeartPulse className="w-4 h-4 mx-auto mb-1" /><p className="font-semibold">{employeeExams.length}</p><p className="text-muted-foreground">Exames</p></div>
                          <div className="rounded bg-muted p-3 text-center"><ShieldCheck className="w-4 h-4 mx-auto mb-1" /><p className="font-semibold">{documents.length}</p><p className="text-muted-foreground">Docs</p></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {employeeCards.length > PAGE_SIZE && (
                  <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
                    <p className="text-sm text-muted-foreground">
                      Pagina {employeePage} de {totalEmployeePages} • {employeeCards.length} colaborador(es)
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEmployeePage(Math.max(1, employeePage - 1))} disabled={employeePage === 1}>
                        Anterior
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEmployeePage(Math.min(totalEmployeePages, employeePage + 1))} disabled={employeePage === totalEmployeePages}>
                        Proxima
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treinamentos" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Treinamentos registrados</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployeeId ? "Lista focada no colaborador selecionado." : "Lista consolidada de treinamentos."}
                  </p>
                  <Select value={trainingSort} onValueChange={(value: (typeof RECORD_SORTS)[number]) => setTrainingSort(value)}>
                    <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mais-recentes">Mais recentes</SelectItem>
                      <SelectItem value="mais-antigos">Mais antigos</SelectItem>
                      <SelectItem value="funcionario">Funcionario A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  {sortedTrainings.map((training: any) => {
                    const employee = employees.find((item: any) => item.id === training.employeeId);
                    return (
                      <div key={training.id} className="rounded border p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{training.trainingName}</p>
                          <p className="text-sm text-muted-foreground">{employee?.fullName ?? `Funcionario ID ${training.employeeId}`} • {new Date(training.trainingDate).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <Badge variant="outline">{training.hours ? `${training.hours}h` : "Sem carga"}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saude" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Exames ocupacionais</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployeeId ? "Lista focada no colaborador selecionado." : "Lista consolidada de exames."}
                  </p>
                  <Select value={examSort} onValueChange={(value: (typeof RECORD_SORTS)[number]) => setExamSort(value)}>
                    <SelectTrigger className="w-full md:w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mais-recentes">Validades mais recentes</SelectItem>
                      <SelectItem value="mais-antigos">Validades mais proximas</SelectItem>
                      <SelectItem value="funcionario">Funcionario A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  {sortedExams.map((exam: any) => {
                    const employee = employees.find((item: any) => item.id === exam.employeeId);
                    return (
                      <div key={exam.id} className="rounded border p-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{exam.examType}</p>
                          <p className="text-sm text-muted-foreground">{employee?.fullName ?? `Funcionario ID ${exam.employeeId}`} • Validade {new Date(exam.expiryDate).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <Badge variant={exam.status === "Valido" || exam.status === "Válido" ? "default" : "destructive"}>{exam.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acoes" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="w-5 h-5" /> Registrar treinamento</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Funcionario</Label>
                    <Select value={trainingForm.employeeId} onValueChange={(value) => setTrainingForm((current) => ({ ...current, employeeId: value }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((employee: any) => (
                          <SelectItem key={employee.id} value={String(employee.id)}>{employee.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Treinamento</Label><Input value={trainingForm.trainingName} onChange={(event) => setTrainingForm((current) => ({ ...current, trainingName: event.target.value }))} /></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Data</Label><Input type="date" value={trainingForm.trainingDate} onChange={(event) => setTrainingForm((current) => ({ ...current, trainingDate: event.target.value }))} /></div>
                    <div className="space-y-2"><Label>Validade</Label><Input type="date" value={trainingForm.expiryDate} onChange={(event) => setTrainingForm((current) => ({ ...current, expiryDate: event.target.value }))} /></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Carga horaria</Label><Input value={trainingForm.hours} onChange={(event) => setTrainingForm((current) => ({ ...current, hours: event.target.value }))} /></div>
                    <div className="space-y-2"><Label>Fornecedor</Label><Input value={trainingForm.provider} onChange={(event) => setTrainingForm((current) => ({ ...current, provider: event.target.value }))} /></div>
                  </div>
                  {trainingErrors.length > 0 && (
                    <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      {trainingErrors[0]}
                    </div>
                  )}
                  <Button onClick={handleCreateTraining} disabled={createTraining.isPending || trainingErrors.length > 0}>{createTraining.isPending ? "Salvando..." : "Salvar treinamento"}</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="w-5 h-5" /> Registrar exame</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Funcionario</Label>
                    <Select value={examForm.employeeId} onValueChange={(value) => setExamForm((current) => ({ ...current, employeeId: value }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((employee: any) => (
                          <SelectItem key={employee.id} value={String(employee.id)}>{employee.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={examForm.examType} onValueChange={(value: (typeof EXAM_TYPES)[number]) => setExamForm((current) => ({ ...current, examType: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EXAM_TYPES.map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Data</Label><Input type="date" value={examForm.examDate} onChange={(event) => setExamForm((current) => ({ ...current, examDate: event.target.value }))} /></div>
                    <div className="space-y-2"><Label>Validade</Label><Input type="date" value={examForm.expiryDate} onChange={(event) => setExamForm((current) => ({ ...current, expiryDate: event.target.value }))} /></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2"><Label>Medico</Label><Input value={examForm.doctorName} onChange={(event) => setExamForm((current) => ({ ...current, doctorName: event.target.value }))} /></div>
                    <div className="space-y-2"><Label>Clinica</Label><Input value={examForm.clinicName} onChange={(event) => setExamForm((current) => ({ ...current, clinicName: event.target.value }))} /></div>
                  </div>
                  {examErrors.length > 0 && (
                    <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                      {examErrors[0]}
                    </div>
                  )}
                  <Button onClick={handleCreateExam} disabled={createExam.isPending || examErrors.length > 0}>{createExam.isPending ? "Salvando..." : "Salvar exame"}</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
