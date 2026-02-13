import { mysqlTable, varchar, decimal, datetime, int, text, mysqlEnum, boolean } from 'drizzle-orm/mysql-core';
import { employees } from '../../../drizzle/schema';

// Estrutura salarial base
export const salaryStructure = mysqlTable('salary_structure', {
  id: int('id').primaryKey().autoincrement(),
  employeeId: int('employee_id').notNull().references(() => employees.id),
  cpf: varchar('cpf', { length: 14 }).notNull(), // Chave vinculante
  baseSalary: decimal('base_salary', { precision: 12, scale: 2 }).notNull(),
  allowances: decimal('allowances', { precision: 12, scale: 2 }).default('0'),
  bonuses: decimal('bonuses', { precision: 12, scale: 2 }).default('0'),
  deductions: decimal('deductions', { precision: 12, scale: 2 }).default('0'),
  effectiveDate: datetime('effective_date').notNull(),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
});

// Folha de pagamento mensal
export const payroll = mysqlTable('payroll', {
  id: int('id').primaryKey().autoincrement(),
  employeeId: int('employee_id').notNull().references(() => employees.id),
  cpf: varchar('cpf', { length: 14 }).notNull(), // Chave vinculante
  month: int('month').notNull(), // 1-12
  year: int('year').notNull(),
  baseSalary: decimal('base_salary', { precision: 12, scale: 2 }).notNull(),
  allowances: decimal('allowances', { precision: 12, scale: 2 }).default('0'),
  bonuses: decimal('bonuses', { precision: 12, scale: 2 }).default('0'),
  grossSalary: decimal('gross_salary', { precision: 12, scale: 2 }).notNull(),
  inss: decimal('inss', { precision: 12, scale: 2 }).notNull(),
  ir: decimal('ir', { precision: 12, scale: 2 }).notNull(),
  fgts: decimal('fgts', { precision: 12, scale: 2 }).notNull(),
  otherDeductions: decimal('other_deductions', { precision: 12, scale: 2 }).default('0'),
  netSalary: decimal('net_salary', { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum('status', ['draft', 'calculated', 'approved', 'paid', 'cancelled']).default('draft'),
  paymentDate: datetime('payment_date'),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
});

// Holerite assinado digitalmente
export const payslip = mysqlTable('payslip', {
  id: int('id').primaryKey().autoincrement(),
  payrollId: int('payroll_id').notNull().references(() => payroll.id),
  cpf: varchar('cpf', { length: 14 }).notNull(), // Chave vinculante
  employeeId: int('employee_id').notNull().references(() => employees.id),
  documentUrl: varchar('document_url', { length: 500 }).notNull(),
  signatureId: int('signature_id'),
  isSigned: boolean('is_signed').default(false),
  signedAt: datetime('signed_at'),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
});

// Benefícios
export const benefits = mysqlTable('benefits', {
  id: int('id').primaryKey().autoincrement(),
  employeeId: int('employee_id').notNull().references(() => employees.id),
  cpf: varchar('cpf', { length: 14 }).notNull(), // Chave vinculante
  type: mysqlEnum('type', ['vr', 'va', 'vt', 'health', 'dental', 'life_insurance', 'other']).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  effectiveDate: datetime('effective_date').notNull(),
  expiryDate: datetime('expiry_date'),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
});

// Histórico de folha (auditoria)
export const payrollHistory = mysqlTable('payroll_history', {
  id: int('id').primaryKey().autoincrement(),
  payrollId: int('payroll_id').notNull().references(() => payroll.id),
  cpf: varchar('cpf', { length: 14 }).notNull(), // Chave vinculante
  action: mysqlEnum('action', ['created', 'calculated', 'approved', 'paid', 'cancelled', 'modified']).notNull(),
  changedBy: varchar('changed_by', { length: 255 }).notNull(),
  previousValues: text('previous_values'), // JSON
  newValues: text('new_values'), // JSON
  createdAt: datetime('created_at'),
});
