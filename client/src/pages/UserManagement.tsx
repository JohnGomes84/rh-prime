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
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type UserRole = "admin" | "gestor" | "colaborador";

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; icon: typeof Shield }> = {
  admin: { label: "Administrador", color: "bg-red-100 text-red-700", icon: ShieldCheck },
  gestor: { label: "Gestor", color: "bg-blue-100 text-blue-700", icon: Shield },
  colaborador: { label: "Colaborador", color: "bg-slate-100 text-slate-700", icon: User },
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [editUser, setEditUser] = useState<{ id: number; name: string; role: UserRole } | null>(null);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("colaborador");

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("colaborador");

  const utils = trpc.useUtils();

  const usersQuery = trpc.users.listUsers.useQuery();
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

  const users = usersQuery.data ?? [];
  const term = search.trim().toLowerCase();
  const filtered = term
    ? users.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          (ROLE_CONFIG[u.role as UserRole]?.label ?? "").toLowerCase().includes(term),
      )
    : users;

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    gestor: users.filter((u) => u.role === "gestor").length,
    colaborador: users.filter((u) => u.role === "colaborador").length,
  };

  function openEdit(u: (typeof users)[0]) {
    setEditUser({ id: u.id, name: u.name ?? "", role: u.role as UserRole });
    setEditName(u.name ?? "");
    setEditRole(u.role as UserRole);
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
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
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
                  const rc = ROLE_CONFIG[u.role as UserRole] ?? ROLE_CONFIG.colaborador;
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
                      </div>
                      <Badge variant="secondary" className={cn("text-xs", rc.color)}>
                        {rc.label}
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
