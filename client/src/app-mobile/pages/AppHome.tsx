import { useEffect } from "react";
import { Redirect, Link } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowRight, Clock3, MonitorSmartphone, Smartphone, UserRound } from "lucide-react";
import { collaboratorAppEnabled, journeyV2Enabled } from "../config";
import { useCollaboratorAppAccess } from "../hooks/useCollaboratorAppAccess";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { getJourneyReasonLabel, getTimesheetCompetence } from "../services/journey";
import { trackCollaboratorAppEvent } from "../services/telemetry";
import { MobileAppLayout } from "../components/MobileAppLayout";

export default function AppHome() {
  const { user } = useAuth();
  const appAccess = useCollaboratorAppAccess();
  const sessionQuery = trpc.auth.session.useQuery(undefined, { enabled: !!user?.id });
  const linkedEmployee = sessionQuery.data?.employee ?? null;
  const sessionSecurity = sessionQuery.data?.sessionSecurity ?? null;
  const { canInstall, isInstalled, promptInstall, deviceInfo } = useInstallPrompt();
  const journeyTodayStatusQuery = trpc.journeyV2.getTodayStatus.useQuery(undefined, {
    enabled: collaboratorAppEnabled && journeyV2Enabled && !!linkedEmployee?.id,
    retry: false,
    staleTime: 30000,
  });
  const selfieConsentQuery = trpc.lgpd.hasActiveConsent.useQuery(
    { consentType: "selfie_capture" },
    { enabled: !!linkedEmployee?.id, retry: false, staleTime: 30000 },
  );
  const geoConsentQuery = trpc.lgpd.hasActiveConsent.useQuery(
    { consentType: "geo_capture" },
    { enabled: !!linkedEmployee?.id, retry: false, staleTime: 30000 },
  );
  const canRegister = journeyTodayStatusQuery.data?.canRegisterPunch ?? false;
  const competence = getTimesheetCompetence();
  const shouldWarnInsecureTransport = Boolean(sessionSecurity && !sessionSecurity.secureTransport && !sessionSecurity.localhost);

  useEffect(() => {
    if (typeof window === "undefined" || !appAccess.isAvailable) return;
    const viewKey = "collaborator-app-home-viewed";
    if (window.sessionStorage.getItem(viewKey)) return;
    trackCollaboratorAppEvent("home_viewed", {
      installed: isInstalled,
      canInstall,
      isIOS: deviceInfo.isIOS,
      isAndroid: deviceInfo.isAndroid,
    });
    window.sessionStorage.setItem(viewKey, "1");
  }, [appAccess.isAvailable, canInstall, deviceInfo.isAndroid, deviceInfo.isIOS, isInstalled]);

  if (!collaboratorAppEnabled) {
    return <Redirect to="/ponto" />;
  }

  if (appAccess.isLoading) {
    return (
      <MobileAppLayout
        title="RH Prime"
        subtitle="Validando acesso ao app do colaborador."
      >
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          Validando se este usuario faz parte do piloto do app.
        </div>
      </MobileAppLayout>
    );
  }

  if (!appAccess.isAvailable) {
    return (
      <MobileAppLayout
        title="RH Prime"
        subtitle="Acesso controlado por piloto."
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
            Este login ainda nao esta liberado para o app do colaborador neste ambiente.
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
            Motivo tecnico: {appAccess.reason}
          </div>
          <Link href="/ponto">
            <Button className="h-12 w-full justify-between rounded-2xl bg-blue-500 text-white hover:bg-blue-400">
              Ir para o ponto atual
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout
      title="RH Prime"
      subtitle="Canal mobile do colaborador para jornada e ponto."
    >
      <div className="space-y-4">
        <Card className="border-slate-800 bg-slate-900 text-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4 text-blue-300" />
              Status do app
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span>Usuario autenticado</span>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                {user?.email ?? "ativo"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span>Journey V2</span>
              <Badge
                variant="outline"
                className={journeyV2Enabled
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"}
              >
                {journeyV2Enabled ? "habilitado" : "desligado"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span>Transporte da sessao</span>
              <Badge
                variant={shouldWarnInsecureTransport ? "destructive" : "outline"}
                className={shouldWarnInsecureTransport ? "" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}
              >
                {shouldWarnInsecureTransport ? "inseguro" : "seguro"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-slate-300" />
              Vinculo do colaborador
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessionQuery.isLoading ? (
              <p className="text-sm text-slate-400">Carregando vinculo...</p>
            ) : linkedEmployee ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Funcionario vinculado</p>
                <p className="mt-1 font-medium">{linkedEmployee.fullName}</p>
                <p className="mt-1 text-xs text-slate-500">ID #{linkedEmployee.id}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                Este login ainda nao esta vinculado a um funcionario. O app de ponto continuara bloqueado ate o vinculo ser ajustado.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-blue-300" />
              Elegibilidade de hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!linkedEmployee ? (
              <p className="text-sm text-slate-400">Defina primeiro o vinculo com funcionario.</p>
            ) : !journeyV2Enabled ? (
              <p className="text-sm text-slate-400">O Journey V2 precisa estar habilitado para o app seguir como canal oficial.</p>
            ) : journeyTodayStatusQuery.isLoading ? (
              <p className="text-sm text-slate-400">Validando elegibilidade...</p>
            ) : journeyTodayStatusQuery.error ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                Nao foi possivel consultar o status de elegibilidade neste ambiente.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div>
                    <p className="text-sm text-slate-400">Situacao</p>
                    <p className="mt-1 font-medium">{canRegister ? "Apto para registrar" : "Bloqueado por regra"}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={canRegister
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"}
                  >
                    {journeyTodayStatusQuery.data?.referenceDate ?? "hoje"}
                  </Badge>
                </div>
                <p className="text-sm text-slate-300">
                  {getJourneyReasonLabel(journeyTodayStatusQuery.data?.reasonCode)}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-amber-300" />
              Competencia do ponto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">janela atual</p>
              <p className="mt-2 font-medium">{competence.shortLabel}</p>
              <p className="mt-1 text-xs text-slate-400">{competence.fullLabel}</p>
            </div>
            <p className="text-xs text-slate-400">
              O fechamento operacional do ponto segue a competencia de 26 a 25, nao o mes civil.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-300" />
              Evidencias e consentimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span>Geolocalizacao</span>
              <Badge variant={geoConsentQuery.data?.hasConsent ? "outline" : "secondary"}>
                {geoConsentQuery.data?.hasConsent ? "permitida" : "pendente"}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <span>Selfie</span>
              <Badge variant={selfieConsentQuery.data?.hasConsent ? "outline" : "secondary"}>
                {selfieConsentQuery.data?.hasConsent ? "permitida" : "pendente"}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              O app so deve capturar evidencias quando os consentimentos correspondentes estiverem ativos.
            </p>
            {(!geoConsentQuery.data?.hasConsent || !selfieConsentQuery.data?.hasConsent) ? (
              <Link href="/privacidade">
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-2xl border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
                >
                  Revisar consentimentos em Privacidade
                </Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Link href="/app/ponto">
          <Button className="h-12 w-full justify-between rounded-2xl bg-blue-500 text-white hover:bg-blue-400">
            Ir para o ponto mobile
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>

        <Card className="border-slate-800 bg-slate-900 text-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4 text-blue-300" />
              Instalacao do app
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            {isInstalled ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-200">
                O app ja esta instalado neste dispositivo.
              </div>
            ) : canInstall ? (
              <>
                <p>Voce ja pode instalar o app do colaborador para abrir o ponto direto da tela inicial.</p>
                <Button
                  className="h-11 w-full rounded-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  onClick={() => {
                    trackCollaboratorAppEvent("install_prompt_clicked");
                    void promptInstall();
                  }}
                >
                  Instalar app agora
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-slate-400">
                  {deviceInfo.isIOS
                    ? "No iPhone/iPad, a instalacao e manual pelo Safari. Veja os passos logo abaixo."
                    : "Quando o navegador liberar a instalacao, o botao aparecera aqui. Em alguns dispositivos, isso so acontece depois de navegar pelo app por alguns segundos."}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/30 px-4">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="android" className="border-slate-800">
                      <AccordionTrigger className="py-3 text-slate-100 hover:no-underline">
                        <span className="flex items-center gap-2">
                          <Smartphone className="mt-0.5 h-4 w-4 text-emerald-300" />
                          Instalar no Android
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-slate-300">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                          <p className="font-medium text-slate-100">Chrome Android</p>
                          <ol className="mt-2 space-y-2 text-sm text-slate-400">
                            <li>1. Abra o RH Prime no Chrome.</li>
                            <li>2. Faca login e entre em <span className="font-mono text-slate-300">/app</span>.</li>
                            <li>3. Toque em <span className="text-slate-300">Instalar app agora</span> quando o botao aparecer.</li>
                            <li>4. Se o botao nao aparecer, abra o menu do Chrome e use <span className="text-slate-300">Adicionar a tela inicial</span> ou <span className="text-slate-300">Instalar app</span>.</li>
                            <li>5. Abra o app pelo novo icone criado na tela inicial.</li>
                          </ol>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="ios" className="border-slate-800">
                      <AccordionTrigger className="py-3 text-slate-100 hover:no-underline">
                        <span className="flex items-center gap-2">
                          <MonitorSmartphone className="mt-0.5 h-4 w-4 text-blue-300" />
                          Instalar no iPhone ou iPad
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-slate-300">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                          <p className="font-medium text-slate-100">Safari iPhone/iPad</p>
                          <ol className="mt-2 space-y-2 text-sm text-slate-400">
                            <li>1. Abra o RH Prime no Safari.</li>
                            <li>2. Faca login e entre em <span className="font-mono text-slate-300">/app</span>.</li>
                            <li>3. Toque no botao <span className="text-slate-300">Compartilhar</span> do Safari.</li>
                            <li>4. Escolha <span className="text-slate-300">Adicionar a Tela de Inicio</span>.</li>
                            <li>5. Confirme o nome do app e finalize.</li>
                            <li>6. Abra o RH Prime pelo novo icone criado na tela inicial.</li>
                          </ol>
                        </div>
                        {deviceInfo.isIOS && !deviceInfo.isSafari ? (
                          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
                            Neste dispositivo Apple, use o Safari para instalar corretamente o app.
                          </div>
                        ) : null}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-slate-500" />
            <p>
              Esta e a base do app do colaborador. Nesta primeira onda, o foco e separar a experiencia mobile do backoffice e reaproveitar vinculo e elegibilidade reais do Journey V2.
            </p>
          </div>
        </div>
      </div>
    </MobileAppLayout>
  );
}
