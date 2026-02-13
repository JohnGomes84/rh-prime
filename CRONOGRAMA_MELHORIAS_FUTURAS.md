# 📅 Cronograma de Melhorias Futuras - RH Prime

**Data de Criação:** 13 de Fevereiro de 2026  
**Orçamento Disponível:** 248 créditos  
**Timeline Total:** 4-6 meses  

---

## 🎯 Visão Geral

RH Prime está **100% funcional** com RBAC, Assinatura Digital e Auditoria. Este cronograma detalha as melhorias prioritárias para transformar o sistema em uma solução enterprise completa.

---

## 📊 Matriz de Priorização

| Prioridade | Módulo | Impacto | Complexidade | Créditos | Timeline |
|-----------|--------|--------|-------------|----------|----------|
| 🔴 Crítica | Integração de APIs de Recrutamento | Alto | Alta | 60 | 3-4 semanas |
| 🔴 Crítica | Cálculo Automático de Folha | Alto | Alta | 50 | 3-4 semanas |
| 🟠 Alta | Notificações de Vencimento | Alto | Média | 25 | 1-2 semanas |
| 🟠 Alta | Dashboard de Analytics | Médio | Média | 35 | 2-3 semanas |
| 🟡 Média | Integração com Ponto Eletrônico | Médio | Alta | 40 | 2-3 semanas |
| 🟡 Média | Portal do Colaborador | Médio | Média | 30 | 2 semanas |
| 🟢 Baixa | Relatórios Avançados | Baixo | Baixa | 20 | 1 semana |
| 🟢 Baixa | Mobile App (React Native) | Médio | Alta | 45 | 3-4 semanas |

---

## 🚀 FASE 1: Integração de APIs de Recrutamento (60 créditos)

### Objetivo
Conectar RH Prime com plataformas de recrutamento (LinkedIn, Indeed, Gupy) para automação de pipeline de candidatos.

### Semana 1-2: Pesquisa & Design (15 créditos)

**Tarefas:**
- [ ] Pesquisar APIs disponíveis (LinkedIn Recruiter, Indeed API, Gupy API)
- [ ] Documentar fluxo de integração com cada plataforma
- [ ] Desenhar arquitetura de sincronização de candidatos
- [ ] Criar schema de banco para candidatos e aplicações
- [ ] Especificar webhooks para atualizações em tempo real

**Deliverables:**
- Documento de arquitetura de integração
- Schema de banco de dados
- Guia de autenticação OAuth para cada API

**Testes:**
- Validar acesso às APIs
- Testar fluxo de autenticação

---

### Semana 3-4: Implementação Backend (25 créditos)

**Tarefas:**
- [ ] Criar serviço de integração com LinkedIn Recruiter
- [ ] Criar serviço de integração com Indeed API
- [ ] Criar serviço de integração com Gupy API
- [ ] Implementar sincronização de candidatos (pull/push)
- [ ] Criar webhooks para atualizações de status
- [ ] Implementar fila de processamento (Bull/BullMQ)
- [ ] Adicionar tratamento de erros e retry logic

**Endpoints tRPC:**
```typescript
recruitment.syncCandidates() // Sincronizar candidatos de todas as plataformas
recruitment.getCandidates() // Listar candidatos com filtros
recruitment.updateCandidateStatus() // Atualizar status (triagem, entrevista, oferta)
recruitment.getIntegrationStatus() // Status de sincronização
recruitment.linkVacancyToSource() // Vincular vaga a fonte de recrutamento
```

**Testes vitest:**
- [ ] Testes de autenticação com cada API
- [ ] Testes de sincronização de candidatos
- [ ] Testes de webhook handling
- [ ] Testes de retry logic

---

### Semana 5: Frontend & UI (20 créditos)

**Tarefas:**
- [ ] Criar página de gerenciamento de integrações
- [ ] Criar dashboard de pipeline de candidatos
- [ ] Criar formulário de configuração de APIs
- [ ] Implementar visualização de candidatos por estágio
- [ ] Criar componente de atualização de status em massa
- [ ] Adicionar notificações de novos candidatos

**Componentes:**
- `RecruitmentDashboard.tsx` - Dashboard principal
- `IntegrationSettings.tsx` - Configuração de APIs
- `CandidatePipeline.tsx` - Visualização de pipeline
- `CandidateCard.tsx` - Card de candidato com ações

