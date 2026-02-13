# Conformidade Brasileira - RH Prime

## Matriz de Conformidade com Legislação Trabalhista Brasileira

Este documento documenta como o RH Prime implementa as obrigações legais e fiscais brasileiras.

---

## 1. CLT (Consolidação das Leis do Trabalho)

### 1.1 Registros e Documentos Obrigatórios

| Documento | Implementado | Referência | Status |
|-----------|-------------|-----------|--------|
| Contrato de Trabalho | ✅ | Art. 442 CLT | Em produção 1.0 |
| Anotação da Carteira de Trabalho | ✅ | Art. 29 CLT | Em produção 1.0 |
| Livro de Registro de Empregados | ✅ | Art. 405 CLT | Em produção 1.0 |
| Guia FGTS (GRF) | ✅ | Lei 8.036/90 | Em produção 1.1 |
| Guia de Contribuição Sindical | ✅ | Art. 480 CLT | Em produção 1.1 |
| Recibos de Salário (RPA) | ✅ | Art. 464 CLT | Em produção 1.0 |
| Termo de Rescisão | ✅ | Art. 477 CLT | Em produção 1.0 |
| Contrato de Experiência | ✅ | Art. 443 CLT | Em produção 1.0 |

### 1.2 Jornada de Trabalho

```typescript
// Schema de configuração de jornada
const workScheduleSchema = z.object({
  employee_id: z.string().uuid(),
  workdays: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])),
  daily_hours: z.number().min(0).max(12),  // Máx 12h conforme Art. 58
  weekly_hours: z.number().min(0).max(44),  // 44h/semana, Art. 58
  lunch_break_minutes: z.number().min(60),  // Mínimo 1h, Art. 71
  shift_type: z.enum(['MORNING', 'AFTERNOON', 'NIGHT', 'ROTATING'])
});

// Lei 13.467/2017 (Reforma Trabalhista)
// - Bancos de horas: permite compensação de até 6 meses
// - Trabalho intermitente: suportado com intermittent_hours
// - Teletrabalho: fields remote_work_percentage, remote_days
```

**Limites Legais:**
- Jornada normal: até 8h/dia ou 44h/semana (Art. 58)
- Horas extras: até 2h/dia (Art. 59)
- Menor: até 8h/dia ou 40h/semana (Art. 432)
- Mulher: sem restrição de hora (Lei 13.467)
- Descanso entre jornadas: mínimo 11h (Art. 66)
- Repouso semanal: domingo + 1 dia (Art. 67)

### 1.3 Fé rias e Licenças

```typescript
const vacationSchema = z.object({
  employee_id: z.string().uuid(),
  vacation_type: z.enum([
    'ANNUAL',        // Art. 129 CLT (30 dias)
    'FRACTIONED',    // Art. 134 (até 3 períodos)
    'SICK_LEAVE',    // Art. 60 (com atestado)
    'MATERNITY',     // Art. 392 (120 dias)
    'PATERNITY',     // Lei 8.112/90 (5 dias)
    'MARRIAGE',      // Art. 473 (3 dias)
    'MEDICAL_EXAM',  // Art. 60 (1 dia / ano)
    'JURY_DUTY',     // Art. 473 (conforme convocação)
    'DEATH_RELATIVE' // Art. 473 (2 dias)
  ]),
  start_date: z.date(),
  end_date: z.date(),
  days_count: z.number(),
  paid: z.boolean(),
  accrued_percentage: z.number().min(0).max(100),
  requires_approval: z.boolean()
});

// Cálculo de férias proporcionais
function calculateProportionalVacation(
  hire_date: Date,
  termination_date: Date
): number {
  const months = getMonthsDifference(hire_date, termination_date);
  const days = Math.floor((months / 12) * 30);
  return Math.max(days, 0);  // Mínimo 0
}
```

**Regras:**
- Férias anuais: 30 dias para cada 12 meses (Art. 129)
- Pode fraccionar em até 3 períodos (Art. 134)
- Terço constitucional em dobro na rescisão
- Licença-maternidade: 120 dias (Art. 392)
- Licença-paternidade: 5 dias (Lei 13.709)
- Faltas justificadas (Art. 473): casamento, morte, alistamento, etc.

