import crypto from 'crypto';
import { getDb, createAuditEntry } from '../db';
import { digitalSignatures, documents } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Serviço de Assinatura Digital com integração Gov.br
 * Implementa PKCS#7 com SHA-256 para documentos críticos
 */

export interface SignatureRequest {
  documentId: number;
  cpf: string;
  signerName: string;
  signerEmail: string;
  documentContent: Buffer;
  signatureMethod: 'PIN' | 'BIOMETRIC' | 'CERTIFICATE';
  ipAddress?: string;
  userAgent?: string;
}

export interface SignatureResponse {
  signatureId: number;
  documentHash: string;
  signatureHash: string;
  timestamp: Date;
  isValid: boolean;
}

/**
 * Calcular hash SHA-256 do documento
 */
export function calculateDocumentHash(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Simular assinatura PKCS#7 (em produção, usar API Gov.br)
 * Em produção, isso seria chamada à API: https://assinatura-api.iti.br/externo/v2/assinarPKCS7
 */
export function signDocumentHash(documentHash: string, signerCpf: string): string {
  // Em produção, isso seria a resposta da API Gov.br
  // Por enquanto, simulamos com HMAC-SHA256
  const hmac = crypto.createHmac('sha256', signerCpf);
  hmac.update(documentHash);
  return hmac.digest('hex');
}

/**
 * Validar integridade da assinatura
 */
export function validateSignature(
  documentHash: string,
  signatureHash: string,
  signerCpf: string
): boolean {
  const expectedSignature = signDocumentHash(documentHash, signerCpf);
  return signatureHash === expectedSignature;
}

/**
 * Criar assinatura digital para documento
 */
export async function createDigitalSignature(
  request: SignatureRequest
): Promise<SignatureResponse> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Validar documento existe
  const doc = await db
    .select()
    .from(documents)
    .where(eq(documents.id, request.documentId))
    .limit(1);

  if (!doc || doc.length === 0) {
    throw new Error('Documento não encontrado');
  }

  // Calcular hash do documento
  const documentHash = calculateDocumentHash(request.documentContent);

  // Assinar hash (em produção, chamar API Gov.br)
  const signatureHash = signDocumentHash(documentHash, request.cpf);

  // Salvar assinatura no banco
  const result = await db.insert(digitalSignatures).values({
    documentId: request.documentId,
    cpf: request.cpf,
    signerName: request.signerName,
    signerEmail: request.signerEmail,
    documentHash,
    signatureHash,
    signatureTimestamp: new Date(),
    signatureMethod: request.signatureMethod,
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    isValid: true,
  });

  // Registrar em auditoria
  await createAuditEntry({
    cpf: request.cpf,
    userId: undefined,
    action: 'SIGN',
    resource: 'documents',
    resourceId: request.documentId,
    description: `Documento assinado digitalmente por ${request.signerName}`,
    timestamp: new Date(),
    ipAddress: request.ipAddress,
    userAgent: request.userAgent,
    changesBefore: { status: 'unsigned' },
    changesAfter: { status: 'signed', signatureHash },
  });

  return {
    signatureId: result[0].insertId,
    documentHash,
    signatureHash,
    timestamp: new Date(),
    isValid: true,
  };
}

/**
 * Validar assinatura de documento
 */
export async function validateDocumentSignature(
  documentId: number,
  documentContent: Buffer
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Buscar assinatura do documento
  const signatures = await db
    .select()
    .from(digitalSignatures)
    .where(eq(digitalSignatures.documentId, documentId));

  if (!signatures || signatures.length === 0) {
    return false; // Documento não assinado
  }

  // Validar todas as assinaturas
  for (const sig of signatures) {
    const documentHash = calculateDocumentHash(documentContent);

    // Verificar se hash corresponde
    if (sig.documentHash !== documentHash) {
      // Documento foi alterado após assinatura
      await db
        .update(digitalSignatures)
        .set({ isValid: false, validationTimestamp: new Date() })
        .where(eq(digitalSignatures.id, sig.id));
      return false;
    }

    // Validar assinatura
    const isValid = validateSignature(sig.documentHash, sig.signatureHash, sig.cpf);
    if (!isValid) {
      await db
        .update(digitalSignatures)
        .set({ isValid: false, validationTimestamp: new Date() })
        .where(eq(digitalSignatures.id, sig.id));
      return false;
    }
  }

  return true;
}

/**
 * Listar assinaturas de um documento
 */
export async function getDocumentSignatures(documentId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(digitalSignatures)
    .where(eq(digitalSignatures.documentId, documentId));
}

/**
 * Exportar certificado de assinatura (para LGPD/compliance)
 */
export async function exportSignatureCertificate(documentId: number) {
  const signatures = await getDocumentSignatures(documentId);

  return {
    documentId,
    totalSignatures: signatures.length,
    signatures: signatures.map(sig => ({
      signerName: sig.signerName,
      signerEmail: sig.signerEmail,
      cpf: sig.cpf,
      signatureTimestamp: sig.signatureTimestamp,
      signatureMethod: sig.signatureMethod,
      isValid: sig.isValid,
      documentHash: sig.documentHash,
    })),
    exportDate: new Date().toISOString(),
  };
}
