import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

export function Payslip() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Marco" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const { data, isLoading } = trpc.payroll.employeePayslip.useQuery(
    { employeeId: Number(user?.id ?? 0), month: selectedMonth, year: selectedYear },
    { enabled: !!user?.id }
  );

  const periodLabel = useMemo(
    () => `${months.find((month) => month.value === selectedMonth)?.label ?? selectedMonth}/${selectedYear}`,
    [selectedMonth, selectedYear]
  );

  const downloadText = () => {
    if (!data) return;
    const content = [
      `Holerite - ${periodLabel}`,
      `Funcionario: ${data.employee.fullName}`,
      `CPF: ${data.employee.cpf}`,
      `Salario base: R$ ${data.breakdown.baseSalary.toFixed(2)}`,
      `Horas extras: ${data.overtime.totalOvertimeHours}h`,
      `INSS: R$ ${data.breakdown.inss.toFixed(2)}`,
      `IR: R$ ${data.breakdown.ir.toFixed(2)}`,
      `FGTS: R$ ${data.breakdown.fgts.toFixed(2)}`,
      `Liquido: R$ ${data.breakdown.netSalary.toFixed(2)}`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `holerite-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Holerite exportado em texto.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Holerite</h1>
        <p className="text-muted-foreground mt-2">Visualize seu demonstrativo calculado com base no back-end de folha.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Mes</label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value, 10))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Ano</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value, 10))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" disabled={isLoading}>Atualizar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Holerite - {periodLabel}
          </CardTitle>
          <CardDescription>Dados de contrato, dependentes, beneficios e horas extras.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading || !data ? (
            <p className="text-muted-foreground">Carregando demonstrativo...</p>
          ) : (
            <>
              <div className="border-b pb-4">
                <h3 className="font-bold text-lg">RH Prime</h3>
                <p className="text-sm text-muted-foreground">Periodo: {periodLabel}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Funcionario</p>
                  <p className="font-semibold">{data.employee.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CPF</p>
                  <p className="font-semibold">{data.employee.cpf}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contrato</p>
                  <p className="font-semibold">{data.contract?.contractType || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dependentes</p>
                  <p className="font-semibold">{data.dependentsCount}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-3">PROVENTOS</h4>
                <div className="space-y-2 border-b pb-3">
                  <div className="flex justify-between"><span>Salario Base</span><span>R$ {data.breakdown.baseSalary.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between"><span>Horas Extras</span><span>R$ {data.breakdown.overtimeValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>Total Bruto</span><span>R$ {data.breakdown.grossSalary.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-3">DESCONTOS</h4>
                <div className="space-y-2 border-b pb-3">
                  <div className="flex justify-between"><span>INSS</span><span>-R$ {data.breakdown.inss.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between"><span>IR</span><span>-R$ {data.breakdown.ir.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between"><span>Outros Descontos</span><span>-R$ {data.breakdown.otherDeductions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">SALARIO LIQUIDO</span>
                  <span className="font-bold text-2xl text-green-600">R$ {data.breakdown.netSalary.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">FGTS</p>
                  <p className="font-semibold">R$ {data.breakdown.fgts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Horas Extras</p>
                  <p className="font-semibold">{data.overtime.totalOvertimeHours}h</p>
                </div>
              </div>

              <Button onClick={downloadText} className="w-full gap-2">
                <Download className="w-4 h-4" />
                Baixar Demonstrativo
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