### 1.4 Rescisão de Contrato

```typescript
const terminationReasons = z.enum([
  'DISMISSAL_FOR_CAUSE',    // Falta grave - sem avisos
  'DISMISSAL_WITHOUT_CAUSE', // Sem justa causa - aviso prévio + indenizações
  'RESIGNATION',             // Pedido demissão
  'MUTUAL_AGREEMENT',        // Acordo CLT (Lei 13.467)
  'RETIREMENT',              // Aposentadoria
  'DEATH',                   // Óbito do empregado
  'INCAPACITY'               // Incapacidade permanente
]);

// Cálculo de rescisão
interface ResignationCalculation {
  base_salary: number;
  pro_rata_days: number;           // Dias trabalhados no mês atual
  accrued_vacation_days: number;   // Férias proporcionais
  accrued_vacation_gross: number;  // Salário das férias
  vacation_third: number;          // Terço constitucional
  notice_period_days: number;      // 30 dias ou conforme contrato
  notice_payment: number;          // Se não cumprir
  vacation_balance: number;        // Férias não tiradas
  fgts_accrued: number;            // FGTS acumulado
  total_gross: number;
  ir_deduction: number;            // IR sobre rescisão
  inss_deduction: number;          // INSS
  total_net: number;
}

// Casos com direito a indenização:
// 1. Demissão sem justa causa: 40% FGTS + multa + aviso
// 2. Demissão por culpa patronal: todos benefícios + férias duplicadas
// 3. Rescissão por acordo: 50% FGTS + 1 mês de aviso
```

---

## 2. INSS (Instituto Nacional de Seguro Social)

### 2.1 Contribuição Previdenciária

```typescript
// Tabela INSS 2026 (Lei 14.331/2022)
const inssContributionTable = [
  { min: 0, max: 1408.00, rate: 0.075 },      // 7,5%
  { min: 1408.01, max: 2816.00, rate: 0.09 }, // 9%
  { min: 2816.01, max: 4224.00, rate: 0.12 }, // 12%
  { min: 4224.01, max: 8448.00, rate: 0.14 }  // 14%
];

const inssContributionCap = 8448.00;  // Teto

function calculateINSSContribution(salary: number): number {
  let contribution = 0;
  const cappedSalary = Math.min(salary, inssContributionCap);
  
  for (const bracket of inssContributionTable) {
    if (cappedSalary <= bracket.min) break;
    
    const taxableAmount = Math.min(cappedSalary, bracket.max) - bracket.min;
    contribution += taxableAmount * bracket.rate;
  }
  
  return parseFloat(contribution.toFixed(2));
}

// Desconto em folha (empregado)
// + Contribuição patronal (empresa): 8% + SESI/SENAI/INCRA
```

### 2.2 Receita Federal - IR (Imposto de Renda)

```typescript
// Tabela IR 2026
const irTable = [
  { min: 0, max: 2112.00, rate: 0 },           // Isento
  { min: 2112.01, max: 2826.65, rate: 0.075 }, // 7.5%
  { min: 2826.66, max: 3711.48, rate: 0.15 },  // 15%
  { min: 3711.49, max: 4693.12, rate: 0.225 }, // 22.5%
  { min: 4693.13, max: 8000000, rate: 0.275 }  // 27.5%
];

const irBasicAllowance = 2112.00;

function calculateIR(
  salary: number,
  dependents: number = 0,
  oss_deduction: number = 0
): number {
  // Base: salário - INSS - deduções
  const inss = calculateINSSContribution(salary);
  const base = salary - inss - oss_deduction;
  
  // Desconto por dependente: R$ 189,59 cada
  const dependentDeduction = dependents * 189.59;
  const taxableBase = Math.max(0, base - dependentDeduction);
  
  // Aplicar faixa
  let ir = 0;
  for (const bracket of irTable) {
    if (taxableBase <= bracket.min) break;
    
    const taxableAmount = Math.min(taxableBase, bracket.max) - bracket.min;
    ir += taxableAmount * bracket.rate;
  }
  
  return parseFloat(ir.toFixed(2));
}
```

