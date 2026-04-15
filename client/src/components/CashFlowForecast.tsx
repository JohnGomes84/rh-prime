import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import "chart.js/auto";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar, Line } from "react-chartjs-2";

interface CashFlowForecastProps {
  historical: Array<{ month: string; revenue: number; costs: number }>;
  forecast: Array<{ week: string; revenue: number; costs: number; margin: number }>;
  summary: {
    avgRevenue: number;
    avgCosts: number;
    avgMargin: number;
    confidence: number;
  };
}

export function CashFlowForecast({ historical, forecast, summary }: CashFlowForecastProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const historicalData: ChartData<"bar"> = {
    labels: historical.map((item) => item.month),
    datasets: [
      {
        label: "Receita",
        data: historical.map((item) => item.revenue),
        backgroundColor: "rgba(16, 185, 129, 0.78)",
        borderRadius: 10,
        maxBarThickness: 42,
      },
      {
        label: "Custos",
        data: historical.map((item) => item.costs),
        backgroundColor: "rgba(239, 68, 68, 0.72)",
        borderRadius: 10,
        maxBarThickness: 42,
      },
    ],
  };

  const forecastData: ChartData<"line"> = {
    labels: forecast.map((item) => item.week),
    datasets: [
      {
        label: "Receita Prevista",
        data: forecast.map((item) => item.revenue),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.16)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
      {
        label: "Custos Previstos",
        data: forecast.map((item) => item.costs),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
      {
        label: "Margem Prevista",
        data: forecast.map((item) => item.margin),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderDash: [6, 4],
        tension: 0.3,
        pointRadius: 2,
      },
    ],
  };

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label(context) {
            return `${context.dataset.label}: ${formatCurrency(Number(context.raw ?? 0))}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          callback(value) {
            return formatCompactCurrency(Number(value));
          },
        },
      },
    },
  };

  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label(context) {
            return `${context.dataset.label}: ${formatCurrency(Number(context.raw ?? 0))}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        ticks: {
          callback(value) {
            return formatCompactCurrency(Number(value));
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Historico (3 meses) vs Previsao (proximas 4 semanas)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Historico Financeiro</h3>
            <div className="h-[250px]">
              <Bar data={historicalData} options={barOptions} />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Previsao (proximos 30 dias)</h3>
            <div className="h-[250px]">
              <Line data={forecastData} options={lineOptions} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Receita Media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.avgRevenue)}</div>
            <p className="mt-1 text-xs text-gray-500">Ultimos 3 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Custos Medios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.avgCosts)}</div>
            <p className="mt-1 text-xs text-gray-500">Ultimos 3 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Margem Media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.avgMargin)}</div>
            <p className="mt-1 text-xs text-gray-500">Ultimos 3 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Confianca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{Math.round(summary.confidence * 100)}%</div>
            <p className="mt-1 text-xs text-gray-500">Baseado em 3 meses</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Esta previsao usa a media dos ultimos 3 meses e assume repeticao do padrao.
          Sazonalidade e eventos especiais podem afetar a precisao.
        </p>
      </div>
    </div>
  );
}
