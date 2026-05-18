import { getDb } from "../db";
import { scheduleAllocations, employees, schedulePayments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { computeAllocationNetNumber, stringToDecimal } from "../_core/money";

export interface PaymentRecord {
  employeeId: number;
  scheduleId: number;
  period: string; // YYYY-MM
  daysWorked: number;
  baseValue: number;
  mealAllowance: number;
  voucher: number;
  bonus: number;
  totalToPay: number;
  pixKey?: string;
  pixType?: string;
  status: "pending" | "no_pix" | "paid";
}

/**
 * Gera registros de pagamento para cada diarista alocado em um planejamento
 * Calcula: base - marmita - vale + bônus
 * Busca PIX do employee, marca "no_pix" se faltar
 */
export async function generatePaymentRecords(
  scheduleId: number,
  scheduleDate: Date
): Promise<{
  success: boolean;
  records: PaymentRecord[];
  error?: string;
}> {
  try {
    const db = await getDb();

    // Buscar alocações do planejamento
    const allocations = await db
      .select()
      .from(scheduleAllocations)
      .where(eq(scheduleAllocations.scheduleId, scheduleId));

    if (allocations.length === 0) {
      return {
        success: true,
        records: [],
      };
    }

    // Período em formato YYYY-MM
    const period = `${scheduleDate.getFullYear()}-${String(scheduleDate.getMonth() + 1).padStart(2, "0")}`;

    // Gerar records
    const records: PaymentRecord[] = [];

    for (const alloc of allocations) {
      // Buscar PIX do employee
      const employee = await db
        .select()
        .from(employees)
        .where(eq(employees.id, alloc.employeeId))
        .limit(1);

      const pixKey = employee?.[0]?.pixKey || undefined;
      const pixType = pixKey ? detectPixType(pixKey) : undefined;

      // Calcular total a pagar via single source of truth (_core/money.ts)
      const baseValue = stringToDecimal(alloc.payValue);
      const marmita = stringToDecimal(alloc.mealAllowance);
      const vale = stringToDecimal(alloc.voucher);
      const bonus = stringToDecimal(alloc.bonus);
      const totalToPay = computeAllocationNetNumber({
        days: 1,
        dailyRate: baseValue,
        mealAllowance: marmita,
        voucher: vale,
        bonus,
      });

      const record: PaymentRecord = {
        employeeId: alloc.employeeId,
        scheduleId: alloc.scheduleId,
        period,
        daysWorked: 1,
        baseValue,
        mealAllowance: marmita,
        voucher: vale,
        bonus,
        totalToPay,
        pixKey,
        pixType,
        status: pixKey ? "pending" : "no_pix",
      };

      records.push(record);
    }

    return {
      success: true,
      records,
    };
  } catch (error) {
    console.error("[PAYMENT GENERATION] Erro:", error);
    return {
      success: false,
      records: [],
      error: `Erro ao gerar registros de pagamento: ${error instanceof Error ? error.message : "Desconhecido"}`,
    };
  }
}

/**
 * Detecta o tipo de chave PIX
 * Tipos: CNPJ (14 dígitos), CPF (11 dígitos), Telefone (11 dígitos com 9), Email (contém @)
 */
function detectPixType(pixKey: string): string {
  const cleanKey = pixKey.replace(/\D/g, "");

  if (pixKey.includes("@")) {
    return "email";
  }

  if (cleanKey.length === 14) {
    return "cnpj";
  }

  if (cleanKey.length === 11) {
    // Telefone começa com 9 (celular)
    if (cleanKey.startsWith("9")) {
      return "phone";
    }
    // Caso contrário é CPF
    return "cpf";
  }

  return "unknown";
}

/**
 * Calcula o total a pagar para um período
 */
export function calculateTotalToPay(records: PaymentRecord[]): number {
  return records.reduce((sum, record) => sum + record.totalToPay, 0);
}

/**
 * Agrupa registros por funcionário
 */
export function groupByEmployee(
  records: PaymentRecord[]
): Map<number, PaymentRecord[]> {
  const grouped = new Map<number, PaymentRecord[]>();

  for (const record of records) {
    if (!grouped.has(record.employeeId)) {
      grouped.set(record.employeeId, []);
    }
    grouped.get(record.employeeId)!.push(record);
  }

  return grouped;
}

/**
 * Conta funcionários únicos sem PIX
 */
export function countNoPix(records: PaymentRecord[]): number {
  const noPix = new Set<number>();
  for (const record of records) {
    if (record.status === "no_pix") {
      noPix.add(record.employeeId);
    }
  }
  return noPix.size;
}

/**
 * Conta dias trabalhados (total de registros)
 */
export function countDaysWorked(records: PaymentRecord[]): number {
  return records.length;
}

/**
 * Conta funcionários únicos
 */
export function countUniqueEmployees(records: PaymentRecord[]): number {
  const employees = new Set<number>();
  for (const record of records) {
    employees.add(record.employeeId);
  }
  return employees.size;
}
