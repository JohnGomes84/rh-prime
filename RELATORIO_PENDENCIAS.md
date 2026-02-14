# 📋 Relatório de Pendências - RH Prime v6.0

**Data:** 14/02/2026  
**Status Geral:** 65% Funcional | 35% Pendente

---

## 🔴 CRÍTICO - Deve ser feito IMEDIATAMENTE

### 1. Timezone não está integrado em nenhuma query
- **Status:** ❌ Criado mas não usado
- **Impacto:** Alto - Relatórios podem mostrar datas incorretas
- **Localização:** `server/utils/timezone.ts` (não integrado em db.ts)
- **Estimativa:** 8 créditos
- **Exemplo do problema:** 
  ```
  Query retorna: 2026-02-14 10:00:00 (UTC)
  Deveria retornar: 2026-02-14 07:00:00 (BRT, -3 horas)
  ```

### 2. Tabelas timeRecords e overtimeRecords criadas mas sem endpoints tRPC
- **Status:** ❌ Tabelas no banco, mas sem routers
- **Impacto:** Alto - Usuários não conseguem registrar ponto
- **Faltam:**
  - `timeRecords.create` - Registrar entrada/saída
  - `timeRecords.list` - Listar registros do funcionário
  - `timeRecords.approve` - Aprovar/rejeitar ponto
  - `overtimeRecords.create` - Solicitar horas extras
  - `overtimeRecords.approve` - Aprovar horas extras
- **Estimativa:** 12 créditos

### 3. Schemas de validação criados mas não integrados aos routers
- **Status:** ❌ Schemas existem (overtime.ts) mas não estão sendo usados
- **Impacto:** Médio - Validações não estão acontecendo
- **Localização:** `server/schemas/overtime.ts` (criado mas não importado em routers.ts)
- **Estimativa:** 3 créditos

### 4. db.ts está corrompido (sintaxe quebrada)
- **Status:** ⚠️ Arquivo com erros de parsing
- **Impacto:** CRÍTICO - Servidor não consegue compilar
- **Erro:** `Expected ")" but found "export"` na linha 476
- **Solução:** Rollback e recriar corretamente
- **Estimativa:** 5 créditos

---

## 🟡 IMPORTANTE - Próximas 2 sprints

### 5. Interface de Controle de Ponto não existe
- **Status:** ❌ Não implementado
- **Faltam:**
  - Página `Timesheet.tsx` - Dashboard de ponto
  - Botão de entrada/saída
  - Visualização de horas trabalhadas
  - Aprovação de registros de ponto
  - Relatório de frequência
- **Estimativa:** 15 créditos

### 6. Interface de Horas Extras não existe
- **Status:** ❌ Não implementado
- **Faltam:**
  - Página `OvertimeRequests.tsx` - Solicitação de horas extras
  - Formulário de solicitação
  - Dashboard de aprovações
  - Cálculo automático de valores
  - Histórico de horas extras
- **Estimativa:** 12 créditos

### 7. Integração com Sólides API não existe
- **Status:** ❌ Não implementado
- **Faltam:**
  - Autenticação com Sólides
  - Sincronização de funcionários
  - Sincronização de folha de pagamento
  - Webhook para atualizações
  - Mapeamento de campos
- **Estimativa:** 20 créditos

### 8. Gov.br OAuth não está integrado
- **Status:** ❌ Não implementado
- **Faltam:**
  - Configuração de credenciais
  - Fluxo de autenticação
  - Validação de CPF
  - Integração com login existente
- **Estimativa:** 15 créditos

### 9. Folha de Pagamento - Cálculos de IR estão retornando 0
- **Status:** ⚠️ Parcialmente funcional
- **Problema:** `calculatePayroll()` retorna IR = 0
- **Testes falhando:** 4 testes de payroll
- **Localização:** `server/modules/payroll/payroll-calculator.ts`
- **Estimativa:** 10 créditos

### 10. Dashboard de KPIs não existe
- **Status:** ❌ Não implementado
- **Faltam:**
  - Gráficos de turnover
  - Indicadores de custo RH
  - Absenteísmo
  - Distribuição por departamento
  - Exportação para Excel
