import { useMemo, useState, type ChangeEvent } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ScheduleDetail = NonNullable<RouterOutputs["portalLider"]["getScheduleDetail"]>;
type Allocation = ScheduleDetail["allocations"][number];
type Expense = RouterOutputs["portalLider"]["listExpensesForSchedule"][number];
type Occurrence = RouterOutputs["portalLider"]["listOccurrences"][number];
type AllocationOption = RouterOutputs["portalLider"]["allocationOptions"][number];
type OperationFormOptions = RouterOutputs["portalLider"]["operationFormOptions"];
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  CheckCircle2,
  AlertTriangle,
  Eye,
  KeyRound,
  Plus,
  Pencil,
  ShieldAlert,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type LeaderScheduleListItem = {
  id: number;
  date: string | Date;
  status: "pendente" | "validado" | "cancelado";
  clientName: string;
  shiftName: string;
  unitName: string;
  allocationsCount: number;
  occurrencesCount: number;
  unresolvedOccurrencesCount: number;
  occurrenceSeverity: "none" | "medium" | "high";
  occurrenceTooltip: string;
};

type AttendanceStatus = "presente" | "faltou" | "parcial";
type ExpenseType = "vale" | "bonus" | "marmita";

type ExpenseDraft = {
  type: ExpenseType;
  value: string;
};

type QuickRegisterForm = {
  name: string;
  cpf: string;
  rg: string;
  pixKey: string;
  pixKeyType: "cpf" | "email" | "phone" | "random" | "cnpj";
  docFrontBase64: string;
  docBackBase64: string;
  docFrontName: string;
  docBackName: string;
  jobFunctionId: string;
  payValue: string;
  receiveValue: string;
};

type OccurrenceType =
  | "late"
  | "early_exit"
  | "absence"
  | "client_issue"
  | "other"
  | "critical";

type OccurrenceForm = {
  employeeId: string;
  type: OccurrenceType;
  description: string;
};

type OperationForm = {
  date: string;
  shiftId: string;
  clientId: string;
  clientUnitId: string;
  notes: string;
};

const defaultExpenseDraft: ExpenseDraft = {
  type: "vale",
  value: "",
};

const defaultQuickRegisterForm: QuickRegisterForm = {
  name: "",
  cpf: "",
  rg: "",
  pixKey: "",
  pixKeyType: "cpf",
  docFrontBase64: "",
  docBackBase64: "",
  docFrontName: "",
  docBackName: "",
  jobFunctionId: "",
  payValue: "",
  receiveValue: "",
};

const defaultOccurrenceForm: OccurrenceForm = {
  employeeId: "operation",
  type: "other",
  description: "",
};

const defaultOperationForm = (): OperationForm => ({
  date: new Date().toISOString().split("T")[0] || "",
  shiftId: "",
  clientId: "",
  clientUnitId: "",
  notes: "",
});

async function fileToBase64(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const [, base64 = ""] = dataUrl.split(",");
  return base64;
}

