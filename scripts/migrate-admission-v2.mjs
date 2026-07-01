/**
 * One-time migration: upgrade admission workflow #1 from V1 to V2 catalog.
 *
 * Usage: node --env-file=.env.local scripts/migrate-admission-v2.mjs
 */
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const WORKFLOW_ID = 1;
const CATALOG_VERSION = "v1.0";

// V2 catalog items (same as server/config/admission-catalog.ts)
const CATALOG = [
  { code: "ADM_DOC_RG", title: "Copia do RG", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "manual_review", required: 0, category: "documentacao_pessoal" },
  { code: "ADM_DOC_CNH", title: "Copia da CNH", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "manual_review", required: 0, category: "documentacao_pessoal" },
  { code: "ADM_DOC_CPF", title: "Copia do CPF", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "auto_complete", required: 1, category: "documentacao_pessoal" },
  { code: "ADM_DOC_TITULO", title: "Titulo de eleitor", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "auto_complete", required: 1, category: "documentacao_pessoal" },
  { code: "ADM_DOC_CTPS", title: "CTPS (digital ou fisica)", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "auto_complete", required: 1, category: "documentacao_pessoal" },
  { code: "ADM_DOC_RESERVISTA", title: "Certificado de reservista (se aplicavel)", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "auto_complete", required: 0, category: "documentacao_pessoal" },
  { code: "ADM_DOC_PIS", title: "PIS/PASEP", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "auto_complete", required: 1, category: "documentacao_pessoal" },
  { code: "ADM_DOC_CERTIDAO", title: "Certidao de nascimento ou casamento", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "auto_complete", required: 0, category: "documentacao_pessoal" },
  { code: "ADM_DOC_ENDERECO", title: "Comprovante de residencia", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "auto_complete", required: 1, category: "documentacao_pessoal" },
  { code: "ADM_DOC_FOTO", title: "Foto 3x4", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "auto_complete", required: 0, category: "documentacao_pessoal" },
  { code: "ADM_DOC_BANCARIOS", title: "Dados bancarios / chave PIX", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "auto_complete", required: 1, category: "documentacao_pessoal" },
  { code: "ADM_SAUDE_ASO", title: "ASO Admissional", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "manual_review", required: 1, category: "saude_e_seguranca" },
  { code: "ADM_SAUDE_OS", title: "Ordem de Servico (NR-1) assinada", kind: "generate_document", documentPolicy: "required_single", templatePolicy: "recommended", templateKey: "ordem_servico_nr1", signaturePolicy: "both_required", reviewPolicy: "auto_complete", required: 1, category: "saude_e_seguranca" },
  { code: "ADM_SAUDE_EPI", title: "Ficha de entrega de EPI", kind: "upload_required", documentPolicy: "required_single", templatePolicy: "none", signaturePolicy: "employee_required", reviewPolicy: "auto_complete", required: 0, category: "saude_e_seguranca" },
  { code: "ADM_CONTRATO_CLT", title: "Contrato CLT assinado", kind: "generate_document", documentPolicy: "required_single", templatePolicy: "required", templateKey: "contrato_clt", signaturePolicy: "both_required", reviewPolicy: "auto_complete", required: 1, category: "termos_e_contratos" },
  { code: "ADM_CONTRATO_EXP", title: "Contrato de experiencia", kind: "generate_document", documentPolicy: "required_single", templatePolicy: "recommended", templateKey: "contrato_experiencia", signaturePolicy: "both_required", reviewPolicy: "auto_complete", required: 0, category: "termos_e_contratos" },
  { code: "ADM_TERMO_VT", title: "Termo de opcao de vale-transporte", kind: "generate_document", documentPolicy: "required_single", templatePolicy: "recommended", templateKey: "termo_vale_transporte", signaturePolicy: "employee_required", reviewPolicy: "auto_complete", required: 0, category: "termos_e_contratos" },
  { code: "ADM_TERMO_CONF", title: "Termo de confidencialidade", kind: "generate_document", documentPolicy: "required_single", templatePolicy: "recommended", templateKey: "termo_confidencialidade", signaturePolicy: "both_required", reviewPolicy: "auto_complete", required: 1, category: "termos_e_contratos" },
  { code: "ADM_TERMO_REG", title: "Regulamento interno (ciencia)", kind: "generate_document", documentPolicy: "required_single", templatePolicy: "recommended", templateKey: "regulamento_interno", signaturePolicy: "employee_required", reviewPolicy: "auto_complete", required: 1, category: "termos_e_contratos" },
  { code: "ADM_ESOCIAL_CAD", title: "Cadastramento no eSocial (S-2200)", kind: "external_process", documentPolicy: "none", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "manual_review", required: 1, category: "registro_obrigacoes" },
  { code: "ADM_ESOCIAL_CAGED", title: "CAGED (ate dia 7 do mes seguinte)", kind: "external_process", documentPolicy: "none", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "manual_review", required: 1, category: "registro_obrigacoes" },
  { code: "ADM_REG_LIVRO", title: "Registro em livro/ficha de empregado", kind: "manual_validation", documentPolicy: "none", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "manual_review", required: 1, category: "registro_obrigacoes" },
  { code: "ADM_TREIN_INTEG", title: "Integracao / onboarding concluido", kind: "training_or_ack", documentPolicy: "optional", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "manual_review", required: 0, category: "treinamentos" },
  { code: "ADM_TREIN_SST", title: "Treinamento SST basico (NR-1)", kind: "training_or_ack", documentPolicy: "optional", templatePolicy: "none", signaturePolicy: "none", reviewPolicy: "manual_review", required: 0, category: "treinamentos" },
];

