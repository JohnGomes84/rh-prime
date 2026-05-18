import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const ALL_STATUS_VALUE = "all";

export default function PixRequests() {
  const [statusFilter, setStatusFilter] = useState<"pendente" | "aprovado" | "rejeitado" | undefined>(undefined);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Query
  const { data: requests, isLoading, refetch } = trpc.portalLider.listPixRequests.useQuery({
    status: statusFilter,
  });

  // Mutation
  const reviewMutation = trpc.portalLider.reviewPixRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitação processada com sucesso!");
      setIsDialogOpen(false);
      setSelectedRequestId(null);
      setReviewNotes("");
      setIsApproving(false);
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao processar solicitação");
    },
  });

  const handleOpenReviewDialog = (requestId: number, approve: boolean) => {
    setSelectedRequestId(requestId);
    setIsApproving(approve);
    setReviewNotes("");
    setIsDialogOpen(true);
  };

  const handleReview = () => {
    if (selectedRequestId === null) return;
    reviewMutation.mutate({
      requestId: selectedRequestId,
      approved: isApproving,
      reviewNotes: reviewNotes || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pendente: { variant: "outline", label: "Pendente" },
      aprovado: { variant: "default", label: "Aprovado" },
      rejeitado: { variant: "destructive", label: "Rejeitado" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Solicitações de Alteração PIX</h1>
        <p className="text-muted-foreground mt-2">Revise e aprove/rejeite solicitações de alteração de chave PIX</p>
      </div>

      {/* Filtro de Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter ?? ALL_STATUS_VALUE}
                onValueChange={(value) =>
                  setStatusFilter(value === ALL_STATUS_VALUE ? undefined : (value as typeof statusFilter))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS_VALUE}>Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Solicitações */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações</CardTitle>
          <CardDescription>
            {requests?.length || 0} solicitação(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>PIX Anterior</TableHead>
                    <TableHead>PIX Novo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Solicitação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request: any) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.employeeName}</TableCell>
                      <TableCell className="text-sm">{request.employeeCpf}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {request.oldPixKey ? (
                          <span className="bg-muted px-2 py-1 rounded text-xs">
                            {request.oldPixKey.substring(0, 6)}...
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        <span className="bg-muted px-2 py-1 rounded text-xs">
                          {request.newPixKey.substring(0, 6)}...
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(request.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {request.status === "pendente" && (
                          <div className="flex gap-2">
                            <Dialog open={isDialogOpen && selectedRequestId === request.id && isApproving} onOpenChange={setIsDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleOpenReviewDialog(request.id, true)}
                                >
                                  Aprovar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Aprovar Alteração PIX</DialogTitle>
                                  <DialogDescription>
                                    {request.employeeName} - {request.employeeCpf}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">PIX Anterior</label>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {request.oldPixKey || "Não informado"}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">PIX Novo</label>
                                    <p className="text-sm text-muted-foreground mt-1 font-mono">
                                      {request.newPixKey}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Observações</label>
                                    <Textarea
                                      value={reviewNotes}
                                      onChange={(e) => setReviewNotes(e.target.value)}
                                      placeholder="Adicione observações sobre a aprovação..."
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                      Cancelar
                                    </Button>
                                    <Button onClick={handleReview} disabled={reviewMutation.isPending}>
                                      {reviewMutation.isPending ? "Processando..." : "Aprovar"}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog open={isDialogOpen && selectedRequestId === request.id && !isApproving} onOpenChange={setIsDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleOpenReviewDialog(request.id, false)}
                                >
                                  Rejeitar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Rejeitar Alteração PIX</DialogTitle>
                                  <DialogDescription>
                                    {request.employeeName} - {request.employeeCpf}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Motivo da Rejeição</label>
                                    <Textarea
                                      value={reviewNotes}
                                      onChange={(e) => setReviewNotes(e.target.value)}
                                      placeholder="Explique o motivo da rejeição..."
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                      Cancelar
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={handleReview}
                                      disabled={reviewMutation.isPending}
                                    >
                                      {reviewMutation.isPending ? "Processando..." : "Rejeitar"}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                        {request.status !== "pendente" && (
                          <div className="text-sm text-muted-foreground">
                            {request.reviewNotes ? (
                              <span title={request.reviewNotes}>
                                {request.reviewNotes.substring(0, 20)}...
                              </span>
                            ) : (
                              "—"
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma solicitação encontrada.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
