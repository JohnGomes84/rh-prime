import { useRole } from "@/_core/hooks/useRole";
import DashboardLayout from "@/components/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Search,
  Shield,
  Smartphone,
  Stamp,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type SettingMap = Record<string, string>;
type UserRole = "admin" | "gestor" | "colaborador";
type UserStatus = "active" | "inactive";

type AccessUser = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  status?: UserStatus;
  linkedEmployeeId?: number | null;
  linkedEmployeeName?: string | null;
};

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function asUserRole(value: string | null | undefined): UserRole {
  return value === "admin" || value === "gestor" || value === "colaborador"
    ? value
    : "colaborador";
}

function asUserStatus(value: string | null | undefined): UserStatus {
  return value === "inactive" ? "inactive" : "active";
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Administrador";
    case "gestor":
      return "Gestor";
    default:
      return "Colaborador";
  }
}

function AccessBadge({ enabled, reason }: { enabled: boolean; reason?: string }) {
  if (enabled) {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
        Liberado
      </Badge>
    );
  }

  return <Badge variant="secondary">{reason ? `Bloqueado: ${reason}` : "Bloqueado"}</Badge>;
}

type ActionCardProps = {
  icon: any;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  bullets: string[];
};

function ActionCard({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  bullets,
}: ActionCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-muted-foreground">
          {bullets.map((bullet) => (
            <div key={bullet} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
              <span>{bullet}</span>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full justify-between" onClick={onAction}>
          {actionLabel}
          <ExternalLink className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CollaboratorAppAdmin() {
  const [, navigate] = useLocation();
  const { isAdmin } = useRole();
  const utils = trpc.useUtils();
  const sessionQuery = trpc.auth.session.useQuery();
  const flagsQuery = trpc.system.flags.useQuery();
  const settingsQuery = trpc.settings.list.useQuery(undefined, {
    staleTime: 30000,
  });
  const configQuery = trpc.system.collaboratorAppConfig.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });
  const usersQuery = trpc.users.listUsers.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
    staleTime: 30000,
  });

  const settingsMap = useMemo<SettingMap>(() => {
    return (settingsQuery.data ?? []).reduce<SettingMap>((acc, item: any) => {
      acc[item.key] = item.value ?? "";
      return acc;
    }, {});
  }, [settingsQuery.data]);

  const users = useMemo(() => ((usersQuery.data ?? []) as AccessUser[]), [usersQuery.data]);
  const roleOptions = useMemo(() => {
    const roles = new Set<UserRole>();
    users.forEach((user) => roles.add(asUserRole(user.role)));
    return Array.from(roles).sort();
  }, [users]);

  const [appEnabled, setAppEnabled] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [onlyLinkedUsers, setOnlyLinkedUsers] = useState(true);
  // Não filtrar por colaborador por padrão — senão a lista fica vazia quando os
  // usuários vinculados são admin/gestor (o caso mais comum no piloto).
  const [onlyCollaborators, setOnlyCollaborators] = useState(false);

  useEffect(() => {
    setAppEnabled((settingsMap["collaborator_app.enabled"] ?? "") === "true");

    const roleValues = parseCsv(settingsMap["collaborator_app.allowed_roles"]);
    setSelectedRoles(roleValues);

    const idValues = parseCsv(settingsMap["collaborator_app.allowed_user_ids"]);
    const emailValues = parseCsv(settingsMap["collaborator_app.allowed_emails"]).map((entry) => entry.toLowerCase());

    if (idValues.length > 0) {
      setSelectedUserIds(idValues);
      return;
    }

    if (emailValues.length > 0 && users.length > 0) {
      const matchedIds = users
        .filter((user) => emailValues.includes(user.email.toLowerCase()))
        .map((user) => String(user.id));
      setSelectedUserIds(matchedIds);
      return;
    }

    setSelectedUserIds([]);
  }, [settingsMap, users]);

  const selectedUsers = useMemo(() => {
    const selectedIdSet = new Set(selectedUserIds);
    return users.filter((user) => selectedIdSet.has(String(user.id)));
  }, [selectedUserIds, users]);

  const selectedUsersWithoutLink = useMemo(
    () => selectedUsers.filter((user) => !user.linkedEmployeeId),
    [selectedUsers],
  );

  const derivedEmails = useMemo(
    () => selectedUsers.map((user) => user.email).join(","),
    [selectedUsers],
  );

  const activeUsers = useMemo(
    () => users.filter((user) => asUserStatus(user.status) === "active"),
    [users],
  );

  const eligiblePilotUsers = useMemo(
    () =>
      activeUsers.filter((user) => {
        if (onlyLinkedUsers && !user.linkedEmployeeId) return false;
        if (onlyCollaborators && asUserRole(user.role) !== "colaborador") return false;
        return true;
      }),
    [activeUsers, onlyCollaborators, onlyLinkedUsers],
  );

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    const source = eligiblePilotUsers;
    if (!term) return source;

    return source.filter((user) => {
      const roleLabel = getRoleLabel(asUserRole(user.role)).toLowerCase();
      return (
        (user.name ?? "").toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.linkedEmployeeName ?? "").toLowerCase().includes(term) ||
        roleLabel.includes(term) ||
        String(user.id).includes(term)
      );
    });
  }, [eligiblePilotUsers, userSearch]);

  const savePilotSettings = trpc.settings.upsert.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.settings.list.invalidate(),
        utils.system.flags.invalidate(),
        utils.system.collaboratorAppConfig.invalidate(),
      ]);
    },
  });

  const collaboratorApp = flagsQuery.data?.collaboratorApp;
  const linkedEmployee = sessionQuery.data?.employee;
  const runtimeConfig = configQuery.data;
  const scopedPilot = selectedRoles.length > 0 || selectedUserIds.length > 0;
  const saving = savePilotSettings.isPending;

  const handleToggleRole = (role: string) => {
    setSelectedRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );
  };

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId],
    );
  };

  const handleSelectVisibleUsers = () => {
    setSelectedUserIds((current) => {
      const merged = new Set(current);
      filteredUsers.forEach((user) => merged.add(String(user.id)));
      return Array.from(merged);
    });
  };

  const handleSelectAllEligibleUsers = () => {
    setSelectedUserIds(Array.from(new Set(eligiblePilotUsers.map((user) => String(user.id)))));
  };

  const handleClearSelectedUsers = () => {
    setSelectedUserIds([]);
  };

  const handleSavePilot = async () => {
    if (!isAdmin) {
      toast.error("Somente administrador pode alterar a liberação do piloto.");
      return;
    }

    try {
      const entries = [
        {
          key: "collaborator_app.enabled",
          value: String(appEnabled),
          description: "Liga ou desliga o app do colaborador pelo sistema.",
        },
        {
          key: "collaborator_app.allowed_roles",
          value: selectedRoles.join(","),
          description: "Roles liberadas para o piloto do app do colaborador.",
        },
        {
          key: "collaborator_app.allowed_emails",
          value: derivedEmails,
          description: "Emails liberados para o piloto do app do colaborador.",
        },
        {
          key: "collaborator_app.allowed_user_ids",
          value: selectedUserIds.join(","),
          description: "User IDs liberados para o piloto do app do colaborador.",
        },
      ];

      for (const entry of entries) {
        await savePilotSettings.mutateAsync(entry);
      }

      toast.success("Liberação do piloto atualizada no sistema.");
    } catch (error: any) {
      toast.error(error?.message ?? "Falha ao salvar a liberação do piloto.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Smartphone className="h-6 w-6" />
            App do Colaborador
          </h1>
          <p className="text-muted-foreground">
            Central do app de ponto: libere o piloto, acompanhe acessos e siga o passo a passo abaixo.
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status do app</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground">Seu acesso</span>
              <AccessBadge enabled={Boolean(collaboratorApp?.enabled)} reason={collaboratorApp?.reason} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground">Funcionário vinculado</span>
              <span className="font-medium">{linkedEmployee?.fullName ?? "Não vinculado"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-muted-foreground">Endereço do app</span>
              <Badge variant="outline">/app/ponto</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Liberação do piloto</CardTitle>
            <CardDescription>
              Escolha quem pode usar o app do colaborador. Perfis e usuários vêm do próprio cadastro do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isAdmin ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Somente leitura</AlertTitle>
                <AlertDescription>
                  Gestores podem consultar esta central, mas apenas administradores podem alterar a liberação do piloto.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <input
                    type="checkbox"
                    id="collaborator-app-enabled"
                    checked={appEnabled}
                    onChange={(event) => setAppEnabled(event.target.checked)}
                    disabled={!isAdmin || saving}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="collaborator-app-enabled" className="mb-0 cursor-pointer">
                    Ativar o app do colaborador no sistema
                  </Label>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Perfis liberados</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Marque os perfis que podem entrar no piloto.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {roleOptions.map((role) => {
                      const selected = selectedRoles.includes(role);
                      return (
                        <Button
                          key={role}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          disabled={!isAdmin || saving}
                          onClick={() => handleToggleRole(role)}
                        >
                          {getRoleLabel(role)}
                        </Button>
                      );
                    })}
                    {roleOptions.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Nenhum perfil carregado do cadastro de usuários.</span>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <Label>Usuários do piloto</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Escolhidos do próprio cadastro. O sistema grava os IDs e e-mails automaticamente.
                      </p>
                    </div>
                    <Badge variant="outline">{selectedUsers.length} selecionado(s)</Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <input
                        type="checkbox"
                        id="only-linked-users"
                        checked={onlyLinkedUsers}
                        onChange={(event) => setOnlyLinkedUsers(event.target.checked)}
                        disabled={!isAdmin || saving}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="only-linked-users" className="mb-0 cursor-pointer text-sm">
                        Somente vinculados
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <input
                        type="checkbox"
                        id="only-collaborators"
                        checked={onlyCollaborators}
                        onChange={(event) => setOnlyCollaborators(event.target.checked)}
                        disabled={!isAdmin || saving}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="only-collaborators" className="mb-0 cursor-pointer text-sm">
                        Somente colaboradores
                      </Label>
                    </div>
                    <Badge variant="secondary">
                      {filteredUsers.length} visível(eis)
                    </Badge>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      className="pl-9"
                      placeholder="Buscar por nome, e-mail, funcionário ou ID"
                      disabled={!isAdmin || saving}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSelectVisibleUsers}
                      disabled={!isAdmin || saving || filteredUsers.length === 0}
                    >
                      Selecionar visíveis
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSelectAllEligibleUsers}
                      disabled={!isAdmin || saving || eligiblePilotUsers.length === 0}
                    >
                      Selecionar todos aptos
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleClearSelectedUsers}
                      disabled={!isAdmin || saving || selectedUsers.length === 0}
                    >
                      Limpar seleção
                    </Button>
                  </div>

                  <div className="max-h-[360px] overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[90px]">Piloto</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Funcionário</TableHead>
                          <TableHead>Perfil</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersQuery.isLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center">
                              <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                            </TableCell>
                          </TableRow>
                        ) : filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => {
                            const selected = selectedUserIds.includes(String(user.id));
                            const hasLink = Boolean(user.linkedEmployeeId);
                            return (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    disabled={!isAdmin || saving}
                                    onChange={() => handleToggleUser(String(user.id))}
                                    className="h-4 w-4"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="font-medium">{user.name ?? "Sem nome"}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {user.email} · ID {user.id}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {hasLink ? (
                                    <div className="space-y-1">
                                      <div>{user.linkedEmployeeName}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Vínculo OK
                                      </div>
                                    </div>
                                  ) : (
                                    <Badge variant="secondary">Sem vínculo</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{getRoleLabel(asUserRole(user.role))}</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                              Nenhum usuário encontrado. Ajuste os filtros ou a busca acima.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleSavePilot} disabled={!isAdmin || saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar liberação do piloto
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/app/ponto")}>
                    Abrir app do colaborador
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Regra aplicada</AlertTitle>
                  <AlertDescription>
                    Com o app ativo e nenhum perfil ou usuário marcado, a liberação vale para todos os usuários logados (liberação global).
                  </AlertDescription>
                </Alert>

                {selectedUsersWithoutLink.length > 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Usuários selecionados sem vínculo</AlertTitle>
                    <AlertDescription>
                      {selectedUsersWithoutLink.length} usuário(s) escolhido(s) não têm funcionário vinculado. Eles entram no piloto, mas o ponto fica bloqueado até o vínculo ser feito em Usuários.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <Card className="border bg-muted/30 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Resumo da configuração</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">App ligado</span>
                      <Badge variant={appEnabled ? "default" : "secondary"}>
                        {appEnabled ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Escopo do piloto</span>
                      <Badge variant="outline">{scopedPilot ? "Controlado" : "Global"}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Perfis selecionados</span>
                      <span>{selectedRoles.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Usuários selecionados</span>
                      <span>{selectedUsers.length}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Sem vínculo</span>
                      <span>{selectedUsersWithoutLink.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border bg-muted/30 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Usuários escolhidos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedUsers.length > 0 ? (
                      selectedUsers.map((user) => (
                        <div key={user.id} className="rounded-md border bg-background p-3 text-sm">
                          <div className="font-medium">{user.name ?? "Sem nome"}</div>
                          <div className="text-muted-foreground">{user.email}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="outline">ID {user.id}</Badge>
                            <Badge variant="outline">{getRoleLabel(asUserRole(user.role))}</Badge>
                            {user.linkedEmployeeName ? (
                              <Badge variant="outline">{user.linkedEmployeeName}</Badge>
                            ) : (
                              <Badge variant="secondary">Sem vínculo</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Nenhum usuário selecionado. Se deixar assim e não marcar perfis, o app fica em liberação global quando estiver ativo.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Passo a passo para liberar um colaborador</h2>
            <p className="text-sm text-muted-foreground">Siga na ordem. Cada passo abre a tela certa do sistema.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ActionCard
              icon={UserCog}
              title="1. Acesso e vínculo"
              description="Primeiro passo para qualquer colaborador usar o app."
              actionLabel="Abrir Usuários"
              onAction={() => navigate("/usuarios")}
              bullets={[
                "Criar o usuário de acesso.",
                "Ativar ou reativar a conta.",
                "Vincular o usuário ao funcionário correto.",
              ]}
            />

            <ActionCard
              icon={Users}
              title="2. Cadastro e jornada"
              description="Sem funcionário ativo e contrato válido, o app não libera o ponto."
              actionLabel="Abrir Funcionários"
              onAction={() => navigate("/funcionarios")}
              bullets={[
                "Conferir o status do colaborador.",
                "Abrir o funcionário e revisar os contratos.",
                "Validar horário, escala e intervalo no contrato.",
              ]}
            />

            <ActionCard
              icon={Stamp}
              title="3. Operação do RH"
              description="Onde o RH faz implantação, ajustes e fechamento da competência."
              actionLabel="Abrir Jornada Admin"
              onAction={() => navigate("/jornada-admin")}
              bullets={[
                "Registrar a implantação manual do mês atual.",
                "Aprovar ou decidir ajustes.",
                "Fechar e reabrir a competência quando necessário.",
              ]}
            />

            <ActionCard
              icon={Shield}
              title="4. Privacidade e evidências"
              description="Base para câmera, geolocalização e ciência do colaborador."
              actionLabel="Abrir Privacidade"
              onAction={() => navigate("/privacidade")}
              bullets={[
                "Revisar os consentimentos necessários.",
                "Orientar o colaborador quando houver bloqueio.",
                "Conferir a governança de evidências do ponto.",
              ]}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
