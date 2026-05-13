import { useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  PenLine,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type ReviewStatus = "pending" | "approved" | "rejected";
type SignatoryType = "employee" | "company_representative";

const SIGNATORY_LABEL: Record<SignatoryType, string> = {
  employee: "Funcionário",
  company_representative: "Empresa",
};

const STATUS_FLOW = [
  { value: "DRAFT", label: "Rascunho" },
  { value: "DOCS_PENDING", label: "Aguardando docs" },
  { value: "VALIDATING", label: "Em validação" },
  { value: "APPROVED", label: "Aprovado" },
  { value: "ACTIVE", label: "Ativo" },
  { value: "REJECTED", label: "Rejeitado" },
  { value: "CANCELLED", label: "Cancelado" },
];

const V2_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  AWAITING_EVIDENCE: "Aguardando evidência",
  AWAITING_SIGNATURE: "Aguardando assinatura",
  UNDER_REVIEW: "Em revisão",
  COMPLETED: "Concluído",
  WAIVED: "Dispensado",
  REJECTED: "Rejeitado",
  ERROR: "Erro",
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

function getV2StatusVariant(status: string) {
  if (status === "COMPLETED") return "default";
  if (status === "WAIVED") return "secondary";
  if (status === "REJECTED" || status === "ERROR") return "destructive";
  return "outline";
}

export default function AdmissionDetail() {
  const [, params] = useRoute("/admissao/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ? Number(params.id) : 0;

  const utils = trpc.useUtils();
  const detail = trpc.lifecycle.admission.get.useQuery({ id }, { enabled: id > 0 });
  const employeesQuery = trpc.employees.list.useQuery({});

  const workflow = (detail.data as any)?.workflow;
  const isAdmissionV2 = Boolean(workflow?.catalogVersion);

  const checklistV2 = trpc.lifecycle.admission.checklist.useQuery(
    { id },
    {
      enabled: id > 0 && isAdmissionV2,
      retry: false,
    }
  );

  const employees = useMemo(() => {
    const data = employeesQuery.data as any;
    return Array.isArray(data) ? data : data?.data ?? [];
  }, [employeesQuery.data]);

  const invalidateAdmissionQueries = async () => {
    await Promise.all([
      utils.lifecycle.admission.get.invalidate({ id }),
      utils.lifecycle.admission.list.invalidate(),
      isAdmissionV2
        ? utils.lifecycle.admission.checklist.invalidate({ id })
        : Promise.resolve(),
    ]);
  };

  const updateMutation = trpc.lifecycle.admission.update.useMutation({
    onSuccess: () => {
      toast.success("Workflow atualizado");
      invalidateAdmissionQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const completeItem = trpc.lifecycle.admission.completeChecklistItem.useMutation({
    onSuccess: () => {
      utils.lifecycle.admission.get.invalidate({ id });
    },
    onError: (e) => toast.error(e.message),
  });

  const waiveItem = trpc.lifecycle.admission.waiveChecklistItem.useMutation({
    onSuccess: async () => {
      toast.success("Item dispensado");
      setWaiveTarget(null);
      setWaiveReason("");
      await invalidateAdmissionQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const reviewItem = trpc.lifecycle.admission.reviewChecklistItem.useMutation({
    onSuccess: async () => {
      toast.success("Revisão registrada");
      setReviewTarget(null);
      setReviewStatus("approved");
      setReviewNotes("");
      await invalidateAdmissionQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const attachEvidenceUrl = trpc.lifecycle.admission.attachEvidenceUrl.useMutation({
    onSuccess: async () => {
      toast.success("Evidência anexada");
      setAttachTarget(null);
      setAttachUrl("");
      setAttachName("");
      setAttachFileType("");
      setAttachObservations("");
      await invalidateAdmissionQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const signEvidence = trpc.lifecycle.admission.signEvidence.useMutation({
    onSuccess: async () => {
      toast.success("Assinatura registrada");
      setSignTarget(null);
      setSignSignatoryType("employee");
      setSignMethod("electronic");
      await invalidateAdmissionQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const finalize = trpc.lifecycle.admission.finalize.useMutation({
    onSuccess: async () => {
      toast.success("Admissão finalizada e vinculada ao funcionário");
      await invalidateAdmissionQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const [linkEmpId, setLinkEmpId] = useState<string>("");
  const [waiveTarget, setWaiveTarget] = useState<{ id: number; description: string } | null>(null);
  const [waiveReason, setWaiveReason] = useState("");
  const [reviewTarget, setReviewTarget] = useState<{ id: number; description: string; currentStatus: string | null } | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [attachTarget, setAttachTarget] = useState<{ id: number; description: string } | null>(null);
  const [attachUrl, setAttachUrl] = useState("");
  const [attachName, setAttachName] = useState("");
  const [attachFileType, setAttachFileType] = useState("");
  const [attachObservations, setAttachObservations] = useState("");
  const [signTarget, setSignTarget] = useState<{ id: number; description: string; policy: string } | null>(null);
  const [signSignatoryType, setSignSignatoryType] = useState<SignatoryType>("employee");
  const [signMethod, setSignMethod] = useState<"electronic" | "manuscrita" | "icp_brasil">("electronic");

  const submitAttach = () => {
    if (!attachTarget) return;
    try {
      new URL(attachUrl);
    } catch {
      toast.error("Informe uma URL válida");
      return;
    }
    if (attachName.trim().length < 1) {
      toast.error("Informe o nome do documento");
      return;
    }
    attachEvidenceUrl.mutate({
      workflowId: id,
      itemId: attachTarget.id,
      fileUrl: attachUrl.trim(),
      documentName: attachName.trim(),
      fileType: attachFileType.trim() || undefined,
      observations: attachObservations.trim() || undefined,
    });
  };

  const submitSign = () => {
    if (!signTarget) return;
    signEvidence.mutate({
      workflowId: id,
      itemId: signTarget.id,
      signatoryType: signSignatoryType,
      signatureMethod: signMethod,
    });
  };

  const openReview = (item: any) => {
    setReviewTarget({ id: item.id, description: item.itemDescription, currentStatus: item.reviewStatus ?? null });
    setReviewStatus((item.reviewStatus as ReviewStatus) ?? "approved");
    setReviewNotes(item.reviewNotes ?? "");
  };

  const submitReview = () => {
    if (!reviewTarget) return;
    reviewItem.mutate({
      workflowId: id,
      itemId: reviewTarget.id,
      reviewStatus,
      reviewNotes: reviewNotes.trim() || undefined,
    });
  };

  const submitWaive = () => {
    if (!waiveTarget) return;
    if (waiveReason.trim().length < 3) {
      toast.error("Informe a justificativa (mínimo 3 caracteres)");
      return;
    }
    waiveItem.mutate({
      workflowId: id,
      itemId: waiveTarget.id,
      waivedReason: waiveReason.trim(),
    });
  };

  if (id <= 0) {
    return (
      <DashboardLayout>
        <div className="p-6">ID inválido</div>
      </DashboardLayout>
    );
  }

  if (detail.isLoading || (isAdmissionV2 && checklistV2.isLoading)) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      </DashboardLayout>
    );
  }

  if (!detail.data) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Button variant="ghost" onClick={() => setLocation("/admissao")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <p className="text-sm text-muted-foreground">Workflow não encontrado.</p>
        </div>
      </DashboardLayout>
    );
  }

  const detailData = isAdmissionV2 && checklistV2.data ? checklistV2.data : (detail.data as any);
  const checklist = detailData?.checklist ?? [];

  const totalRequired = checklist.filter((item: any) => item.required).length;
  const completedRequired = checklist.filter((item: any) =>
    isAdmissionV2
      ? item.required && (item.status === "COMPLETED" || item.status === "WAIVED")
      : item.required && item.completed
  ).length;
  const allRequiredDone = totalRequired > 0 && completedRequired === totalRequired;

  const grouped: Record<string, any[]> = {};
  for (const item of checklist) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/admissao")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{workflow.candidateName}</h1>
              <p className="text-muted-foreground text-sm">
                Admissão #{workflow.id} · {workflow.contractType} · iniciada em{" "}
                {formatDate(workflow.startedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmissionV2 && <Badge variant="secondary">Checklist v2</Badge>}
            <Badge>{STATUS_FLOW.find((s) => s.value === workflow.status)?.label ?? workflow.status}</Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Itens obrigatórios</p>
              <p className="text-2xl font-bold">
                {completedRequired} / {totalRequired}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">CPF</p>
              <p className="font-mono text-sm">{workflow.candidateCpf ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Salário proposto</p>
              <p className="text-sm font-medium">
                {workflow.proposedSalary
                  ? new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(parseFloat(workflow.proposedSalary))
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status e ações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Select
                  value={workflow.status}
                  onValueChange={(v) => updateMutation.mutate({ id, status: v as any })}
                  disabled={updateMutation.isPending || workflow.status === "ACTIVE"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FLOW.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vincular ao funcionário criado</Label>
                <div className="flex gap-2">
                  <Select value={linkEmpId} onValueChange={setLinkEmpId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funcionário criado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee: any) => (
                        <SelectItem key={employee.id} value={String(employee.id)}>
                          {employee.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (!linkEmpId) {
                        toast.error("Selecione o funcionário");
                        return;
                      }
                      finalize.mutate({ id, employeeId: Number(linkEmpId) });
                    }}
                    disabled={finalize.isPending || !allRequiredDone || workflow.status === "ACTIVE"}
                  >
                    <UserCheck className="h-4 w-4 mr-2" /> Finalizar
                  </Button>
                </div>
                {!allRequiredDone && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                    <AlertCircle className="h-3 w-3" /> Complete os itens obrigatórios antes de finalizar.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isAdmissionV2 ? "Checklist oficial da admissão" : "Checklist"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                </h3>

                <div className="space-y-3">
                  {items.map((item: any) =>
                    isAdmissionV2 ? (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border/60 p-3"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{item.itemDescription}</span>
                              <Badge variant={getV2StatusVariant(item.status) as any}>
                                {V2_STATUS_LABELS[item.status] ?? item.status}
                              </Badge>
                              {item.required && <Badge variant="destructive">Obrigatório</Badge>}
                              {item.kind && <Badge variant="outline">{item.kind}</Badge>}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {item.code && <span>{item.code}</span>}
                              {item.templatePolicy !== "none" && <span>Template: {item.templatePolicy}</span>}
                              {item.signaturePolicy !== "none" && (
                                <span>Assinatura: {item.signaturePolicy}</span>
                              )}
                              {item.reviewPolicy === "manual_review" && <span>Revisão manual</span>}
                            </div>

                            <div className="space-y-1 text-xs">
                              {item.evidenceDocuments?.length ? (
                                item.evidenceDocuments.map((doc: any) => (
                                  <div key={doc.id} className="flex items-center gap-2 text-muted-foreground">
                                    <FileText className="h-3.5 w-3.5" />
                                    <a
                                      href={doc.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="hover:text-foreground inline-flex items-center gap-1"
                                    >
                                      {doc.documentName}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                    {doc.isPrimaryEvidence && <Badge variant="secondary">Principal</Badge>}
                                    <span>{formatDate(doc.uploadedAt)}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <ShieldAlert className="h-3.5 w-3.5" />
                                  <span>Sem evidências vinculadas</span>
                                </div>
                              )}
                            </div>

                            {item.signaturePolicy !== "none" && (
                              <div className="space-y-1 text-xs">
                                {item.signatures?.length ? (
                                  item.signatures.map((sig: any) => (
                                    <div
                                      key={sig.id}
                                      className="flex items-center gap-2 text-emerald-700"
                                    >
                                      <ShieldCheck className="h-3.5 w-3.5" />
                                      <span>
                                        {SIGNATORY_LABEL[sig.signatoryType as SignatoryType] ?? sig.signatoryType}
                                      </span>
                                      <span className="text-muted-foreground">
                                        ({sig.signatureMethod}) · {formatDate(sig.signedAt)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <PenLine className="h-3.5 w-3.5" />
                                    <span>Aguardando assinaturas</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {item.waivedReason && (
                              <p className="text-xs text-muted-foreground">
                                Dispensa: {item.waivedReason}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 md:justify-end">
                            {item.documentPolicy !== "none" && item.status !== "WAIVED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={attachEvidenceUrl.isPending}
                                onClick={() =>
                                  setAttachTarget({ id: item.id, description: item.itemDescription })
                                }
                              >
                                <Paperclip className="h-3.5 w-3.5 mr-1" />
                                {item.primaryEvidence ? "Substituir" : "Anexar"}
                              </Button>
                            )}
                            {item.signaturePolicy !== "none" && item.primaryEvidence && item.status !== "WAIVED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={signEvidence.isPending}
                                onClick={() =>
                                  setSignTarget({
                                    id: item.id,
                                    description: item.itemDescription,
                                    policy: item.signaturePolicy,
                                  })
                                }
                              >
                                <PenLine className="h-3.5 w-3.5 mr-1" />
                                Assinar
                              </Button>
                            )}
                            {item.reviewPolicy === "manual_review" && (
                              <Button
                                size="sm"
                                disabled={reviewItem.isPending}
                                onClick={() => openReview(item)}
                              >
                                Revisar
                              </Button>
                            )}
                            {item.status !== "COMPLETED" && item.status !== "WAIVED" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={waiveItem.isPending}
                                onClick={() =>
                                  setWaiveTarget({ id: item.id, description: item.itemDescription })
                                }
                              >
                                Dispensar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/40"
                      >
                        <label className="flex flex-1 cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!item.completed}
                            disabled={completeItem.isPending}
                            onChange={(e) =>
                              completeItem.mutate({ id: item.id, completed: e.target.checked })
                            }
                          />
                          <span
                            className={item.completed ? "text-muted-foreground line-through" : ""}
                          >
                            {item.itemDescription}
                          </span>
                          {item.required && !item.completed && (
                            <span className="text-xs text-red-600">(obrigatório)</span>
                          )}
                          {item.completed && (
                            <CheckCircle2 className="ml-1 h-3.5 w-3.5 text-emerald-600" />
                          )}
                        </label>
                        {item.completedAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDate(item.completedAt)}
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(waiveTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setWaiveTarget(null);
            setWaiveReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispensar item do checklist</DialogTitle>
            <DialogDescription>
              {waiveTarget?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="waive-reason">Justificativa</Label>
            <Textarea
              id="waive-reason"
              value={waiveReason}
              onChange={(e) => setWaiveReason(e.target.value)}
              placeholder="Explique por que este item está sendo dispensado…"
              rows={4}
              disabled={waiveItem.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Registrado no histórico do workflow para auditoria.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setWaiveTarget(null);
                setWaiveReason("");
              }}
              disabled={waiveItem.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              onClick={submitWaive}
              disabled={waiveItem.isPending || waiveReason.trim().length < 3}
            >
              {waiveItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Dispensar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewTarget(null);
            setReviewStatus("approved");
            setReviewNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar item</DialogTitle>
            <DialogDescription>
              {reviewTarget?.description}
              {reviewTarget?.currentStatus && (
                <span className="ml-2 text-xs">
                  (atual: <Badge variant="outline">{reviewTarget.currentStatus}</Badge>)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Decisão</Label>
              <RadioGroup
                value={reviewStatus}
                onValueChange={(v) => setReviewStatus(v as ReviewStatus)}
                disabled={reviewItem.isPending}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="review-approved" value="approved" />
                  <Label htmlFor="review-approved" className="font-normal">
                    Aprovar
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="review-pending" value="pending" />
                  <Label htmlFor="review-pending" className="font-normal">
                    Marcar em revisão
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="review-rejected" value="rejected" />
                  <Label htmlFor="review-rejected" className="font-normal">
                    Rejeitar
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-notes">Observações (opcional)</Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Notas internas sobre a revisão…"
                rows={3}
                disabled={reviewItem.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setReviewTarget(null);
                setReviewStatus("approved");
                setReviewNotes("");
              }}
              disabled={reviewItem.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitReview}
              disabled={reviewItem.isPending}
              variant={reviewStatus === "rejected" ? "destructive" : "default"}
            >
              {reviewItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar revisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(attachTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setAttachTarget(null);
            setAttachUrl("");
            setAttachName("");
            setAttachFileType("");
            setAttachObservations("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anexar evidência por URL</DialogTitle>
            <DialogDescription>{attachTarget?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="attach-url">URL do arquivo</Label>
              <Input
                id="attach-url"
                type="url"
                placeholder="https://…"
                value={attachUrl}
                onChange={(e) => setAttachUrl(e.target.value)}
                disabled={attachEvidenceUrl.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Link público para o arquivo (Drive, S3, etc). Upload nativo virá em fase futura.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="attach-name">Nome do documento</Label>
              <Input
                id="attach-name"
                value={attachName}
                onChange={(e) => setAttachName(e.target.value)}
                placeholder="Ex.: RG do candidato.pdf"
                disabled={attachEvidenceUrl.isPending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="attach-type">Tipo (opcional)</Label>
              <Input
                id="attach-type"
                value={attachFileType}
                onChange={(e) => setAttachFileType(e.target.value)}
                placeholder="pdf, jpg, png…"
                maxLength={10}
                disabled={attachEvidenceUrl.isPending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="attach-obs">Observações (opcional)</Label>
              <Textarea
                id="attach-obs"
                value={attachObservations}
                onChange={(e) => setAttachObservations(e.target.value)}
                rows={2}
                disabled={attachEvidenceUrl.isPending}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setAttachTarget(null)}
              disabled={attachEvidenceUrl.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitAttach}
              disabled={attachEvidenceUrl.isPending || !attachUrl || !attachName}
            >
              {attachEvidenceUrl.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Anexar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(signTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setSignTarget(null);
            setSignSignatoryType("employee");
            setSignMethod("electronic");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assinar evidência</DialogTitle>
            <DialogDescription>
              {signTarget?.description}
              {signTarget?.policy && (
                <span className="ml-2 text-xs">
                  Política: <Badge variant="outline">{signTarget.policy}</Badge>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Assinar como</Label>
              <RadioGroup
                value={signSignatoryType}
                onValueChange={(v) => setSignSignatoryType(v as SignatoryType)}
                disabled={signEvidence.isPending}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="sig-employee" value="employee" />
                  <Label htmlFor="sig-employee" className="font-normal">
                    Funcionário
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="sig-company" value="company_representative" />
                  <Label htmlFor="sig-company" className="font-normal">
                    Representante da empresa
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <RadioGroup
                value={signMethod}
                onValueChange={(v) => setSignMethod(v as typeof signMethod)}
                disabled={signEvidence.isPending}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="met-electronic" value="electronic" />
                  <Label htmlFor="met-electronic" className="font-normal">
                    Eletrônica
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="met-manuscrita" value="manuscrita" />
                  <Label htmlFor="met-manuscrita" className="font-normal">
                    Manuscrita (digitalizada)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="met-icp" value="icp_brasil" />
                  <Label htmlFor="met-icp" className="font-normal">
                    ICP-Brasil
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <p className="text-xs text-muted-foreground">
              Registra autoria do usuário logado, IP, data/hora e método. Não substitui assinatura criptográfica.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSignTarget(null)}
              disabled={signEvidence.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitSign}
              disabled={signEvidence.isPending}
            >
              {signEvidence.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
