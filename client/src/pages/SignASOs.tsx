import React, { useState } from "react";
import { Buffer } from "buffer";
import DashboardLayout from "@/components/DashboardLayout";
import { DocumentViewer } from "@/components/DocumentViewer";
import { SignatureModal } from "@/components/SignatureModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, FileText, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDigitalSignature } from "@/hooks/useDigitalSignature";

export function SignASOs() {
  const [selectedASO, setSelectedASO] = useState<any | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const { signDocument } = useDigitalSignature();

  const documentsQuery = trpc.documents.list.useQuery({ category: "Saúde e Segurança" });
  const signaturesQuery = trpc.digitalSignature.getSignatures.useQuery(
    { documentId: selectedASO?.id ?? 0 },
    { enabled: !!selectedASO?.id }
  );

  const asos = (documentsQuery.data ?? []).filter((document) =>
    document.documentName.toLowerCase().includes("aso")
  );

  const handleSignASO = async (asoId: number, signatureData: any) => {
    const selected = asos.find((item) => item.id === asoId);
    if (!selected) return;

    const response = await fetch(selected.fileUrl);
    const fileBuffer = Buffer.from(await response.arrayBuffer());

    await signDocument.mutateAsync({
      documentId: selected.id,
      documentContent: fileBuffer,
      cpf: signatureData.cpf,
      signerName: signatureData.signerName,
      signerEmail: signatureData.signerEmail,
      signatureMethod: signatureData.signatureMethod,
    });

    await documentsQuery.refetch();
    setIsSignatureModalOpen(false);
    setSelectedASO(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Atestados de Saúde Ocupacional</h1>
          <p className="text-muted-foreground mt-2">
            Os documentos do GED de saúde e segurança com nome contendo ASO são assináveis aqui.
          </p>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              ASOs ({asos.length})
            </TabsTrigger>
            <TabsTrigger value="signed" className="gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Visualização
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {asos.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum ASO encontrado no GED</p>
                </CardContent>
              </Card>
            ) : (
              asos.map((aso) => (
                <Card key={aso.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{aso.documentName}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary">ASO</Badge>
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="w-3 h-3" />
                            Válido até {aso.expiryDate ? new Date(aso.expiryDate).toLocaleDateString("pt-BR") : "n/a"}
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
                        Assinar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    <p>CPF: {aso.cpf}</p>
                    <p>Funcionário ID: {aso.employeeId}</p>
                    <p>Criado em: {new Date(aso.uploadedAt).toLocaleDateString("pt-BR")}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="signed" className="space-y-4">
            {!selectedASO ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Selecione um ASO para visualizar detalhes</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-base">{selectedASO.documentName}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary">ASO</Badge>
                        <Badge className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {signaturesQuery.data?.length ? "Assinado" : "Sem assinatura"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>CPF: {selectedASO.cpf}</p>
                  <p>Assinaturas: {signaturesQuery.data?.length ?? 0}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {selectedASO ? (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Visualização do ASO</h2>
            <DocumentViewer
              documentName={selectedASO.documentName}
              documentType="aso"
              documentContent={`Documento armazenado em: ${selectedASO.fileUrl}\n\nTipo: ${selectedASO.fileType ?? "n/a"}\nTamanho: ${selectedASO.fileSize ?? "n/a"} bytes`}
              signatureStatus={signaturesQuery.data?.length ? "signed" : "unsigned"}
              createdAt={new Date(selectedASO.uploadedAt)}
              expiresAt={selectedASO.expiryDate ? new Date(selectedASO.expiryDate) : undefined}
              signerInfo={(signaturesQuery.data ?? []).map((signature) => ({
                name: signature.signerName,
                cpf: signature.cpf,
                signedAt: new Date(signature.signatureTimestamp),
              }))}
            />
          </div>
        ) : null}
      </div>

      {selectedASO ? (
        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => {
            setIsSignatureModalOpen(false);
            setSelectedASO(null);
          }}
          onSign={(data) => handleSignASO(selectedASO.id, data)}
          documentName={selectedASO.documentName}
          documentType="aso"
          isLoading={signDocument.isPending}
        />
      ) : null}
    </DashboardLayout>
  );
}
