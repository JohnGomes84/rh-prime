import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, FileText, Download, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function DocumentGenerator() {
  const { data: templates, isLoading: templatesLoading } = trpc.documentTemplates.list.useQuery();
  const { data: employees, isLoading: employeesLoading } = trpc.employees.list.useQuery({});
  const generateDocument = trpc.documentTemplates.generate.useMutation({
    onError: (error) => toast.error(error.message),
  });

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const generatedFileName = useMemo(() => {
    const templateName = templates?.find((item: any) => String(item.id) === selectedTemplate)?.templateName ?? "documento";
    return `${templateName.replace(/\s+/g, "-").toLowerCase()}.html`;
  }, [selectedTemplate, templates]);

  const handleGenerate = async () => {
    if (!selectedTemplate || !selectedEmployee) {
      toast.error("Selecione um template e um funcionario.");
      return;
    }

    await generateDocument.mutateAsync({
      templateId: Number(selectedTemplate),
      employeeId: Number(selectedEmployee),
    });
    toast.success("Documento gerado com dados reais.");
  };

  const handleDownload = () => {
    if (!generateDocument.data) return;
    const blob = new Blob([generateDocument.data.content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = generatedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerador de Documentos</h1>
          <p className="text-muted-foreground">Gere documentos automaticamente usando templates e dados reais dos funcionarios.</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="h-5 w-5" /> Gerar Documento
            </CardTitle>
            <CardDescription>O conteudo eh montado pelo endpoint `documentTemplates.generate`.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger disabled={templatesLoading}>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((tpl: any) => (
                      <SelectItem key={tpl.id} value={String(tpl.id)}>
                        {tpl.templateName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Funcionario</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger disabled={employeesLoading}>
                    <SelectValue placeholder="Selecione um funcionario" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.fullName} ({emp.cpf})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={generateDocument.isPending} className="gap-2">
                {generateDocument.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Gerar Documento
              </Button>
              <Button onClick={handleDownload} variant="outline" disabled={!generateDocument.data} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar HTML
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Pre-visualizacao</CardTitle>
          </CardHeader>
          <CardContent>
            {!generateDocument.data ? (
              <p className="text-sm text-muted-foreground">Gere um documento para visualizar o resultado renderizado.</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded border bg-white p-6" dangerouslySetInnerHTML={{ __html: generateDocument.data.content }} />
                <pre className="max-h-64 overflow-auto rounded bg-muted p-4 text-xs">{generateDocument.data.content}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
