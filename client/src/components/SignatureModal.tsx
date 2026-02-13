import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (data: SignatureData) => Promise<void>;
  documentName: string;
  documentType: 'contract' | 'aso' | 'pgr';
  isLoading?: boolean;
}

export interface SignatureData {
  cpf: string;
  signerName: string;
  signerEmail: string;
  signatureMethod: 'PIN' | 'BIOMETRIC' | 'CERTIFICATE';
  pin?: string;
}

export function SignatureModal({
  isOpen,
  onClose,
  onSign,
  documentName,
  documentType,
  isLoading = false,
}: SignatureModalProps) {
  const [formData, setFormData] = useState<SignatureData>({
    cpf: '',
    signerName: '',
    signerEmail: '',
    signatureMethod: 'PIN',
    pin: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: keyof SignatureData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.cpf.match(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)) {
      setError('CPF inválido. Use formato: 123.456.789-00');
      return false;
    }
    if (!formData.signerName.trim()) {
      setError('Nome do signatário é obrigatório');
      return false;
    }
    if (!formData.signerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Email inválido');
      return false;
    }
    if (formData.signatureMethod === 'PIN' && (!formData.pin || formData.pin.length < 4)) {
      setError('PIN deve ter no mínimo 4 dígitos');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSign(formData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setFormData({
          cpf: '',
          signerName: '',
          signerEmail: '',
          signatureMethod: 'PIN',
          pin: '',
        });
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao assinar documento');
    }
  };

  const getDocumentTypeLabel = () => {
    const labels = {
      contract: 'Contrato',
      aso: 'Atestado de Saúde Ocupacional (ASO)',
      pgr: 'Programa de Gestão de Riscos (PGR)',
    };
    return labels[documentType];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-lg">✍️ Assinar Documento</span>
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
            <div className="text-center">
              <p className="font-semibold text-lg">Assinatura realizada com sucesso!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Documento assinado e registrado em auditoria
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Document Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">Documento a assinar:</p>
              <p className="text-sm text-blue-800 mt-1">{getDocumentTypeLabel()}</p>
              <p className="text-xs text-blue-700 mt-1 truncate">{documentName}</p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* CPF Field */}
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF do Signatário *</Label>
              <Input
                id="cpf"
                placeholder="123.456.789-00"
                value={formData.cpf}
                onChange={e => handleInputChange('cpf', e.target.value)}
                disabled={isLoading}
                maxLength={14}
              />
              <p className="text-xs text-muted-foreground">
                Será usado para rastreabilidade e auditoria
              </p>
            </div>

            {/* Signer Name */}
            <div className="space-y-2">
              <Label htmlFor="signerName">Nome Completo *</Label>
              <Input
                id="signerName"
                placeholder="João Silva"
                value={formData.signerName}
                onChange={e => handleInputChange('signerName', e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="signerEmail">Email *</Label>
              <Input
                id="signerEmail"
                type="email"
                placeholder="joao@empresa.com"
                value={formData.signerEmail}
                onChange={e => handleInputChange('signerEmail', e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Signature Method */}
            <div className="space-y-2">
              <Label htmlFor="signatureMethod">Método de Assinatura *</Label>
              <Select
                value={formData.signatureMethod}
                onValueChange={value =>
                  handleInputChange('signatureMethod', value as 'PIN' | 'BIOMETRIC' | 'CERTIFICATE')
                }
              >
                <SelectTrigger id="signatureMethod" disabled={isLoading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIN">PIN (4 dígitos)</SelectItem>
                  <SelectItem value="BIOMETRIC">Biometria</SelectItem>
                  <SelectItem value="CERTIFICATE">Certificado Digital (Gov.br)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* PIN Field (conditional) */}
            {formData.signatureMethod === 'PIN' && (
              <div className="space-y-2">
                <Label htmlFor="pin">PIN de Confirmação *</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="••••"
                  value={formData.pin}
                  onChange={e => handleInputChange('pin', e.target.value)}
                  disabled={isLoading}
                  maxLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 4 dígitos para confirmar a assinatura
                </p>
              </div>
            )}

            {/* Legal Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-900">
                ⚖️ <strong>Aviso Legal:</strong> Ao assinar, você confirma que leu e concorda com os termos do
                documento. Esta assinatura tem presunção legal de veracidade conforme Lei nº 14.063/2020.
              </p>
            </div>

            {/* Buttons */}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Assinando...
                  </>
                ) : (
                  '✓ Assinar Documento'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
