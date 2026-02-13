import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Users, FileText, CheckCircle2, Clock } from 'lucide-react';

interface Assessment {
  id: number;
  candidatoNome: string;
  cpf: string;
  tipo: string;
  status: string;
  dataInicio: string;
  dataFim?: string;
  progresso: number;
  resultado?: {
    tipo: string;
    descricao: string;
    score: number;
    recomendacoes: string[];
  };
}

interface TestTemplate {
  id: number;
  nome: string;
  tipo: string;
  descricao: string;
  duracao: number;
  questoes: number;
  ativo: boolean;
}

export default function ProfessionalAssessment() {
  const [activeTab, setActiveTab] = useState('avaliacoes');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  // Mock data
  const assessments: Assessment[] = [
    {
      id: 1,
      candidatoNome: 'João Silva',
      cpf: '12345678901',
      tipo: 'MBTI + Comportamental',
      status: 'concluida',
      dataInicio: '2026-02-10',
      dataFim: '2026-02-11',
      progresso: 100,
      resultado: {
        tipo: 'ENTJ - O Comandante',
        descricao: 'Líder natural, estratégico, decisivo',
        score: 8.5,
        recomendacoes: [
          'Excelente para posições de liderança',
          'Forte capacidade analítica',
          'Recomendado para projetos estratégicos',
        ],
      },
    },
    {
      id: 2,
      candidatoNome: 'Maria Santos',
      cpf: '98765432101',
      tipo: 'Big Five + Técnico',
      status: 'em_progresso',
      dataInicio: '2026-02-12',
      progresso: 65,
    },
    {
      id: 3,
      candidatoNome: 'Pedro Costa',
      cpf: '55555555555',
      tipo: 'MBTI',
      status: 'pendente',
      dataInicio: '2026-02-13',
      progresso: 0,
    },
  ];

  const testTemplates: TestTemplate[] = [
    {
      id: 1,
      nome: 'MBTI - Myers-Briggs Type Indicator',
      tipo: 'Psicométrico',
      descricao: 'Avalia preferências de personalidade em 4 dimensões',
      duracao: 15,
      questoes: 93,
      ativo: true,
    },
    {
      id: 2,
      nome: 'Big Five - Modelo dos Cinco Grandes',
      tipo: 'Psicométrico',
      descricao: 'Avalia 5 traços de personalidade principais',
      duracao: 20,
      questoes: 50,
      ativo: true,
    },
    {
      id: 3,
      nome: 'Avaliação Comportamental',
      tipo: 'Comportamental',
      descricao: 'Avalia competências e comportamentos profissionais',
      duracao: 25,
      questoes: 40,
      ativo: true,
    },
    {
      id: 4,
      nome: 'Teste Técnico - Desenvolvimento',
      tipo: 'Técnico',
      descricao: 'Avalia habilidades técnicas em programação',
      duracao: 60,
      questoes: 20,
      ativo: true,
    },
  ];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any; icon: any }> = {
      concluida: { label: 'Concluída', variant: 'default', icon: CheckCircle2 },
      em_progresso: { label: 'Em Progresso', variant: 'outline', icon: Clock },
      pendente: { label: 'Pendente', variant: 'secondary', icon: Clock },
    };
    return config[status] || { label: status, variant: 'outline', icon: Clock };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Avaliações de Perfil</h1>
            <p className="text-muted-foreground mt-2">
              Testes psicométricos, comportamentais e técnicos para recrutamento
            </p>
          </div>
          <Button className="gap-2">
            <FileText className="w-4 h-4" />
            Nova Avaliação
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{assessments.length}</p>
                <p className="text-sm text-muted-foreground">Avaliações Totais</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {assessments.filter(a => a.status === 'concluida').length}
                </p>
                <p className="text-sm text-muted-foreground">Concluídas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">
                  {assessments.filter(a => a.status === 'em_progresso').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Progresso</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {assessments.filter(a => a.status === 'pendente').length}
                </p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          </TabsList>

          {/* Avaliações Tab */}
          <TabsContent value="avaliacoes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Avaliações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assessments.map(assessment => {
                    const badge = getStatusBadge(assessment.status);
                    const Icon = badge.icon;
                    return (
                      <div
                        key={assessment.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedAssessment(assessment)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{assessment.candidatoNome}</h3>
                            <p className="text-sm text-muted-foreground font-mono">{assessment.cpf}</p>
                          </div>
                          <Badge variant={badge.variant} className="gap-1">
                            <Icon className="w-3 h-3" />
                            {badge.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Tipo</p>
                            <p className="font-medium">{assessment.tipo}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Início</p>
                            <p className="font-medium">
                              {new Date(assessment.dataInicio).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          {assessment.dataFim && (
                            <div>
                              <p className="text-muted-foreground">Conclusão</p>
                              <p className="font-medium">
                                {new Date(assessment.dataFim).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          )}
                          {assessment.resultado && (
                            <div>
                              <p className="text-muted-foreground">Score</p>
                              <p className="font-bold text-green-600">{assessment.resultado.score}/10</p>
                            </div>
                          )}
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">{assessment.progresso}%</span>
                          </div>
                          <Progress value={assessment.progresso} className="h-2" />
                        </div>

                        {assessment.resultado && (
                          <div className="bg-blue-50 p-3 rounded mb-3">
                            <p className="font-semibold text-sm mb-1">{assessment.resultado.tipo}</p>
                            <p className="text-xs text-muted-foreground mb-2">
                              {assessment.resultado.descricao}
                            </p>
                            <ul className="text-xs space-y-1">
                              {assessment.resultado.recomendacoes.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-green-600 mt-0.5">✓</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Ver Detalhes
                          </Button>
                          {assessment.status === 'concluida' && (
                            <Button size="sm" variant="outline">
                              Baixar Relatório
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Templates de Testes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {testTemplates.map(template => (
                    <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{template.nome}</h3>
                          <p className="text-xs text-muted-foreground">{template.tipo}</p>
                        </div>
                        {template.ativo && <Badge>Ativo</Badge>}
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">{template.descricao}</p>

                      <div className="grid grid-cols-3 gap-2 mb-3 text-xs bg-gray-50 p-2 rounded">
                        <div className="text-center">
                          <p className="text-muted-foreground">Duração</p>
                          <p className="font-semibold">{template.duracao}min</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Questões</p>
                          <p className="font-semibold">{template.questoes}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-semibold text-green-600">✓</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1">
                          Usar
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relatórios Tab */}
          <TabsContent value="relatorios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios e Análises</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      title: 'Análise Comparativa',
                      icon: BarChart3,
                      desc: 'Compare perfis de múltiplos candidatos',
                    },
                    {
                      title: 'Tendências de Perfil',
                      icon: TrendingUp,
                      desc: 'Analise padrões de personalidade',
                    },
                    {
                      title: 'Compatibilidade com Cargo',
                      icon: Users,
                      desc: 'Avalie fit com posição aberta',
                    },
                    {
                      title: 'Relatório Detalhado',
                      icon: FileText,
                      desc: 'Gere relatório completo em PDF',
                    },
                  ].map((report, idx) => {
                    const Icon = report.icon;
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        className="h-24 flex flex-col items-center justify-center gap-2"
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-sm text-center">{report.title}</span>
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
