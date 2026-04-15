import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import CrudPage, { type FieldDef } from "@/components/CrudPage";
import { ImportExcel } from "@/components/ImportExcel";
import { EntityAttachments } from "@/components/EntityAttachments";
import { Users, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

const fields: FieldDef[] = [
  { key: "name", label: "Nome", required: true },
  { key: "cpf", label: "CPF", placeholder: "000.000.000-00" },
  { key: "email", label: "E-mail", type: "email" },
  { key: "phone", label: "Telefone" },
  { key: "city", label: "Cidade" },
  { key: "pixKey", label: "Chave PIX", placeholder: "CPF, CNPJ, Email, Telefone ou UUID" },
  { key: "pixKeyType", label: "Tipo PIX", type: "select", showInTable: false, options: [
    { value: "cpf", label: "CPF" },
    { value: "email", label: "E-mail" },
    { value: "phone", label: "Telefone" },
    { value: "random", label: "Aleatória" },
    { value: "cnpj", label: "CNPJ" },
  ]},
  { key: "status", label: "Status", type: "select", options: [
    { value: "diarista", label: "Diarista" },
    { value: "inativo", label: "Inativo" },
    { value: "pendente", label: "Pendente" },
  ], render: (val: string) => (
    <span className={`text-xs px-2 py-0.5 rounded-full ${
      val === "diarista" ? "badge-success" : val === "inativo" ? "badge-danger" : "badge-warning"
    }`}>{val || "—"}</span>
  )},
  { key: "registrationDate", label: "Data de Cadastro", type: "date" },
  { key: "notes", label: "Observações", type: "textarea", showInTable: false },
];

export default function EmployeesPage() {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.cadastros.employees.list.useQuery();
  const createMut = trpc.cadastros.employees.create.useMutation({ onSuccess: () => utils.cadastros.employees.list.invalidate() });
  const updateMut = trpc.cadastros.employees.update.useMutation({ onSuccess: () => utils.cadastros.employees.list.invalidate() });
  const deleteMut = trpc.cadastros.employees.delete.useMutation({ onSuccess: () => utils.cadastros.employees.list.invalidate() });

  const handleImportEmployees = async (data: any[]) => {
    const results = { success: 0, errors: [] as { row: number; error: string }[] };
    for (const row of data) {
      try {
        if (!row.name || !row.cpf) {
          results.errors.push({ row: row._rowNumber, error: "Nome e CPF sao obrigatorios" });
          continue;
        }
        await createMut.mutateAsync(row);
        results.success++;
      } catch (err: any) {
        results.errors.push({ row: row._rowNumber, error: err.message || "Erro ao criar registro" });
      }
    }
    return results;
  };

  const importButton = (
    <ImportExcel
      title="Importar Funcionarios"
      templateColumns={[
        { key: "name", label: "Nome" },
        { key: "cpf", label: "CPF" },
        { key: "email", label: "E-mail" },
        { key: "phone", label: "Telefone" },
        { key: "city", label: "Cidade" },
        { key: "pixKey", label: "Chave PIX" },
        { key: "status", label: "Status" },
        { key: "notes", label: "Observacoes" },
      ]}
      onImport={handleImportEmployees}
      fileName="funcionarios"
    />
  );

  return (
    <CrudPage
      title="Funcionários"
      subtitle="Gestão de funcionários e diaristas"
      icon={<Users className="h-6 w-6 text-primary" />}
      fields={fields}
      data={data || []}
      isLoading={isLoading}
      canCreate={canCreate("employees")}
      canEdit={canEdit("employees")}
      canDelete={canDelete("employees")}
      onCreate={async (d) => { await createMut.mutateAsync(d); }}
      onUpdate={async (d) => { await updateMut.mutateAsync(d); }}
      onDelete={async (id) => { await deleteMut.mutateAsync(id); }}
      searchPlaceholder="Buscar por nome, CPF ou cidade..."
      headerExtra={importButton}
      renderEditExtra={(item) => (
        <EntityAttachments
          entityType="employee"
          entityId={String(item.id)}
          defaultMetadata={{
            documentType: "outro",
            purpose: "pessoal",
            retentionPolicy: "5anos",
            visibility: "internal",
          }}
        />
      )}
    />
  );
}
