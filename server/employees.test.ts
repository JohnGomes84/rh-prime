import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

/**
 * Testes para CRUD de Funcionários
 * 
 * Fluxo de teste:
 * 1. Criar funcionário com dados válidos
 * 2. Listar funcionários
 * 3. Obter funcionário específico
 * 4. Atualizar funcionário
 * 5. Deletar funcionário
 */

describe("Employees CRUD", () => {
  let createdEmployeeId: number;

  const validEmployee = {
    fullName: "João Silva",
    cpf: "12345678901",
    email: "joao@example.com",
    phone: "11999999999",
    birthDate: "1990-01-15",
    gender: "M" as const,
    maritalStatus: "Solteiro" as const,
    nationality: "Brasileiro",
    educationLevel: "Ensino Superior",
    addressStreet: "Rua das Flores",
    addressNumber: "123",
    addressNeighborhood: "Centro",
    addressCity: "São Paulo",
    addressState: "SP",
    addressZip: "01234567",
    status: "Ativo" as const,
  };

  it("deve criar um funcionário com dados válidos", async () => {
    const result = await db.createEmployee(validEmployee as any);
    
    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.fullName).toBe(validEmployee.fullName);
    expect(result.cpf).toBe(validEmployee.cpf);
    expect(result.status).toBe("Ativo");
    
    createdEmployeeId = result.id;
  });

  it("deve listar todos os funcionários", async () => {
    const employees = await db.listEmployees();
    
    expect(Array.isArray(employees)).toBe(true);
    expect(employees.length).toBeGreaterThan(0);
    expect(employees.some(e => e.id === createdEmployeeId)).toBe(true);
  });

  it("deve buscar funcionário por ID", async () => {
    const employee = await db.getEmployee(createdEmployeeId);
    
    expect(employee).toBeDefined();
    expect(employee?.id).toBe(createdEmployeeId);
    expect(employee?.fullName).toBe(validEmployee.fullName);
    expect(employee?.cpf).toBe(validEmployee.cpf);
  });

  it("deve buscar funcionário por nome (search)", async () => {
    const employees = await db.listEmployees("João");
    
    expect(Array.isArray(employees)).toBe(true);
    expect(employees.some(e => e.fullName.includes("João"))).toBe(true);
  });

  it("deve atualizar dados do funcionário", async () => {
    const updateData = {
      fullName: "João Silva Santos",
      email: "joao.silva@example.com",
      phone: "11988888888",
    };

    await db.updateEmployee(createdEmployeeId, updateData as any);
    const updated = await db.getEmployee(createdEmployeeId);

    expect(updated?.fullName).toBe(updateData.fullName);
    expect(updated?.email).toBe(updateData.email);
    expect(updated?.phone).toBe(updateData.phone);
  });

  it("deve alterar status do funcionário para Inativo", async () => {
    await db.updateEmployee(createdEmployeeId, { status: "Inativo" } as any);
    const updated = await db.getEmployee(createdEmployeeId);

    expect(updated?.status).toBe("Inativo");
  });

  it("deve deletar um funcionário", async () => {
    await db.deleteEmployee(createdEmployeeId);
    const deleted = await db.getEmployee(createdEmployeeId);

    expect(deleted).toBeNull();
  });

  it("deve validar CPF duplicado", async () => {
    // Criar primeiro funcionário
    const emp1 = await db.createEmployee(validEmployee as any);
    
    // Tentar criar segundo com mesmo CPF deve falhar
    const emp2Data = { ...validEmployee, fullName: "Outro Nome", email: "outro@example.com" };
    
    try {
      await db.createEmployee(emp2Data as any);
      expect.fail("Deveria ter lançado erro de CPF duplicado");
    } catch (error: any) {
      expect(error.message).toContain("Duplicate");
    }
    
    // Limpar
    await db.deleteEmployee(emp1.id);
  });

  it("deve validar email duplicado", async () => {
    const email = "teste@example.com";
    const emp1Data = { ...validEmployee, cpf: "98765432101", email };
    const emp1 = await db.createEmployee(emp1Data as any);
    
    const emp2Data = { ...validEmployee, cpf: "11122233344", email };
    
    try {
      await db.createEmployee(emp2Data as any);
      expect.fail("Deveria ter lançado erro de email duplicado");
    } catch (error: any) {
      expect(error.message).toContain("Duplicate");
    }
    
    // Limpar
    await db.deleteEmployee(emp1.id);
  });

  it("deve retornar lista vazia ao buscar por nome inexistente", async () => {
    const employees = await db.listEmployees("ZZZZZZZZZZZZZ");
    
    expect(Array.isArray(employees)).toBe(true);
    expect(employees.length).toBe(0);
  });
});