export default function PortalLiderPage() {
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState("info");
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    null
  );
  const [selectedAllocationId, setSelectedAllocationId] = useState<
    number | null
  >(null);
  const [attendanceStatus, setAttendanceStatus] =
    useState<AttendanceStatus>("presente");
  const [attendanceNotes, setAttendanceNotes] = useState("");
  const [partialHours, setPartialHours] = useState("");
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [expenseDrafts, setExpenseDrafts] = useState<
    Record<number, ExpenseDraft>
  >({});
  const [isPixDialogOpen, setIsPixDialogOpen] = useState(false);
  const [selectedPixEmployee, setSelectedPixEmployee] = useState<{
    employeeId: number;
    employeeName: string;
    currentPixKey: string;
  } | null>(null);
  const [pixForm, setPixForm] = useState({ newPixKey: "", reason: "" });
  const [isQuickRegisterDialogOpen, setIsQuickRegisterDialogOpen] =
    useState(false);
  const [quickRegisterForm, setQuickRegisterForm] = useState<QuickRegisterForm>(
    defaultQuickRegisterForm
  );
  const [isOccurrenceDialogOpen, setIsOccurrenceDialogOpen] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<any | null>(null);
  const [occurrenceForm, setOccurrenceForm] =
    useState<OccurrenceForm>(defaultOccurrenceForm);
  const [isCreateOperationDialogOpen, setIsCreateOperationDialogOpen] =
    useState(false);
  const [operationForm, setOperationForm] = useState<OperationForm>(
    defaultOperationForm
  );
  const [isCloseOperationDialogOpen, setIsCloseOperationDialogOpen] =
    useState(false);
  const { data: mySchedules, isLoading: schedulesLoading } =
    trpc.portalLider.myScheduleCards.useQuery();
  const { data: operationFormOptions } =
    trpc.portalLider.operationFormOptions.useQuery();
  const {
    data: schedule,
    isLoading: scheduleLoading,
    refetch: refetchSchedule,
  } = trpc.portalLider.getScheduleDetail.useQuery(selectedScheduleId || 0, {
    enabled: !!selectedScheduleId,
  });
  const { data: expenses = [], refetch: refetchExpenses } =
    trpc.portalLider.listExpensesForSchedule.useQuery(selectedScheduleId || 0, {
      enabled: !!selectedScheduleId,
    });
  const { data: allocationOptions = [] } =
    trpc.portalLider.allocationOptions.useQuery(undefined, {
      enabled: !!selectedScheduleId,
    });
  const operationClientId = operationForm.clientId
    ? Number.parseInt(operationForm.clientId, 10)
    : 0;
  const { data: operationUnits = [] } =
    trpc.portalLider.unitsByClient.useQuery(operationClientId, {
      enabled: operationClientId > 0,
    });
  const { data: occurrences = [], refetch: refetchOccurrences } =
    trpc.portalLider.listOccurrences.useQuery(selectedScheduleId || 0, {
      enabled: !!selectedScheduleId,
    });
  const historyFilters = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);

    return {
      dateStart: start.toISOString(),
      dateEnd: end.toISOString(),
    };
  }, []);
  const { data: scheduleHistory = [] } =
    trpc.portalLider.mySchedules.useQuery(historyFilters);

  const todaySchedules = useMemo(() => {
    if (!mySchedules) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return mySchedules.filter(scheduleItem => {
      const scheduleDate = new Date(scheduleItem.date);
      scheduleDate.setHours(0, 0, 0, 0);
      return scheduleDate.getTime() === today.getTime();
    });
  }, [mySchedules]);
  const recentHistory = useMemo(
    () =>
      scheduleHistory
        .filter(item => item.id !== selectedScheduleId)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        .slice(0, 6),
    [scheduleHistory, selectedScheduleId]
  );

  const selectedAllocationOption = useMemo(
    () =>
      allocationOptions.find(
        (option: AllocationOption) => String(option.id) === quickRegisterForm.jobFunctionId
      ),
    [allocationOptions, quickRegisterForm.jobFunctionId]
  );
  const unresolvedOccurrences = useMemo(
    () => occurrences.filter((item: Occurrence) => !item.resolved),
    [occurrences]
  );
  const unresolvedOccurrenceSeverity = useMemo(() => {
    if (unresolvedOccurrences.length === 0) return "none" as const;
    return unresolvedOccurrences.some((item: Occurrence) =>
      ["absence", "client_issue", "critical"].includes(item.type)
    )
      ? ("high" as const)
      : ("medium" as const);
  }, [unresolvedOccurrences]);
  const unresolvedOccurrenceTooltip = useMemo(() => {
    if (unresolvedOccurrences.length === 0) return "Sem ocorrências";

    const labels: Record<OccurrenceType, string> = {
      late: "atraso",
      early_exit: "saída antecipada",
      absence: "falta",
      client_issue: "problema com cliente",
      other: "ocorrência",
      critical: "crítica",
    };

    const counts = unresolvedOccurrences.reduce<Record<string, number>>(
      (acc, item: Occurrence) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      {}
    );

    return Object.entries(counts)
      .map(([type, count]) => `${count} ${labels[type as OccurrenceType]}`)
      .join(", ");
  }, [unresolvedOccurrences]);
  const operationSummary = useMemo(() => {
    const allocations = schedule?.allocations || [];
    const presentCount = allocations.filter(
      (item: Allocation) => item.attendanceStatus === "presente"
    ).length;
    const absentCount = allocations.filter(
      (item: Allocation) => item.attendanceStatus === "faltou"
    ).length;
    const partialCount = allocations.filter(
      (item: Allocation) => item.attendanceStatus === "parcial"
    ).length;
    const checkInCount = allocations.filter((item: Allocation) => item.checkInTime).length;
    const checkOutCount = allocations.filter((item: Allocation) => item.checkOutTime).length;
    const voucherTotal = expenses.reduce(
      (sum: number, item: Expense) => sum + Number(item.voucher || 0),
      0
    );
    const bonusTotal = expenses.reduce(
      (sum: number, item: Expense) => sum + Number(item.bonus || 0),
      0
    );
    const mealTotal = expenses.reduce(
      (sum: number, item: Expense) => sum + Number(item.mealAllowance || 0),
      0
    );
    const totalExpenses = voucherTotal + bonusTotal + mealTotal;
    const resolvedOccurrences = occurrences.filter((item: Occurrence) => item.resolved).length;

    return {
      totalPeople: allocations.length,
      presentCount,
      absentCount,
      partialCount,
      checkInCount,
      checkOutCount,
      voucherTotal,
      bonusTotal,
      mealTotal,
      totalExpenses,
      totalOccurrences: occurrences.length,
      unresolvedOccurrences: unresolvedOccurrences.length,
      resolvedOccurrences,
    };
  }, [expenses, occurrences, schedule?.allocations, unresolvedOccurrences.length]);

  const checkInMutation = trpc.portalLider.checkIn.useMutation({
    onSuccess: async () => {
      toast.success("Check-in registrado com sucesso.");
      await refetchSchedule();
    },
    onError: err => {
      toast.error(err.message || "Erro ao registrar check-in.");
    },
  });

  const checkOutMutation = trpc.portalLider.checkOut.useMutation({
    onSuccess: async () => {
      toast.success("Check-out registrado com sucesso.");
      await refetchSchedule();
    },
    onError: err => {
      toast.error(err.message || "Erro ao registrar check-out.");
    },
  });

  const setAttendanceMutation = trpc.portalLider.setAttendance.useMutation({
    onSuccess: async () => {
      toast.success("Presença atualizada com sucesso.");
      setIsAttendanceDialogOpen(false);
      setSelectedAllocationId(null);
      setAttendanceStatus("presente");
      setAttendanceNotes("");
      setPartialHours("");
      await refetchSchedule();
    },
    onError: err => {
      toast.error(err.message || "Erro ao atualizar presença.");
    },
  });

  const quickExpenseMutation = trpc.portalLider.quickExpense.useMutation({
    onError: err => {
      toast.error(err.message || "Erro ao registrar lançamento.");
    },
  });

  const closeAttendanceMutation = trpc.portalLider.closeAttendance.useMutation({
    onSuccess: async () => {
      toast.success("Operação fechada com sucesso.");
      setIsCloseOperationDialogOpen(false);
      await Promise.all([
        refetchSchedule(),
        utils.portalLider.myScheduleCards.invalidate(),
        refetchOccurrences(),
      ]);
    },
    onError: err => {
      toast.error(err.message || "Erro ao fechar operação.");
    },
  });

  const requestPixChangeMutation = trpc.portalLider.requestPixChange.useMutation(
    {
      onSuccess: () => {
        toast.success("Solicitação de PIX enviada para aprovação.");
        setIsPixDialogOpen(false);
        setSelectedPixEmployee(null);
        setPixForm({ newPixKey: "", reason: "" });
      },
      onError: err => {
        toast.error(err.message || "Erro ao solicitar troca de PIX.");
      },
    }
  );

  const quickRegisterEmployeeMutation =
    trpc.portalLider.quickRegisterEmployee.useMutation({
      onError: err => {
        toast.error(err.message || "Erro ao cadastrar diarista.");
      },
    });
  const createOperationMutation = trpc.portalLider.createOperation.useMutation({
    onSuccess: async result => {
      toast.success("Operação criada com sucesso.");
      setIsCreateOperationDialogOpen(false);
      setOperationForm(defaultOperationForm());
      await utils.portalLider.myScheduleCards.invalidate();
      setSelectedScheduleId(result.id);
      setActiveTab("info");
    },
    onError: err => {
      toast.error(err.message || "Erro ao cadastrar operação.");
    },
  });

  const addOccurrenceMutation = trpc.portalLider.addOccurrence.useMutation({
    onSuccess: async () => {
      toast.success("Ocorrência registrada com sucesso.");
      setIsOccurrenceDialogOpen(false);
      setEditingOccurrence(null);
      setOccurrenceForm(defaultOccurrenceForm);
      await Promise.all([
        refetchOccurrences(),
        utils.portalLider.myScheduleCards.invalidate(),
      ]);
    },
    onError: err => {
      toast.error(err.message || "Erro ao registrar ocorrência.");
    },
  });

  const updateOccurrenceMutation = trpc.portalLider.updateOccurrence.useMutation({
    onSuccess: async () => {
      toast.success("Ocorrência atualizada com sucesso.");
      setIsOccurrenceDialogOpen(false);
      setEditingOccurrence(null);
      setOccurrenceForm(defaultOccurrenceForm);
      await Promise.all([
        refetchOccurrences(),
        utils.portalLider.myScheduleCards.invalidate(),
      ]);
    },
    onError: err => {
      toast.error(err.message || "Erro ao atualizar ocorrência.");
    },
  });

  const deleteOccurrenceMutation = trpc.portalLider.deleteOccurrence.useMutation({
    onSuccess: async () => {
      toast.success("Ocorrência removida.");
      await Promise.all([
        refetchOccurrences(),
        utils.portalLider.myScheduleCards.invalidate(),
      ]);
    },
    onError: err => {
      toast.error(err.message || "Erro ao remover ocorrência.");
    },
  });

  const resolveOccurrenceMutation =
    trpc.portalLider.resolveOccurrence.useMutation({
      onSuccess: async () => {
        toast.success("Ocorrência resolvida.");
        await Promise.all([
          refetchOccurrences(),
          utils.portalLider.myScheduleCards.invalidate(),
        ]);
      },
      onError: err => {
        toast.error(err.message || "Erro ao resolver ocorrência.");
      },
    });

  const resolveAllOccurrencesMutation =
    trpc.portalLider.resolveAllOccurrences.useMutation({
      onSuccess: async () => {
        toast.success("Todas as ocorrências foram resolvidas.");
        await Promise.all([
          refetchOccurrences(),
          utils.portalLider.myScheduleCards.invalidate(),
        ]);
      },
      onError: err => {
        toast.error(err.message || "Erro ao resolver ocorrências.");
      },
    });

  const allocateNewEmployeeMutation =
    trpc.portalLider.allocateNewEmployee.useMutation({
      onError: err => {
        toast.error(err.message || "Erro ao alocar diarista.");
      },
    });
  const removeAllocationMutation =
    trpc.portalLider.removeAllocation.useMutation({
      onSuccess: async () => {
        toast.success("Diarista removido da operação.");
        if (!selectedScheduleId) return;
        await Promise.all([
          utils.portalLider.getScheduleDetail.invalidate(selectedScheduleId),
          utils.portalLider.listExpensesForSchedule.invalidate(selectedScheduleId),
          refetchSchedule(),
          refetchExpenses(),
        ]);
      },
      onError: err => {
        toast.error(err.message || "Erro ao remover diarista.");
      },
    });

  const getStatusBadgeClassName = (
    status: LeaderScheduleListItem["status"]
  ) => {
    if (status === "validado") return "bg-green-600";
    if (status === "cancelado") return "bg-red-600";
    return "bg-amber-600";
  };

  const getAttendanceBadge = (status: string) => {
    if (status === "faltou") return <Badge variant="destructive">Faltou</Badge>;
    if (status === "parcial") return <Badge variant="outline">Parcial</Badge>;
    return <Badge>Presente</Badge>;
  };

  const getOccurrenceTypeLabel = (type: OccurrenceType) => {
    const labels: Record<OccurrenceType, string> = {
      late: "Atraso",
      early_exit: "Saída antecipada",
      absence: "Falta",
      client_issue: "Problema com cliente",
      other: "Ocorrência",
      critical: "Crítica",
    };
    return labels[type];
  };

  const getOccurrenceSeverityBadge = (
    severity: LeaderScheduleListItem["occurrenceSeverity"],
    unresolvedCount: number
  ) => {
    if (unresolvedCount === 0) {
      return <Badge className="bg-emerald-600">Sem ocorrências</Badge>;
    }

    if (severity === "high") {
      return <Badge className="bg-red-600">Alta</Badge>;
    }

    return <Badge className="bg-amber-600">Atenção</Badge>;
  };

  const openNewOccurrenceDialog = () => {
    setEditingOccurrence(null);
    setOccurrenceForm(defaultOccurrenceForm);
    setIsOccurrenceDialogOpen(true);
  };

  const openEditOccurrenceDialog = (occurrence: Occurrence) => {
    setEditingOccurrence(occurrence);
    setOccurrenceForm({
      employeeId: occurrence.employeeId ? String(occurrence.employeeId) : "operation",
      type: occurrence.type,
      description: occurrence.description ?? "",
    });
    setIsOccurrenceDialogOpen(true);
  };

  const openPartialAttendanceDialog = (
    allocationId: number,
    currentStatus?: string
  ) => {
    setSelectedAllocationId(allocationId);
    setAttendanceStatus(
      currentStatus === "faltou" || currentStatus === "parcial"
        ? currentStatus
        : "parcial"
    );
    setAttendanceNotes("");
    setPartialHours("");
    setIsAttendanceDialogOpen(true);
  };

  const handleAttendanceUpdate = (
    allocationId: number,
    status: AttendanceStatus
  ) => {
    if (!selectedScheduleId) return;

    if (status === "parcial") {
      openPartialAttendanceDialog(allocationId, status);
      return;
    }

    setAttendanceMutation.mutate({
      allocationId,
      scheduleId: selectedScheduleId,
      status,
    });
  };

  const handleSavePartialAttendance = () => {
    if (!selectedScheduleId || selectedAllocationId === null) return;

    const parsedPartialHours = partialHours.trim()
      ? Number.parseFloat(partialHours)
      : undefined;

    if (
      attendanceStatus === "parcial" &&
      (!parsedPartialHours ||
        Number.isNaN(parsedPartialHours) ||
        parsedPartialHours <= 0)
    ) {
      toast.error("Informe as horas trabalhadas para presença parcial.");
      return;
    }

    setAttendanceMutation.mutate({
      allocationId: selectedAllocationId,
      scheduleId: selectedScheduleId,
      status: attendanceStatus,
      notes: attendanceNotes || undefined,
      partialHours:
        attendanceStatus === "parcial" ? parsedPartialHours : undefined,
    });
  };

  const handleCheckIn = (allocationId: number) => {
    if (!selectedScheduleId) return;
    checkInMutation.mutate({ allocationId, scheduleId: selectedScheduleId });
  };

  const handleCheckOut = (allocationId: number) => {
    if (!selectedScheduleId) return;
    checkOutMutation.mutate({ allocationId, scheduleId: selectedScheduleId });
  };

  const getExpenseDraft = (allocationId: number) =>
    expenseDrafts[allocationId] || defaultExpenseDraft;

  const updateExpenseDraft = (
    allocationId: number,
    partialDraft: Partial<ExpenseDraft>
  ) => {
    setExpenseDrafts(current => ({
      ...current,
      [allocationId]: {
        ...getExpenseDraft(allocationId),
        ...partialDraft,
      },
    }));
  };

  const handleQuickExpense = async (
    allocationId: number,
    employeeCpf: string,
    scheduleId: number
  ) => {
    const draft = getExpenseDraft(allocationId);
    const parsedValue = Number.parseFloat(draft.value);

    if (!employeeCpf) {
      toast.error("Funcionário sem CPF não pode receber lançamento.");
      return;
    }

    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
      toast.error("Informe um valor válido para o lançamento.");
      return;
    }

    await quickExpenseMutation.mutateAsync({
      scheduleId,
      cpf: employeeCpf,
      type: draft.type,
      value: parsedValue,
    });

    setExpenseDrafts(current => ({
      ...current,
      [allocationId]: defaultExpenseDraft,
    }));
    toast.success("Lançamento registrado com sucesso.");
    await Promise.all([
      utils.portalLider.listExpensesForSchedule.invalidate(scheduleId),
      utils.portalLider.getScheduleDetail.invalidate(scheduleId),
      refetchExpenses(),
      refetchSchedule(),
    ]);
  };

  const handleCloseOperation = () => {
    if (!selectedScheduleId) return;
    if (unresolvedOccurrences.length > 0) {
      setIsCloseOperationDialogOpen(true);
      return;
    }
    closeAttendanceMutation.mutate(selectedScheduleId);
  };

  const handleResolveAllAndClose = async () => {
    if (!selectedScheduleId) return;
    await resolveAllOccurrencesMutation.mutateAsync(selectedScheduleId);
    closeAttendanceMutation.mutate(selectedScheduleId);
  };

  const handleSaveOccurrence = () => {
    if (!selectedScheduleId) return;
    if (!occurrenceForm.description.trim()) {
      toast.error("Descreva a ocorrência.");
      return;
    }

    const payload = {
      scheduleId: selectedScheduleId,
      employeeId:
        occurrenceForm.employeeId && occurrenceForm.employeeId !== "operation"
          ? Number.parseInt(occurrenceForm.employeeId, 10)
          : undefined,
      type: occurrenceForm.type,
      description: occurrenceForm.description.trim(),
    } as const;

    if (editingOccurrence) {
      updateOccurrenceMutation.mutate({
        occurrenceId: editingOccurrence.id,
        ...payload,
      });
      return;
    }

    addOccurrenceMutation.mutate(payload);
  };

  const handleCreateOperation = () => {
    if (!operationForm.date || !operationForm.clientId) {
      toast.error("Data e cliente são obrigatórios.");
      return;
    }

    createOperationMutation.mutate({
      date: operationForm.date,
      shiftId: operationForm.shiftId
        ? Number.parseInt(operationForm.shiftId, 10)
        : undefined,
      clientId: Number.parseInt(operationForm.clientId, 10),
      clientUnitId: operationForm.clientUnitId
        ? Number.parseInt(operationForm.clientUnitId, 10)
        : undefined,
      notes: operationForm.notes.trim() || undefined,
    });
  };

  const openPixDialog = (employee: {
    employeeId: number;
    employeeName: string;
    employeePixKey: string;
  }) => {
    setSelectedPixEmployee({
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      currentPixKey: employee.employeePixKey || "",
    });
    setPixForm({ newPixKey: "", reason: "" });
    setIsPixDialogOpen(true);
  };

  const handleSubmitPixChange = () => {
    if (!selectedPixEmployee) return;
    if (!pixForm.newPixKey.trim()) {
      toast.error("Informe a nova chave PIX.");
      return;
    }

    requestPixChangeMutation.mutate({
      employeeId: selectedPixEmployee.employeeId,
      newPixKey: pixForm.newPixKey.trim(),
      reason: pixForm.reason.trim() || undefined,
    });
  };

  const handleQuickRegisterFile = async (
    field: "docFront" | "docBack",
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setQuickRegisterForm(current => ({
        ...current,
        ...(field === "docFront"
          ? {
              docFrontBase64: base64,
              docFrontName: file.name,
            }
          : {
              docBackBase64: base64,
              docBackName: file.name,
            }),
      }));
    } catch {
      toast.error("Erro ao ler o arquivo do documento.");
    } finally {
      event.target.value = "";
    }
  };

  const handleRemoveAllocation = (allocationId: number) => {
    if (!selectedScheduleId) return;
    removeAllocationMutation.mutate({
      scheduleId: selectedScheduleId,
      allocationId,
    });
  };

  const handleQuickRegisterAndAllocate = async () => {
    if (!selectedScheduleId) return;

    const jobFunctionId = Number.parseInt(quickRegisterForm.jobFunctionId, 10);
    const payValue = Number.parseFloat(quickRegisterForm.payValue);
    const receiveValue = Number.parseFloat(
      quickRegisterForm.receiveValue ||
        String(selectedAllocationOption?.defaultReceiveValue || 0)
    );

    if (
      !quickRegisterForm.name.trim() ||
      !quickRegisterForm.cpf.trim() ||
      !quickRegisterForm.pixKey.trim()
    ) {
      toast.error("Preencha nome, CPF e chave PIX do diarista.");
      return;
    }

    if (!jobFunctionId || Number.isNaN(jobFunctionId)) {
      toast.error("Selecione a função para a alocação.");
      return;
    }

    if (Number.isNaN(payValue)) {
      toast.error("Informe um valor válido para o diarista.");
      return;
    }

    const employee = await quickRegisterEmployeeMutation.mutateAsync({
      name: quickRegisterForm.name.trim(),
      cpf: quickRegisterForm.cpf.trim(),
      rg: quickRegisterForm.rg.trim() || undefined,
      pixKey: quickRegisterForm.pixKey.trim(),
      pixKeyType: quickRegisterForm.pixKeyType,
      docFrontBase64: quickRegisterForm.docFrontBase64 || undefined,
      docBackBase64: quickRegisterForm.docBackBase64 || undefined,
    });

    await allocateNewEmployeeMutation.mutateAsync({
      scheduleId: selectedScheduleId,
      employeeId: employee.id,
      jobFunctionId,
      payValue,
      receiveValue,
    });

    toast.success("Diarista cadastrado e alocado com sucesso.");
    setQuickRegisterForm(defaultQuickRegisterForm);
    setIsQuickRegisterDialogOpen(false);
    await Promise.all([
      utils.portalLider.getScheduleDetail.invalidate(selectedScheduleId),
      utils.portalLider.mySchedules.invalidate(),
      utils.portalLider.myScheduleCards.invalidate(),
      refetchSchedule(),
    ]);
  };

  const renderOperationSummaryCards = ({
    clientName,
    unitName,
    shiftName,
    allocationsCount,
    status,
    occurrencesCount,
    unresolvedOccurrencesCount,
    occurrenceSeverity,
    occurrenceTooltip,
  }: {
    clientName: string;
    unitName?: string;
    shiftName?: string;
    allocationsCount: number;
    status: "pendente" | "validado" | "cancelado";
    occurrencesCount: number;
    unresolvedOccurrencesCount: number;
    occurrenceSeverity: "none" | "medium" | "high";
    occurrenceTooltip: string;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Cliente</CardTitle>
        </CardHeader>
        <CardContent className="text-white font-semibold">
          <div className="flex items-center gap-2">
            <span>{clientName}</span>
            {occurrencesCount > 0 && (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            )}
          </div>
        </CardContent>
      </Card>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Local</CardTitle>
        </CardHeader>
        <CardContent className="text-white font-semibold">
          {unitName || "—"}
        </CardContent>
      </Card>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Turno</CardTitle>
        </CardHeader>
        <CardContent className="text-white font-semibold">
          {shiftName || "—"}
        </CardContent>
      </Card>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Diaristas</CardTitle>
        </CardHeader>
        <CardContent className="text-white font-semibold">
          {allocationsCount}
        </CardContent>
      </Card>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge className={getStatusBadgeClassName(status)}>{status}</Badge>
        </CardContent>
      </Card>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300">Ocorrências</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-white font-semibold cursor-help">
                <AlertTriangle
                  className={
                    occurrenceSeverity === "high"
                      ? "h-4 w-4 text-red-400"
                      : unresolvedOccurrencesCount > 0
                        ? "h-4 w-4 text-amber-400"
                        : "h-4 w-4 text-emerald-400"
                  }
                />
                <span>{unresolvedOccurrencesCount}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              {occurrenceTooltip || "Sem ocorrências"}
            </TooltipContent>
          </Tooltip>
          {getOccurrenceSeverityBadge(
            occurrenceSeverity,
            unresolvedOccurrencesCount
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderQuickExpenseSection = ({
    title,
    description,
    compact = false,
  }: {
    title: string;
    description: string;
    compact?: boolean;
  }) => (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-slate-400">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Vale</div>
            <div className="mt-2 text-xl font-semibold text-white">
              R$ {operationSummary.voucherTotal.toFixed(2)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Bonus</div>
            <div className="mt-2 text-xl font-semibold text-white">
              R$ {operationSummary.bonusTotal.toFixed(2)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Marmita</div>
            <div className="mt-2 text-xl font-semibold text-white">
              R$ {operationSummary.mealTotal.toFixed(2)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Total do dia</div>
            <div className="mt-2 text-xl font-semibold text-emerald-400">
              R$ {operationSummary.totalExpenses.toFixed(2)}
            </div>
          </div>
        </div>

        {expenses.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-700 p-4 text-sm text-slate-400">
            Nenhum lançamento registrado para esta operação.
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense: any) => (
              <div
                key={expense.id}
                className="rounded-md border border-slate-700 p-3 text-sm text-slate-200"
              >
                <div className="font-semibold text-white">{expense.employeeName}</div>
                <div className="text-xs text-slate-400">CPF: {expense.employeeCpf}</div>
                <div className="mt-2 text-xs text-slate-300">
                  Vale: R$ {parseFloat(String(expense.voucher || 0)).toFixed(2)} |{" "}
                  Bonus: R$ {parseFloat(String(expense.bonus || 0)).toFixed(2)} |{" "}
                  Marmita: R$ {parseFloat(String(expense.mealAllowance || 0)).toFixed(2)}
                </div>
                <div className="mt-1 text-sm font-semibold text-emerald-400">
                  Total: R$ {parseFloat(String(expense.total || 0)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}

        {schedule?.allocations?.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-700 p-6 text-center text-slate-400">
            Nenhum diarista alocado nesta operação.
          </div>
        ) : (
          <div className={compact ? "grid grid-cols-1 gap-3 xl:grid-cols-2" : "space-y-3"}>
            {schedule?.allocations?.map((alloc: any) => {
              const draft = getExpenseDraft(alloc.id);

              return (
                <Card
                  key={`expense-${alloc.id}`}
                  className="bg-slate-900/50 border-slate-700"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{alloc.employeeName}</p>
                        <p className="text-xs text-slate-400">{alloc.employeeCpf}</p>
                      </div>
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {draft.type}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <Select
                        value={draft.type}
                        onValueChange={(value: ExpenseType) =>
                          updateExpenseDraft(alloc.id, { type: value })
                        }
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vale">Vale</SelectItem>
                          <SelectItem value="bonus">Bonus</SelectItem>
                          <SelectItem value="marmita">Marmita</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.value}
                        onChange={event =>
                          updateExpenseDraft(alloc.id, {
                            value: event.target.value,
                          })
                        }
                        placeholder="Valor"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      <Button
                        onClick={() =>
                          selectedScheduleId &&
                          handleQuickExpense(
                            alloc.id,
                            alloc.employeeCpf,
                            selectedScheduleId
                          )
                        }
                        disabled={quickExpenseMutation.isPending || !selectedScheduleId}
                      >
                        {quickExpenseMutation.isPending ? "Salvando..." : "Lançar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );


  if (!selectedScheduleId) {
    return (
      <div className="space-y-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-bold">
              Portal do Líder
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestão operacional do dia, presença, lançamentos e equipe
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => setIsCreateOperationDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar operação
            </Button>
          </div>

          <div className="space-y-3 mt-4">
            <div className="space-y-3">
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-5 text-center text-base md:text-lg text-slate-300">
                  <span className="mx-auto block max-w-3xl text-center leading-relaxed">
                    Selecione uma operação do dia para gerenciar presença, lançamentos, PIX e fechamento.
                  </span>
                </CardContent>
              </Card>

              {schedulesLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : todaySchedules.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Nenhuma operação para hoje.
                </div>
              ) : (
                todaySchedules.map((scheduleItem: LeaderScheduleListItem) => (
                  <div
                    key={scheduleItem.id}
                    className="rounded-2xl border border-slate-800/80 bg-slate-950/30 p-4 cursor-pointer hover:bg-slate-900/40 transition"
                    onClick={() => {
                      setSelectedScheduleId(scheduleItem.id);
                      setActiveTab("info");
                    }}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          Operação do dia
                        </h3>
                        <p className="text-sm text-slate-400">
                          {format(new Date(scheduleItem.date), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" className="text-teal-400">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    {renderOperationSummaryCards({
                      clientName: scheduleItem.clientName,
                      unitName: scheduleItem.unitName,
                      shiftName: scheduleItem.shiftName,
                      allocationsCount: scheduleItem.allocationsCount,
                      status: scheduleItem.status,
                      occurrencesCount: scheduleItem.occurrencesCount,
                      unresolvedOccurrencesCount:
                        scheduleItem.unresolvedOccurrencesCount,
                      occurrenceSeverity: scheduleItem.occurrenceSeverity,
                      occurrenceTooltip: scheduleItem.occurrenceTooltip,
                    })}
                  </div>
                ))
              )}
            </div>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Histórico recente</CardTitle>
                <CardDescription className="text-slate-400">
                  Últimas operações dos últimos 30 dias.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentHistory.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Nenhuma operação recente além das de hoje.
                  </p>
                ) : (
                  recentHistory.map(scheduleItem => (
                    <button
                      key={scheduleItem.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-left transition hover:bg-slate-900"
                      onClick={() => {
                        setSelectedScheduleId(scheduleItem.id);
                        setActiveTab("info");
                      }}
                    >
                      <div>
                        <div className="font-medium text-white">
                          {scheduleItem.clientName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {format(new Date(scheduleItem.date), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}{" "}
                          • {scheduleItem.unitName || "Sem local"} •{" "}
                          {scheduleItem.shiftName || "Sem turno"}
                        </div>
                      </div>
                      <Badge className={getStatusBadgeClassName(scheduleItem.status)}>
                        {scheduleItem.status}
                      </Badge>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Dialog
            open={isCreateOperationDialogOpen}
            onOpenChange={setIsCreateOperationDialogOpen}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar operação</DialogTitle>
                <DialogDescription>
                  Crie uma operação do dia para gerir presença, equipe e
                  fechamento pelo portal do líder.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={operationForm.date}
                      onChange={event =>
                        setOperationForm(current => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Turno</Label>
                    <Select
                      value={operationForm.shiftId}
                      onValueChange={value =>
                        setOperationForm(current => ({
                          ...current,
                          shiftId: value,
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o turno" />
                      </SelectTrigger>
                      <SelectContent>
                        {operationFormOptions?.shifts.map((shift: OperationFormOptions["shifts"][number]) => (
                          <SelectItem key={shift.id} value={String(shift.id)}>
                            {shift.name} ({shift.startTime} - {shift.endTime})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente *</Label>
                    <Select
                      value={operationForm.clientId}
                      onValueChange={value =>
                        setOperationForm(current => ({
                          ...current,
                          clientId: value,
                          clientUnitId: "",
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {operationFormOptions?.clients.map((client: any) => (
                          <SelectItem key={client.id} value={String(client.id)}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Local</Label>
                    <Select
                      value={operationForm.clientUnitId}
                      onValueChange={value =>
                        setOperationForm(current => ({
                          ...current,
                          clientUnitId: value,
                        }))
                      }
                      disabled={!operationForm.clientId}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue
                          placeholder={
                            operationForm.clientId
                              ? "Selecione o local"
                              : "Escolha o cliente antes"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {operationUnits.map((unit: any) => (
                          <SelectItem key={unit.id} value={String(unit.id)}>
                            {unit.name}
                          </SelectItem>
                        ))}
                        {operationForm.clientId && operationUnits.length === 0 && (
                          <SelectItem value="no-units" disabled>
                            Nenhum local disponível
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={operationForm.notes}
                    onChange={event =>
                      setOperationForm(current => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={4}
                    className="mt-1"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOperationDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700"
                  onClick={handleCreateOperation}
                  disabled={createOperationMutation.isPending}
                >
                  {createOperationMutation.isPending
                    ? "Salvando..."
                    : "Criar operação"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
    );
  }

  if (scheduleLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Operação</h1>
            <p className="text-slate-400 text-sm mt-1">{schedule?.clientName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setIsQuickRegisterDialogOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Cadastrar e Alocar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCloseOperation}
              disabled={
                schedule?.status === "validado" || closeAttendanceMutation.isPending
              }
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {closeAttendanceMutation.isPending
                ? "Fechando..."
                : "Fechar Operação"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedScheduleId(null);
                setActiveTab("info");
              }}
            >
              Voltar
            </Button>
          </div>
        </div>

        {renderOperationSummaryCards({
          clientName: schedule?.clientName || "—",
          unitName: schedule?.unitName || "—",
          shiftName: schedule?.shiftName || "—",
          allocationsCount: schedule?.allocations?.length || 0,
          status: (schedule?.status || "pendente") as
            | "pendente"
            | "validado"
            | "cancelado",
          occurrencesCount: unresolvedOccurrences.length,
          unresolvedOccurrencesCount: unresolvedOccurrences.length,
          occurrenceSeverity: unresolvedOccurrenceSeverity,
          occurrenceTooltip: unresolvedOccurrenceTooltip,
        })}

        {renderQuickExpenseSection({
          title: "Lançamento rápido da operação",
          description:
            "Vale, bonus e marmita voltam a aparecer já no topo da operação, sem depender da aba dedicada.",
          compact: true,
        })}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="info">Hoje</TabsTrigger>
            <TabsTrigger value="presenca">Presenca</TabsTrigger>
            <TabsTrigger value="vale">Vale</TabsTrigger>
            <TabsTrigger value="ocorrencias">Mais</TabsTrigger>
          </TabsList>

          <TabsContent value="presenca" className="space-y-3 mt-4">
            {schedule?.allocations?.map((alloc: any) => (
              <Card key={alloc.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-white">{alloc.employeeName}</p>
                      <p className="text-xs text-slate-400">{alloc.employeeCpf}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        PIX: {alloc.employeePixKey || "Não informado"}
                      </p>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-2">
                      {getAttendanceBadge(alloc.attendanceStatus || "presente")}
                      <div className="text-xs text-slate-400">
                        Check-in:{" "}
                        {alloc.checkInTime
                          ? format(new Date(alloc.checkInTime), "HH:mm", {
                              locale: ptBR,
                            })
                          : "Não registrado"}
                      </div>
                      <div className="text-xs text-slate-400">
                        Check-out:{" "}
                        {alloc.checkOutTime
                          ? format(new Date(alloc.checkOutTime), "HH:mm", {
                              locale: ptBR,
                            })
                          : "Não registrado"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckIn(alloc.id)}
                      disabled={!!alloc.checkInTime || checkInMutation.isPending}
                    >
                      {checkInMutation.isPending ? "..." : "Check-in"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckOut(alloc.id)}
                      disabled={
                        !alloc.checkInTime ||
                        !!alloc.checkOutTime ||
                        checkOutMutation.isPending
                      }
                    >
                      {checkOutMutation.isPending ? "..." : "Check-out"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-400 border-green-600"
                      onClick={() => handleAttendanceUpdate(alloc.id, "presente")}
                      disabled={setAttendanceMutation.isPending}
                    >
                      Presente
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-400 border-red-600"
                      onClick={() => handleAttendanceUpdate(alloc.id, "faltou")}
                      disabled={setAttendanceMutation.isPending}
                    >
                      Faltou
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-yellow-400 border-yellow-600"
                      onClick={() => handleAttendanceUpdate(alloc.id, "parcial")}
                      disabled={setAttendanceMutation.isPending}
                    >
                      Parcial
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openPixDialog({
                          employeeId: alloc.employeeId,
                          employeeName: alloc.employeeName,
                          employeePixKey: alloc.employeePixKey,
                        })
                      }
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      PIX
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveAllocation(alloc.id)}
                      disabled={
                        schedule?.status === "validado" ||
                        removeAllocationMutation.isPending
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {schedule?.allocations?.length === 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6 text-center text-slate-400">
                  Nenhum diarista alocado nesta operação.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="vale" className="space-y-3 mt-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Lançamentos do dia</CardTitle>
                <CardDescription className="text-slate-400">
                  Registre vale, bônus ou marmita por diarista.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {expenses.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Nenhum lançamento registrado para esta operação.
                  </p>
                ) : (
                  expenses.map((expense: any) => (
                    <div
                      key={expense.id}
                      className="rounded-md border border-slate-700 p-3 text-sm text-slate-200"
                    >
                      <div className="font-semibold text-white">
                        {expense.employeeName}
                      </div>
                      <div className="text-xs text-slate-400">
                        CPF: {expense.employeeCpf}
                      </div>
                      <div className="mt-2 text-xs text-slate-300">
                        Vale: R${" "}
                        {parseFloat(String(expense.voucher || 0)).toFixed(2)} | Bônus:
                        R$ {parseFloat(String(expense.bonus || 0)).toFixed(2)} |
                        Marmita: R${" "}
                        {parseFloat(String(expense.mealAllowance || 0)).toFixed(2)}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-emerald-400">
                        Total: R$ {parseFloat(String(expense.total || 0)).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {schedule?.allocations?.map((alloc: any) => {
              const draft = getExpenseDraft(alloc.id);

              return (
                <Card key={alloc.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-white">{alloc.employeeName}</p>
                      <p className="text-xs text-slate-400">{alloc.employeeCpf}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Select
                        value={draft.type}
                        onValueChange={(value: ExpenseType) =>
                          updateExpenseDraft(alloc.id, { type: value })
                        }
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vale">Vale</SelectItem>
                          <SelectItem value="bonus">Bônus</SelectItem>
                          <SelectItem value="marmita">Marmita</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.value}
                        onChange={event =>
                          updateExpenseDraft(alloc.id, {
                            value: event.target.value,
                          })
                        }
                        placeholder="Valor"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      <Button
                        onClick={() =>
                          handleQuickExpense(
                            alloc.id,
                            alloc.employeeCpf,
                            selectedScheduleId
                          )
                        }
                        disabled={quickExpenseMutation.isPending}
                      >
                        {quickExpenseMutation.isPending ? "Salvando..." : "Lançar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="ocorrencias" className="space-y-3 mt-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">PIX</CardTitle>
                <CardDescription className="text-slate-400">
                  Solicite troca de chave PIX dos diaristas desta operacao.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {schedule?.allocations?.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-700 p-6 text-center text-slate-400">
                    Nenhum diarista alocado para solicitar alteracao de PIX.
                  </div>
                ) : (
                  schedule?.allocations?.map((alloc: any) => (
                    <div
                      key={`pix-${alloc.id}`}
                      className="flex flex-col gap-3 rounded-md border border-slate-700 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white">{alloc.employeeName}</div>
                        <div className="text-xs text-slate-400">{alloc.employeeCpf}</div>
                        <div className="mt-1 text-xs text-slate-300">
                          PIX atual: {alloc.employeePixKey || "Nao informado"}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          openPixDialog({
                            employeeId: alloc.employeeId,
                            employeeName: alloc.employeeName,
                            employeePixKey: alloc.employeePixKey,
                          })
                        }
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Solicitar troca
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-white">Cadastro rapido</CardTitle>
                  <CardDescription className="text-slate-400">
                    Cadastre diarista, anexe documento e aloque nesta operacao em um unico fluxo.
                  </CardDescription>
                </div>
                <Button onClick={() => setIsQuickRegisterDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo diarista
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-white">1. Identificacao</div>
                  <div className="mt-2">Nome, CPF, RG e chave PIX.</div>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-white">2. Documento</div>
                  <div className="mt-2">Frente e verso podem ser anexados direto do celular.</div>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-300">
                  <div className="font-semibold text-white">3. Alocacao</div>
                  <div className="mt-2">Funcao e valor diarista sao definidos no mesmo fluxo.</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Historico</CardTitle>
                <CardDescription className="text-slate-400">
                  Consulte rapidamente operacoes recentes do lider.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentHistory.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-700 p-6 text-center text-slate-400">
                    Nenhuma operacao recente alem da atual.
                  </div>
                ) : (
                  recentHistory.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-left transition hover:bg-slate-900"
                      onClick={() => {
                        setSelectedScheduleId(item.id);
                        setActiveTab("info");
                      }}
                    >
                      <div>
                        <div className="font-medium text-white">{item.clientName}</div>
                        <div className="text-xs text-slate-400">
                          {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })} - {item.unitName || "Sem local"} - {item.shiftName || "Sem turno"}
                        </div>
                      </div>
                      <Badge className={getStatusBadgeClassName(item.status)}>{item.status}</Badge>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-white">Ocorrências da operação</CardTitle>
                  <CardDescription className="text-slate-400">
                    Registre eventos relevantes, acompanhe pendências e resolva antes do fechamento.
                  </CardDescription>
                </div>
                <Button onClick={openNewOccurrenceDialog}>
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Registrar Ocorrência
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {occurrences.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-700 p-6 text-center text-slate-400">
                    Nenhuma ocorrência registrada para esta operação.
                  </div>
                ) : (
                  occurrences.map((occurrence: any) => (
                    <div
                      key={occurrence.id}
                      className="rounded-md border border-slate-700 p-4 space-y-3"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={
                                occurrence.resolved ? "bg-emerald-700" : "bg-amber-700"
                              }
                            >
                              {occurrence.resolved ? "Resolvida" : "Pendente"}
                            </Badge>
                            <Badge variant="outline">{occurrence.typeLabel}</Badge>
                            {occurrence.autoGenerated && (
                              <Badge variant="secondary">Automática</Badge>
                            )}
                          </div>
                          <p className="mt-2 text-white font-semibold">
                            {occurrence.employeeName}
                          </p>
                          <p className="text-sm text-slate-300">
                            {occurrence.description}
                          </p>
                        </div>
                        <div className="text-xs text-slate-400 md:text-right">
                          <div>
                            {format(new Date(occurrence.createdAt), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                          <div>Criado por: {occurrence.createdByName}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!occurrence.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              resolveOccurrenceMutation.mutate({
                                occurrenceId: occurrence.id,
                              })
                            }
                            disabled={resolveOccurrenceMutation.isPending}
                          >
                            Resolver
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditOccurrenceDialog(occurrence)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            deleteOccurrenceMutation.mutate({
                              occurrenceId: occurrence.id,
                              scheduleId: selectedScheduleId,
                            })
                          }
                          disabled={deleteOccurrenceMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="space-y-3 mt-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Informações da operação</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-slate-300">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4 mb-4">
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Equipe total</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{operationSummary.totalPeople}</div>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Check-ins</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{operationSummary.checkInCount}</div>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Check-outs</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{operationSummary.checkOutCount}</div>
                  </div>
                  <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Ocorrencias pendentes</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{operationSummary.unresolvedOccurrences}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-4">
                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-white">Presenca</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>Presentes</span><span className="font-semibold text-emerald-400">{operationSummary.presentCount}</span></div>
                      <div className="flex items-center justify-between"><span>Parciais</span><span className="font-semibold text-amber-400">{operationSummary.partialCount}</span></div>
                      <div className="flex items-center justify-between"><span>Faltas</span><span className="font-semibold text-red-400">{operationSummary.absentCount}</span></div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-white">Lancamentos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>Vale</span><span className="font-semibold text-white">R$ {operationSummary.voucherTotal.toFixed(2)}</span></div>
                      <div className="flex items-center justify-between"><span>Bonus</span><span className="font-semibold text-white">R$ {operationSummary.bonusTotal.toFixed(2)}</span></div>
                      <div className="flex items-center justify-between"><span>Marmita</span><span className="font-semibold text-white">R$ {operationSummary.mealTotal.toFixed(2)}</span></div>
                      <div className="flex items-center justify-between border-t border-slate-700 pt-2"><span>Total</span><span className="font-semibold text-emerald-400">R$ {operationSummary.totalExpenses.toFixed(2)}</span></div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-900/50 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-white">Ocorrencias</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span>Total registradas</span><span className="font-semibold text-white">{operationSummary.totalOccurrences}</span></div>
                      <div className="flex items-center justify-between"><span>Pendentes</span><span className="font-semibold text-amber-400">{operationSummary.unresolvedOccurrences}</span></div>
                      <div className="flex items-center justify-between"><span>Resolvidas</span><span className="font-semibold text-emerald-400">{operationSummary.resolvedOccurrences}</span></div>
                      <div className="pt-2">{getOccurrenceSeverityBadge(unresolvedOccurrenceSeverity, operationSummary.unresolvedOccurrences)}</div>
                    </CardContent>
                  </Card>
                </div>

                <p>
                  <span className="font-semibold">Cliente:</span>{" "}
                  {schedule?.clientName}
                </p>
                <p>
                  <span className="font-semibold">Local:</span>{" "}
                  {schedule?.unitName || "—"}
                </p>
                <p>
                  <span className="font-semibold">Turno:</span>{" "}
                  {schedule?.shiftName || "—"}
                </p>
                <p>
                  <span className="font-semibold">Horário:</span>{" "}
                  {schedule?.shiftTime || "—"}
                </p>
                <p>
                  <span className="font-semibold">Data:</span>{" "}
                  {schedule?.date
                    ? format(new Date(schedule.date), "dd/MM/yyyy", {
                        locale: ptBR,
                      })
                    : "—"}
                </p>
                <p>
                  <span className="font-semibold">Observações:</span>{" "}
                  {schedule?.notes || "Sem observações"}
                </p>

                <div className="pt-4">
                  <div className="mb-3 text-sm font-semibold text-white">Historico recente</div>
                  <div className="space-y-2">
                    {recentHistory.length === 0 ? (
                      <div className="text-sm text-slate-400">Nenhuma operacao recente alem da atual.</div>
                    ) : (
                      recentHistory.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3 text-left transition hover:bg-slate-900"
                          onClick={() => {
                            setSelectedScheduleId(item.id);
                            setActiveTab("info");
                          }}
                        >
                          <div>
                            <div className="font-medium text-white">{item.clientName}</div>
                            <div className="text-xs text-slate-400">
                              {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })} - {item.unitName || "Sem local"} - {item.shiftName || "Sem turno"}
                            </div>
                          </div>
                          <Badge className={getStatusBadgeClassName(item.status)}>{item.status}</Badge>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {renderQuickExpenseSection({
              title: "Atalho rápido de lançamentos",
              description:
                "Os lançamentos também ficam disponíveis na aba de informações para não se perderem no fluxo.",
              compact: true,
            })}
          </TabsContent>
        </Tabs>

      <Dialog
        open={isCloseOperationDialogOpen}
        onOpenChange={setIsCloseOperationDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ocorrências pendentes</DialogTitle>
            <DialogDescription>
              Existem {unresolvedOccurrences.length} ocorrência(s) não resolvida(s) nesta operação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto rounded-md border p-3 text-sm">
              {unresolvedOccurrences.map((occurrence: any) => (
                <div key={occurrence.id} className="border-b border-slate-200 py-2 last:border-b-0">
                  <div className="font-medium">{occurrence.employeeName}</div>
                  <div className="text-muted-foreground">
                    {occurrence.typeLabel}: {occurrence.description}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCloseOperationDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => closeAttendanceMutation.mutate(selectedScheduleId)}
                disabled={closeAttendanceMutation.isPending}
              >
                Fechar mesmo assim
              </Button>
              <Button
                onClick={handleResolveAllAndClose}
                disabled={
                  resolveAllOccurrencesMutation.isPending ||
                  closeAttendanceMutation.isPending
                }
              >
                Resolver todas
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isOccurrenceDialogOpen}
        onOpenChange={setIsOccurrenceDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOccurrence ? "Editar ocorrência" : "Registrar ocorrência"}
            </DialogTitle>
            <DialogDescription>
              Registre problemas operacionais, ocorrências com cliente ou observações críticas da operação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Funcionário</Label>
              <Select
                value={occurrenceForm.employeeId}
                onValueChange={value =>
                  setOccurrenceForm(current => ({
                    ...current,
                    employeeId: value,
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operation">Operação</SelectItem>
                  {schedule?.allocations?.map((alloc: any) => (
                    <SelectItem key={alloc.id} value={String(alloc.employeeId)}>
                      {alloc.employeeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={occurrenceForm.type}
                onValueChange={value =>
                  setOccurrenceForm(current => ({
                    ...current,
                    type: value as OccurrenceType,
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="late">Atraso</SelectItem>
                  <SelectItem value="early_exit">Saída antecipada</SelectItem>
                  <SelectItem value="absence">Falta</SelectItem>
                  <SelectItem value="client_issue">Problema com cliente</SelectItem>
                  <SelectItem value="other">Outra ocorrência</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={occurrenceForm.description}
                onChange={event =>
                  setOccurrenceForm(current => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Descreva o que aconteceu na operação."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsOccurrenceDialogOpen(false);
                  setEditingOccurrence(null);
                  setOccurrenceForm(defaultOccurrenceForm);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveOccurrence}
                disabled={
                  addOccurrenceMutation.isPending || updateOccurrenceMutation.isPending
                }
              >
                {addOccurrenceMutation.isPending || updateOccurrenceMutation.isPending
                  ? "Salvando..."
                  : editingOccurrence
                    ? "Atualizar"
                    : "Registrar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAttendanceDialogOpen}
        onOpenChange={setIsAttendanceDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar presença</DialogTitle>
            <DialogDescription>
              Use este formulário para casos parciais ou quando precisar deixar
              observações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select
                value={attendanceStatus}
                onValueChange={(value: AttendanceStatus) =>
                  setAttendanceStatus(value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presente">Presente</SelectItem>
                  <SelectItem value="faltou">Faltou</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {attendanceStatus === "parcial" && (
              <div>
                <Label>Horas trabalhadas</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={partialHours}
                  onChange={event => setPartialHours(event.target.value)}
                  placeholder="Ex: 4"
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea
                value={attendanceNotes}
                onChange={event => setAttendanceNotes(event.target.value)}
                placeholder="Motivo, observação operacional, saída antecipada..."
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAttendanceDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSavePartialAttendance}
                disabled={setAttendanceMutation.isPending}
              >
                {setAttendanceMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPixDialogOpen} onOpenChange={setIsPixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar troca de PIX</DialogTitle>
            <DialogDescription>
              Envie para aprovação administrativa a nova chave PIX do diarista.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border p-3 text-sm">
              <div className="font-semibold">{selectedPixEmployee?.employeeName}</div>
              <div className="text-muted-foreground">
                Atual: {selectedPixEmployee?.currentPixKey || "Não informado"}
              </div>
            </div>
            <div>
              <Label>Nova chave PIX</Label>
              <Input
                value={pixForm.newPixKey}
                onChange={event =>
                  setPixForm(current => ({
                    ...current,
                    newPixKey: event.target.value,
                  }))
                }
                placeholder="Digite a nova chave PIX"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Motivo</Label>
              <Textarea
                value={pixForm.reason}
                onChange={event =>
                  setPixForm(current => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder="Explique o motivo da alteração"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPixDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitPixChange}
                disabled={requestPixChangeMutation.isPending}
              >
                {requestPixChangeMutation.isPending ? "Enviando..." : "Solicitar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isQuickRegisterDialogOpen}
        onOpenChange={setIsQuickRegisterDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cadastrar e alocar diarista</DialogTitle>
            <DialogDescription>
              Cadastre rapidamente um novo diarista e já o aloque nesta operação.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={quickRegisterForm.name}
                onChange={event =>
                  setQuickRegisterForm(current => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>CPF</Label>
              <Input
                value={quickRegisterForm.cpf}
                onChange={event =>
                  setQuickRegisterForm(current => ({
                    ...current,
                    cpf: event.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>RG</Label>
              <Input
                value={quickRegisterForm.rg}
                onChange={event =>
                  setQuickRegisterForm(current => ({
                    ...current,
                    rg: event.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipo da chave PIX</Label>
              <Select
                value={quickRegisterForm.pixKeyType}
                onValueChange={value =>
                  setQuickRegisterForm(current => ({
                    ...current,
                    pixKeyType: value as QuickRegisterForm["pixKeyType"],
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="random">Aleatória</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Chave PIX</Label>
              <Input
                value={quickRegisterForm.pixKey}
                onChange={event =>
                  setQuickRegisterForm(current => ({
                    ...current,
                    pixKey: event.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Documento frente</Label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                className="mt-1"
                onChange={event => void handleQuickRegisterFile("docFront", event)}
              />
              {quickRegisterForm.docFrontName ? (
                <p className="mt-1 text-xs text-slate-400">{quickRegisterForm.docFrontName}</p>
              ) : null}
            </div>
            <div>
              <Label>Documento verso</Label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                className="mt-1"
                onChange={event => void handleQuickRegisterFile("docBack", event)}
              />
              {quickRegisterForm.docBackName ? (
                <p className="mt-1 text-xs text-slate-400">{quickRegisterForm.docBackName}</p>
              ) : null}
            </div>
            <div>
              <Label>Função</Label>
              <Select
                value={quickRegisterForm.jobFunctionId}
                onValueChange={value => {
                  const option = allocationOptions.find(
                    (item: any) => String(item.id) === value
                  );

                  setQuickRegisterForm(current => ({
                    ...current,
                    jobFunctionId: value,
                    payValue: option?.defaultPayValue
                      ? String(option.defaultPayValue)
                      : current.payValue,
                    receiveValue: option?.defaultReceiveValue
                      ? String(option.defaultReceiveValue)
                      : current.receiveValue,
                  }));
                }}
              >
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  {allocationOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-400">
                      Nenhuma função ativa encontrada.
                    </div>
                  ) : (
                    allocationOptions.map((option: any) => (
                      <SelectItem
                        key={option.id}
                        value={String(option.id)}
                        className="text-white focus:text-white"
                      >
                        {option.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor diarista</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={quickRegisterForm.payValue}
                onChange={event =>
                  setQuickRegisterForm(current => ({
                    ...current,
                    payValue: event.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-400">
                {selectedAllocationOption?.defaultReceiveValue
                  ? "Valor interno preenchido automaticamente pela função."
                  : "Selecione a função para carregar os valores automáticos."}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsQuickRegisterDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleQuickRegisterAndAllocate}
              disabled={
                quickRegisterEmployeeMutation.isPending ||
                allocateNewEmployeeMutation.isPending
              }
            >
              {quickRegisterEmployeeMutation.isPending ||
              allocateNewEmployeeMutation.isPending
                ? "Salvando..."
                : "Cadastrar e Alocar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
