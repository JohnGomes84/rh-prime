import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

const formatDateTimeBR = (date: Date) => new Date(date).toLocaleString('pt-BR');

export function OvertimeManagement() {
  const { user } = useAuth();
  const employeeId = Number(user?.id ?? 0);
  const monthStart = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1), []);
  const monthEnd = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59), []);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState<{
    timeRecordId: number | '';
    overtimeHours: number;
    type: '50%' | '100%' | 'NOTURNO';
    reason: string;
  }>({
    timeRecordId: '',
    overtimeHours: 1,
    type: '50%',
    reason: '',
  });

  const utils = trpc.useUtils();
  const { data: requests = [], isLoading } = trpc.timesheet.listOvertimeRequests.useQuery(
    { employeeId },
    { enabled: !!employeeId }
  );

  const { data: stats } = trpc.timesheet.overtimeStats.useQuery(
    { employeeId },
    { enabled: !!employeeId }
  );

  const { data: timeRecords = [] } = trpc.timesheet.listRecords.useQuery(
    { employeeId, startDate: monthStart, endDate: monthEnd },
    { enabled: !!employeeId }
  );

  const refreshData = async () => {
    await Promise.all([
      utils.timesheet.listOvertimeRequests.invalidate(),
      utils.timesheet.overtimeStats.invalidate(),
    ]);
  };

  const requestMutation = trpc.timesheet.requestOvertime.useMutation({
    onSuccess: async () => {
      toast.success('Solicitacao de horas extras enviada.');
      setShowRequestForm(false);
      setFormData({ timeRecordId: '', overtimeHours: 1, type: '50%', reason: '' });
      await refreshData();
    },
    onError: (error) => toast.error(error.message),
  });

  const approveMutation = trpc.timesheet.approveOvertime.useMutation({
    onSuccess: async () => {
      toast.success('Horas extras aprovadas.');
      await refreshData();
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMutation = trpc.timesheet.approveOvertime.useMutation({
    onSuccess: async () => {
      toast.success('Horas extras rejeitadas.');
      await refreshData();
    },
    onError: (error) => toast.error(error.message),
  });

  const selectableRecords = timeRecords.filter((record: any) => record.clockOut);

  const handleSubmitRequest = () => {
    if (!employeeId || !formData.timeRecordId) {
      toast.error('Selecione um registro de ponto.');
      return;
    }
    requestMutation.mutate({
      employeeId,
      timeRecordId: Number(formData.timeRecordId),
      overtimeHours: formData.overtimeHours,
      type: formData.type,
      reason: formData.reason,
    });
  };

  const handleApprove = (overtimeId: number) => {
    approveMutation.mutate({ overtimeId, approved: true });
  };

  const handleReject = (overtimeId: number) => {
    rejectMutation.mutate({ overtimeId, approved: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestao de Horas Extras</h1>
        <p className="text-muted-foreground mt-2">Solicite e acompanhe suas horas extras</p>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Solicitado</p><p className="text-2xl font-bold">{stats.totalRequests}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Aprovadas</p><p className="text-2xl font-bold text-green-600">{stats.approvedRequests}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pendentes</p><p className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total de Horas</p><p className="text-2xl font-bold">{stats.totalOvertimeHours}h</p></CardContent></Card>
        </div>
      )}

      {showRequestForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nova Solicitacao de Horas Extras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="timeRecordId">Registro de Ponto *</Label>
              <Select
                value={formData.timeRecordId === '' ? '' : String(formData.timeRecordId)}
                onValueChange={(value) => setFormData({ ...formData, timeRecordId: Number(value) })}
              >
                <SelectTrigger id="timeRecordId">
                  <SelectValue placeholder="Selecione um registro concluido" />
                </SelectTrigger>
                <SelectContent>
                  {selectableRecords.map((record: any) => (
                    <SelectItem key={record.id} value={String(record.id)}>
                      {formatDateTimeBR(new Date(record.clockIn))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hours">Horas Extras *</Label>
                <Select value={String(formData.overtimeHours)} onValueChange={(value) => setFormData({ ...formData, overtimeHours: Number(value) })}>
                  <SelectTrigger id="hours">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['0.5', '1', '1.5', '2', '3', '4'].map((value) => (
                      <SelectItem key={value} value={value}>{value}h</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="type">Tipo de Hora Extra *</Label>
                <Select value={formData.type} onValueChange={(value: '50%' | '100%' | 'NOTURNO') => setFormData({ ...formData, type: value })}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50%">50%</SelectItem>
                    <SelectItem value="100%">100%</SelectItem>
                    <SelectItem value="NOTURNO">Noturno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Motivo</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo da hora extra"
                value={formData.reason}
                onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmitRequest} disabled={requestMutation.isPending}>
                {requestMutation.isPending ? 'Enviando...' : 'Enviar Solicitacao'}
              </Button>
              <Button variant="outline" onClick={() => setShowRequestForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showRequestForm && (
        <Button onClick={() => setShowRequestForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Solicitacao
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Solicitacoes de Horas Extras
          </CardTitle>
          <CardDescription>{requests.length} solicitacao(oes)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma solicitacao</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request: any) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{request.overtimeHours}h - {request.type}</p>
                      <p className="text-sm text-muted-foreground">{formatDateTimeBR(new Date(request.createdAt))}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                        request.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : request.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {request.status === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                      {request.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                      {request.status}
                    </span>
                  </div>
                  {request.reason && <p className="text-sm text-muted-foreground">{request.reason}</p>}
                  {request.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(request.id)} disabled={approveMutation.isPending}>Aprovar</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(request.id)} disabled={rejectMutation.isPending}>Rejeitar</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
