import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Download, FileText, Loader2, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Cálculo INSS progressivo 2026
function calcINSS(gross: number) {
  const rates = [
    { max: 1412.00, rate: 0.075 },
    { max: 2666.68, rate: 0.09 },
    { max: 4000.03, rate: 0.12 },
    { max: 7786.02, rate: 0.14 },
  ];
  let inss = 0, prev = 0;
  for (const b of rates) {
    if (gross <= prev) break;
    const taxable = Math.min(gross, b.max) - prev;
    inss += taxable * b.rate;
    prev = b.max;
  }
  return Math.min(inss, 1090.44);
}

// Cálculo IR 2026
function calcIR(gross: number, inss: number) {
  const base = gross - inss;
  const rates = [
    { max: 2428.80, rate: 0, ded: 0 },
    { max: 3270.38, rate: 0.075, ded: 182.16 },
    { max: 4462.74, rate: 0.15, ded: 427.36 },
    { max: 5573.42, rate: 0.225, ded: 761.83 },
    { max: Infinity, rate: 0.275, ded: 1040.20 },
  ];
  for (const b of rates) {
    if (base <= b.max) return Math.max(base * b.rate - b.ded, 0);
  }
  return 0;
}

export function Payslip() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' }, { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' }, { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
  ];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Buscar dados do funcionário logado
  const { data: employeesData, isLoading } = trpc.employees.list.useQuery(undefined);
  const employees = (employeesData as any)?.employees || employeesData || [];

  // Tentar encontrar o funcionário pelo user logado
  const myEmployee = useMemo(() => {
    if (!user || !employees.length) return null;
    return employees.find((e: any) =>
      String(e.userId) === String(user.id) ||
      e.email === user.email ||
      e.fullName === user.name
    ) || employees[0]; // fallback para admin: primeiro funcionário
  }, [user, employees]);

  const salary = Number(myEmployee?.salary || myEmployee?.baseSalary || 0);

  const payroll = useMemo(() => {
    if (!salary) return null;
    const inss = calcINSS(salary);
    const ir = calcIR(salary, inss);
    const fgts = salary * 0.08;
    return {
      baseSalary: salary,
      grossSalary: salary,
      inss,
      ir,
      fgts,
      totalDescontos: inss + ir,
      netSalary: salary - inss - ir,
    };
  }, [salary]);

  const monthLabel = months.find(m => m.value === selectedMonth)?.label || '';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meu Holerite</h1>
          <p className="text-muted-foreground mt-1">Visualize o detalhamento da sua folha</p>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Mês</label>
                <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ano</label>
                <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Holerite */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Carregando dados...
          </div>
        ) : !myEmployee || !payroll ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhum dado salarial encontrado</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Verifique se seu cadastro possui salário informado
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {monthLabel} / {selectedYear}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {myEmployee.fullName || myEmployee.socialName} — CPF: {myEmployee.cpf || '***'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Proventos */}
              <div className="bg-emerald-50 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-800 mb-3 text-sm uppercase tracking-wide">Proventos</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Salário Base</span>
                    <span className="font-mono">{formatBRL(payroll.baseSalary)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold mt-3 pt-2 border-t border-emerald-200 text-sm">
                  <span>Total Bruto</span>
                  <span className="font-mono">{formatBRL(payroll.grossSalary)}</span>
                </div>
              </div>

              {/* Descontos */}
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-3 text-sm uppercase tracking-wide">Descontos</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>INSS</span>
                    <span className="font-mono text-red-600">-{formatBRL(payroll.inss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IRRF</span>
                    <span className="font-mono text-red-600">-{formatBRL(payroll.ir)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold mt-3 pt-2 border-t border-red-200 text-sm">
                  <span>Total Descontos</span>
                  <span className="font-mono text-red-600">-{formatBRL(payroll.totalDescontos)}</span>
                </div>
              </div>

              {/* FGTS */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-blue-800">FGTS (recolhido pela empresa)</span>
                  <span className="font-mono">{formatBRL(payroll.fgts)}</span>
                </div>
              </div>

              {/* Líquido */}
              <div className="bg-gray-900 text-white rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Salário Líquido</span>
                  <span className="font-bold text-2xl font-mono">{formatBRL(payroll.netSalary)}</span>
                </div>
              </div>

              <Button
                onClick={() => toast.info('Funcionalidade de download PDF em desenvolvimento')}
                className="w-full gap-2"
              >
                <Download className="w-4 h-4" />
                Baixar PDF
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
