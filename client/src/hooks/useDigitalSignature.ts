import { trpc } from "@/lib/trpc";

export function useDigitalSignature() {
  const utils = trpc.useUtils();

  const signDocument = trpc.digitalSignature.sign.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.digitalSignature.getSignatures.invalidate(),
        utils.digitalSignature.getStatus.invalidate(),
        utils.auditCpf.getByCpf.invalidate(),
        utils.auditCpf.getStatsByCpf.invalidate(),
      ]);
    },
  });

  return {
    signDocument,
    getDocumentSignatures: trpc.digitalSignature.getSignatures.useQuery,
    getDocumentStatus: trpc.digitalSignature.getStatus.useQuery,
    exportCertificate: trpc.digitalSignature.exportCertificate.useQuery,
    getSignaturesByCpf: trpc.auditCpf.getByCpf.useQuery,
    getStatsByCpf: trpc.auditCpf.getStatsByCpf.useQuery,
  };
}
