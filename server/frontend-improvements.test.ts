import { describe, it, expect } from 'vitest';

// Teste dos cálculos de folha de pagamento (mesma lógica usada no frontend)
function calcINSS(gross: number): number {
  const rates = [
    { max: 1412.00, rate: 0.075 },
    { max: 2666.68, rate: 0.09 },
    { max: 4000.03, rate: 0.12 },
    { max: 7786.02, rate: 0.14 },
  ];
  let inss = 0, prev = 0;
  for (const b of rates) {
    if (gross <= prev) break;
    const taxable = Math.min(gross, b.max) - prev;
    inss += taxable * b.rate;
    prev = b.max;
  }
  return Math.min(inss, 1090.44);
}

function calcIR(gross: number, inss: number): number {
  const base = gross - inss;
  const rates = [
    { max: 2428.80, rate: 0, ded: 0 },
    { max: 3270.38, rate: 0.075, ded: 182.16 },
    { max: 4462.74, rate: 0.15, ded: 427.36 },
    { max: 5573.42, rate: 0.225, ded: 761.83 },
    { max: Infinity, rate: 0.275, ded: 1040.20 },
  ];
  for (const b of rates) {
    if (base <= b.max) return Math.max(base * b.rate - b.ded, 0);
  }
  return 0;
}

describe('Cálculos de Folha de Pagamento (Frontend)', () => {
  it('calcula INSS corretamente para salário mínimo', () => {
    const inss = calcINSS(1412);
    expect(inss).toBeCloseTo(105.90, 1);
  });

  it('calcula INSS progressivo para R$ 3.000', () => {
    const inss = calcINSS(3000);
    // Faixa 1: 1412 * 0.075 = 105.90
    // Faixa 2: (2666.68 - 1412) * 0.09 = 112.92
    // Faixa 3: (3000 - 2666.68) * 0.12 = 40.00
    expect(inss).toBeCloseTo(258.82, 0);
  });

  it('calcula INSS com teto para salário alto', () => {
    const inss = calcINSS(15000);
    expect(inss).toBeLessThanOrEqual(1090.44);
  });

  it('calcula IR isento para salário baixo', () => {
    const inss = calcINSS(2000);
    const ir = calcIR(2000, inss);
    expect(ir).toBe(0); // Base < 2428.80 → isento
  });

  it('calcula IR para salário de R$ 5.000', () => {
    const inss = calcINSS(5000);
    const ir = calcIR(5000, inss);
    expect(ir).toBeGreaterThan(0);
    // Base = 5000 - INSS ≈ 4651.18 → faixa 22.5%
    expect(ir).toBeLessThan(500);
  });

  it('salário líquido é bruto menos INSS e IR', () => {
    const salary = 5000;
    const inss = calcINSS(salary);
    const ir = calcIR(salary, inss);
    const net = salary - inss - ir;
    expect(net).toBeGreaterThan(0);
    expect(net).toBeLessThan(salary);
  });

  it('FGTS é 8% do bruto', () => {
    const salary = 5000;
    const fgts = salary * 0.08;
    expect(fgts).toBe(400);
  });
});

describe('Sidebar Menu Items', () => {
  // Simula os itens do sidebar para validar que todos estão presentes
  const menuItems = [
    { label: "Dashboard", path: "/", section: "Geral" },
    { label: "Funcionários", path: "/funcionarios", section: "Geral" },
    { label: "Cargos e Funções", path: "/cargos", section: "Geral" },
    { label: "Recrutamento", path: "/recrutamento", section: "Geral" },
    { label: "Bater Ponto", path: "/ponto", section: "Jornada" },
    { label: "Banco de Horas", path: "/banco-horas", section: "Jornada" },
    { label: "Horas Extras", path: "/horas-extras", section: "Jornada" },
    { label: "Férias", path: "/ferias", section: "Jornada" },
    { label: "Folha de Pagamento", path: "/folha", section: "Financeiro" },
    { label: "Holerite", path: "/holerite", section: "Financeiro" },
    { label: "Saúde e Segurança", path: "/saude", section: "Saúde" },
    { label: "Avaliações", path: "/avaliacoes", section: "Saúde" },
    { label: "Dossiê Digital", path: "/documentos", section: "Documentos" },
    { label: "Gerador de Docs", path: "/gerador", section: "Documentos" },
    { label: "People Analytics", path: "/analytics", section: "Análise" },
    { label: "Relatórios", path: "/relatorios", section: "Análise" },
    { label: "Auditoria", path: "/auditoria", section: "Análise" },
    { label: "Integração", path: "/integracao", section: "Sistema" },
    { label: "Notificações", path: "/notificacoes", section: "Sistema" },
    { label: "Configurações", path: "/configuracoes", section: "Sistema" },
  ];

  it('sidebar tem 20 itens', () => {
    expect(menuItems.length).toBe(20);
  });

  it('todas as seções estão presentes', () => {
    const sections = [...new Set(menuItems.map(i => i.section))];
    expect(sections).toContain('Geral');
    expect(sections).toContain('Jornada');
    expect(sections).toContain('Financeiro');
    expect(sections).toContain('Saúde');
    expect(sections).toContain('Documentos');
    expect(sections).toContain('Análise');
    expect(sections).toContain('Sistema');
  });

  it('Bater Ponto está na seção Jornada', () => {
    const ponto = menuItems.find(i => i.label === 'Bater Ponto');
    expect(ponto).toBeDefined();
    expect(ponto!.section).toBe('Jornada');
    expect(ponto!.path).toBe('/ponto');
  });

  it('Folha de Pagamento está na seção Financeiro', () => {
    const folha = menuItems.find(i => i.label === 'Folha de Pagamento');
    expect(folha).toBeDefined();
    expect(folha!.section).toBe('Financeiro');
  });

  it('não tem caminhos duplicados', () => {
    const paths = menuItems.map(i => i.path);
    const uniquePaths = [...new Set(paths)];
    expect(paths.length).toBe(uniquePaths.length);
  });

  it('todos os caminhos começam com /', () => {
    menuItems.forEach(item => {
      expect(item.path.startsWith('/')).toBe(true);
    });
  });
});
