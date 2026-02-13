# Contribuindo para RH Prime

Obrigado por considerar contribuir! Este documento fornece diretrizes para participar do projeto.

## Código de Conduta

Por favor, siga nosso padrão de profissionalismo:
- Respeite diferentes opiniões
- Comunique-se de forma clara e construtiva
- Sem assédio, discriminação ou comportamento tóxico
- Relatório de violações: john.eug@gmail.com

---

## Como Contribuir

### 1. Antes de Começar

- [ ] Leia [SECURITY.md](./SECURITY.md) - Protocolos de segurança
- [ ] Leia [COMPLIANCE.md](./COMPLIANCE.md) - Conforma legislação brasileira
- [ ] Configure o ambiente de desenvolvimento
- [ ] Instale hooks pre-commit

```bash
# Clone e setup
git clone https://github.com/JohnGomes84/rh-prime.git
cd rh-prime

# Backend
cd apps/api
npm install
cp .env.example .env
# Configure .env com suas variáveis

# Frontend
cd apps/web
npm install
cp .env.example .env

# Instalar pre-commit hooks
pip install pre-commit
pre-commit install
```

### 2. Fluxo de Trabalho

#### 2.1 Criar Issue (Sempre Começe Aqui)

**Para bugs:**
```markdown
## Bug Report

**Descrição**
O que aconteceu?

**Passos para Reproduzir**
1. ...
2. ...
3. ...

**Comportamento Esperado**
O que deveria acontecer?

**Comportamento Atual**
O que está acontecendo?

**Screenshots/Logs**
Anexe arquivos se relevante

**Ambiente**
- OS: [ex: Ubuntu 22.04, Windows 11]
- Node: [ex: 18.17.0]
- npm: [ex: 9.6.7]
```

**Para features:**
```markdown
## Feature Request

**Descrição**
Descreva brevemente o que você quer que seja adicionado.

**Problema que Resolve**
Qual problema do usuário isso resolve?

**Solução Proposta**
Como você gostaria que funcione?

**Critério de Aceitação**
- [ ] Ação 1
- [ ] Ação 2
- [ ] Ação 3

**Impacto de Conformidade**
Esta feature afeta legislação brasileira? Como?
```

#### 2.2 Fork & Branch

```bash
# Crie sua branch com padrão descritivo
git checkout -b <tipo>/<descrição>

# Padrões de branch:
# feature/employee-listing-optimization
# bugfix/cpf-validation-error
# docs/security-guidelines
# refactor/database-migrations
# test/payment-calculation
```

#### 2.3 Desenvolvendo

**Padrão de commits:**
```bash
# Use conventional commits
git commit -m "<tipo>(<escopo>): <descrição>"

# Tipos: feat, fix, docs, style, refactor, test, chore, security, compliance
# Exemplos:
git commit -m "feat(employees): add CPF validation with regex"
git commit -m "fix(payroll): correct INSS calculation for multiple brackets"
git commit -m "docs(compliance): update FGTS implementation details"
git commit -m "security(auth): implement rate limiting on login endpoint"
git commit -m "test(contracts): add termination calculation tests"
```

### 3. Padrões de Código

#### 3.1 TypeScript

**Regras Obrigatórias:**

```typescript
// ✅ SEMPRE tipado
interface EmployeePayroll {
  employee_id: string;
  base_salary: number;
  inss_contribution: number;
  ir_deduction: number;
  fgts_8_percent: number;
  net_salary: number;
}

// ❌ NUNCA use any
const data: any = getSalaryData();  // PROIBIDO

// ✅ Type inference is OK quando inferida de valores
const salary = calculateGross(employee);
const name = employee.name;

// ✅ Defina tipos para parâmetros
function calculateINSS(salary: number): number {
  // ...
}

// ❌ ERRADO
function calculateINSS(salary) {
  // ...
}
```

**Enums para constantes:**
```typescript
// ✅ MELHOR
enum VacationType {
  ANNUAL = 'ANNUAL',
  SICK_LEAVE = 'SICK_LEAVE',
  MATERNITY = 'MATERNITY'
}

const vacation: VacationType = VacationType.ANNUAL;

// ❌ EVITE strings soltas
const vacation = 'ANNUAL';  // Sem type safety
```

