import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Eye, Send, Calendar, DollarSign, Users } from 'lucide-react';

interface Payslip {
  id: number;
  mes: string;
  ano: number;
  salarioBase: number;
  descontos: number;
  adicionais: number;
  salarioLiquido: number;
  status: string;
  dataGeracao: string;
}

interface Beneficiary {
  id: number;
  nome: string;
  cpf: string;
  cargo: string;
  salarioBase: number;
  beneficios: string[];
  dataAdmissao: string;
}

export default function Payroll() {
  const [selectedMonth, setSelectedMonth] = useState('02/2026');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data
  const payslips: Payslip[] = [
    {
      id: 1,
      mes: 'Fevereiro',
      ano: 2026,
      salarioBase: 5000,
      descontos: 1200,
      adicionais: 200,
      salarioLiquido: 4000,
      status: 'processado',
      dataGeracao: '2026-02-01',
    },
    {
      id: 2,
      mes: 'Janeiro',
      ano: 2026,
      salarioBase: 5000,
      descontos: 1150,
      adicionais: 150,
      salarioLiquido: 4000,
      status: 'processado',
      dataGeracao: '2026-01-31',
    },
  ];

  const beneficiaries: Beneficiary[] = [
    {
      id: 1,
      nome: 'João Silva',
      cpf: '12345678901',
      cargo: 'Desenvolvedor',
      salarioBase: 5000,
      beneficios: ['VR', 'VA', 'Plano de Saúde'],
      dataAdmissao: '2024-01-15',
    },
    {
      id: 2,
      nome: 'Maria Santos',
      cpf: '98765432101',
      cargo: 'Analista',
      salarioBase: 4500,
      beneficios: ['VR', 'Plano de Saúde'],
      dataAdmissao: '2024-03-20',
    },
  ];

  const stats = {
    folhaTotal: 45000,
    colaboradores: 10,
    processados: 10,
    pendentes: 0,
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any }> = {
      processado: { label: 'Processado', variant: 'default' },
      pendente: { label: 'Pendente', variant: 'outline' },
      enviado: { label: 'Enviado', variant: 'secondary' },
      erro: { label: 'Erro', variant: 'destructive' },
    };
    return config[status] || { label: status, variant: 'outline' };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Folha de Pagamento</h1>
            <p className="text-muted-foreground mt-2">Gerencie salários, benefícios e holerites</p>
          </div>
          <Button className="gap-2">
            <Calendar className="w-4 h-4" />
            Gerar Folha
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">
                  R$ {stats.folhaTotal.toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-muted-foreground">Folha Total (Fev/2026)</p>
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
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{stats.processados}</p>
                <p className="text-sm text-muted-foreground">Processados</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{stats.pendentes}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="holerites" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="holerites">Holerites</TabsTrigger>
            <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          {/* Holerites Tab */}
          <TabsContent value="holerites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Holerites - {selectedMonth}</span>
                  <div className="flex gap-2">
                    <Input
                      type="month"
                      value={selectedMonth.replace('/', '-')}
                      onChange={e => setSelectedMonth(e.target.value.replace('-', '/'))}
                      className="w-40"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payslips.map(slip => (
                    <div key={slip.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {slip.mes}/{slip.ano}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Gerado em {new Date(slip.dataGeracao).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant={getStatusBadge(slip.status).variant}>
                          {getStatusBadge(slip.status).label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-muted-foreground">Salário Base</p>
                          <p className="font-semibold">R$ {slip.salarioBase.toLocaleString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Adicionais</p>
                          <p className="font-semibold text-green-600">
                            +R$ {slip.adicionais.toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Descontos</p>
                          <p className="font-semibold text-red-600">
                            -R$ {slip.descontos.toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Líquido</p>
                          <p className="font-bold text-lg">
                            R$ {slip.salarioLiquido.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="gap-2">
                          <Eye className="w-4 h-4" />
                          Visualizar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2">
                          <Download className="w-4 h-4" />
                          Baixar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2">
                          <Send className="w-4 h-4" />
                          Enviar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Colaboradores Tab */}
          <TabsContent value="colaboradores" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Estrutura Salarial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Nome</th>
                        <th className="text-left py-3 px-4 font-semibold">CPF</th>
                        <th className="text-left py-3 px-4 font-semibold">Cargo</th>
                        <th className="text-left py-3 px-4 font-semibold">Salário Base</th>
                        <th className="text-left py-3 px-4 font-semibold">Benefícios</th>
                        <th className="text-left py-3 px-4 font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beneficiaries.map(beneficiary => (
                        <tr key={beneficiary.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{beneficiary.nome}</td>
                          <td className="py-3 px-4 font-mono text-xs">{beneficiary.cpf}</td>
                          <td className="py-3 px-4">{beneficiary.cargo}</td>
                          <td className="py-3 px-4 font-semibold">
                            R$ {beneficiary.salarioBase.toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1 flex-wrap">
                              {beneficiary.beneficios.map((benefit, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {benefit}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Button size="sm" variant="ghost">
                              Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatórios Tab */}
          <TabsContent value="relatorios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios de Folha</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'Resumo Mensal', icon: DollarSign },
                    { title: 'Detalhado por Colaborador', icon: Users },
                    { title: 'Análise de Custos', icon: Calendar },
                    { title: 'Exportar para Contador', icon: Download },
                  ].map((report, idx) => {
                    const Icon = report.icon;
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center gap-2"
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-sm">{report.title}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
