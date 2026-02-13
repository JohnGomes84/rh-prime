import { describe, it, expect } from 'vitest';
import { calculatePayroll, validatePayrollInput, PayrollInput } from './payroll-calculator';

describe('Payroll Calculator', () => {
  describe('calculatePayroll', () => {
    it('deve calcular folha simples sem adicionais', () => {
      const input: PayrollInput = {
        baseSalary: 3000,
      };

      const result = calculatePayroll(input);

      expect(result.baseSalary).toBe(3000);
      expect(result.allowances).toBe(0);
      expect(result.bonuses).toBe(0);
      expect(result.grossSalary).toBe(3000);
      expect(result.inss).toBeGreaterThan(0);
      expect(result.ir).toBeGreaterThan(0);
      expect(result.fgts).toBe(240); // 3000 * 0.08
      expect(result.netSalary).toBeLessThan(result.grossSalary);
    });

    it('deve calcular folha com adicionais e bônus', () => {
      const input: PayrollInput = {
        baseSalary: 3000,
        allowances: 500,
        bonuses: 1000,
      };

      const result = calculatePayroll(input);

      expect(result.baseSalary).toBe(3000);
      expect(result.allowances).toBe(500);
      expect(result.bonuses).toBe(1000);
      expect(result.grossSalary).toBe(4500);
    });

    it('deve calcular INSS progressivo corretamente', () => {
      // Teste com salário na primeira faixa
      const input1: PayrollInput = { baseSalary: 1000 };
      const result1 = calculatePayroll(input1);
      expect(result1.inss).toBe(75); // 1000 * 0.075

      // Teste com salário na segunda faixa
      const input2: PayrollInput = { baseSalary: 2000 };
      const result2 = calculatePayroll(input2);
      expect(result2.inss).toBeGreaterThan(result1.inss);

      // Teste com salário acima do teto
      const input3: PayrollInput = { baseSalary: 10000 };
      const result3 = calculatePayroll(input3);
      expect(result3.inss).toBe(1090.44); // Teto INSS
    });

    it('deve calcular IR com dependentes', () => {
      const inputSemDependentes: PayrollInput = {
        baseSalary: 5000,
      };
      const resultSemDependentes = calculatePayroll(inputSemDependentes);

      const inputComDependentes: PayrollInput = {
        baseSalary: 5000,
        dependents: 2,
      };
      const resultComDependentes = calculatePayroll(inputComDependentes);

      // IR com dependentes deve ser menor
      expect(resultComDependentes.ir).toBeLessThan(resultSemDependentes.ir);
    });

    it('deve calcular FGTS corretamente', () => {
      const input: PayrollInput = { baseSalary: 2500 };
      const result = calculatePayroll(input);

      expect(result.fgts).toBe(200); // 2500 * 0.08
    });

    it('deve calcular salário líquido corretamente', () => {
      const input: PayrollInput = {
        baseSalary: 3000,
        allowances: 500,
        otherDeductions: 100,
      };

      const result = calculatePayroll(input);

      const expectedNet = result.grossSalary - result.inss - result.ir - result.otherDeductions;
      expect(result.netSalary).toBe(expectedNet);
    });

    it('deve arredondar valores para 2 casas decimais', () => {
      const input: PayrollInput = { baseSalary: 3333.33 };
      const result = calculatePayroll(input);

      // Todos os valores devem ter no máximo 2 casas decimais
      expect(result.inss % 0.01).toBeLessThan(0.001);
      expect(result.ir % 0.01).toBeLessThan(0.001);
      expect(result.fgts % 0.01).toBeLessThan(0.001);
      expect(result.netSalary % 0.01).toBeLessThan(0.001);
    });

    it('deve retornar IR zero para salários baixos', () => {
      const input: PayrollInput = { baseSalary: 1000 };
      const result = calculatePayroll(input);

      expect(result.ir).toBe(0);
    });
  });

  describe('validatePayrollInput', () => {
    it('deve validar entrada correta', () => {
      const input: PayrollInput = {
        baseSalary: 3000,
        allowances: 500,
      };

      const errors = validatePayrollInput(input);
      expect(errors).toHaveLength(0);
    });

    it('deve rejeitar salário base negativo', () => {
      const input: PayrollInput = { baseSalary: -1000 };
      const errors = validatePayrollInput(input);

      expect(errors).toContain('Salário base não pode ser negativo');
    });

    it('deve rejeitar adicionais negativos', () => {
      const input: PayrollInput = {
        baseSalary: 3000,
        allowances: -500,
      };

      const errors = validatePayrollInput(input);
      expect(errors).toContain('Adicionais não podem ser negativos');
    });

    it('deve rejeitar bônus negativos', () => {
      const input: PayrollInput = {
        baseSalary: 3000,
        bonuses: -1000,
      };

      const errors = validatePayrollInput(input);
      expect(errors).toContain('Bônus não podem ser negativos');
    });

    it('deve rejeitar dependentes negativos', () => {
      const input: PayrollInput = {
        baseSalary: 3000,
        dependents: -1,
      };

      const errors = validatePayrollInput(input);
      expect(errors).toContain('Número de dependentes não pode ser negativo');
    });
  });

  describe('Casos reais de folha', () => {
    it('deve calcular folha de colaborador CLT típico', () => {
      const input: PayrollInput = {
        baseSalary: 3500,
        allowances: 200, // Vale refeição
        bonuses: 0,
        dependents: 1,
      };

      const result = calculatePayroll(input);

      expect(result.grossSalary).toBe(3700);
      expect(result.inss).toBeGreaterThan(0);
      expect(result.ir).toBeGreaterThan(0);
      expect(result.fgts).toBe(280); // 3500 * 0.08
      expect(result.netSalary).toBeGreaterThan(0);
      expect(result.netSalary).toBeLessThan(result.grossSalary);
    });

    it('deve calcular folha com bônus de produção', () => {
      const input: PayrollInput = {
        baseSalary: 4000,
        allowances: 300,
        bonuses: 2000,
        dependents: 2,
      };

      const result = calculatePayroll(input);

      expect(result.grossSalary).toBe(6300);
      expect(result.fgts).toBe(320); // 4000 * 0.08 (FGTS só sobre base)
    });
  });
});
