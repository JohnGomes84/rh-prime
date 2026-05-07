import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { calculatePayroll } from "../modules/payroll/payroll-calculator";

const monthInput = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

const decimalToNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function getPeriodEnd(month: number, year: number) {
  return new Date(year, month, 0);
}

async function buildPayrollForEmployee(employeeId: number, month: number, year: number) {
  const [employee, contracts, dependents, benefits, overtimeStats] = await Promise.all([
    db.getEmployee(employeeId),
    db.listContracts(employeeId),
    db.listDependents(employeeId),
    db.listBenefits(employeeId),
    db.getOvertimeStats(employeeId, month, year),
  ]);

  if (!employee) {
    throw new Error("Funcionario nao encontrado");
  }

  const activeContract =
    contracts.find((contract) => !contract.terminationDate) ??
    contracts[0];

  const baseSalary = decimalToNumber(activeContract?.salary);
  const otherDeductions = benefits.reduce((total, benefit: any) => {
    if (benefit.optedOut) return total;
    return total + decimalToNumber(benefit.employeeContribution);
  }, 0);

  const breakdown = calculatePayroll({
    baseSalary,
    dependents: dependents.filter((dependent: any) => dependent.irDeduction).length,
    overtimeHours: overtimeStats.totalOvertimeHours,
    overtimeType: "50%",
    otherDeductions,
  });

  return {
    employee: {
      id: employee.id,
      fullName: employee.fullName,
      cpf: employee.cpf,
      corporateEmail: employee.corporateEmail,
      status: employee.status,
    },
    contract: activeContract ?? null,
    benefits: benefits.map((benefit: any) => ({
      id: benefit.id,
      benefitType: benefit.benefitType,
      provider: benefit.provider,
      value: decimalToNumber(benefit.value),
      employeeContribution: decimalToNumber(benefit.employeeContribution),
      optedOut: benefit.optedOut,
    })),
    dependentsCount: dependents.length,
    overtime: overtimeStats,
    breakdown,
    reference: { month, year },
  };
}

export const payrollRouter = router({
  summary: protectedProcedure
    .input(monthInput)
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin" && ctx.user?.role !== "gestor") {
        throw new Error("Permissao negada");
      }

      const end = getPeriodEnd(input.month, input.year);
      const [employees, contracts] = await Promise.all([
        db.listEmployees(),
        db.listContracts(),
      ]);

      const activeContracts = contracts.filter((contract: any) => {
        const hireDate = contract.hireDate ? new Date(contract.hireDate) : null;
        const terminationDate = contract.terminationDate ? new Date(contract.terminationDate) : null;
        return !!hireDate && hireDate <= end && (!terminationDate || terminationDate >= end);
      });

      const items = await Promise.all(
        activeContracts.map(async (contract: any) => {
          const employee = employees.find((item: any) => item.id === contract.employeeId);
          if (!employee) return null;
          return buildPayrollForEmployee(employee.id, input.month, input.year);
        })
      );

      const payrollItems = items.filter(Boolean) as Array<Awaited<ReturnType<typeof buildPayrollForEmployee>>>;

      const totals = payrollItems.reduce(
        (acc, item) => {
          acc.baseSalary += item.breakdown.baseSalary;
          acc.grossSalary += item.breakdown.grossSalary;
          acc.netSalary += item.breakdown.netSalary;
          acc.inss += item.breakdown.inss;
          acc.ir += item.breakdown.ir;
          acc.fgts += item.breakdown.fgts;
          acc.otherDeductions += item.breakdown.otherDeductions;
          return acc;
        },
        {
          baseSalary: 0,
          grossSalary: 0,
          netSalary: 0,
          inss: 0,
          ir: 0,
          fgts: 0,
          otherDeductions: 0,
        }
      );

      return {
        month: input.month,
        year: input.year,
        employees: payrollItems.length,
        totals,
        items: payrollItems,
      };
    }),

  employeePayslip: protectedProcedure
    .input(monthInput.extend({ employeeId: z.number().int().positive().optional() }))
    .query(async ({ input, ctx }) => {
      const employeeId = input.employeeId ?? Number(ctx.user?.id ?? 0);
      if (!employeeId) {
        throw new Error("Funcionario nao encontrado");
      }

      if (
        ctx.user?.role !== "admin" &&
        ctx.user?.role !== "gestor" &&
        employeeId !== Number(ctx.user?.id ?? 0)
      ) {
        throw new Error("Permissao negada");
      }

      return buildPayrollForEmployee(employeeId, input.month, input.year);
    }),
});
