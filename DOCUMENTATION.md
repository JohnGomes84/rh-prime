# FinHub Inteligente - Documentação Completa v3.9

## 📋 Visão Geral

**FinHub Inteligente** é um sistema de gestão financeira integrado para empresas de serviços (especialmente ML Serviços). Fornece controle de contas a pagar/receber, gestão de recursos humanos, planejamento de trabalhos, portal do líder, e analytics avançado com geração de relatórios automáticos.

**Versão**: 3.9  
**Stack**: React 19 + Tailwind 4 + Express 4 + tRPC 11 + MySQL/TiDB + Drizzle ORM  
**Deploy**: Manus (finhubapp-bwutngty.manus.space)  
**GitHub**: JohnGomes84/finhub-inteligente

---

## 🏗️ Arquitetura

### Estrutura de Pastas

```
finhub-inteligente/
├── client/                          # Frontend React 19
│   ├── src/
│   │   ├── pages/                   # Páginas por feature
│   │   │   ├── Dashboard.tsx        # Dashboard financeiro
│   │   │   ├── Analytics.tsx        # Analytics avançado
│   │   │   ├── Employees.tsx        # Gestão de funcionários
│   │   │   ├── Clients.tsx          # Gestão de clientes
│   │   │   ├── PortalLider.tsx      # Portal do líder
│   │   │   ├── PixApproval.tsx      # Aprovação de PIX
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx  # Layout principal com sidebar
│   │   │   ├── HealthScoreGauge.tsx # Score de saúde financeira
│   │   │   ├── Map.tsx              # Integração Google Maps
│   │   │   ├── AIChatBox.tsx        # Chat com IA
│   │   │   └── ...
│   │   ├── lib/
│   │   │   └── trpc.ts              # Cliente tRPC
│   │   ├── App.tsx                  # Rotas e layout
│   │   └── main.tsx                 # Providers
│   └── public/                      # Assets estáticos mínimos
├── server/
│   ├── routers/                     # Procedimentos tRPC
│   │   ├── dashboard.ts             # KPIs, alertas, evolução
│   │   ├── dashboard-enhancements.ts # Score, trimestral, export
│   │   ├── report-generation.ts     # Geração de PDF
│   │   ├── employees.ts             # CRUD funcionários
│   │   ├── clients.ts               # CRUD clientes
│   │   ├── portalLider.ts           # Portal do líder
│   │   ├── pixApproval.ts           # Aprovação PIX
│   │   └── ...
│   ├── db.ts                        # Query helpers
│   ├── routers.ts                   # Agregador de routers
│   └── _core/                       # Framework (não editar)
│       ├── context.ts               # Contexto tRPC + auth
│       ├── trpc.ts                  # Definição de procedures
│       ├── oauth.ts                 # Manus OAuth
│       ├── llm.ts                   # Integração LLM
│       ├── voiceTranscription.ts    # Whisper API
│       ├── imageGeneration.ts       # Geração de imagens
│       └── ...
├── drizzle/
│   ├── schema.ts                    # Definição de tabelas
│   └── migrations/                  # SQL migrations
├── shared/                          # Tipos compartilhados
└── storage/                         # Helpers S3

```

### Stack Técnico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React | 19 |
| Styling | Tailwind CSS | 4 |
| UI Components | shadcn/ui | Latest |
| Backend | Express | 4 |
| RPC | tRPC | 11 |
| ORM | Drizzle | Latest |
| Database | MySQL/TiDB | Latest |
| Auth | Manus OAuth | Built-in |
| PDF | pdf-lib | Latest |
| Maps | Google Maps API | Via Proxy |
| LLM | OpenAI Compatible | Via Forge API |

---

## 📊 Módulos Principais

### 1. Dashboard Financeiro (`server/routers/dashboard.ts`)

**Responsabilidade**: Fornecer visão consolidada de saúde financeira mensal.

**Endpoints**:

