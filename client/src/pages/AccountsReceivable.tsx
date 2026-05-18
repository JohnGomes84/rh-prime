import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import CrudPage, { type FieldDef } from "@/components/CrudPage";
import { Button } from "@/components/ui/button";
import { Receipt, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MonthNavigator } from "@/components/dashboard-components";

const statusRender = (val: string) => {
  const styles: Record<string, string> = {
    pendente: "badge-warning", recebido: "badge-success", vencido: "badge-danger", cancelado: "badge-info",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[val] || ""}`}>{val || "\u2014"}</span>;
};

const currencyRender = (val: string) => {
  const num = parseFloat(val || "0");
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

const fields: FieldDef[] = [
  { key: "description", label: "Descri\u00e7\u00e3o", required: true },
  { key: "amount", label: "Valor (R$)", type: "number", required: true, render: currencyRender },
  { key: "dueDate", label: "Vencimento", type: "date", required: true, render: (val: any) => val ? new Date(val).toLocaleDateString("pt-BR") : "\u2014" },
  { key: "status", label: "Status", type: "select", options: [
    { value: "pendente", label: "Pendente" },
    { value: "recebido", label: "Recebido" },
    { value: "vencido", label: "Vencido" },
    { value: "cancelado", label: "Cancelado" },
  ], render: statusRender },
  { key: "receiveDate", label: "Data Recebimento", type: "date", showInTable: false },
  { key: "notes", label: "Observa\u00e7\u00f5es", type: "textarea", showInTable: false },
];

async function downloadFile(url: string, fallbackName: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro ao exportar" }));
    throw new Error(err.error || "Erro ao exportar");
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition");
  let filename = fallbackName;
  if (disposition) {
    const match = disposition.match(/filename=(.+)/);
    if (match) filename = match[1];
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

export default function AccountsReceivablePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { canCreate, canEdit, canDelete } = usePermissions();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.financeiro.receivable.list.useQuery();

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const filteredData = data?.filter((item: any) => {
    const itemDate = new Date(item.dueDate);
    return itemDate.getFullYear() === currentMonth.getFullYear() &&
           itemDate.getMonth() === currentMonth.getMonth();
  }) || [];
  const createMut = trpc.financeiro.receivable.create.useMutation({ onSuccess: () => { utils.financeiro.receivable.list.invalidate(); utils.financeiro.receivable.summary.invalidate(); } });
  const updateMut = trpc.financeiro.receivable.update.useMutation({ onSuccess: () => { utils.financeiro.receivable.list.invalidate(); utils.financeiro.receivable.summary.invalidate(); } });
  const deleteMut = trpc.financeiro.receivable.delete.useMutation({ onSuccess: () => { utils.financeiro.receivable.list.invalidate(); utils.financeiro.receivable.summary.invalidate(); } });

  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await downloadFile("/api/reports/receivable/excel", "contas_a_receber.xlsx");
      toast.success("Excel exportado com sucesso!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao exportar Excel");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      await downloadFile("/api/reports/receivable/pdf", "contas_a_receber.pdf");
      toast.success("PDF exportado com sucesso!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao exportar PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const exportButtons = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-1.5 text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10" onClick={handleExportExcel} disabled={exportingExcel}>
        {exportingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
        Excel
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 text-red-400 border-red-400/30 hover:bg-red-400/10" onClick={handleExportPdf} disabled={exportingPdf}>
        {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        PDF
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <MonthNavigator currentMonth={currentMonth} onPreviousMonth={handlePreviousMonth} onNextMonth={handleNextMonth} />
      <CrudPage
        title="Contas a Receber"
        subtitle="Receitas e créditos a receber"
        icon={<Receipt className="h-6 w-6 text-emerald-400" />}
        fields={fields}
        data={filteredData}
        isLoading={isLoading}
        canCreate={canCreate("accounts_receivable")}
        canEdit={canEdit("accounts_receivable")}
        canDelete={canDelete("accounts_receivable")}
        onCreate={async (d) => { await createMut.mutateAsync(d); }}
        onUpdate={async (d) => { await updateMut.mutateAsync(d); }}
        onDelete={async (id) => { await deleteMut.mutateAsync(id); }}
        searchPlaceholder="Buscar por descrição..."
        headerExtra={exportButtons}
      />
    </div>
  );
}
