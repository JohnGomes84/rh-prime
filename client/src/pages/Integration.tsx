import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Integration() {
  const integrations = [
    { name: 'Google Calendar', status: 'Conectado', icon: '📅' },
    { name: 'Slack', status: 'Conectado', icon: '💬' },
    { name: 'SendGrid', status: 'Conectado', icon: '📧' },
    { name: 'Sólides', status: 'Disponível', icon: '🔗' },
    { name: 'Gov.br', status: 'Disponível', icon: '🏛️' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
          <p className="text-muted-foreground mt-1">Gerencie integrações com sistemas externos</p>
        </div>

        <div className="grid gap-4">
          {integrations.map((int, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{int.icon}</span>
                    <div>
                      <p className="font-medium">{int.name}</p>
                      <p className="text-sm text-muted-foreground">{int.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {int.status === 'Conectado' ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Disponível
                      </Badge>
                    )}
                    <Button size="sm" variant="outline">
                      {int.status === 'Conectado' ? 'Configurar' : 'Conectar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
