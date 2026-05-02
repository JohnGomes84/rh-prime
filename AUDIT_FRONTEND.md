# Auditoria Frontend - Páginas vs Backend

## CONECTADAS AO BANCO (trpc > 0, sem mock significativo)
| Página | trpc | DashboardLayout | Status |
|--------|------|-----------------|--------|
| Employees.tsx | 4 | SIM | OK - CRUD real |
| EmployeeDetail.tsx | 13 | SIM | OK - Perfil completo |
| Positions.tsx | 5 | SIM | OK - CRUD real |
| Vacations.tsx | 3 | SIM | OK - CRUD real |
| MedicalExams.tsx | 3 | SIM | OK - CRUD real |
| TimeBank.tsx | 2 | SIM | OK - CRUD real |
| Documents.tsx | 4 | SIM | OK - CRUD real |
| DocumentTemplates.tsx | 4 | SIM | OK - CRUD real |
| DocumentGenerator.tsx | 2 | SIM | OK - Gerador real |
| SafetyHealth.tsx | 3 | SIM | OK - CRUD real |
| Home.tsx | 1 | SIM | OK - Dashboard stats |
| Settings.tsx | 1 | SIM | OK - Configurações |
| Notifications.tsx | 1 | SIM | OK - Lista notificações |

## PARCIALMENTE CONECTADAS (trpc > 0, mas com mock/problemas)
| Página | trpc | DashboardLayout | Problema |
|--------|------|-----------------|----------|
| TimeTracking.tsx | 4 | NAO | Bug: clockOut usa clockIn, sem DashboardLayout |
| OvertimeManagement.tsx | 5 | NAO | Sem DashboardLayout |
| Audit.tsx | 2 | NAO | Sem DashboardLayout |
| PeopleAnalytics.tsx | 2 | NAO | Muitos dados mock, sem DashboardLayout |
| Reports.tsx | 1 | NAO | Dados mock, sem DashboardLayout |
| SignContracts.tsx | 1 | SIM | Dados mock predominam |
| SignatureAudit.tsx | 1 | SIM | Dados mock predominam |

## TOTALMENTE MOCK (trpc = 0, dados estáticos)
| Página | DashboardLayout | Ação Necessária |
|--------|-----------------|-----------------|
| Timesheet.tsx | SIM | SUBSTITUIR por TimeTracking real |
| Payroll.tsx | SIM | Conectar ao payroll-calculator |
| Payslip.tsx | NAO | Conectar ao payroll-calculator + DashboardLayout |
| Recruitment.tsx | SIM | Conectar ao banco (tabela existe?) |
| ProfessionalAssessment.tsx | SIM | Conectar ao banco |
| SecuritySettings.tsx | SIM | Conectar ao banco |
| UserManagement.tsx | SIM | Conectar ao banco (users table) |
| UserHierarchy.tsx | SIM | Conectar ao banco |
| SignASOs.tsx | SIM | Conectar ao banco |
| Integration.tsx | SIM | Sem backend necessário (config) |

## NÃO NO SIDEBAR (páginas existentes mas sem acesso direto)
- TimeTracking (/ponto-novo) - NÃO está no sidebar
- OvertimeManagement (/horas-extras) - NÃO está no sidebar
- Payslip (/holerite) - NÃO está no sidebar
- PeopleAnalytics (/analytics) - NÃO está no sidebar
- Audit (/auditoria) - ESTÁ no sidebar
- Reports (/relatorios) - ESTÁ no sidebar

## PRIORIDADE DE CORREÇÃO
1. Timesheet/TimeTracking → Unificar e conectar ao banco
2. Payroll/Payslip → Conectar ao payroll-calculator real
3. OvertimeManagement → Adicionar DashboardLayout
4. PeopleAnalytics → Conectar stats reais
5. Recruitment → Conectar ao banco
6. UserManagement → Conectar ao banco (users)
7. Sidebar → Adicionar itens faltantes
