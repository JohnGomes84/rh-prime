import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const CONSENT_LABEL: Record<string, { label: string; description: string }> = {
  data_processing: {
    label: "Processamento de dados pessoais",
    description: "Cadastro, folha, ponto, documentos, comunicações operacionais.",
  },
  selfie_capture: {
    label: "Captura de selfie",
    description: "Foto durante registro de ponto para anti-fraude. Opt-in.",
  },
  geo_capture: {
    label: "Geolocalização",
    description: "Coordenadas no clockIn/Out para validação de cerca virtual. Opt-in.",
  },
  marketing_communications: {
    label: "Comunicações de marketing",
    description: "Newsletter, divulgação de eventos internos. Opt-in.",
  },
  internal_policies: {
    label: "Políticas internas",
    description: "Aceite de regulamento interno e código de conduta.",
  },
  biometric: {
    label: "Dados biométricos",
    description: "Reconhecimento facial e leitura digital. Opt-in.",
  },
  third_party_share: {
    label: "Compartilhamento com terceiros",
    description: "Integração com folha externa, plano de saúde, parceiros.",
  },
};

const LEGAL_BASIS_LABEL: Record<string, string> = {
  consentimento: "Consentimento",
  execucao_contrato: "Execução de contrato",
  obrigacao_legal: "Obrigação legal",
  interesse_legitimo: "Interesse legítimo",
  protecao_credito: "Proteção ao crédito",
  tutela_saude: "Tutela da saúde",
};

export default function Privacy() {
  const utils = trpc.useUtils();
  const consents = trpc.lgpd.myConsents.useQuery();

  const accept = trpc.lgpd.accept.useMutation({
    onSuccess: () => {
      toast.success("Consentimento aceito");
      utils.lgpd.myConsents.invalidate();
      utils.lgpd.hasActiveConsent.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const revoke = trpc.lgpd.revoke.useMutation({
    onSuccess: () => {
      toast.success("Consentimento revogado");
      utils.lgpd.myConsents.invalidate();
      utils.lgpd.hasActiveConsent.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const records = (consents.data as any[]) ?? [];

  // Map by consent_type para encontrar mais recente ativo
  const activeMap: Record<string, any> = {};
  for (const r of records) {
    if (!activeMap[r.consentType] && !r.revokedAt) {
      activeMap[r.consentType] = r;
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" /> Privacidade e LGPD
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus consentimentos e visualize o histórico de aceites e revogações.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipos de tratamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(CONSENT_LABEL).map(([key, info]) => {
              const active = activeMap[key];
              const isAccepted = active?.accepted;
              return (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 pb-3 border-b last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{info.label}</span>
                      {isAccepted ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Aceito
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <XCircle className="h-3 w-3 mr-1" /> Não aceito
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                    {active && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Base legal: {LEGAL_BASIS_LABEL[active.legalBasis] ?? active.legalBasis} ·
                        Versão {active.version} ·
                        {active.acceptedAt && ` Aceito em ${new Date(active.acceptedAt).toLocaleDateString("pt-BR")}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!isAccepted ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          accept.mutate({
                            consentType: key as any,
                            legalBasis: key === "data_processing" || key === "internal_policies"
                              ? "execucao_contrato"
                              : "consentimento",
                            version: "v1",
                          })
                        }
                        disabled={accept.isPending}
                      >
                        Aceitar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revoke.mutate({ consentType: key as any })}
                        disabled={revoke.isPending}
                      >
                        Revogar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            {consents.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : records.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro ainda.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {records.map((r: any) => (
                  <li key={r.id} className="flex justify-between border-l-2 border-primary/30 pl-3 py-1">
                    <div>
                      <span className="font-medium">{CONSENT_LABEL[r.consentType]?.label ?? r.consentType}</span>
                      {" — "}
                      <span className={r.accepted ? "text-emerald-600" : "text-red-600"}>
                        {r.accepted ? "Aceito" : "Revogado"}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        v{r.version} · {LEGAL_BASIS_LABEL[r.legalBasis] ?? r.legalBasis}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {r.revokedAt
                        ? `Revogado em ${new Date(r.revokedAt).toLocaleString("pt-BR")}`
                        : r.acceptedAt
                        ? `Aceito em ${new Date(r.acceptedAt).toLocaleString("pt-BR")}`
                        : new Date(r.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