**Testes E2E:**
- [ ] Testar fluxo completo de sincronização
- [ ] Testar atualização de status de candidato
- [ ] Testar notificações

---

### Resultado Esperado
✅ RH Prime sincroniza automaticamente candidatos de LinkedIn, Indeed e Gupy  
✅ Dashboard mostra pipeline completo com filtros  
✅ Notificações em tempo real de novos candidatos  
✅ Integração com Assinatura Digital para cartas-oferta  

---

## 🚀 FASE 2: Cálculo Automático de Folha (50 créditos)

### Objetivo
Automatizar cálculo de folha de pagamento com base em ponto, benefícios e descontos legais.

### Semana 1-2: Design de Cálculo (15 créditos)

**Tarefas:**
- [ ] Documentar regras de cálculo CLT (INSS, IR, FGTS, Vale)
- [ ] Criar tabelas de impostos (INSS, IR 2026)
- [ ] Desenhar fluxo de processamento de folha
- [ ] Especificar schema de holerite
- [ ] Criar testes de validação de cálculos

**Documentação:**
- Guia de cálculo de INSS (progressivo)
- Guia de cálculo de IR (tabela 2026)
- Guia de cálculo de FGTS (8%)
- Guia de cálculo de descontos legais

---

### Semana 3-4: Implementação Backend (25 créditos)

**Serviços:**
```typescript
// server/services/payroll-calculator.ts
calculatePayroll(employeeId, month, year) // Calcula folha completa
calculateINSS(salary) // Calcula INSS progressivo
calculateIR(salary, dependents) // Calcula IR com deduções
calculateFGTS(salary) // Calcula FGTS
generateHolerite(payroll) // Gera holerite PDF
validatePayroll(payroll) // Valida cálculos
```

**Endpoints tRPC:**
```typescript
payroll.calculateMonth() // Calcula folha do mês
payroll.getHolerite() // Obtém holerite de funcionário
payroll.generatePayrollReport() // Gera relatório de folha
payroll.exportToContability() // Exporta para contador (XML/TXT)
payroll.validateCalculations() // Valida cálculos
```

**Testes vitest:**
- [ ] 50+ testes de cálculos (INSS, IR, FGTS)
- [ ] Testes de casos extremos (salário mínimo, teto)
- [ ] Testes de validação de holerite

---

### Semana 5: Frontend & Integração (10 créditos)

**Tarefas:**
- [ ] Criar página de processamento de folha
- [ ] Criar visualizador de holerite
- [ ] Implementar exportação de holerite em PDF
- [ ] Criar relatório de folha para RH
- [ ] Integrar com assinatura digital para holerites

**Componentes:**
- `PayrollProcessor.tsx` - Processamento de folha
- `HoleriteViewer.tsx` - Visualizador de holerite
- `PayrollReport.tsx` - Relatório de folha

---

### Resultado Esperado
✅ Folha processada automaticamente com cálculos CLT corretos  
✅ Holerites gerados em PDF com assinatura digital  
✅ Relatórios para contador e RH  
✅ Validação de cálculos com alertas de anomalias  

---

## 🚀 FASE 3: Notificações de Vencimento (25 créditos)

### Objetivo
Alertar automaticamente sobre vencimento de documentos críticos (ASO, PGR, PCMSO, CNH, etc).

### Semana 1: Backend (15 créditos)

**Serviços:**
```typescript
// server/services/document-expiry-monitor.ts
checkExpiringDocuments() // Verifica documentos vencendo
sendExpiryNotifications() // Envia notificações
scheduleExpiryChecks() // Agenda verificações diárias
```

**Endpoints tRPC:**
```typescript
notifications.getExpiringDocuments() // Lista documentos vencendo
notifications.configureAlerts() // Configura alertas por tipo
notifications.getNotificationHistory() // Histórico de notificações
```

**Testes:**
- [ ] Testes de detecção de vencimento
- [ ] Testes de envio de notificações
- [ ] Testes de agendamento

---

### Semana 2: Frontend (10 créditos)

**Tarefas:**
- [ ] Criar dashboard de documentos vencendo
- [ ] Criar configuração de alertas
- [ ] Implementar notificações em tempo real

**Componentes:**
- `ExpiryMonitor.tsx` - Dashboard de vencimentos
- `AlertSettings.tsx` - Configuração de alertas

---

