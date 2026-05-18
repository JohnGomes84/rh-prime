import { z } from "zod";

/**
 * Validadores Zod compartilhados entre client (forms) e server (routers tRPC).
 * Single source of truth — nenhum router define seus próprios primitivos.
 *
 * Princípio: input vazio do form NUNCA deve resultar em 500. Sempre vira erro
 * de validação claro tanto no servidor quanto no cliente.
 */

/** Decimal monetário positivo: "0", "10", "10.5", "10.55". Bloqueia "" e "abc". */
export const moneyString = z
  .string()
  .min(1, "Valor obrigatório")
  .regex(/^\d+(?:[.,]\d{1,2})?$/, "Valor monetário inválido")
  .transform(v => v.replace(",", "."));

/** Mesmo que moneyString mas opcional (omite se ausente, rejeita ""). */
export const moneyStringOptional = moneyString.optional();

/** Data ISO YYYY-MM-DD. Aceita também ISO datetime (corta hora). */
export const dateString = z
  .string()
  .min(1, "Data obrigatória")
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, "Data inválida")
  .refine(v => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const year = d.getUTCFullYear();
    return year >= 1900 && year <= 2200;
  }, "Data inválida");

export const dateStringOptional = dateString.optional();

/** CPF — 11 dígitos numéricos (sem máscara) ou aceita máscara e normaliza. */
export const cpf = z
  .string()
  .transform(v => v.replace(/\D/g, ""))
  .pipe(z.string().length(11, "CPF deve ter 11 dígitos").regex(/^\d+$/, "CPF inválido"));

export const cpfOptional = z
  .string()
  .optional()
  .transform(v => (v ? v.replace(/\D/g, "") : v))
  .refine(v => !v || (v.length === 11 && /^\d+$/.test(v)), "CPF inválido");

/** CNPJ — 14 dígitos. */
export const cnpjOptional = z
  .string()
  .optional()
  .transform(v => (v ? v.replace(/\D/g, "") : v))
  .refine(v => !v || (v.length === 14 && /^\d+$/.test(v)), "CNPJ inválido");

/** Chave PIX — mínimo aceitável (validação rica fica em server/controle/pixValidator). */
export const pixKey = z.string().min(3, "Chave PIX muito curta");
export const pixKeyOptional = pixKey.optional();

/** Email opcional que aceita "" como ausente (forma migra suave). */
export const emailOptional = z
  .string()
  .optional()
  .refine(
    v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    "E-mail inválido"
  );

/** Texto não-vazio com tamanho mínimo. */
export const requiredText = (min = 2, label = "Campo") =>
  z.string().min(min, `${label} deve ter ao menos ${min} caracteres`);

/** ID positivo. */
export const positiveId = z.number().int().positive();
export const positiveIdOptional = positiveId.optional();
export const positiveIdNullable = positiveId.nullable().optional();

// Enums declarados diretamente (Zod v4 perde literal narrowing dentro de helper genérico).
export const pixKeyType = z.enum(["cpf", "email", "phone", "random", "cnpj"]);
export const employeeStatus = z.enum(["diarista", "inativo", "pendente"]);
export const scheduleStatus = z.enum(["pendente", "validado", "cancelado"]);
export const payableStatus = z.enum(["pendente", "pago", "vencido", "cancelado"]);
export const receivableStatus = z.enum(["pendente", "recebido", "vencido", "cancelado"]);
export const paymentBatchStatus = z.enum(["pendente", "pago", "cancelado"]);
export const bankAccountType = z.enum(["checking", "savings", "investment"]);
export const attendanceStatus = z.enum(["presente", "faltou", "parcial"]);
