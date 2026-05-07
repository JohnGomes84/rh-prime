import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function SignASOs() {
  const [search, setSearch] = useState('');
  const { data: examData, isLoading } = trpc.medicalExams.list.useQuery(undefined);
  const exams = (examData as any)?.data || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assinatura de ASOs</h1>
          <p className="text-muted-foreground mt-1">Gerencie assinatura digital de Atestados de Saúde Ocupacional</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ASOs Pendentes de Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Buscar ASO..." value={search} onChange={(e) => setSearch(e.target.value)} />
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Carregando...
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nenhum ASO encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exams.map((exam: any) => (
                  <div key={exam.id} className="p-3 border rounded flex items-center justify-between">
                    <div>
                      <p className="font-medium">{exam.type}</p>
                      <p className="text-sm text-muted-foreground">Data: {new Date(exam.examDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">Pendente</Badge>
                      <Button size="sm" variant="outline">
                        <FileCheck className="w-4 h-4 mr-1" />
                        Assinar
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
