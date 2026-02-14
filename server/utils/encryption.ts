import crypto from "crypto";

/**
 * Utilitários para encriptação de dados sensíveis
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-change-in-production";
const ALGORITHM = "aes-256-cbc";

/**
 * Encripta um CPF para armazenamento em audit logs
 */
export function encryptCPF(cpf: string): string {
  if (!cpf) return "";

  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(cpf, "utf8", "hex");
    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    return cpf; // Fallback: retorna CPF em texto plano se falhar
  }
}

/**
 * Descriptografa um CPF
 */
export function decryptCPF(encryptedCPF: string): string {
  if (!encryptedCPF || !encryptedCPF.includes(":")) return "";

  try {
    const [ivHex, encrypted] = encryptedCPF.split(":");
    const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    return ""; // Retorna vazio se falhar
  }
}

/**
 * Mascara um CPF para exibição (ex: 123.456.789-00 -> 123.***.**-00)
 */
export function maskCPF(cpf: string): string {
  if (!cpf || cpf.length < 11) return cpf;
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.**-$4");
}
