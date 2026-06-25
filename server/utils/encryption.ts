import crypto from "crypto";

/**
 * Utilitários para encriptação de dados sensíveis
 */

const DEFAULT_DEV_ENCRYPTION_KEY = "default-key-change-in-development";
const ALGORITHM = "aes-256-cbc";

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (key) return key;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY or JWT_SECRET is required in production");
  }
  return DEFAULT_DEV_ENCRYPTION_KEY;
}

/**
 * Encripta um CPF para armazenamento em audit logs
 */
export function encryptCPF(cpf: string): string {
  if (!cpf) return "";

  try {
    const key = crypto.scryptSync(getEncryptionKey(), "salt", 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(cpf, "utf8", "hex");
    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    if (process.env.NODE_ENV === "production") throw error;
    return cpf;
  }
}

/**
 * Descriptografa um CPF
 */
export function decryptCPF(encryptedCPF: string): string {
  if (!encryptedCPF || !encryptedCPF.includes(":")) return "";

  try {
    const [ivHex, encrypted] = encryptedCPF.split(":");
    const key = crypto.scryptSync(getEncryptionKey(), "salt", 32);
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
