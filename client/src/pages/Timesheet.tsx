import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { toast } from 'sonner';
import {
  Clock, LogIn, LogOut, Calendar, Timer, AlertCircle,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="text-center">
      <p className="text-5xl font-bold tabular-nums tracking-tight">
        {time.toLocaleTimeString('pt-BR')}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {time.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}

export default function Timesheet() {
  const { user } = useAuth();
  const employeeId = String(user?.id || '');
  const utils = trpc.useUtils();

  const [monthOffset, setMonthOffset] = useState(0);
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);
  const targetMonth = targetDate.getMonth() + 1;
  const targetYear = targetDate.getFullYear();

  // Buscar ponto aberto
  const { data: openRecord, isLoading: loadingOpen } = trpc.timesheet.getOpenRecord.useQuery(
    undefined,
    { enabled: !!user?.id, refetchInterval: 30000 }
  );

  // Buscar registros do mês
  const startDate = useMemo(() => new Date(targetYear, targetMonth - 1, 1), [targetYear, targetMonth]);
  const endDate = useMemo(() => new Date(targetYear, targetMonth, 0, 23, 59, 59), [targetYear, targetMonth]);

  const { data: records = [], isLoading: loadingRecords } = trpc.timesheet.listRecords.useQuery(
    { startDate, endDate },
    { enabled: !!user?.id }
  );

  // Buscar resumo mensal
  const { data: summary } = trpc.timesheet.monthlySummary.useQuery(
    { month: targetMonth, year: targetYear },
    { enabled: !!user?.id }
  );

  // Mutations
  const clockInMutation = trpc.timesheet.clockIn.useMutation({
    onSuccess: () => {
      toast.success('Entrada registrada com sucesso!');
      utils.timesheet.getOpenRecord.invalidate();
      utils.timesheet.listRecords.invalidate();
      utils.timesheet.monthlySummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const clockOutMutation = trpc.timesheet.clockOut.useMutation({
    onSuccess: () => {
      toast.success('Saída registrada com sucesso!');
      utils.timesheet.getOpenRecord.invalidate();
      utils.timesheet.listRecords.invalidate();
      utils.timesheet.monthlySummary.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const isWorking = !!openRecord;
  const isPending = clockInMutation.isPending || clockOutMutation.isPending;

  const handleToggleClock = () => {
    if (isWorking) {
      clockOutMutation.mutate({});
    } else {
      clockInMutation.mutate({});
    }
  };

  // Calcular tempo trabalhando agora
  const [elapsedTime, setElapsedTime] = useState('');
  useEffect(() => {
    if (!openRecord) { setElapsedTime(''); return; }
    const timer = setInterval(() => {
      const start = new Date(openRecord.clockIn).getTime();
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [openRecord]);

  const monthLabel = targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Aprovado</Badge>;
      case 'PENDING': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">Pendente</Badge>;
      case 'REJECTED': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200">Rejeitado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bater Ponto</h1>
          <p className="text-muted-foreground mt-1">Registre entrada e saída e acompanhe sua jornada</p>
        </div>

        {/* Relógio + Botão de Ponto */}
        <Card className={isWorking ? 'border-emerald-300 bg-emerald-50/50' : ''}>
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center gap-6">
              <LiveClock />

              {/* Status atual */}
              {isWorking && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-100 px-4 py-2 rounded-full">
                  <Timer className="w-4 h-4 animate-pulse" />
                  <span className="font-medium">Trabalhando há {elapsedTime}</span>
                </div>
              )}

              {/* Botão principal */}
              <Button
                size="lg"
                onClick={handleToggleClock}
                disabled={isPending || loadingOpen}
                className={`gap-3 px-8 py-6 text-lg font-semibold transition-all ${
                  isWorking
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isPending ? (
                  <Clock className="w-5 h-5 animate-spin" />
                ) : isWorking ? (
                  <LogOut className="w-5 h-5" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {isPending ? 'Registrando...' : isWorking ? 'Registrar Saída' : 'Registrar Entrada'}
              </Button>

              {openRecord && (
                <p className="text-sm text-muted-foreground">
                  Entrada registrada às {new Date(openRecord.clockIn).toLocaleTimeString('pt-BR')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumo do Mês */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{summary?.totalHours ?? 0}h</p>
                <p className="text-xs text-muted-foreground mt-1">Horas Trabalhadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-600">+{summary?.overtimeHours ?? 0}h</p>
                <p className="text-xs text-muted-foreground mt-1">Horas Extras</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-600">{summary?.delays ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Atrasos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{summary?.absences ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Faltas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registros do Mês */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Registros — {monthLabel}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setMonthOffset(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {monthOffset !== 0 && (
                  <Button size="sm" variant="outline" onClick={() => setMonthOffset(0)}>
                    Hoje
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setMonthOffset(p => p + 1)} disabled={monthOffset >= 0}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRecords ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Clock className="w-5 h-5 animate-spin mr-2" />
                Carregando registros...
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Nenhum registro de ponto neste mês</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Clique em "Registrar Entrada" para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Data</th>
                      <th className="text-left py-3 px-4 font-semibold">Entrada</th>
                      <th className="text-left py-3 px-4 font-semibold">Saída</th>
                      <th className="text-left py-3 px-4 font-semibold">Horas</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record: any) => {
                      const clockIn = new Date(record.clockIn);
                      const clockOut = record.clockOut ? new Date(record.clockOut) : null;
                      const hours = record.hoursWorked
                        ? Number(record.hoursWorked).toFixed(2)
                        : clockOut
                        ? ((clockOut.getTime() - clockIn.getTime()) / 3600000).toFixed(2)
                        : null;

                      return (
                        <tr key={record.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium">
                            {clockIn.toLocaleDateString('pt-BR', {
                              weekday: 'short', day: '2-digit', month: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-2">
                              <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                              {clockIn.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {clockOut ? (
                              <span className="flex items-center gap-2">
                                <LogOut className="w-3.5 h-3.5 text-red-500" />
                                {clockOut.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-amber-600">
                                <Timer className="w-3.5 h-3.5 animate-pulse" />
                                Em andamento
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {hours ? `${hours}h` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(record.status)}
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
      </div>
    </DashboardLayout>
  );
}
