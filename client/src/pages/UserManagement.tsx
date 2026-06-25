import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  Shield,
  ShieldCheck,
  User,
  Users,
  Mail,
  Search,
  Clock,
  KeyRound,
  Link2,
  UserCheck,
  UserX,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "gestor" | "colaborador";
type UserStatus = "active" | "inactive";

type AccessUser = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  status?: UserStatus;
  createdAt?: string | Date;
  lastLoginAt?: string | Date | null;
  linkedEmployeeId?: number | null;
  linkedEmployeeName?: string | null;
};

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: "Administrador", color: "bg-red-100 text-red-700", icon: ShieldCheck },
  gestor: { label: "Gestor", color: "bg-blue-100 text-blue-700", icon: Shield },
  colaborador: { label: "Colaborador", color: "bg-slate-100 text-slate-700", icon: User },
};

const STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-emerald-100 text-emerald-700" },
  inactive: { label: "Inativo", color: "bg-zinc-100 text-zinc-700" },
};

function asUserRole(value: string | null | undefined): UserRole {
  return value === "admin" || value === "gestor" || value === "colaborador"
    ? value
    : "colaborador";
}

function asUserStatus(value: string | null | undefined): UserStatus {
  return value === "inactive" ? "inactive" : "active";
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "Nunca";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Nunca";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [editUser, setEditUser] = useState<AccessUser | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("colaborador");

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("colaborador");
  const [resetPassword, setResetPassword] = useState("");
  const [linkEmployeeId, setLinkEmployeeId] = useState("");

  const utils = trpc.useUtils();

  const usersQuery = trpc.users.listUsers.useQuery();
  const employeesQuery = trpc.employees.list.useQuery({ limit: 1000 });
  const createUser = trpc.users.register.useMutation({
    onSuccess: () => {
      utils.users.listUsers.invalidate();
      toast.success("Usuário criado");
      setNewOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("colaborador");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRole = trpc.users.updateUserRole.useMutation({
    onSuccess: () => {
      utils.users.listUsers.invalidate();
      toast.success("Usuário atualizado");
      setEditUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const setUserStatus = trpc.users.setUserStatus.useMutation({
    onSuccess: () => {
      utils.users.listUsers.invalidate();
      toast.success("Status atualizado");
      setEditUser(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetUserPassword = trpc.users.resetUserPassword.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida");
      setResetPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const linkEmployee = trpc.users.linkEmployee.useMutation({
    onSuccess: () => {
      utils.users.listUsers.invalidate();
      toast.success("Funcionário vinculado");
    },
    onError: (e) => toast.error(e.message),
  });

  const users = (usersQuery.data ?? []) as AccessUser[];
  const employees = ((employeesQuery.data as any)?.data ?? []) as Array<{ id: number; fullName: string }>;
  const term = search.trim().toLowerCase();
  const filtered = term
    ? users.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          ROLE_CONFIG[asUserRole(u.role)].label.toLowerCase().includes(term) ||
          STATUS_CONFIG[asUserStatus(u.status)].label.toLowerCase().includes(term),
      )
    : users;

  const stats = {
    total: users.length,
    active: users.filter((u) => asUserStatus(u.status) === "active").length,
    admin: users.filter((u) => asUserRole(u.role) === "admin").length,
    gestor: users.filter((u) => asUserRole(u.role) === "gestor").length,
    colaborador: users.filter((u) => asUserRole(u.role) === "colaborador").length,
  };

  function openEdit(u: AccessUser) {
    setEditUser(u);
    setEditName(u.name ?? "");
    setEditRole(asUserRole(u.role));
    setResetPassword("");
    setLinkEmployeeId(u.linkedEmployeeId ? String(u.linkedEmployeeId) : "");
  }

  if (usersQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">Gerencie usuários e permissões do sistema</p>
          </div>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo usuário
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {(Object.entries(ROLE_CONFIG) as [UserRole, (typeof ROLE_CONFIG)[UserRole]][]).map(
            ([role, config]) => (
              <Card key={role} className="border-0 shadow-sm">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("rounded-lg p-2", config.color.split(" ")[0])}>
                      <config.icon className={cn("h-4 w-4", config.color.split(" ")[1])} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {stats[role]}
                      </p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>

        {/* Search + List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhum usuário encontrado.
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((u) => {
                  const rc = ROLE_CONFIG[asUserRole(u.role)];
                  const sc = STATUS_CONFIG[asUserStatus(u.status)];
                  return (
                    <div
                      key={u.id}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openEdit(u)}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {getInitials(u.name, u.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{u.name ?? u.email}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{u.email}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Último login: {formatDateTime(u.lastLoginAt)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Link2 className="h-3 w-3" />
                            {u.linkedEmployeeName ?? "Sem funcionário vinculado"}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className={cn("text-xs", rc.color)}>
                        {rc.label}
                      </Badge>
                      <Badge variant="secondary" className={cn("text-xs", sc.color)}>
                        {sc.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions info */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Permissões por role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-red-700">Administrador</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Vê todas as demandas</li>
                  <li>• Cria e atribui demandas</li>
                  <li>• Gerencia usuários</li>
                  <li>• Acesso total ao sistema</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-blue-700">Gestor</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Vê demandas do seu departamento</li>
                  <li>• Cria e atribui demandas</li>
                  <li>• Relatórios e funcionários</li>
                  <li>• Sem acesso a configurações</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-700">Colaborador</p>
                <ul className="text-muted-foreground space-y-0.5">
                  <li>• Vê apenas demandas atribuídas</li>
                  <li>• Aceita e executa demandas</li>
                  <li>• Consulta próprios dados</li>
                  <li>• Bate ponto e holerite</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Novo Usuário */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome completo</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Maria Silva" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@empresa.com.br" />
            </div>
            <div>
              <Label>Senha inicial</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button
              onClick={() =>
                createUser.mutate({ email: newEmail, password: newPassword, name: newName, role: newRole })
              }
              disabled={!newName || !newEmail || !newPassword || createUser.isPending}
            >
              {createUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Role */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editName} disabled className="bg-muted" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label>Status da conta</Label>
                  <p className="text-xs text-muted-foreground">
                    Usuarios inativos nao conseguem entrar nem redefinir senha.
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    STATUS_CONFIG[asUserStatus(editUser?.status)].color,
                  )}
                >
                  {STATUS_CONFIG[asUserStatus(editUser?.status)].label}
                </Badge>
              </div>
              <Button
                className="mt-3 w-full"
                variant={asUserStatus(editUser?.status) === "active" ? "destructive" : "outline"}
                disabled={!editUser || setUserStatus.isPending}
                onClick={() =>
                  editUser &&
                  setUserStatus.mutate({
                    userId: editUser.id,
                    status: asUserStatus(editUser.status) === "active" ? "inactive" : "active",
                  })
                }
              >
                {setUserStatus.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : asUserStatus(editUser?.status) === "active" ? (
                  <UserX className="h-4 w-4 mr-2" />
                ) : (
                  <UserCheck className="h-4 w-4 mr-2" />
                )}
                {asUserStatus(editUser?.status) === "active" ? "Desativar usuario" : "Reativar usuario"}
              </Button>
            </div>
            <div>
              <Label>Funcionário vinculado</Label>
              {employeesQuery.error && (
                <p className="mb-2 text-xs text-red-600">
                  Falha ao carregar funcionários: {employeesQuery.error.message}
                </p>
              )}
              <Select value={linkEmployeeId} onValueChange={setLinkEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      Nenhum funcionário disponível
                    </SelectItem>
                  ) : (
                    employees.map((employee) => (
                      <SelectItem key={employee.id} value={String(employee.id)}>
                        {employee.fullName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                className="mt-2 w-full"
                variant="outline"
                disabled={
                  !editUser ||
                  !linkEmployeeId ||
                  linkEmployee.isPending ||
                  String(editUser?.linkedEmployeeId ?? "") === linkEmployeeId
                }
                onClick={() =>
                  editUser &&
                  linkEmployee.mutate({
                    userId: editUser.id,
                    employeeId: Number(linkEmployeeId),
                  })
                }
              >
                {linkEmployee.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Vincular funcionário
              </Button>
            </div>
            <div>
              <Label>Nova senha</Label>
              <Input
                type="password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder="Senha temporária forte"
              />
              <Button
                className="mt-2 w-full"
                variant="outline"
                disabled={!editUser || !resetPassword || resetUserPassword.isPending}
                onClick={() =>
                  editUser &&
                  resetUserPassword.mutate({
                    userId: editUser.id,
                    password: resetPassword,
                  })
                }
              >
                {resetUserPassword.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                Redefinir senha
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button
              onClick={() => editUser && updateRole.mutate({ userId: editUser.id, role: editRole })}
              disabled={updateRole.isPending || (editUser?.role === editRole)}
            >
              {updateRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
