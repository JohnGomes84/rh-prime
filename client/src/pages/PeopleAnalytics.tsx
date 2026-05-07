import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Users, TrendingDown, TrendingUp, Clock, DollarSign, AlertTriangle, Calendar, BarChart3 } from "lucide-react";
import DashboardLayout from '@/components/DashboardLayout';

export default function PeopleAnalytics() {
  const [period, setPeriod] = useState("12");
  const employeesQuery = trpc.employees.list.useQuery({});
  const vacationsQuery = trpc.vacations.list.useQuery({});

  const employees = useMemo(() => employeesQuery.data?.data || employeesQuery.data || [], [employeesQuery.data]);
  const vacations = useMemo(() => vacationsQuery.data || [], [vacationsQuery.data]);

  // KPIs calculados
  const totalEmployees = Array.isArray(employees) ? employees.length : 0;
  const activeEmployees = Array.isArray(employees) ? employees.filter((e: any) => e.status === "Ativo").length : 0;
  const inactiveEmployees = Array.isArray(employees) ? employees.filter((e: any) => e.status === "Inativo").length : 0;
  const onVacation = Array.isArray(employees) ? employees.filter((e: any) => e.status === "Férias").length : 0;
  const onLeave = Array.isArray(employees) ? employees.filter((e: any) => e.status === "Afastado").length : 0;

  const turnoverRate = totalEmployees > 0 ? ((inactiveEmployees / totalEmployees) * 100).toFixed(1) : "0.0";
  const absenteeismRate = totalEmployees > 0 ? (((onVacation + onLeave) / totalEmployees) * 100).toFixed(1) : "0.0";

  // Distribuição por tipo de contrato
  const contractTypes = Array.isArray(employees) ? employees.reduce((acc: Record<string, number>, e: any) => {
    const type = e.employmentType || "Não informado";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) : {};

  // Distribuição por gênero
  const genderDist = Array.isArray(employees) ? employees.reduce((acc: Record<string, number>, e: any) => {
    const g = e.gender || "Não informado";
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) : {};

  const isLoading = employeesQuery.isLoading || vacationsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold">People Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 bg-muted rounded w-24" /></CardHeader>
              <CardContent><div className="h-8 bg-muted rounded w-16" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">People Analytics</h1>
          <p className="text-muted-foreground">Indicadores de desempenho e gestão de pessoas</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">{activeEmployees} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Turnover</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{turnoverRate}%</div>
            <p className="text-xs text-muted-foreground">{inactiveEmployees} desligados no período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absenteísmo</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{absenteeismRate}%</div>
            <p className="text-xs text-muted-foreground">{onVacation} férias, {onLeave} afastados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Férias Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(vacations) ? vacations.filter((v: any) => v.status === "Pendente").length : 0}</div>
            <p className="text-xs text-muted-foreground">aguardando aprovação</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="turnover">Turnover</TabsTrigger>
          <TabsTrigger value="diversity">Diversidade</TabsTrigger>
          <TabsTrigger value="costs">Custos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Distribuição por Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Ativos", value: activeEmployees, color: "bg-green-500", pct: totalEmployees > 0 ? (activeEmployees/totalEmployees*100).toFixed(0) : 0 },
                    { label: "Inativos", value: inactiveEmployees, color: "bg-red-500", pct: totalEmployees > 0 ? (inactiveEmployees/totalEmployees*100).toFixed(0) : 0 },
                    { label: "Férias", value: onVacation, color: "bg-blue-500", pct: totalEmployees > 0 ? (onVacation/totalEmployees*100).toFixed(0) : 0 },
                    { label: "Afastados", value: onLeave, color: "bg-amber-500", pct: totalEmployees > 0 ? (onLeave/totalEmployees*100).toFixed(0) : 0 },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="text-sm flex-1">{item.label}</span>
                      <span className="text-sm font-medium">{item.value}</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{item.pct}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Distribuição por Tipo de Contrato */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tipo de Contrato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(contractTypes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm flex-1">{type}</span>
                      <span className="text-sm font-medium">{count as number}</span>
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2" style={{ width: `${totalEmployees > 0 ? ((count as number)/totalEmployees*100) : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="turnover" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Taxa de Turnover</CardTitle>
                <CardDescription>Últimos {period} meses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-center py-4">{turnoverRate}%</div>
                <p className="text-sm text-center text-muted-foreground">
                  {Number(turnoverRate) < 5 ? "✅ Saudável" : Number(turnoverRate) < 15 ? "⚠️ Atenção" : "🚨 Crítico"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Admissões</CardTitle>
                <CardDescription>No período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-center py-4 text-green-600">{activeEmployees}</div>
                <p className="text-sm text-center text-muted-foreground">colaboradores ativos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Desligamentos</CardTitle>
                <CardDescription>No período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-center py-4 text-red-600">{inactiveEmployees}</div>
                <p className="text-sm text-center text-muted-foreground">colaboradores desligados</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="diversity" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Gênero</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(genderDist).map(([gender, count]) => (
                    <div key={gender} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${gender === "M" ? "bg-blue-500" : gender === "F" ? "bg-pink-500" : "bg-purple-500"}`} />
                      <span className="text-sm flex-1">{gender === "M" ? "Masculino" : gender === "F" ? "Feminino" : gender}</span>
                      <span className="text-sm font-medium">{count as number}</span>
                      <span className="text-xs text-muted-foreground">{totalEmployees > 0 ? ((count as number)/totalEmployees*100).toFixed(0) : 0}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Indicadores de Diversidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 py-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Equidade de Gênero</span>
                    <span className="text-sm font-medium">
                      {(() => {
                        const m = (genderDist["M"] || 0) as number;
                        const f = (genderDist["F"] || 0) as number;
                        if (m + f === 0) return "N/A";
                        const ratio = Math.min(m, f) / Math.max(m, f);
                        return `${(ratio * 100).toFixed(0)}%`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total de Gêneros Representados</span>
                    <span className="text-sm font-medium">{Object.keys(genderDist).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Custo por Colaborador
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Integre a folha de pagamento para visualizar custos detalhados por colaborador, departamento e tipo de contrato.</p>
                <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                  <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm">Dados disponíveis após processamento da folha</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Custo de Turnover
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Estimativa de custo de turnover baseada em salário médio e custos de recrutamento.</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Desligamentos</span>
                    <span className="text-sm font-medium">{inactiveEmployees}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Custo estimado por desligamento</span>
                    <span className="text-sm font-medium">~3x salário</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
