import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import {
  Download, Eye, Calendar, DollarSign, Users, Calculator,
  ChevronLeft, ChevronRight, Loader2, FileText, AlertCircle,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Payroll() {
  const { user } = useAuth();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showPayslipDialog, setShowPayslipDialog] = useState(false);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);
  const month = targetDate.getMonth() + 1;
  const year = targetDate.getFullYear();
  const monthLabel = targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Buscar funcionários reais do banco
  const { data: employeesData, isLoading: loadingEmployees } = trpc.employees.list.useQuery(undefined);
  const employees = (employeesData as any)?.employees || employeesData || [];

  // Buscar cargos para exibir nome do cargo
  const { data: positionsData } = trpc.positions.list.useQuery(undefined);
  const positions = (positionsData as any)?.positions || positionsData || [];

  // Estatísticas calculadas
  const stats = useMemo(() => {
    if (!employees.length) return { folhaTotal: 0, colaboradores: 0 };
    const total = employees.reduce((sum: number, emp: any) => {
      const salary = Number(emp.salary || emp.baseSalary || 0);
      return sum + salary;
    }, 0);
    return {
      folhaTotal: total,
      colaboradores: employees.length,
    };
  }, [employees]);

  const getPositionName = (positionId: any) => {
    if (!positionId || !positions.length) return '—';
    const pos = positions.find((p: any) => String(p.id) === String(positionId));
    return pos?.title || pos?.name || '—';
  };

  const handleViewPayslip = (emp: any) => {
    const salary = Number(emp.salary || emp.baseSalary || 0);
    if (!salary) {
      toast.error('Funcionário sem salário cadastrado');
      return;
    }
    // Calcular localmente usando a mesma lógica do payroll-calculator
    const baseSalary = salary;
    const grossSalary = baseSalary;

    // INSS progressivo 2026
    const inssRates = [
      { min: 0, max: 1412.00, rate: 0.075 },
      { min: 1412.01, max: 2666.68, rate: 0.09 },
      { min: 2666.69, max: 4000.03, rate: 0.12 },
      { min: 4000.04, max: 7786.02, rate: 0.14 },
    ];
    let inss = 0;
    let remaining = grossSalary;
    for (const bracket of inssRates) {
      if (remaining <= 0) break;
      const range = bracket.max - bracket.min;
      const taxable = Math.min(remaining, range);
      inss += taxable * bracket.rate;
      remaining -= taxable;
    }
    inss = Math.min(inss, 1090.44);

    // IR 2026
    const irBase = grossSalary - inss;
    const irRates = [
      { min: 0, max: 2428.80, rate: 0, deduction: 0 },
      { min: 2428.81, max: 3270.38, rate: 0.075, deduction: 182.16 },
      { min: 3270.39, max: 4462.74, rate: 0.15, deduction: 427.36 },
      { min: 4462.75, max: 5573.42, rate: 0.225, deduction: 761.83 },
      { min: 5573.43, max: Infinity, rate: 0.275, deduction: 1040.20 },
    ];
    let ir = 0;
    for (const bracket of irRates) {
      if (irBase >= bracket.min && irBase <= bracket.max) {
        ir = irBase * bracket.rate - bracket.deduction;
        break;
      }
    }
    ir = Math.max(ir, 0);

    const fgts = grossSalary * 0.08;
    const netSalary = grossSalary - inss - ir;

    setSelectedEmployee({
      ...emp,
      payroll: {
        baseSalary, grossSalary, inss, ir, fgts, netSalary,
        month, year,
      },
    });
    setShowPayslipDialog(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Folha de Pagamento</h1>
            <p className="text-muted-foreground mt-1">Gerencie salários, benefícios e holerites</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setMonthOffset(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center capitalize">{monthLabel}</span>
            {monthOffset !== 0 && (
              <Button size="sm" variant="outline" onClick={() => setMonthOffset(0)}>Hoje</Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setMonthOffset(p => p + 1)} disabled={monthOffset >= 0}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{formatBRL(stats.folhaTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">Folha Bruta Estimada</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.colaboradores}</p>
                <p className="text-xs text-muted-foreground mt-1">Colaboradores Ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{formatBRL(stats.folhaTotal * 0.08)}</p>
                <p className="text-xs text-muted-foreground mt-1">FGTS Estimado (8%)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Colaboradores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Colaboradores — Cálculo Individual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEmployees ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Carregando colaboradores...
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Nenhum colaborador cadastrado</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Cadastre funcionários para gerar a folha</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Nome</th>
                      <th className="text-left py-3 px-4 font-semibold">Cargo</th>
                      <th className="text-right py-3 px-4 font-semibold">Salário Base</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-center py-3 px-4 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp: any) => {
                      const salary = Number(emp.salary || emp.baseSalary || 0);
                      return (
                        <tr key={emp.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium">{emp.fullName || emp.socialName || '—'}</td>
                          <td className="py-3 px-4 text-muted-foreground">{getPositionName(emp.positionId)}</td>
                          <td className="py-3 px-4 text-right font-mono">
                            {salary > 0 ? formatBRL(salary) : <span className="text-muted-foreground">Não informado</span>}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={emp.status === 'ATIVO' || emp.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                            }>
                              {emp.status || 'Ativo'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              onClick={() => handleViewPayslip(emp)}
                              disabled={salary <= 0}
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              Calcular
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Holerite */}
        <Dialog open={showPayslipDialog} onOpenChange={setShowPayslipDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Holerite — {selectedEmployee?.fullName || selectedEmployee?.socialName}
              </DialogTitle>
            </DialogHeader>
            {selectedEmployee?.payroll && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground capitalize">
                  Referência: {new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </div>

                {/* Proventos */}
                <div className="bg-emerald-50 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-800 mb-2">Proventos</h4>
                  <div className="flex justify-between text-sm">
                    <span>Salário Base</span>
                    <span className="font-mono">{formatBRL(selectedEmployee.payroll.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-emerald-200">
                    <span>Total Bruto</span>
                    <span className="font-mono">{formatBRL(selectedEmployee.payroll.grossSalary)}</span>
                  </div>
                </div>

                {/* Descontos */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Descontos</h4>
                  <div className="flex justify-between text-sm">
                    <span>INSS</span>
                    <span className="font-mono text-red-600">-{formatBRL(selectedEmployee.payroll.inss)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IRRF</span>
                    <span className="font-mono text-red-600">-{formatBRL(selectedEmployee.payroll.ir)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-red-200">
                    <span>Total Descontos</span>
                    <span className="font-mono text-red-600">
                      -{formatBRL(selectedEmployee.payroll.inss + selectedEmployee.payroll.ir)}
                    </span>
                  </div>
                </div>

                {/* FGTS */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-blue-800">FGTS (recolhido pela empresa)</span>
                    <span className="font-mono">{formatBRL(selectedEmployee.payroll.fgts)}</span>
                  </div>
                </div>

                {/* Líquido */}
                <div className="bg-gray-900 text-white rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Salário Líquido</span>
                    <span className="font-bold text-2xl font-mono">
                      {formatBRL(selectedEmployee.payroll.netSalary)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
