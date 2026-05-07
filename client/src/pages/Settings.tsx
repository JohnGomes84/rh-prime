import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, Settings as SettingsIcon, Building2, Mail, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SettingMap = Record<string, string>;

export default function Settings() {
  const { theme, toggleTheme, switchable } = useTheme();
  const { data: settings, isLoading } = trpc.settings.list.useQuery();
  const utils = trpc.useUtils();
  const upsertSetting = trpc.settings.upsert.useMutation({
    onSuccess: () => {
      utils.settings.list.invalidate();
    },
  });

  const settingsMap = useMemo<SettingMap>(() => {
    return (settings ?? []).reduce<SettingMap>((acc, item: any) => {
      acc[item.key] = item.value ?? "";
      return acc;
    }, {});
  }, [settings]);

  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    setCompanyName(settingsMap["company.name"] ?? "");
    setCnpj(settingsMap["company.cnpj"] ?? "");
    setAddress(settingsMap["company.address"] ?? "");
    setPhone(settingsMap["company.phone"] ?? "");
    setEmail(settingsMap["company.email"] ?? "");
    setNotificationEmail(settingsMap["notifications.email"] ?? "");
    setNotificationsEnabled((settingsMap["notifications.enabled"] ?? "true") === "true");
  }, [settingsMap]);

  const saveSettings = async (entries: Array<{ key: string; value: string; description: string }>) => {
    try {
      for (const entry of entries) {
        await upsertSetting.mutateAsync(entry);
      }
      toast.success("Configuracoes salvas com sucesso.");
    } catch (error: any) {
      toast.error(error.message ?? "Falha ao salvar configuracoes.");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuracoes</h1>
          <p className="text-muted-foreground">Gerencie as configuracoes gerais do sistema RH Prime.</p>
        </div>

        <Tabs defaultValue="company" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Empresa
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notificacoes
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Sun className="h-4 w-4" /> Aparencia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" /> Dados da Empresa
                </CardTitle>
                <CardDescription>Informacoes gerais da empresa armazenadas no servidor.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nome da Empresa</Label>
                    <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
                  </div>
                  <div>
                    <Label>CNPJ</Label>
                    <Input value={cnpj} onChange={(event) => setCnpj(event.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Endereco</Label>
                  <Input value={address} onChange={(event) => setAddress(event.target.value)} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Telefone</Label>
                    <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
                  </div>
                </div>
                <Button
                  disabled={upsertSetting.isPending}
                  onClick={() => saveSettings([
                    { key: "company.name", value: companyName, description: "Nome da empresa" },
                    { key: "company.cnpj", value: cnpj, description: "CNPJ" },
                    { key: "company.address", value: address, description: "Endereco" },
                    { key: "company.phone", value: phone, description: "Telefone" },
                    { key: "company.email", value: email, description: "Email principal" },
                  ])}
                >
                  {upsertSetting.isPending ? "Salvando..." : "Salvar Alteracoes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-5 w-5" /> Notificacoes por Email
                </CardTitle>
                <CardDescription>Alertas persistidos em configuracoes do sistema.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email para Notificacoes</Label>
                  <Input
                    value={notificationEmail}
                    onChange={(event) => setNotificationEmail(event.target.value)}
                    type="email"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded">
                  <input
                    type="checkbox"
                    id="enableNotifications"
                    checked={notificationsEnabled}
                    onChange={(event) => setNotificationsEnabled(event.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="enableNotifications" className="cursor-pointer flex-1 mb-0">
                    Ativar notificacoes automaticas por email
                  </Label>
                </div>
                <Button
                  disabled={upsertSetting.isPending}
                  onClick={() => saveSettings([
                    { key: "notifications.email", value: notificationEmail, description: "Email para alertas" },
                    { key: "notifications.enabled", value: String(notificationsEnabled), description: "Ativa alertas por email" },
                  ])}
                >
                  {upsertSetting.isPending ? "Salvando..." : "Salvar Alteracoes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Tema</CardTitle>
                <CardDescription>Controle visual aplicado imediatamente no cliente.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Tema atual: {theme === "dark" ? "Escuro" : "Claro"}</p>
                  <p className="text-sm text-muted-foreground">
                    {switchable ? "Alterne entre os temas disponiveis." : "Tema fixo neste ambiente."}
                  </p>
                </div>
                <Button variant="outline" onClick={toggleTheme} disabled={!switchable} className="gap-2">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  Alternar tema
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
