import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

type WebhookEvent =
  | "employee.created"
  | "employee.updated"
  | "employee.deleted"
  | "vacation.requested"
  | "vacation.approved"
  | "vacation.rejected"
  | "aso.expiring"
  | "pgr.expiring"
  | "pcmso.expiring"
  | "critical.alert";

export default function Integration() {
  const [cep, setCep] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState({ to: "", subject: "", html: "" });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvent, setWebhookEvent] = useState<WebhookEvent>("employee.created");

  const cepQuery = trpc.integrations.fetchAddressByCEP.useQuery(
    { cep },
    { enabled: false, retry: false }
  );
  const cnpjQuery = trpc.integrations.validateCNPJ.useQuery(
    { cnpj },
    { enabled: false, retry: false }
  );
  const sendEmailMutation = trpc.integrations.sendEmail.useMutation();
  const webhooksQuery = trpc.integrations.listWebhooks.useQuery();
  const registerWebhook = trpc.integrations.registerWebhook.useMutation({
    onSuccess: async () => {
      setWebhookUrl("");
      await webhooksQuery.refetch();
    },
  });
  const unregisterWebhook = trpc.integrations.unregisterWebhook.useMutation({
    onSuccess: async () => {
      await webhooksQuery.refetch();
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integração</h1>
          <p className="text-muted-foreground">Ferramentas reais ligadas aos endpoints de integração.</p>
        </div>

        <Tabs defaultValue="solides" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="solides">Sólides</TabsTrigger>
            <TabsTrigger value="flash">Flash Benefícios</TabsTrigger>
          </TabsList>

          <TabsContent value="solides">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" /> Integrações de Dados
                </CardTitle>
                <CardDescription>CEP e CNPJ usam o backend atual.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-4 rounded space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Busca de CEP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>Validação de CNPJ</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep">Buscar endereço por CEP</Label>
                  <div className="flex gap-2">
                    <Input id="cep" value={cep} onChange={(event) => setCep(event.target.value)} placeholder="01310-100" />
                    <Button onClick={() => cepQuery.refetch()} disabled={!cep || cepQuery.isFetching}>
                      Buscar
                    </Button>
                  </div>
                  {cepQuery.data ? (
                    <pre className="rounded bg-slate-950 p-3 text-xs text-slate-50 overflow-auto">
                      {JSON.stringify(cepQuery.data, null, 2)}
                    </pre>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">Validar CNPJ</Label>
                  <div className="flex gap-2">
                    <Input id="cnpj" value={cnpj} onChange={(event) => setCnpj(event.target.value)} placeholder="11.222.333/0001-81" />
                    <Button onClick={() => cnpjQuery.refetch()} disabled={!cnpj || cnpjQuery.isFetching}>
                      Validar
                    </Button>
                  </div>
                  {cnpjQuery.data ? (
                    <pre className="rounded bg-slate-950 p-3 text-xs text-slate-50 overflow-auto">
                      {JSON.stringify(cnpjQuery.data, null, 2)}
                    </pre>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flash">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" /> Comunicação e Webhooks
                </CardTitle>
                <CardDescription>Email e webhooks usam os routers atuais.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email-to">Enviar e-mail</Label>
                  <Input
                    id="email-to"
                    placeholder="destinatario@empresa.com"
                    value={email.to}
                    onChange={(event) => setEmail((current) => ({ ...current, to: event.target.value }))}
                  />
                  <Input
                    placeholder="Assunto"
                    value={email.subject}
                    onChange={(event) => setEmail((current) => ({ ...current, subject: event.target.value }))}
                  />
                  <Textarea
                    placeholder="Corpo em HTML simples"
                    value={email.html}
                    onChange={(event) => setEmail((current) => ({ ...current, html: event.target.value }))}
                  />
                  <Button
                    onClick={() => sendEmailMutation.mutate(email)}
                    disabled={sendEmailMutation.isPending || !email.to || !email.subject || !email.html}
                  >
                    Enviar E-mail
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Webhooks</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/webhook"
                      value={webhookUrl}
                      onChange={(event) => setWebhookUrl(event.target.value)}
                    />
                    <Select value={webhookEvent} onValueChange={(value: WebhookEvent) => setWebhookEvent(value)}>
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee.created">employee.created</SelectItem>
                        <SelectItem value="employee.updated">employee.updated</SelectItem>
                        <SelectItem value="employee.deleted">employee.deleted</SelectItem>
                        <SelectItem value="vacation.requested">vacation.requested</SelectItem>
                        <SelectItem value="vacation.approved">vacation.approved</SelectItem>
                        <SelectItem value="vacation.rejected">vacation.rejected</SelectItem>
                        <SelectItem value="aso.expiring">aso.expiring</SelectItem>
                        <SelectItem value="pgr.expiring">pgr.expiring</SelectItem>
                        <SelectItem value="pcmso.expiring">pcmso.expiring</SelectItem>
                        <SelectItem value="critical.alert">critical.alert</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => registerWebhook.mutate({ url: webhookUrl, event: webhookEvent })}
                      disabled={!webhookUrl || registerWebhook.isPending}
                    >
                      Registrar
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(webhooksQuery.data ?? []).map((webhook) => (
                      <div key={webhook.id} className="flex items-center justify-between rounded border p-3 text-sm">
                        <div>
                          <p className="font-medium">{webhook.url}</p>
                          <p className="text-muted-foreground">{webhook.event}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => unregisterWebhook.mutate({ id: webhook.id })}>
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Status da Integração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Sólides</span>
              <Badge variant="default">Conectado</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Flash Benefícios</span>
              <Badge variant="default">Conectado</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Webhooks registrados</span>
              <Badge variant="secondary">{webhooksQuery.data?.length ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
