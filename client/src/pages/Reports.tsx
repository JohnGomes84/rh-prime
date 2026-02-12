import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Download, FileText, AlertCircle, CheckCircle } from "lucide-react";

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReportMutation = trpc.compliance.downloadPDF.useMutation();

  const handleGenerateReport = async (reportType: string) => {
    setIsGenerating(true);
    try {
      const result = await generateReportMutation.mutateAsync({
        companyName: "Empresa",
      });

      if (result.success && result.pdf) {
        // Decode base64 and create blob
        const binaryString = atob(result.pdf);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-gray-600">Gere relatórios de conformidade e conformidade regulatória</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Compliance Report Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedReport("compliance")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relatório de Conformidade
                </CardTitle>
                <CardDescription>Status de PGR, PCMSO, ASOs e Treinamentos</CardDescription>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Gere um relatório completo com o status de todos os documentos críticos de conformidade regulatória.
            </p>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateReport("compliance");
              }}
              disabled={isGenerating}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? "Gerando..." : "Baixar Relatório"}
            </Button>
          </CardContent>
        </Card>

        {/* PGR Report Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedReport("pgr")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relatório PGR
                </CardTitle>
                <CardDescription>Programa de Gestão de Riscos</CardDescription>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Relatório detalhado do Programa de Gestão de Riscos com status de validade.
            </p>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateReport("pgr");
              }}
              disabled={isGenerating}
              className="w-full"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? "Gerando..." : "Baixar Relatório"}
            </Button>
          </CardContent>
        </Card>

        {/* PCMSO Report Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedReport("pcmso")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relatório PCMSO
                </CardTitle>
                <CardDescription>Programa de Controle Médico</CardDescription>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Relatório do Programa de Controle Médico de Saúde Ocupacional com status de ASOs.
            </p>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateReport("pcmso");
              }}
              disabled={isGenerating}
              className="w-full"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? "Gerando..." : "Baixar Relatório"}
            </Button>
          </CardContent>
        </Card>

        {/* Treinamentos Report Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedReport("trainings")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Relatório de Treinamentos
                </CardTitle>
                <CardDescription>Status de Treinamentos Obrigatórios</CardDescription>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Relatório de todos os treinamentos obrigatórios com status de validade e funcionários.
            </p>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateReport("trainings");
              }}
              disabled={isGenerating}
              className="w-full"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? "Gerando..." : "Baixar Relatório"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Informações sobre Relatórios</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            • Os relatórios são gerados em formato DOCX para fácil edição e compartilhamento
          </p>
          <p>
            • Todos os dados incluem status de conformidade e alertas críticos
          </p>
          <p>
            • Os relatórios são atualizados em tempo real com os dados do sistema
          </p>
          <p>
            • Você pode compartilhar os relatórios com auditores e órgãos reguladores
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
