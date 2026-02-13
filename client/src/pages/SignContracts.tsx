import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { DocumentViewer } from '@/components/DocumentViewer';
import { SignatureModal } from '@/components/SignatureModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, FileText, Download } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Contract {
  id: number;
  name: string;
  type: 'contract' | 'aso' | 'pgr';
  content: string;
  status: 'unsigned' | 'signed' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  employeeId: number;
  employeeName: string;
  employeeCpf: string;
  signatures?: Array<{
    name: string;
    cpf: string;
    signedAt: Date;
  }>;
}

export function SignContracts() {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data - em produção, viria do backend
  const contracts: Contract[] = [
    {
      id: 1,
      name: 'Contrato de Trabalho - João Silva',
      type: 'contract',
      content: `CONTRATO DE TRABALHO

Celebrado entre:
EMPRESA: ML Serviços Ltda.
CNPJ: 12.345.678/0001-99

EMPREGADO: João da Silva
CPF: 123.456.789-00

CLÁUSULAS:
1. O empregado será admitido no cargo de Analista de Sistemas
2. Salário mensal: R$ 5.000,00
3. Jornada: 40 horas semanais
4. Benefícios: Vale refeição, vale transporte, plano de saúde
5. Período de experiência: 90 dias

Assinado digitalmente conforme Lei nº 14.063/2020`,
      status: 'unsigned',
      createdAt: new Date('2026-02-10'),
      expiresAt: new Date('2026-03-10'),
      employeeId: 1,
      employeeName: 'João Silva',
      employeeCpf: '123.456.789-00',
    },
    {
      id: 2,
      name: 'ASO - Admissional - Maria Santos',
      type: 'aso',
      content: `ATESTADO DE SAÚDE OCUPACIONAL - ASO

Paciente: Maria dos Santos
CPF: 987.654.321-00
Data do Exame: 10/02/2026

ANAMNESE:
- Sem queixa de saúde
- Sem antecedentes médicos relevantes
- Sem medicações contínuas

EXAME FÍSICO:
- Pressão Arterial: 120/80 mmHg
- Frequência Cardíaca: 72 bpm
- Peso: 65 kg
- Altura: 1,70 m

CONCLUSÃO:
APTO para exercer as funções de Assistente Administrativo

Médico Responsável: Dr. Carlos Alberto
CREMESP: 123456`,
      status: 'signed',
      createdAt: new Date('2026-02-10'),
      expiresAt: new Date('2027-02-10'),
      employeeId: 2,
      employeeName: 'Maria Santos',
      employeeCpf: '987.654.321-00',
      signatures: [
        {
          name: 'Dr. Carlos Alberto',
          cpf: '111.222.333-44',
          signedAt: new Date('2026-02-10T14:30:00'),
        },
      ],
    },
  ];

  const handleSignContract = async (contractId: number, signatureData: any) => {
    setIsLoading(true);
    try {
      // Simular chamada ao backend
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Em produção, chamar:
      // await trpc.digitalSignature.sign.mutate({
      //   documentId: contractId,
      //   documentContent: Buffer.from(selectedContract!.content),
      //   cpf: signatureData.cpf,
      //   signerName: signatureData.signerName,
      //   signerEmail: signatureData.signerEmail,
      //   signatureMethod: signatureData.signatureMethod,
      // });

      console.log('Contrato assinado:', contractId, signatureData);
      setIsSignatureModalOpen(false);
      setSelectedContract(null);
    } catch (error) {
      console.error('Erro ao assinar:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const unsignedContracts = contracts.filter(c => c.status === 'unsigned');
  const signedContracts = contracts.filter(c => c.status === 'signed');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Assinatura de Documentos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie assinaturas de contratos, ASOs e outros documentos críticos
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Pendentes ({unsignedContracts.length})
            </TabsTrigger>
            <TabsTrigger value="signed" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Assinados ({signedContracts.length})
            </TabsTrigger>
          </TabsList>

          {/* Pending Contracts */}
          <TabsContent value="pending" className="space-y-4">
            {unsignedContracts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum documento pendente de assinatura</p>
                </CardContent>
              </Card>
            ) : (
              unsignedContracts.map(contract => (
                <Card key={contract.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{contract.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">
                            {contract.type === 'contract'
                              ? '📋 Contrato'
                              : contract.type === 'aso'
                                ? '🏥 ASO'
                                : '⚠️ PGR'}
                          </Badge>
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Pendente
                          </Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedContract(contract);
                          setIsSignatureModalOpen(true);
                        }}
                        className="gap-2"
                      >
                        ✍️ Assinar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>Funcionário: {contract.employeeName}</p>
                    <p>Criado em: {contract.createdAt.toLocaleDateString('pt-BR')}</p>
                    {contract.expiresAt && (
                      <p className="text-red-600 font-medium">
                        Válido até: {contract.expiresAt.toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Signed Contracts */}
          <TabsContent value="signed" className="space-y-4">
            {signedContracts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum documento assinado</p>
                </CardContent>
              </Card>
            ) : (
              signedContracts.map(contract => (
                <Card key={contract.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{contract.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">
                            {contract.type === 'contract'
                              ? '📋 Contrato'
                              : contract.type === 'aso'
                                ? '🏥 ASO'
                                : '⚠️ PGR'}
                          </Badge>
                          <Badge className="gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Assinado
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>Funcionário: {contract.employeeName}</p>
                    <p>Assinado em: {contract.signatures?.[0]?.signedAt.toLocaleDateString('pt-BR')}</p>
                    <p>Assinante: {contract.signatures?.[0]?.name}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Selected Document Viewer */}
        {selectedContract && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Visualização do Documento</h2>
            <DocumentViewer
              documentName={selectedContract.name}
              documentType={selectedContract.type}
              documentContent={selectedContract.content}
              signatureStatus={selectedContract.status}
              createdAt={selectedContract.createdAt}
              expiresAt={selectedContract.expiresAt}
              signerInfo={selectedContract.signatures}
            />
          </div>
        )}
      </div>

      {/* Signature Modal */}
      {selectedContract && (
        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => {
            setIsSignatureModalOpen(false);
            setSelectedContract(null);
          }}
          onSign={data => handleSignContract(selectedContract.id, data)}
          documentName={selectedContract.name}
          documentType={selectedContract.type}
          isLoading={isLoading}
        />
      )}
    </DashboardLayout>
  );
}
