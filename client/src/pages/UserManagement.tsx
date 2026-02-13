import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit2, Trash2, Lock, Unlock, Search } from 'lucide-react';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'gestor' | 'colaborador';
  status: 'active' | 'inactive' | 'locked';
  lastLogin?: Date;
  createdAt: Date;
}

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'gestor' | 'colaborador'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'locked'>('all');

  // Mock data - em produção, viria do backend
  const users: User[] = [
    {
      id: 1,
      email: 'admin@ml-servicos.com',
      name: 'Administrador',
      role: 'admin',
      status: 'active',
      lastLogin: new Date('2026-02-13T10:30:00'),
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 2,
      email: 'gestor@ml-servicos.com',
      name: 'Gestor de RH',
      role: 'gestor',
      status: 'active',
      lastLogin: new Date('2026-02-12T14:15:00'),
      createdAt: new Date('2026-01-15'),
    },
    {
      id: 3,
      email: 'colaborador@ml-servicos.com',
      name: 'Colaborador',
      role: 'colaborador',
      status: 'active',
      lastLogin: new Date('2026-02-11T09:00:00'),
      createdAt: new Date('2026-02-01'),
    },
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: '👨‍💼 Administrador',
      gestor: '👤 Gestor',
      colaborador: '👥 Colaborador',
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: 'Ativo', variant: 'default' as const },
      inactive: { label: 'Inativo', variant: 'secondary' as const },
      locked: { label: 'Bloqueado', variant: 'destructive' as const },
    };
    return config[status as keyof typeof config] || config.active;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      gestor: 'bg-blue-100 text-blue-800',
      colaborador: 'bg-green-100 text-green-800',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie usuários, roles e permissões do sistema
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Email ou nome"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={filterRole} onValueChange={(value: any) => setFilterRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="admin">👨‍💼 Administrador</SelectItem>
                    <SelectItem value="gestor">👤 Gestor</SelectItem>
                    <SelectItem value="colaborador">👥 Colaborador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">✓ Ativo</SelectItem>
                    <SelectItem value="inactive">- Inativo</SelectItem>
                    <SelectItem value="locked">🔒 Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Usuários ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Nome</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Último Acesso</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    const statusConfig = getStatusBadge(user.status);
                    return (
                      <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm">{user.email}</td>
                        <td className="py-3 px-4 text-sm font-medium">{user.name}</td>
                        <td className="py-3 px-4">
                          <Badge className={getRoleBadgeColor(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {user.lastLogin
                            ? user.lastLogin.toLocaleString('pt-BR')
                            : 'Nunca acessou'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="gap-1">
                              <Edit2 className="w-4 h-4" />
                              <span className="hidden sm:inline">Editar</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => {
                                console.log(
                                  user.status === 'locked'
                                    ? 'Desbloquear usuário'
                                    : 'Bloquear usuário'
                                );
                              }}
                            >
                              {user.status === 'locked' ? (
                                <>
                                  <Unlock className="w-4 h-4" />
                                  <span className="hidden sm:inline">Desbloquear</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4" />
                                  <span className="hidden sm:inline">Bloquear</span>
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              onClick={() => console.log('Deletar usuário', user.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="hidden sm:inline">Deletar</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum usuário encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matriz de Permissões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-semibold">Funcionalidade</th>
                    <th className="text-center py-2 px-4 font-semibold">Admin</th>
                    <th className="text-center py-2 px-4 font-semibold">Gestor</th>
                    <th className="text-center py-2 px-4 font-semibold">Colaborador</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Gerenciar Usuários', admin: true, gestor: false, colaborador: false },
                    { feature: 'Gerenciar Roles', admin: true, gestor: false, colaborador: false },
                    { feature: 'Ver Auditoria', admin: true, gestor: true, colaborador: false },
                    { feature: 'Gerenciar Funcionários', admin: true, gestor: true, colaborador: false },
                    { feature: 'Solicitar Férias', admin: true, gestor: true, colaborador: true },
                    { feature: 'Aprovar Férias', admin: true, gestor: true, colaborador: false },
                    { feature: 'Ver Holerite', admin: true, gestor: true, colaborador: true },
                    { feature: 'Exportar Dados', admin: true, gestor: true, colaborador: false },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4 font-medium">{row.feature}</td>
                      <td className="text-center py-2 px-4">
                        {row.admin ? '✓' : '✗'}
                      </td>
                      <td className="text-center py-2 px-4">
                        {row.gestor ? '✓' : '✗'}
                      </td>
                      <td className="text-center py-2 px-4">
                        {row.colaborador ? '✓' : '✗'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
