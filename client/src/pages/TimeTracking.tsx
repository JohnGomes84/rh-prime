import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Clock, LogIn, LogOut, Calendar } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';

const formatDateTimeBR = (date: Date) => new Date(date).toLocaleString('pt-BR');

export function TimeTracking() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [clockOutTime, setClockOutTime] = useState<Date | null>(null);

  const { data: records = [], isLoading } = trpc.timesheet.listRecords.useQuery(
    {
      employeeId: user?.id,
      startDate: new Date(selectedDate),
      endDate: new Date(selectedDate + 'T23:59:59'),
    },
    { enabled: !!user?.id }
  );

  const { data: summary } = trpc.timesheet.monthlySummary.useQuery(
    {
      employeeId: user?.id,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    },
    { enabled: !!user?.id }
  );

  const clockInMutation = trpc.timesheet.clockIn.useMutation({
    onSuccess: () => {
      setClockInTime(new Date());
      toast.success('Entrada registrada com sucesso');
    },
    onError: (err) => {
      toast.error(err.message || 'Falha ao registrar entrada');
    },
  });

  const clockOutMutation = trpc.timesheet.clockOut.useMutation({
    onSuccess: (data: any) => {
      setClockOutTime(new Date());
      const ev = data?.evaluation;
      if (ev?.delayMinutes > 0) {
        toast.warning(`Saída registrada. Atraso de ${ev.delayMinutes}min no início.`);
      } else if (ev?.overtime?.total > 0) {
        toast.success(`Saída registrada. ${Math.round(ev.overtime.total)}min de hora extra.`);
      } else {
        toast.success('Saída registrada com sucesso');
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Falha ao registrar saída');
    },
  });

  const captureLocation = (): Promise<string | undefined> =>
    new Promise((resolve) => {
      if (!('geolocation' in navigator)) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const acc = Math.round(pos.coords.accuracy);
          resolve(`${lat},${lng} (±${acc}m)`);
        },
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    });

  const handleClockIn = async () => {
    if (!user?.id) return;
    const location = await captureLocation();
    clockInMutation.mutate({
      employeeId: user.id,
      location,
    });
  };

  const handleClockOut = async () => {
    if (!user?.id) return;
    const location = await captureLocation();
    clockOutMutation.mutate({
      employeeId: user.id,
      notes: location ? `[saída] ${location}` : undefined,
    });
  };

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Controle de Ponto</h1>
        <p className="text-muted-foreground mt-2">Registre suas entradas e saídas</p>
      </div>

      {/* Clock In/Out Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Registrar Ponto
          </CardTitle>
          <CardDescription>
            Hora atual: {new Date().toLocaleTimeString('pt-BR')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleClockIn}
              disabled={clockInMutation.isPending}
              className="gap-2"
              size="lg"
            >
              <LogIn className="w-4 h-4" />
              {clockInMutation.isPending ? 'Registrando...' : 'Entrada'}
            </Button>
            <Button
              onClick={handleClockOut}
              disabled={clockOutMutation.isPending}
              variant="outline"
              className="gap-2"
              size="lg"
            >
              <LogOut className="w-4 h-4" />
              {clockOutMutation.isPending ? 'Registrando...' : 'Saída'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Resumo do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total de Horas</p>
                <p className="text-2xl font-bold">{summary.totalHours}h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas Extras</p>
                <p className="text-2xl font-bold">{summary.overtimeHours}h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faltas</p>
                <p className="text-2xl font-bold">{summary.absences}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atrasos</p>
                <p className="text-2xl font-bold">{summary.delays}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registros do Dia</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <Label htmlFor="date">Data:</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground">Nenhum registro para este dia</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Hora de Entrada</th>
                    <th className="text-left py-2 px-4">Hora de Saída</th>
                    <th className="text-left py-2 px-4">Horas Trabalhadas</th>
                    <th className="text-left py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record: any) => (
                    <tr key={record.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-4">
                        {formatDateTimeBR(new Date(record.clockIn))}
                      </td>
                      <td className="py-2 px-4">
                        {record.clockOut ? formatDateTimeBR(new Date(record.clockOut)) : '-'}
                      </td>
                      <td className="py-2 px-4">
                        {record.hoursWorked ? `${record.hoursWorked}h` : '-'}
                      </td>
                      <td className="py-2 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            record.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {record.status}
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
    </div>
    </DashboardLayout>
  );
}
