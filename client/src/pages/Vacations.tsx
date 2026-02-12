import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, CalendarDays, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

export default function Vacations() {
  const { data: vacations, isLoading } = trpc.vacations.list.useQuery({});
  const { data: overdue } = trpc.vacations.overdue.useQuery();
  const { data: upcoming } = trpc.vacations.upcoming.useQuery({ daysAhead: 60 });
  const [, setLocation] = useLocation();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Controle de Férias</h1>
          <p className="text-muted-foreground">Gerencie períodos aquisitivos, concessivos e agendamentos conforme a CLT.</p>
        </div>

        {/* Alertas */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-0 shadow-sm border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Férias Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{overdue?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Períodos concessivos expirados - ação imediata necessária</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> Vencendo em 60 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{upcoming?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Períodos concessivos próximos do vencimento</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de férias vencidas */}
        {overdue && overdue.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base text-destructive">Férias Vencidas - Ação Imediata</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Período Aquisitivo</TableHead>
                    <TableHead>Limite Concessivo</TableHead>
                    <TableHead>Dias de Direito</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdue.map((v: any) => (
                    <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/funcionarios/${v.employeeId}`)}>
                      <TableCell className="font-medium">{v.employeeName || `ID ${v.employeeId}`}</TableCell>
                      <TableCell>{formatDate(v.acquisitivePeriodStart)} a {formatDate(v.acquisitivePeriodEnd)}</TableCell>
                      <TableCell>{formatDate(v.concessivePeriodEnd)}</TableCell>
                      <TableCell>{v.totalDaysEntitled}</TableCell>
                      <TableCell><Badge variant="destructive">Vencida</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Todos os períodos */}
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Todos os Períodos Aquisitivos</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !vacations || vacations.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum período de férias registrado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Período Aquisitivo</TableHead>
                    <TableHead>Limite Concessivo</TableHead>
                    <TableHead>Dias Direito</TableHead>
                    <TableHead>Dias Gozados</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacations.map((v: any) => (
                    <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/funcionarios/${v.employeeId}`)}>
                      <TableCell className="font-medium">{v.employeeName || `ID ${v.employeeId}`}</TableCell>
                      <TableCell>{formatDate(v.acquisitivePeriodStart)} a {formatDate(v.acquisitivePeriodEnd)}</TableCell>
                      <TableCell>{formatDate(v.concessivePeriodEnd)}</TableCell>
                      <TableCell>{v.totalDaysEntitled}</TableCell>
                      <TableCell>{v.daysTaken}</TableCell>
                      <TableCell className="font-semibold">{v.totalDaysEntitled - (v.daysTaken || 0)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          v.status === "Vencida" ? "destructive" :
                          v.status === "Gozada" ? "default" : "secondary"
                        }>
                          {v.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
