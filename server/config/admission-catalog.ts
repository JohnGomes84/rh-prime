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
  // ============================================================
  // Documentacao pessoal
  // ============================================================
  {
    code: "ADM_DOC_RG",
    title: "Copia do RG",
    kind: "upload_required",
    documentPolicy: "required_single",
    templatePolicy: "none",
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    required: false, // RG ou CNH: pelo menos um deve ser anexado
    waivable: true,
    category: "documentacao_pessoal",
  },
  {
    code: "ADM_DOC_CNH",
    title: "Copia da CNH",
    kind: "upload_required",
    documentPolicy: "required_single",
    templatePolicy: "none",
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    required: false, // RG ou CNH: pelo menos um deve ser anexado
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
    title: "Comprovante de residencia atualizado",
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
    code: "ADM_DOC_CERT_CIVIL",
    title: "Certidao de nascimento ou casamento",
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
    code: "ADM_DOC_TITULO",
    title: "Titulo de eleitor",
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
    code: "ADM_DOC_RESERVISTA",
    title: "Certificado de reservista (homens)",
    kind: "upload_required",
    documentPolicy: "required_single",
    templatePolicy: "none",
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    required: false,
    waivable: true,
    category: "documentacao_pessoal",
  },

  // ============================================================
  // Documentacao trabalhista
  // ============================================================
  {
    code: "ADM_DOC_CTPS",
    title: "Carteira de Trabalho Digital (CPF)",
    kind: "upload_required",
    documentPolicy: "required_single",
    templatePolicy: "none",
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    required: true,
    waivable: true,
    category: "documentacao_trabalhista",
  },
  {
    code: "ADM_DOC_PIS",
    title: "Numero do PIS/PASEP (se possuir)",
    kind: "manual_validation",
    documentPolicy: "optional",
    templatePolicy: "none",
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    required: false,
    waivable: true,
    category: "documentacao_trabalhista",
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

  // ============================================================
  // Saude e seguranca
  // ============================================================
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

  // ============================================================
  // Dados bancarios
  // ============================================================
  {
    code: "ADM_DADOS_BANCARIOS",
    title: "Dados bancarios (Banco, agencia, conta e Pix)",
    kind: "manual_validation",
    documentPolicy: "optional",
    templatePolicy: "none",
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    required: true,
    waivable: true,
    category: "dados_bancarios",
  },

  // ============================================================
  // Beneficios
  // ============================================================
  {
    code: "ADM_TERM_VT",
    title: "Termo de opcao do Vale-Transporte",
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

  // ============================================================
  // Dependentes (se houver)
  // ============================================================
  {
    code: "ADM_DEPENDENTES",
    title: "Dependentes: CPF e certidao de nascimento",
    kind: "upload_required",
    documentPolicy: "optional",
    templatePolicy: "none",
    signaturePolicy: "none",
    reviewPolicy: "manual_review",
    required: false,
    waivable: true,
    category: "dependentes",
  },

  // ============================================================
  // Ficha cadastral (gerar ou anexar)
  // ============================================================
  {
    code: "ADM_FICHA_CADASTRAL",
    title: "Ficha cadastral (gerar pelo sistema ou anexar preenchida)",
    kind: "generate_document",
    documentPolicy: "required_single",
    templatePolicy: "recommended",
    templateKey: "ficha_cadastral",
    signaturePolicy: "employee_required",
    reviewPolicy: "manual_review",
    required: true,
    waivable: true,
    category: "ficha_cadastral",
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
