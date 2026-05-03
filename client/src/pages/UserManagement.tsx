import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const { data: authData } = trpc.auth.me.useQuery();
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground mt-1">Gerencie usuários e permissões do sistema</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Usuários do Sistema</span>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input placeholder="Buscar usuário..." value={search} onChange={(e) => setSearch(e.target.value)} />
              
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Usuário logado: {authData?.email}</p>
                <p className="text-sm mt-2">Role: {authData?.role || 'user'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
