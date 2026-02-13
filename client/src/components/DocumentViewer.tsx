import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface DocumentViewerProps {
  documentName: string;
  documentType: 'contract' | 'aso' | 'pgr';
  documentContent: string;
  signatureStatus?: 'unsigned' | 'signed' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
  signerInfo?: {
    name: string;
    cpf: string;
    signedAt: Date;
  }[];
}

export function DocumentViewer({
  documentName,
  documentType,
  documentContent,
  signatureStatus = 'unsigned',
  createdAt,
  expiresAt,
  signerInfo,
}: DocumentViewerProps) {
  const getDocumentTypeIcon = () => {
    const icons = {
      contract: '📋',
      aso: '🏥',
      pgr: '⚠️',
    };
    return icons[documentType];
  };

  const getDocumentTypeLabel = () => {
    const labels = {
      contract: 'Contrato',
      aso: 'Atestado de Saúde Ocupacional',
      pgr: 'Programa de Gestão de Riscos',
    };
    return labels[documentType];
  };

  const getStatusBadge = () => {
    const statusConfig = {
      unsigned: { label: 'Não Assinado', variant: 'secondary' as const, icon: AlertCircle },
      signed: { label: 'Assinado', variant: 'default' as const, icon: CheckCircle2 },
      expired: { label: 'Expirado', variant: 'destructive' as const, icon: AlertCircle },
    };
    const config = statusConfig[signatureStatus];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const isExpired = expiresAt && new Date() > expiresAt;

  return (
    <Card className="border-2">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-3xl">{getDocumentTypeIcon()}</div>
            <div className="flex-1">
              <CardTitle className="text-lg">{documentName}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{getDocumentTypeLabel()}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {getStatusBadge()}
            {isExpired && (
              <Badge variant="destructive" className="gap-1">
                <Lock className="w-3 h-3" />
                Expirado
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Document Metadata */}
      <div className="border-b bg-gray-50 px-6 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Criado em</p>
            <p className="font-medium">{createdAt.toLocaleDateString('pt-BR')}</p>
          </div>
          {expiresAt && (
            <div>
              <p className="text-muted-foreground">Válido até</p>
              <p className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>
                {expiresAt.toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">Assinaturas</p>
            <p className="font-medium">{signerInfo?.length || 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{signatureStatus}</p>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <CardContent className="p-6">
        <div className="prose prose-sm max-w-none">
          <div className="bg-white border rounded-lg p-6 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed font-sans">
            {documentContent}
          </div>
        </div>
      </CardContent>

      {/* Signature History */}
      {signerInfo && signerInfo.length > 0 && (
        <div className="border-t bg-gray-50 px-6 py-4">
          <h3 className="font-semibold text-sm mb-3">Histórico de Assinaturas</h3>
          <div className="space-y-2">
            {signerInfo.map((signer, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded border">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{signer.name}</p>
                  <p className="text-xs text-muted-foreground">CPF: {signer.cpf}</p>
                  <p className="text-xs text-muted-foreground">
                    Assinado em {signer.signedAt.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="border-t bg-blue-50 px-6 py-3">
        <p className="text-xs text-blue-900">
          ℹ️ Este documento é protegido por assinatura digital com presunção legal de veracidade conforme Lei nº
          14.063/2020. Alterações após assinatura são detectadas automaticamente.
        </p>
      </div>
    </Card>
  );
}
