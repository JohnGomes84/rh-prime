import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HealthScoreGaugeProps {
  score: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  breakdown: {
    margin: { score: number; percentage: number };
    delinquency: { score: number; percentage: number };
    cashDays: { score: number; days: number };
  };
}

export function HealthScoreGauge({ score, status, breakdown }: HealthScoreGaugeProps) {
  const statusColors = {
    excellent: 'text-green-600 bg-green-50 border-green-200',
    good: 'text-blue-600 bg-blue-50 border-blue-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
  };

  const statusLabels = {
    excellent: 'Excelente',
    good: 'Bom',
    warning: 'Atenção',
    critical: 'Crítico',
  };

  const gaugeColor = {
    excellent: '#10b981',
    good: '#3b82f6',
    warning: '#f59e0b',
    critical: '#ef4444',
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className={`border-2 ${statusColors[status]}`}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Saúde Financeira</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gauge SVG */}
        <div className="flex justify-center">
          <svg width="150" height="150" viewBox="0 0 150 150">
            {/* Background circle */}
            <circle cx="75" cy="75" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            {/* Progress circle */}
            <circle
              cx="75"
              cy="75"
              r="45"
              fill="none"
              stroke={gaugeColor[status]}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 75 75)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
            {/* Score text */}
            <text x="75" y="75" textAnchor="middle" dy="0.3em" className="text-2xl font-bold" fill={gaugeColor[status]}>
              {score}
            </text>
            <text x="75" y="95" textAnchor="middle" dy="0.3em" className="text-xs" fill="#6b7280">
              {statusLabels[status]}
            </text>
          </svg>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
            <span className="font-medium">Margem</span>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-600">{breakdown.margin.percentage}%</span>
              <span className="font-bold text-green-600">{breakdown.margin.score}</span>
            </div>
          </div>

          <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
            <span className="font-medium">Inadimplência</span>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-600">{breakdown.delinquency.percentage}%</span>
              <span className={`font-bold ${breakdown.delinquency.score > 20 ? 'text-green-600' : 'text-red-600'}`}>
                {breakdown.delinquency.score}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
            <span className="font-medium">Dias de Caixa</span>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-600">{breakdown.cashDays.days} dias</span>
              <span className="font-bold text-blue-600">{breakdown.cashDays.score}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