**Zod para validation:**
```typescript
import { z } from 'zod';

// Defina schemas para dados externos
const createEmployeeSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  cpf: z.string().regex(/^\d{11}$/, 'CPF inválido'),
  salary: z.number().positive().min(1320),
  role: z.enum(['HR', 'MANAGER', 'EMPLOYEE', 'ADMIN'])
});

// Use em handlers
export async function POST(req: Request) {
  const data = createEmployeeSchema.parse(await req.json());
  // data agora é tipo-seguro
}
```

**Async/Await (nunca callbacks):**
```typescript
// ✅ CORRETO
async function getEmployee(id: string): Promise<Employee> {
  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, id)
  });
  return employee;
}

// ❌ NUNCA
db.query((err, result) => {  // PROIBIDO
  // ...
});
```

**Logging estruturado:**
```typescript
import winston from 'winston';

const logger = winston.createLogger();

// ✅ CORRETO
logger.info('Employee created', {
  employee_id: id,
  department: dept,
  timestamp: new Date()
});

// ❌ NUNCA
console.log('Employee created');  // Use logger
logger.info(`Employee ${password} created`);  // Nunca logue secrets
```

**Tratar erros explicitamente:**
```typescript
// ✅ CORRETO
try {
  await updateEmployeeSalary(id, newSalary);
} catch (error) {
  if (error instanceof ValidationError) {
    res.status(400).json({ error: 'Invalid salary' });
  } else if (error instanceof DatabaseError) {
    res.status(500).json({ error: 'Database error' });
    logger.error('Database error', { error });
  } else {
    throw error;  // Re-throw desconhecidos
  }
}

// ❌ ERRADO
const result = await db.query();  // Sem try-catch
```

#### 3.2 React/TSX

**Componentes funcionais com hooks:**
```typescript
// ✅ CORRETO
import { useState, useCallback } from 'react';

interface EmployeeFormProps {
  onSubmit: (data: Employee) => Promise<void>;
  isLoading?: boolean;
}

export function EmployeeForm({ onSubmit, isLoading }: EmployeeFormProps) {
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate
      const validated = createEmployeeSchema.parse(formData);
      await onSubmit(validated);
    } catch (error) {
      // Handle errors
    }
  }, [formData, onSubmit]);

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={formData.name || ''}
        onChange={handleChange}
        aria-label="Employee name"
      />
      {errors.name && <span className="error">{errors.name}</span>}
    </form>
  );
}

// ❌ NUNCA use class components
export class EmployeeForm extends React.Component {  // PROIBIDO
  // ...
}
```

**Props tipadas:**
```typescript
// ✅ MELHOR
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', isLoading, ...props }: ButtonProps) {
  return <button {...props}>{isLoading ? '...' : props.children}</button>;
}

// ❌ EVITE
export function Button(props: any) {
  // ...
}
```

**Acessibilidade obrigatória:**
```typescript
// ✅ SEMPRE adicione
<input aria-label="Employee CPF" placeholder="XXX.XXX.XXX-XX" />
<button aria-label="Save changes">Salvar</button>
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// ❌ NUNCA use divs para interatividade
<div onClick={() => doSomething()}>Clique</div>  // Não é acessível

// ✅ USE button
<button onClick={() => doSomething()}>Clique</button>
```

#### 3.3 SQL & Drizzle ORM

**NUNCA concatena SQL:**
```typescript
// ❌ SQL INJECTION!
const employee = await db.query(`
  SELECT * FROM employees WHERE id = ${req.params.id}
`);

// ✅ Sempre use Drizzle com parâmetros seguros
import { eq } from 'drizzle-orm';

const employee = await db
  .select()
  .from(employees)
  .where(eq(employees.id, req.params.id))
  .execute();
```

**Migrations para alterações:**
```bash
# Criar migration
npm run db:create-migration add_salary_history

# Arquivo criado: migrations/0001_add_salary_history.sql
```

**Schema tipado:**
```typescript
// src/db/schema.ts
import { mysqlTable, varchar, decimal, date } from 'drizzle-orm/mysql-core';

export const employees = mysqlTable('employees', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  cpf: varchar('cpf', { length: 14 }).unique().notNull(),
  salary: decimal('salary', { precision: 10, scale: 2 }).notNull(),
  created_at: date('created_at').defaultNow()
});
```

### 4. Testes

**Jest para unit tests:**