async function migrate() {
  const conn = await mysql.createConnection(DATABASE_URL);

  try {
    // Check current state
    const [rows] = await conn.execute(
      "SELECT id, catalog_version, status FROM admission_workflows WHERE id = ?",
      [WORKFLOW_ID]
    );
    const workflow = rows[0];
    if (!workflow) {
      console.error(`Workflow #${WORKFLOW_ID} not found`);
      process.exit(1);
    }
    console.log(`Current state: catalog_version=${workflow.catalog_version}, status=${workflow.status}`);

    // Count existing checklist items
    const [existing] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM admission_checklist_items WHERE workflow_id = ?",
      [WORKFLOW_ID]
    );
    console.log(`Existing V1 checklist items: ${existing[0].cnt}`);

    await conn.beginTransaction();

    // 1. Delete old V1 checklist items
    await conn.execute(
      "DELETE FROM admission_checklist_items WHERE workflow_id = ?",
      [WORKFLOW_ID]
    );
    console.log("Deleted old V1 checklist items");

    // 2. Set catalog_version on workflow
    await conn.execute(
      "UPDATE admission_workflows SET catalog_version = ? WHERE id = ?",
      [CATALOG_VERSION, WORKFLOW_ID]
    );
    console.log(`Set catalog_version = ${CATALOG_VERSION}`);

    // 3. Insert V2 catalog items
    for (const item of CATALOG) {
      const status = item.documentPolicy === "required_single" ? "AWAITING_EVIDENCE" : "PENDING";
      await conn.execute(
        `INSERT INTO admission_checklist_items
         (workflow_id, code, category, item_description, kind, status,
          document_policy, template_policy, template_key, signature_policy,
          review_policy, required, completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          WORKFLOW_ID, item.code, item.category, item.title, item.kind, status,
          item.documentPolicy, item.templatePolicy, item.templateKey ?? null,
          item.signaturePolicy, item.reviewPolicy, item.required,
        ]
      );
    }
    console.log(`Inserted ${CATALOG.length} V2 catalog items`);

    await conn.commit();
    console.log("Migration complete!");

    // Verify
    const [newItems] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM admission_checklist_items WHERE workflow_id = ?",
      [WORKFLOW_ID]
    );
    console.log(`V2 checklist items: ${newItems[0].cnt}`);

  } catch (err) {
    await conn.rollback();
    console.error("Migration failed, rolled back:", err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

migrate();