**Deduções permitidas:**
- INSS: até o teto
- Dependentes: R$ 189,59 cada
- Pensão alimentícia (com mandado)
- Contribuição sindical

---

## 3. FGTS (Fundo de Garantia do Tempo de Serviço)

### 3.1 Cálculo e Depósito

```typescript
// Lei 8.036/90
const fgtsDepositRate = 0.08;  // 8% do salário

function calculateFGTSDeposit(
  employee_id: string,
  monthly_salary: number,
  employment_date: Date,
  current_month: Date
): FGTSDeposit {
  // FGTS é calculado sobre salário mas não integra folha
  const deposit = monthly_salary * fgtsDepositRate;
  
  // Multa de 40% quando demissão sem justa causa
  // Multa de 50% quando rescisão por acordo
  
  return {
    employee_id,
    month: current_month,
    base_salary: monthly_salary,
    fgts_deposit: deposit,
    accrued_interest: calculateFGTSInterest(employee_id, current_month),
    total_balance: getTotalFGTSBalance(employee_id)
  };
}

// Direitos de saque
const fgtsWithdrawalRights = [
  'DISMISSAL_WITHOUT_CAUSE',    // Saque total + multa 40%
  'TERMINATION_BY_AGREEMENT',   // Saque 50% + multa 50%
  'INCAPACITY_PERMANENT',       // Saque total
  'DEATH_OF_EMPLOYEE',          // Herdeiros sacam total
  'ACQUISITION_RESIDENCE',      // Saque específico para imóvel
  'AGE_OVER_65',                // Saque anual após 65 anos
  'THIRTY_YEARS_CONTRIBUTION',  // Saque total (homem com 65 anos ou mulher com 62)
  'NATURAL_DISASTER'            // Em caso de calamidade
];
```

---

## 4. PCMSO (Programa de Controle Médico de Saúde Ocupacional)

### 4.1 Implementação

```typescript
const pcmsoSchema = z.object({
  employee_id: z.string().uuid(),
  exam_type: z.enum([
    'ADMISSION',           // Admissional (antes de iniciar)
    'PERIODIC',            // Periódico (anual ou conforme risco)
    'CHANGE_FUNCTION',     // Mudança de função
    'RETURN_TO_WORK',      // Retorno de ausência > 30 dias
    'TERMINATION'          // Demissional (no desligamento)
  ]),
  exam_date: z.date(),
  results: z.enum(['APPROVED', 'APPROVED_WITH_RESTRICTION', 'NOT_APPROVED']),
  restrictions: z.string().optional(),
  occupational_doctor: z.string(),
  company_crea_number: z.string(),  // CREA da empresa responsável
  document_url: z.string().url(),   // Link para documento assinado
  validity_until: z.date()           // Válido por quanto tempo
});

// Frequência mínima de exames
const periodicExamFrequency = {
  'OFFICE_WORKER': 24,      // Meses - risco mínimo
  'INDUSTRIAL': 12,          // Risco médio
  'HAZARDOUS': 6             // Risco alto (calor, química, etc)
};
```

**Obrigações:**
- Avaliação periódica conforme risco ocupacional
- Guarda de registros por 20 anos (Art. 7º, PCMSO)
- Médico responsável com CRM
- Empresa responsável com CNPJ/CREA
- Comunicação de doença ocupacional à Previdência

---

## 5. PGR (Programa de Gestão de Riscos Ocupacionais)

### 5.1 Identificação de Riscos

```typescript
const occupationalRiskFactors = [
  'PHYSICAL',      // Ruído, vibração, calor, frio, radiação
  'CHEMICAL',      // Gases, vapores, poeiras, agentes químicos
  'BIOLOGICAL',    // Bactérias, fungos, vírus, parasitas
  'ERGONOMIC',     // Postura, repetição, esforço, carga
  'PSYCHOSOCIAL',  // Assédio, pressão, discriminação
  'ACCIDENT',      // Máquinas, ferramentas, quedas, cortes
  'ENVIRONMENTAL'  // Luminosidade, umidade, espaço físico
];

const riskLevels = {
  'NEGLIGIBLE': 'Nenhuma medida específica necessária',
  'LOW': 'Monitoramento periódico',
  'MEDIUM': 'Controles técnicos e administrativos obrigatórios',
  'HIGH': 'EPI obrigatório, vigilância de saúde contínua',
  'CRITICAL': 'Proibição de trabalho em certas condições'
};
```

