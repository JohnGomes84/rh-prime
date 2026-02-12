import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Integration() {
  const handleExportSolides = () => {
    toast.info("Exportação para Sólides em desenvolvimento.");
  };

  const handleExportFlash = () => {
    toast.info("Exportação para Flash Benefícios em desenvolvimento.");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integração</h1>
          <p className="text-muted-foreground">Exporte dados para Sólides e Flash Benefícios em um clique.</p>
        </div>

        <Tabs defaultValue="solides" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="solides">Sólides</TabsTrigger>
            <TabsTrigger value="flash">Flash Benefícios</TabsTrigger>
          </TabsList>

          {/* Sólides */}
          <TabsContent value="solides">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" /> Exportar para Sólides
                </CardTitle>
                <CardDescription>Gere um arquivo CSV/XLSX compatível com o sistema Sólides.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Dados de funcionários</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Histórico de contratos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Cargos e salários</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Benefícios</span>
                  </div>
                </div>
                <Button onClick={handleExportSolides} className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar para Sólides
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Flash */}
          <TabsContent value="flash">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" /> Exportar para Flash Benefícios
                </CardTitle>
                <CardDescription>Gere um arquivo CSV/XLSX compatível com o sistema Flash Benefícios.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Dados de funcionários</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Benefícios cadastrados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Dependentes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Dados bancários</span>
                  </div>
                </div>
                <Button onClick={handleExportFlash} className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar para Flash
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Status da Integração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Sólides</span>
              <Badge variant="default">Conectado</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Flash Benefícios</span>
              <Badge variant="default">Conectado</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
