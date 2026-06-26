import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const STORED_TEMPLATES = [
  { key: "rh_admin.semanal.detalhado", label: "RH — Semanal" },
  { key: "rh_admin.mensal", label: "RH — Mensal" },
  { key: "financeiro.semanal.detalhado", label: "Financeiro — Semanal" },
  { key: "financeiro.mensal", label: "Financeiro — Mensal" },
] as const;

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-slate-100 text-slate-700" },
  enviado: { label: "Aguardando validação", className: "bg-amber-100 text-amber-800" },
  validado: { label: "Validado", className: "bg-green-100 text-green-800" },
  devolvido: { label: "Devolvido", className: "bg-red-100 text-red-800" },
};

function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  if (overdue && status !== "validado") {
    return <Badge className="bg-red-100 text-red-800">Em atraso</Badge>;
  }
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.rascunho;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export default function ManagerialReports() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId !== null) {
    return <ReportEditor id={selectedId} onBack={() => setSelectedId(null)} />;
  }
  return <ReportList onOpen={setSelectedId} />;
}

function ReportList({ onOpen }: { onOpen: (id: number) => void }) {
  const utils = trpc.useUtils();
  const { data: reports, isLoading } = trpc.managerialReports.listReports.useQuery({});
  const [open, setOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState(STORED_TEMPLATES[0].key);
  const [periodRef, setPeriodRef] = useState("");

  const create = trpc.managerialReports.createFromTemplate.useMutation({
    onSuccess: ({ id }) => {
      toast.success("Relatório criado");
      setOpen(false);
      utils.managerialReports.listReports.invalidate();
      onOpen(id);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Relatórios Gerenciais</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Novo relatório</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo relatório</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={templateKey} onValueChange={(v) => setTemplateKey(v as typeof templateKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORED_TEMPLATES.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Período (ex.: 2026-W26 ou 2026-06)"
                value={periodRef}
                onChange={(e) => setPeriodRef(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={!periodRef || create.isPending}
                onClick={() => create.mutate({ templateKey, periodRef })}
              >
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p>Carregando…</p>}
      <div className="grid gap-3">
        {reports?.map((r) => (
          <Card key={r.id} className="cursor-pointer hover:bg-accent/40" onClick={() => onOpen(r.id)}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">
                  {r.sector === "rh_admin" ? "RH Administrativo" : "Financeiro"} · {r.cadence} · {r.periodRef}
                </p>
                <p className="text-sm text-muted-foreground">Prazo: {r.dueDate}</p>
              </div>
              <StatusBadge status={r.status} overdue={(r as any).overdue} />
            </CardContent>
          </Card>
        ))}
        {reports?.length === 0 && !isLoading && (
          <p className="text-muted-foreground">Nenhum relatório ainda.</p>
        )}
      </div>
    </div>
  );
}

function ReportEditor({ id, onBack }: { id: number; onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.managerialReports.getReport.useQuery({ id });

  const updateItem = trpc.managerialReports.updateItem.useMutation({
    onSuccess: () => utils.managerialReports.getReport.invalidate({ id }),
    onError: (e) => toast.error(e.message),
  });
  const updateReport = trpc.managerialReports.updateReport.useMutation({
    onSuccess: () => utils.managerialReports.getReport.invalidate({ id }),
    onError: (e) => toast.error(e.message),
  });
  const submit = trpc.managerialReports.submitForValidation.useMutation({
    onSuccess: () => {
      toast.success("Enviado para validação");
      utils.managerialReports.getReport.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });
  const validate = trpc.managerialReports.validate.useMutation({
    onSuccess: () => {
      toast.success("Validação registrada");
      utils.managerialReports.getReport.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="p-6">Carregando…</div>;
  const { report, items } = data;
  const locked = report.status === "validado";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Voltar
        </Button>
        <StatusBadge status={report.status} overdue={(data as any).overdue} />
      </div>

      <h1 className="text-xl font-bold">
        {report.sector === "rh_admin" ? "RH Administrativo" : "Financeiro"} · {report.cadence} · {report.periodRef}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="border-b pb-3">
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.expectedContent}</p>
              <Textarea
                className="mt-2"
                defaultValue={item.value ?? ""}
                disabled={locked}
                onBlur={(e) => updateItem.mutate({ reportId: id, itemId: item.id, value: e.target.value })}
              />
              <Select
                value={item.itemStatus}
                disabled={locked}
                onValueChange={(v) =>
                  updateItem.mutate({ reportId: id, itemId: item.id, itemStatus: v as any })
                }
              >
                <SelectTrigger className="mt-2 w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Síntese</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Resumo geral"
            defaultValue={report.summary ?? ""}
            disabled={locked}
            onBlur={(e) => updateReport.mutate({ id, summary: e.target.value })}
          />
          <Textarea
            placeholder="Pontos para validação"
            defaultValue={report.pointsForValidator ?? ""}
            disabled={locked}
            onBlur={(e) => updateReport.mutate({ id, pointsForValidator: e.target.value })}
          />
          <Textarea
            placeholder="Próximas prioridades"
            defaultValue={report.nextPriorities ?? ""}
            disabled={locked}
            onBlur={(e) => updateReport.mutate({ id, nextPriorities: e.target.value })}
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {(report.status === "rascunho" || report.status === "devolvido") && (
          <Button onClick={() => submit.mutate({ id })}>Enviar para validação</Button>
        )}
        {report.status === "enviado" && (
          <>
            <Button onClick={() => validate.mutate({ id, approve: true })}>Aprovar</Button>
            <Button
              variant="destructive"
              onClick={() => validate.mutate({ id, approve: false, rejectionNote: "Revisar e reenviar" })}
            >
              Devolver
            </Button>
          </>
        )}
      </div>
      {report.status === "devolvido" && report.rejectionNote && (
        <p className="text-sm text-red-700">Devolução: {report.rejectionNote}</p>
      )}
    </div>
  );
}
