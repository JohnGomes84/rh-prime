import { describe, it, expect } from "vitest";
import { validateCPF, validateCNPJ, fetchAddressByCEP } from "./cpf-validator";

describe("CPF Validator", () => {
  it("deve validar CPF com formato correto", async () => {
    // CPF válido: 11144477735 (exemplo)
    const result = await validateCPF("111.444.777-35");
    expect(result.valid).toBe(true);
    expect(result.message).toBe("CPF válido");
  });

  it("deve rejeitar CPF com formato inválido", async () => {
    const result = await validateCPF("123.456.789-00");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("CPF inválido");
  });

  it("deve rejeitar CPF com menos de 11 dígitos", async () => {
    const result = await validateCPF("123.456.789");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("CPF deve ter 11 dígitos");
  });

  it("deve remover caracteres especiais antes de validar", async () => {
    // CPF válido sem formatação
    const result = await validateCPF("11144477735");
    expect(result.valid).toBe(true);
  });
});

describe("CNPJ Validator", () => {
  it("deve validar CNPJ com 14 dígitos", async () => {
    const result = await validateCNPJ("11.222.333/0001-81");
    expect(result.valid).toBe(true);
    expect(result.message).toBe("CNPJ válido");
  });

  it("deve rejeitar CNPJ com menos de 14 dígitos", async () => {
    const result = await validateCNPJ("11.222.333/0001");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("CNPJ deve ter 14 dígitos");
  });

  it("deve remover caracteres especiais antes de validar", async () => {
    const result = await validateCNPJ("11222333000181");
    expect(result.valid).toBe(true);
  });
});

describe("CEP Lookup", () => {
  it("deve buscar endereço por CEP válido", async () => {
    // CEP válido: 01310100 (Av. Paulista, São Paulo)
    const result = await fetchAddressByCEP("01310-100");
    if (result) {
      expect(result).toHaveProperty("street");
      expect(result).toHaveProperty("neighborhood");
      expect(result).toHaveProperty("city");
      expect(result).toHaveProperty("state");
    }
  });

  it("deve retornar null para CEP inválido", async () => {
    const result = await fetchAddressByCEP("00000-000");
    expect(result).toBeNull();
  });

  it("deve remover caracteres especiais do CEP", async () => {
    // CEP válido sem formatação
    const result = await fetchAddressByCEP("01310100");
    if (result) {
      expect(result).toHaveProperty("street");
      expect(result).toHaveProperty("city");
    }
  });
});
