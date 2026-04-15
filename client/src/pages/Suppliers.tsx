import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import CrudPage, { type FieldDef } from "@/components/CrudPage";
import { EntityAttachments } from "@/components/EntityAttachments";
import { Truck } from "lucide-react";

const fields: FieldDef[] = [
  { key: "name", label: "Nome", required: true },
  { key: "cnpj", label: "CNPJ" },
  { key: "city", label: "Cidade" },
  { key: "pixKey", label: "Chave PIX" },
  { key: "contactPhone", label: "Telefone" },
  { key: "contactEmail", label: "E-mail", type: "email", showInTable: false },
  { key: "isActive", label: "Ativo", showInTable: true, render: (val: boolean) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${val !== false ? "badge-success" : "badge-danger"}`}>
      {val !== false ? "Ativo" : "Inativo"}
    </span>
  )},
];

export default function SuppliersPage() {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.cadastros.suppliers.list.useQuery();
  const createMut = trpc.cadastros.suppliers.create.useMutation({ onSuccess: () => utils.cadastros.suppliers.list.invalidate() });
  const updateMut = trpc.cadastros.suppliers.update.useMutation({ onSuccess: () => utils.cadastros.suppliers.list.invalidate() });
  const deleteMut = trpc.cadastros.suppliers.delete.useMutation({ onSuccess: () => utils.cadastros.suppliers.list.invalidate() });

  return (
    <CrudPage
      title="Fornecedores"
      subtitle="Fornecedores de materiais e serviços"
      icon={<Truck className="h-6 w-6 text-primary" />}
      fields={fields}
      data={data || []}
      isLoading={isLoading}
      canCreate={canCreate("suppliers")}
      canEdit={canEdit("suppliers")}
      canDelete={canDelete("suppliers")}
      onCreate={async (d) => { await createMut.mutateAsync(d); }}
      onUpdate={async (d) => { await updateMut.mutateAsync(d); }}
      onDelete={async (id) => { await deleteMut.mutateAsync(id); }}
      searchPlaceholder="Buscar por nome ou CNPJ..."
      renderEditExtra={(item) => (
        <EntityAttachments
          entityType="supplier"
          entityId={String(item.id)}
          defaultMetadata={{
            documentType: "financeiro",
            purpose: "administrativo",
            retentionPolicy: "5anos",
            visibility: "internal",
          }}
        />
      )}
    />
  );
}
