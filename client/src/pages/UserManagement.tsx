import { useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { KeyRound, Plus, Search, ShieldCheck } from "lucide-react";

type Role = "admin" | "gestor" | "colaborador" | "user";

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | Role>("all");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "colaborador" as Exclude<Role, "user">,
  });

  const usersQuery = trpc.users.listUsers.useQuery();

  const changePasswordMutation = trpc.users.changePassword.useMutation({
    onSuccess: () => {
      setPasswordError("");
      setPasswordMessage("Senha atualizada com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
    },
    onError: (error) => {
      setPasswordMessage("");
      setPasswordError(error.message);
    },
  });

  const createUserMutation = trpc.users.register.useMutation({
    onSuccess: async () => {
      setCreateError("");
      setCreateSuccess("Usuário criado com sucesso.");
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "colaborador",
      });
      await utils.users.listUsers.invalidate();
    },
    onError: (error) => {
      setCreateSuccess("");
      setCreateError(error.message);
    },
  });

  const updateUserRoleMutation = trpc.users.updateUserRole.useMutation({
    onSuccess: async () => {
      await utils.users.listUsers.invalidate();
    },
  });

  const filteredUsers = useMemo(() => {
    const users = usersQuery.data ?? [];
    return users.filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.name ?? "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || user.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [filterRole, searchTerm, usersQuery.data]);

  const getRoleLabel = (role: Role) => {
    const labels: Record<Role, string> = {
      admin: "Administrador",
      gestor: "Gestor",
      colaborador: "Colaborador",
      user: "Usuário",
    };
    return labels[role];
  };

  const getRoleBadgeColor = (role: Role) => {
    const colors: Record<Role, string> = {
      admin: "bg-red-100 text-red-800",
      gestor: "bg-blue-100 text-blue-800",
      colaborador: "bg-green-100 text-green-800",
      user: "bg-zinc-100 text-zinc-800",
    };
    return colors[role];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie acessos locais, papéis e senhas.
            </p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800">
            <ShieldCheck className="w-4 h-4 mr-1" />
            {currentUser?.email ?? "Sessão local"}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alterar minha senha</CardTitle>
            <CardDescription>
              Use esta seção para substituir a senha inicial do acesso local.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Input type="password" placeholder="Senha atual" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            <Input type="password" placeholder="Nova senha" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <Button
              className="gap-2"
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
              onClick={() => {
                setPasswordMessage("");
                setPasswordError("");
                changePasswordMutation.mutate({
                  currentPassword,
                  newPassword,
                });
              }}
            >
              <KeyRound className="w-4 h-4" />
              Atualizar senha
            </Button>
            {passwordMessage ? <p className="text-sm text-emerald-700 md:col-span-3">{passwordMessage}</p> : null}
            {passwordError ? <p className="text-sm text-red-700 md:col-span-3">{passwordError}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo usuário</CardTitle>
            <CardDescription>
              Em ambiente local sem banco, os usuários ficam persistidos no arquivo `.local-dev-users.json`.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <Input placeholder="Nome" value={newUser.name} onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))} />
            <Input type="email" placeholder="Email" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} />
            <Input type="password" placeholder="Senha inicial" value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} />
            <Select value={newUser.role} onValueChange={(value: "admin" | "gestor" | "colaborador") => setNewUser((current) => ({ ...current, role: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="gestor">Gestor</SelectItem>
                <SelectItem value="colaborador">Colaborador</SelectItem>
              </SelectContent>
            </Select>
            <div className="md:col-span-4">
              <Button
                className="gap-2"
                disabled={createUserMutation.isPending || !newUser.name || !newUser.email || !newUser.password}
                onClick={() => {
                  setCreateError("");
                  setCreateSuccess("");
                  createUserMutation.mutate(newUser);
                }}
              >
                <Plus className="w-4 h-4" />
                Criar usuário
              </Button>
            </div>
            {createSuccess ? <p className="text-sm text-emerald-700 md:col-span-4">{createSuccess}</p> : null}
            {createError ? <p className="text-sm text-red-700 md:col-span-4">{createError}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por email ou nome" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-10" />
              </div>
              <Select value={filterRole} onValueChange={(value: "all" | Role) => setFilterRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os perfis</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {usersQuery.isLoading ? <p className="text-sm text-muted-foreground">Carregando usuários...</p> : null}
            {usersQuery.error ? <p className="text-sm text-red-700">{usersQuery.error.message}</p> : null}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Nome</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm">{user.email}</td>
                      <td className="py-3 px-4 text-sm font-medium">{user.name ?? "-"}</td>
                      <td className="py-3 px-4 space-y-2">
                        <Badge className={getRoleBadgeColor(user.role as Role)}>
                          {getRoleLabel(user.role as Role)}
                        </Badge>
                        {user.role !== "user" ? (
                          <Select
                            value={user.role as "admin" | "gestor" | "colaborador"}
                            onValueChange={(value: "admin" | "gestor" | "colaborador") =>
                              updateUserRoleMutation.mutate({ userId: user.id, role: value })
                            }
                          >
                            <SelectTrigger className="h-8 w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="gestor">Gestor</SelectItem>
                              <SelectItem value="colaborador">Colaborador</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!usersQuery.isLoading && filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum usuário encontrado.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
