import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DocumentViewer } from "@/components/DocumentViewer";
import { SignatureModal } from "@/components/SignatureModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, FileText, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDigitalSignature } from "@/hooks/useDigitalSignature";

export function SignContracts() {
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const { signDocument } = useDigitalSignature();

  const documentsQuery = trpc.documents.list.useQuery({ category: "Contratual" });
  const signaturesQuery = trpc.digitalSignature.getSignatures.useQuery(
    { documentId: selectedContract?.id ?? 0 },
    { enabled: !!selectedContract?.id }
  );

  const contracts = documentsQuery.data ?? [];

  const handleSignContract = async (contractId: number, signatureData: any) => {
    const selected = contracts.find((item) => item.id === contractId);
    if (!selected) return;

    const response = await fetch(`/api/blob/proxy?url=${encodeURIComponent(selected.fileUrl)}`, { credentials: "include" });
    const fileBytes = Array.from(new Uint8Array(await response.arrayBuffer()));

    await signDocument.mutateAsync({
      documentId: selected.id,
      documentContent: fileBytes,
      cpf: signatureData.cpf,
      signerName: signatureData.signerName,
      signerEmail: signatureData.signerEmail,
      signatureMethod: signatureData.signatureMethod,
    });

    await documentsQuery.refetch();
    setIsSignatureModalOpen(false);
    setSelectedContract(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Assinatura de Contratos</h1>
          <p className="text-muted-foreground mt-2">
            Os contratos agora são carregados a partir do GED contratual.
          </p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Contratos ({contracts.length})
            </TabsTrigger>
            <TabsTrigger value="signed" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Visualização
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {contracts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum documento contratual encontrado</p>
                </CardContent>
              </Card>
            ) : (
              contracts.map((contract) => (
                <Card key={contract.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{contract.documentName}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">Contrato</Badge>
                          <Badge variant="outline">{contract.fileType || "arquivo"}</Badge>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedContract(contract);
                          setIsSignatureModalOpen(true);
                        }}
                        className="gap-2"
                      >
                        Assinar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>Funcionário ID: {contract.employeeId}</p>
                    <p>CPF relacionado: {contract.cpf}</p>
                    <p>Enviado em: {new Date(contract.uploadedAt).toLocaleDateString("pt-BR")}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="signed" className="space-y-4">
            {!selectedContract ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Selecione um contrato na aba anterior para visualizar detalhes
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-base">{selectedContract.documentName}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">Contrato</Badge>
                        <Badge className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {signaturesQuery.data?.length ? "Assinado" : "Sem assinatura"}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(`/api/blob/proxy?url=${encodeURIComponent(selectedContract.fileUrl)}`, "_blank")}
                    >
                      <Download className="w-4 h-4" />
                      Abrir arquivo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Assinaturas registradas: {signaturesQuery.data?.length ?? 0}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {selectedContract ? (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Visualização do Documento</h2>
            <DocumentViewer
              documentName={selectedContract.documentName}
              documentType="contract"
              documentContent={`Documento armazenado em: ${selectedContract.fileUrl}\n\nTipo: ${selectedContract.fileType ?? "n/a"}\nTamanho: ${selectedContract.fileSize ?? "n/a"} bytes`}
              signatureStatus={signaturesQuery.data?.length ? "signed" : "unsigned"}
              createdAt={new Date(selectedContract.uploadedAt)}
              expiresAt={selectedContract.expiryDate ? new Date(selectedContract.expiryDate) : undefined}
              signerInfo={(signaturesQuery.data ?? []).map((signature) => ({
                name: signature.signerName,
                cpf: signature.cpf,
                signedAt: new Date(signature.signatureTimestamp),
              }))}
            />
          </div>
        ) : null}
      </div>

      {selectedContract ? (
        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => {
            setIsSignatureModalOpen(false);
            setSelectedContract(null);
          }}
          onSign={(data) => handleSignContract(selectedContract.id, data)}
          documentName={selectedContract.documentName}
          documentType="contract"
          isLoading={signDocument.isPending}
        />
      ) : null}
    </DashboardLayout>
  );
}
