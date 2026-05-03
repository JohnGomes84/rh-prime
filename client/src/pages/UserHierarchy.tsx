import { useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function UserHierarchy() {
  const { data: empData, isLoading } = trpc.employees.list.useQuery({ limit: 1000 });
  const employees = (empData as any)?.data || [];

  const hierarchyTree = useMemo(() => {
    const withManager = employees.filter((e: any) => e.managerId);
    return withManager;
  }, [employees]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hierarquia Organizacional</h1>
          <p className="text-muted-foreground mt-1">Visualize a estrutura de gestores e colaboradores</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Estrutura Organizacional</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Carregando...
              </div>
            ) : hierarchyTree.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nenhuma hierarquia encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {hierarchyTree.map((emp: any) => (
                  <div key={emp.id} className="p-3 border rounded bg-gray-50">
                    <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                    <p className="text-sm text-muted-foreground">Gestor: {emp.managerId}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
