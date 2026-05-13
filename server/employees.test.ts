import { describe, it, expect } from "vitest";
import * as db from "./db.js";

describe("Employees CRUD", () => {
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

  async function createSeedEmployee(overrides: Partial<typeof validEmployee> = {}) {
    const seed = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    return db.createEmployee({
      ...validEmployee,
      cpf: overrides.cpf ?? seed.slice(-11).padStart(11, "0"),
      email: overrides.email ?? `seed-${seed}@example.com`,
      ...overrides,
    });
  }

  it("deve criar um funcionário com dados válidos", async () => {
    const result = await db.createEmployee(validEmployee);

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    expect(result.fullName).toBe(validEmployee.fullName);
    expect(result.cpf).toBe(validEmployee.cpf);
    expect(result.status).toBe("Ativo");
  });

  it("deve listar todos os funcionários", async () => {
    const createdEmployee = await createSeedEmployee();
    const employees = await db.listEmployees();

    expect(Array.isArray(employees)).toBe(true);
    expect(employees.length).toBeGreaterThan(0);
    expect(employees.some(employee => employee.id === createdEmployee.id)).toBe(true);
  });

  it("deve buscar funcionário por ID", async () => {
    const createdEmployee = await createSeedEmployee();
    const employee = await db.getEmployee(createdEmployee.id);

    expect(employee).toBeDefined();
    expect(employee?.id).toBe(createdEmployee.id);
    expect(employee?.fullName).toBe(createdEmployee.fullName);
    expect(employee?.cpf).toBe(createdEmployee.cpf);
  });

  it("deve buscar funcionário por nome (search)", async () => {
    await createSeedEmployee({ fullName: "João Silva Busca" });
    const employees = await db.listEmployees("João");

    expect(Array.isArray(employees)).toBe(true);
    expect(employees.some(employee => employee.fullName.includes("João"))).toBe(true);
  });

  it("deve atualizar dados do funcionário", async () => {
    const createdEmployee = await createSeedEmployee();
    const updateData = {
      fullName: "João Silva Santos",
      email: "joao.silva@example.com",
      phone: "11988888888",
    };

    await db.updateEmployee(createdEmployee.id, updateData);
    const updated = await db.getEmployee(createdEmployee.id);

    expect(updated?.fullName).toBe(updateData.fullName);
    expect(updated?.email).toBe(updateData.email);
    expect(updated?.phone).toBe(updateData.phone);
  });

  it("deve alterar status do funcionário para Inativo", async () => {
    const createdEmployee = await createSeedEmployee();

    await db.updateEmployee(createdEmployee.id, { status: "Inativo" });
    const updated = await db.getEmployee(createdEmployee.id);

    expect(updated?.status).toBe("Inativo");
  });

  it("deve deletar um funcionário", async () => {
    const createdEmployee = await createSeedEmployee();

    await db.deleteEmployee(createdEmployee.id);
    const deleted = await db.getEmployee(createdEmployee.id);

    expect(deleted).toBeNull();
  });

  it("deve validar CPF duplicado", async () => {
    const emp1 = await db.createEmployee(validEmployee);
    const emp2Data = { ...validEmployee, fullName: "Outro Nome", email: "outro@example.com" };

    try {
      await db.createEmployee(emp2Data);
      expect.fail("Deveria ter lançado erro de CPF duplicado");
    } catch (error: any) {
      expect(error.message).toContain("Duplicate");
    }

    await db.deleteEmployee(emp1.id);
  });

  it("deve validar email duplicado", async () => {
    const email = "teste@example.com";
    const emp1Data = { ...validEmployee, cpf: "98765432101", email };
    const emp1 = await db.createEmployee(emp1Data);

    const emp2Data = { ...validEmployee, cpf: "11122233344", email };

    try {
      await db.createEmployee(emp2Data);
      expect.fail("Deveria ter lançado erro de email duplicado");
    } catch (error: any) {
      expect(error.message).toContain("Duplicate");
    }

    await db.deleteEmployee(emp1.id);
  });

  it("deve retornar lista vazia ao buscar por nome inexistente", async () => {
    const employees = await db.listEmployees("ZZZZZZZZZZZZZ");

    expect(Array.isArray(employees)).toBe(true);
    expect(employees.length).toBe(0);
  });
});
