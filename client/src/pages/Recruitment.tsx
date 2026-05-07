import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, FileText, CheckCircle2, Clock, Users, Loader2, AlertCircle, Sparkles, Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Recruitment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('vagas');
  const [parsedResume, setParsedResume] = useState<any>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: '',
    level: '' as '' | 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista' | 'Coordenação' | 'Gerência',
    department: '',
    requirements: '',
    responsibilities: '',
    benefits: '',
  });
  const [generatedDescription, setGeneratedDescription] = useState('');

  const parseResumeMutation = trpc.ai.parseResume.useMutation({
    onSuccess: (data) => {
      setParsedResume(data);
      toast.success('Currículo extraído com sucesso');
      setParseLoading(false);
    },
    onError: (err) => {
      toast.error('Falha ao extrair currículo: ' + err.message);
      setParseLoading(false);
    },
  });

  const generateDescMutation = trpc.ai.generateJobDescription.useMutation({
    onSuccess: (data) => {
      setGeneratedDescription(data.description);
      toast.success('Descrição gerada');
    },
    onError: (err) => {
      toast.error('Falha ao gerar descrição: ' + err.message);
    },
  });

  const handlePdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Selecione um arquivo PDF');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('PDF excede 8MB');
      return;
    }
    setParseLoading(true);
    setParsedResume(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] || '';
      parseResumeMutation.mutate({ pdfBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  // Buscar vagas do banco
  const { data: jobsData, isLoading: jobsLoading } = trpc.positions.list.useQuery(undefined);
  const jobOpenings = (jobsData as any)?.data || [];

  // Buscar candidatos do banco (mock - seria um endpoint real)
  const candidates: any[] = [];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: any }> = {
      'Aberta': { label: '📢 Aberta', variant: 'default' },
      'Em Andamento': { label: '⏳ Em Andamento', variant: 'secondary' },
      'Fechada': { label: '✓ Fechada', variant: 'secondary' },
      'Cancelada': { label: '✗ Cancelada', variant: 'destructive' },
    };
    return config[status] || { label: status, variant: 'outline' };
  };

  const filteredJobs = useMemo(() => {
    return jobOpenings.filter((job: any) =>
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [jobOpenings, searchTerm]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c: any) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [candidates, searchTerm]);

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vagas">Vagas</TabsTrigger>
            <TabsTrigger value="candidatos">Candidatos</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="ai" className="gap-1"><Sparkles className="w-3.5 h-3.5" />IA</TabsTrigger>
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
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Carregando vagas...
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">Nenhuma vaga encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredJobs.map((job: any) => (
                      <div key={job.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{job.title}</h3>
                            <p className="text-sm text-muted-foreground">{job.department || 'Sem departamento'}</p>
                          </div>
                          <Badge variant="default">Aberta</Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Cargo</p>
                            <p className="font-medium">{job.title}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Salário</p>
                            <p className="font-medium">
                              {job.baseSalary ? `R$ ${Number(job.baseSalary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Departamento</p>
                            <p className="font-medium">{job.department || '---'}</p>
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
                )}
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

          {/* AI Tools Tab */}
          <TabsContent value="ai" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Resume parser */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="w-4 h-4" />
                    Importar candidato de PDF
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Envie um currículo em PDF (máx. 8MB). A IA extrai nome, contato,
                    experiência, formação e skills.
                  </p>
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfSelect}
                    disabled={parseLoading}
                  />
                  {parseLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extraindo dados do PDF...
                    </div>
                  )}
                  {parsedResume && (
                    <div className="rounded-md border bg-muted/40 p-3 space-y-1 text-sm">
                      <p><strong>Nome:</strong> {parsedResume.name}</p>
                      {parsedResume.email && <p><strong>Email:</strong> {parsedResume.email}</p>}
                      {parsedResume.phone && <p><strong>Telefone:</strong> {parsedResume.phone}</p>}
                      {parsedResume.cpf && <p><strong>CPF:</strong> {parsedResume.cpf}</p>}
                      {parsedResume.summary && <p className="text-muted-foreground italic">{parsedResume.summary}</p>}
                      {parsedResume.skills?.length > 0 && (
                        <p><strong>Skills:</strong> {parsedResume.skills.join(', ')}</p>
                      )}
                      {parsedResume.experience?.length > 0 && (
                        <div>
                          <strong>Experiência:</strong>
                          <ul className="list-disc list-inside text-xs mt-1">
                            {parsedResume.experience.slice(0, 3).map((exp: any, i: number) => (
                              <li key={i}>{exp.role} @ {exp.company} {exp.period && `(${exp.period})`}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Job description generator */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="w-4 h-4" />
                    Gerar descrição de vaga
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Título da vaga *</Label>
                    <Input
                      value={jobForm.title}
                      onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                      placeholder="Ex: Analista de RH Pleno"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Nível</Label>
                      <Select
                        value={jobForm.level}
                        onValueChange={(v) => setJobForm({ ...jobForm, level: v as any })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {['Júnior', 'Pleno', 'Sênior', 'Especialista', 'Coordenação', 'Gerência'].map((l) => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Departamento</Label>
                      <Input
                        value={jobForm.department}
                        onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Requisitos básicos</Label>
                    <Textarea
                      rows={2}
                      value={jobForm.requirements}
                      onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                      placeholder="Ex: Excel avançado, eSocial, 3+ anos experiência"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (!jobForm.title) {
                        toast.error('Informe o título da vaga');
                        return;
                      }
                      generateDescMutation.mutate({
                        title: jobForm.title,
                        level: jobForm.level || undefined,
                        department: jobForm.department || undefined,
                        requirements: jobForm.requirements || undefined,
                        responsibilities: jobForm.responsibilities || undefined,
                        benefits: jobForm.benefits || undefined,
                      });
                    }}
                    disabled={generateDescMutation.isPending}
                    className="w-full"
                  >
                    {generateDescMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 mr-2" />Gerar com IA</>
                    )}
                  </Button>
                  {generatedDescription && (
                    <div className="rounded-md border bg-muted/40 p-3 max-h-96 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-sans">{generatedDescription}</pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