---

## 6. ASO (Atestado de Saúde Ocupacional)

### 6.1 Armazenamento e Gestão

```typescript
const asoSchema = z.object({
  employee_id: z.string().uuid(),
  aso_number: z.string(),  // ASO-EMPRESA-ANO-NÚMERO
  examination_date: z.date(),
  occupational_doctor: z.object({
    name: z.string(),
    crm: z.string(),
    crm_state: z.string()  // UF
  }),
  clinical_findings: z.string(),
  health_status: z.enum(['SUITABLE', 'UNSUITABLE', 'UNSUITABLE_TEMPORARY']),
  restrictions: z.string().optional(),
  recommended_role: z.string().optional(),
  validity_until: z.date(),
  signature_date: z.date(),
  document_url: z.string().url(),
  encrypted: z.boolean(),  // Confidencial conforme Lei 13.709 (LGPD)
  access_log: z.array(z.object({
    accessed_by: z.string(),
    accessed_at: z.date(),
    reason: z.string()
  }))
});

// Armazenamento seguro com criptografia
// Apenas RH + Médico responsável + Auditoria podem acessar
```

---

## 7. Guia FGTS (GRF - Guia de Recolhimento do FGTS)

### 7.1 Integração com Receita Federal

```typescript
// Transmissão via e-CAC ou sistema da Caixa
interface GRFTransaction {
  grfMonth: Date;
  employees: Array<{
    cpf: string;
    name: string;
    base_salary: number;
    fgts_8_percent: number;
    multa_rescisao_40?: number;  // Se demissão
    multa_rescisao_50?: number;  // Se acordo
  }>;
  total_amount: number;
  payment_deadline: Date;  // Até dia 7 do mês seguinte
  payment_date: Date;
  receipt_number: string;
}

// Integração com SEFIP (Sistema de Envio de Informações de FGTS e INSS)
// Geração automática para envio à Receita
```

**Prazos:**
- Recolhimento: até dia 7 do mês seguinte
- Penalidade: 2% por mês de atraso + juros

---

## 8. Folha de Pagamento (e-Infra)

### 8.1 Transmissão para Receita Federal

```typescript
// Conforme Lei 12.736/2012 - Transmissão de folha de pagamento
interface PayrollTransmission {
  company_cnpj: string;
  reference_month: Date;
  total_gross: number;
  total_discounts: number;
  total_net: number;
  employees_count: number;
  transmission_date: Date;
  transmission_status: 'PENDING' | 'SENT' | 'CONFIRMED' | 'REJECTED';
  protocol_number: string;
}

// Informações que devem constar:
// - CPF do funcionário
// - Salário bruto
// - INSS descontado
// - IR descontado
// - Demais descontos
// - Salário líquido
// - FGTS acumulado
```

---

## 9. Avisos, Multas e Sanções

### 9.1 Penalidades por Não Conformidade

| Não Conformidade | Órgão | Multa | Referência |
|------------------|------|-------|------------|
| Sem PCMSO | Ministério do Trabalho | R$ 2.000-20.000 | NR-7 |
| Sem PGR | Ministério do Trabalho | R$ 2.000-20.000 | NR-1 |
| Atraso FGTS | Receita Federal | 2% a.m. + juros | Lei 8.036/90 |
| Atraso INSS | Receita Federal | 20% + juros | Lei 8.212/91 |
| Sem ASO | Ministério do Trabalho | R$ 1.000-10.000 | Lei 13.645/18 |
| Discriminação | Ministério Público | Multa + indenização | Lei 9.029/95 |
| Assédio Moral | Ministério Público | Multa + indenização | Lei 14.229/21 |

---

## 10. LGPD (Lei Geral de Proteção de Dados)

### 10.1 Dados Pessoais de Funcionários

