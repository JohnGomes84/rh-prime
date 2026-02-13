# Análise de Integração com Sólides - Parâmetros e Modificações

## 📋 Resumo Executivo

O arquivo enviado é a página HTML da plataforma **Sólides** (sistema de gestão de RH/Ponto). Analisamos os parâmetros, estruturas de dados e funcionalidades que podemos integrar ou replicar no RH Prime.

---

## 🔍 Parâmetros Identificados

### 1. **Estrutura de Dados de Funcionário**

```javascript
// Dados capturados do sistema Sólides
{
  "nome": "Ediani",              // Nome do funcionário
  "cargo": "-",                  // Cargo/Função
  "filial": "Matriz",            // Filial/Departamento
  "cpf": "-",                    // CPF (sem máscara)
  "codigoExterno": "-",          // Código externo (integração)
  "dataAdmissao": "10/02/2026",  // Data de admissão
  "vigencia": "10/02/2026",      // Data de vigência
  "desligamento": "-"            // Data de desligamento
}
```

### 2. **Parâmetros de Rastreamento (Google Analytics)**

```javascript
// Dados enviados para GA
{
  "event": "virtualPageView",
  "userId": valueData.codeReference,           // ID único do usuário
  "pageTitle": valueData.pageTitle,            // Título da página
  "companyCode": valueData.organizationCodeReference,  // Código da empresa
  "userProfile": valueData.userProfile,        // Perfil do usuário
  "accountStatus": valueData.accountStatus     // Status da conta
}
```

### 3. **Eventos de Clique Rastreados**

```javascript
// Padrão de eventos
"botao_NomeDoButao"      // Clique em botão
"link_NomeDoLink"        // Clique em link
"aba_NomeAba"           // Clique em aba
"botao_AnexoArquivo"    // Upload de arquivo
"botao_Editar"          // Botão editar
"botao_Excluir"         // Botão excluir
"botao_Duplicar"        // Botão duplicar
```

### 4. **Funcionalidades do Menu (Sólides)**

| Módulo | Funcionalidades |
|--------|-----------------|
| **Empregador** | Dados cadastrais, Integrações, Auditoria, PRO |
| **Cadastros Gerais** | Administradores, Departamentos, Cargos, Funcionários |
| **Controle de Ponto** | Registro de ponto, Relatórios, Justificativas |
| **Folha de Pagamento** | Cálculo, Holerite, Integração contábil |
| **Admissão Digital** | Documentos, Assinatura qualificada, GED |
| **Relatórios** | Diversos relatórios customizáveis |

---

## 💡 Modificações Recomendadas para RH Prime

### **Fase 1: Integração de Parâmetros (Curto Prazo)**

#### 1.1 Adicionar Campos Faltantes em `employees`

```sql
-- Campos sugeridos para adicionar
ALTER TABLE employees ADD COLUMN (
  external_code VARCHAR(50),           -- Código externo (integração)
  branch_id INT,                       -- Filial/Departamento
  dismissal_date DATE,                 -- Data de desligamento
  vigency_date DATE,                   -- Data de vigência
  integration_status VARCHAR(20)       -- Status de integração (sync, pending, error)
);
```

#### 1.2 Implementar Rastreamento de Eventos (Analytics)

```typescript
// server/_core/analytics.ts
export async function trackEvent(eventData: {
  event: string;
  userId: string;
  pageTitle: string;
  companyCode: string;
  userProfile: string;
  accountStatus: string;
  elementName?: string;
}) {
  // Enviar para Google Analytics ou Manus Analytics
  await fetch(`${process.env.VITE_ANALYTICS_ENDPOINT}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
}
```

#### 1.3 Adicionar Código Externo para Integração

```typescript
// server/routers.ts - Novo endpoint
employees: {
  syncWithExternal: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      externalCode: z.string(),
      externalSystem: z.enum(['solides', 'flash', 'custom'])
    }))
    .mutation(async ({ input, ctx }) => {
      // Sincronizar dados com sistema externo
      return await db.updateEmployee(input.employeeId, {
        external_code: input.externalCode,
        integration_status: 'synced'
      });
    })
}
```

---

### **Fase 2: Funcionalidades Avançadas (Médio Prazo)**

#### 2.1 Implementar Admissão Digital

**Estrutura de dados:**
```typescript
interface DigitalOnboarding {
  employeeId: string;
  documents: {
    contractSigned: boolean;
    nda: boolean;
    bankData: boolean;
    beneficiaries: boolean;
  };
  status: 'pending' | 'in_progress' | 'completed';
  completionDate?: Date;
  signatureUrl?: string;
}
```

#### 2.2 Integração com Múltiplos Sistemas

```typescript
// server/integrations/index.ts
export const integrationProviders = {
  solides: {
    endpoint: process.env.SOLIDES_API_URL,
    apiKey: process.env.SOLIDES_API_KEY,
    methods: ['sync_employees', 'sync_payroll', 'sync_attendance']
  },
  flash: {
    endpoint: process.env.FLASH_API_URL,
    apiKey: process.env.FLASH_API_KEY,
    methods: ['sync_payroll', 'sync_documents']
  },
  custom: {
    endpoint: process.env.CUSTOM_API_URL,
    apiKey: process.env.CUSTOM_API_KEY,
    methods: ['webhook', 'csv_import']
  }
};
```

#### 2.3 Sistema de Auditoria Detalhado

```typescript
// Registrar todas as alterações
interface AuditLog {
  id: string;
  userId: string;
  action: 'create' | 'update' | 'delete';
  entityType: 'employee' | 'contract' | 'payroll';
  entityId: string;
  before: Record<string, any>;
  after: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}
