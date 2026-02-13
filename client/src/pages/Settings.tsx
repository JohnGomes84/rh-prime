import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Loader2, Settings as SettingsIcon, Building2, Mail, Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { theme, toggleTheme, switchable } = useTheme();
  const { data: settings, isLoading } = trpc.settings.list.useQuery();

  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");

  const handleSaveCompany = () => {
    toast.info("Configurações salvas localmente. Sincronize com o servidor.");
  };

  const handleSaveNotifications = () => {
    toast.info("Notificações configuradas. Sincronize com o servidor.");
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
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações gerais do sistema RH Prime.</p>
        </div>

        <Tabs defaultValue="company" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Empresa
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notificações
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Sun className="h-4 w-4" /> Aparência
            </TabsTrigger>
          </TabsList>

          {/* Empresa */}
          <TabsContent value="company">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" /> Dados da Empresa
                </CardTitle>
                <CardDescription>Informações gerais da sua empresa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nome da Empresa *</Label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: Minha Empresa LTDA"
                    />
                  </div>
                  <div>
                    <Label>CNPJ</Label>
                    <Input
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>
                <div>
                  <Label>Endereço</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, complemento, cidade, estado"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contato@empresa.com.br"
                      type="email"
                    />
                  </div>
                </div>
                <div className="pt-4">
                  <Button onClick={handleSaveCompany}>
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notificações */}
          <TabsContent value="notifications">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-5 w-5" /> Notificações por E-mail
                </CardTitle>
                <CardDescription>Configure alertas e notificações automáticas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>E-mail para Notificações *</Label>
                  <Input
                    value={notificationEmail}
                    onChange={(e) => setNotificationEmail(e.target.value)}
                    placeholder="rh@empresa.com.br"
                    type="email"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Alertas de férias vencendo, ASOs expirados, banco de horas vencendo, etc.
                  </p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded">
                  <input
                    type="checkbox"
                    id="enableNotifications"
                    defaultChecked={true}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="enableNotifications" className="cursor-pointer flex-1 mb-0">
                    Ativar notificações automáticas por e-mail
                  </Label>
                </div>
                <div className="pt-4">
                  <Button onClick={handleSaveNotifications}>
                    Salvar Alterações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
