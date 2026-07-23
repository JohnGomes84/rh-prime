import { useEffect, useMemo, useState } from "react";
import { Redirect, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  FileClock,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Receipt,
  ShieldCheck,
  Timer,
  Wifi,
} from "lucide-react";
import { collaboratorAppEnabled, journeyV2Enabled } from "../config";
import { useCollaboratorAppAccess } from "../hooks/useCollaboratorAppAccess";
import { getJourneyReasonLabel, getTimesheetCompetence } from "../services/journey";
import { trackCollaboratorAppEvent } from "../services/telemetry";
import { MobileAppLayout } from "../components/MobileAppLayout";

type ReceiptPayload = {
  type?: string;
  eventType?: string;
  at?: string | Date;
  occurredAt?: string;
  nsr?: string | number;
  recordId?: string | number;
  eventId?: string | number;
  location?: string;
  status?: string;
};

type AdjustmentRequestType =
  | "missing_clock_in"
  | "missing_break_start"
  | "missing_break_end"
  | "missing_clock_out"
  | "wrong_context"
  | "manual_correction";

function getJourneyEventLabel(eventType?: string) {
  switch (eventType) {
    case "clock_in":
      return "Entrada";
    case "break_start":
      return "Inicio do intervalo";
    case "break_end":
      return "Retorno do intervalo";
    case "clock_out":
      return "Saida";
    default:
      return eventType ?? "Evento";
  }
}

function getAdjustmentTypeLabel(requestType?: string) {
  switch (requestType) {
    case "missing_clock_in":
      return "Falta entrada";
    case "missing_break_start":
      return "Falta inicio de intervalo";
    case "missing_break_end":
      return "Falta retorno de intervalo";
    case "missing_clock_out":
      return "Falta saida";
    case "wrong_context":
      return "Contexto incorreto";
    case "manual_correction":
      return "Correcao manual";
    default:
      return requestType ?? "Solicitacao";
  }
}

function getAdjustmentStatusBadge(status?: string) {
  switch (status) {
    case "approved":
      return <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">aprovado</Badge>;
    case "under_review":
      return <Badge className="bg-blue-500/15 text-blue-300 hover:bg-blue-500/15">em analise</Badge>;
    case "rejected":
      return <Badge className="bg-red-500/15 text-red-300 hover:bg-red-500/15">rejeitado</Badge>;
    case "cancelled":
      return <Badge className="bg-slate-700 text-slate-200 hover:bg-slate-700">cancelado</Badge>;
    case "open":
    default:
      return <Badge className="bg-amber-500/15 text-amber-200 hover:bg-amber-500/15">aberto</Badge>;
  }
}

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center">
      <p className="text-4xl font-bold tabular-nums tracking-tight">
        {time.toLocaleTimeString("pt-BR")}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        {time.toLocaleDateString("pt-BR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>
  );
}

