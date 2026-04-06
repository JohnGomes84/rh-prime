import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";

export default function NotasFiscaisRecebidas() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"received" | "processed" | "reconciled" | "rejected" | undefined>();
  const [emitterCNPJ, setEmitterCNPJ] = useState("");
  const [limit] = useState(10);

  // Consultar NFes
  const { data: nfesData, isLoading: isLoadingNfes } = trpc.fiscal.getNfesRecebidas.useQuery({
    page,
    limit,
    status,
    emitterCNPJ: emitterCNPJ || undefined,
  });

  // Consultar resumo
  const { data: summary } = trpc.fiscal.getNfeSummary.useQuery({});

  // Mutations
  const linkToAccountMutation = trpc.fiscal.linkNfeToAccount.useMutation();
  const markAsReconciledMutation = trpc.fiscal.markAsReconciled.useMutation();
  const rejectMutation = trpc.fiscal.rejectNfe.useMutation();

  const handleLinkToAccount = (nfeNumber: string) => {
    const accountId = prompt("ID da Conta a Receber:");
    if (accountId) {
      linkToAccountMutation.mutate(
        { nfeNumber, accountId: parseInt(accountId) },
        {
          onSuccess: () => {
            alert("NFe vinculada com sucesso!");
          },
        }
      );
    }
  };

  const handleMarkReconciled = (nfeNumber: string) => {
    markAsReconciledMutation.mutate(
      { nfeNumber },
      {
        onSuccess: () => {
          alert("NFe marcada como reconciliada!");
        },
      }
    );
  };

  const handleReject = (nfeNumber: string) => {
    const reason = prompt("Motivo da rejeição:");
    if (reason !== null) {
      rejectMutation.mutate(
        { nfeNumber, reason: reason || undefined },
        {
          onSuccess: () => {
            alert("NFe rejeitada!");
          },
        }
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Recebida
          </Badge>
        );
      case "processed":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <FileText className="w-3 h-3" /> Processada
          </Badge>
        );
      case "reconciled":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Reconciliada
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Rejeitada
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais Recebidas</h1>
        <p className="text-muted-foreground">Gerencie todas as NFes emitidas contra seu CNPJ</p>
      </div>

      {/* Resumo */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recebidas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.received.count || 0}</div>
              <p className="text-xs text-muted-foreground">
                R$ {(summary.received.totalAmount || 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processadas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.processed.count || 0}</div>
              <p className="text-xs text-muted-foreground">
                R$ {(summary.processed.totalAmount || 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reconciliadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.reconciled.count || 0}</div>
              <p className="text-xs text-muted-foreground">
                R$ {(summary.reconciled.totalAmount || 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejeitadas</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.rejected.count || 0}</div>
              <p className="text-xs text-muted-foreground">
                R$ {(summary.rejected.totalAmount || 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={status || ""} onValueChange={(v) => {
                setStatus(v as any);
                setPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="received">Recebida</SelectItem>
                  <SelectItem value="processed">Processada</SelectItem>
                  <SelectItem value="reconciled">Reconciliada</SelectItem>
                  <SelectItem value="rejected">Rejeitada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">CNPJ do Emitente</label>
              <Input
                placeholder="00.000.000/0000-00"
                value={emitterCNPJ}
                onChange={(e) => {
                  setEmitterCNPJ(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatus(undefined);
                  setEmitterCNPJ("");
                  setPage(1);
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Notas Fiscais</CardTitle>
          <CardDescription>
            {nfesData?.total || 0} NFes encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingNfes ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : nfesData?.data && nfesData.data.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chave de Acesso</TableHead>
                    <TableHead>Emitente</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nfesData.data.map((nfe) => (
                    <TableRow key={nfe.id}>
                      <TableCell className="font-mono text-xs">{nfe.nfeNumber}</TableCell>
                      <TableCell>{nfe.emitterName}</TableCell>
                      <TableCell>{new Date(nfe.issueDate).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-semibold">
                        R$ {nfe.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(nfe.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {nfe.status === "received" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLinkToAccount(nfe.nfeNumber)}
                                disabled={linkToAccountMutation.isPending}
                              >
                                Vincular
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(nfe.nfeNumber)}
                                disabled={rejectMutation.isPending}
                              >
                                Rejeitar
                              </Button>
                            </>
                          )}
                          {nfe.status === "processed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkReconciled(nfe.nfeNumber)}
                              disabled={markAsReconciledMutation.isPending}
                            >
                              Reconciliar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma NFe encontrada
            </div>
          )}

          {/* Paginação */}
          {nfesData && nfesData.total > limit && (
            <div className="flex justify-between items-center mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Página {page} de {Math.ceil(nfesData.total / limit)}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(nfesData.total / limit)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
