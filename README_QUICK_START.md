# FinHub Inteligente - Quick Start Guide

## 🚀 Início Rápido (5 minutos)

### 1. Clonar e Instalar

```bash
git clone https://github.com/JohnGomes84/finhub-inteligente.git
cd finhub-inteligente
pnpm install
```

### 2. Configurar Ambiente

As variáveis de ambiente são injetadas automaticamente pelo Manus. Localmente, criar `.env.local`:

```env
DATABASE_URL=mysql://root:password@localhost:3306/finhub
JWT_SECRET=seu-secret-jwt-aqui
VITE_APP_ID=seu-app-id
```

### 3. Iniciar Dev Server

```bash
pnpm dev
```

Acesse: http://localhost:3000

---

## 📊 Fluxo Principal

### Dashboard Financeiro

1. **Acesso**: Menu → Dashboard
2. **Dados Exibidos**:
   - Faturamento do mês
   - Custos operacionais
   - Margem de lucro
   - Total de trabalhos
   - Alertas automáticos
   - Gráfico de evolução diária
   - Top 3 clientes
   - Resumo de contas

3. **Ações**:
   - Navegar entre meses (← →)
   - Gerar relatório PDF
   - Validar planejamentos

---

## 🎯 Endpoints Principais

### Dashboard

```bash
# KPIs mensais
GET /api/trpc/dashboard.getMonthlyKPIs?input={"year":2026,"month":4}

# Alertas
GET /api/trpc/dashboard.getAlerts?input={"year":2026,"month":4}

# Score de saúde
GET /api/trpc/dashboardEnhancements.getHealthScore?input={"year":2026,"month":4}

# Comparação trimestral
GET /api/trpc/dashboardEnhancements.getTrimestrialComparison?input={"year":2026}

# Exportar dados
GET /api/trpc/dashboardEnhancements.getExportData?input={"year":2026,"month":4,"format":"csv"}
```

### Relatórios

```bash
# Gerar PDF
POST /api/trpc/reportGeneration.generateMonthlyReport
Body: { year, month, kpis, alerts, accountsSummary }
```

### Portal do Líder

```bash
# Listar solicitações PIX
GET /api/trpc/portalLider.listPixRequests

# Aprovar PIX
POST /api/trpc/portalLider.approvePixRequest
Body: { requestId, approved }
```

---

## 📁 Estrutura de Pastas Essenciais

```
client/src/
├── pages/
│   ├── Dashboard.tsx          ← Dashboard financeiro
│   ├── Analytics.tsx          ← Analytics avançado
│   ├── PortalLider.tsx        ← Portal do líder
│   └── ...
├── components/
│   ├── DashboardLayout.tsx    ← Layout com sidebar
│   ├── HealthScoreGauge.tsx   ← Score de saúde
│   └── ...
└── lib/
    └── trpc.ts                ← Cliente tRPC

server/routers/
├── dashboard.ts               ← KPIs e alertas
├── dashboard-enhancements.ts  ← Score, trimestral, export
├── report-generation.ts       ← Geração de PDF
├── portalLider.ts             ← Portal do líder
└── ...

drizzle/
├── schema.ts                  ← Definição de tabelas
└── migrations/                ← SQL migrations
```

---

## 🔧 Adicionar Nova Feature (Passo a Passo)

### Exemplo: Adicionar "Contas Bancárias"

#### 1️⃣ Schema (drizzle/schema.ts)

```typescript
export const bankAccounts = mysqlTable('bank_accounts', {
  id: int().primaryKey().autoincrement(),
  name: varchar({ length: 255 }).notNull(),
  accountNumber: varchar({ length: 50 }).notNull(),
  balance: decimal({ precision: 15, scale: 2 }).default('0'),
  createdAt: datetime().default(sql`CURRENT_TIMESTAMP`),
});
```

#### 2️⃣ Migration

```bash
pnpm drizzle-kit generate
# Copiar SQL gerado e executar no banco
```

#### 3️⃣ Query Helper (server/db.ts)

```typescript
export async function getBankAccounts() {
  const db = await getDb();
  return db.select().from(bankAccounts);
}
```

#### 4️⃣ Router (server/routers/bankAccounts.ts)

