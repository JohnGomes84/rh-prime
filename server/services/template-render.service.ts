import { eq } from "drizzle-orm";
import { getDb } from "../db.js";
import { documentTemplates, settings, type AdmissionWorkflow } from "../../drizzle/schema.js";

const DEFAULT_COMPANY = {
  empresa_nome: "ML SERVICOS",
  empresa_cnpj: "00.000.000/0001-00",
  empresa_endereco: "(endereco da empresa)",
};

async function loadCompanyContext(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return DEFAULT_COMPANY;
  const rows = await db
    .select()
    .from(settings);
  const map: Record<string, string> = { ...DEFAULT_COMPANY };
  const KEYS: Record<string, string> = {
    company_name: "empresa_nome",
    company_cnpj: "empresa_cnpj",
    company_address: "empresa_endereco",
    company_city: "cidade",
  };
  for (const row of rows) {
    const placeholder = KEYS[row.key];
    if (placeholder && row.value) map[placeholder] = row.value;
  }
  return map;
}

function formatBrDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatMoney(value: any): string {
  if (value === null || value === undefined) return "0,00";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "0,00";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function renderTemplate(
  templateKey: string,
  workflow: AdmissionWorkflow,
): Promise<{ html: string; templateName: string }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const rows = await db
    .select()
    .from(documentTemplates)
    .where(eq(documentTemplates.machineKey, templateKey))
    .limit(1);
  const tpl = rows[0];
  if (!tpl) throw new Error(`Template not found: ${templateKey}`);

  const company = await loadCompanyContext();

  const ctx: Record<string, string> = {
    ...company,
    funcionario_nome: workflow.candidateName ?? "",
    funcionario_cpf: workflow.candidateCpf ?? "",
    funcionario_rg: "",
    funcionario_endereco: "",
    cargo: "",
    departamento: "",
    jornada_semanal: "44",
    salario: formatMoney(workflow.proposedSalary),
    salario_extenso: "",
    data_admissao: formatBrDate(workflow.proposedHireDate),
    local_trabalho: company.empresa_endereco ?? "",
    data_atual: formatBrDate(new Date()),
    cidade: company.cidade ?? "Sao Paulo",
    endereco_origem: "",
    endereco_destino: company.empresa_endereco ?? "",
    modais: "",
    qtd_passagens: "2",
    riscos_identificados: "Riscos ergonomicos, eletricos e biologicos (conforme PGR)",
  };

  let html = tpl.content;
  html = html.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, name: string) => {
    const value = ctx[name];
    return value !== undefined ? String(value) : `{{${name}}}`;
  });

  // Envelope HTML completo (head + style)
  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${tpl.templateName}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #111; line-height: 1.5; }
  h1 { font-size: 18px; margin-bottom: 24px; }
  p { margin: 8px 0; }
  ul { margin: 8px 0 8px 20px; }
  hr { margin: 16px 0; border: none; border-top: 1px solid #ccc; }
  @media print { body { margin: 0; padding: 0; } }
</style>
</head>
<body>
${html}
</body>
</html>`;

  return { html: fullHtml, templateName: tpl.templateName };
}
