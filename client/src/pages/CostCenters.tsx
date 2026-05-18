import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import CrudPage, { type FieldDef } from "@/components/CrudPage";
import { Settings } from "lucide-react";

const fields: FieldDef[] = [
  { key: "name", label: "Nome do Centro de Custo", required: true },
  { key: "isActive", label: "Ativo", type: "checkbox", defaultValue: true, showInTable: true, render: (val: boolean) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${val !== false ? "badge-success" : "badge-danger"}`}>
      {val !== false ? "Ativo" : "Inativo"}
    </span>
  )},
];

export default function CostCentersPage() {
  const { canCreate, canDelete } = usePermissions();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.cadastros.costCenters.list.useQuery();
  const createMut = trpc.cadastros.costCenters.create.useMutation({ onSuccess: () => utils.cadastros.costCenters.list.invalidate() });
  const deleteMut = trpc.cadastros.costCenters.delete.useMutation({ onSuccess: () => utils.cadastros.costCenters.list.invalidate() });

  return (
    <CrudPage
      title="Centros de Custo"
      subtitle="Classificação de despesas e receitas"
      icon={<Settings className="h-6 w-6 text-primary" />}
      fields={fields}
      data={data || []}
      isLoading={isLoading}
      canCreate={canCreate("cost_centers")}
      canEdit={false}
      canDelete={canDelete("cost_centers")}
      onCreate={async (d) => { await createMut.mutateAsync(d); }}
      onDelete={async (id) => { await deleteMut.mutateAsync(id); }}
    />
  );
}