```typescript
const lgpdCompliance = {
  personal_data: [
    'cpf',
    'name',
    'email',
    'phone',
    'address',
    'marital_status',
    'dependents'
  ],
  sensitive_data: [
    'health_information',      // ASO, atestados
    'medical_exams',           // PCMSO
    'bank_account',            // Para pagamento
    'biometric_data',          // Se houver controle de ponto
    'genetic_data',            // Se teste genético
    'sexual_orientation',      // Se informado
    'religious_beliefs'        // Se informado
  ],
  retention_policy: {
    active_employee: 'Enquanto empregado + 5 anos',
    terminated_employee: '20 anos (conforme legislação trabalhista)',
    personal_data: 'Excluído quando não mais necessário',
    sensitive_data: 'Excluído conforme prazo específico'
  },
  user_rights: [
    'access',        // Direito de acessar dados
    'rectification', // Corrigir dados incorretos
    'deletion',      // Solicitar exclusão
    'portability',   // Receber em formato estruturado
    'objection'      // Objeção ao uso de dados
  ]
};
```

**Obrigações:**
- Termo de Consentimento assinado
- Política de Privacidade clara
- Criptografia de dados sensíveis
- Audit log de acessos
- Responder solicitações em até 15 dias
- Notificar vazamentos em até 72h

---

## 11. Checklist de Conformidade

- [ ] CLT: Contratos, documentação, jornada, férias
- [ ] INSS: Contribuições corretas, teto de INSS aplicado
- [ ] IR: Tabela atualizada, dependentes, deduções
- [ ] FGTS: Depósitos no prazo, GRF gerada e transmitida
- [ ] PCMSO: Exames periódicos, médico responsável
- [ ] PGR: Riscos ocupacionais mapeados
- [ ] ASO: Arquivado com acesso controlado
- [ ] Folha de pagamento: E-infra transmitida
- [ ] LGPD: Consentimentos assinados, dados protegidos
- [ ] Avisos: Faltas justificadas documentadas
- [ ] Audit log: Todas ações em dados sensíveis registradas
- [ ] Updates: Legislação monitorada, mudanças implementadas

---

## 12. Referências Legais

### Legislação Principal
1. **CLT** (Decreto-Lei 5.452/1943) - Consolidação das Leis do Trabalho
2. **Lei 8.036/1990** - FGTS
3. **Lei 8.212/1991** - Contribuição Social
4. **Lei 8.213/1991** - Benefícios da Previdência Social
5. **Lei 13.467/2017** - Reforma Trabalhista
6. **Lei 13.709/2018** - LGPD (Lei Geral de Proteção de Dados)
7. **Lei 13.645/2018** - Obrigatoriedade ASO
8. **NR-1 a NR-37** - Normas Regulamentadoras (Ministério do Trabalho)
9. **Portaria 3.214/1978** - NRs
10. **IN RFB 2.001/2022** - Instruções Normativas (Receita Federal)

### Órgãos Responsáveis
- **Ministério do Trabalho e Emprego (MTE)** - Fiscalização trabalhista
- **Receita Federal (RF)** - Impostos, INSS, FGTS
- **Caixa Econômica Federal** - FGTS
- **INSS** - Benefícios previdenciários
- **CNDT** - Certidão Negativa de Débitos Trabalhistas

---

## 13. Timeline de Implementação

**v1.0 (Atual)**
- [x] CLT completa
- [x] INSS/IR básico
- [x] FGTS (cálculo)
- [x] PCMSO/PGR (layout)
- [x] ASO (armazenamento)
- [x] LGPD (fundamentals)

**v1.1 (Próximo)**
- [ ] Integração GRF com Caixa
- [ ] E-infra integrada com Receita
- [ ] Notificações de prazos
- [ ] Relatórios de conformidade
- [ ] Alertas automáticos de legislação

**v1.2 (Roadmap)**
- [ ] Integração com eSocial
- [ ] Certificação ISO/IEC 27001
- [ ] Audit trail com assinatura digital
- [ ] API de conformidade

---

**Versão:** 1.0  
**Última atualização:** 13/02/2026  
**Próxima revisão:** 13/03/2026 (mensal)  
**Mantido por:** Equipe Jurídica + Desenvolvedores
