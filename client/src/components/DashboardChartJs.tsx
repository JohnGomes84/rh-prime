import "chart.js/auto";

import { Bar, Line } from "react-chartjs-2";
import type { ChartData, ChartOptions } from "chart.js";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatCurrency(value: number) {
  return currency.format(value);
}

function formatCompactCurrency(value: number) {
  return compactCurrency.format(value);
}

type DailyEvolutionPoint = {
  date: string;
  revenue: number;
  costs: number;
  margin: number;
};

type QuarterPoint = {
  quarter: string;
  revenue: number;
  costs: number;
  margin: number;
  marginPercent: number;
};

export function DailyEvolutionChartJs({ data }: { data: DailyEvolutionPoint[] }) {
  const chartData: ChartData<"line"> = {
    labels: data.map((item) => item.date.slice(8)),
    datasets: [
      {
        label: "Receita",
        data: data.map((item) => item.revenue),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.18)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: "Custos",
        data: data.map((item) => item.costs),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.12)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
      {
        label: "Margem",
        data: data.map((item) => item.margin),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.12)",
        tension: 0.3,
        borderDash: [6, 4],
        pointRadius: 2,
        pointHoverRadius: 4,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
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

  return <Line data={chartData} options={options} />;
}

export function QuarterlyComparisonChartJs({ data }: { data: QuarterPoint[] }) {
  const chartData: ChartData<"bar"> = {
    labels: data.map((item) => item.quarter),
    datasets: [
      {
        label: "Receita",
        data: data.map((item) => item.revenue),
        backgroundColor: "rgba(16, 185, 129, 0.78)",
        borderRadius: 10,
        maxBarThickness: 42,
      },
      {
        label: "Custos",
        data: data.map((item) => item.costs),
        backgroundColor: "rgba(239, 68, 68, 0.72)",
        borderRadius: 10,
        maxBarThickness: 42,
      },
      {
        label: "Margem",
        data: data.map((item) => item.margin),
        backgroundColor: "rgba(99, 102, 241, 0.72)",
        borderRadius: 10,
        maxBarThickness: 42,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
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
          afterBody(items) {
            const item = data[items[0]?.dataIndex ?? 0];
            return `Margem %: ${item?.marginPercent.toFixed(1) ?? "0.0"}%`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback(value) {
            return formatCompactCurrency(Number(value));
          },
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}
