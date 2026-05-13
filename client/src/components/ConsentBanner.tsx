import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const DISMISSED_KEY = "rh-prime:consent-banner-dismissed";

/**
 * Banner não-bloqueante de aviso LGPD. Aparece se o user logado ainda
 * não tem consent ativo de "data_processing". Pode ser dispensado
 * (sessionStorage) sem aceitar — o aceite vai pra /privacidade.
 */
export function ConsentBanner() {
  const me = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const consent = trpc.lgpd.hasActiveConsent.useQuery(
    { consentType: "data_processing" },
    { enabled: !!me.data, retry: false }
  );
  const utils = trpc.useUtils();
  const accept = trpc.lgpd.accept.useMutation({
    onSuccess: () => {
      toast.success("Consentimento registrado");
      utils.lgpd.hasActiveConsent.invalidate();
      utils.lgpd.myConsents.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  });

  if (!me.data) return null;
  if (consent.isLoading) return null;
  if (consent.data?.hasConsent) return null;
  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="border-amber-300 bg-amber-50/95 shadow-lg">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Tratamento de dados pessoais</p>
              <p className="text-xs text-amber-800 mt-1">
                Este sistema processa dados pessoais (LGPD). Você pode revisar bases legais e gerenciar
                consentimentos em <strong>Privacidade</strong>.
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  onClick={() =>
                    accept.mutate({
                      consentType: "data_processing",
                      legalBasis: "execucao_contrato",
                      version: "v1",
                    })
                  }
                  disabled={accept.isPending}
                >
                  Aceitar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    sessionStorage.setItem(DISMISSED_KEY, "1");
                    setDismissed(true);
                  }}
                >
                  Depois
                </Button>
              </div>
            </div>
            <button
              onClick={() => {
                sessionStorage.setItem(DISMISSED_KEY, "1");
                setDismissed(true);
              }}
              className="text-amber-700 hover:text-amber-900"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
