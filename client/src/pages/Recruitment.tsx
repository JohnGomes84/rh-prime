import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, FileText, CheckCircle2, Clock, Users } from 'lucide-react';

interface JobOpening {
  id: number;
  titulo: string;
  departamento: string;
  cargo: string;
  salarioMinimo: number;
  salarioMaximo: number;
  quantidadeVagas: number;
  status: string;
  dataAbertura: string;
}

interface Candidate {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  status: string;
  dataAplicacao: string;
}

export default function Recruitment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('vagas');

  // Mock data
  const jobOpenings: JobOpening[] = [
    {
      id: 1,
      titulo: 'Desenvolvedor Full Stack',
      departamento: 'TI',
      cargo: 'Desenvolvedor',
      salarioMinimo: 5000,
      salarioMaximo: 8000,
      quantidadeVagas: 2,
      status: 'publicada',
      dataAbertura: '2026-02-01',
    },
    {
      id: 2,
      titulo: 'Analista de RH',
      departamento: 'RH',
      cargo: 'Analista',
      salarioMinimo: 3500,
      salarioMaximo: 5500,
      quantidadeVagas: 1,
      status: 'publicada',
      dataAbertura: '2026-02-05',
    },
  ];

  const candidates: Candidate[] = [
    {
      id: 1,
      nome: 'João Silva',
      email: 'joao@example.com',
      cpf: '12345678901',
      telefone: '11999999999',
      status: 'entrevista',
      dataAplicacao: '2026-02-10',
    },
    {
      id: 2,
      nome: 'Maria Santos',
      email: 'maria@example.com',
      cpf: '98765432101',
      telefone: '11888888888',
      status: 'triada',
      dataAplicacao: '2026-02-08',
    },
  ];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any }> = {
      publicada: { label: '📢 Publicada', variant: 'default' },
      preenchida: { label: '✓ Preenchida', variant: 'secondary' },
      cancelada: { label: '✗ Cancelada', variant: 'destructive' },
      recebida: { label: 'Recebida', variant: 'outline' },
      triada: { label: 'Triada', variant: 'outline' },
      entrevista: { label: 'Entrevista', variant: 'default' },
      aprovada: { label: 'Aprovada', variant: 'default' },
      rejeitada: { label: 'Rejeitada', variant: 'destructive' },
    };
    return config[status] || { label: status, variant: 'outline' };
  };

  const filteredJobs = jobOpenings.filter(job =>
    job.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.departamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCandidates = candidates.filter(c =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Recrutamento e Seleção</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie vagas, candidatos e processo de seleção
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Vaga
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{jobOpenings.length}</p>
                <p className="text-sm text-muted-foreground">Vagas Ativas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{candidates.length}</p>
                <p className="text-sm text-muted-foreground">Candidatos</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {candidates.filter(c => c.status === 'entrevista').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Entrevista</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">0</p>
                <p className="text-sm text-muted-foreground">Contratados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vagas">Vagas</TabsTrigger>
            <TabsTrigger value="candidatos">Candidatos</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          </TabsList>

          {/* Vagas Tab */}
          <TabsContent value="vagas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Vagas Abertas</span>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar vaga..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredJobs.map(job => (
                    <div key={job.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{job.titulo}</h3>
                          <p className="text-sm text-muted-foreground">{job.departamento}</p>
                        </div>
                        <Badge variant="default">{getStatusBadge(job.status).label}</Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Cargo</p>
                          <p className="font-medium">{job.cargo}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Salário</p>
                          <p className="font-medium">
                            R$ {job.salarioMinimo.toLocaleString('pt-BR')} - R${' '}
                            {job.salarioMaximo.toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Vagas</p>
                          <p className="font-medium">{job.quantidadeVagas}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Aberta em</p>
                          <p className="font-medium">
                            {new Date(job.dataAbertura).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <FileText className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                        <Button size="sm" variant="outline">
                          <Users className="w-4 h-4 mr-2" />
                          Ver Candidatos
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Candidatos Tab */}
          <TabsContent value="candidatos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Candidatos</span>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar candidato..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Nome</th>
                        <th className="text-left py-3 px-4 font-semibold">Email</th>
                        <th className="text-left py-3 px-4 font-semibold">CPF</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 font-semibold">Data</th>
                        <th className="text-left py-3 px-4 font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map(candidate => (
                        <tr key={candidate.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{candidate.nome}</td>
                          <td className="py-3 px-4">{candidate.email}</td>
                          <td className="py-3 px-4 font-mono text-xs">{candidate.cpf}</td>
                          <td className="py-3 px-4">
                            <Badge variant={getStatusBadge(candidate.status).variant}>
                              {getStatusBadge(candidate.status).label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(candidate.dataAplicacao).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-4">
                            <Button size="sm" variant="ghost">
                              Ver
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

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { title: 'Recebidas', count: 5, color: 'bg-blue-100' },
                { title: 'Triadas', count: 3, color: 'bg-yellow-100' },
                { title: 'Entrevista', count: 2, color: 'bg-orange-100' },
                { title: 'Aprovadas', count: 1, color: 'bg-green-100' },
                { title: 'Contratadas', count: 0, color: 'bg-purple-100' },
              ].map((stage, idx) => (
                <Card key={idx} className={stage.color}>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{stage.count}</p>
                      <p className="text-sm font-medium">{stage.title}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
