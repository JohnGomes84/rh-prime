export type Sector = "rh_admin" | "financeiro";
export type Cadence = "semanal" | "mensal";
export type Variant = "detalhado" | "resumido" | "mensal";

export interface TemplateItemDef {
  label: string;
  expectedContent: string;
}

export interface ReportTemplate {
  key: string;
  sector: Sector;
  cadence: Cadence;
  variant: Variant;
  title: string;
  items: TemplateItemDef[];
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    key: "rh_admin.semanal.detalhado",
    sector: "rh_admin",
    cadence: "semanal",
    variant: "detalhado",
    title: "RH Administrativo — Semanal detalhado",
    items: [
      { label: "Admissões da semana", expectedContent: "Nome, função, cliente/local, data de início e status da documentação" },
      { label: "Rescisões/desligamentos", expectedContent: "Nome, motivo, data, pendências e documentos necessários" },
      { label: "Contratos pendentes", expectedContent: "Contratos a emitir, assinar, atualizar ou regularizar" },
      { label: "Documentação pendente", expectedContent: "Colaboradores/prestadores com documentos faltando ou incompletos" },
      { label: "Controle de ponto/assinaturas", expectedContent: "Faltas de assinatura, divergências, dias pendentes, info aguardando líder/operacional" },
      { label: "Demandas administrativas recebidas", expectedContent: "Demandas da semana, status, responsável e prazo de retorno" },
      { label: "Pendências com líderes", expectedContent: "Info, assinaturas, documentos ou confirmações que dependem dos líderes operacionais" },
      { label: "Problemas da semana", expectedContent: "Atrasos, falhas, retrabalho, falta de info, documentos incorretos" },
      { label: "Prioridade da próxima semana", expectedContent: "O que precisa ser resolvido primeiro na semana seguinte" },
    ],
  },
  {
    key: "rh_admin.semanal.resumido",
    sector: "rh_admin",
    cadence: "semanal",
    variant: "resumido",
    title: "RH Administrativo — Semanal resumido",
    items: [
      { label: "Admissões realizadas", expectedContent: "Quantidade e nomes principais" },
      { label: "Desligamentos realizados", expectedContent: "Quantidade e nomes principais" },
      { label: "Contratos pendentes", expectedContent: "Quantidade e motivo da pendência" },
      { label: "Documentos pendentes", expectedContent: "Quantidade, nomes e prazo para regularização" },
      { label: "Demandas concluídas", expectedContent: "Quantidade e resumo das principais entregas" },
      { label: "Demandas em atraso", expectedContent: "Quantidade, motivo do atraso e ação necessária" },
    ],
  },
  {
    key: "rh_admin.mensal",
    sector: "rh_admin",
    cadence: "mensal",
    variant: "mensal",
    title: "RH Administrativo — Mensal",
    items: [
      { label: "Admissões do mês", expectedContent: "Quantidade total, nomes, funções, clientes/locais e datas de início" },
      { label: "Desligamentos do mês", expectedContent: "Quantidade total, nomes, motivos, clientes/locais e pendências finais" },
      { label: "Colaboradores/prestadores ativos", expectedContent: "Quantidade por cliente, setor ou operação" },
      { label: "Contratos emitidos", expectedContent: "Qtd. emitida, qtd. assinada e contratos pendentes de assinatura/ajuste" },
      { label: "Pendências documentais", expectedContent: "Quem está irregular/incompleto, com prazo de regularização" },
      { label: "Vencimento de documentos", expectedContent: "Documentos a vencer no mês: ASO, exames, certificados, treinamentos, integrações" },
      { label: "Controle de vencimentos de certidões", expectedContent: "Certidões da empresa com validade, status, responsável e prazo" },
      { label: "Atestados, faltas e ausências", expectedContent: "Quantidade, principais ocorrências e situações que exigem acompanhamento" },
      { label: "Demandas concluídas no mês", expectedContent: "Total finalizado e resumo das principais entregas" },
      { label: "Demandas pendentes p/ próximo mês", expectedContent: "Demandas em aberto, motivo, responsável e prazo previsto" },
      { label: "Problemas recorrentes", expectedContent: "Falha de documentos, atrasos, erros de info, falhas de comunicação, retrabalho" },
      { label: "Plano de melhoria", expectedContent: "Ações sugeridas para corrigir falhas e melhorar o processo" },
    ],
  },
  {
    key: "financeiro.semanal.detalhado",
    sector: "financeiro",
    cadence: "semanal",
    variant: "detalhado",
    title: "Financeiro — Semanal detalhado",
    items: [
      { label: "Notas fiscais emitidas", expectedContent: "Cliente, competência, valor, vencimento e status de envio" },
      { label: "Boletos emitidos", expectedContent: "Cliente, valor, vencimento, data de envio e confirmação" },
      { label: "Contas a receber", expectedContent: "Valores recebidos, a vencer, vencidos e pendentes de baixa" },
      { label: "Cobranças realizadas", expectedContent: "Cliente, data, forma de contato e retorno recebido" },
      { label: "Contas a pagar", expectedContent: "Pagamentos feitos, pendentes e vencimentos próximos" },
      { label: "Conciliação bancária", expectedContent: "O que foi conciliado e o que ficou pendente de identificação/baixa" },
      { label: "Medições em andamento", expectedContent: "Cliente, período, valor previsto, status de conferência e pendências" },
      { label: "Fechamento quinzenal de medição", expectedContent: "Medições fechadas, conferidas, enviadas, aguardando aprovação ou pendentes" },
      { label: "Pendências financeiras", expectedContent: "Valores sem baixa, boletos vencidos, comprovantes faltantes, divergências" },
      { label: "Prioridades da próxima semana", expectedContent: "Cobranças, emissões, pagamentos, conferências ou ajustes urgentes" },
    ],
  },
  {
    key: "financeiro.semanal.resumido",
    sector: "financeiro",
    cadence: "semanal",
    variant: "resumido",
    title: "Financeiro — Semanal resumido",
    items: [
      { label: "Total faturado na semana", expectedContent: "Valor total e principais clientes faturados" },
      { label: "Total recebido na semana", expectedContent: "Valor total recebido, clientes e datas" },
      { label: "Total em aberto", expectedContent: "A receber, separado entre a vencer e vencidos" },
      { label: "Notas e boletos emitidos", expectedContent: "Quantidade e principais emissões da semana" },
      { label: "Cobranças realizadas", expectedContent: "Quantidade e clientes cobrados" },
      { label: "Medições fechadas e pendentes", expectedContent: "Quantidade, cliente, período e status" },
    ],
  },
  {
    key: "financeiro.mensal",
    sector: "financeiro",
    cadence: "mensal",
    variant: "mensal",
    title: "Financeiro — Mensal",
    items: [
      { label: "Faturamento do mês", expectedContent: "Cliente, competência, valor, vencimento e status de envio" },
      { label: "Recebimentos do mês", expectedContent: "Cliente, valor, data, forma de pagamento e baixa realizada" },
      { label: "Valores em aberto", expectedContent: "Clientes que não pagaram, valor, vencimento e situação" },
      { label: "Valores vencidos", expectedContent: "Cliente, valor, dias em atraso, histórico de cobrança e próximos passos" },
      { label: "Contas pagas", expectedContent: "Principais pagamentos do mês, por categoria/fornecedor" },
      { label: "Contas pendentes", expectedContent: "Pagamentos adiados para o próximo mês e motivo" },
      { label: "Conciliação bancária", expectedContent: "Status geral e pendências de identificação/baixa" },
      { label: "Medições fechadas", expectedContent: "Cliente, período, valor, status de conferência, envio e aprovação" },
      { label: "Medições pendentes", expectedContent: "O que ainda não foi fechado, aprovado ou ajustado" },
      { label: "Notas/boletos cancelados ou corrigidos", expectedContent: "Motivo, cliente, valor e nova emissão" },
      { label: "Problemas recorrentes", expectedContent: "Atraso de cliente, falta de comprovante, divergência, erro em boleto/nota, retrabalho" },
      { label: "Prioridades do próximo mês", expectedContent: "Cobranças, conferências, emissões, pagamentos, ajustes de medição" },
    ],
  },
];

// Apenas templates que viram relatório armazenado (resumido é gerado, não armazenado)
export const STORED_TEMPLATE_KEYS = [
  "rh_admin.semanal.detalhado",
  "rh_admin.mensal",
  "financeiro.semanal.detalhado",
  "financeiro.mensal",
] as const;

const BY_KEY = new Map(REPORT_TEMPLATES.map((t) => [t.key, t]));

export function getTemplate(key: string): ReportTemplate | undefined {
  return BY_KEY.get(key);
}
