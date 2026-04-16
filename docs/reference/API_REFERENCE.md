# FinHub Inteligente - API Reference v3.9

## 📡 Base URL

```
http://localhost:3000/api/trpc  (desenvolvimento)
https://finhubapp-bwutngty.manus.space/api/trpc  (produção)
```

## 🔑 Autenticação

Todos os endpoints requerem autenticação via cookie de sessão JWT (criado automaticamente após login OAuth).

```
Cookie: __session=eyJhbGc...
```

---

## 📊 Dashboard Endpoints

### 1. getMonthlyKPIs

**Descrição**: Retorna KPIs principais do mês (faturamento, custos, margem, trabalhos)

**Método**: GET  
**Endpoint**: `/dashboard.getMonthlyKPIs`

**Input**:
```json
{
  "year": 2026,
  "month": 4
}
```

**Output**:
```json
{
  "revenue": {
    "current": 720000,
    "previous": 720000,
    "variation": 0
  },
  "costs": {
    "current": 168000,
    "previous": 168000,
    "variation": 0
  },
  "margin": {
    "current": 552000,
    "previous": 552000,
    "variation": 0,
    "isNegative": false
  },
  "works": {
    "current": 2551,
    "previous": 2551,
    "variation": 0
  }
}
```

**Exemplo cURL**:
```bash
curl -X GET "http://localhost:3000/api/trpc/dashboard.getMonthlyKPIs?input=%7B%22year%22:2026,%22month%22:4%7D" \
  -H "Cookie: __session=..." \
  -H "Content-Type: application/json"
```

---

### 2. getAlerts

**Descrição**: Retorna alertas estruturados (prejuízo, contas vencidas, diaristas sem PIX, planejamentos pendentes)

**Método**: GET  
**Endpoint**: `/dashboard.getAlerts`

**Input**:
```json
{
  "year": 2026,
  "month": 4
}
```

**Output**:
```json
{
  "loss": {
    "exists": false,
    "amount": 0,
    "month": "abril de 2026"
  },
  "overdueAccounts": {
    "count": 0,
    "total": 0
  },
  "employeesWithoutPix": {
    "count": 2
  },
  "pendingSchedules": {
    "count": 200
  }
}
```

---

### 3. getDailyFinancialEvolution

**Descrição**: Evolução financeira diária (receita, custos, margem por dia)

**Método**: GET  
**Endpoint**: `/dashboard.getDailyFinancialEvolution`

**Input**:
```json
{
  "year": 2026,
  "month": 4
}
```

**Output**:
```json
[
  {
    "date": "2026-04-01",
    "revenue": 25000,
    "costs": 5000,
    "margin": 20000
  },
  {
    "date": "2026-04-02",
    "revenue": 30000,
    "costs": 6000,
    "margin": 24000
  }
]
```

---

### 4. getTopClients

**Descrição**: Top 3 clientes por faturamento no mês

**Método**: GET  
**Endpoint**: `/dashboard.getTopClients`

**Input**:
```json
{
  "year": 2026,
  "month": 4
}
```

**Output**:
```json
[
  {
    "clientId": 1,
    "clientName": "Empresa A",
    "totalRevenue": 150000,
    "workCount": 12
  },
  {
    "clientId": 2,
    "clientName": "Empresa B",
    "totalRevenue": 120000,
    "workCount": 10
  },
  {
    "clientId": 3,
    "clientName": "Empresa C",
    "totalRevenue": 100000,
    "workCount": 8
  }
]
```

---

### 5. getAccountsSummary

**Descrição**: Resumo de contas a pagar e receber

**Método**: GET  
**Endpoint**: `/dashboard.getAccountsSummary`

**Input**:
```json
{
  "year": 2026,
  "month": 4
}
```

**Output**:
```json
{
  "payablePending": 168000,
  "payablePaid": 0,
  "receivablePending": 720000,
  "receivablePaid": 0,
  "forecastedBalance": 552000
}
```

---

## 💡 Dashboard Enhancements Endpoints

### 6. getHealthScore

**Descrição**: Score de saúde financeira (0-100) com breakdown

**Método**: GET  
**Endpoint**: `/dashboardEnhancements.getHealthScore`

**Input**:
```json
{
  "year": 2026,
  "month": 4
}
```

**Output**:
```json
{
  "score": 78,
  "status": "good",
  "breakdown": {
    "margin": {
      "score": 40,
      "percentage": 45
    },
    "delinquency": {
      "score": 25,
      "percentage": 8
    },
    "cashDays": {
      "score": 13,
      "days": 18
    }
  }
}
```

**Status Values**:
- `excellent`: score ≥ 75
- `good`: score 50-74
- `warning`: score 25-49
- `critical`: score < 25

---

### 7. getTrimestrialComparison

**Descrição**: Comparação trimestral e YTD (Year-to-Date)