- **Estimativa:** 15 créditos

---

## 🟢 MELHORIAS - Quando possível

### 11. Logging estruturado (Winston)
- **Status:** ❌ Não implementado
- **Benefício:** Melhor rastreamento de erros
- **Estimativa:** 8 créditos

### 12. Cache com Redis
- **Status:** ❌ Não implementado
- **Benefício:** Performance em queries frequentes
- **Estimativa:** 10 créditos

### 13. Monitoramento com APM
- **Status:** ❌ Não implementado
- **Benefício:** Observabilidade em produção
- **Estimativa:** 12 créditos

### 14. Load testing
- **Status:** ❌ Não implementado
- **Benefício:** Validar capacidade do sistema
- **Estimativa:** 8 créditos

---

## 📊 Resumo por Módulo

| Módulo | Status | % Completo | Prioridade |
|--------|--------|-----------|-----------|
| **Autenticação** | ✅ Funcional | 100% | - |
| **Funcionários** | ✅ Funcional | 100% | - |
| **Auditoria** | ✅ Funcional | 100% | - |
| **Controle de Ponto** | ❌ Banco OK, sem UI | 30% | 🔴 CRÍTICO |
| **Horas Extras** | ❌ Banco OK, sem UI | 30% | 🔴 CRÍTICO |
| **Folha de Pagamento** | ⚠️ IR com bug | 60% | 🟡 IMPORTANTE |
| **Integração Sólides** | ❌ Não iniciado | 0% | 🟡 IMPORTANTE |
| **Gov.br OAuth** | ❌ Não iniciado | 0% | 🟡 IMPORTANTE |
| **Dashboard KPIs** | ❌ Não iniciado | 0% | 🟡 IMPORTANTE |
| **Infraestrutura** | ✅ Funcional | 100% | - |

---

## 💰 Custo Total para 100% Funcional

| Categoria | Créditos | Prioridade |
|-----------|----------|-----------|
| Corrigir db.ts | 5 | 🔴 CRÍTICO |
| Integrar timezone | 8 | 🔴 CRÍTICO |
| Endpoints tRPC ponto/horas | 12 | 🔴 CRÍTICO |
| Integrar schemas | 3 | 🔴 CRÍTICO |
| **Subtotal CRÍTICO** | **28** | |
| Interface de Ponto | 15 | 🟡 IMPORTANTE |
| Interface de Horas Extras | 12 | 🟡 IMPORTANTE |
| Corrigir IR em Folha | 10 | 🟡 IMPORTANTE |
| Integração Sólides | 20 | 🟡 IMPORTANTE |
| Gov.br OAuth | 15 | 🟡 IMPORTANTE |
| Dashboard KPIs | 15 | 🟡 IMPORTANTE |
| **Subtotal IMPORTANTE** | **87** | |
| Logging, Cache, APM, Load Test | 38 | 🟢 MELHORIAS |
| **TOTAL** | **153 créditos** | |

---

## 🎯 Recomendação

**Fase 1 (IMEDIATAMENTE - 28 créditos):**
1. Corrigir db.ts
2. Integrar timezone em todas as queries
3. Criar endpoints tRPC para ponto/horas extras
4. Integrar schemas de validação

**Fase 2 (Próximas 2 semanas - 52 créditos):**
1. Interface de Controle de Ponto
2. Interface de Horas Extras
3. Corrigir cálculo de IR
4. Começar integração Sólides

**Fase 3 (Próximo mês - 50 créditos):**
1. Gov.br OAuth
2. Dashboard de KPIs
3. Integração Sólides completa
4. Melhorias de infraestrutura

---

## ⚠️ Riscos Identificados

1. **db.ts corrompido** - Bloqueia compilação
2. **Timezone não integrado** - Pode causar erros em relatórios
3. **IR retornando 0** - Folha de pagamento incorreta
4. **Sem endpoints de ponto** - Funcionalidade crítica faltando

**Recomendação:** Resolver CRÍTICO antes de publicar em produção.