export default function AppTimesheetHome() {
  const { user } = useAuth();
  const appAccess = useCollaboratorAppAccess();
  const utils = trpc.useUtils();
  const sessionQuery = trpc.auth.session.useQuery(undefined, { enabled: !!user?.id });
  const linkedEmployee = sessionQuery.data?.employee ?? null;
  const sessionSecurity = sessionQuery.data?.sessionSecurity ?? null;
  const canUseTimesheet = Boolean(linkedEmployee?.id);
  const [lastLocation, setLastLocation] = useState<string | undefined>();
  const [lastReceipt, setLastReceipt] = useState<ReceiptPayload | null>(null);
  const [elapsedTime, setElapsedTime] = useState("");
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [cameraAvailable, setCameraAvailable] = useState(
    () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
  );
  const locationAvailable = typeof navigator !== "undefined" && "geolocation" in navigator;
  const todayRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);
  const todayReferenceDate = useMemo(() => {
    const year = todayRange.start.getFullYear();
    const month = String(todayRange.start.getMonth() + 1).padStart(2, "0");
    const day = String(todayRange.start.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [todayRange]);
  const [adjustmentForm, setAdjustmentForm] = useState<{
    requestType: AdjustmentRequestType;
    occurredAt: string;
    justification: string;
  }>({
    requestType: "missing_clock_in",
    occurredAt: "",
    justification: "",
  });

  const openRecordQuery = trpc.timesheet.getOpenRecord.useQuery(undefined, {
    enabled: canUseTimesheet,
    refetchInterval: 30000,
  });
  const journeyTodayStatusQuery = trpc.journeyV2.getTodayStatus.useQuery(undefined, {
    enabled: collaboratorAppEnabled && journeyV2Enabled && canUseTimesheet,
    retry: false,
    staleTime: 30000,
  });
  const journeyDayTimelineQuery = trpc.journeyV2.getDayTimeline.useQuery(
    { referenceDate: todayReferenceDate },
    {
      enabled: collaboratorAppEnabled && journeyV2Enabled && canUseTimesheet,
      retry: false,
      staleTime: 30000,
    },
  );
  const journeyPunchEventsQuery = trpc.journeyV2.listPunchEvents.useQuery(
    {
      startDate: todayRange.start,
      endDate: todayRange.end,
    },
    {
      enabled: collaboratorAppEnabled && journeyV2Enabled && canUseTimesheet,
      retry: false,
      staleTime: 30000,
    },
  );
  const latestJourneyReceiptQuery = trpc.journeyV2.getLatestReceipt.useQuery(undefined, {
    enabled: collaboratorAppEnabled && journeyV2Enabled && canUseTimesheet,
    retry: false,
    staleTime: 30000,
  });
  const selfieConsentQuery = trpc.lgpd.hasActiveConsent.useQuery(
    { consentType: "selfie_capture" },
    { enabled: canUseTimesheet, retry: false, staleTime: 30000 },
  );
  const geoConsentQuery = trpc.lgpd.hasActiveConsent.useQuery(
    { consentType: "geo_capture" },
    { enabled: canUseTimesheet, retry: false, staleTime: 30000 },
  );
  const adjustmentRequestsQuery = trpc.journeyV2.listAdjustmentRequests.useQuery(
    { scope: "mine" },
    {
      enabled: collaboratorAppEnabled && journeyV2Enabled && canUseTimesheet,
      retry: false,
      staleTime: 30000,
    },
  );
  const uploadSelfieMutation = trpc.timesheet.uploadSelfie.useMutation();
  const clockInMutation = trpc.timesheet.clockIn.useMutation({
    onSuccess: (data, variables) => {
      trackCollaboratorAppEvent("clock_in_success", {
        hasLocation: Boolean(variables?.location),
        hasSelfie: Boolean(variables?.selfieUrl),
      });
      setLastReceipt({
        type: "Entrada",
        at: new Date(),
        nsr: (data as any)?.nsr,
        recordId: (data as any)?.id,
        location: variables?.location,
        status: "PENDING",
      });
      toast.success("Entrada registrada com sucesso.");
      void invalidatePointState();
    },
    onError: (error) => toast.error(error.message || "Falha ao registrar entrada."),
  });
  const clockOutMutation = trpc.timesheet.clockOut.useMutation({
    onSuccess: (data, variables) => {
      trackCollaboratorAppEvent("clock_out_success", {
        hasLocation: Boolean(variables?.notes),
      });
      setLastReceipt({
        type: "Saida",
        at: new Date(),
        nsr: (openRecordQuery.data as any)?.nsr,
        recordId: (openRecordQuery.data as any)?.id,
        location: variables?.notes?.replace("[saida] ", ""),
        status: (data as any)?.status ?? "APPROVED",
      });
      toast.success("Saida registrada com sucesso.");
      void invalidatePointState();
    },
    onError: (error) => toast.error(error.message || "Falha ao registrar saida."),
  });
  const registerJourneyPunchMutation = trpc.journeyV2.registerPunchEvent.useMutation({
    onSuccess: (_, variables) => {
      trackCollaboratorAppEvent("journey_event_success", {
        eventType: variables.eventType,
      });
      toast.success(
        variables.eventType === "break_start"
          ? "Intervalo iniciado."
          : "Retorno do intervalo registrado.",
      );
      void invalidatePointState();
    },
    onError: (error) => toast.error(error.message || "Falha ao registrar evento de jornada."),
  });
  const createJourneyAdjustmentMutation = trpc.journeyV2.createAdjustmentRequest.useMutation({
    onSuccess: () => {
      trackCollaboratorAppEvent("adjustment_request_created", {
        requestType: adjustmentForm.requestType,
      });
      toast.success("Solicitacao de ajuste enviada.");
      setAdjustmentForm((current) => ({
        ...current,
        occurredAt: "",
        justification: "",
      }));
      void utils.journeyV2.listAdjustmentRequests.invalidate();
    },
    onError: (error) => toast.error(error.message || "Falha ao enviar solicitacao de ajuste."),
  });

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  const competence = useMemo(() => getTimesheetCompetence(), []);
  const openAdjustmentsCount = useMemo(
    () => adjustmentRequestsQuery.data?.filter((request: any) => request.status === "open" || request.status === "under_review").length ?? 0,
    [adjustmentRequestsQuery.data],
  );
  const timelineSummary = useMemo(() => {
    const firstClockInAt = journeyDayTimelineQuery.data?.firstClockInAt;
    const lastClockOutAt = journeyDayTimelineQuery.data?.lastClockOutAt;
    return {
      firstClockInAt: firstClockInAt
        ? new Date(firstClockInAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "--:--",
      lastClockOutAt: lastClockOutAt
        ? new Date(lastClockOutAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
        : "--:--",
    };
  }, [journeyDayTimelineQuery.data]);

  if (!collaboratorAppEnabled) {
    return <Redirect to="/ponto" />;
  }

  if (appAccess.isLoading) {
    return (
      <MobileAppLayout
        title="Ponto"
        subtitle="Validando acesso ao app do colaborador."
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          Validando se este usuário faz parte do piloto do app.
        </div>
      </MobileAppLayout>
    );
  }

  if (!appAccess.isAvailable) {
    return <Redirect to="/ponto" />;
  }

  const openRecord = openRecordQuery.data as any;
  const journeyTodayStatus = journeyTodayStatusQuery.data;
  const canRegister = journeyTodayStatus?.canRegisterPunch ?? false;
  const openSession = journeyDayTimelineQuery.data?.openSession;
  const currentBreak = openSession?.currentBreak;
  const activeReceipt = (latestJourneyReceiptQuery.data?.payloadJson as ReceiptPayload | null) ?? lastReceipt;
  const isWorking = Boolean(openRecord);
  const isPending =
    clockInMutation.isPending
    || clockOutMutation.isPending
    || uploadSelfieMutation.isPending
    || registerJourneyPunchMutation.isPending;
  const nextActionLabel = currentBreak
    ? "Voltar do intervalo"
    : isWorking
      ? "Registrar saida"
      : "Registrar entrada";

  const canUseMainAction = canUseTimesheet
    && !sessionQuery.isLoading
    && !isPending
    && !currentBreak
    && (isWorking || !journeyV2Enabled || canRegister);
  const hasSelfieConsent = selfieConsentQuery.data?.hasConsent ?? false;
  const hasGeoConsent = geoConsentQuery.data?.hasConsent ?? false;
  const shouldWarnInsecureTransport = Boolean(sessionSecurity && !sessionSecurity.secureTransport && !sessionSecurity.localhost);
  useEffect(() => {
    if (!openRecord?.clockIn) {
      setElapsedTime("");
      return;
    }
    const timer = setInterval(() => {
      const start = new Date(openRecord.clockIn).getTime();
      const diff = Date.now() - start;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsedTime(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [openRecord?.clockIn]);

  async function invalidatePointState() {
    await Promise.all([
      utils.timesheet.getOpenRecord.invalidate(),
      utils.journeyV2.getTodayStatus.invalidate(),
      utils.journeyV2.listPunchEvents.invalidate(),
      utils.journeyV2.getDayTimeline.invalidate(),
      utils.journeyV2.getLatestReceipt.invalidate(),
      utils.journeyV2.listAdjustmentRequests.invalidate(),
    ]);
  }

  const captureLocation = (): Promise<string | undefined> =>
    new Promise((resolve) => {
      if (!hasGeoConsent) return resolve(undefined);
      if (!("geolocation" in navigator)) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const acc = Math.round(pos.coords.accuracy);
          resolve(`${lat},${lng} (+/-${acc}m)`);
        },
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 },
      );
    });

  const captureSelfie = (): Promise<string | undefined> =>
    new Promise((resolve) => {
      if (!hasSelfieConsent) return resolve(undefined);
      if (!("mediaDevices" in navigator)) return resolve(undefined);
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user", width: 320, height: 240 }, audio: false })
        .then((stream) => {
          const video = document.createElement("video");
          video.srcObject = stream;
          void video.play().catch(() => undefined);
          setTimeout(() => {
            const canvas = document.createElement("canvas");
            canvas.width = 320;
            canvas.height = 240;
            const context = canvas.getContext("2d");
            if (context) context.drawImage(video, 0, 0, 320, 240);
            stream.getTracks().forEach((track) => track.stop());
            resolve(canvas.toDataURL("image/jpeg", 0.6));
          }, 600);
        })
        .catch(() => {
          setCameraAvailable(false);
          resolve(undefined);
        });
    });

  const fingerprint = () => {
    const ua = navigator.userAgent;
    const lang = navigator.language;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const raw = [ua, lang, timezone, screen].join("|");
    let hash = 0;
    for (let index = 0; index < raw.length; index++) {
      hash = ((hash << 5) - hash + raw.charCodeAt(index)) | 0;
    }
    return `dfp_${Math.abs(hash).toString(36)}`;
  };

  const handleToggleClock = async () => {
    if (!canUseTimesheet) {
      toast.error("Seu usuario ainda nao esta vinculado a um funcionario.");
      return;
    }
    if (currentBreak) {
      toast.error("Volte do intervalo antes de registrar a saida.");
      return;
    }

    if (shouldWarnInsecureTransport) {
      toast.error("O app precisa de conexao segura para registrar ponto com evidencias.");
      return;
    }

    const [location, selfieDataUrl] = await Promise.all([captureLocation(), captureSelfie()]);
    setLastLocation(location);

    if (isWorking) {
      clockOutMutation.mutate({
        notes: location ? `[saida] ${location}` : undefined,
      });
      return;
    }

    let selfieUrl: string | undefined;
    if (selfieDataUrl) {
      try {
        const uploaded = await uploadSelfieMutation.mutateAsync({
          imageBase64: selfieDataUrl,
          contentType: selfieDataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg",
        });
        selfieUrl = uploaded.url;
      } catch {
        toast.warning("Selfie nao foi enviada. A batida sera registrada sem foto.");
      }
    }

    clockInMutation.mutate({
      location,
      selfieUrl,
      deviceFingerprint: fingerprint(),
    });
  };

  const handleBreakEvent = async (eventType: "break_start" | "break_end") => {
    const location = await captureLocation();
    setLastLocation(location);

    if (shouldWarnInsecureTransport) {
      toast.error("O app precisa de conexao segura para registrar ponto com evidencias.");
      return;
    }

    registerJourneyPunchMutation.mutate({
      eventType,
      location,
      deviceFingerprint: fingerprint(),
    });
  };

  const handleCreateAdjustment = () => {
    if (!adjustmentForm.occurredAt) {
      toast.error("Informe a data e hora do ajuste.");
      return;
    }

    createJourneyAdjustmentMutation.mutate({
      referenceDate: adjustmentForm.occurredAt.slice(0, 10),
      requestType: adjustmentForm.requestType,
      justification: adjustmentForm.justification || undefined,
      requestedPayloadJson: adjustmentForm.requestType === "manual_correction"
        ? {
            eventType: "clock_in",
            occurredAt: new Date(adjustmentForm.occurredAt).toISOString(),
          }
        : {
            occurredAt: new Date(adjustmentForm.occurredAt).toISOString(),
          },
    });
  };

  useEffect(() => {
    if (!appAccess.isAvailable || typeof window === "undefined") return;
    const viewKey = "collaborator-app-timesheet-viewed";
    if (window.sessionStorage.getItem(viewKey)) return;
    trackCollaboratorAppEvent("timesheet_viewed", {
      canUseTimesheet,
      journeyV2Enabled,
    });
    window.sessionStorage.setItem(viewKey, "1");
  }, [appAccess.isAvailable, canUseTimesheet]);

  return (
    <MobileAppLayout
      title="Meu ponto"
      subtitle={linkedEmployee?.fullName ? `Olá, ${linkedEmployee.fullName.split(" ")[0]}` : "Registre sua jornada"}
    >
      <div className="space-y-4">
        <Card className="border-slate-800 bg-slate-900 text-slate-50">
          <CardContent className="space-y-5 pt-6">
            <LiveClock />

            <p className="text-center text-sm text-slate-400">
              {currentBreak
                ? "Em intervalo"
                : isWorking
                  ? `Trabalhando há ${elapsedTime || "00:00:00"}`
                  : "Você está fora de expediente"}
            </p>

            <Button
              size="lg"
              onClick={() => void handleToggleClock()}
              disabled={!canUseMainAction}
              className={`h-16 w-full rounded-3xl text-base font-semibold ${
                isWorking
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Registrando...
                </>
              ) : isWorking ? (
                <>
                  <LogOut className="mr-2 h-5 w-5" />
                  Registrar saida
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Registrar entrada
                </>
              )}
            </Button>

            {journeyV2Enabled && canUseTimesheet && openSession ? (
              <Button
                variant={currentBreak ? "default" : "outline"}
                onClick={() => void handleBreakEvent(currentBreak ? "break_end" : "break_start")}
                disabled={registerJourneyPunchMutation.isPending}
                className={`h-12 w-full rounded-2xl ${
                  currentBreak
                    ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                    : "border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                }`}
              >
                {currentBreak ? "Voltar do intervalo" : "Iniciar intervalo"}
              </Button>
            ) : null}

            {!canUseTimesheet ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                Seu usuário ainda não está vinculado a um funcionário. Fale com o RH para liberar o ponto.
              </div>
            ) : shouldWarnInsecureTransport ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                Conexão insegura. Abra o app por HTTPS para registrar o ponto.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4 text-blue-300" />
              Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">entrada</p>
              <p className="mt-2 text-lg font-semibold tabular-nums">{timelineSummary.firstClockInAt}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">saída</p>
              <p className="mt-2 text-lg font-semibold tabular-nums">{timelineSummary.lastClockOutAt}</p>
            </div>
          </CardContent>
        </Card>

        {journeyV2Enabled ? (
          <Card className="border-slate-800 bg-slate-900 text-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-sky-300" />
                Timeline de hoje
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {journeyPunchEventsQuery.isLoading ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-slate-400">
                  Carregando eventos...
                </div>
              ) : journeyPunchEventsQuery.error ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
                  Nao foi possivel carregar a timeline V2 neste ambiente.
                </div>
              ) : (journeyPunchEventsQuery.data?.length ?? 0) === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-slate-400">
                  Nenhum evento registrado hoje.
                </div>
              ) : (
                <div className="space-y-2">
                  {journeyPunchEventsQuery.data?.map((event: any) => (
                    <div
                      key={event.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{getJourneyEventLabel(event.eventType)}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(event.occurredAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-300">
                          {event.source ?? "web"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {canUseTimesheet && (!hasGeoConsent || !hasSelfieConsent) ? (
          <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200">
            <p>Para registrar o ponto com selfie e localização, ative os consentimentos em Privacidade.</p>
            <Link href="/privacidade">
              <Button
                variant="outline"
                className="h-10 w-full rounded-2xl border-amber-400/30 bg-transparent text-amber-100 hover:bg-amber-500/10"
              >
                Abrir Privacidade
              </Button>
            </Link>
          </div>
        ) : null}

        {journeyV2Enabled && canUseTimesheet ? (
          <Card className="border-slate-800 bg-slate-900 text-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileClock className="h-4 w-4 text-amber-300" />
                Solicitar ajuste
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo</Label>
                <Select
                  value={adjustmentForm.requestType}
                  onValueChange={(value) =>
                    setAdjustmentForm((current) => ({
                      ...current,
                      requestType: value as AdjustmentRequestType,
                    }))
                  }
                >
                  <SelectTrigger className="w-full rounded-xl border-slate-700 bg-slate-950 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="missing_clock_in">Falta entrada</SelectItem>
                    <SelectItem value="missing_break_start">Falta inicio de intervalo</SelectItem>
                    <SelectItem value="missing_break_end">Falta retorno de intervalo</SelectItem>
                    <SelectItem value="missing_clock_out">Falta saida</SelectItem>
                    <SelectItem value="wrong_context">Contexto incorreto</SelectItem>
                    <SelectItem value="manual_correction">Correcao manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Data e hora</Label>
                <Input
                  type="datetime-local"
                  value={adjustmentForm.occurredAt}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({ ...current, occurredAt: event.target.value }))
                  }
                  className="rounded-xl border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Justificativa</Label>
                <Textarea
                  value={adjustmentForm.justification}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({ ...current, justification: event.target.value }))
                  }
                  placeholder="Descreva o motivo do ajuste."
                  className="min-h-24 rounded-xl border-slate-700 bg-slate-950 text-slate-100"
                />
              </div>

              <Button
                onClick={handleCreateAdjustment}
                disabled={createJourneyAdjustmentMutation.isPending}
                className="h-12 w-full rounded-2xl bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                {createJourneyAdjustmentMutation.isPending ? "Enviando..." : "Abrir solicitacao"}
              </Button>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-200">Solicitacoes recentes</p>
                {adjustmentRequestsQuery.isLoading ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-slate-400">
                    Carregando solicitacoes...
                  </div>
                ) : (adjustmentRequestsQuery.data?.length ?? 0) === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-slate-400">
                    Nenhuma solicitacao enviada.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {adjustmentRequestsQuery.data?.slice(0, 4).map((request: any) => (
                      <div
                        key={request.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{getAdjustmentTypeLabel(request.requestType)}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {request.referenceDate} · {request.justification || "Sem justificativa"}
                            </p>
                          </div>
                          {getAdjustmentStatusBadge(request.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeReceipt ? (
          <Card className="border-emerald-500/20 bg-emerald-500/10 text-slate-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-emerald-200">
                <Receipt className="h-4 w-4" />
                Ultimo comprovante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/30 p-4">
                <p className="font-medium">
                  {(activeReceipt.type ?? activeReceipt.eventType ?? "evento").toString()}
                </p>
                <p className="mt-1 text-emerald-100">
                  {activeReceipt.at || activeReceipt.occurredAt
                    ? new Date(activeReceipt.at ?? activeReceipt.occurredAt ?? "").toLocaleString("pt-BR")
                    : "--"}
                </p>
                <p className="mt-2 text-xs text-emerald-200/80">
                  NSR {activeReceipt.nsr ?? "--"} · registro {activeReceipt.recordId ?? activeReceipt.eventId ?? "--"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <p className="pt-2 text-center text-[11px] text-slate-600">RH Prime · ML Serviços</p>
      </div>
    </MobileAppLayout>
  );
}
