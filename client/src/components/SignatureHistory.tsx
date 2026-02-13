import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Signature {
  id: number;
  documentName: string;
  documentType: 'contract' | 'aso' | 'pgr';
  signerName: string;
  signerCpf: string;
  signedAt: Date;
  isValid: boolean;
  signatureHash: string;
}

interface SignatureHistoryProps {
  signatures: Signature[];
  onViewDetails?: (signature: Signature) => void;
  onDownload?: (signature: Signature) => void;
}

export function SignatureHistory({
  signatures,
  onViewDetails,
  onDownload,
}: SignatureHistoryProps) {
  const getDocumentTypeLabel = (type: string) => {
    const labels = {
      contract: '📋 Contrato',
      aso: '🏥 ASO',
      pgr: '⚠️ PGR',
    };
    return labels[type as keyof typeof labels] || type;
  };

  if (signatures.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhuma assinatura registrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Histórico de Assinaturas ({signatures.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {signatures.map(sig => (
            <div
              key={sig.id}
              className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{sig.documentName}</h4>
                  <Badge variant="outline" className="text-xs">
                    {getDocumentTypeLabel(sig.documentType)}
                  </Badge>
                  {sig.isValid ? (
                    <Badge className="gap-1 text-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      Válida
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      Inválida
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Assinado por: <strong>{sig.signerName}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  CPF: {sig.signerCpf} • {sig.signedAt.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                  Hash: {sig.signatureHash.substring(0, 32)}...
                </p>
              </div>
              <div className="flex gap-2">
                {onViewDetails && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(sig)}
                    className="gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Detalhes</span>
                  </Button>
                )}
                {onDownload && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload(sig)}
                    className="gap-1"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
