import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import CrudPage, { type FieldDef } from "@/components/CrudPage";
import { Briefcase } from "lucide-react";

const fields: FieldDef[] = [
  { key: "name", label: "Nome da Função", required: true },
  { key: "defaultPayValue", label: "Valor Pago (R$)", type: "number", placeholder: "0.00" },
  { key: "defaultReceiveValue", label: "Valor Cobrado (R$)", type: "number", placeholder: "0.00" },
  { key: "isActive", label: "Ativo", type: "checkbox", defaultValue: true, showInTable: true, render: (val: boolean) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${val !== false ? "badge-success" : "badge-danger"}`}>
      {val !== false ? "Ativo" : "Inativo"}
    </span>
  )},
];

export default function FunctionsPage() {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.cadastros.jobFunctions.list.useQuery();
  const createMut = trpc.cadastros.jobFunctions.create.useMutation({ onSuccess: () => utils.cadastros.jobFunctions.list.invalidate() });
  const updateMut = trpc.cadastros.jobFunctions.update.useMutation({ onSuccess: () => utils.cadastros.jobFunctions.list.invalidate() });
  const deleteMut = trpc.cadastros.jobFunctions.delete.useMutation({ onSuccess: () => utils.cadastros.jobFunctions.list.invalidate() });

  return (
    <CrudPage
      title="Funções"
      subtitle="Cargos e funções com valores padrão"
      icon={<Briefcase className="h-6 w-6 text-primary" />}
      fields={fields}
      data={data || []}
      isLoading={isLoading}
      canCreate={canCreate("functions")}
      canEdit={canEdit("functions")}
      canDelete={canDelete("functions")}
      onCreate={async (d) => { await createMut.mutateAsync(d); }}
      onUpdate={async (d) => { await updateMut.mutateAsync(d); }}
      onDelete={async (id) => { await deleteMut.mutateAsync(id); }}
    />
  );
}