```typescript
// KPIs principais (faturamento, custos, margem, trabalhos)
dashboard.getMonthlyKPIs({ year: 2026, month: 4 })
→ {
    revenue: { current, previous, variation },
    costs: { current, previous, variation },
    margin: { current, previous, variation, isNegative },
    works: { current, previous, variation }
  }

// Alertas estruturados
dashboard.getAlerts({ year: 2026, month: 4 })
→ {
    loss: { exists, amount, month },
    overdueAccounts: { count, total },
    employeesWithoutPix: { count },
    pendingSchedules: { count }
  }

// Evolução diária
dashboard.getDailyFinancialEvolution({ year: 2026, month: 4 })
→ [{ date, revenue, costs, margin }, ...]

// Top 3 clientes
dashboard.getTopClients({ year: 2026, month: 4 })
→ [{ clientId, clientName, totalRevenue, workCount }, ...]

// Resumo de contas
dashboard.getAccountsSummary({ year: 2026, month: 4 })
→ {
    payablePending, payablePaid,
    receivablePending, receivablePaid,
    forecastedBalance
  }
```

**Queries Otimizadas**:
- Usa Drizzle ORM com `sql<type>` para type-safety
- Cálculos de margem, variação e totais no servidor
- Suporta filtro por período (mês/trimestre/ano)

---

### 2. Melhorias Dashboard (`server/routers/dashboard-enhancements.ts`)

**Responsabilidade**: Analytics avançado, comparações e exportação.

**Endpoints**:

```typescript
// Score de saúde (0-100)
dashboardEnhancements.getHealthScore({ year: 2026, month: 4 })
→ {
    score: 78,
    status: 'good',
    breakdown: {
      margin: { score: 40, percentage: 45 },
      delinquency: { score: 25, percentage: 8 },
      cashDays: { score: 13, days: 18 }
    }
  }

// Comparação trimestral + YTD
dashboardEnhancements.getTrimestrialComparison({ year: 2026 })
→ {
    quarters: [
      { quarter: 'Q1', revenue, costs, margin, marginPercent },
      ...
    ],
    ytd: { revenue, costs, margin, marginPercent }
  }

// Exportação (CSV/JSON)
dashboardEnhancements.getExportData({ 
  year: 2026, month: 4, format: 'csv' 
})
→ { data: string, filename: string }
```

**Cálculo do Score**:
- **Margem (40%)**: (Receita - Custos) / Receita × 40
- **Inadimplência (30%)**: 30 - (Taxa Atraso × 0.3)
- **Dias de Caixa (30%)**: (Receita / Custos Diários) / 30 × 30

**Status**:
- Excellent: ≥ 75
- Good: 50-74
- Warning: 25-49
- Critical: < 25

---

### 3. Relatórios (`server/routers/report-generation.ts`)

**Responsabilidade**: Gerar PDF com análise completa mensal.

**Endpoint**:

```typescript
reportGeneration.generateMonthlyReport({
  year, month,
  kpis: { revenue, costs, margin, works },
  alerts: { loss, overdueAccounts, employeesWithoutPix, pendingSchedules },
  accountsSummary: { payablePending, payablePaid, receivablePending, receivablePaid, forecastedBalance }
})
→ Buffer (PDF)
```

**Estrutura do PDF**:
1. **Capa**: Logo, título, período
2. **KPIs**: Cards com faturamento, custos, margem, trabalhos
3. **Evolução**: Gráfico de linha com receita/custos/margem
4. **Alertas**: Seção com avisos operacionais
5. **Resumo**: Tabela de contas a pagar/receber

---

### 4. Portal do Líder (`server/routers/portalLider.ts`)

**Responsabilidade**: Visão operacional para líderes de equipe.

**Endpoints**:

```typescript
// Listar solicitações de PIX pendentes
portalLider.listPixRequests()
→ [{ id, employeeId, amount, status, requestedAt }, ...]

// Aprovar/rejeitar PIX
portalLider.approvePixRequest({ requestId, approved })
→ { success, message }

// Dashboard do líder (equipe, horas, produtividade)
portalLider.getTeamDashboard()
→ { employees, totalHours, productivity }
```

---

### 5. Gestão de Funcionários (`server/routers/employees.ts`)

**Responsabilidade**: CRUD e gestão de dados de RH.

**Endpoints**:

```typescript
// Listar funcionários
employees.list()
→ [{ id, name, email, role, status, pixKey, ... }, ...]

// Criar funcionário
employees.create({ name, email, role, pixKey })
→ { id, ... }

// Atualizar funcionário
employees.update({ id, ...updates })
→ { success }

// Deletar funcionário
employees.delete({ id })
→ { success }
```

---

### 6. Gestão de Clientes (`server/routers/clients.ts`)

**Responsabilidade**: CRUD de clientes e histórico de serviços.

**Endpoints**:

