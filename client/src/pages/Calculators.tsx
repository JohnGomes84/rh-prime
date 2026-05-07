import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Coins, Plane, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const formatBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export default function Calculators() {
  // 13º
  const [d13Salary, setD13Salary] = useState<number>(0);
  const [d13Months, setD13Months] = useState<number>(12);
  const d13 = trpc.laborCalc.decimoTerceiro.useQuery(
    { salaryGross: d13Salary, monthsWorked: d13Months },
    { enabled: d13Salary > 0 }
  );

  // Férias proporcionais
  const [fpSalary, setFpSalary] = useState<number>(0);
  const [fpMonths, setFpMonths] = useState<number>(12);
  const fp = trpc.laborCalc.feriasProporcionais.useQuery(
    { salaryGross: fpSalary, monthsWorked: fpMonths },
    { enabled: fpSalary > 0 }
  );

  // Rescisão
  const [rescForm, setRescForm] = useState({
    salaryGross: 0,
    hireDate: "",
    terminationDate: new Date().toISOString().slice(0, 10),
    type: "sem_justa_causa" as const,
    fgtsBalance: undefined as number | undefined,
  });
  const [rescResult, setRescResult] = useState<any>(null);
  const utils = trpc.useUtils();

  const runRescisao = async () => {
    if (!rescForm.salaryGross || !rescForm.hireDate || !rescForm.terminationDate) {
      toast.error("Preencha salário, data admissão e data rescisão");
      return;
    }
    try {
      const result = await utils.laborCalc.rescisao.fetch(rescForm);
      setRescResult(result);
    } catch (err: any) {
      toast.error("Falha: " + (err?.message ?? String(err)));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6" /> Calculadoras Trabalhistas
          </h1>
          <p className="text-muted-foreground mt-1">
            Estimativas baseadas na CLT. Não substituem cálculo oficial do contador.
          </p>
        </div>

        <Tabs defaultValue="rescisao" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rescisao" className="gap-1"><AlertTriangle className="h-4 w-4" />Rescisão</TabsTrigger>
            <TabsTrigger value="d13" className="gap-1"><Coins className="h-4 w-4" />13º Salário</TabsTrigger>
            <TabsTrigger value="ferias" className="gap-1"><Plane className="h-4 w-4" />Férias proporcionais</TabsTrigger>
          </TabsList>

          {/* Rescisão */}
          <TabsContent value="rescisao">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cálculo de rescisão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Salário bruto (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={rescForm.salaryGross || ""}
                      onChange={(e) => setRescForm({ ...rescForm, salaryGross: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={rescForm.type} onValueChange={(v) => setRescForm({ ...rescForm, type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_justa_causa">Sem justa causa</SelectItem>
                        <SelectItem value="pedido_demissao">Pedido de demissão</SelectItem>
                        <SelectItem value="justa_causa">Justa causa</SelectItem>
                        <SelectItem value="fim_contrato_determinado">Fim contrato determinado</SelectItem>
                        <SelectItem value="acordo_mutuo">Acordo mútuo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data admissão</Label>
                    <Input
                      type="date"
                      value={rescForm.hireDate}
                      onChange={(e) => setRescForm({ ...rescForm, hireDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Data rescisão</Label>
                    <Input
                      type="date"
                      value={rescForm.terminationDate}
                      onChange={(e) => setRescForm({ ...rescForm, terminationDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Saldo FGTS (R$, opcional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Em branco = estimativa 8%/mês"
                      value={rescForm.fgtsBalance ?? ""}
                      onChange={(e) =>
                        setRescForm({
                          ...rescForm,
                          fgtsBalance: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <Button onClick={runRescisao} className="w-full md:w-auto">
                  Calcular rescisão
                </Button>

                {rescResult && (
                  <div className="rounded-md border bg-muted/30 p-4 space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <Stat label="Saldo de salário" value={formatBRL(rescResult.saldoSalario)} />
                      <Stat label="Aviso prévio" value={formatBRL(rescResult.avisoPrevio)} />
                      <Stat label="13º proporcional" value={formatBRL(rescResult.decimoTerceiroProporcional)} />
                      <Stat label="Férias proporcionais" value={formatBRL(rescResult.feriasProporcionais)} />
                      <Stat label="1/3 sobre férias" value={formatBRL(rescResult.oneThirdBonus)} />
                      <Stat label="Multa FGTS" value={formatBRL(rescResult.multaFgts)} />
                    </div>
                    <div className="border-t pt-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Tempo de casa: {rescResult.monthsCLT} meses ({rescResult.daysWorked} dias) · FGTS estimado: {formatBRL(rescResult.fgtsBalanceEstimated)}
                      </span>
                      <span className="text-xl font-bold text-primary">{formatBRL(rescResult.total)}</span>
                    </div>
                    {rescResult.notes?.length > 0 && (
                      <ul className="text-xs text-muted-foreground list-disc list-inside">
                        {rescResult.notes.map((n: string, i: number) => <li key={i}>{n}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 13º */}
          <TabsContent value="d13">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">13º Salário (proporcional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Salário bruto (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={d13Salary || ""}
                      onChange={(e) => setD13Salary(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Meses trabalhados no ano</Label>
                    <Input
                      type="number"
                      min={0}
                      max={12}
                      value={d13Months}
                      onChange={(e) => setD13Months(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                {d13.data && d13Salary > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Proporcional" value={formatBRL(d13.data.proportional)} highlight />
                    <Stat label="Integral (referência)" value={formatBRL(d13.data.full)} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Férias proporcionais */}
          <TabsContent value="ferias">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Férias proporcionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Salário bruto (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fpSalary || ""}
                      onChange={(e) => setFpSalary(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Meses trabalhados no período aquisitivo</Label>
                    <Input
                      type="number"
                      min={0}
                      max={12}
                      value={fpMonths}
                      onChange={(e) => setFpMonths(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                {fp.data && fpSalary > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Dias adquiridos" value={`${fp.data.daysAcquired} dias`} />
                    <Stat label="Valor das férias" value={formatBRL(fp.data.vacationValue)} />
                    <Stat label="1/3 constitucional" value={formatBRL(fp.data.oneThirdBonus)} />
                    <Stat label="Total" value={formatBRL(fp.data.total)} highlight />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? "bg-primary/5 border-primary/30" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