```typescript
// tests/payroll.test.ts
import { describe, it, expect } from '@jest/globals';
import { calculateINSS } from '../src/payroll';

describe('Payroll Calculations', () => {
  describe('calculateINSS', () => {
    it('should apply correct rate for salary bracket 1', () => {
      const result = calculateINSS(1000);
      expect(result).toEqual(75);  // 7.5%
    });

    it('should cap INSS contribution', () => {
      const result = calculateINSS(10000);
      expect(result).toBeLessThanOrEqual(1183.28);  // Teto 2024
    });

    it('should handle negative salary', () => {
      const result = calculateINSS(-1000);
      expect(result).toEqual(0);
    });
  });
});

// Executar
npm test
```

**Cobertura mínima: 80%**

```bash
npm run test:coverage
```

### 5. Pull Request

#### 5.1 Cria uma PR bem estruturada

```markdown
## Descrição
Breve descrição do que esta PR faz.

## Ôí Issue Vinculada
Fecha #ISSUE_NUMBER

## Tipo de Mudança
- [ ] Feature nova
- [ ] Correção de bug
- [ ] Breaking change
- [ ] Mudança de documentação

## Checklist
- [ ] Testes adicionados/atualizados
- [ ] Cobertura > 80%
- [ ] Sem console.log() ou debugger
- [ ] Lint passa (`npm run lint`)
- [ ] Build passa (`npm run build`)
- [ ] SECURITY.md revisado (se relevante)
- [ ] COMPLIANCE.md revisado (se relevante)
- [ ] Documentado no README.md (se relevante)

## Screenshots (se UI)
Anexe screenshots antes/depois

## Notas Adicionais
Alguma coisa que o reviewer deve saber?
```

#### 5.2 Review Process

1. **Automated checks:**
   - Linting (ESLint)
   - Type checking (TypeScript)
   - Tests coverage
   - Build success

2. **Manual review:**
   - Code quality
   - Security issues
   - Compliance impact
   - Performance

3. **CI/CD Pipeline:**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   npm run build
   ```

### 6. Lint & Format

```bash
# ESLint + Prettier
npm run lint          # Verificar
npm run lint:fix      # Corrigir automaticamente

# TypeScript
npm run typecheck     # Verificar tipos

# Build
npm run build         # Compilar
```

**Regras ESLint:**
- Sem `console.log()` (usar logger Winston)
- Sem `any` type (use tipos explícitos)
- Sem `debugger` statements
- Sem variáveis não usadas
- Sem import sortstyles não organizados

### 7. Versão Semântica

Usamos Semantic Versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes
- **MINOR:** Features novas (backward-compatible)
- **PATCH:** Bug fixes

Exemplo: `1.2.3` → `1.2.4` (patch), `1.3.0` (minor), `2.0.0` (major)

### 8. Liberação de Versão

```bash
# Mé - é só para mantenedor
npm run release
# Automaticamente:
# - Incrementa versão
# - Gera CHANGELOG
# - Cria tag Git
# - Publica npm
```

---

## Estrutura do Projeto

```
rh-prime/
├── apps/
│   ├── api/                    # Backend (Node.js + Express)
│   │   ├── src/
│   │   │   ├── routes/         # Endpoints
│   │   │   ├── services/       # Lógica de negócio
│   │   │   ├── db/             # Schemas Drizzle
│   │   │   ├── middlewares/    # Auth, logging, etc
│   │   │   ├── utils/          # Funções úteis
│   │   │   └── types/          # Tipos TypeScript
│   │   ├── tests/              # Testes Jest
│   │   ├── .env.example
│   │   └── package.json
│   ├── web/                    # Frontend (React + TypeScript)
│   │   ├── src/
│   │   │   ├── components/     # Componentes React
│   │   │   ├── pages/          # Páginas
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── services/       # Integração API
│   │   │   ├── types/          # Tipos TypeScript
│   │   │   └── styles/         # Tailwind CSS
│   │   └── package.json
├── docs/                       # Documentação
├── migrations/                 # Database migrations
├── SECURITY.md                 # Diretrizes de segurança
├── COMPLIANCE.md               # Conformidade brasileira
├── CONTRIBUTING.md             # Este arquivo
└── README.md
```

---

## Comunicação

- **GitHub Issues:** Bugs, features, discussão
- **Pull Requests:** Código, documentação
- **Discussions:** Perguntas gerais, arquitetura
- **Email:** john.eug@gmail.com (assuntos confidenciais)

---

## Suporte

Tem dúvidas?
- Leia [README.md](./README.md)
- Procure em [Issues](https://github.com/JohnGomes84/rh-prime/issues)
- Pergunte em [Discussions](https://github.com/JohnGomes84/rh-prime/discussions)

Agradecemos sua contribuição! 🚀
