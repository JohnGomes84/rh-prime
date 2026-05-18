import { trpc } from "@/lib/trpc";
import { usePermissions } from "@/hooks/usePermissions";
import CrudPage, { type FieldDef } from "@/components/CrudPage";
import { Clock } from "lucide-react";

const fields: FieldDef[] = [
  { key: "name", label: "Nome do Turno", required: true },
  { key: "startTime", label: "Início", type: "time", required: true, placeholder: "08:00" },
  { key: "endTime", label: "Fim", type: "time", required: true, placeholder: "17:00" },
  {
    key: "isActive",
    label: "Ativo",
    type: "checkbox",
    defaultValue: true,
    showInTable: true,
    render: (val: boolean) => (
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${val !== false ? "badge-success" : "badge-danger"}`}
      >
        {val !== false ? "Ativo" : "Inativo"}
      </span>
    ),
  },
];

export default function ShiftsPage() {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.cadastros.shifts.list.useQuery();
  const createMut = trpc.cadastros.shifts.create.useMutation({
    onSuccess: () => utils.cadastros.shifts.list.invalidate(),
  });
  const updateMut = trpc.cadastros.shifts.update.useMutation({
    onSuccess: () => utils.cadastros.shifts.list.invalidate(),
  });
  const deleteMut = trpc.cadastros.shifts.delete.useMutation({
    onSuccess: () => utils.cadastros.shifts.list.invalidate(),
  });

  return (
    <CrudPage
      title="Turnos"
      subtitle="Horários de trabalho disponíveis"
      icon={<Clock className="h-6 w-6 text-primary" />}
      fields={fields}
      data={data || []}
      isLoading={isLoading}
      canCreate={canCreate("shifts")}
      canEdit={canEdit("shifts")}
      canDelete={canDelete("shifts")}
      onCreate={async d => {
        await createMut.mutateAsync(d);
      }}
      onUpdate={async d => {
        await updateMut.mutateAsync(d);
      }}
      onDelete={async id => {
        await deleteMut.mutateAsync(id);
      }}
    />
  );
}