```typescript
// Listar clientes
clients.list()
→ [{ id, name, email, phone, address, ... }, ...]

// Criar cliente
clients.create({ name, email, phone, address })
→ { id, ... }

// Histórico de serviços
clients.getServiceHistory({ clientId })
→ [{ date, service, amount, status }, ...]
```

---

## 🗄️ Banco de Dados

### Tabelas Principais

#### `accounts_receivable` (Contas a Receber)
```sql
- id (PK)
- clientId (FK → clients)
- amount (DECIMAL)
- dueDate (DATETIME)
- status (ENUM: 'pendente', 'recebido', 'cancelado')
- description (TEXT)
- createdAt, updatedAt
```

#### `accounts_payable` (Contas a Pagar)
```sql
- id (PK)
- supplierId (FK → suppliers)
- amount (DECIMAL)
- dueDate (DATETIME)
- status (ENUM: 'pendente', 'pago', 'cancelado')
- description (TEXT)
- createdAt, updatedAt
```

#### `employees` (Funcionários)
```sql
- id (PK)
- name (VARCHAR)
- email (VARCHAR, UNIQUE)
- role (ENUM: 'admin', 'leader', 'worker')
- pixKey (VARCHAR, NULLABLE)
- status (ENUM: 'ativo', 'inativo')
- createdAt, updatedAt
```

#### `clients` (Clientes)
```sql
- id (PK)
- name (VARCHAR)
- email (VARCHAR)
- phone (VARCHAR)
- address (TEXT)
- createdAt, updatedAt
```

#### `work_schedules` (Planejamentos)
```sql
- id (PK)
- clientId (FK → clients)
- date (DATETIME)
- description (TEXT)
- status (ENUM: 'pendente', 'validado', 'concluído')
- createdAt, updatedAt
```

#### `pix_requests` (Solicitações de PIX)
```sql
- id (PK)
- employeeId (FK → employees)
- amount (DECIMAL)
- status (ENUM: 'pendente', 'aprovado', 'rejeitado')
- requestedAt, approvedAt
- approvedBy (FK → users)
```

---

## 🔐 Autenticação & Autorização

### Fluxo OAuth (Manus)

1. Usuário clica "Login"
2. Redireciona para `VITE_OAUTH_PORTAL_URL`
3. Manus valida credenciais
4. Callback para `/api/oauth/callback` com código
5. Backend troca código por token JWT
6. Cookie de sessão criado
7. Usuário autenticado

### Roles & Permissões

| Role | Permissões |
|------|-----------|
| **admin** | Acesso total, gestão de usuários, relatórios |
| **leader** | Portal do líder, aprovação de PIX, analytics |
| **user** | Visualizar dados próprios, submeter planejamentos |

### Protected Procedures

```typescript
// Apenas usuários autenticados
protectedProcedure
  .input(z.object({ ... }))
  .query/mutation(async ({ ctx, input }) => {
    // ctx.user disponível e validado
  })

// Apenas admins
adminProcedure
  .input(z.object({ ... }))
  .mutation(async ({ ctx, input }) => {
    // ctx.user.role === 'admin' garantido
  })
```

---

## 📱 Frontend - Componentes Principais

### DashboardLayout

Layout padrão com sidebar navegável para ferramentas internas.

```tsx
<DashboardLayout>
  <YourPage />
</DashboardLayout>
```

**Recursos**:
- Sidebar colapsável
- Menu de navegação
- Perfil do usuário
- Logout automático

### HealthScoreGauge

Gauge visual do score de saúde financeira (0-100).

```tsx
<HealthScoreGauge 
  score={78}
  status="good"
  breakdown={{
    margin: { score: 40, percentage: 45 },
    delinquency: { score: 25, percentage: 8 },
    cashDays: { score: 13, days: 18 }
  }}
/>
```

### AIChatBox

Chat integrado com LLM para análise de dados.

```tsx
<AIChatBox 
  systemPrompt="Você é um analista financeiro..."
  onMessage={(msg) => console.log(msg)}
/>
```

### Map

Google Maps integrado com suporte a Places, Geocoding, Directions.

```tsx
<Map 
  onMapReady={(map, maps) => {
    // Usar Google Maps API
  }}
/>
```

---

## 🚀 Como Usar

### Desenvolvimento Local

```bash
# Instalar dependências
pnpm install

# Iniciar dev server
pnpm dev

# Build para produção
pnpm build

# Testes
pnpm test
```

### Adicionar Nova Feature

#### 1. Definir Schema (Drizzle)

