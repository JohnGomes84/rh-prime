import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, FileText, Save, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

const PERIOD_SHORTCUTS = {
  thisWeek: () => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return { start: start.toISOString().split("T")[0], end: today.toISOString().split("T")[0] };
  },
  thisMonth: () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: start.toISOString().split("T")[0], end: today.toISOString().split("T")[0] };
  },
  lastMonth: () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: start.toISOString().split("T")[0], end: end.toISOString().split("T")[0] };
  },
  thisQuarter: () => {
    const today = new Date();
    const quarter = Math.floor(today.getMonth() / 3);
    const start = new Date(today.getFullYear(), quarter * 3, 1);
    return { start: start.toISOString().split("T")[0], end: today.toISOString().split("T")[0] };
  },
  thisYear: () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 1);
    return { start: start.toISOString().split("T")[0], end: today.toISOString().split("T")[0] };
  },
};

export default function RelatoriosPage() {
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [sections, setSections] = useState({
    executiveSummary: true,
    dailyEvolution: false,
    schedulesRealized: false,
    employeePayments: false,
    accountsPayable: false,
    accountsReceivable: false,
    expenseComposition: false,
    clientRanking: false,
  });

  const { data: report, isLoading: isGenerating, refetch } = trpc.relatorios.generate.useQuery(
    {
      filters: { dateStart, dateEnd },
      sections,
    },
    { enabled: false }
  );

  const { data: templates } = trpc.relatorios.listTemplates.useQuery();
  const saveTemplateMut = trpc.relatorios.saveTemplate.useMutation();
  const deleteTemplateMut = trpc.relatorios.deleteTemplate.useMutation();

  const handlePeriodShortcut = (key: keyof typeof PERIOD_SHORTCUTS) => {
    const { start, end } = PERIOD_SHORTCUTS[key]();
    setDateStart(start);
    setDateEnd(end);
  };

  const handleToggleSection = (section: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleGenerateReport = async () => {
    if (!dateStart || !dateEnd) {
      toast.error("Selecione o período");
      return;
    }
    await refetch();
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Digite um nome para o template");
      return;
    }

    setIsSaving(true);
    try {
      await saveTemplateMut.mutateAsync({
        name: templateName,
        filters: { dateStart, dateEnd },
        sections,
      });
      toast.success("Template salvo com sucesso!");
      setTemplateName("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadTemplate = (template: any) => {
    setDateStart(template.filters.dateStart || "");
    setDateEnd(template.filters.dateEnd || "");
    setSections(template.sections);
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await deleteTemplateMut.mutateAsync(id);
      toast.success("Template deletado");
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar template");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Gere relatórios personalizados com filtros avançados</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filtros */}
        <Card className="lg:col-span-1 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Período</Label>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  placeholder="Data início"
                />
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  placeholder="Data fim"
                />
              </div>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {Object.entries(PERIOD_SHORTCUTS).map(([key, _]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => handlePeriodShortcut(key as keyof typeof PERIOD_SHORTCUTS)}
                  >
                    {key === "thisWeek"
                      ? "Esta semana"
                      : key === "thisMonth"
                        ? "Este mês"
                        : key === "lastMonth"
                          ? "Mês anterior"
                          : key === "thisQuarter"
                            ? "Trimestre"
                            : "Ano"}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seções */}
        <Card className="lg:col-span-1 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Seções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(sections).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={key}
                  checked={value}
                  onCheckedChange={() => handleToggleSection(key as keyof typeof sections)}
                />
                <Label htmlFor={key} className="text-sm cursor-pointer">
                  {key === "executiveSummary"
                    ? "Resumo Executivo"
                    : key === "dailyEvolution"
                      ? "Evolução Diária"
                      : key === "schedulesRealized"
                        ? "Planejamentos"
                        : key === "employeePayments"
                          ? "Pagamentos"
                          : key === "accountsPayable"
                            ? "A Pagar"
                            : key === "accountsReceivable"
                              ? "A Receber"
                              : key === "expenseComposition"
                                ? "Despesas"
                                : "Ranking Clientes"}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Template */}
        <Card className="lg:col-span-1 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Input
                placeholder="Nome do template"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={handleSaveTemplate}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                Salvar
              </Button>
            </div>

            {templates && templates.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-semibold mb-2">Salvos:</p>
                <div className="space-y-1">
                  {templates.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs">
                      <button
                        onClick={() => handleLoadTemplate(t)}
                        className="text-blue-400 hover:underline"
                      >
                        {t.name}
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações */}
        <Card className="lg:col-span-1 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
              Visualizar
            </Button>
            <Button variant="outline" className="w-full gap-2" disabled={!report}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" className="w-full gap-2" disabled={!report}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Relatório */}
      {report && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle>Relatório Gerado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {report.executiveSummary && (
                <div>
                  <h3 className="font-semibold mb-3">Resumo Executivo</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-700 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Receita</p>
                      <p className="text-lg font-bold">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          parseFloat(report.executiveSummary.totalReceive)
                        )}
                      </p>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Custos</p>
                      <p className="text-lg font-bold">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          parseFloat(report.executiveSummary.totalPay)
                        )}
                      </p>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Margem</p>
                      <p className="text-lg font-bold text-green-400">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          parseFloat(report.executiveSummary.margin)
                        )}
                      </p>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                      <p className="text-xs text-muted-foreground">Margem %</p>
                      <p className="text-lg font-bold text-green-400">{report.executiveSummary.marginPercent}%</p>
                    </div>
                  </div>
                </div>
              )}

              {report.employeePayments && (
                <div>
                  <h3 className="font-semibold mb-3">Pagamentos de Diaristas</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="text-left p-2">Nome</th>
                          <th className="text-left p-2">CPF</th>
                          <th className="text-right p-2">Dias</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.employeePayments.map((emp: any, idx: number) => (
                          <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="p-2">{emp.name}</td>
                            <td className="p-2 text-muted-foreground">{emp.cpf}</td>
                            <td className="text-right p-2">{emp.daysWorked}</td>
                            <td className="text-right p-2 font-semibold">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                parseFloat(emp.totalReceived)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
