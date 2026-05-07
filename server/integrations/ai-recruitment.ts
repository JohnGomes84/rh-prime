import { invokeLLM, type Message } from "../_core/llm";

export interface ParsedResume {
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  linkedinUrl?: string;
  summary?: string;
  experience?: Array<{ company: string; role: string; period?: string; description?: string }>;
  education?: Array<{ institution: string; degree: string; year?: string }>;
  skills?: string[];
  languages?: string[];
}

const RESUME_SCHEMA = {
  name: "ParsedResume",
  schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Nome completo do candidato" },
      email: { type: "string" },
      phone: { type: "string" },
      cpf: { type: "string" },
      linkedinUrl: { type: "string" },
      summary: { type: "string", description: "Resumo profissional em até 280 caracteres" },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            company: { type: "string" },
            role: { type: "string" },
            period: { type: "string" },
            description: { type: "string" },
          },
          required: ["company", "role"],
        },
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            institution: { type: "string" },
            degree: { type: "string" },
            year: { type: "string" },
          },
          required: ["institution", "degree"],
        },
      },
      skills: { type: "array", items: { type: "string" } },
      languages: { type: "array", items: { type: "string" } },
    },
    required: ["name"],
  },
  strict: true,
} as const;

export async function parseResumePdf(pdfUrl: string): Promise<ParsedResume> {
  const messages: Message[] = [
    {
      role: "system",
      content:
        "Você extrai dados estruturados de currículos. Retorne JSON conforme o schema. " +
        "Se um campo não estiver presente, omita-o. Não invente informações.",
    },
    {
      role: "user",
      content: [
        { type: "text", text: "Extraia os dados do currículo anexo." },
        { type: "file_url", file_url: { url: pdfUrl, mime_type: "application/pdf" } },
      ],
    },
  ];

  const result = await invokeLLM({
    messages,
    outputSchema: RESUME_SCHEMA as any,
    maxTokens: 8192,
  });

  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM não retornou conteúdo");
  const text = typeof content === "string" ? content : content.map((p) => (p as any).text ?? "").join("");
  try {
    return JSON.parse(text) as ParsedResume;
  } catch {
    throw new Error("LLM retornou JSON inválido");
  }
}

export interface JobDescriptionInput {
  title: string;
  level?: "Júnior" | "Pleno" | "Sênior" | "Especialista" | "Coordenação" | "Gerência";
  department?: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
}

export async function generateJobDescription(input: JobDescriptionInput): Promise<string> {
  const lines: string[] = [
    `Cargo: ${input.title}`,
    input.level ? `Nível: ${input.level}` : "",
    input.department ? `Departamento: ${input.department}` : "",
    input.requirements ? `Requisitos básicos:\n${input.requirements}` : "",
    input.responsibilities ? `Responsabilidades:\n${input.responsibilities}` : "",
    input.benefits ? `Benefícios:\n${input.benefits}` : "",
  ].filter(Boolean);

  const messages: Message[] = [
    {
      role: "system",
      content:
        "Você redige descrições de vagas em português brasileiro para uma empresa de RH. " +
        "Use Markdown com seções: ## Sobre a vaga, ## Responsabilidades, ## Requisitos, " +
        "## Diferenciais, ## O que oferecemos. Tom profissional e inclusivo. Sem clichês.",
    },
    {
      role: "user",
      content: `Gere a descrição completa da vaga a partir destes dados:\n\n${lines.join("\n\n")}`,
    },
  ];

  const result = await invokeLLM({
    messages,
    maxTokens: 4096,
  });

  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM não retornou conteúdo");
  return typeof content === "string" ? content : content.map((p) => (p as any).text ?? "").join("");
}
