import React from "react";

/**
 * Validação de formulários
 * Funções para validar CPF, telefone, email e campos obrigatórios
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Valida CPF (remove formatação e verifica dígitos)
 */
export function validateCPF(cpf: string | undefined): boolean {
  if (!cpf) return false;

  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, "");

  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Calcula primeiro dígito verificador
  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
}

/**
 * Valida telefone (10 ou 11 dígitos)
 */
export function validatePhone(phone: string | undefined): boolean {
  if (!phone) return false;

  const cleanPhone = phone.replace(/\D/g, "");
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}

/**
 * Valida email
 */
export function validateEmail(email: string | undefined): boolean {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Formata CPF para exibição (XXX.XXX.XXX-XX)
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, "");
  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Formata telefone para exibição ((XX) XXXXX-XXXX ou (XX) XXXX-XXXX)
 */
export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, "");

  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return phone;
}

/**
 * Valida formulário de funcionário
 */
export function validateEmployeeForm(data: {
  fullName?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  gender?: string;
  maritalStatus?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validar nome completo
  if (!data.fullName || data.fullName.trim().length < 3) {
    errors.push({
      field: "fullName",
      message: "Nome completo é obrigatório (mínimo 3 caracteres)",
    });
  }

  // Validar CPF
  if (!data.cpf || !validateCPF(data.cpf)) {
    errors.push({
      field: "cpf",
      message: "CPF inválido",
    });
  }

  // Validar email (se fornecido)
  if (data.email && !validateEmail(data.email)) {
    errors.push({
      field: "email",
      message: "Email inválido",
    });
  }

  // Validar telefone (se fornecido)
  if (data.phone && !validatePhone(data.phone)) {
    errors.push({
      field: "phone",
      message: "Telefone inválido (10 ou 11 dígitos)",
    });
  }

  // Validar gênero
  if (!data.gender) {
    errors.push({
      field: "gender",
      message: "Gênero é obrigatório",
    });
  }

  // Validar estado civil
  if (!data.maritalStatus) {
    errors.push({
      field: "maritalStatus",
      message: "Estado civil é obrigatório",
    });
  }

  return errors;
}

/**
 * Hook para gerenciar erros de validação
 */
export function useFormValidation() {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const clearError = (field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const setError = (field: string, message: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  };

  const setMultipleErrors = (validationErrors: ValidationError[]) => {
    const errorMap: Record<string, string> = {};
    validationErrors.forEach((error) => {
      errorMap[error.field] = error.message;
    });
    setErrors(errorMap);
  };

  const clearAllErrors = () => {
    setErrors({});
  };

  return {
    errors,
    clearError,
    setError,
    setMultipleErrors,
    clearAllErrors,
    hasErrors: Object.keys(errors).length > 0,
  };
}
