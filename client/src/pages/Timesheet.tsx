import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  return { year, month, startDate, endDate };
}

export default function Timesheet() {
  const { user } = useAuth();
  const [monthValue, setMonthValue] = useState(new Date().toISOString().slice(0, 7));
  const employeeId = Number(user?.id ?? 0);
  const { year, month, startDate, endDate } = useMemo(() => getMonthRange(monthValue), [monthValue]);

  const { data: records = [], isLoading } = trpc.timesheet.listRecords.useQuery(
    { employeeId, startDate, endDate },
    { enabled: !!employeeId }
  );
  const { data: summary } = trpc.timesheet.monthlySummary.useQuery(
    { employeeId, month, year },
    { enabled: !!employeeId }
  );
  const { data: overtimeStats } = trpc.timesheet.overtimeStats.useQuery(
    { employeeId, month, year },
    { enabled: !!employeeId }
  );
  const { data: absences = [] } = trpc.absences.list.useQuery(
    { employeeId },
    { enabled: !!employeeId }
  );

  const monthAbsences = absences.filter((item: any) => {
    const date = new Date(item.absenceDate);
    return date >= startDate && date <= endDate;
  });

  const statusBadge = (record: any) => {
    if (!record.clockOut) {
      return <Badge variant="secondary">Aberto</Badge>;
    }
    return <Badge variant="default">Fechado</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Historico de Ponto</h1>
            <p className="text-muted-foreground mt-2">Visualizacao mensal dos registros reais de ponto.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="month" value={monthValue} onChange={(event) => setMonthValue(event.target.value)} className="w-44" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{summary?.totalHours ?? 0}h</p>
                <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{overtimeStats?.totalOvertimeHours ?? 0}h</p>
                <p className="text-sm text-muted-foreground">Horas Extras</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{records.length}</p>
                <p className="text-sm text-muted-foreground">Registros no Mes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{monthAbsences.length}</p>
                <p className="text-sm text-muted-foreground">Ausencias</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Registros de {startDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground">Carregando...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
                Nenhum registro encontrado para este periodo.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Data</th>
                      <th className="text-left py-3 px-4 font-semibold">Entrada</th>
                      <th className="text-left py-3 px-4 font-semibold">Saida</th>
                      <th className="text-left py-3 px-4 font-semibold">Horas</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record: any) => {
                      const clockIn = new Date(record.clockIn);
                      const clockOut = record.clockOut ? new Date(record.clockOut) : null;
                      const hoursWorked = clockOut ? (clockOut.getTime() - clockIn.getTime()) / 3600000 : null;
                      return (
                        <tr key={record.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">
                            {clockIn.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              {clockIn.toLocaleTimeString("pt-BR")}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-red-600" />
                              {clockOut ? clockOut.toLocaleTimeString("pt-BR") : "-"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium">{hoursWorked ? `${hoursWorked.toFixed(2)}h` : "-"}</td>
                          <td className="py-3 px-4">{statusBadge(record)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ausencias do Periodo</CardTitle>
          </CardHeader>
          <CardContent>
            {monthAbsences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                Nenhuma ausencia registrada neste mes.
              </div>
            ) : (
              <div className="space-y-3">
                {monthAbsences.map((absence: any) => (
                  <div key={absence.id} className="rounded border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{new Date(absence.absenceDate).toLocaleDateString("pt-BR")}</p>
                        <p className="text-sm text-muted-foreground">{absence.reason || "Sem motivo informado"}</p>
                      </div>
                      <Badge variant={absence.justified ? "default" : "destructive"}>
                        {absence.justified ? "Justificada" : "Nao justificada"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
