import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Filter } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  payment_created: '💳 Pagamento Criado',
  payment_approved: '✅ Pagamento Aprovado',
  payment_rejected: '❌ Pagamento Rejeitado',
  account_paid: '💰 Conta Paga',
  pix_key_added: '🔑 Chave PIX Adicionada',
  schedule_validated: '✔️ Planejamento Validado',
  schedule_rejected: '❌ Planejamento Rejeitado',
  employee_updated: '👤 Funcionário Atualizado',
  client_updated: '🏢 Cliente Atualizado',
};

const ACTION_COLORS: Record<string, string> = {
  payment_created: 'bg-blue-100 text-blue-800',
  payment_approved: 'bg-green-100 text-green-800',
  payment_rejected: 'bg-red-100 text-red-800',
  account_paid: 'bg-emerald-100 text-emerald-800',
  pix_key_added: 'bg-purple-100 text-purple-800',
  schedule_validated: 'bg-green-100 text-green-800',
  schedule_rejected: 'bg-red-100 text-red-800',
  employee_updated: 'bg-yellow-100 text-yellow-800',
  client_updated: 'bg-yellow-100 text-yellow-800',
};

export function Audit() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterEntity, setFilterEntity] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Buscar logs
  const { data: logsData, isLoading } = trpc.audit.getLogs.useQuery({
    page,
    limit,
    action: filterAction || undefined,
    entityType: filterEntity || undefined,
    startDate,
    endDate,
  });

  // Buscar resumo
  const { data: summary } = trpc.audit.getSummary.useQuery({
    startDate,
    endDate,
  });

  // Exportar logs
  const exportMutation = trpc.audit.exportLogs.useMutation();

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        startDate,
        endDate,
        action: filterAction || undefined,
      });

      // Criar blob e download
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', result.filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logsData?.logs?.map(log => log.action) || []));
  }, [logsData]);

  const uniqueEntities = useMemo(() => {
    return Array.from(new Set(logsData?.logs?.map(log => log.entityType) || []));
  }, [logsData]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Auditoria</h1>
        <p className="text-gray-500 mt-2">Registro de todas as ações do sistema</p>
      </div>

      {/* Resumo de Ações */}
      {summary && summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo de Ações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {summary.map((item: any) => (
                <div key={item.action} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold">{item.count}</div>
                  <div className="text-sm text-gray-600">{ACTION_LABELS[item.action] || item.action}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.uniqueUsers} usuário(s)</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Data Inicial</label>
              <Input
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => setEndDate(new Date(e.target.value))}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Ação</label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as ações</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABELS[action] || action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Tipo de Entidade</label>
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as entidades</SelectItem>
                  {uniqueEntities.map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={() => setPage(1)} variant="outline">
              Limpar Filtros
            </Button>
            <Button onClick={handleExport} disabled={exportMutation.isPending}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : logsData?.logs && logsData.logs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Mudanças</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-sm">{log.userName || 'Desconhecido'}</TableCell>
                        <TableCell>
                          <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800'}>
                            {ACTION_LABELS[log.action] || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.entityType}</TableCell>
                        <TableCell className="text-sm font-mono">{log.entityId}</TableCell>
                        <TableCell className="text-sm">
                          <details className="cursor-pointer">
                            <summary className="font-medium">Ver mudanças</summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {logsData.pagination && logsData.pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Página {logsData.pagination.page} de {logsData.pagination.pages} ({logsData.pagination.total} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      variant="outline"
                    >
                      Anterior
                    </Button>
                    <Button
                      onClick={() => setPage(Math.min(logsData.pagination.pages, page + 1))}
                      disabled={page === logsData.pagination.pages}
                      variant="outline"
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">Nenhum log encontrado</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
