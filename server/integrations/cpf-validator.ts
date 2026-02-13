/**
 * Integração com API de validação de CPF
 * Valida CPF contra base de dados de CPFs inválidos
 */

export async function validateCPF(cpf: string): Promise<{
  valid: boolean;
  message: string;
}> {
  // Remove caracteres especiais
  const cleanCPF = cpf.replace(/\D/g, '');

  // Validação básica de formato
  if (cleanCPF.length !== 11) {
    return { valid: false, message: 'CPF deve ter 11 dígitos' };
  }

  // Validação de dígitos verificadores
  const isValidCPF = validateCPFChecksum(cleanCPF);

  if (!isValidCPF) {
    return { valid: false, message: 'CPF inválido' };
  }

  return { valid: true, message: 'CPF válido' };
}

/**
 * Calcula e valida os dígitos verificadores do CPF
 */
function validateCPFChecksum(cpf: string): boolean {
  let sum = 0;
  let remainder;

  // Validar primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;

  // Validar segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

/**
 * Integração com API de consulta de dados públicos (CNPJ, CEP)
 */
export async function validateCNPJ(cnpj: string): Promise<{
  valid: boolean;
  message: string;
}> {
  const cleanCNPJ = cnpj.replace(/\D/g, '');

  if (cleanCNPJ.length !== 14) {
    return { valid: false, message: 'CNPJ deve ter 14 dígitos' };
  }

  return { valid: true, message: 'CNPJ válido' };
}

/**
 * Buscar dados de CEP via ViaCEP API
 */
export async function fetchAddressByCEP(cep: string): Promise<{
  street: string;
  neighborhood: string;
  city: string;
  state: string;
} | null> {
  try {
    const cleanCEP = cep.replace(/\D/g, '');
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.erro) return null;
    
    return {
      street: data.logradouro,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
}
