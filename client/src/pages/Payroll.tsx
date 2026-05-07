import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Calendar, DollarSign, Receipt, Users } from "lucide-react";

const initialMonth = new Date().toISOString().slice(0, 7);

export default function Payroll() {
  const [monthValue, setMonthValue] = useState(initialMonth);
  const [year, month] = monthValue.split("-").map(Number);
  const { data, isLoading } = trpc.payroll.summary.useQuery({ month, year });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Folha de Pagamento</h1>
            <p className="text-muted-foreground mt-2">Consolidacao mensal calculada a partir de contratos, beneficios e horas extras.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="month" value={monthValue} onChange={(event) => setMonthValue(event.target.value)} className="w-44" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-blue-600">
                R$ {Number(data?.totals.baseSalary ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground">Base Salarial</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-green-600">
                R$ {Number(data?.totals.netSalary ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground">Liquido Estimado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-orange-600">{data?.employees ?? 0}</p>
              <p className="text-sm text-muted-foreground">Colaboradores</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-purple-600">
                R$ {Number(data?.totals.fgts ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground">FGTS</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="holerites" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="holerites">Colaboradores</TabsTrigger>
            <TabsTrigger value="encargos">Encargos</TabsTrigger>
            <TabsTrigger value="beneficios">Beneficios</TabsTrigger>
          </TabsList>

          <TabsContent value="holerites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Demonstrativo por Colaborador
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-muted-foreground">Carregando...</div>
                ) : (
                  <div className="space-y-4">
                    {data?.items.map((item: any) => (
                      <div key={item.employee.id} className="rounded border p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">{item.employee.fullName}</h3>
                            <p className="text-sm text-muted-foreground">{item.contract?.contractType || "Sem contrato"} • {item.employee.cpf}</p>
                          </div>
                          <Badge>{item.employee.status}</Badge>
                        </div>
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Base</p>
                            <p className="font-medium">R$ {Number(item.breakdown.baseSalary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Bruto</p>
                            <p className="font-medium">R$ {Number(item.breakdown.grossSalary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">INSS + IR</p>
                            <p className="font-medium">R$ {Number(item.breakdown.inss + item.breakdown.ir).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Horas Extras</p>
                            <p className="font-medium">{item.overtime.totalOvertimeHours}h</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Liquido</p>
                            <p className="font-bold">R$ {Number(item.breakdown.netSalary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="encargos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> Encargos Consolidados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="rounded border p-4">
                    <p className="text-sm text-muted-foreground">INSS</p>
                    <p className="text-2xl font-bold">R$ {Number(data?.totals.inss ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded border p-4">
                    <p className="text-sm text-muted-foreground">IR</p>
                    <p className="text-2xl font-bold">R$ {Number(data?.totals.ir ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded border p-4">
                    <p className="text-sm text-muted-foreground">FGTS</p>
                    <p className="text-2xl font-bold">R$ {Number(data?.totals.fgts ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="rounded border p-4">
                    <p className="text-sm text-muted-foreground">Outros Descontos</p>
                    <p className="text-2xl font-bold">R$ {Number(data?.totals.otherDeductions ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="beneficios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Beneficios Aplicados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.items.map((item: any) => (
                    <div key={item.employee.id} className="rounded border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.employee.fullName}</p>
                          <p className="text-sm text-muted-foreground">{item.benefits.length} beneficios cadastrados</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href="/holerite">
                            <Calendar className="w-4 h-4 mr-2" />
                            Ver holerite
                          </a>
                        </Button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.benefits.length === 0 ? (
                          <Badge variant="secondary">Sem beneficios</Badge>
                        ) : (
                          item.benefits.map((benefit: any) => (
                            <Badge key={benefit.id} variant="secondary">
                              {benefit.benefitType}: R$ {Number(benefit.value ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