**Método**: GET  
**Endpoint**: `/dashboardEnhancements.getTrimestrialComparison`

**Input**:
```json
{
  "year": 2026
}
```

**Output**:
```json
{
  "quarters": [
    {
      "quarter": "Q1",
      "revenue": 2160000,
      "costs": 504000,
      "margin": 1656000,
      "marginPercent": 76.67
    },
    {
      "quarter": "Q2",
      "revenue": 2880000,
      "costs": 672000,
      "margin": 2208000,
      "marginPercent": 76.67
    }
  ],
  "ytd": {
    "revenue": 5040000,
    "costs": 1176000,
    "margin": 3864000,
    "marginPercent": 76.67
  }
}
```

---

### 8. getExportData

**Descrição**: Exportar dados em CSV ou JSON

**Método**: GET  
**Endpoint**: `/dashboardEnhancements.getExportData`

**Input**:
```json
{
  "year": 2026,
  "month": 4,
  "format": "csv"
}
```

**Output (CSV)**:
```
Tipo,Data,Valor,Status
Receber,01/04/2026,25000,pendente
Receber,02/04/2026,30000,pendente
Pagar,01/04/2026,5000,pendente
Pagar,02/04/2026,6000,pendente
```

**Output (JSON)**:
```json
{
  "data": {
    "receivables": [
      {
        "date": "2026-04-01T00:00:00.000Z",
        "amount": 25000,
        "status": "pendente",
        "clientId": 1
      }
    ],
    "payables": [
      {
        "date": "2026-04-01T00:00:00.000Z",
        "amount": 5000,
        "status": "pendente"
      }
    ]
  },
  "filename": "export-2026-04.json"
}
```

---

## 📄 Relatórios Endpoints

### 9. generateMonthlyReport

**Descrição**: Gera PDF com análise completa mensal

**Método**: POST  
**Endpoint**: `/reportGeneration.generateMonthlyReport`

**Input**:
```json
{
  "year": 2026,
  "month": 4,
  "kpis": {
    "revenue": {
      "current": 720000,
      "previous": 720000,
      "variation": 0
    },
    "costs": {
      "current": 168000,
      "previous": 168000,
      "variation": 0
    },
    "margin": {
      "current": 552000,
      "previous": 552000,
      "variation": 0,
      "isNegative": false
    },
    "works": {
      "current": 2551,
      "previous": 2551,
      "variation": 0
    }
  },
  "alerts": {
    "loss": {
      "exists": false,
      "amount": 0,
      "month": "abril de 2026"
    },
    "overdueAccounts": {
      "count": 0,
      "total": 0
    },
    "employeesWithoutPix": {
      "count": 2
    },
    "pendingSchedules": {
      "count": 200
    }
  },
  "accountsSummary": {
    "payablePending": 168000,
    "payablePaid": 0,
    "receivablePending": 720000,
    "receivablePaid": 0,
    "forecastedBalance": 552000
  }
}
```

**Output**: Buffer PDF (download automático)

---

## 👥 Portal do Líder Endpoints

### 10. listPixRequests

**Descrição**: Listar todas as solicitações de PIX pendentes

**Método**: GET  
**Endpoint**: `/portalLider.listPixRequests`

**Input**: (nenhum)

**Output**:
```json
[
  {
    "id": 1,
    "employeeId": 5,
    "amount": 1500,
    "status": "pendente",
    "requestedAt": "2026-04-05T10:30:00.000Z"
  },
  {
    "id": 2,
    "employeeId": 7,
    "amount": 2000,
    "status": "pendente",
    "requestedAt": "2026-04-05T11:00:00.000Z"
  }
]
```

---

### 11. approvePixRequest

**Descrição**: Aprovar ou rejeitar solicitação de PIX

**Método**: POST  
**Endpoint**: `/portalLider.approvePixRequest`

**Input**:
```json
{
  "requestId": 1,
  "approved": true
}
```

**Output**:
```json
{
  "success": true,
  "message": "PIX aprovado com sucesso"
}
```

---

## 👨‍💼 Funcionários Endpoints

### 12. listEmployees

**Descrição**: Listar todos os funcionários

**Método**: GET  
**Endpoint**: `/employees.list`

**Input**: (nenhum)

**Output**:
```json
[
  {
    "id": 1,
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "admin",
    "status": "ativo",
    "pixKey": "123.456.789-00",
    "createdAt": "2026-01-15T00:00:00.000Z"
  }
]
```

---

### 13. createEmployee

**Descrição**: Criar novo funcionário

**Método**: POST  
**Endpoint**: `/employees.create`

**Input**:
```json
{
  "name": "Maria Santos",
  "email": "maria@example.com",
  "role": "worker",
  "pixKey": "987.654.321-00"
}
```

