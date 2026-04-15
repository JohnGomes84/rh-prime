import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, TrendingUp, TrendingDown, FileText, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { CashFlowForecast } from "@/components/CashFlowForecast";
import { DailyEvolutionChartJs, QuarterlyComparisonChartJs } from "@/components/DashboardChartJs";

type HealthStatus = "excellent" | "good" | "warning" | "critical";

type CashFlowForecastData = {
  historical: Array<{ month: string; revenue: number; costs: number }>;
  forecast: Array<{ week: string; revenue: number; costs: number; margin: number }>;
  summary: {
    avgRevenue: number;
    avgCosts: number;
    avgMargin: number;
    confidence: number;
  };
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  // Buscar dados do mês
  const kpis = trpc.dashboard.getMonthlyKPIs.useQuery({ year, month });
  const alerts = trpc.dashboard.getAlerts.useQuery({ year, month });
  const dailyEvolution = trpc.dashboard.getDailyFinancialEvolution.useQuery({ year, month });
  const topClients = trpc.dashboard.getTopClients.useQuery({ year, month });
  const accountsSummary = trpc.dashboard.getAccountsSummary.useQuery({ year, month });
  const healthScore = trpc.dashboardEnhancements.getHealthScore.useQuery({ year, month });
  const trimestrialComparison = trpc.dashboardEnhancements.getTrimestrialComparison.useQuery({ year });
  const exportData = trpc.dashboardEnhancements.getExportData.useMutation();
  const revenueDetails = trpc.dashboardAdvanced.getRevenueDetails.useQuery({ year, month });
  const costsDetails = trpc.dashboardAdvanced.getCostsDetails.useQuery({ year, month });
  const cashFlowForecast = trpc.dashboardAdvanced.getCashFlowForecast.useQuery({ year, month });
  const cashFlowForecastData = cashFlowForecast.data as CashFlowForecastData | undefined;

  // Navegação de mês
  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });

  // Formatador de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Formatador de percentual
  const formatPercent = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  // Função para navegar com filtro de mês
  const navigateWithMonth = (path: string) => {
    setLocation(`${path}?month=${month}&year=${year}`);
  };

  // Função para drill-down em receita
  const handleRevenueDrilldown = () => {
    navigateWithMonth("/accounts-receivable");
  };

  // Função para drill-down em custos
  const handleCostsDrilldown = () => {
    navigateWithMonth("/accounts-payable");
  };

  // Ações rápidas nos alertas
  const handlePayOverdueAccounts = () => {
    navigateWithMonth("/accounts-payable?status=overdue&action=pay");
  };

  const handleAddPixToEmployees = () => {
    setLocation("/employees?filter=no-pix&action=add-pix");
  };

  const handleValidateSchedules = () => {
    navigateWithMonth("/schedules?status=pending&action=validate");
  };

  // Função para exportar dados
  const handleExport = async (format: 'csv' | 'json' | 'excel') => {
    try {
      const result = await exportData.mutateAsync({ year, month, format });
      const element = document.createElement('a');
      if (format === 'csv') {
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(result.data as string));
      } else if (format === 'excel') {
        const isBase64 = (result as any).isBase64;
        if (isBase64) {
          element.setAttribute('href', 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + result.data);
        }
      } else {
        element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result.data, null, 2)));
      }
      element.setAttribute('download', result.filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho com navegação de mês */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            ←
          </Button>
          <span className="text-lg font-semibold min-w-[200px] text-center capitalize">{monthName}</span>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            →
          </Button>
          <Button className="ml-4">
            <FileText className="mr-2 h-4 w-4" />
            Gerar Relatório
          </Button>
        </div>
      </div>

      {/* KPIs Principais */}
      {kpis.isLoading ? (
        <div className="text-center text-gray-500">Carregando KPIs...</div>
      ) : kpis.data ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Faturamento */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={handleRevenueDrilldown}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Faturamento do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.data.revenue.current)}</div>
              <p
                className={`text-xs mt-2 flex items-center gap-1 ${
                  kpis.data.revenue.variation >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {kpis.data.revenue.variation >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatPercent(kpis.data.revenue.variation)} vs mês anterior
              </p>
            </CardContent>
          </Card>

          {/* Custos Operacionais */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={handleCostsDrilldown}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Custos Operacionais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.data.costs.current)}</div>
              <p
                className={`text-xs mt-2 flex items-center gap-1 ${
                  kpis.data.costs.variation >= 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {kpis.data.costs.variation >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatPercent(kpis.data.costs.variation)} vs mês anterior
              </p>
            </CardContent>
          </Card>

          {/* Margem de Lucro */}
          <Card
            className={`cursor-pointer hover:shadow-lg transition-shadow ${kpis.data.margin.isNegative ? "border-red-500" : ""}`}
            onClick={() => navigateWithMonth("/analytics")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Margem de Lucro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpis.data.margin.isNegative ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(kpis.data.margin.current)}
              </div>
              <p
                className={`text-xs mt-2 flex items-center gap-1 ${
                  kpis.data.margin.variation >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {kpis.data.margin.variation >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatPercent(kpis.data.margin.variation)} vs mês anterior
              </p>
            </CardContent>
          </Card>

          {/* Total de Trabalhos */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigateWithMonth("/schedules")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Trabalhos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.data.works.current}</div>
              <p
                className={`text-xs mt-2 flex items-center gap-1 ${
                  kpis.data.works.variation >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {kpis.data.works.variation >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {formatPercent(kpis.data.works.variation)} vs mês anterior
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Seção de Alertas */}
      {alerts.isLoading ? (
        <div className="text-center text-gray-500">Carregando alertas...</div>
      ) : alerts.data ? (
        <Card className={alerts.data.loss.exists || alerts.data.overdueAccounts.count > 0 || alerts.data.employeesWithoutPix.count > 0 || alerts.data.pendingSchedules.count > 0 ? "border-orange-500" : "border-green-500"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alertas do Negócio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.data.loss.exists ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                <span className="text-red-800">
                  🔴 <strong>Prejuízo:</strong> Operação com prejuízo de {formatCurrency(alerts.data.loss.amount)} em {alerts.data.loss.month}
                </span>
              </div>
            ) : null}

            {alerts.data.overdueAccounts.count > 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex justify-between items-center">
                <span className="text-yellow-800">
                  🟡 <strong>{alerts.data.overdueAccounts.count} conta(s) vencida(s)</strong> totalizando {formatCurrency(alerts.data.overdueAccounts.total)}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigateWithMonth("/accounts-payable?status=overdue")}>
                    Ver contas
                  </Button>
                  <Button size="sm" variant="default" onClick={handlePayOverdueAccounts} className="bg-yellow-600 hover:bg-yellow-700">
                    Pagar Agora
                  </Button>
                </div>
              </div>
            ) : null}

            {alerts.data.employeesWithoutPix.count > 0 ? (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex justify-between items-center">
                <span className="text-orange-800">
                  🟠 <strong>{alerts.data.employeesWithoutPix.count} diarista(s) sem chave PIX</strong> — não receberão pagamento
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setLocation("/employees?filter=no-pix")}>
                    Ver diaristas
                  </Button>
                  <Button size="sm" variant="default" onClick={handleAddPixToEmployees} className="bg-orange-600 hover:bg-orange-700">
                    Adicionar PIX
                  </Button>
                </div>
              </div>
            ) : null}

            {alerts.data.pendingSchedules.count > 0 ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                <span className="text-blue-800">
                  🔵 <strong>{alerts.data.pendingSchedules.count} planejamento(s)</strong> aguardando validação
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigateWithMonth("/schedules?status=pending")}>
                    Ver planejamentos
                  </Button>
                  <Button size="sm" variant="default" onClick={handleValidateSchedules} className="bg-blue-600 hover:bg-blue-700">
                    Validar Agora
                  </Button>
                </div>
              </div>
            ) : null}

            {!alerts.data.loss.exists && alerts.data.overdueAccounts.count === 0 && alerts.data.employeesWithoutPix.count === 0 && alerts.data.pendingSchedules.count === 0 ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-800">✅ <strong>Operação saudável</strong> — nenhum alerta no momento</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Saúde Financeira e Exportação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Score */}
        {healthScore.isLoading ? (
          <div className="text-center text-gray-500">Carregando score...</div>
        ) : healthScore.data ? (
          <HealthScoreGauge
            score={healthScore.data.score}
            status={healthScore.data.status as HealthStatus}
            breakdown={healthScore.data.breakdown}
          />
        ) : null}

        {/* Exportação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Exportar Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={exportData.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => handleExport('excel')}
              >
              <Download className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => handleExport('json')}
              disabled={exportData.isPending}
            >
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Evolução Diária vs Trimestral vs Previsão */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily">Evolução Diária</TabsTrigger>
          <TabsTrigger value="trimestral">Comparação Trimestral</TabsTrigger>
          <TabsTrigger value="forecast">Previsão 30 Dias</TabsTrigger>
        </TabsList>

        {/* Tab: Evolução Diária */}
        <TabsContent value="daily">
          {dailyEvolution.isLoading ? (
            <div className="text-center text-gray-500">Carregando gráfico...</div>
          ) : dailyEvolution.data ? (
            <Card>
              <CardHeader>
                <CardTitle>Evolução Financeira Diária</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <DailyEvolutionChartJs data={dailyEvolution.data} />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* Tab: Comparação Trimestral */}
        <TabsContent value="trimestral">
          {trimestrialComparison.isLoading ? (
            <div className="text-center text-gray-500">Carregando dados...</div>
          ) : trimestrialComparison.data ? (
            <Card>
              <CardHeader>
                <CardTitle>Comparação Trimestral {year}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Gráfico de Barras Trimestral */}
                <div>
                  <h3 className="text-sm font-semibold mb-4">Receita vs Custos vs Margem</h3>
                  <div className="h-[320px]">
                    <QuarterlyComparisonChartJs data={trimestrialComparison.data.quarters} />
                  </div>
                </div>

                {/* Resumo YTD */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Receita YTD</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(trimestrialComparison.data.ytd.revenue)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Custos YTD</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">{formatCurrency(trimestrialComparison.data.ytd.costs)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Margem YTD</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(trimestrialComparison.data.ytd.margin)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600">Margem %</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">{trimestrialComparison.data.ytd.marginPercent.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* Tab: Previsão de Fluxo de Caixa */}
        <TabsContent value="forecast">
          {cashFlowForecast.isLoading ? (
            <div className="text-center text-gray-500">Carregando previsão...</div>
          ) : cashFlowForecastData ? (
            <CashFlowForecast
              historical={cashFlowForecastData.historical}
              forecast={cashFlowForecastData.forecast}
              summary={cashFlowForecastData.summary}
            />
          ) : null}
        </TabsContent>
      </Tabs>

      {/* Ranking de Clientes e Resumo de Contas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 3 Clientes */}
        {topClients.isLoading ? (
          <div className="text-center text-gray-500">Carregando clientes...</div>
        ) : topClients.data ? (
          <Card>
            <CardHeader>
              <CardTitle>Top 3 Clientes do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topClients.data.map((client, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 border-b">
                    <div>
                      <p className="font-semibold">{client.clientName}</p>
                      <p className="text-sm text-gray-600">{client.workCount} diárias</p>
                    </div>
                    <p className="font-bold">{formatCurrency(client.totalRevenue)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
        {/* Resumo de Contas */}
        {accountsSummary.isLoading ? (
          <div className="text-center text-gray-500">Carregando resumo...</div>
        ) : accountsSummary.data ? (
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Contas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">A Pagar Pendente</span>
                <span className="font-semibold">{formatCurrency(accountsSummary.data.payablePending)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pago no Mês</span>
                <span className="font-semibold text-green-600">{formatCurrency(accountsSummary.data.payablePaid)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-600">A Receber Pendente</span>
                <span className="font-semibold">{formatCurrency(accountsSummary.data.receivablePending)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recebido no Mês</span>
                <span className="font-semibold text-green-600">{formatCurrency(accountsSummary.data.receivablePaid)}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between text-lg">
                <span className="font-bold">Saldo Previsto</span>
                <span className={`font-bold ${accountsSummary.data.forecastedBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(accountsSummary.data.forecastedBalance)}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
