import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import {
  Clock, LogIn, LogOut, Calendar, Timer, AlertCircle,
  CheckCircle2, UserRound, ChevronLeft, ChevronRight, MapPin,
  Camera, Wifi, ShieldCheck, ClipboardCopy, FileWarning,
} from 'lucide-react';

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="text-center">
      <p className="text-5xl font-bold tabular-nums tracking-tight">
        {time.toLocaleTimeString('pt-BR')}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        {time.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}

export default function Timesheet() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const sessionQuery = trpc.auth.session.useQuery(undefined, { enabled: !!user?.id });
  const linkedEmployee = sessionQuery.data?.employee ?? null;
  const canUseTimesheet = Boolean(linkedEmployee?.id);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);
  const [lastLocation, setLastLocation] = useState<string | undefined>();
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [cameraAvailable, setCameraAvailable] = useState(() => typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia));
  const locationAvailable = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const [monthOffset, setMonthOffset] = useState(0);
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);
  const targetMonth = targetDate.getMonth() + 1;
  const targetYear = targetDate.getFullYear();

  // Buscar ponto aberto
  const { data: openRecord, isLoading: loadingOpen } = trpc.timesheet.getOpenRecord.useQuery(
    undefined,
    { enabled: canUseTimesheet, refetchInterval: 30000 }
  );

  // Buscar registros do mês
  const startDate = useMemo(() => new Date(targetYear, targetMonth - 1, 1), [targetYear, targetMonth]);
  const endDate = useMemo(() => new Date(targetYear, targetMonth, 0, 23, 59, 59), [targetYear, targetMonth]);

  const { data: records = [], isLoading: loadingRecords } = trpc.timesheet.listRecords.useQuery(
    { startDate, endDate },
    { enabled: canUseTimesheet }
  );

  // Buscar resumo mensal
  const { data: summary } = trpc.timesheet.monthlySummary.useQuery(
    { month: targetMonth, year: targetYear },
    { enabled: canUseTimesheet }
  );

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  // Mutations
  const captureLocation = (): Promise<string | undefined> =>
    new Promise((resolve) => {
      if (!('geolocation' in navigator)) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const acc = Math.round(pos.coords.accuracy);
          resolve(`${lat},${lng} (±${acc}m)`);
        },
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    });

  const clockInMutation = trpc.timesheet.clockIn.useMutation({
    onSuccess: (data: any, variables: any) => {
      setLastReceipt({
        type: 'Entrada',
        at: new Date(),
        nsr: data?.nsr,
        recordId: data?.id,
        location: variables?.location,
        status: 'PENDING',
      });
      toast.success('Entrada registrada com sucesso');
      utils.timesheet.getOpenRecord.invalidate();
      utils.timesheet.listRecords.invalidate();
      utils.timesheet.monthlySummary.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Falha ao registrar entrada'),
  });

  const clockOutMutation = trpc.timesheet.clockOut.useMutation({
    onSuccess: (data: any, variables: any) => {
      setLastReceipt({
        type: 'Saída',
        at: new Date(),
        nsr: (openRecord as any)?.nsr,
        recordId: (openRecord as any)?.id,
        location: variables?.notes?.replace('[saÃ­da] ', '').replace('[saída] ', ''),
        status: data?.status ?? 'APPROVED',
      });
      const ev = data?.evaluation;
      if (ev?.delayMinutes > 0) {
        toast.warning(`Saída registrada. Atraso de ${ev.delayMinutes}min no início.`);
      } else if (ev?.overtime?.total > 0) {
        toast.success(`Saída registrada. ${Math.round(ev.overtime.total)}min de hora extra.`);
      } else {
        toast.success('Saída registrada com sucesso');
      }
      utils.timesheet.getOpenRecord.invalidate();
      utils.timesheet.listRecords.invalidate();
      utils.timesheet.monthlySummary.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Falha ao registrar saída'),
  });

  const uploadSelfieMutation = trpc.timesheet.uploadSelfie.useMutation();
  const isWorking = !!openRecord;
  const isPending = clockInMutation.isPending || clockOutMutation.isPending || uploadSelfieMutation.isPending;

  const captureSelfie = (): Promise<string | undefined> =>
    new Promise((resolve) => {
      if (!('mediaDevices' in navigator)) return resolve(undefined);
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 }, audio: false })
        .then((stream) => {
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play().catch(() => {/* ignore */});
          setTimeout(() => {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 240;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(video, 0, 0, 320, 240);
            stream.getTracks().forEach((t) => t.stop());
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            resolve(dataUrl);
          }, 600);
        })
        .catch(() => {
          setCameraAvailable(false);
          resolve(undefined);
        });
    });

  const fingerprint = (): string => {
    const ua = navigator.userAgent;
    const lang = navigator.language;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const raw = [ua, lang, tz, screen].join('|');
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
    return `dfp_${Math.abs(h).toString(36)}`;
  };

  const handleToggleClock = async () => {
    if (!canUseTimesheet) {
      toast.error('Seu usuario ainda nao esta vinculado a um funcionario.');
      return;
    }
    const [location, selfieDataUrl] = await Promise.all([captureLocation(), captureSelfie()]);
    setLastLocation(location);
    const deviceFingerprint = fingerprint();
    if (isWorking) {
      clockOutMutation.mutate({
        notes: location ? `[saída] ${location}` : undefined,
      });
    } else {
      let selfieUrl: string | undefined;
      if (selfieDataUrl) {
        try {
          const uploaded = await uploadSelfieMutation.mutateAsync({
            imageBase64: selfieDataUrl,
            contentType: selfieDataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
          });
          selfieUrl = uploaded.url;
        } catch {
          toast.warning('Selfie nao foi enviada. A batida sera registrada sem foto.');
        }
      }
      clockInMutation.mutate({
        location,
        selfieUrl,
        deviceFingerprint,
      });
    }
  };

  // Calcular tempo trabalhando agora
  const [elapsedTime, setElapsedTime] = useState('');
  useEffect(() => {
    if (!openRecord) { setElapsedTime(''); return; }
    const timer = setInterval(() => {
      const start = new Date(openRecord.clockIn).getTime();
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [openRecord]);

  const monthLabel = targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const todayRecords = useMemo(() => {
    const now = new Date();
    return (records as any[]).filter((record) => {
      const clockIn = new Date(record.clockIn);
      return clockIn.getFullYear() === now.getFullYear()
        && clockIn.getMonth() === now.getMonth()
        && clockIn.getDate() === now.getDate();
    }).sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());
  }, [records]);

  const todayRecord = openRecord ?? todayRecords[todayRecords.length - 1] ?? null;
  const todayClockIn = todayRecord ? new Date((todayRecord as any).clockIn) : null;
  const todayClockOut = (todayRecord as any)?.clockOut ? new Date((todayRecord as any).clockOut) : null;
  const currentStatusLabel = isWorking ? 'Trabalhando' : todayClockOut ? 'Jornada encerrada' : 'Aguardando entrada';
  const nextActionLabel = isWorking ? 'Registrar Saída' : 'Registrar Entrada';
  const todayWorkedHours = todayClockIn && todayClockOut
    ? ((todayClockOut.getTime() - todayClockIn.getTime()) / 3600000).toFixed(2)
    : null;

  const copyReceipt = async () => {
    if (!lastReceipt) return;
    const text = [
      'Comprovante de ponto',
      `Tipo: ${lastReceipt.type}`,
      `Horario: ${lastReceipt.at.toLocaleString('pt-BR')}`,
      `Funcionario: ${linkedEmployee?.fullName ?? '-'}`,
      `NSR: ${lastReceipt.nsr ?? '-'}`,
      `Registro: ${lastReceipt.recordId ?? '-'}`,
      `Localizacao: ${lastReceipt.location ?? 'nao capturada'}`,
      `Status: ${lastReceipt.status ?? '-'}`,
    ].join('\n');
    await navigator.clipboard?.writeText(text);
    toast.success('Comprovante copiado');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Aprovado</Badge>;
      case 'PENDING': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">Pendente</Badge>;
      case 'REJECTED': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200">Rejeitado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bater Ponto</h1>
          <p className="text-muted-foreground mt-1">Registre entrada e saída e acompanhe sua jornada</p>
        </div>

        {/* Relógio + Botão de Ponto */}
        {!sessionQuery.isLoading && !canUseTimesheet && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-950">Usuario sem funcionario vinculado</p>
                  <p className="text-sm text-amber-800">
                    Para registrar jornada, vincule este login ao cadastro do funcionario em Usuarios ou no cadastro do funcionario.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {linkedEmployee && (
          <Card className="border-slate-200">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Funcionario vinculado</p>
                  <p className="font-medium">{linkedEmployee.fullName}</p>
                </div>
              </div>
              <Badge variant="outline" className="w-fit gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pronto para registro
              </Badge>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Jornada de hoje</span>
                <Badge variant={isWorking ? 'default' : 'outline'}>
                  {currentStatusLabel}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Entrada</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {todayClockIn ? todayClockIn.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Intervalo</p>
                  <p className="mt-1 font-semibold text-muted-foreground">Em breve</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Retorno</p>
                  <p className="mt-1 font-semibold text-muted-foreground">Em breve</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Saida</p>
                  <p className="mt-1 font-semibold tabular-nums">
                    {todayClockOut ? todayClockOut.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Proxima acao: <strong>{nextActionLabel}</strong>
                </span>
                <span className="text-muted-foreground">
                  {todayWorkedHours ? `${todayWorkedHours}h trabalhadas hoje` : isWorking ? `Em andamento ha ${elapsedTime || '00:00:00'}` : 'Sem horas fechadas hoje'}
                </span>
              </div>

              <Button variant="outline" size="sm" className="w-fit gap-2" onClick={() => setLocation('/inbox')}>
                <FileWarning className="h-4 w-4" />
                Solicitar ajuste de ponto
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Condicoes da batida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2"><Wifi className="h-4 w-4" /> Conexao</span>
                <Badge variant={isOnline ? 'outline' : 'destructive'}>{isOnline ? 'Online' : 'Offline'}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Localizacao</span>
                <Badge variant={locationAvailable ? 'outline' : 'secondary'}>{locationAvailable ? 'Disponivel' : 'Indisponivel'}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2"><Camera className="h-4 w-4" /> Camera</span>
                <Badge variant={cameraAvailable ? 'outline' : 'secondary'}>{cameraAvailable ? 'Disponivel' : 'Nao liberada'}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Antifraude</span>
                <Badge variant="outline">Fingerprint ativo</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {lastReceipt && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-emerald-950">Comprovante de {lastReceipt.type.toLowerCase()} registrado</p>
                <p className="text-sm text-emerald-800">
                  {lastReceipt.at.toLocaleString('pt-BR')} · NSR {lastReceipt.nsr ?? '-'} · Registro {lastReceipt.recordId ?? '-'}
                </p>
                <p className="text-xs text-emerald-700">
                  Localizacao: {lastReceipt.location ?? 'nao capturada'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={copyReceipt} className="w-fit gap-2">
                <ClipboardCopy className="h-4 w-4" />
                Copiar comprovante
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className={isWorking ? 'border-emerald-300 bg-emerald-50/50' : ''}>
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center gap-6">
              <LiveClock />

              {/* Status atual */}
              {isWorking && (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-100 px-4 py-2 rounded-full">
                  <Timer className="w-4 h-4 animate-pulse" />
                  <span className="font-medium">Trabalhando há {elapsedTime}</span>
                </div>
              )}

              {/* Botão principal */}
              <Button
                size="lg"
                onClick={handleToggleClock}
                disabled={!canUseTimesheet || isPending || loadingOpen || sessionQuery.isLoading}
                className={`gap-3 px-8 py-6 text-lg font-semibold transition-all ${
                  isWorking
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isPending ? (
                  <Clock className="w-5 h-5 animate-spin" />
                ) : isWorking ? (
                  <LogOut className="w-5 h-5" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {isPending ? 'Registrando...' : isWorking ? 'Registrar Saída' : 'Registrar Entrada'}
              </Button>

              {openRecord && (
                <p className="text-sm text-muted-foreground">
                  Entrada registrada às {new Date(openRecord.clockIn).toLocaleTimeString('pt-BR')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumo do Mês */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{summary?.totalHours ?? 0}h</p>
                <p className="text-xs text-muted-foreground mt-1">Horas Trabalhadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-600">+{summary?.overtimeHours ?? 0}h</p>
                <p className="text-xs text-muted-foreground mt-1">Horas Extras</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-600">{summary?.delays ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Atrasos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{summary?.absences ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Faltas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registros do Mês */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Registros — {monthLabel}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setMonthOffset(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {monthOffset !== 0 && (
                  <Button size="sm" variant="outline" onClick={() => setMonthOffset(0)}>
                    Hoje
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setMonthOffset(p => p + 1)} disabled={monthOffset >= 0}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRecords ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Clock className="w-5 h-5 animate-spin mr-2" />
                Carregando registros...
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Nenhum registro de ponto neste mês</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Clique em "Registrar Entrada" para começar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Data</th>
                      <th className="text-left py-3 px-4 font-semibold">Entrada</th>
                      <th className="text-left py-3 px-4 font-semibold">Saída</th>
                      <th className="text-left py-3 px-4 font-semibold">Horas</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record: any) => {
                      const clockIn = new Date(record.clockIn);
                      const clockOut = record.clockOut ? new Date(record.clockOut) : null;
                      const hours = record.hoursWorked
                        ? Number(record.hoursWorked).toFixed(2)
                        : clockOut
                        ? ((clockOut.getTime() - clockIn.getTime()) / 3600000).toFixed(2)
                        : null;

                      return (
                        <tr key={record.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium">
                            {clockIn.toLocaleDateString('pt-BR', {
                              weekday: 'short', day: '2-digit', month: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-2">
                              <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                              {clockIn.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {clockOut ? (
                              <span className="flex items-center gap-2">
                                <LogOut className="w-3.5 h-3.5 text-red-500" />
                                {clockOut.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="flex items-center gap-2 text-amber-600">
                                <Timer className="w-3.5 h-3.5 animate-pulse" />
                                Em andamento
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {hours ? `${hours}h` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(record.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
