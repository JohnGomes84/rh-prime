export type AdmissionItemKind =
  | "upload_required"
  | "generate_document"
  | "manual_validation"
  | "external_process"
  | "training_or_ack";

export type AdmissionDocumentPolicy = "none" | "optional" | "required_single";
export type AdmissionTemplatePolicy = "none" | "recommended" | "required";
export type AdmissionSignaturePolicy =
  | "none"
  | "employee_required"
  | "both_required";
export type AdmissionReviewPolicy = "auto_complete" | "manual_review";

export interface AdmissionCatalogItem {
  code: string;
  title: string;
  kind: AdmissionItemKind;
  documentPolicy: AdmissionDocumentPolicy;
  templatePolicy: AdmissionTemplatePolicy;
  templateKey?: string;
  signaturePolicy: AdmissionSignaturePolicy;
  reviewPolicy: AdmissionReviewPolicy;
  required: boolean;
  waivable: boolean;
  category: string;
}

export const CURRENT_CATALOG_VERSION = "v1.0";

export const ADMISSION_CATALOG_V1: AdmissionCatalogItem[] = [
  {
    code: "ADM_DOC_RG",
    title: "Copia do RG",
    kind: "upload_required",
    documentPolicy: "required_single",
    templatePolicy: "none",
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    required: true,
    waivable: true,
    category: "documentacao_pessoal",
  },
  {
    code: "ADM_DOC_CPF",
    title: "Copia do CPF",
    kind: "upload_required",
    documentPolicy: "required_single",
    templatePolicy: "none",
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    required: true,
    waivable: true,
    category: "documentacao_pessoal",
  },
  {
    code: "ADM_DOC_RESIDENCIA",
    title: "Comprovante de residencia",
    kind: "upload_required",
    documentPolicy: "required_single",
    templatePolicy: "none",
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    required: true,
    waivable: true,
    category: "documentacao_pessoal",
  },
  {
    code: "ADM_CONTRACT_CLT",
    title: "Contrato de trabalho CLT",
    kind: "generate_document",
    documentPolicy: "required_single",
    templatePolicy: "required",
    templateKey: "contract_clt",
    signaturePolicy: "both_required",
    reviewPolicy: "auto_complete",
    required: true,
    waivable: true,
    category: "documentacao_trabalhista",
  },
  {
    code: "ADM_TERM_CONFIDENTIALITY",
    title: "Termo de confidencialidade",
    kind: "generate_document",
    documentPolicy: "required_single",
    templatePolicy: "required",
    templateKey: "term_confidentiality",
    signaturePolicy: "both_required",
    reviewPolicy: "auto_complete",
    required: true,
    waivable: true,
    category: "documentacao_trabalhista",
  },
  {
    code: "ADM_TERM_VT",
    title: "Termo de vale-transporte",
    kind: "generate_document",
    documentPolicy: "required_single",
    templatePolicy: "required",
    templateKey: "term_vt",
    signaturePolicy: "employee_required",
    reviewPolicy: "auto_complete",
    required: false,
    waivable: true,
    category: "beneficios",
  },
  {
    code: "ADM_ASO_ADMISSIONAL",
    title: "ASO admissional",
    kind: "upload_required",
    documentPolicy: "required_single",
    templatePolicy: "none",
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    required: true,
    waivable: true,
    category: "saude_seguranca",
  },
  {
    code: "ADM_OS_NR1",
    title: "Ordem de servico NR-1",
    kind: "generate_document",
    documentPolicy: "required_single",
    templatePolicy: "required",
    templateKey: "os_nr1",
    signaturePolicy: "employee_required",
    reviewPolicy: "auto_complete",
    required: true,
    waivable: true,
    category: "saude_seguranca",
  },
];

export function getAdmissionCatalog(version = CURRENT_CATALOG_VERSION) {
  switch (version) {
    case "v1.0":
      return ADMISSION_CATALOG_V1;
    default:
      throw new Error(`Unsupported admission catalog version: ${version}`);
  }
}