```

---

### **Fase 3: Análise e Relatórios (Longo Prazo)**

#### 3.1 Dashboard com Métricas Sólides

```typescript
// Métricas a implementar
interface DashboardMetrics {
  totalEmployees: number;
  activeEmployees: number;
  dismissedThisMonth: number;
  pendingDocuments: number;
  syncErrors: number;
  lastSyncDate: Date;
  integrationStatus: Record<string, 'connected' | 'error' | 'pending'>;
}
```

#### 3.2 Relatórios Customizáveis

```typescript
// Tipos de relatórios
enum ReportType {
  EMPLOYEE_LIST = 'employee_list',
  PAYROLL_SUMMARY = 'payroll_summary',
  ATTENDANCE_REPORT = 'attendance_report',
  INTEGRATION_LOG = 'integration_log',
  AUDIT_TRAIL = 'audit_trail'
}
```

---

## 🔗 Mapeamento de Funcionalidades Sólides → RH Prime

| Sólides | RH Prime | Status | Prioridade |
|---------|----------|--------|-----------|
| Dados Cadastrais | Funcionários (CRUD) | ✅ Pronto | P0 |
| Integrações | Integração com Sólides/Flash | ⏳ Planejado | P1 |
| Auditoria | Audit Logs | ⏳ Planejado | P1 |
| Admissão Digital | Digital Onboarding | ⏳ Planejado | P2 |
| Controle de Ponto | Time Tracking | ⏳ Planejado | P2 |
| Folha de Pagamento | Payroll | ⏳ Planejado | P2 |
| Relatórios | Reports | ⏳ Planejado | P3 |

---

## 🛠️ Próximos Passos

### Semana 1-2: Adicionar Campos e Integração Básica
1. Adicionar campos `external_code`, `branch_id`, `dismissal_date` ao schema
2. Criar endpoints para sincronização com Sólides
3. Implementar rastreamento de eventos

### Semana 3-4: Auditoria e Admissão Digital
1. Implementar sistema de auditoria completo
2. Criar fluxo de admissão digital
3. Adicionar assinatura qualificada

### Semana 5+: Relatórios e Análises
1. Criar dashboard com métricas
2. Implementar relatórios customizáveis
3. Integração com múltiplos sistemas

---

## 📊 Estimativa de Créditos

| Funcionalidade | Créditos | Semanas |
|----------------|----------|---------|
| Campos + Integração Básica | 15 | 2 |
| Auditoria Completa | 20 | 2 |
| Admissão Digital | 25 | 3 |
| Relatórios | 20 | 2 |
| **Total** | **80** | **9** |

---

## ⚠️ Considerações de Segurança

1. **Validação de Dados**: Sempre validar dados antes de sincronizar
2. **Autenticação**: Usar OAuth 2.0 para integração com sistemas externos
3. **Criptografia**: Criptografar dados sensíveis em trânsito
4. **Auditoria**: Registrar todas as operações de integração
5. **Conformidade LGPD**: Garantir conformidade ao transferir dados

---

## 📝 Notas Finais

O Sólides é uma plataforma madura com muitas funcionalidades. O RH Prime pode:
- Replicar as funcionalidades principais
- Integrar-se com Sólides existente
- Oferecer uma alternativa mais moderna e customizável

Recomendamos começar pela integração básica (código externo, sincronização) e evoluir para funcionalidades mais avançadas.
