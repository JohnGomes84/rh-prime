import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { validateEmployeeForm, formatCPF, formatPhone } from "@/lib/validation";
import { Plus, Search, Eye, Loader2, AlertCircle, Trash2, Upload, CheckCircle2, XCircle, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Employees() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // Address state for CEP autofill + state/city dropdowns
  const [addressZip, setAddressZip] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  const { data: states = [] } = trpc.lookup.states.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
  });
  const { data: cities = [] } = trpc.lookup.cities.useQuery(
    { uf: addressState },
    { enabled: addressState.length === 2, staleTime: 24 * 60 * 60 * 1000 }
  );
  const trpcUtils = trpc.useUtils();

  const onCepBlur = async () => {
    const digits = addressZip.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const data = await trpcUtils.lookup.cep.fetch({ cep: digits });
      if (data) {
        if (data.street) setAddressStreet(data.street);
        if (data.neighborhood) setAddressNeighborhood(data.neighborhood);
        if (data.state) setAddressState(data.state);
        if (data.city) setAddressCity(data.city);
        toast.success("Endereço preenchido pelo CEP");
      } else {
        toast.error("CEP não encontrado");
      }
    } catch {
      toast.error("Falha ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const resetAddress = () => {
    setAddressZip("");
    setAddressStreet("");
    setAddressNeighborhood("");
    setAddressCity("");
    setAddressState("");
  };

  // Bulk import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const bulkImport = trpc.employees.bulkImport.useMutation();

  const handleSpreadsheetSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportPreview(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]!];
      if (!ws) {
        toast.error("Planilha vazia");
        return;
      }
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
      if (rows.length === 0) {
        toast.error("Nenhuma linha encontrada");
        return;
      }
      if (rows.length > 2000) {
        toast.error("Máximo 2000 linhas por importação");
        return;
      }
      const result = await bulkImport.mutateAsync({ rows: rows as any[], dryRun: true });
      setImportPreview(result);
    } catch (err: any) {
      toast.error("Falha ao ler planilha: " + (err?.message ?? String(err)));
    }
  };

  const handleCommitImport = async () => {
    if (!importPreview) return;
    const validRows = importPreview.results
      .filter((r: any) => r.status === "valid")
      .map((r: any) => r.data);
    if (validRows.length === 0) {
      toast.error("Nenhuma linha válida para importar");
      return;
    }
    try {
      const result = await bulkImport.mutateAsync({ rows: validRows, dryRun: false });
      toast.success(`${result.inserted} funcionários importados; ${result.skipped} ignorados; ${result.failed?.length ?? 0} falhas`);
      utils.employees.list.invalidate();
      utils.dashboard.stats.invalidate();
      setImportDialogOpen(false);
      setImportPreview(null);
      setImportFileName("");
    } catch (err: any) {
      toast.error("Falha ao importar: " + (err?.message ?? String(err)));
    }
  };

  const { data: employeesResult, isLoading } = trpc.employees.list.useQuery(
    search ? { search } : undefined
  );
  const employees = employeesResult?.data || (Array.isArray(employeesResult) ? employeesResult : []);

  const utils = trpc.useUtils();
  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      utils.employees.list.invalidate();
      utils.dashboard.stats.invalidate();
      setGender("");
      setMaritalStatus("");
      setErrors({});
      resetAddress();
      setDialogOpen(false);
      toast.success("Funcionário cadastrado com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao cadastrar: " + err.message);
    },
  });

  const deleteMutation = trpc.employees.delete.useMutation({
    onSuccess: () => {
      utils.employees.list.invalidate();
      utils.dashboard.stats.invalidate();
      toast.success("Funcionário deletado com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao deletar: " + err.message);
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Tem certeza que deseja deletar ${name}? Esta ação não pode ser desfeita.`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    // Validar formulário
    const validationErrors = validateEmployeeForm({
      fullName: fd.get("fullName") as string,
      cpf: fd.get("cpf") as string,
      email: (fd.get("email") as string) || undefined,
      phone: (fd.get("phone") as string) || undefined,
      gender,
      maritalStatus,
    });
    
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach((error) => {
        errorMap[error.field] = error.message;
      });
      setErrors(errorMap);
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }
    
    setErrors({});
    createMutation.mutate({
      fullName: fd.get("fullName") as string,
      cpf: fd.get("cpf") as string,
      socialName: (fd.get("socialName") as string) || undefined,
      email: (fd.get("email") as string) || undefined,
      phone: (fd.get("phone") as string) || undefined,
      birthDate: (fd.get("birthDate") as string) || undefined,
      gender: (gender as "M" | "F" | "Outro") || undefined,
      maritalStatus: (maritalStatus as "Solteiro" | "Casado" | "Divorciado" | "Viúvo" | "União Estável") || undefined,
      rg: (fd.get("rg") as string) || undefined,
      pisPasep: (fd.get("pisPasep") as string) || undefined,
      ctpsNumber: (fd.get("ctpsNumber") as string) || undefined,
      ctpsSeries: (fd.get("ctpsSeries") as string) || undefined,
      addressStreet: (fd.get("addressStreet") as string) || undefined,
      addressNumber: (fd.get("addressNumber") as string) || undefined,
      addressComplement: (fd.get("addressComplement") as string) || undefined,
      addressNeighborhood: (fd.get("addressNeighborhood") as string) || undefined,
      addressCity: (fd.get("addressCity") as string) || undefined,
      addressState: (fd.get("addressState") as string) || undefined,
      addressZip: (fd.get("addressZip") as string) || undefined,
      bankName: (fd.get("bankName") as string) || undefined,
      bankAgency: (fd.get("bankAgency") as string) || undefined,
      bankAccount: (fd.get("bankAccount") as string) || undefined,
      pixKey: (fd.get("pixKey") as string) || undefined,
      branch: (fd.get("branch") as string) || undefined,
      externalCode: (fd.get("externalCode") as string) || undefined,
      costCenter: (fd.get("costCenter") as string) || undefined,
      corporateEmail: (fd.get("corporateEmail") as string) || undefined,
      employmentType: (fd.get("employmentType") as "CLT" | "CLT_Comissao" | "Comissionado" | "Concursado" | "Contrato" | "Cooperado" | "Efetivo" | "Estagio" | "Estatutario" | "MenorAprendiz" | "JovemAprendiz" | "PrestadorServico" | "Socio" | "Temporario" | "Outro") || undefined,
      esocialMatricula: (fd.get("esocialMatricula") as string) || undefined,
      insalubrityPercentage: (fd.get("insalubrityPercentage") as "0" | "10" | "20" | "40") || undefined,
    });
  };

  const statusColor = (status: string | null) => {
    switch (status) {
      case "Ativo": return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200";
      case "Inativo": return "bg-gray-100 text-gray-600 hover:bg-gray-200";
      case "Afastado": return "bg-amber-100 text-amber-700 hover:bg-amber-200";
      case "Férias": return "bg-blue-100 text-blue-700 hover:bg-blue-200";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
            <p className="text-muted-foreground mt-1">
              Cadastro e gestão de colaboradores
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar planilha
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Importar funcionários de planilha</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                    <p className="font-medium flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" /> Formatos aceitos: XLSX, XLS, CSV
                    </p>
                    <p className="text-muted-foreground">
                      Cabeçalhos esperados (português ou inglês):{" "}
                      <code className="text-xs">nome, cpf, rg, email, telefone, data nascimento, genero,
                      estado civil, logradouro, numero, complemento, bairro, cidade, estado, cep, status</code>.
                      Apenas <strong>nome</strong> e <strong>cpf</strong> são obrigatórios.
                    </p>
                  </div>

                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleSpreadsheetSelect}
                    disabled={bulkImport.isPending}
                  />
                  {importFileName && <p className="text-xs text-muted-foreground">Arquivo: {importFileName}</p>}

                  {bulkImport.isPending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validando linhas...
                    </div>
                  )}

                  {importPreview && (
                    <>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-md border p-2">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-lg font-bold">{importPreview.total}</p>
                        </div>
                        <div className="rounded-md border border-green-200 bg-green-50 p-2">
                          <p className="text-xs text-green-700">Válidas</p>
                          <p className="text-lg font-bold text-green-700">{importPreview.valid}</p>
                        </div>
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                          <p className="text-xs text-amber-700">Duplicadas</p>
                          <p className="text-lg font-bold text-amber-700">{importPreview.duplicate}</p>
                        </div>
                        <div className="rounded-md border border-red-200 bg-red-50 p-2">
                          <p className="text-xs text-red-700">Inválidas</p>
                          <p className="text-lg font-bold text-red-700">{importPreview.invalid}</p>
                        </div>
                      </div>

                      <div className="rounded-md border max-h-72 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-muted">
                            <tr>
                              <th className="text-left p-2">#</th>
                              <th className="text-left p-2">Status</th>
                              <th className="text-left p-2">Nome</th>
                              <th className="text-left p-2">CPF</th>
                              <th className="text-left p-2">Erros</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.results.map((r: any) => (
                              <tr key={r.index} className="border-t">
                                <td className="p-2">{r.index + 1}</td>
                                <td className="p-2">
                                  {r.status === "valid" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                  {r.status === "duplicate" && <AlertCircle className="w-4 h-4 text-amber-600" />}
                                  {r.status === "invalid" && <XCircle className="w-4 h-4 text-red-600" />}
                                </td>
                                <td className="p-2">{r.data.fullName ?? "—"}</td>
                                <td className="p-2 font-mono">{r.data.cpf ?? "—"}</td>
                                <td className="p-2 text-muted-foreground">{r.errors.join("; ")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => { setImportPreview(null); setImportFileName(""); }}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCommitImport}
                          disabled={importPreview.valid === 0 || bulkImport.isPending}
                        >
                          {bulkImport.isPending ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</>
                          ) : (
                            <>Importar {importPreview.valid} válidas</>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Funcionário
                </Button>
              </DialogTrigger>
            <DialogContent ref={dialogContentRef} className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Funcionário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados Pessoais */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Dados Pessoais
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">                    <div>
                      <Label htmlFor="fullName">Nome Completo *</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        placeholder="João da Silva"
                        required
                        className={errors.fullName ? "border-red-500" : ""}
                      />
                      {errors.fullName && (
                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.fullName}
                        </p>
                      )}
                    </div>                    <div>
                      <Label htmlFor="socialName">Nome Social</Label>
                      <Input id="socialName" name="socialName" />
                    </div>
                    <div>
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input
                        id="cpf"
                        name="cpf"
                        placeholder="000.000.000-00"
                        required
                        className={errors.cpf ? "border-red-500" : ""}
                        onBlur={(e) => {
                          const formatted = formatCPF(e.target.value);
                          e.target.value = formatted;
                        }}
                      />
                      {errors.cpf && (
                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.cpf}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="rg">RG</Label>
                      <Input id="rg" name="rg" />
                    </div>
                    <div>
                      <Label htmlFor="birthDate">Data de Nascimento</Label>
                      <Input id="birthDate" name="birthDate" type="date" />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gênero *</Label>
                      <select
                        id="gender"
                        value={gender}
                        onChange={(e) => {
                          setGender(e.target.value);
                          if (errors.gender) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.gender;
                              return newErrors;
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-md bg-background text-foreground ${errors.gender ? "border-red-500" : "border-input"}`}
                      >
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                      {errors.gender && (
                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.gender}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="maritalStatus">Estado Civil *</Label>
                      <select
                        id="maritalStatus"
                        value={maritalStatus}
                        onChange={(e) => {
                          setMaritalStatus(e.target.value);
                          if (errors.maritalStatus) {
                            setErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.maritalStatus;
                              return newErrors;
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-md bg-background text-foreground ${errors.maritalStatus ? "border-red-500" : "border-input"}`}
                      >
                        <option value="">Selecione</option>
                        <option value="Solteiro">Solteiro(a)</option>
                        <option value="Casado">Casado(a)</option>
                        <option value="Divorciado">Divorciado(a)</option>
                        <option value="Viúvo">Viúvo(a)</option>
                        <option value="União Estável">União Estável</option>
                      </select>
                      {errors.maritalStatus && (
                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.maritalStatus}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        className={errors.email ? "border-red-500" : ""}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="(00) 00000-0000"
                        className={errors.phone ? "border-red-500" : ""}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          e.target.value = formatted;
                        }}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Documentos */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Documentos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pisPasep">PIS/PASEP</Label>
                      <Input id="pisPasep" name="pisPasep" />
                    </div>
                    <div>
                      <Label htmlFor="ctpsNumber">CTPS Número</Label>
                      <Input id="ctpsNumber" name="ctpsNumber" />
                    </div>
                    <div>
                      <Label htmlFor="ctpsSeries">CTPS Série</Label>
                      <Input id="ctpsSeries" name="ctpsSeries" />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Endereço
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="addressZip">CEP {cepLoading && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}</Label>
                      <Input
                        id="addressZip"
                        name="addressZip"
                        placeholder="00000-000"
                        value={addressZip}
                        onChange={(e) => setAddressZip(e.target.value)}
                        onBlur={onCepBlur}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="addressStreet">Logradouro</Label>
                      <Input
                        id="addressStreet"
                        name="addressStreet"
                        value={addressStreet}
                        onChange={(e) => setAddressStreet(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addressNumber">Número</Label>
                      <Input id="addressNumber" name="addressNumber" />
                    </div>
                    <div>
                      <Label htmlFor="addressComplement">Complemento</Label>
                      <Input id="addressComplement" name="addressComplement" />
                    </div>
                    <div>
                      <Label htmlFor="addressNeighborhood">Bairro</Label>
                      <Input
                        id="addressNeighborhood"
                        name="addressNeighborhood"
                        value={addressNeighborhood}
                        onChange={(e) => setAddressNeighborhood(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addressState">Estado</Label>
                      <input type="hidden" name="addressState" value={addressState} />
                      <Select value={addressState} onValueChange={(v) => { setAddressState(v); setAddressCity(""); }}>
                        <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          {states.map((s: any) => (
                            <SelectItem key={s.id} value={s.sigla}>{s.sigla} — {s.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="addressCity">Cidade</Label>
                      <input type="hidden" name="addressCity" value={addressCity} />
                      <Select value={addressCity} onValueChange={setAddressCity} disabled={!addressState}>
                        <SelectTrigger><SelectValue placeholder={addressState ? "Selecione" : "Selecione UF primeiro"} /></SelectTrigger>
                        <SelectContent>
                          {cities.map((c: any) => (
                            <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Dados Contratuais Críticos */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Dados Contratuais
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="branch">Filial</Label>
                      <Input id="branch" name="branch" placeholder="Matriz, Filial 1, etc" />
                    </div>
                    <div>
                      <Label htmlFor="externalCode">Código Externo</Label>
                      <Input id="externalCode" name="externalCode" placeholder="Para integração" />
                    </div>
                    <div>
                      <Label htmlFor="costCenter">Centro de Custo</Label>
                      <Input id="costCenter" name="costCenter" placeholder="CC-001" />
                    </div>
                    <div>
                      <Label htmlFor="corporateEmail">E-mail Corporativo</Label>
                      <Input id="corporateEmail" name="corporateEmail" type="email" />
                    </div>
                    <div>
                      <Label htmlFor="employmentType">Tipo de Vínculo</Label>
                      <select
                        id="employmentType"
                        name="employmentType"
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                      >
                        <option value="CLT">CLT</option>
                        <option value="CLT_Comissao">CLT + Comissão</option>
                        <option value="Comissionado">Comissionado</option>
                        <option value="Concursado">Concursado</option>
                        <option value="Contrato">Contrato</option>
                        <option value="Cooperado">Cooperado</option>
                        <option value="Efetivo">Efetivo</option>
                        <option value="Estagio">Estágio</option>
                        <option value="Estatutario">Estatutário</option>
                        <option value="MenorAprendiz">Menor Aprendiz</option>
                        <option value="JovemAprendiz">Jovem Aprendiz</option>
                        <option value="PrestadorServico">Prestador de Serviço</option>
                        <option value="Socio">Sócio</option>
                        <option value="Temporario">Temporário</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="esocialMatricula">Matrícula eSocial</Label>
                      <Input id="esocialMatricula" name="esocialMatricula" placeholder="Número eSocial" />
                    </div>
                    <div>
                      <Label htmlFor="insalubrityPercentage">Percentual Insalubridade</Label>
                      <select
                        id="insalubrityPercentage"
                        name="insalubrityPercentage"
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                      >
                        <option value="0">Nenhuma (0%)</option>
                        <option value="10">10%</option>
                        <option value="20">20%</option>
                        <option value="40">40%</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dados Bancários */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                    Dados Bancários
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankName">Banco</Label>
                      <Input id="bankName" name="bankName" />
                    </div>
                    <div>
                      <Label htmlFor="bankAgency">Agência</Label>
                      <Input id="bankAgency" name="bankAgency" />
                    </div>
                    <div>
                      <Label htmlFor="bankAccount">Conta</Label>
                      <Input id="bankAccount" name="bankAccount" />
                    </div>
                    <div>
                      <Label htmlFor="pixKey">Chave PIX</Label>
                      <Input id="pixKey" name="pixKey" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Cadastrar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Search */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !employees || employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "Nenhum funcionário encontrado para esta busca."
                    : "Nenhum funcionário cadastrado. Clique em \"Novo Funcionário\" para começar."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow
                        key={emp.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/funcionarios/${emp.id}`)}
                      >
                        <TableCell className="font-medium">{emp.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{emp.cpf}</TableCell>
                        <TableCell className="text-muted-foreground">{emp.email || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{emp.phone || "-"}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(emp.status)} variant="secondary">
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/funcionarios/${emp.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(emp.id, emp.fullName);
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
