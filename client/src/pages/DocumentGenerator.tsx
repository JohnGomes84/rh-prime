import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, FileText, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DocumentGenerator() {
  const { data: templates, isLoading: templatesLoading } = trpc.documentTemplates.list.useQuery();
  const { data: employees, isLoading: employeesLoading } = trpc.employees.list.useQuery({});
  
  // Document generation is handled via templates
  const handleGenerateClick = () => {
    toast.info("Funcionalidade de geração de documentos em desenvolvimento.");
  };

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");



  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerador de Documentos</h1>
          <p className="text-muted-foreground">Gere documentos automaticamente usando templates e dados dos funcionários.</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" /> Gerar Documento
            </CardTitle>
            <CardDescription>Selecione um template e um funcionário para gerar o documento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Template *</Label>
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
                <Label>Funcionário *</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger disabled={employeesLoading}>
                    <SelectValue placeholder="Selecione um funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name} ({emp.cpf})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="pt-4">
              <Button onClick={handleGenerateClick} className="gap-2">
                <Download className="h-4 w-4" />
                Gerar Documento
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Sobre o Gerador</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>O gerador de documentos substitui automaticamente as variáveis no template pelos dados reais do funcionário.</p>
            <p><strong>Variáveis suportadas:</strong> {'{{nomeDoFuncionario}}'}, {'{{cpf}}'}, {'{{dataAtual}}'}, {'{{cargo}}'}, {'{{departamento}}'}, {'{{salario}}'}, {'{{dataAdmissao}}'}</p>
            <p>Crie templates na seção "Templates de Documentos" com o conteúdo desejado.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
