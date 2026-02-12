import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  FileText,
  CalendarDays,
  HeartPulse,
  Briefcase,
  FolderOpen,
  Shield,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

export default function EmployeeDetail() {
  const params = useParams<{ id: string }>();
  const empId = Number(params.id);
  const [, setLocation] = useLocation();

  const { data: employee, isLoading } = trpc.employees.get.useQuery({ id: empId });
  const { data: contracts } = trpc.contracts.list.useQuery({ employeeId: empId });
  const { data: vacations } = trpc.vacations.list.useQuery({ employeeId: empId });
  const { data: exams } = trpc.medicalExams.list.useQuery({ employeeId: empId });
  const { data: documents } = trpc.documents.list.useQuery({ employeeId: empId });
  const { data: positions } = trpc.positions.list.useQuery();
  const { data: timeBank } = trpc.timeBank.list.useQuery({ employeeId: empId });
  const { data: ppeDeliveries } = trpc.ppeDeliveries.list.useQuery({ employeeId: empId });
  const { data: checklist } = trpc.checklist.list.useQuery({ employeeId: empId, checklistType: "admissao" as any });

  const utils = trpc.useUtils();

  const updateMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      utils.employees.get.invalidate({ id: empId });
      toast.success("Dados atualizados com sucesso!");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const createContractMutation = trpc.contracts.create.useMutation({
    onSuccess: () => {
      utils.contracts.list.invalidate({ employeeId: empId });
      toast.success("Contrato cadastrado!");
      setContractDialog(false);
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const createExamMutation = trpc.medicalExams.create.useMutation({
    onSuccess: () => {
      utils.medicalExams.list.invalidate({ employeeId: empId });
      utils.dashboard.stats.invalidate();
      toast.success("Exame registrado!");
      setExamDialog(false);
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const [contractDialog, setContractDialog] = useState(false);
  const [examDialog, setExamDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (employee) {
      setFormData({
        fullName: employee.fullName,
        socialName: employee.socialName ?? "",
        cpf: employee.cpf,
        rg: employee.rg ?? "",
        email: employee.email ?? "",
        phone: employee.phone ?? "",
        status: employee.status,
        bankName: employee.bankName ?? "",
        bankAgency: employee.bankAgency ?? "",
        bankAccount: employee.bankAccount ?? "",
        pixKey: employee.pixKey ?? "",
      });
    }
  }, [employee]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Funcionário não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/funcionarios")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleSave = () => {
    updateMutation.mutate({ id: empId, data: formData });
    setEditing(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/funcionarios")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{employee.fullName}</h1>
              <p className="text-muted-foreground text-sm">CPF: {employee.cpf}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" /> Salvar
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setEditing(true)}>Editar Dados</Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="perfil" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="perfil" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Perfil</TabsTrigger>
            <TabsTrigger value="contratos" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Contratos</TabsTrigger>
            <TabsTrigger value="ferias" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Férias</TabsTrigger>
            <TabsTrigger value="saude" className="gap-1.5"><HeartPulse className="h-3.5 w-3.5" /> Saúde</TabsTrigger>
            <TabsTrigger value="banco-horas" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Banco de Horas</TabsTrigger>
            <TabsTrigger value="epi" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> EPIs</TabsTrigger>
            <TabsTrigger value="documentos" className="gap-1.5"><FolderOpen className="h-3.5 w-3.5" /> Dossiê</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
          </TabsList>

          {/* PERFIL */}
          <TabsContent value="perfil">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">Dados Pessoais</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {editing ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label>Nome Completo</Label>
                        <Input value={formData.fullName || ""} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
                      </div>
                      <div>
                        <Label>Nome Social</Label>
                        <Input value={formData.socialName || ""} onChange={(e) => setFormData({ ...formData, socialName: e.target.value })} />
                      </div>
                      <div>
                        <Label>E-mail</Label>
                        <Input value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ativo">Ativo</SelectItem>
                            <SelectItem value="Inativo">Inativo</SelectItem>
                            <SelectItem value="Afastado">Afastado</SelectItem>
                            <SelectItem value="Férias">Férias</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <InfoRow label="Nome" value={employee.fullName} />
                      <InfoRow label="Nome Social" value={employee.socialName} />
                      <InfoRow label="CPF" value={employee.cpf} />
                      <InfoRow label="RG" value={employee.rg} />
                      <InfoRow label="Nascimento" value={formatDate(employee.birthDate)} />
                      <InfoRow label="Gênero" value={employee.gender} />
                      <InfoRow label="Estado Civil" value={employee.maritalStatus} />
                      <InfoRow label="E-mail" value={employee.email} />
                      <InfoRow label="Telefone" value={employee.phone} />
                      <InfoRow label="Status" value={employee.status} />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="text-base">Dados Bancários</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Banco</Label><Input value={formData.bankName || ""} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} /></div>
                      <div><Label>Agência</Label><Input value={formData.bankAgency || ""} onChange={(e) => setFormData({ ...formData, bankAgency: e.target.value })} /></div>
                      <div><Label>Conta</Label><Input value={formData.bankAccount || ""} onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })} /></div>
                      <div><Label>PIX</Label><Input value={formData.pixKey || ""} onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })} /></div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <InfoRow label="Banco" value={employee.bankName} />
                      <InfoRow label="Agência" value={employee.bankAgency} />
                      <InfoRow label="Conta" value={employee.bankAccount} />
                      <InfoRow label="Chave PIX" value={employee.pixKey} />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CONTRATOS */}
          <TabsContent value="contratos">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Contratos</CardTitle>
                <Dialog open={contractDialog} onOpenChange={setContractDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Novo Contrato</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      createContractMutation.mutate({
                        employeeId: empId,
                        contractType: fd.get("contractType") as "CLT" | "Experiência" | "Temporário" | "Estágio",
                        hireDate: fd.get("startDate") as string,
                        positionId: fd.get("positionId") ? Number(fd.get("positionId")) : undefined,
                        salary: fd.get("salary") ? String(fd.get("salary")) : undefined,
                        weeklyHours: fd.get("weeklyHours") ? String(fd.get("weeklyHours")) : undefined,
                      });
                    }} className="space-y-4">
                      <div>
                        <Label>Tipo de Contrato</Label>
                        <Select name="contractType" required>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CLT">CLT</SelectItem>
                            <SelectItem value="Experiência">Experiência</SelectItem>
                            <SelectItem value="Temporário">Temporário</SelectItem>
                            <SelectItem value="Estágio">Estágio</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Data Início</Label><Input name="startDate" type="date" required /></div>
                        <div><Label>Data Fim</Label><Input name="endDate" type="date" /></div>
                      </div>
                      <div>
                        <Label>Cargo</Label>
                        <Select name="positionId">
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {positions?.map((p: any) => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Salário (R$)</Label><Input name="salary" type="number" step="0.01" /></div>
                        <div><Label>Carga Horária Semanal</Label><Input name="weeklyHours" type="number" defaultValue={44} /></div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setContractDialog(false)}>Cancelar</Button>
                        <Button type="submit" disabled={createContractMutation.isPending}>
                          {createContractMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Salvar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                {!contracts || contracts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum contrato cadastrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Fim</TableHead>
                        <TableHead>Salário</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.contractType}</TableCell>
                          <TableCell>{formatDate(c.startDate)}</TableCell>
                          <TableCell>{formatDate(c.endDate)}</TableCell>
                          <TableCell>{c.salary ? `R$ ${Number(c.salary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</TableCell>
                          <TableCell><Badge variant="secondary">{c.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FÉRIAS */}
          <TabsContent value="ferias">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Períodos Aquisitivos de Férias</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!vacations || vacations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum período de férias registrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período Aquisitivo</TableHead>
                        <TableHead>Período Concessivo</TableHead>
                        <TableHead>Dias de Direito</TableHead>
                        <TableHead>Dias Gozados</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vacations.map((v: any) => (
                        <TableRow key={v.id}>
                          <TableCell>{formatDate(v.acquisitivePeriodStart)} a {formatDate(v.acquisitivePeriodEnd)}</TableCell>
                          <TableCell>{formatDate(v.concessivePeriodEnd)}</TableCell>
                          <TableCell>{v.totalDaysEntitled}</TableCell>
                          <TableCell>{v.daysTaken}</TableCell>
                          <TableCell>
                            <Badge variant={v.status === "Vencida" ? "destructive" : "secondary"}>
                              {v.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SAÚDE */}
          <TabsContent value="saude">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Exames Médicos (ASO)</CardTitle>
                <Dialog open={examDialog} onOpenChange={setExamDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo ASO</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Registrar ASO</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      createExamMutation.mutate({
                        employeeId: empId,
                        examType: fd.get("examType") as "Admissional" | "Periódico" | "Demissional" | "Retorno" | "Mudança de Função",
                        examDate: fd.get("examDate") as string,
                        expiryDate: (fd.get("expirationDate") as string) || "",
                        result: (fd.get("result") as "Apto" | "Inapto" | "Apto com Restrições") || undefined,
                        doctorName: (fd.get("doctorName") as string) || undefined,
                        crm: (fd.get("crm") as string) || undefined,
                        observations: (fd.get("notes") as string) || undefined,
                      });
                    }} className="space-y-4">
                      <div>
                        <Label>Tipo de Exame</Label>
                        <Select name="examType" required>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admissional">Admissional</SelectItem>
                            <SelectItem value="Periódico">Periódico</SelectItem>
                            <SelectItem value="Retorno">Retorno ao Trabalho</SelectItem>
                            <SelectItem value="Mudança de Função">Mudança de Função</SelectItem>
                            <SelectItem value="Demissional">Demissional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Data do Exame</Label><Input name="examDate" type="date" required /></div>
                        <div><Label>Validade</Label><Input name="expirationDate" type="date" /></div>
                      </div>
                      <div>
                        <Label>Resultado</Label>
                        <Select name="result">
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Apto">Apto</SelectItem>
                            <SelectItem value="Inapto">Inapto</SelectItem>
                            <SelectItem value="Apto com Restrições">Apto com Restrições</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Médico</Label><Input name="doctorName" /></div>
                        <div><Label>CRM</Label><Input name="crm" /></div>
                      </div>
                      <div><Label>Observações</Label><Input name="notes" /></div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setExamDialog(false)}>Cancelar</Button>
                        <Button type="submit" disabled={createExamMutation.isPending}>
                          {createExamMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Salvar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                {!exams || exams.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum exame registrado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Validade</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Médico</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exams.map((ex: any) => (
                        <TableRow key={ex.id}>
                          <TableCell className="font-medium">{ex.examType}</TableCell>
                          <TableCell>{formatDate(ex.examDate)}</TableCell>
                          <TableCell>{formatDate(ex.expirationDate)}</TableCell>
                          <TableCell>
                            <Badge variant={ex.result === "Inapto" ? "destructive" : "secondary"}>
                              {ex.result || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell>{ex.doctorName || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BANCO DE HORAS */}
          <TabsContent value="banco-horas">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Banco de Horas</CardTitle></CardHeader>
              <CardContent className="p-0">
                {!timeBank || timeBank.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro de banco de horas.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês/Ano</TableHead>
                        <TableHead>Crédito (h)</TableHead>
                        <TableHead>Débito (h)</TableHead>
                        <TableHead>Saldo (h)</TableHead>
                        <TableHead>Vencimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeBank.map((tb: any) => (
                        <TableRow key={tb.id}>
                          <TableCell className="font-medium">{tb.referenceMonth}</TableCell>
                          <TableCell className="text-emerald-600">+{Number(tb.creditHours).toFixed(1)}</TableCell>
                          <TableCell className="text-destructive">-{Number(tb.debitHours).toFixed(1)}</TableCell>
                          <TableCell className="font-semibold">{Number(tb.balanceHours).toFixed(1)}</TableCell>
                          <TableCell>{formatDate(tb.expirationDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* EPIs */}
          <TabsContent value="epi">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Entregas de EPI</CardTitle></CardHeader>
              <CardContent className="p-0">
                {!ppeDeliveries || ppeDeliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma entrega de EPI registrada.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>EPI</TableHead>
                        <TableHead>CA</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Data Entrega</TableHead>
                        <TableHead>Devolução</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ppeDeliveries.map((ppe: any) => (
                        <TableRow key={ppe.id}>
                          <TableCell className="font-medium">{ppe.ppeDescription}</TableCell>
                          <TableCell>{ppe.caNumber || "-"}</TableCell>
                          <TableCell>{ppe.quantity}</TableCell>
                          <TableCell>{formatDate(ppe.deliveryDate)}</TableCell>
                          <TableCell>{formatDate(ppe.returnDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* DOSSIÊ DIGITAL */}
          <TabsContent value="documentos">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Dossiê Digital</CardTitle></CardHeader>
              <CardContent className="p-0">
                {!documents || documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum documento no dossiê.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Data Upload</TableHead>
                        <TableHead>Validade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc: any) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.documentName}</TableCell>
                          <TableCell><Badge variant="secondary">{doc.category}</Badge></TableCell>
                          <TableCell>{formatDate(doc.uploadDate)}</TableCell>
                          <TableCell>{formatDate(doc.expirationDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHECKLIST */}
          <TabsContent value="checklist">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-base">Checklist de Admissão</CardTitle></CardHeader>
              <CardContent>
                {!checklist || checklist.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum item no checklist.</p>
                ) : (
                  <div className="space-y-2">
                    {checklist.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <input
                          type="checkbox"
                          checked={!!item.isCompleted}
                          readOnly
                          className="h-4 w-4 rounded"
                        />
                        <span className={`text-sm ${item.isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {item.itemDescription}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value || "-"}</span>
    </div>
  );
}
