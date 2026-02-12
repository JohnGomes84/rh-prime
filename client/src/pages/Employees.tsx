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
import { Plus, Search, Eye, Loader2, AlertCircle } from "lucide-react";
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

  const { data: employees, isLoading } = trpc.employees.list.useQuery(
    search ? { search } : undefined
  );

  const utils = trpc.useUtils();
  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      utils.employees.list.invalidate();
      utils.dashboard.stats.invalidate();
      setGender("");
      setMaritalStatus("");
      setErrors({});
      setDialogOpen(false);
      toast.success("Funcionário cadastrado com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao cadastrar: " + err.message);
    },
  });

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
                      <Select value={gender} onValueChange={(value) => {
                        setGender(value);
                        if (errors.gender) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.gender;
                            return newErrors;
                          });
                        }
                      }}>
                        <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent container={dialogContentRef.current}>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && (
                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.gender}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="maritalStatus">Estado Civil *</Label>
                      <Select value={maritalStatus} onValueChange={(value) => {
                        setMaritalStatus(value);
                        if (errors.maritalStatus) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.maritalStatus;
                            return newErrors;
                          });
                        }
                      }}>
                        <SelectTrigger className={errors.maritalStatus ? "border-red-500" : ""}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent container={dialogContentRef.current}>
                          <SelectItem value="Solteiro">Solteiro(a)</SelectItem>
                          <SelectItem value="Casado">Casado(a)</SelectItem>
                          <SelectItem value="Divorciado">Divorciado(a)</SelectItem>
                          <SelectItem value="Viúvo">Viúvo(a)</SelectItem>
                          <SelectItem value="União Estável">União Estável</SelectItem>
                        </SelectContent>
                      </Select>
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
                    <div className="sm:col-span-2">
                      <Label htmlFor="addressStreet">Logradouro</Label>
                      <Input id="addressStreet" name="addressStreet" />
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
                      <Input id="addressNeighborhood" name="addressNeighborhood" />
                    </div>
                    <div>
                      <Label htmlFor="addressCity">Cidade</Label>
                      <Input id="addressCity" name="addressCity" />
                    </div>
                    <div>
                      <Label htmlFor="addressState">Estado</Label>
                      <Input id="addressState" name="addressState" placeholder="UF" maxLength={2} />
                    </div>
                    <div>
                      <Label htmlFor="addressZip">CEP</Label>
                      <Input id="addressZip" name="addressZip" placeholder="00000-000" />
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
