/**
 * Utilitários para conversão de tipos entre formulário e banco de dados
 */

export interface EmployeeInput {
  fullName: string;
  cpf: string;
  socialName?: string;
  rg?: string;
  birthDate?: string;
  gender?: "M" | "F" | "Outro";
  maritalStatus?: "Solteiro" | "Casado" | "Divorciado" | "Viúvo" | "União Estável";
  nationality?: string;
  educationLevel?: string;
  email?: string;
  phone?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  ctpsNumber?: string;
  ctpsSeries?: string;
  pisPasep?: string;
  voterTitle?: string;
  militaryCert?: string;
  cnhNumber?: string;
  cnhCategory?: string;
  cnhExpiry?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  pixKey?: string;
  branch?: string;
  externalCode?: string;
  costCenter?: string;
  corporateEmail?: string;
  employmentType?: "CLT" | "CLT_Comissao" | "Comissionado" | "Concursado" | "Contrato" | "Cooperado" | "Efetivo" | "Estagio" | "Estatutario" | "MenorAprendiz" | "JovemAprendiz" | "PrestadorServico" | "Socio" | "Temporario" | "Outro";
  esocialMatricula?: string;
  insalubrityPercentage?: "0" | "10" | "20" | "40";
  status?: "Ativo" | "Inativo" | "Afastado" | "Férias";
}

/**
 * Converte dados de entrada do formulário para tipos do banco de dados
 */
export function convertEmployeeInput(input: EmployeeInput): Record<string, unknown> {
  return {
    ...input,
    birthDate: input.birthDate ? new Date(input.birthDate) : null,
    cnhExpiry: input.cnhExpiry ? new Date(input.cnhExpiry) : null,
    insalubrityPercentage: input.insalubrityPercentage ? parseInt(input.insalubrityPercentage) : null,
  };
}

/**
 * Converte dados de atualização para tipos do banco de dados
 */
export function convertUpdateData(data: Record<string, unknown>): Record<string, unknown> {
  const converted = { ...data };

  // Converter campos de data
  if (converted.birthDate && typeof converted.birthDate === "string") {
    converted.birthDate = new Date(converted.birthDate);
  }
  if (converted.cnhExpiry && typeof converted.cnhExpiry === "string") {
    converted.cnhExpiry = new Date(converted.cnhExpiry);
  }

  // Converter percentual de insalubridade
  if (converted.insalubrityPercentage && typeof converted.insalubrityPercentage === "string") {
    converted.insalubrityPercentage = parseInt(converted.insalubrityPercentage);
  }

  return converted;
}
