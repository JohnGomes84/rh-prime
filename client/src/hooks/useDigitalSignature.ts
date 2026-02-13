import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface SignatureParams {
  documentId: number;
  documentContent: Buffer;
  cpf: string;
  signerName: string;
  signerEmail: string;
  signatureMethod: 'PIN' | 'BIOMETRIC' | 'CERTIFICATE';
  pin?: string;
}

export function useDigitalSignature() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signDocument = async (params: SignatureParams) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validar CPF
      if (!params.cpf.match(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)) {
        throw new Error('CPF inválido');
      }

      // Chamar backend
      const result = await trpc.digitalSignature.sign.useMutation().mutateAsync({
        documentId: params.documentId,
        documentContent: params.documentContent,
        cpf: params.cpf,
        signerName: params.signerName,
        signerEmail: params.signerEmail,
        signatureMethod: params.signatureMethod,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao assinar documento';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const validateSignature = async (documentId: number, documentContent: Buffer) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await trpc.digitalSignature.validate.useQuery({
        documentId,
        documentContent,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao validar assinatura';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getSignatures = async (documentId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await trpc.digitalSignature.getSignatures.useQuery({
        documentId,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao obter assinaturas';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getStatus = async (documentId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await trpc.digitalSignature.getStatus.useQuery({
        documentId,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao obter status';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const exportCertificate = async (documentId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await trpc.digitalSignature.exportCertificate.useQuery({
        documentId,
      });

      // Gerar JSON para download
      const json = JSON.stringify(result, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado-assinatura-${documentId}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao exportar certificado';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    signDocument,
    validateSignature,
    getSignatures,
    getStatus,
    exportCertificate,
  };
}
