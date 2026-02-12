import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, Clock, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

export default function TimeBank() {
  const { data: entries, isLoading } = trpc.timeBank.list.useQuery({});
  const { data: expiring } = trpc.timeBank.expiring.useQuery({ daysAhead: 30 });
  const [, setLocation] = useLocation();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Banco de Horas</h1>
          <p className="text-muted-foreground">Controle de saldos, créditos, débitos e vencimentos do banco de horas.</p>
        </div>

        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Vencendo em 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{expiring?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Registros de banco de horas próximos do vencimento</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Registros de Banco de Horas</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !entries || entries.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum registro de banco de horas.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead>Crédito (h)</TableHead>
                    <TableHead>Débito (h)</TableHead>
                    <TableHead>Saldo (h)</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((tb: any) => {
                    const isExpiring = tb.expirationDate && new Date(tb.expirationDate) < new Date(Date.now() + 30 * 86400000);
                    return (
                      <TableRow key={tb.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/funcionarios/${tb.employeeId}`)}>
                        <TableCell className="font-medium">{tb.employeeName || `ID ${tb.employeeId}`}</TableCell>
                        <TableCell>{tb.referenceMonth}</TableCell>
                        <TableCell className="text-emerald-600">+{Number(tb.creditHours).toFixed(1)}</TableCell>
                        <TableCell className="text-destructive">-{Number(tb.debitHours).toFixed(1)}</TableCell>
                        <TableCell className="font-semibold">{Number(tb.balanceHours).toFixed(1)}</TableCell>
                        <TableCell>{formatDate(tb.expirationDate)}</TableCell>
                        <TableCell>
                          <Badge variant={isExpiring ? "destructive" : "secondary"}>
                            {isExpiring ? "Vencendo" : "Regular"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
