import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Download, AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CompliancePortaria() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));

  const exportsList = trpc.compliancePortaria.list.useQuery();
  const verifyChain = trpc.compliancePortaria.verifyChain.useQuery({ startDate, endDate });

  const generateAfd = trpc.compliancePortaria.generateAfd.useMutation({
    onSuccess: (r) => {
      downloadText(r.content, `AFD_${startDate}_${endDate}.txt`);
      toast.success(`AFD: ${r.records} marcações · ${formatBytes(r.bytes)}`);
      exportsList.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const generateAfdt = trpc.compliancePortaria.generateAfdt.useMutation({
    onSuccess: (r) => {
      downloadText(r.content, `AFDT_${startDate}_${endDate}.txt`);
      toast.success(`AFDT: ${r.records} aprovadas · ${formatBytes(r.bytes)}`);
      exportsList.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const generateAcjef = trpc.compliancePortaria.generateAcjef.useMutation({
    onSuccess: (r) => {
      downloadText(r.content, `ACJEF_${startDate}_${endDate}.txt`);
      toast.success(`ACJEF: ${r.records} dias · ${formatBytes(r.bytes)}`);
      exportsList.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Compliance Portaria 671/2021
          </h1>
          <p className="text-muted-foreground mt-1">
            Geração de AFD, AFDT e ACJEF + verificação da cadeia de hash dos registros de ponto.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Período</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Data inicial</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Data final</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> AFD
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Arquivo Fonte de Dados — todas as marcações brutas com NSR e hash chain.
              </p>
              <Button
                className="w-full"
                onClick={() => generateAfd.mutate({ startDate, endDate })}
                disabled={generateAfd.isPending}
              >
                {generateAfd.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Gerar AFD
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> AFDT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Arquivo Fonte de Dados Tratado — apenas marcações aprovadas com flag de ajuste.
              </p>
              <Button
                className="w-full"
                onClick={() => generateAfdt.mutate({ startDate, endDate })}
                disabled={generateAfdt.isPending}
              >
                {generateAfdt.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Gerar AFDT
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> ACJEF
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Arquivo de Controle de Jornada — totais por funcionário/dia (esperado, atraso, HE, banco).
              </p>
              <Button
                className="w-full"
                onClick={() => generateAcjef.mutate({ startDate, endDate })}
                disabled={generateAcjef.isPending}
              >
                {generateAcjef.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Gerar ACJEF
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Integridade da cadeia de hash
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verifyChain.isLoading ? (
              <p className="text-sm text-muted-foreground">Verificando…</p>
            ) : verifyChain.data ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Total" value={String(verifyChain.data.total)} />
                  <Stat label="Válidos" value={String(verifyChain.data.valid)} highlight={verifyChain.data.broken === 0} />
                  <Stat label="Comprometidos" value={String(verifyChain.data.broken)} danger={verifyChain.data.broken > 0} />
                </div>
                {verifyChain.data.issues.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                    <p className="font-medium text-amber-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> Inconsistências detectadas:
                    </p>
                    <ul className="mt-1 space-y-1">
                      {verifyChain.data.issues.map((i: any) => (
                        <li key={i.id} className="text-xs">
                          NSR {i.nsr} (id {i.id}): {i.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {verifyChain.data.broken === 0 && verifyChain.data.total > 0 && (
                  <p className="text-sm text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Todos os registros têm hash íntegro.
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de exportações</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Período</th>
                  <th className="text-left p-2">Registros</th>
                  <th className="text-left p-2">Tamanho</th>
                  <th className="text-left p-2">SHA-256</th>
                  <th className="text-left p-2">Gerado em</th>
                </tr>
              </thead>
              <tbody>
                {(exportsList.data ?? []).map((e: any) => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2"><Badge variant="outline">{e.type}</Badge></td>
                    <td className="p-2">{new Date(e.periodStart).toLocaleDateString("pt-BR")} – {new Date(e.periodEnd).toLocaleDateString("pt-BR")}</td>
                    <td className="p-2">{e.recordCount}</td>
                    <td className="p-2">{e.fileBytes ? formatBytes(e.fileBytes) : "—"}</td>
                    <td className="p-2 font-mono text-xs">{e.fileSha256?.slice(0, 16) ?? "—"}…</td>
                    <td className="p-2">{new Date(e.generatedAt).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
                {(exportsList.data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum arquivo gerado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, highlight, danger }: { label: string; value: string; highlight?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${highlight ? "bg-emerald-50 border-emerald-200" : danger ? "bg-red-50 border-red-200" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${highlight ? "text-emerald-700" : danger ? "text-red-700" : ""}`}>{value}</p>
    </div>
  );
}
