import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Wallet, Plus, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { computeAllocationNetNumber } from "@shared/money";

type PaymentRecord = {
  id: number;
  employeeId: number;
  employeeName: string;
  scheduleDate: string | Date;
  baseValue: number;
  mealAllowance: number;
  voucher: number;
  bonus: number;
  pixKey: string;
  status: string;
};

const formatCurrency = (val: string | number) => {
  const num = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

const formatDate = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "—";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function PaymentBatchesPage() {
  const { canCreate, canEdit } = usePermissions();
  const utils = trpc.useUtils();
  const { data: batches, isLoading } = trpc.financeiro.batches.list.useQuery();
  const { data: paymentRecords } = trpc.financeiro.payments.list.useQuery();

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [periodStart, setPeriodStart] = useState(toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [periodEnd, setPeriodEnd] = useState(toDateInputValue(new Date()));

  const createBatch = trpc.financeiro.batches.create.useMutation();
  const addItem = trpc.financeiro.batches.addItem.useMutation();
  const markPaid = trpc.financeiro.batches.markPaid.useMutation({
    onSuccess: async () => {
      await utils.financeiro.batches.list.invalidate();
      toast.success("Lote marcado como pago");
    },
    onError: error => {
      toast.error(error.message || "Erro ao marcar lote como pago");
    },
  });

  const statusStyles: Record<string, string> = {
    rascunho: "badge-info",
    pendente: "badge-warning",
    pago: "badge-success",
    cancelado: "badge-danger",
  };

  const pendingPayments = useMemo(() => {
    const records = ((paymentRecords || []) as PaymentRecord[]).filter(record => record.status === "pending");
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    end.setHours(23, 59, 59, 999);

    return records.filter(record => {
      const date = new Date(record.scheduleDate);
      return date >= start && date <= end;
    });
  }, [paymentRecords, periodEnd, periodStart]);

  const handleCreateBatch = async () => {
    if (!title.trim()) {
      toast.error("Informe o título do lote");
      return;
    }

    if (pendingPayments.length === 0) {
      toast.error("Não há pagamentos pendentes no período selecionado");
      return;
    }

    // Agrupar pagamentos por funcionário (várias alocações no período = 1 item, valores somados,
    // dailyRate = média ponderada). Evita "Funcionário já existe neste lote" no addItem.
    type Aggregated = {
      employeeId: number;
      daysWorked: number;
      baseTotal: number;
      mealTotal: number;
      voucherTotal: number;
      bonusTotal: number;
      pixKey: string;
    };
    const grouped = new Map<number, Aggregated>();
    for (const record of pendingPayments) {
      const existing = grouped.get(record.employeeId);
      if (existing) {
        existing.daysWorked += 1;
        existing.baseTotal += record.baseValue;
        existing.mealTotal += record.mealAllowance;
        existing.voucherTotal += record.voucher;
        existing.bonusTotal += record.bonus;
        if (!existing.pixKey && record.pixKey) existing.pixKey = record.pixKey;
      } else {
        grouped.set(record.employeeId, {
          employeeId: record.employeeId,
          daysWorked: 1,
          baseTotal: record.baseValue,
          mealTotal: record.mealAllowance,
          voucherTotal: record.voucher,
          bonusTotal: record.bonus,
          pixKey: record.pixKey || "",
        });
      }
    }

    try {
      const created = await createBatch.mutateAsync({
        title: title.trim(),
        periodStart,
        periodEnd,
      });

      for (const agg of Array.from(grouped.values())) {
        const dailyRate = agg.daysWorked > 0 ? agg.baseTotal / agg.daysWorked : 0;
        await addItem.mutateAsync({
          batchId: created.id,
          employeeId: agg.employeeId,
          daysWorked: agg.daysWorked,
          dailyRate: dailyRate.toFixed(2),
          mealAllowance: agg.mealTotal.toFixed(2),
          bonus: agg.bonusTotal.toFixed(2),
          voucher: agg.voucherTotal.toFixed(2),
          pixKey: agg.pixKey || undefined,
        });
      }

      await utils.financeiro.batches.list.invalidate();
      setCreateOpen(false);
      setTitle("");
      toast.success(`Lote criado com ${grouped.size} funcionário(s) (${pendingPayments.length} alocações)`);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao criar lote");
    }
  };

  const creating = createBatch.isPending || addItem.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Wallet className="h-6 w-6 text-primary" /> Lotes de Pagamento
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Pagamentos em lote para funcionários</p>
        </div>
        {canCreate("payment_batches") && (
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Novo Lote
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !batches || batches.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum lote de pagamento criado
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {batches.map(batch => (
            <Card key={batch.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{batch.title}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{batch.employeeCount || 0} funcionários</span>
                      <span>{formatDate(batch.periodStart)} a {formatDate(batch.periodEnd)}</span>
                      <span className={`rounded-full px-2 py-0.5 ${statusStyles[batch.status] || ""}`}>
                        {batch.status}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-lg font-bold">{formatCurrency(batch.totalAmount || "0")}</p>
                    {canEdit("payment_batches") && batch.status !== "pago" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => markPaid.mutate(batch.id)}
                        disabled={markPaid.isPending}
                      >
                        <CheckCircle className="h-3 w-3" /> Marcar Pago
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Lote de Pagamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="Ex: Abril/2026 - Pagamentos pendentes"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Início</label>
                <Input type="date" value={periodStart} onChange={event => setPeriodStart(event.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Fim</label>
                <Input type="date" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} />
              </div>
            </div>

            <Card className="border-dashed">
              <CardContent className="space-y-1 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Pagamentos pendentes no período</span>
                  <span className="font-semibold">{pendingPayments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total estimado</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      pendingPayments.reduce(
                        (sum, record) =>
                          sum +
                          computeAllocationNetNumber({
                            days: 1,
                            dailyRate: record.baseValue,
                            mealAllowance: record.mealAllowance,
                            voucher: record.voucher,
                            bonus: record.bonus,
                          }),
                        0
                      )
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreateBatch} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Criar Lote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
