import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Star, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function ProfessionalAssessment() {
  const [search, setSearch] = useState('');
  const { data: empData, isLoading } = trpc.employees.list.useQuery({ limit: 100 });
  const employees = (empData as any)?.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Avaliação de Desempenho (PDI)</h1>
          <p className="text-muted-foreground mt-1">Gerencie avaliações e planos de desenvolvimento individual</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Avaliações</span>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nova Avaliação
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Buscar funcionário..." value={search} onChange={(e) => setSearch(e.target.value)} />
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Carregando...
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nenhum funcionário encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {employees.map((emp: any) => (
                  <div key={emp.id} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                      <p className="text-sm text-muted-foreground">{emp.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">Sem avaliação</Badge>
                      <Button size="sm" variant="outline">
                        <Star className="w-4 h-4 mr-1" />
                        Avaliar
                      </Button>
                    </div>
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
