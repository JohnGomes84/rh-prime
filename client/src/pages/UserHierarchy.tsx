import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Users, Edit2 } from 'lucide-react';

interface HierarchyNode {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  subordinates: HierarchyNode[];
}

export function UserHierarchy() {
  const hierarchy: HierarchyNode = {
    id: 1,
    name: 'Diretor de RH',
    email: 'diretor@ml-servicos.com',
    role: 'admin',
    department: 'Recursos Humanos',
    subordinates: [
      {
        id: 2,
        name: 'Gerente de Gestão de Pessoas',
        email: 'gerente@ml-servicos.com',
        role: 'gestor',
        department: 'Recursos Humanos',
        subordinates: [
          {
            id: 3,
            name: 'Analista de RH - Folha',
            email: 'analista1@ml-servicos.com',
            role: 'colaborador',
            department: 'Recursos Humanos',
            subordinates: [],
          },
          {
            id: 4,
            name: 'Analista de RH - Recrutamento',
            email: 'analista2@ml-servicos.com',
            role: 'colaborador',
            department: 'Recursos Humanos',
            subordinates: [],
          },
        ],
      },
      {
        id: 5,
        name: 'Gerente de Segurança do Trabalho',
        email: 'seguranca@ml-servicos.com',
        role: 'gestor',
        department: 'Segurança do Trabalho',
        subordinates: [
          {
            id: 6,
            name: 'Técnico de Segurança',
            email: 'tecnico@ml-servicos.com',
            role: 'colaborador',
            department: 'Segurança do Trabalho',
            subordinates: [],
          },
        ],
      },
    ],
  };

  const HierarchyNode = ({ node, level = 0 }: { node: HierarchyNode; level?: number }) => {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const hasSubordinates = node.subordinates.length > 0;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 bg-white border rounded-lg hover:shadow-md transition-shadow ml-4">
          {hasSubordinates && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          )}
          {!hasSubordinates && <div className="w-6" />}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{node.name}</span>
              <Badge variant="outline" className="text-xs">
                {node.role}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{node.email}</p>
            <p className="text-xs text-muted-foreground">{node.department}</p>
          </div>

          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isExpanded && hasSubordinates && (
          <div className="ml-6 border-l-2 border-gray-200 pl-4 space-y-2">
            {node.subordinates.map(subordinate => (
              <HierarchyNode key={subordinate.id} node={subordinate} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const countSubordinates = (node: HierarchyNode): number => {
    return node.subordinates.reduce((sum, sub) => sum + 1 + countSubordinates(sub), 0);
  };

  const getStats = () => {
    const admins = 1;
    const gestores = hierarchy.subordinates.filter(s => s.role === 'gestor').length;
    const colaboradores = countSubordinates(hierarchy) - admins - gestores;

    return { admins, gestores, colaboradores };
  };

  const stats = getStats();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Hierarquia de Usuários</h1>
          <p className="text-muted-foreground mt-2">
            Visualize a estrutura organizacional e as relações de subordinação
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{stats.admins}</p>
                <p className="text-sm text-muted-foreground">Administradores</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.gestores}</p>
                <p className="text-sm text-muted-foreground">Gestores</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{stats.colaboradores}</p>
                <p className="text-sm text-muted-foreground">Colaboradores</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hierarchy Tree */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Estrutura Organizacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <HierarchyNode node={hierarchy} />
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-800">admin</Badge>
                <span className="text-sm">Acesso total ao sistema</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800">gestor</Badge>
                <span className="text-sm">Gerencia equipe e aprovações</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">colaborador</Badge>
                <span className="text-sm">Acesso limitado a funcionalidades</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