```typescript
// drizzle/schema.ts
export const myTable = mysqlTable('my_table', {
  id: int().primaryKey().autoincrement(),
  name: varchar({ length: 255 }).notNull(),
  createdAt: datetime().default(sql`CURRENT_TIMESTAMP`),
});
```

#### 2. Gerar Migration

```bash
pnpm drizzle-kit generate
```

#### 3. Aplicar Migration

```bash
# Via webdev_execute_sql no Manus
# Ou manualmente no banco
```

#### 4. Criar Query Helper (`server/db.ts`)

```typescript
export async function getMyData() {
  const db = await getDb();
  return db.select().from(myTable);
}
```

#### 5. Criar tRPC Procedure (`server/routers/myfeature.ts`)

```typescript
export const myFeatureRouter = router({
  getData: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getMyData();
    }),
});
```

#### 6. Registrar Router (`server/routers.ts`)

```typescript
import { myFeatureRouter } from "./routers/myfeature";

export const appRouter = router({
  myFeature: myFeatureRouter,
  // ...
});
```

#### 7. Usar no Frontend

```tsx
// client/src/pages/MyFeature.tsx
import { trpc } from "@/lib/trpc";

export function MyFeature() {
  const { data, isLoading } = trpc.myFeature.getData.useQuery({ id: 1 });
  
  return <div>{data?.name}</div>;
}
```

#### 8. Testar com Vitest

```typescript
// server/myfeature.test.ts
import { describe, it, expect } from "vitest";
import { getMyData } from "../db";

describe("MyFeature", () => {
  it("should fetch data", async () => {
    const data = await getMyData();
    expect(data).toBeDefined();
  });
});
```

---

## 🔧 Variáveis de Ambiente

### Obrigatórias (Sistema Manus)

```env
DATABASE_URL=mysql://user:pass@host/db
JWT_SECRET=seu-secret-jwt
VITE_APP_ID=seu-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
OWNER_OPEN_ID=seu-owner-id
OWNER_NAME=seu-nome
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=seu-api-key
VITE_FRONTEND_FORGE_API_KEY=seu-frontend-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge
```

### Opcionais

```env
VITE_APP_TITLE=FinHub Inteligente
VITE_APP_LOGO=https://cdn.../logo.png
NODE_ENV=development
```

---

## 📈 Performance & Otimizações

### Queries Otimizadas

- **Índices**: `(dueDate, status)` em accounts_receivable/payable
- **Aggregations**: SUM, COUNT no servidor (não no frontend)
- **Joins**: Apenas quando necessário (top clients)

### Caching

- Dashboard queries podem ser cacheadas por 5-10 minutos
- Implementar Redis para queries pesadas

### Build

- Vite com tree-shaking automático
- Tailwind CSS purge de classes não usadas
- Chunks de código separados por route

---

## 🐛 Troubleshooting

### Dashboard não carrega

1. Verificar console do browser (F12)
2. Verificar logs do servidor (`pnpm dev`)
3. Validar queries SQL em `server/routers/dashboard.ts`
4. Confirmar dados em `accounts_receivable` e `accounts_payable`

### Erro de autenticação

1. Verificar `VITE_APP_ID` e `OAUTH_SERVER_URL`
2. Confirmar cookie de sessão criado
3. Testar `/api/oauth/callback` manualmente

### Relatório PDF vazio

1. Confirmar KPIs carregam no dashboard
2. Validar dados em `reportGeneration.ts`
3. Testar `generateMonthlyReport` com dados mock

---

## 📞 Suporte & Contato

- **GitHub**: JohnGomes84/finhub-inteligente
- **Deploy**: finhubapp-bwutngty.manus.space
- **Versão Atual**: 3.9
- **Última Atualização**: 2026-04-05

---

## 📝 Changelog

### v3.9 (2026-04-05)
- ✅ Dashboard corrigido com estrutura de alertas
- ✅ Score de saúde financeira (0-100)
- ✅ Comparação trimestral e YTD
- ✅ Exportação CSV/JSON
- ✅ Componente HealthScoreGauge
- ✅ Portal do Líder com aprovação PIX
- ✅ Analytics avançado

### v3.8
- Portal do Líder básico
- Aprovação de PIX
- Gestão de funcionários

### v3.7
- Dashboard financeiro
- Relatórios em PDF
- Alertas automáticos

---

**Documentação Completa - FinHub Inteligente v3.9**