**Output**:
```json
{
  "id": 8,
  "name": "Maria Santos",
  "email": "maria@example.com",
  "role": "worker",
  "status": "ativo",
  "pixKey": "987.654.321-00",
  "createdAt": "2026-04-05T12:00:00.000Z"
}
```

---

## 🏢 Clientes Endpoints

### 14. listClients

**Descrição**: Listar todos os clientes

**Método**: GET  
**Endpoint**: `/clients.list`

**Input**: (nenhum)

**Output**:
```json
[
  {
    "id": 1,
    "name": "Empresa A",
    "email": "contato@empresaa.com",
    "phone": "(11) 98765-4321",
    "address": "Rua A, 123",
    "createdAt": "2026-01-10T00:00:00.000Z"
  }
]
```

---

### 15. createClient

**Descrição**: Criar novo cliente

**Método**: POST  
**Endpoint**: `/clients.create`

**Input**:
```json
{
  "name": "Empresa B",
  "email": "contato@empresab.com",
  "phone": "(11) 98765-4322",
  "address": "Rua B, 456"
}
```

**Output**:
```json
{
  "id": 2,
  "name": "Empresa B",
  "email": "contato@empresab.com",
  "phone": "(11) 98765-4322",
  "address": "Rua B, 456",
  "createdAt": "2026-04-05T12:30:00.000Z"
}
```

---

## 🔐 Autenticação Endpoints

### 16. auth.me

**Descrição**: Obter informações do usuário autenticado

**Método**: GET  
**Endpoint**: `/auth.me`

**Input**: (nenhum)

**Output**:
```json
{
  "id": 1,
  "openId": "38xJDC7HpRFjCBJBSjQcbU",
  "name": "Johnathan Gomes",
  "email": "john.eug@gmail.com",
  "loginMethod": "google",
  "role": "admin",
  "createdAt": "2026-03-29T13:18:10.000Z",
  "updatedAt": "2026-04-05T03:50:56.000Z",
  "lastSignedIn": "2026-04-05T03:50:57.000Z"
}
```

---

### 17. auth.logout

**Descrição**: Fazer logout do usuário

**Método**: POST  
**Endpoint**: `/auth.logout`

**Input**: (nenhum)

**Output**:
```json
{
  "success": true
}
```

---

## ⚠️ Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 200 | OK - Requisição bem-sucedida |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Não autenticado |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 500 | Internal Server Error - Erro no servidor |

**Exemplo de Erro**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Você precisa estar autenticado para acessar este recurso"
  }
}
```

---

## 🧪 Testando com cURL

### Exemplo 1: Obter KPIs

```bash
curl -X GET \
  "http://localhost:3000/api/trpc/dashboard.getMonthlyKPIs?input=%7B%22year%22:2026,%22month%22:4%7D" \
  -H "Cookie: __session=seu-token-aqui" \
  -H "Content-Type: application/json"
```

### Exemplo 2: Gerar Relatório

```bash
curl -X POST \
  "http://localhost:3000/api/trpc/reportGeneration.generateMonthlyReport" \
  -H "Cookie: __session=seu-token-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "year": 2026,
    "month": 4,
    "kpis": {...},
    "alerts": {...},
    "accountsSummary": {...}
  }' \
  --output relatorio.pdf
```

### Exemplo 3: Aprovar PIX

```bash
curl -X POST \
  "http://localhost:3000/api/trpc/portalLider.approvePixRequest" \
  -H "Cookie: __session=seu-token-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": 1,
    "approved": true
  }'
```

---

## 📚 Integração com Frontend (tRPC)

### React Hook

```tsx
import { trpc } from "@/lib/trpc";

export function MyComponent() {
  const { data: kpis, isLoading } = trpc.dashboard.getMonthlyKPIs.useQuery({
    year: 2026,
    month: 4,
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div>
      <p>Faturamento: R$ {kpis?.revenue.current}</p>
      <p>Custos: R$ {kpis?.costs.current}</p>
      <p>Margem: R$ {kpis?.margin.current}</p>
    </div>
  );
}
```

### Mutation

```tsx
const createClient = trpc.clients.create.useMutation();

const handleCreate = async () => {
  await createClient.mutateAsync({
    name: "Empresa C",
    email: "contato@empresac.com",
    phone: "(11) 98765-4323",
    address: "Rua C, 789",
  });
};
```

---

## 🔗 Rate Limiting

Não há rate limiting implementado atualmente. Para produção, considerar adicionar:
- Max 100 requests/minuto por IP
- Max 1000 requests/hora por usuário

---

## 📞 Suporte

- GitHub Issues: https://github.com/JohnGomes84/finhub-inteligente/issues
- Documentação: ../reference/DOCUMENTATION.md
- Quick Start: ../setup/README_QUICK_START.md

---

**API Reference - FinHub Inteligente v3.9**  
*Última atualização: 2026-04-05*