```typescript
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getBankAccounts } from "../db";

export const bankAccountsRouter = router({
  list: protectedProcedure.query(async () => {
    return getBankAccounts();
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string(), accountNumber: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      return db.insert(bankAccounts).values(input);
    }),
});
```

#### 5️⃣ Registrar Router (server/routers.ts)

```typescript
import { bankAccountsRouter } from "./routers/bankAccounts";

export const appRouter = router({
  bankAccounts: bankAccountsRouter,
  // ...
});
```

#### 6️⃣ Página Frontend (client/src/pages/BankAccounts.tsx)

```tsx
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";

export function BankAccounts() {
  const { data: accounts, isLoading } = trpc.bankAccounts.list.useQuery();

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-4">
      {accounts?.map((acc) => (
        <Card key={acc.id} className="p-4">
          <h3>{acc.name}</h3>
          <p>Saldo: R$ {acc.balance}</p>
        </Card>
      ))}
    </div>
  );
}
```

#### 7️⃣ Registrar Rota (client/src/App.tsx)

```tsx
import { BankAccounts } from "@/pages/BankAccounts";

export function App() {
  return (
    <Router>
      <Route path="/contas-bancarias" component={BankAccounts} />
      {/* ... */}
    </Router>
  );
}
```

#### 8️⃣ Testar

```bash
pnpm dev
# Acessar http://localhost:3000/contas-bancarias
```

---

## 🧪 Testes

### Rodar Testes

```bash
pnpm test
```

### Escrever Teste (server/bankAccounts.test.ts)

```typescript
import { describe, it, expect } from "vitest";
import { getBankAccounts } from "../db";

describe("BankAccounts", () => {
  it("should list all accounts", async () => {
    const accounts = await getBankAccounts();
    expect(Array.isArray(accounts)).toBe(true);
  });
});
```

---

## 📈 Score de Saúde Financeira

**Fórmula**:

```
Score Total = Margem (40%) + Inadimplência (30%) + Dias de Caixa (30%)

Margem = (Receita - Custos) / Receita × 40
Inadimplência = 30 - (Taxa Atraso × 0.3)
Dias de Caixa = (Receita / Custos Diários) / 30 × 30

Status:
- Excellent: ≥ 75
- Good: 50-74
- Warning: 25-49
- Critical: < 25
```

---

## 🔐 Autenticação

### Login Flow

1. Usuário clica "Login"
2. Redireciona para Manus OAuth
3. Manus valida credenciais
4. Callback com JWT
5. Cookie de sessão criado
6. Acesso ao dashboard

### Verificar Autenticação (Frontend)

```tsx
import { useAuth } from "@/hooks/useAuth";

export function MyComponent() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Carregando...</div>;
  if (!user) return <div>Não autenticado</div>;

  return <div>Bem-vindo, {user.name}!</div>;
}
```

---

## 🚨 Troubleshooting

### "Database not available"

```bash
# Verificar conexão
mysql -h $DATABASE_HOST -u $DATABASE_USER -p$DATABASE_PASSWORD -D $DATABASE_NAME

# Verificar variáveis de ambiente
echo $DATABASE_URL
```

### "Failed to fetch" no Dashboard

1. Abrir DevTools (F12)
2. Ir para Console
3. Procurar por erro específico
4. Verificar `server/routers/dashboard.ts`

### Build falha com TypeScript errors

```bash
# Ignorar erros temporariamente
pnpm build --force

# Ou corrigir tipos
pnpm tsc --noEmit
```

---

## 📚 Documentação Completa

Ver `DOCUMENTATION.md` para guia detalhado de:
- Arquitetura completa
- Todas as tabelas do banco
- Todos os endpoints
- Componentes React
- Variáveis de ambiente
- Performance & otimizações

---

## 🎓 Recursos Úteis

- **tRPC Docs**: https://trpc.io
- **Drizzle ORM**: https://orm.drizzle.team
- **Tailwind CSS**: https://tailwindcss.com
- **React 19**: https://react.dev
- **shadcn/ui**: https://ui.shadcn.com

---

## 📞 Suporte

- GitHub: JohnGomes84/finhub-inteligente
- Issues: https://github.com/JohnGomes84/finhub-inteligente/issues
- Versão: 3.9

---

**Última atualização**: 2026-04-05
