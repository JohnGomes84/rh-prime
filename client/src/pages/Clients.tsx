import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import CrudPage, { type FieldDef } from "@/components/CrudPage";
import { EntityAttachments } from "@/components/EntityAttachments";
import { Building2 } from "lucide-react";

const fields: FieldDef[] = [
  { key: "name", label: "Razão Social", required: true },
  { key: "cnpj", label: "CNPJ" },
  { key: "city", label: "Cidade" },
  { key: "address", label: "Endereço", showInTable: false },
  { key: "contactName", label: "Contato" },
  { key: "contactPhone", label: "Telefone Contato" },
  { key: "contactEmail", label: "E-mail Contato", type: "email", showInTable: false },
  { key: "isActive", label: "Ativo", showInTable: true, render: (val: boolean) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${val !== false ? "badge-success" : "badge-danger"}`}>
      {val !== false ? "Ativo" : "Inativo"}
    </span>
  )},
];

export default function ClientsPage() {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.cadastros.clients.list.useQuery();
  const createMut = trpc.cadastros.clients.create.useMutation({ onSuccess: () => utils.cadastros.clients.list.invalidate() });
  const updateMut = trpc.cadastros.clients.update.useMutation({ onSuccess: () => utils.cadastros.clients.list.invalidate() });
  const deleteMut = trpc.cadastros.clients.delete.useMutation({ onSuccess: () => utils.cadastros.clients.list.invalidate() });

  return (
    <CrudPage
      title="Clientes"
      subtitle="Empresas contratantes de serviços"
      icon={<Building2 className="h-6 w-6 text-primary" />}
      fields={fields}
      data={data || []}
      isLoading={isLoading}
      canCreate={canCreate("clients")}
      canEdit={canEdit("clients")}
      canDelete={canDelete("clients")}
      onCreate={async (d) => { await createMut.mutateAsync(d); }}
      onUpdate={async (d) => { await updateMut.mutateAsync(d); }}
      onDelete={async (id) => { await deleteMut.mutateAsync(id); }}
      searchPlaceholder="Buscar por nome ou CNPJ..."
      renderEditExtra={(item) => (
        <EntityAttachments
          entityType="client"
          entityId={String(item.id)}
          defaultMetadata={{
            documentType: "contrato",
            purpose: "comercial",
            retentionPolicy: "5anos",
            visibility: "internal",
          }}
        />
      )}
    />
  );
}