### Resultado Esperado
✅ Alertas automáticos 30, 15 e 7 dias antes do vencimento  
✅ Dashboard mostrando documentos críticos  
✅ Notificações por email e SMS  
✅ Relatório de compliance de documentos  

---

## 🚀 FASE 4: Dashboard de Analytics (35 créditos)

### Objetivo
Fornecer insights estratégicos sobre RH com KPIs e visualizações.

### Semana 1-2: Backend (15 créditos)

**Endpoints tRPC:**
```typescript
analytics.getHeadcount() // Total de funcionários por status
analytics.getTurnover() // Taxa de rotatividade
analytics.getVacationMetrics() // Métricas de férias
analytics.getPayrollMetrics() // Métricas de folha
analytics.getRecruitmentMetrics() // Métricas de recrutamento
analytics.getDepartmentStats() // Estatísticas por departamento
analytics.getComplianceScore() // Score de compliance
```

**Testes:**
- [ ] Testes de cálculo de KPIs
- [ ] Testes de agregação de dados

---

### Semana 3: Frontend (20 créditos)

**Componentes:**
- `AnalyticsDashboard.tsx` - Dashboard principal
- `HeadcountChart.tsx` - Gráfico de headcount
- `TurnoverMetrics.tsx` - Métricas de rotatividade
- `PayrollAnalytics.tsx` - Análise de folha
- `ComplianceScore.tsx` - Score de compliance

**Gráficos:**
- Headcount por departamento (pie chart)
- Rotatividade por mês (line chart)
- Distribuição salarial (histogram)
- Compliance score (gauge chart)
- Recrutamento por fonte (bar chart)

---

### Resultado Esperado
✅ Dashboard executivo com KPIs principais  
✅ Análise de tendências de RH  
✅ Relatórios exportáveis em PDF/Excel  
✅ Alertas de anomalias (ex: rotatividade alta)  

---

## 🚀 FASE 5: Integração com Ponto Eletrônico (40 créditos)

### Objetivo
Conectar com sistemas de ponto eletrônico (Uatt, Ponto Inteligente, etc) para automação de horas.

### Semana 1-2: Pesquisa & Design (10 créditos)

**Tarefas:**
- [ ] Pesquisar APIs de ponto eletrônico
- [ ] Documentar fluxo de sincronização
- [ ] Criar schema de banco para registros de ponto

---

### Semana 3-4: Implementação (20 créditos)

**Serviços:**
```typescript
timesheet.syncFromDevice() // Sincroniza ponto do dispositivo
timesheet.calculateHours() // Calcula horas trabalhadas
timesheet.detectAnomalies() // Detecta anomalias (falta, atraso)
timesheet.generateReport() // Gera relatório de ponto
```

---

### Semana 5: Frontend (10 créditos)

**Componentes:**
- `TimesheetDashboard.tsx` - Dashboard de ponto
- `AnomalyAlert.tsx` - Alertas de anomalias

---

### Resultado Esperado
✅ Ponto sincronizado automaticamente  
✅ Cálculo automático de horas extras  
✅ Detecção de faltas e atrasos  
✅ Integração com cálculo de folha  

---

## 🚀 FASE 6: Portal do Colaborador (30 créditos)

### Objetivo
Fornecer portal self-service para colaboradores acessarem dados pessoais e solicitar benefícios.

### Semana 1-2: Backend (10 créditos)

**Endpoints tRPC:**
```typescript
employee.getMyData() // Dados pessoais do colaborador
employee.updateMyData() // Atualizar dados pessoais
employee.getMyHolerite() // Holerites do colaborador
employee.requestVacation() // Solicitar férias
employee.requestAbsence() // Solicitar ausência
employee.getMyDocuments() // Documentos do colaborador
```

---

### Semana 3: Frontend (20 créditos)

**Componentes:**
- `EmployeePortal.tsx` - Portal principal
- `MyProfile.tsx` - Perfil do colaborador
- `MyHolerites.tsx` - Holerites
- `VacationRequest.tsx` - Solicitação de férias
- `MyDocuments.tsx` - Documentos

---

### Resultado Esperado
✅ Colaboradores acessam dados pessoais  
✅ Self-service de solicitações de férias  
✅ Download de holerites  
✅ Histórico de documentos  

---

## 🚀 FASE 7: Relatórios Avançados (20 créditos)

### Objetivo
Gerar relatórios customizáveis para RH, Financeiro e Gestão.

### Semana 1: Implementação (20 créditos)

