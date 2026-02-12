import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, HeartPulse, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

export default function MedicalExams() {
  const { data: exams, isLoading } = trpc.medicalExams.list.useQuery({});
  const { data: expired } = trpc.medicalExams.expired.useQuery();
  const { data: upcoming } = trpc.medicalExams.upcoming.useQuery({ daysAhead: 30 });
  const [, setLocation] = useLocation();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saúde Ocupacional (ASO)</h1>
          <p className="text-muted-foreground">Controle de exames médicos, validades e agendamentos.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-0 shadow-sm border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> ASOs Vencidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{expired?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Exames com validade expirada</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                <HeartPulse className="h-4 w-4" /> Vencendo em 30 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{upcoming?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Exames próximos do vencimento</p>
            </CardContent>
          </Card>
        </div>

        {expired && expired.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base text-destructive">ASOs Vencidos - Ação Imediata</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data Exame</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expired.map((ex: any) => (
                    <TableRow key={ex.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/funcionarios/${ex.employeeId}`)}>
                      <TableCell className="font-medium">{ex.employeeName || `ID ${ex.employeeId}`}</TableCell>
                      <TableCell>{ex.examType}</TableCell>
                      <TableCell>{formatDate(ex.examDate)}</TableCell>
                      <TableCell className="text-destructive font-medium">{formatDate(ex.expiryDate)}</TableCell>
                      <TableCell><Badge variant={ex.result === "Inapto" ? "destructive" : "secondary"}>{ex.result || "-"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Todos os Exames</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !exams || exams.length === 0 ? (
              <div className="text-center py-12">
                <HeartPulse className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum exame registrado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Médico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((ex: any) => (
                    <TableRow key={ex.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setLocation(`/funcionarios/${ex.employeeId}`)}>
                      <TableCell className="font-medium">{ex.employeeName || `ID ${ex.employeeId}`}</TableCell>
                      <TableCell>{ex.examType}</TableCell>
                      <TableCell>{formatDate(ex.examDate)}</TableCell>
                      <TableCell>{formatDate(ex.expiryDate)}</TableCell>
                      <TableCell>
                        <Badge variant={ex.result === "Inapto" ? "destructive" : "secondary"}>
                          {ex.result || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{ex.doctorName || "-"}</TableCell>
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
