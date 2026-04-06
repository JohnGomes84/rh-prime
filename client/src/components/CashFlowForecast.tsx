import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

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

  return (
    <div className="space-y-6">
      {/* Histórico vs Previsão */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico (3 meses) vs Previsão (próximas 4 semanas)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gráfico Histórico */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Histórico Financeiro</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={historical}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Receita" />
                <Bar dataKey="costs" fill="#ef4444" name="Custos" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico Previsão */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Previsão (próximos 30 dias)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Receita Prevista" strokeWidth={2} />
                <Line type="monotone" dataKey="costs" stroke="#ef4444" name="Custos Previstos" strokeWidth={2} />
                <Line type="monotone" dataKey="margin" stroke="#3b82f6" name="Margem Prevista" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Resumo e Confiança */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Receita Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.avgRevenue)}</div>
            <p className="text-xs text-gray-500 mt-1">Últimos 3 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Custos Médios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.avgCosts)}</div>
            <p className="text-xs text-gray-500 mt-1">Últimos 3 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Margem Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.avgMargin)}</div>
            <p className="text-xs text-gray-500 mt-1">Últimos 3 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Confiança</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{Math.round(summary.confidence * 100)}%</div>
            <p className="text-xs text-gray-500 mt-1">Baseado em 3 meses</p>
          </CardContent>
        </Card>
      </div>

      {/* Aviso */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Nota:</strong> Esta previsão é baseada na média dos últimos 3 meses e assume que o padrão se repete. Sazonalidade e eventos especiais podem afetar a precisão.
        </p>
      </div>
    </div>
  );
}
