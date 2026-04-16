import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

type EmployeePaymentRecord = {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCpf: string;
  clientId: number;
  clientName: string;
  scheduleId: number;
  scheduleDate: string | Date;
  period: string;
  daysWorked: number;
  baseValue: number;
  mealAllowance: number;
  voucher: number;
  bonus: number;
  totalToPay: number;
  pixKey: string;
  pixType: string | null;
  status: string;
};

type ReceivableRecord = {
  id: number;
  description: string;
  amount: string;
  clientId: number | null;
  dueDate: string | Date;
  receiveDate?: string | Date | null;
  status: string;
  createdAt?: string | Date;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatDate = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "—";

const csvEscape = (value: string | number | null | undefined) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;

function matchesPeriod(dateLike: string | Date, period: string) {
  const date = new Date(dateLike);
  const now = new Date();

  if (Number.isNaN(date.getTime())) return false;

  if (period === "current") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  const monthsBack = period === "last3" ? 2 : 5;
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return date >= start && date <= end;
}

function downloadCsv(filename: string, rows: string[]) {
  const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function downloadFile(url: string, fallbackName: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro ao exportar" }));
    throw new Error(err.error || "Erro ao exportar");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition");
  let filename = fallbackName;
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) filename = match[1];
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export default function Payments() {
  const [activeTab, setActiveTab] = useState("employee");
  const [filterPeriod, setFilterPeriod] = useState("current");
  const [employeeStatus, setEmployeeStatus] = useState("all");
  const [receivableStatus, setReceivableStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [exportingReceivable, setExportingReceivable] = useState(false);

  const employeePaymentsQuery = trpc.financeiro.payments.list.useQuery();
  const receivablesQuery = trpc.financeiro.receivable.list.useQuery();

  const employeePayments = (employeePaymentsQuery.data || []) as EmployeePaymentRecord[];
  const clientReceivables = (receivablesQuery.data || []) as ReceivableRecord[];

  const filteredEmployeePayments = useMemo(
    () =>
      employeePayments.filter((payment: EmployeePaymentRecord) => {
        if (!matchesPeriod(payment.scheduleDate, filterPeriod)) return false;
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !normalizedSearch ||
          payment.employeeName.toLowerCase().includes(normalizedSearch) ||
          payment.employeeCpf.includes(normalizedSearch.replace(/\D/g, "")) ||
          payment.pixKey.toLowerCase().includes(normalizedSearch) ||
          payment.clientName.toLowerCase().includes(normalizedSearch);
        const matchesStatus = employeeStatus === "all" || payment.status === employeeStatus;
        return matchesSearch && matchesStatus;
      }),
    [employeePayments, filterPeriod, employeeStatus, searchTerm]
  );

  const filteredClientReceivables = useMemo(
    () =>
      clientReceivables.filter((receivable: ReceivableRecord) => {
        if (!matchesPeriod(receivable.dueDate, filterPeriod)) return false;
        const normalizedSearch = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !normalizedSearch ||
          receivable.description.toLowerCase().includes(normalizedSearch);
        const matchesStatus =
          receivableStatus === "all" || receivable.status === receivableStatus;
        return matchesSearch && matchesStatus;
      }),
    [clientReceivables, filterPeriod, receivableStatus, searchTerm]
  );

  const employeeKPIs = useMemo(
    () => ({
      totalToPay: filteredEmployeePayments.reduce(
        (sum: number, payment: EmployeePaymentRecord) => sum + payment.totalToPay,
        0
      ),
      employees: new Set(
        filteredEmployeePayments.map((payment: EmployeePaymentRecord) => payment.employeeId)
      ).size,
      daysWorked: filteredEmployeePayments.reduce(
        (sum: number, payment: EmployeePaymentRecord) => sum + payment.daysWorked,
        0
      ),
      noPix: filteredEmployeePayments.filter(
        (payment: EmployeePaymentRecord) => payment.status === "no_pix"
      ).length,
    }),
    [filteredEmployeePayments]
  );

  const clientKPIs = useMemo(
    () => ({
      totalReceivable: filteredClientReceivables.reduce(
        (sum: number, receivable: ReceivableRecord) => sum + Number(receivable.amount || 0),
        0
      ),
      clients: new Set(
        filteredClientReceivables
          .map((receivable: ReceivableRecord) => receivable.clientId)
          .filter(Boolean)
      ).size,
      pending: filteredClientReceivables.filter(
        (receivable: ReceivableRecord) => receivable.status === "pendente"
      ).length,
      overdue: filteredClientReceivables.filter((receivable: ReceivableRecord) => {
        const dueDate = new Date(receivable.dueDate);
        return receivable.status !== "recebido" && dueDate < new Date();
      }).length,
    }),
    [filteredClientReceivables]
  );

  const isLoading = employeePaymentsQuery.isLoading || receivablesQuery.isLoading;

  const handleExportEmployeeCsv = () => {
    const header = [
      "Funcionário",
      "CPF",
      "Cliente",
      "Data",
      "Base",
      "Marmita",
      "Vale",
      "Bônus",
      "Total",
      "PIX",
      "Status",
    ];
    const rows = filteredEmployeePayments.map((payment: EmployeePaymentRecord) =>
      [
        csvEscape(payment.employeeName),
        csvEscape(payment.employeeCpf),
        csvEscape(payment.clientName),
        csvEscape(formatDate(payment.scheduleDate)),
        csvEscape(payment.baseValue.toFixed(2)),
        csvEscape(payment.mealAllowance.toFixed(2)),
        csvEscape(payment.voucher.toFixed(2)),
        csvEscape(payment.bonus.toFixed(2)),
        csvEscape(payment.totalToPay.toFixed(2)),
        csvEscape(payment.pixKey || "Sem PIX"),
        csvEscape(payment.status),
      ].join(",")
    );

    downloadCsv("pagamentos-funcionarios.csv", [header.join(","), ...rows]);
    toast.success("CSV de pagamentos gerado");
  };

  const handleExportReceivables = async () => {
    setExportingReceivable(true);
    try {
      await downloadFile("/api/reports/receivable/excel", "contas_a_receber.xlsx");
      toast.success("Excel exportado com sucesso");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao exportar");
    } finally {
      setExportingReceivable(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pagamentos e Recebimentos</h1>
        <p className="text-muted-foreground">
          Consolide os pagamentos dos diaristas validados e acompanhe os recebimentos dos clientes
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employee">Pagamento de Funcionários</TabsTrigger>
          <TabsTrigger value="client">Recebimento de Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="employee" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total a Pagar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(employeeKPIs.totalToPay)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Funcionários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employeeKPIs.employees}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dias Trabalhados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employeeKPIs.daysWorked}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sem PIX</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{employeeKPIs.noPix}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Período</label>
                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Mês Atual</SelectItem>
                      <SelectItem value="last3">Últimos 3 Meses</SelectItem>
                      <SelectItem value="last6">Últimos 6 Meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={employeeStatus} onValueChange={setEmployeeStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="no_pix">Sem PIX</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Buscar</label>
                  <Input
                    placeholder="Nome, CPF, cliente ou PIX..."
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Registros de Pagamento</CardTitle>
                <CardDescription>{filteredEmployeePayments.length} registros</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportEmployeeCsv}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button size="sm" onClick={() => { window.location.href = "/payment-batches"; }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Gerar Lote
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando pagamentos...
                </div>
              ) : filteredEmployeePayments.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum pagamento encontrado para os filtros atuais.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left">Funcionário</th>
                        <th className="px-4 py-2 text-left">Cliente</th>
                        <th className="px-4 py-2 text-left">Data</th>
                        <th className="px-4 py-2 text-right">Base</th>
                        <th className="px-4 py-2 text-right">Marmita</th>
                        <th className="px-4 py-2 text-right">Vale</th>
                        <th className="px-4 py-2 text-right">Bônus</th>
                        <th className="px-4 py-2 text-right">Total</th>
                        <th className="px-4 py-2 text-left">PIX</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployeePayments.map((payment: EmployeePaymentRecord) => (
                        <tr key={payment.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-2">
                            <div className="font-medium">{payment.employeeName}</div>
                            <div className="text-xs text-muted-foreground">{payment.employeeCpf || "Sem CPF"}</div>
                          </td>
                          <td className="px-4 py-2">{payment.clientName}</td>
                          <td className="px-4 py-2">{formatDate(payment.scheduleDate)}</td>
                          <td className="px-4 py-2 text-right">{formatCurrency(payment.baseValue)}</td>
                          <td className="px-4 py-2 text-right">-{formatCurrency(payment.mealAllowance)}</td>
                          <td className="px-4 py-2 text-right">-{formatCurrency(payment.voucher)}</td>
                          <td className="px-4 py-2 text-right">+{formatCurrency(payment.bonus)}</td>
                          <td className="px-4 py-2 text-right font-bold">{formatCurrency(payment.totalToPay)}</td>
                          <td className="px-4 py-2">
                            <span className="rounded bg-muted px-2 py-1 text-xs">
                              {payment.pixType || "Sem PIX"}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`rounded px-2 py-1 text-xs ${
                                payment.status === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : payment.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {payment.status === "paid"
                                ? "Pago"
                                : payment.status === "pending"
                                  ? "Pendente"
                                  : "Sem PIX"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total a Receber</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(clientKPIs.totalReceivable)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clientKPIs.clients}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clientKPIs.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vencido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{clientKPIs.overdue}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Período</label>
                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Mês Atual</SelectItem>
                      <SelectItem value="last3">Últimos 3 Meses</SelectItem>
                      <SelectItem value="last6">Últimos 6 Meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select value={receivableStatus} onValueChange={setReceivableStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="recebido">Recebido</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Buscar</label>
                  <Input
                    placeholder="Descrição..."
                    value={searchTerm}
                    onChange={event => setSearchTerm(event.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Contas a Receber</CardTitle>
                <CardDescription>{filteredClientReceivables.length} registros</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportReceivables} disabled={exportingReceivable}>
                {exportingReceivable ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Carregando recebimentos...
                </div>
              ) : filteredClientReceivables.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum recebimento encontrado para os filtros atuais.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left">Descrição</th>
                        <th className="px-4 py-2 text-right">Valor</th>
                        <th className="px-4 py-2 text-left">Emissão</th>
                        <th className="px-4 py-2 text-left">Vencimento</th>
                        <th className="px-4 py-2 text-left">Recebimento</th>
                        <th className="px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClientReceivables.map((receivable: ReceivableRecord) => (
                        <tr key={receivable.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-2 text-xs">{receivable.description}</td>
                          <td className="px-4 py-2 text-right font-bold">
                            {formatCurrency(Number(receivable.amount || 0))}
                          </td>
                          <td className="px-4 py-2 text-xs">{formatDate(receivable.createdAt || receivable.dueDate)}</td>
                          <td className="px-4 py-2 text-xs">{formatDate(receivable.dueDate)}</td>
                          <td className="px-4 py-2 text-xs">{formatDate(receivable.receiveDate)}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`rounded px-2 py-1 text-xs ${
                                receivable.status === "recebido"
                                  ? "bg-green-100 text-green-800"
                                  : receivable.status === "vencido"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {receivable.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
