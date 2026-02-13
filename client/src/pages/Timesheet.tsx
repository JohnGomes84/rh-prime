import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, LogIn, LogOut, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TimeEntry {
  id: number;
  data: string;
  entrada: string;
  saida: string;
  horasTrabalhadas: number;
  status: string;
}

interface DailyRecord {
  data: string;
  entrada?: string;
  saida?: string;
  status: 'presente' | 'ausente' | 'feriado' | 'férias';
}

export default function Timesheet() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Mock data
  const timeEntries: TimeEntry[] = [
    {
      id: 1,
      data: '2026-02-13',
      entrada: '08:30',
      saida: '17:45',
      horasTrabalhadas: 9.25,
      status: 'presente',
    },
    {
      id: 2,
      data: '2026-02-12',
      entrada: '08:00',
      saida: '17:00',
      horasTrabalhadas: 9,
      status: 'presente',
    },
    {
      id: 3,
      data: '2026-02-11',
      entrada: '08:15',
      saida: '16:30',
      horasTrabalhadas: 8.25,
      status: 'presente',
    },
  ];

  const stats = {
    horasTrabalhadas: 26.5,
    horasExtras: 0.5,
    atrasos: 1,
    faltas: 0,
    diasUteis: 20,
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any; icon: any }> = {
      presente: { label: 'Presente', variant: 'default', icon: CheckCircle2 },
      ausente: { label: 'Ausente', variant: 'destructive', icon: AlertCircle },
      feriado: { label: 'Feriado', variant: 'secondary', icon: Calendar },
      férias: { label: 'Férias', variant: 'outline', icon: Calendar },
    };
    return config[status] || { label: status, variant: 'outline', icon: Clock };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Controle de Ponto</h1>
            <p className="text-muted-foreground mt-2">Registre entrada/saída e acompanhe jornada</p>
          </div>
          <div className="flex gap-2">
            <Button className="gap-2">
              <LogIn className="w-4 h-4" />
              Registrar Entrada
            </Button>
            <Button variant="outline" className="gap-2">
              <LogOut className="w-4 h-4" />
              Registrar Saída
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.horasTrabalhadas}h</p>
                <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">+{stats.horasExtras}h</p>
                <p className="text-sm text-muted-foreground">Horas Extras</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{stats.atrasos}</p>
                <p className="text-sm text-muted-foreground">Atrasos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{stats.faltas}</p>
                <p className="text-sm text-muted-foreground">Faltas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">{stats.diasUteis}</p>
                <p className="text-sm text-muted-foreground">Dias Úteis</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registros Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Registros de Ponto - Fevereiro 2026</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Anterior
                </Button>
                <Button size="sm" variant="outline">
                  Próximo
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Data</th>
                    <th className="text-left py-3 px-4 font-semibold">Entrada</th>
                    <th className="text-left py-3 px-4 font-semibold">Saída</th>
                    <th className="text-left py-3 px-4 font-semibold">Horas</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map(entry => {
                    const badge = getStatusBadge(entry.status);
                    return (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">
                          {new Date(entry.data).toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-2">
                            <LogIn className="w-4 h-4 text-green-600" />
                            {entry.entrada}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-2">
                            <LogOut className="w-4 h-4 text-red-600" />
                            {entry.saida}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium">{entry.horasTrabalhadas}h</td>
                        <td className="py-3 px-4">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Button size="sm" variant="ghost">
                            Editar
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Justificativas Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle>Justificativas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma justificativa pendente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
