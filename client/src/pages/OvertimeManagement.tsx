import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

const formatDateTimeBR = (date: Date) => new Date(date).toLocaleString('pt-BR');

export function OvertimeManagement() {
  const { user } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    timeRecordId: '',
    overtimeHours: 1,
    type: '50%' as const,
    reason: '',
  });

  const { data: requests = [], isLoading, refetch } = trpc.timesheet.listOvertimeRequests.useQuery(
    { employeeId: user?.id || '' },
    { enabled: !!user?.id }
  );

  const { data: stats } = trpc.timesheet.overtimeStats.useQuery(
    { employeeId: user?.id || '' },
    { enabled: !!user?.id }
  );

  const requestMutation = trpc.timesheet.requestOvertime.useMutation({
    onSuccess: () => {
      alert('Solicitação de horas extras enviada!');
      setShowRequestForm(false);
      setFormData({ timeRecordId: '', overtimeHours: 1, type: '50%', reason: '' });
      refetch();
    },
  });

  const approveMutation = trpc.timesheet.approveOvertime.useMutation({
    onSuccess: () => {
      alert('Horas extras aprovadas!');
      refetch();
    },
  });

  const rejectMutation = trpc.timesheet.approveOvertime.useMutation({
    onSuccess: () => {
      alert('Horas extras rejeitadas!');
      refetch();
    },
  });

  const handleSubmitRequest = () => {
    if (!user?.id || !formData.timeRecordId) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    requestMutation.mutate({
      employeeId: user.id,
      timeRecordId: formData.timeRecordId,
      overtimeHours: formData.overtimeHours,
      type: formData.type,
      reason: formData.reason,
    });
  };

  const handleApprove = (overtimeId: string) => {
    approveMutation.mutate({ overtimeId, approved: true });
  };

  const handleReject = (overtimeId: string) => {
    rejectMutation.mutate({ overtimeId, approved: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Horas Extras</h1>
        <p className="text-muted-foreground mt-2">Solicite e acompanhe suas horas extras</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Solicitado</p>
              <p className="text-2xl font-bold">{stats.totalRequests}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Aprovadas</p>
              <p className="text-2xl font-bold text-green-600">{stats.approvedRequests}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingRequests}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total de Horas</p>
              <p className="text-2xl font-bold">{stats.totalOvertimeHours}h</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Request Form */}
      {showRequestForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nova Solicitação de Horas Extras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="timeRecordId">ID do Registro de Ponto *</Label>
              <Input
                id="timeRecordId"
                placeholder="Selecione o registro"
                value={formData.timeRecordId}
                onChange={(e) => setFormData({ ...formData, timeRecordId: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hours">Horas de Trabalho *</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={formData.overtimeHours}
                  onChange={(e) =>
                    setFormData({ ...formData, overtimeHours: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label htmlFor="type">Tipo de Hora Extra *</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50%">50% (Noturna)</SelectItem>
                    <SelectItem value="100%">100% (Diurna)</SelectItem>
                    <SelectItem value="NOTURNO">Noturna (20%)</SelectItem>
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
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSubmitRequest}
                disabled={requestMutation.isPending}
              >
                {requestMutation.isPending ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
              <Button variant="outline" onClick={() => setShowRequestForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showRequestForm && (
        <Button onClick={() => setShowRequestForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nova Solicitação
        </Button>
      )}

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Solicitações de Horas Extras
          </CardTitle>
          <CardDescription>
            {requests.length} solicitação(ões)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma solicitação</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request: any) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{request.overtimeHours}h - {request.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTimeBR(new Date(request.createdAt))}
                      </p>
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
                  {request.reason && (
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  )}
                  {request.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={approveMutation.isPending}
                      >
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request.id)}
                        disabled={rejectMutation.isPending}
                      >
                        Rejeitar
                      </Button>
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
