import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { DocumentViewer } from '@/components/DocumentViewer';
import { SignatureModal } from '@/components/SignatureModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, FileText, Plus, Calendar } from 'lucide-react';

interface ASO {
  id: number;
  employeeName: string;
  employeeCpf: string;
  asoType: 'admissional' | 'periodico' | 'retorno' | 'demissional';
  content: string;
  status: 'unsigned' | 'signed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  doctorName: string;
  doctorCremesp: string;
  signatures?: Array<{
    name: string;
    cpf: string;
    signedAt: Date;
  }>;
}

export function SignASOs() {
  const [selectedASO, setSelectedASO] = useState<ASO | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - em produção, viria do backend
  const asos: ASO[] = [
    {
      id: 1,
      employeeName: 'João da Silva',
      employeeCpf: '123.456.789-00',
      asoType: 'admissional',
      content: `ATESTADO DE SAÚDE OCUPACIONAL - ASO
ADMISSIONAL

Paciente: João da Silva
CPF: 123.456.789-00
Cargo: Analista de Sistemas
Data do Exame: 12/02/2026

ANAMNESE:
- Sem queixa de saúde
- Sem antecedentes médicos relevantes
- Nega tabagismo e etilismo
- Sem medicações contínuas
- Sem alergias conhecidas

EXAME FÍSICO:
- Pressão Arterial: 120/80 mmHg
- Frequência Cardíaca: 72 bpm
- Frequência Respiratória: 16 rpm
- Temperatura: 36,5°C
- Peso: 75 kg
- Altura: 1,80 m
- IMC: 23,1 kg/m²

EXAME COMPLEMENTAR:
- Audiometria: Normal
- Espirometria: Normal
- Eletrocardiograma: Normal

CONCLUSÃO:
APTO para exercer as funções de Analista de Sistemas

Restrições: Nenhuma
Recomendações: Manter hábitos de vida saudável

Médico Responsável: Dr. Carlos Alberto
CREMESP: 123456
Data: 12/02/2026`,
      status: 'unsigned',
      createdAt: new Date('2026-02-12'),
      expiresAt: new Date('2027-02-12'),
      doctorName: 'Dr. Carlos Alberto',
      doctorCremesp: '123456',
    },
    {
      id: 2,
      employeeName: 'Maria dos Santos',
      employeeCpf: '987.654.321-00',
      asoType: 'periodico',
      content: `ATESTADO DE SAÚDE OCUPACIONAL - ASO
PERIÓDICO

Paciente: Maria dos Santos
CPF: 987.654.321-00
Cargo: Assistente Administrativo
Data do Exame: 10/02/2026

ANAMNESE:
- Sem queixa de saúde
- Sem antecedentes médicos relevantes
- Nega tabagismo
- Etilismo social
- Sem medicações contínuas

EXAME FÍSICO:
- Pressão Arterial: 118/78 mmHg
- Frequência Cardíaca: 70 bpm
- Frequência Respiratória: 16 rpm
- Temperatura: 36,5°C
- Peso: 65 kg
- Altura: 1,70 m
- IMC: 22,5 kg/m²

CONCLUSÃO:
APTO para exercer as funções de Assistente Administrativo

Restrições: Nenhuma
Recomendações: Continuar com atividades físicas regulares

Médico Responsável: Dra. Paula Mendes
CREMESP: 654321
Data: 10/02/2026`,
      status: 'signed',
      createdAt: new Date('2026-02-10'),
      expiresAt: new Date('2027-02-10'),
      doctorName: 'Dra. Paula Mendes',
      doctorCremesp: '654321',
      signatures: [
        {
          name: 'Dra. Paula Mendes',
          cpf: '222.333.444-55',
          signedAt: new Date('2026-02-10T14:30:00'),
        },
      ],
    },
  ];

  const handleSignASO = async (asoId: number, signatureData: any) => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('ASO assinado:', asoId, signatureData);
      setIsSignatureModalOpen(false);
      setSelectedASO(null);
    } catch (error) {
      console.error('Erro ao assinar:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getASOTypeLabel = (type: string) => {
    const labels = {
      admissional: '📋 Admissional',
      periodico: '🔄 Periódico',
      retorno: '🔙 Retorno',
      demissional: '👋 Demissional',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const unsignedASOs = asos.filter(a => a.status === 'unsigned');
  const signedASOs = asos.filter(a => a.status === 'signed');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Atestados de Saúde Ocupacional (ASOs)</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie e assine ASOs de admissão, periódicos, retorno e demissão
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo ASO
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Pendentes ({unsignedASOs.length})
            </TabsTrigger>
            <TabsTrigger value="signed" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Assinados ({signedASOs.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending ASOs */}
          <TabsContent value="pending" className="space-y-4">
            {unsignedASOs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum ASO pendente de assinatura</p>
                </CardContent>
              </Card>
            ) : (
              unsignedASOs.map(aso => (
                <Card key={aso.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{aso.employeeName}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary">{getASOTypeLabel(aso.asoType)}</Badge>
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Pendente
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="w-3 h-3" />
                            Válido até {aso.expiresAt.toLocaleDateString('pt-BR')}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedASO(aso);
                          setIsSignatureModalOpen(true);
                        }}
                        className="gap-2"
                      >
                        ✍️ Assinar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>CPF: {aso.employeeCpf}</p>
                    <p>Médico: {aso.doctorName} (CREMESP: {aso.doctorCremesp})</p>
                    <p>Criado em: {aso.createdAt.toLocaleDateString('pt-BR')}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Signed ASOs */}
          <TabsContent value="signed" className="space-y-4">
            {signedASOs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum ASO assinado</p>
                </CardContent>
              </Card>
            ) : (
              signedASOs.map(aso => (
                <Card key={aso.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{aso.employeeName}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary">{getASOTypeLabel(aso.asoType)}</Badge>
                          <Badge className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Assinado
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="w-3 h-3" />
                            Válido até {aso.expiresAt.toLocaleDateString('pt-BR')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>CPF: {aso.employeeCpf}</p>
                    <p>Assinado por: {aso.signatures?.[0]?.name}</p>
                    <p>Data: {aso.signatures?.[0]?.signedAt.toLocaleDateString('pt-BR')}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Selected ASO Viewer */}
        {selectedASO && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Visualização do ASO</h2>
            <DocumentViewer
              documentName={`ASO ${getASOTypeLabel(selectedASO.asoType)} - ${selectedASO.employeeName}`}
              documentType="aso"
              documentContent={selectedASO.content}
              signatureStatus={selectedASO.status}
              createdAt={selectedASO.createdAt}
              expiresAt={selectedASO.expiresAt}
              signerInfo={selectedASO.signatures}
            />
          </div>
        )}
      </div>

      {/* Signature Modal */}
      {selectedASO && (
        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => {
            setIsSignatureModalOpen(false);
            setSelectedASO(null);
          }}
          onSign={data => handleSignASO(selectedASO.id, data)}
          documentName={`ASO ${getASOTypeLabel(selectedASO.asoType)} - ${selectedASO.employeeName}`}
          documentType="aso"
          isLoading={isLoading}
        />
      )}
    </DashboardLayout>
  );
}