**Relatórios:**
- [ ] Relatório de Folha Mensal
- [ ] Relatório de Férias
- [ ] Relatório de Compliance (ASO, PGR, PCMSO)
- [ ] Relatório de Recrutamento
- [ ] Relatório de Rotatividade
- [ ] Relatório de Custos de RH

**Formatos:**
- PDF (com assinatura digital)
- Excel (com gráficos)
- CSV (para importação)

---

### Resultado Esperado
✅ Relatórios customizáveis por período  
✅ Exportação em múltiplos formatos  
✅ Agendamento de relatórios  
✅ Distribuição automática por email  

---

## 🚀 FASE 8: Mobile App (45 créditos)

### Objetivo
Criar aplicativo mobile (iOS/Android) com React Native para acesso em qualquer lugar.

### Semana 1-4: Desenvolvimento (45 créditos)

**Features:**
- [ ] Login com biometria
- [ ] Visualização de holerite
- [ ] Solicitação de férias
- [ ] Ponto eletrônico (entrada/saída)
- [ ] Notificações push
- [ ] Documentos pessoais
- [ ] Suporte offline

---

### Resultado Esperado
✅ App iOS e Android funcional  
✅ Sincronização com backend  
✅ Notificações push  
✅ Modo offline  

---

## 📊 Resumo de Investimento

| Fase | Módulo | Créditos | Timeline | Prioridade |
|------|--------|----------|----------|-----------|
| 1 | APIs de Recrutamento | 60 | 4 semanas | 🔴 Crítica |
| 2 | Folha Automática | 50 | 4 semanas | 🔴 Crítica |
| 3 | Notificações | 25 | 2 semanas | 🟠 Alta |
| 4 | Analytics | 35 | 3 semanas | 🟠 Alta |
| 5 | Ponto Eletrônico | 40 | 3 semanas | 🟡 Média |
| 6 | Portal Colaborador | 30 | 2 semanas | 🟡 Média |
| 7 | Relatórios | 20 | 1 semana | 🟢 Baixa |
| 8 | Mobile App | 45 | 4 semanas | 🟢 Baixa |
| **TOTAL** | | **305** | **~6 meses** | |

---

## 🎯 Recomendação de Execução

### Trimestre 1 (Semanas 1-12)
1. **FASE 1:** APIs de Recrutamento (60 cr) - Semanas 1-4
2. **FASE 3:** Notificações de Vencimento (25 cr) - Semanas 5-6
3. **FASE 4:** Dashboard de Analytics (35 cr) - Semanas 7-9
4. **Checkpoint:** Validação e testes - Semanas 10-12

**Investimento:** 120 créditos  
**Resultado:** Sistema de recrutamento + monitoramento + analytics

---

### Trimestre 2 (Semanas 13-24)
1. **FASE 2:** Cálculo Automático de Folha (50 cr) - Semanas 13-17
2. **FASE 5:** Integração com Ponto (40 cr) - Semanas 18-22
3. **Checkpoint:** Validação e testes - Semanas 23-24

**Investimento:** 90 créditos  
**Resultado:** Folha + Ponto integrados

---

### Trimestre 3 (Semanas 25-36)
1. **FASE 6:** Portal do Colaborador (30 cr) - Semanas 25-28
2. **FASE 7:** Relatórios Avançados (20 cr) - Semanas 29-30
3. **FASE 8:** Mobile App (45 cr) - Semanas 31-36
4. **Checkpoint:** Validação final - Semana 36

**Investimento:** 95 créditos  
**Resultado:** Portal + Relatórios + App mobile

---

## ✅ Critérios de Sucesso

Para cada fase, validar:
- [ ] 100% de cobertura de testes vitest
- [ ] 0 erros TypeScript
- [ ] Documentação completa
- [ ] Checkpoint salvo
- [ ] Validação com usuário final
- [ ] Performance OK (< 2s para queries)
- [ ] Segurança validada (OWASP Top 10)
- [ ] Compliance CLT/LGPD

---

## 📞 Próximos Passos

1. **Semana 1:** Confirmar prioridades com stakeholders
2. **Semana 2:** Iniciar FASE 1 (APIs de Recrutamento)
3. **Semana 4:** Checkpoint e validação
4. **Semana 5:** Iniciar FASE 3 (Notificações)

---

**Documento criado em:** 13 de Fevereiro de 2026  
**Versão:** 1.0  
**Status:** Pronto para execução  
