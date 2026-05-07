import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Download, FileText, AlertCircle, CheckCircle } from "lucide-react";

type ReportType = "compliance" | "timesheet" | "vacation" | "absence" | "employeeStats" | "summary";

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<ReportType>("compliance");
  const [isGenerating, setIsGenerating] = useState(false);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const generateReportMutation = trpc.compliance.downloadPDF.useMutation();
  const timesheetQuery = trpc.reports.timesheetReport.useQuery(
    { month: Number(month), year: Number(year) },
    { enabled: selectedReport === "timesheet" }
  );
  const vacationQuery = trpc.reports.vacationReport.useQuery(
    { year: Number(year) },
    { enabled: selectedReport === "vacation" }
  );
  const absenceQuery = trpc.reports.absenceReport.useQuery(
    { month: Number(month), year: Number(year) },
    { enabled: selectedReport === "absence" }
  );
  const employeeStatsQuery = trpc.reports.employeeStats.useQuery(
    { month: Number(month), year: Number(year) },
    { enabled: selectedReport === "employeeStats" }
  );
  const summaryQuery = trpc.reports.summary.useQuery(
    { month: Number(month), year: Number(year) },
    { enabled: selectedReport === "summary" }
  );

  const currentData = useMemo(() => {
    switch (selectedReport) {
      case "timesheet":
        return timesheetQuery.data;
      case "vacation":
        return vacationQuery.data;
      case "absence":
        return absenceQuery.data;
      case "employeeStats":
        return employeeStatsQuery.data;
      case "summary":
        return summaryQuery.data;
      default:
        return null;
    }
  }, [
    absenceQuery.data,
    employeeStatsQuery.data,
    selectedReport,
    summaryQuery.data,
    timesheetQuery.data,
    vacationQuery.data,
  ]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      if (selectedReport === "compliance") {
        const result = await generateReportMutation.mutateAsync({
          companyName: "Empresa",
        });

        if (result.success && result.pdf) {
          const binaryString = atob(result.pdf);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = result.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      } else if (selectedReport === "timesheet") {
        await timesheetQuery.refetch();
      } else if (selectedReport === "vacation") {
        await vacationQuery.refetch();
      } else if (selectedReport === "absence") {
        await absenceQuery.refetch();
      } else if (selectedReport === "employeeStats") {
        await employeeStatsQuery.refetch();
      } else if (selectedReport === "summary") {
        await summaryQuery.refetch();
      }
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-gray-600">Consolidação dos relatórios reais disponíveis no backend.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parâmetros</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Tipo</p>
              <Select value={selectedReport} onValueChange={(value: ReportType) => setSelectedReport(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="timesheet">Ponto</SelectItem>
                  <SelectItem value="vacation">Férias</SelectItem>
                  <SelectItem value="absence">Ausências</SelectItem>
                  <SelectItem value="employeeStats">Estatísticas</SelectItem>
                  <SelectItem value="summary">Resumo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Mês</p>
              <Input value={month} onChange={(event) => setMonth(event.target.value)} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Ano</p>
              <Input value={year} onChange={(event) => setYear(event.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedReport("compliance")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Relatório de Conformidade
                  </CardTitle>
                  <CardDescription>Status de PGR, PCMSO, ASOs e treinamentos</CardDescription>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={(e) => { e.stopPropagation(); handleGenerateReport(); }} disabled={isGenerating} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? "Gerando..." : "Baixar Relatório"}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedReport("timesheet")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Relatório de Ponto
                  </CardTitle>
                  <CardDescription>Registros do mês selecionado</CardDescription>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={(e) => { e.stopPropagation(); handleGenerateReport(); }} disabled={isGenerating} className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? "Carregando..." : "Consultar Dados"}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedReport("vacation")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Relatório de Férias
                  </CardTitle>
                  <CardDescription>Períodos cadastrados no ano</CardDescription>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={(e) => { e.stopPropagation(); handleGenerateReport(); }} disabled={isGenerating} className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? "Carregando..." : "Consultar Dados"}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedReport("summary")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Resumo Executivo
                  </CardTitle>
                  <CardDescription>Contagens consolidadas do período</CardDescription>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={(e) => { e.stopPropagation(); handleGenerateReport(); }} disabled={isGenerating} className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? "Carregando..." : "Consultar Dados"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {selectedReport !== "compliance" && currentData ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="rounded bg-slate-950 p-4 text-xs text-slate-50 overflow-auto">
                {JSON.stringify(currentData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
