# ARCHITECTURE.md — RH Prime

> Mapa técnico detalhado do sistema. Gerado em 2026-05-19.
>
> **Objetivo:** dar visibilidade completa sobre código, dados, fluxos,
> integrações e superfícies de ataque, sem precisar reescrever.

---

## Sumário

1. [Stack técnico](#1-stack-técnico)
2. [Topologia & deploy](#2-topologia--deploy)
3. [Layout do repositório](#3-layout-do-repositório)
4. [Modelo de dados (59 tabelas)](#4-modelo-de-dados-59-tabelas)
5. [Backend tRPC (45 routers, ~380 procedures)](#5-backend-trpc-45-routers-380-procedures)
6. [Endpoints HTTP não-tRPC](#6-endpoints-http-não-trpc)
7. [Frontend React (42 páginas)](#7-frontend-react-42-páginas)
8. [Autenticação, RBAC e contexto](#8-autenticação-rbac-e-contexto)
9. [Fluxos críticos de negócio](#9-fluxos-críticos-de-negócio)
10. [Integrações externas](#10-integrações-externas)
11. [Segurança e compliance](#11-segurança-e-compliance)
12. [Notificações e tempo real](#12-notificações-e-tempo-real)
13. [Migrations e estado do banco](#13-migrations-e-estado-do-banco)
14. [Feature flags e environment](#14-feature-flags-e-environment)
15. [Estado de desenvolvimento](#15-estado-de-desenvolvimento)
16. [Backups e disaster recovery](#16-backups-e-disaster-recovery)
17. [Gaps conhecidos e priorização](#17-gaps-conhecidos-e-priorização)

---

## 1. Stack técnico

| Camada | Tecnologia | Versão | Notas |
|---|---|---|---|
| Linguagem | TypeScript | 5.9 | ESM puro (`"type": "module"`) |
| Runtime | Node.js | ≥ 24 | tsx watch em dev |
| Frontend | React | 19.2 | Lazy routes via wouter |
| Build SPA | Vite | 7.1 | Build em `dist/`, chunks por página |
| Roteador SPA | wouter | 3.3 | Patched (`patches/wouter@3.7.1.patch`) |
| Estado servidor | TanStack Query | 5.90 | Via tRPC v11 |
| UI primitiva | Radix UI + Tailwind 4 | — | shadcn/ui pattern |
| Backend | Express | 4.21 | `server/_core/app.ts` |
| RPC | tRPC | 11.6 | superjson transformer |
| ORM | drizzle-orm | 0.44 | MySQL dialect, `mysql2` driver |
| DB | TiDB Cloud Serverless | 8.5 | wire MySQL 8, TLS obrigatório |
| Auth local | jsonwebtoken + bcryptjs | — | 12 salt rounds, 7d expiry |
| Auth OAuth (opcional) | jose | 6.1 | Manus OAuth flow |
| Storage | Vercel Blob | 2.3 | `access: "private"` + proxy autenticado |
| Email | Resend | 6.12 | SDK oficial |
| Real-time | ws | 8.20 | `/api/ws` |
| PDF | jsPDF + docx | — | holerite + docs |
| Lookup externo | axios | 1.12 | Brasil API + ReceitaWS |
| Testes | vitest | 2.1 | Unit + integration |
| Deploy | Vercel (serverless) | — | `api/` entrypoint |

---

## 2. Topologia & deploy

```
                  ┌──────────────────────────────────────┐
                  │   Vercel Edge (CDN + serverless)    │
                  │   public-self-eight.vercel.app      │
                  └──────────┬───────────────────────────┘
                             │ HTTPS + cookies httpOnly
                             ▼
   ┌──────────────────────────────────────────────────────────┐
   │  Express app (single function)                            │
   │  - helmet + CORS + rate-limit                             │
   │  - tRPC server (/api/trpc/*)                              │
   │  - /api/upload-evidence (admin, 4MB cap, allowlist)       │
   │  - /api/upload-attachment (kanban)                        │
   │  - /api/blob/proxy?url=... (autenticado)                  │
   │  - /api/ws (WebSocket via ws)                             │
   │  - /api/oauth/* (opcional, OAuth Manus)                   │
   │  - serve static (Vite dist)                               │
   └──┬────────────┬──────────────┬─────────────┬──────────────┘
      │            │              │             │
      ▼            ▼              ▼             ▼
   ┌──────┐    ┌────────┐    ┌─────────┐   ┌──────────┐
   │ TiDB │    │ Vercel │    │ Resend  │   │ Brasil   │
   │Cloud │    │ Blob   │    │ (email) │   │ API +    │
   │ MySQL│    │(private│    │         │   │ReceitaWS │
   │  8   │    │ blobs) │    │         │   │ (lookup) │
   └──────┘    └────────┘    └─────────┘   └──────────┘
```

**Hostname prod:** `public-self-eight.vercel.app`  
**Hostname dev local:** `http://localhost:3002`  
**DB prod:** `gateway01.us-east-1.prod.aws.tidbcloud.com:4000/rh_prime`  
**DB dev:** mesma host, schema `rh_prime_dev`

---

## 3. Layout do repositório

```
rh-prime/
├── api/                              # Vercel serverless entrypoint
├── client/                           # React SPA
│   ├── src/
│   │   ├── App.tsx                   # wouter Router + lazy routes + guards
│   │   ├── main.tsx                  # entrypoint
│   │   ├── pages/                    # 42 páginas (lazy)
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui (button, dialog, etc.)
│   │   │   ├── kanban/               # CardDetailDrawer, CardInlineExpanded, etc.
│   │   │   ├── NotificationBell, NotificationToast, ConsentBanner
│   │   │   ├── ErrorBoundary, RouteGuard (AdminGuard, ManagerGuard)
│   │   │   └── DashboardLayout
│   │   ├── contexts/                 # ThemeContext, NotificationContext
│   │   ├── lib/
│   │   │   ├── trpc.ts               # createTRPCReact<AppRouter>
│   │   │   └── (utils, formatters)
│   │   ├── hooks/                    # custom hooks
│   │   ├── const.ts                  # client constants
│   │   └── index.css                 # Tailwind base
│   └── public/
├── server/                           # Backend Node/Express
│   ├── _core/                        # bootstrap
│   │   ├── app.ts                    # express + helmet + cors + rate-limit
│   │   ├── index.ts                  # server entrypoint
│   │   ├── trpc.ts                   # router, public/protected/manager/admin procedures
│   │   ├── context.ts                # tRPC context (req, res, user)
│   │   ├── env.ts                    # env validation
│   │   ├── feature-flags.ts          # FEATURE_FLAGS + *_ENABLED
│   │   ├── cookies.ts                # cookie options helpers
│   │   ├── sdk.ts                    # OAuth/JWT session
│   │   ├── oauth.ts                  # OAuth routes (Manus)
│   │   ├── websocket.ts              # ws server (/api/ws)
│   │   ├── notification-events.ts    # broadcasts (overtime, vacation, job)
│   │   ├── notification-scheduler.ts # daily scan
│   │   ├── kanban-notifications.ts   # assign/comment/deadline
│   │   ├── local-dev-users.ts        # .local-dev-users.json (gitignored)
│   │   ├── static.ts                 # serve Vite dist
│   │   └── systemRouter.ts           # health, metrics
│   ├── routers.ts                    # router raiz (1420 linhas, ~26 inline routers)
│   ├── routers/                      # sub-routers
│   │   ├── ai.ts                     # resume parser, job description gen
│   │   ├── audit-cpf.ts              # auditoria por CPF
│   │   ├── audit.ts                  # logs gerais
│   │   ├── auth-rbac.ts              # users CRUD + RBAC
│   │   ├── compliance-lgpd.ts        # consent + read audit
│   │   ├── compliance-portaria.ts    # AFD/AFDT/ACJEF
│   │   ├── compliance.ts             # relatórios gerais
│   │   ├── departments.ts            # hierarquia
│   │   ├── digital-signature.ts      # gov.br/PIN/biometria/cert
│   │   ├── inbox.ts                  # requests + approvals
│   │   ├── integrations.ts           # CEP, CNPJ, webhooks
│   │   ├── kanban.ts                 # boards/lists/cards (RBAC por role no board)
│   │   ├── labor-calc.ts             # rescisão, 13º, férias proporcionais
│   │   ├── lifecycle.ts              # admission + movement + termination
│   │   ├── lookup.ts                 # Brasil API
│   │   ├── payroll.ts                # folha
│   │   ├── payslip.ts                # holerite PDF
│   │   ├── recruitment.ts            # jobOpenings + candidates
│   │   ├── reports.ts                # relatórios HR
│   │   └── timesheet.ts              # clockIn/Out + overtime
│   ├── services/                     # lógica de domínio
│   │   ├── admission-checklist.service.ts   # instanciar catalog, recompute status, gates, mirror
│   │   ├── documents.service.ts             # createDocumentRecord, getPrimaryEvidence
│   │   ├── signatures.service.ts            # addSignature, isFullySigned
│   │   ├── digital-signature-service.ts     # crypto hashes
│   │   └── template-render.service.ts       # render {{placeholders}} em HTML
│   ├── config/
│   │   └── admission-catalog.ts      # ADMISSION_CATALOG_V1 (16 itens)
│   ├── modules/
│   │   └── auth/
│   │       └── auth-service.ts       # login, register, allowed emails
│   ├── auth/
│   │   └── jwt-service.ts            # bcrypt, jwt sign/verify, password strength
│   ├── integrations/
│   │   ├── brasil-api.ts             # CEP, CNPJ, feriados
│   │   └── email-service.ts          # Resend wrapper + templates kanban
│   ├── middleware/                   # rate-limit, audit, RBAC
│   ├── audit-middleware.ts           # audit logger
│   ├── compliance.ts                 # generateComplianceReport
│   ├── db.ts                         # drizzle pool + 100+ query helpers
│   ├── pdf-generator.ts              # jsPDF utilities
│   ├── storage.ts                    # storagePut (Vercel Blob)
│   ├── utils/
│   │   ├── data-masking.ts           # maskCpf, maskRg, maskEmail, maskPhone
│   │   ├── scope.ts                  # assertEmployeeInScope, resolveEmployeeIdInScope
│   │   ├── retry.ts                  # withDBRetry
│   │   ├── business-days.ts          # cálculo BR
│   │   ├── journey-engine.ts         # evaluateClockRecord (jornada compliance)
│   │   ├── geofence.ts               # evaluateGeofence
│   │   ├── portaria-671.ts           # buildAfd/Afdt/Acjef + sha256
│   │   └── type-converters.ts        # toDate, toDateOpt
│   ├── schemas/                      # Zod schemas
│   ├── __test__/                     # unit tests
│   └── *.test.ts                     # integration tests vitest
├── drizzle/
│   ├── schema.ts                     # 49 tabelas core
│   ├── schema-kanban.ts              # 10 tabelas kanban
│   ├── 0000_*.sql ... 0027_*.sql     # 28 migrations
│   └── meta/                         # drizzle snapshots
├── shared/
│   └── const.ts                      # COOKIE_NAME, ONE_YEAR_MS, error msgs
├── scripts/
│   ├── backup-db.ps1 / .sh           # mysqldump TiDB
│   ├── seed-admission-templates.sql  # 5 templates HTML
│   ├── admission-wipe-dev.ts         # one-off wipe + backup JSON
│   ├── seed-templates-dev.ts         # roda seed SQL via mysql2
│   └── check-kanban-dev.ts           # contagem tabelas
├── docs/                             # docs operacionais
├── patches/                          # patches pnpm
├── backups/                          # backups locais (gitignored)
├── api/                              # Vercel handler
├── .env.example                      # template env
├── .env.local                        # local secrets (gitignored)
├── .local-dev-users.json             # hashed admin creds dev (gitignored)
├── drizzle.config.ts                 # drizzle-kit config
├── vite.config.ts
├── tsconfig.json
├── package.json
└── ARCHITECTURE.md                   # este arquivo
```

---

## 4. Modelo de dados (59 tabelas)

Domínio organizacional. FKs com `→` indicam relação. Enums constraint valores válidos.

### 4.1 Identidade & auditoria (6 tabelas)

**`users`**
- PK: `id`
- Unique: `openId`, `email`
- Colunas chave: `passwordHash`, `role` (enum: `admin | gestor | colaborador | user`), `name`, `loginMethod` (`jwt | manus | google | ...`)
- Uso: autenticação local JWT + OAuth Manus

**`permissions`**
- Matriz RBAC explícita (role × resource × action). Hoje usada como referência; o gate efetivo está no `trpc.ts` via `adminProcedure`/`managerProcedure`.

**`audit_logs`**
- PK: `id`. Colunas: `userId`, `cpf`, `action`, `resource`, `resourceId`, `changesBefore` (JSON), `changesAfter` (JSON), `status`, `ipAddress`, `userAgent`.
- Populado por `audit-middleware.ts` em cada mutation tRPC.

**`login_logs`**
- Cada tentativa de login (sucesso/falha). Inclui `reason` na falha. Populado em `auth.login`.

**`consent_records`** (LGPD)
- `userId`, `employeeId`, `consentType` (enum: `data_processing | selfie_capture | geo_capture | marketing | internal_policies | biometric | third_party_share`), `legalBasis` (enum: `consentimento | execucao_contrato | obrigacao_legal | interesse_legitimo | protecao_credito | tutela_saude`), `accepted`, `acceptedAt`, `revokedAt`.
- Índice composto: `userId + consentType`.

**`read_audit_logs`**
- Leituras sensíveis (admin lendo dados de funcionário que não é o próprio). `actorUserId`, `resource`, `field`, `targetEmployeeId`, `scope` (`self | team | all`), `ipAddress`, `metadata`.
- Populado em `employees.get` e em scopos LGPD.

### 4.2 Pessoas (5 tabelas)

**`employees`** — registro mestre do colaborador
- PK: `id`. Unique: `cpf`.
- FKs: `userId → users.id`, `managerId → employees.id` (self-FK), `departmentId → departments.id`.
- Status: `Ativo | Inativo | Afastado | Férias`.
- `employmentType` enum com 15 valores (CLT, CLT_Comissao, Estagio, JovemAprendiz, etc).
- Inclui CTPS, PIS, voterTitle, militaryCert, CNH (+ expiry), banco (nome/agência/conta/pix), salário, esocialMatricula, insalubridade (0/10/20/40%).
- Endereço completo + cost center + branch.

**`dependents`** — dependentes para IR e salário-família
- FK: `employeeId`. Enum `relationship`. Flags `irDeduction`, `familySalary`.

**`employee_positions`** — histórico de cargos
- `employeeId`, `positionId`, `salary`, `startDate`, `endDate`, `changeReason`.

**`employee_manager_history`** — auditoria de mudança de gestor
- `employeeId`, `managerId`, `startDate`, `endDate`, `changedById`, `reason`. Índice por `employeeId`.

**`employee_movements`** — transições versionadas
- `kind` enum: `promocao | transferencia_dept | troca_gestor | ajuste_salarial | mudanca_jornada | mudanca_centro_custo | mudanca_cargo`.
- `fromValue`, `toValue`, `effectiveDate`, `reason`, `approvedById`, `createdById`. Índices em `employeeId+effectiveDate`.

### 4.3 Estrutura organizacional (2 tabelas)

**`departments`** — hierarquia
- `parentId` self-FK pra árvore. `headEmployeeId → employees.id`. `costCenter`, `active`.

**`positions`** — cargos
- `title`, `cboCode`, `description`, `department` (string livre), `baseSalary`. `hazardLevel` enum: `Nenhum | Insalubridade | Periculosidade`.

### 4.4 Lifecycle / Admissão V2 (2 tabelas + checklist v1 legado)

**`admission_workflows`** — workflow de admissão
- Status: `DRAFT | DOCS_PENDING | VALIDATING | APPROVED | ACTIVE | REJECTED | CANCELLED`.
- Candidato: `candidateName`, `candidateEmail`, `candidateCpf`, `candidatePhone`.
- Placement proposto: `positionId`, `departmentId`, `managerId`, `proposedSalary`, `proposedHireDate`, `contractType` (CLT, Estágio, Temporário, Experiência).
- Workflow: `currentStep`, `createdById`, `approvedById`.
- **Vínculo:** `resultEmployeeId → employees.id` (NULL até finalizar).
- **Sync:** `syncStatus` (`NOT_SYNCED | SYNCED | SYNC_ERROR`), `catalogVersion` (string `"v1.0"`).
- Índices: `status`, `candidateCpf`.

**`admission_checklist_items`** — itens do checklist v2
- `workflowId → admission_workflows.id`.
- `code` único por workflow (ex `ADM_DOC_RG`).
- `kind` enum: `upload_required | generate_document | manual_validation | external_process | training_or_ack`.
- Policies: `documentPolicy` (`none | optional | required_single`), `templatePolicy`, `templateKey`, `signaturePolicy` (`none | employee_required | both_required`), `reviewPolicy` (`auto_complete | manual_review`).
- Status: `PENDING | IN_PROGRESS | AWAITING_EVIDENCE | AWAITING_SIGNATURE | UNDER_REVIEW | COMPLETED | WAIVED | REJECTED | ERROR`.
- Waiver: `waivedReason`, `waivedById`, `waivedAt`.
- Review: `reviewedAt`, `reviewedById`, `reviewNotes`, `reviewStatus`.

**`checklist_items`** — checklist v1 LEGADO (espelho pós-finalização v2)
- Recebe espelho dos itens v2 após finalização (`mirrorOrigin = "admission_workflow"`).
- Mantido para compatibilidade com fluxo antigo `checklist` router.

### 4.5 Contratos & jornada (5 tabelas)

**`contracts`** — contrato de trabalho
- `employeeId`, `positionId`, `contractType`, `hireDate`, `experienceEndDate`, `experienceRenewed`, `terminationDate`, `salary`, `weeklyHours`.
- Jornada: `scheduleType` (`5x2 | 6x1 | 12x36 | parcial_30h | parcial_25h | flexivel | intermitente`), `workDays` (JSON `[0..6]`), `startTime`, `endTime`, `lunchBreakMinutes`, `toleranceMinutes`.
- Flags: `hourBankEnabled`, `nightShiftEnabled`.

**`time_records`** — ponto eletrônico (Portaria MTP 671/2021 REP-P)
- `clockIn`, `clockOut`, `hoursWorked`, `location`, `notes`.
- Status: `PENDING | APPROVED | REJECTED`. `approvedById`, `approvedAt`, `updatedById`.
- **REP-P:** `nsr` (sequential), `previousHash`, `recordHash` (SHA-256 encadeado).
- **Antifraude:** `selfieUrl`, `geofenceStatus` (`within | outside | no_geo`), `deviceFingerprint`.
- Índices: `employeeId+clockIn`, `employeeId+status`, `clockIn`, `nsr`.

**`overtime_records`** — horas extras
- FK `timeRecordId → time_records.id`. `hoursWorked`, `overtimeHours`, `multiplier`.
- `type` enum: `50% | 100% | NOTURNO`. Status approval.

**`overtime_authorizations`** — pré-autorização
- `employeeId`, `authorizedDate`, `maxHours`, `type`, `authorizedById`, `reason`, `consumed`.

**`time_bank`** — banco de horas
- `referenceMonth`, `hoursBalance`, `expiryDate`. Status: `Ativo | Compensado | Vencido | Pago`.

### 4.6 Férias, licenças, faltas (3 tabelas)

**`vacations`** — direito anual (período aquisitivo)
- `acquisitionStart`, `acquisitionEnd`, `concessionLimit` (limite legal pra gozar), `daysEntitled` (default 30), `daysTaken`.
- Status: `Pendente | Agendada | Em Gozo | Concluída | Vencida`.

**`vacation_periods`** — períodos de gozo
- FK `vacationId`. `startDate`, `endDate`, `days`.
- `isPecuniaryAllowance` (abono pecuniário), `pecuniaryDays`, `noticeDate`.

**`leaves`** — afastamentos
- `leaveType` enum: `Médico | INSS | Maternidade | Paternidade | Acidente de Trabalho | Outros`.
- `inssProtocol`, `documentUrl`, `startDate`, `expectedReturnDate`, `actualReturnDate`. Status: `Ativo | Encerrado`.

**`absences`** — faltas
- `absenceDate`, `justified` (boolean), `reason`, `documentUrl`.

### 4.7 Documentos & assinaturas (4 tabelas)

**`documents`** — GED (Gestão Eletrônica de Documentos)
- `employeeId`, `cpf`, `category` (enum: `Pessoal | Contratual | Saúde e Segurança | Benefícios | Termos | Treinamentos | Outros`).
- `documentName`, `fileUrl`, `fileKey`, `fileType`, `fileSize`.
- `lifecycleStatus` (`stored | ...`), `expiryDate`, `origin` (`upload | generated | ...`).
- **Vínculo admission v2:** `admissionWorkflowId`, `admissionChecklistItemId`, `isPrimaryEvidence` (boolean).

**`document_templates`** — templates HTML
- `templateName`, `machineKey` (UNIQUE — usado pelo render), `templateType` (enum), `content` (HTML com `{{snake_case}}`), `placeholders` (JSON array), `isActive`.
- 5 templates seeded: `contract_clt`, `term_confidentiality`, `term_vt`, `os_nr1`, `ficha_cadastral`.

**`document_signatures`** — assinaturas
- `documentId → documents.id`, `signatoryType` (varchar(40) — `employee | company_representative | ...`), `signatoryId`, `signatureMethod` (electronic, manuscrita, icp_brasil), `signedAt`, `ipAddress`.
- Constraint: 1 assinatura por (documentId, signatoryType) — second insert lança erro.

**`digital_signatures`** — prova criptográfica gov.br/cert
- `documentHash`, `signatureHash`, `signatureMethod` (`PIN | BIOMETRIC | CERTIFICATE`).
- `isValid`, `validationTimestamp`, `ipAddress`, `userAgent`.

### 4.8 Saúde e segurança (5 tabelas)

**`medical_exams`** — ASO
- `examType`: `Admissional | Periódico | Demissional | Retorno | Mudança de Função`.
- `examDate`, `expiryDate`, `result` (`Apto | Inapto | Apto com Restrições`).
- `doctorName`, `crm`, `clinicName`, `documentUrl`.

**`service_orders`** — Ordem de Serviço NR-1
- `nrReference`, `activities`, `risks`, `recommendedPpe`, `preventiveMeasures`, `requiredTrainings`. `employeeSignature` boolean.

**`ppe_deliveries`** — entrega de EPIs
- `ppeDescription`, `caNumber` (Certificado de Aprovação), `quantity`, `deliveryDate`, `returnDate`, `reason`. `employeeSignature` boolean.

**`pcmso`** — Programa de Controle Médico de Saúde Ocupacional
- `companyName`, `cnpj`, `issueDate`, `expiryDate`, `documentUrl`, `fileKey`.

**`pgr`** — Programa de Gerenciamento de Riscos
- Mesma estrutura de `pcmso`.

### 4.9 Treinamento & equipamento (3 tabelas)

**`trainings`** — treinamentos NR
- `trainingName`, `nrReference` (NR-10, NR-35, etc), `trainingDate`, `expiryDate`, `hours`, `provider`, `certificateUrl`.

**`equipment`** — inventário
- `equipmentType`, `brand`, `model`, `serialNumber`, `imei`, `patrimonyCode`. Status: `Disponível | Emprestado | Em Manutenção | Baixado`.

**`equipment_loans`** — comodato
- `equipmentId`, `employeeId`, `loanDate`, `returnDate`, `conditionAtLoan`, `conditionAtReturn`, `termDocumentId`. Status `Ativo | Devolvido`.

### 4.10 Benefícios (1 tabela)

**`benefits`** — VT, VA, VR, plano saúde, plano odonto, seguro vida
- `benefitType` enum, `provider`, `planName`, `value`, `employeeContribution`, `optedOut`, `optOutDate`, `startDate`, `endDate`. Status `Ativo | Inativo | Suspenso`.

### 4.11 Recrutamento (2 tabelas)

**`job_openings`** — vagas
- `title`, `positionId`, `department`, `description`, `requirements`, `salaryMin`, `salaryMax`, `vacancies`. Status `Aberta | Em Andamento | Fechada | Cancelada`. Priority `Baixa | Normal | Alta | Urgente`.

**`candidates`** — candidatos
- `jobOpeningId`, `name`, `email`, `phone`, `resumeUrl`, `linkedinUrl`, `notes`, `rating`. Pipeline stages: `Triagem | Entrevista RH | Entrevista Tecnica | Entrevista Final | Aprovado | Reprovado | Desistiu`.

### 4.12 Desligamento (2 tabelas)

**`terminations`** — workflow de desligamento
- `noticeDate`, `lastWorkingDay`, `reason` (enum: `sem_justa_causa | pedido_demissao | justa_causa | fim_contrato_determinado | acordo_mutuo | aposentadoria | obito`).
- Status: `INICIADO | DOCUMENTOS | DEVOLUCAO_EQUIP | CALCULO_VERBAS | APROVADO | FINALIZADO | CANCELADO`.
- `noticeType`: `trabalhado | indenizado | dispensado`.
- `totalVerbas`, `initiatedById`, `approvedById`, `finalizedAt`.

**`termination_devolution_items`** — checklist de devolução
- `terminationId`, `itemDescription`, `returned`, `returnedAt`, `notes`.

### 4.13 Inbox & notificações (3 tabelas)

**`requests`** — solicitações
- `kind` enum: `ferias | atestado | ajuste_ponto | abono | horas_extras | declaracao | adiantamento | outro`.
- `employeeId`, `subject`, `description`, `payload` (JSON).
- Status: `PENDING | IN_REVIEW | APPROVED | REJECTED | CANCELLED`. Priority `LOW | NORMAL | HIGH | URGENT`.
- `slaDueAt`, `relatedResourceType`, `relatedResourceId`, `createdById`, `resolvedById`, `resolvedAt`.

**`approvals`** — aprovação multinível
- `requestId`, `approverUserId`, `level`, `decision` (`PENDING | APPROVED | REJECTED`), `reason`, `decidedAt`.

**`notifications`** — notificações in-app
- `type` (`Férias | ASO | Banco de Horas | Contrato Experiência | Treinamento | Documento | EPI | Geral`).
- `title`, `message`, `severity` (`Info | Aviso | Crítico`).
- `relatedEmployeeId`, `userId`, `isRead`, `dueDate`. Índice `userId+isRead`.

### 4.14 Compliance (1 tabela)

**`compliance_exports`** — exports Portaria 671
- `type` (`AFD | AFDT | ACJEF`), `periodStart`, `periodEnd`, `generatedById`, `recordCount`, `fileSha256`, `fileBytes`, `notes`. Índice `type+periodStart`.

### 4.15 Config (3 tabelas)

**`holidays`** — feriados (importável da Brasil API)
- `name`, `date`, `type` (`Nacional | Estadual | Municipal`), `recurring`.

**`settings`** — key-value config
- `key` (unique), `value`, `description`. Chaves usadas: `company.name`, `company.cnpj`, `company.address`, `company.city`, `company.geofence_lat/lng/radius_m`, `company.repId`.

**`dashboard_settings`** — personalização dashboard
- `userId`, `visibleMetrics` (JSON), `metricsOrder` (JSON).

### 4.16 Kanban (10 tabelas, `drizzle/schema-kanban.ts`)

**`kanban_boards`**
- `name`, `description`, `color`, `ownerId → users.id`, `visibility` (`private | team | public`), `departmentId`, `archived`. Índices `ownerId`, `departmentId`.

**`kanban_lists`** — colunas/estágios
- `boardId`, `name`, `position` (double), `archived`. Índice `boardId+position`.

**`kanban_cards`** — tarefas
- `listId`, `boardId`, `title`, `description`, `position`, `dueDate`, `priority` (`low | medium | high | urgent`), `createdBy`, `archived`, `completedAt`.

**`kanban_checklist_items`** — sub-tasks dentro do card
- `cardId`, `content`, `isDone`, `position`.

**`kanban_card_assignees`** — designados
- `cardId`, `userId`, `employeeId`, `assignedAt`. Índice unique `cardId+userId`.

**`kanban_labels`** — labels do board
- `boardId`, `name`, `color`.

**`kanban_card_labels`** — junction many-to-many

**`kanban_board_members`** — RBAC do board
- `boardId`, `userId`, `role` (`admin | editor | viewer`), `addedAt`.

**`kanban_card_comments`** — comentários
- `cardId`, `userId`, `body`, `createdAt`, `updatedAt`.

**`kanban_card_attachments`** — anexos (Vercel Blob private)
- `cardId`, `uploadedBy`, `fileName`, `fileUrl`, `pathname`, `contentType`, `sizeBytes`.

---

## 5. Backend tRPC (45 routers, ~380 procedures)

Router raiz em `server/routers.ts`. Sub-routers importados de `server/routers/`.

### 5.1 Procedures e middlewares

```ts
// server/_core/trpc.ts
publicProcedure       // sem auth
protectedProcedure    // requer ctx.user + audit log
managerProcedure      // role ∈ {admin, gestor} + audit log
adminProcedure        // role === admin + audit log
```

**Audit automático:** toda **mutation** dispara `logAudit(action, resource, ...)` via middleware. Action derivada do `path` (delete/update/create/upsert/register).

**Escopo de visibilidade** (`server/utils/scope.ts`):
- `admin` → tudo
- viewer === target → tudo (próprio funcionário)
- `gestor` → próprio + subordinados recursivos (`getSubordinatesRecursive`)
- `colaborador` → só próprio

**Mascaramento de PII** (`server/utils/data-masking.ts`):
- CPF: `***.***.***-XX`
- RG: `*...XX`
- Email: `jo***@dominio.com`
- Phone: `(**) ****-XXXX`
- Endereço completo + dados bancários → escondidos para não-admin

### 5.2 Inline routers (em `routers.ts`)

26 routers inline:

| Router | Procedures | Notas |
|---|---|---|
| `auth` | `me, session, login, register, logout` | Login grava login_log (sucesso/falha + IP + UA). Register validado contra whitelist de email + password strength (8+ chars, A-Z, a-z, 0-9, especial). |
| `users` | (re-export `authRbacRouter`) | RBAC CRUD + role updates |
| `dashboard` | `stats, birthdays, turnover, absenteeism, headcount, pendingByManager, approvalLatency, hourBankDistribution, tardinessByDepartment, documentCompliance, vacationDeadlineRisks` | KPIs analytics |
| `employees` | `list, get, create, update, delete (admin), linkUser, setManager, setDepartment, managerHistory, me, bulkImport` | bulkImport: CSV → dryRun validação (CPF checksum, gender, marital, state) → commit. Audit de leitura sensível em `get` quando viewer ≠ target. |
| `positions` | CRUD + `cboCode, hazardLevel` | |
| `contracts` | CRUD + jornada completa (scheduleType, workDays, tolerance, hourBank, nightShift) | |
| `employeePositions` | `list, create` | Histórico salarial |
| `vacations` | `list, get, create, update, overdue, upcoming` | Scope check em `list` |
| `vacationPeriods` | `list, listByEmployee, create, update` | Pecúnia, notice date |
| `medicalExams` | CRUD + `expired, upcoming` | ASO |
| `leaves` | CRUD | Médico, INSS, maternidade |
| `timeBank` | CRUD + `expiring` | Banco de horas |
| `benefits` | CRUD | VT, VA, plano saúde, etc. |
| `documents` | `list, create, delete (manager), upload` | upload via base64 → storage.put |
| `checklist` | `list, update, createDefault` | v1 legado |
| `equipment` | CRUD | Patrimônio |
| `equipmentLoans` | `list, create, return` | Toggle status equipment |
| `ppeDeliveries` | `list, create` | EPI com CA |
| `trainings` | CRUD | NRs + validade |
| `serviceOrders` | `list, create` | OS NR-1 |
| `documentTemplates` | CRUD + `generate` | Render placeholders (`{{NOME_FUNCIONARIO}}`, etc) |
| `notifications` | `list, count, markRead, markAllRead, create` | Por userId, ordenado por isRead |
| `holidays` | `list, create, delete (admin), importYear (admin)` | importYear: Brasil API |
| `settings` | `list, get, upsert (admin)` | KV company config |
| `dependents` | `list, create, delete (manager)` | IRRF + salário-família |
| `absences` | `list, create` | |
| `businessDays` | `count, add, isBusinessDay` | Cálculo dias úteis BR |

### 5.3 Sub-routers (20 arquivos em `server/routers/`)

#### `lifecycle.ts` — admissão / movimentação / desligamento

**admission** (todos `adminProcedure`)
- `list({status?})` — workflows
- `get({id})` — workflow + checklist
- `create({candidateName, candidateEmail, candidateCpf, ..., contractType})` — cria workflow. Se `ADMISSION_V2_ENABLED`, seta `catalogVersion='v1.0'` + chama `instantiateCatalogForWorkflow` (popula 16 itens).
- `checklist({id})` — checklist com evidências, primary evidence, signatures
- `update({id, ...})` — status / step / notes
- `completeChecklistItem({id, completed, ...})` — flag completion + documentação
- `waiveChecklistItem({workflowId, itemId, reason})` — dispensa item (`canWaiveChecklistItem` valida via `catalog.waivable`)
- `reviewChecklistItem({workflowId, itemId, reviewStatus, reviewNotes})` — `pending | approved | rejected` + recompute status
- `attachEvidenceUrl({workflowId, itemId, fileUrl, fileType, ...})` — anexa documento, recompute status
- `generateDocument({workflowId, itemId})` — renderiza template via `template-render.service.ts`, salva blob `access: "private"`, cria documentRecord como `isPrimaryEvidence`
- `signEvidence({workflowId, itemId, signatoryType, signatureMethod})` — adiciona signature ao primaryEvidence, recompute status
- `finalize({id, employeeId})` — valida gates v2 (`validateFinalizationGates`), converte workflow → employee ACTIVE, sync mirror v1
- `retryFinalizationSync({id})` — retry quando `syncStatus = SYNC_ERROR`

**movement**
- `listByEmployee({employeeId})` — scope check
- `create({employeeId, kind, fromValue, toValue, effectiveDate, reason})` — admin only

**termination**
- `list, get, create, update, finalize, completeDevolution` — admin

#### `kanban.ts` — Kanban com RBAC por board

**boards**
- `list` — boards do user (visibility filter)
- `get({id})` — checa role no board, retorna `viewerRole`
- `create({name, description, color, visibility, departmentId?})`
- `update, archive, restore, deleteHard, listArchived` — admin role no board
- `listMembers, listUserCandidates, addMember, removeMember` — admin role

**lists** (`editor` role)
- `listByBoard, create, update, archive, reorder` — editor
- `restore, deleteHard` — admin

**cards**
- `listAcrossUserBoards` — cross-board feed
- `listByBoard` — com labels, assignees, checklist counts
- `get, create, update, archive, move, setAssignees (max 20), setLabels (max 20)` — editor
- `restore, deleteHard` — admin
- `setAssignees` dispara `notifyKanbanCardAssignment` (DB notification + WebSocket + email Resend)

**labels** (`editor`)
- `listByBoard, create, update, delete (admin)`

**checklist** (`editor`)
- `create, update, delete`

**comments** (`editor`)
- `list, create` (notifica assignees + autor anterior por email), `delete` (author or admin)

**attachments** (`editor`)
- `list, register, delete`

#### `timesheet.ts` — ponto + horas extras

- `clockIn({location, notes, selfieUrl, deviceFingerprint})` — bloqueia se há ponto aberto, avalia geofence via `settings.company.geofence_*`
- `clockOut({notes})` — calcula `hoursWorked`, avalia via `evaluateClockRecord(rule)`, cria `overtime_records` se aplicável, alimenta `time_bank` se enabled
- `getOpenRecord, listRecords, monthlySummary` — query
- `requestOvertime` — manual overtime request
- `listOvertimeRequests, approveOvertime (manager), preauthorizeOvertime (manager), listAuthorizations` — gestão OT
- `bulkApprove({recordIds, approve}) (manager)` — max 500 records
- `report` — espelho relatorial avaliando cada record
- `evaluate` — dry-run de schedule evaluation
- `overtimeStats` — mensais por employee

#### `compliance-portaria.ts` — Portaria MTP 671/2021

- `list` — exports históricos
- `generateAfd(start, end) (admin)` — Arquivo de Frequência Digital
- `generateAfdt(start, end) (admin)` — AFD Terceirizados (com status approval)
- `generateAcjef(start, end) (admin)` — Arquivo Consolidado de Jornada, Folha Resumida
- `verifyChain` — valida integridade hash chain do `time_records.recordHash`

Todos geram `compliance_exports` com `fileSha256` + `fileBytes`.

#### `compliance-lgpd.ts` — LGPD

- `myConsents` — consents do user
- `hasActiveConsent({type})` — boolean
- `accept({consentType, version, legalBasis, notes})` — grava com IP/UA
- `revoke({consentType})` — marca revokedAt
- `readAuditLogs (admin)` — leituras sensíveis

#### `digital-signature.ts` — assinatura digital

- `sign({documentId, cpf, signerName, signatureMethod})` — PIN/BIOMETRIC/CERTIFICATE. Colaborador só assina próprios docs.
- `validate, getSignatures, getStatus` — query
- `exportCertificate (admin)` — cert

#### `inbox.ts` — caixa de entrada unificada

- `feed({status?, kind?, scope: mine|team|all})` — escopo automático por role
- `get({id})` — scope check
- `create({kind, ...})` — qualquer user
- `decide({requestId, decision, reason}) (manager)` — grava approval + atualiza status request
- `cancel({id})` — autor ou admin
- `counts({scope})` — pendências

#### `payroll.ts` + `payslip.ts`

- `payroll.summary (manager)` — folha mensal agregada
- `payroll.employeePayslip` — admin/gestor/próprio
- `payslip.generatePdf` — jsPDF, retorna base64
- `payslip.calculate` — só números, sem PDF

#### `labor-calc.ts` — cálculos CLT

- `decimoTerceiro({hireDate, salary, ...})` — 13º proporcional
- `feriasProporcionais({...})` — férias proporcionais
- `rescisao({...})` — verbas rescisórias (5 tipos de rescisão)

#### `audit.ts` + `audit-cpf.ts`

- `audit.list, getByResource, getByUser, summary` — paginados, filtros
- `auditCpf.getByCpf, getMyHistory, getStatsByCpf (admin), exportByCpf (admin)`

#### `auth-rbac.ts` — users CRUD

- `login, register (admin), changePassword, listUsers (admin), updateUserRole (admin), me`
- Whitelist de emails em `ALLOWED_REGISTER_EMAILS` env var (default: 5 emails @mlservicoseco.com.br)

#### `departments.ts`

- `list` — com hierarquia
- `create, update, delete (admin)` — name, parentId, headEmployee, costCenter, active

#### `recruitment.ts`

- `jobOpenings.list, get, create, update`
- `candidates.list, get, create, update` — stage pipeline

#### `lookup.ts` — Brasil API

- `cep({cep})`, `cnpj({cnpj})`, `holidays({year})`, `states`, `cities({uf})`

#### `integrations.ts`

- `fetchAddressByCEP, validateCNPJ, validateCPF, sendEmail, registerWebhook, unregisterWebhook, listWebhooks`

#### `ai.ts`

- `parseResume({pdfBase64})` — max 8MB, extrai info de candidato via LLM
- `generateJobDescription({title, level, requirements})` — gera descrição

#### `reports.ts` (manager+)

- `timesheetReport, vacationReport, absenceReport, employeeStats, summary` — mensal/anual

#### `compliance.ts` (general)

- `generateReport({companyName})` — agrega PGR/PCMSO/ASO/treinamento status
- `downloadPDF` — PDF base64

#### `systemRouter.ts`

- `health` — DB ping
- `metrics` — basic counters

---

## 6. Endpoints HTTP não-tRPC

Em `server/_core/app.ts`:

| Método | Rota | Auth | Limites | Função |
|---|---|---|---|---|
| POST | `/api/upload-evidence` | admin (via SDK) | 4 MB, content-type allowlist (pdf/jpeg/png/webp/heic) | Upload de evidência admission v2. Salva em `admission/{timestamp}-{name}` com `access: "private"`. Retorna `{url, pathname, contentType, size}`. |
| POST | `/api/upload-attachment?cardId=N` | autenticado | 4 MB, allowlist + xlsx/docx/csv/zip/txt | Upload anexo kanban. Salva em `kanban/card-{id}/{timestamp}-{name}`, private. |
| GET | `/api/blob/proxy?url=<canonical>` | autenticado | rate-limit global | Streama blob privado. Valida host `*.blob.vercel-storage.com`, chama `head()` para downloadUrl assinado, segue upstream. Define `Content-Type` + `Content-Disposition: inline`. |
| GET | `/api/health` | público | — | `{status: "ok", timestamp}` |
| WS | `/api/ws?userId=N` | userId required | ping/pong 30s | WebSocket notificações. Sem auth fortaleza (relies on URL) — gap conhecido. |
| GET/POST | `/api/oauth/*` | público | — | Fluxo OAuth Manus (só se `OAUTH_SERVER_URL` setado) |

**Rate limits:**
- Global `/api/*`: `RATE_LIMIT_MAX` (default 300/min)
- Auth `/api/trpc/auth.(login|register)`: `AUTH_RATE_LIMIT_MAX` (default 10/min)
- `/api/ws` skipped do limiter

**Helmet CSP (production):**
```
default-src 'self'
script-src 'self'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https:
connect-src 'self' wss: https:
font-src 'self' data:
object-src 'none'
frame-ancestors 'none'
```

---

## 7. Frontend React (42 páginas)

Todas lazy via `lazy(() => import(...))`. Suspense fallback = spinner. Guards: `AdminGuard`, `ManagerGuard`.

### 7.1 Dashboard & navegação

| Rota | Página | Role | Função |
|---|---|---|---|
| `/` | `Home` | protected | Dashboard com KPIs (`trpc.dashboard.*`), birthdays, turnover, headcount evolução, pendências por gestor, latência aprovações, banco de horas distribution, tardiness, compliance docs, riscos férias |
| `/login` | `Login` | public | Email + senha. Chama `trpc.auth.login`. Toast erro + redirect |
| `/notificacoes` | `Notifications` | protected | Lista notificações `trpc.notifications.list`, markRead, markAllRead |
| `/privacidade` | `Privacy` | protected | LGPD: lista consents próprios (`trpc.lgpd.myConsents`), accept/revoke |
| `/configuracoes` | `Settings` | admin | KV settings (company.cnpj, company.geofence_lat/lng/radius, etc) |
| `/seguranca-config` | `SecuritySettings` | admin | Config segurança (rate limits, etc) |
| `/404` | `NotFound` | public | Página de erro |

### 7.2 Pessoas

| Rota | Página | Role | Função |
|---|---|---|---|
| `/funcionarios` | `Employees` | manager | Lista paginada (search), data masking aplicado, link para detalhe, bulk import CSV (dry-run validação) |
| `/funcionarios/:id` | `EmployeeDetail` | manager | Detalhe completo: dados pessoais, contratos, férias, ASO, treinamentos, EPIs, documentos, banco de horas, histórico de cargos, gestores |
| `/usuarios` | `UserManagement` | admin | CRUD users + roles via `trpc.users.*` |
| `/hierarquia` | `UserHierarchy` | admin | Visualização hierárquica (departments + managers) |
| `/cargos` | `Positions` | admin | CRUD cargos (title, CBO, salary, hazard) |
| `/departamentos` | `Departments` | admin | CRUD departamentos (parent hierarchy, head, cost center) |

### 7.3 Lifecycle (Admission / Movement / Termination)

| Rota | Página | Role | Função |
|---|---|---|---|
| `/admissao` | `AdmissionList` | admin | Lista workflows (filter status), botão "Nova admissão" |
| `/admissao/:id` | `AdmissionDetail` | admin | **Centro do admission v2.** Dados básicos do candidato + checklist v2 com 16 itens. Cada item: badge status + botões Anexar / Assinar / Gerar documento / Revisar / Dispensar. Modais: waive (com reason), review (approve/reject/notes), attach (URL ou upload), sign (signatoryType + method). Finalize vincula a employee. Gates de finalização: req items completos OU dispensados, signatures, reviews. |
| `/desligamento` | `TerminationList` | admin | Lista terminations (filter status) |
| `/desligamento/:id` | `TerminationDetail` | admin | Detalhe termination: dados, devolução equipamentos, cálculo verbas, finalize |
| `/inbox` | `Inbox` | protected | Feed unificado: mine/team/all (auto por role). Filtros: status, kind. Decide aprovação (manager+). Cancel (autor) |
| `/recrutamento` | `Recruitment` | manager | Job openings + candidatos. Pipeline stages drag |

### 7.4 Jornada & ponto

| Rota | Página | Role | Função |
|---|---|---|---|
| `/ponto` | `Timesheet` | protected | Bater ponto (clockIn/Out com geolocation + selfie + device fingerprint). Lista records mês. Pode requestOvertime |
| `/horas-extras` | `OvertimeManagement` | protected | Pré-autorizar overtime (manager), aprovar/rejeitar pendentes, bulk approve |
| `/banco-horas` | `TimeBank` | protected | Lista entries banco de horas (própria ou subordinados). Expiring alerts |
| `/ferias` | `Vacations` | protected | Lista férias + período aquisitivo, gozo, pecúnia, scheduling |
| `/jornada-admin` | `JourneyAdmin` | manager | Admin de jornadas: schedule rules por contrato, geofence, tolerâncias |
| `/compliance-jornada` | `CompliancePortaria` | admin | Gerar AFD/AFDT/ACJEF. Verify hash chain. Lista exports |

### 7.5 Saúde, segurança & benefícios

| Rota | Página | Role | Função |
|---|---|---|---|
| `/saude` | `SafetyHealth` | manager | 3 tabs: EPIs (delivery/return + signature status + CA), Ordens de Serviço (risk level + NR), Treinamentos (name/date/expiry/instructor). Expiry alerts |
| `/avaliacoes` | `ProfessionalAssessment` | manager | Lista employees + botão "Avaliar" (formulário PDI parcialmente implementado, placeholder) |

**`AdminRecursos`** (existe mas sem rota mapeada em App.tsx — verificar se órfão):
- 9 tabs por employee: Cargos, Férias, Licenças, Benefícios, Equipamentos, Empréstimos, Feriados, Dependentes, Ausências
- CRUD completo + bulk operations + sorting + persistent state
- Holiday Brasil API integration, dependent IR deduction tracking

### 7.6 Documentos

| Rota | Página | Role | Função |
|---|---|---|---|
| `/documentos` | `Documents` | manager | GED: lista docs por employee/category. Upload (base64) |
| `/templates` | `DocumentTemplates` | admin | CRUD templates HTML com placeholders |
| `/gerador` | `DocumentGenerator` | admin | Renderiza template + employee → HTML/PDF |
| `/assinar-contratos` | `SignContracts` | admin | Lista contratos pendentes assinatura. Abre via `/api/blob/proxy`. Assinatura via `trpc.digitalSignature.sign` |
| `/assinar-asos` | `SignASOs` | admin | Mesma UX para ASOs |
| `/auditoria-assinaturas` | `SignatureAudit` | admin | Histórico de assinaturas com hashes e validação |

### 7.7 Folha & cálculo

| Rota | Página | Role | Função |
|---|---|---|---|
| `/folha` | `Payroll` | admin | Folha mensal agregada. Filtros mês/ano/depto |
| `/holerite` | `Payslip` | protected | Gera holerite PDF (jsPDF). Próprio ou admin/gestor para terceiros |
| `/calculadoras` | `Calculators` | protected | Calculadoras: rescisão, 13º, férias proporcionais (`trpc.laborCalc.*`) |

### 7.8 Kanban (fase 8 + 10.x)

| Rota | Página | Role | Função |
|---|---|---|---|
| `/kanban` | `KanbanBoards` | protected | Lista boards do user (`listBoardsForUser`). Filtros visibility. Create board. **Em fase 10.4 mergeada:** filtros globais (responsável/cliente/data) + calendar cross-board (atualmente removido pelo rollback) |
| `/kanban/:id` | `KanbanBoard` | protected | Board com lists + cards drag-and-drop (@dnd-kit). Card detail drawer (CardDetailDrawer): description, checklist, assignees, labels, comments, attachments via `/api/blob/proxy`. Card inline expanded (CardInlineExpanded). Lixeira admin (fase 10.3.2). |

### 7.9 Relatórios & auditoria

| Rota | Página | Role | Função |
|---|---|---|---|
| `/relatorios` | `Reports` | manager | Gera relatórios PDF (Conformidade, PGR, PCMSO, Treinamentos) via DOCX-to-base64 |
| `/auditoria` | `Audit` | admin | audit_logs paginado. Filtros recurso/ação (CREATE/UPDATE/DELETE/READ)/CPF/data. Expandable rows com diff before/after JSON |
| `/auditoria-assinaturas` | `SignatureAudit` | admin | Query CPF formatado, filter status (valid/invalid), export CSV, stats dashboard |
| `/auditoria-geral` | `AuditoriaGeral` (não rotada em App.tsx) | admin | Dual-panel: por resource+ID OU por CPF, JSON raw |
| `/analytics` | `PeopleAnalytics` | manager | 5 tabs (overview KPIs, turnover, diversity, costs, custom). 10+ chart types via recharts |
| `/integracao` | `Integration` | admin | Status integrations (Google Calendar, Slack, SendGrid, Sólides, Gov.br) — display only, placeholder |

### 7.10 Pages órfãs / utilitárias

- **`ComponentShowcase.tsx`** — Sem rota em App.tsx. Browse de todos shadcn/ui (buttons, forms, tables, modals). Public, demo only.
- **`AdminRecursos.tsx`** — Existe mas sem rota mapeada em App.tsx atual. Confirmar se é dead code ou rota perdida.

### 7.10 Componentes globais

- **`NotificationBell`** — bell no header. Conecta `/api/ws?userId=N`. Toast em notificação nova.
- **`NotificationToast`** — toast renderer
- **`ConsentBanner`** — LGPD opt-in (`trpc.lgpd.accept` data_processing)
- **`ThemeProvider`** — light/dark mode
- **`ErrorBoundary`** — captura erros React

### 7.11 Patterns frontend

- **tRPC client** (`client/src/lib/trpc.ts`): `createTRPCReact<AppRouter>`, superjson transformer, batch link, `credentials: include`
- **TanStack Query** integrado (cache, invalidate, refetch)
- **Form** via `react-hook-form` + `@hookform/resolvers` + Zod
- **Toast** via `sonner`
- **Date** via `date-fns`
- **Charts** via `recharts`
- **DnD** via `@dnd-kit/*`

---

## 8. Autenticação, RBAC e contexto

### 8.1 Fluxo de login local

```
1. POST /api/trpc/auth.login
   body: { email, password }
2. modules/auth/auth-service.login:
   - db.getUser(email)
   - bcrypt.compare(password, user.passwordHash)
   - jwt.sign({userId, email, role}) ← 7d expiry, JWT_SECRET (32+ chars)
3. setSessionCookie(token):
   - Name: COOKIE_NAME (shared/const.ts)
   - httpOnly + Secure (prod) + SameSite + 7d
4. db.recordLoginLog({userId, success, ipAddress, userAgent})
5. Response: { token, user }
```

Next-request flow:
```
1. createContext (server/_core/context.ts) chama sdk.authenticateRequest(req)
2. parseCookies → busca COOKIE_NAME
3. verifyLocalJwt(token) → payload { userId, email, role }
4. db.getUserById(payload.userId) → User
5. ctx.user = User (ou null se falha)
```

OAuth Manus (fallback, opcional):
- Habilita só se `OAUTH_SERVER_URL` env setado
- `/api/oauth/callback` → exchange code → jose SignJWT cookie
- `verifySession` valida cookie jose com `cookieSecret`

### 8.2 Roles

| Role | Procedure mínima | Scope |
|---|---|---|
| `admin` | `adminProcedure` | Tudo |
| `gestor` | `managerProcedure` | Próprios + subordinados recursivos |
| `colaborador` | `protectedProcedure` (com scope check) | Próprio |
| `user` | `protectedProcedure` | Próprio (sinônimo legado) |

### 8.3 Whitelist de registro

Defaults em `auth-service.ts`:
```
ALLOWED_REGISTER_EMAILS = [
  adm@mlservicoseco.com.br,
  mayk.lopes@mlservicoseco.com.br,
  ediani@mlservicoseco.com.br,
  operacao@mlservicoseco.com.br,
  comercial@mlservicoseco.com.br
]
```
Override via env `ALLOWED_REGISTER_EMAILS=email1,email2,...`.

Emails na whitelist → role `admin` automaticamente.
Outros emails → role `colaborador` (mas só funciona se whitelist permitir email).

### 8.4 Password strength

`jwt-service.validatePasswordStrength`:
- min 8 chars
- 1 maiúscula, 1 minúscula, 1 dígito, 1 especial (`!@#$%^&*()_+-=[]{};':"\\|,.<>/?`)

### 8.5 Cookies

`server/_core/cookies.ts`:
- `httpOnly: true`
- `secure: production`
- `sameSite: lax`
- `maxAge: 7d`

---

## 9. Fluxos críticos de negócio

### 9.1 Admissão V2 (fase 9.x + 10.5)

```
1. ADMIN cria workflow
   trpc.lifecycle.admission.create({candidateName, candidateCpf, ...})
   ↓ se ADMISSION_V2_ENABLED:
   db.createAdmissionWorkflow({...data, catalogVersion: "v1.0"})
   instantiateCatalogForWorkflow(workflowId, "v1.0")
     ↓ insere 16 admissionChecklistItems com policies do catalog

2. Para cada item, ADMIN executa ação:
   - kind=upload_required → trpc.lifecycle.admission.attachEvidenceUrl
     OU POST /api/upload-evidence (file binary) → URL → attachEvidenceUrl
   - kind=generate_document → trpc.lifecycle.admission.generateDocument
     ↓ renderTemplate(templateKey, workflow) gera HTML com placeholders
     ↓ put(blob, html, access:"private") → URL
     ↓ createDocumentRecord({isPrimaryEvidence: true})
   - kind=manual_validation → trpc.lifecycle.admission.reviewChecklistItem
     ↓ marca reviewStatus = approved
   - kind=training_or_ack → upload do certificado
   
3. Após attach/sign/review:
   persistComputedStatus(item)
   ↓ recomputeItemStatus avalia documentPolicy, signaturePolicy, reviewPolicy
   ↓ retorna: PENDING | AWAITING_EVIDENCE | AWAITING_SIGNATURE | UNDER_REVIEW | COMPLETED | WAIVED

4. ADMIN pode dispensar item:
   trpc.lifecycle.admission.waiveChecklistItem({reason})
   ↓ canWaiveChecklistItem(workflow, item) consulta catalog.waivable
   ↓ status = WAIVED, waivedReason gravado

5. ADMIN finaliza:
   trpc.lifecycle.admission.finalize({id, employeeId})
   ↓ validateFinalizationGates(workflowId):
     - todos required items COMPLETED ou WAIVED
     - signatures conforme policy
     - reviews approved
   ↓ se passed: workflow.status = APPROVED → ACTIVE
   ↓ workflow.resultEmployeeId = employeeId
   ↓ syncMirror(workflowId): espelha items COMPLETED/WAIVED em checklistItems v1
   ↓ workflow.syncStatus = SYNCED
```

### 9.2 Ponto eletrônico + Portaria 671

```
1. COLABORADOR bate entrada:
   trpc.timesheet.clockIn({location, selfieUrl, deviceFingerprint})
   ↓ checa se há ponto aberto (CONFLICT se sim)
   ↓ evaluateGeofence(location, settings.company.geofence_*) → within|outside|no_geo
   ↓ db.createTimeRecord({...}) gera nsr sequencial + recordHash SHA-256

2. COLABORADOR bate saída:
   trpc.timesheet.clockOut({notes})
   ↓ getActiveScheduleRule(employeeId) busca contract.scheduleType
   ↓ evaluateClockRecord({clockIn, clockOut, rule}):
     - expectedMinutes vs workedMinutes
     - delayMinutes (com tolerance)
     - overtime: type50 (diurno), type100 (dom+feriado), typeNight (22-05h, 20%)
     - hourBank credit/debit (se enabled)
   ↓ updateTimeRecord:
     - hoursWorked, status (APPROVED ou PENDING se atraso)
     - cria overtime_records se aplicável
     - alimenta time_bank entry se enabled

3. ADMIN gera AFD mensal:
   trpc.compliancePortaria.generateAfd(start, end)
   ↓ db.listAllTimeRecords(start, end)
   ↓ buildAfd(header, records) → texto formato Portaria 671
   ↓ sha256OfText(text) → fileSha256
   ↓ db.recordComplianceExport({type: AFD, periodStart, periodEnd, fileSha256, fileBytes})
   ↓ Response { content, sha256, bytes, records }

4. Verify hash chain:
   trpc.compliancePortaria.verifyChain
   ↓ recomputa hash chain (previousHash + record data) → SHA-256
   ↓ reporta NSRs com hash inválido
```

### 9.3 Kanban com RBAC por board

```
1. USER cria board:
   trpc.kanban.boards.create({name, visibility: private|team|public, departmentId?})
   ↓ db: kanban_boards + auto kanban_board_members (ownerId, role: admin)
   
2. Quando outro user acessa:
   assertAccess(userId, role, boardId, minRole):
     - kdb.getUserBoardRole(userId, boardId, userRole) consulta members
     - visibility public: viewer | private: deve ser member | team: depto match
     - ranks: admin > editor > viewer
   ↓ FORBIDDEN se rank < minRole

3. EDITOR cria card:
   trpc.kanban.cards.create({listId, title, ...}) → assertAccess editor
   
4. EDITOR atribui:
   trpc.kanban.cards.setAssignees({cardId, userIds})
   ↓ kanban_card_assignees insert
   ↓ notifyKanbanCardAssignment(userId, cardTitle, boardName, dueDate):
     - db.createNotification (persistente)
     - broadcastNotification (WebSocket /api/ws)
     - sendEmail via Resend (template HTML)

5. Usuário comenta:
   trpc.kanban.comments.create({cardId, body})
   ↓ kanban_card_comments insert
   ↓ notifyKanbanCardComment para todos assignees (exceto autor)

6. Anexo:
   POST /api/upload-attachment?cardId=N (binary, 4MB max)
   ↓ blob.put(`kanban/card-${cardId}/{timestamp}-{name}`, access:"private")
   ↓ trpc.kanban.attachments.register({cardId, fileName, fileUrl, ...})
   ↓ kanban_card_attachments insert
   ↓ Frontend renderiza link: /api/blob/proxy?url={encodedFileUrl}

7. Daily scheduler:
   notification-scheduler.runNotificationScan (interval 24h):
     - Cards com dueDate ≤ hoje + 3 dias → notifyKanbanCardDeadline
     - ASOs expirando ≤ 30 dias → notifyOnce ("ASO Expira")
     - Férias com concessionLimit ≤ 60 dias → notifyOnce
     - Banco de horas expirando ≤ 30 dias → notifyOnce
```

### 9.4 Assinatura digital + chain of trust

```
1. ADMIN cria documento (contrato CLT gerado ou upload manual)
   → documents row, fileUrl, isPrimaryEvidence

2. ADMIN inicia assinatura:
   trpc.digitalSignature.sign({documentId, cpf, signerName, signatureMethod})
   ↓ digital_signatures insert:
     - documentHash (SHA-256 do conteúdo)
     - signatureHash (PIN/cert/biometria)
     - signatureMethod, signerEmail, ipAddress, userAgent
   ↓ document_signatures insert (alta-nível: signatoryType employee/company_rep)

3. Validate:
   trpc.digitalSignature.validate({documentId})
   ↓ checa documentHash atual = stored hash
   ↓ isValid = true|false

4. Admission V2 — signEvidence:
   trpc.lifecycle.admission.signEvidence({workflowId, itemId, signatoryType})
   ↓ addSignature({documentId, signatoryType, signatureMethod, ipAddress})
   ↓ persistComputedStatus(refreshedItem)
   ↓ Se signaturePolicy="both_required" e ambas signatures → status COMPLETED
```

### 9.5 LGPD compliance flow

```
1. Login → ConsentBanner aparece se hasActiveConsent("data_processing") false
2. User aceita:
   trpc.lgpd.accept({consentType: "data_processing", version: "1.0", legalBasis: "consentimento"})
   ↓ consent_records insert com IP/UA

3. ADMIN lê dados de funcionário X (X ≠ ADMIN):
   trpc.employees.get({id: X})
   ↓ assertEmployeeInScope passa (admin pode tudo)
   ↓ recordReadAudit({actorUserId, resource: "employees", field: "detail",
                       targetEmployeeId: X, scope: "all", ipAddress})
   ↓ read_audit_logs row inserida
   ↓ Audit visível em /privacidade ou trpc.lgpd.readAuditLogs (admin)

4. User revoga consent:
   trpc.lgpd.revoke({consentType})
   ↓ revokedAt = now
   ↓ ConsentBanner reapareceria
```

### 9.6 Upload de arquivo (admission + kanban)

```
Cliente (admin):
  fetch(`/api/upload-evidence?filename=${name}`, {
    method: POST,
    headers: {"Content-Type": "application/pdf"},
    body: fileBytes,
    credentials: "include"
  })

Servidor:
1. authenticateRequest(req) → user
   401 se não autenticado / 403 se !admin
2. Valida content-type contra ALLOWED_UPLOAD_TYPES (5 tipos)
   415 se outro
3. Valida size ≤ 4 MB
   413 se exceder
4. pathname = `admission/${Date.now()}-${safeName}`
   safeName: regex strip non-alphanumeric, slice 200
5. put(pathname, body, {
     access: "private",
     contentType,
     addRandomSuffix: false
   })
6. Response: {url, pathname, contentType, size}

Posteriormente o frontend trata fileUrl via proxy:
  href = `/api/blob/proxy?url=${encodeURIComponent(fileUrl)}`

Proxy:
1. authenticateRequest → 401 se não logado
2. Valida host endsWith ".blob.vercel-storage.com" → 400 se externo
3. head(url) → meta.downloadUrl (signed)
4. fetch(downloadUrl, {Authorization: Bearer BLOB_READ_WRITE_TOKEN})
5. Streama upstream.body para res
6. Headers: Content-Type, Content-Disposition: inline; filename=
```

---

## 10. Integrações externas

| Serviço | Uso | Env vars | Notas |
|---|---|---|---|
| **TiDB Cloud Serverless** | DB principal | `DATABASE_URL` | TLS obrigatório. Pool mysql2 com TLSv1.2+. `connectionLimit: DB_POOL_LIMIT (default 4)`. `withDBRetry` para flaky connects. |
| **Vercel Blob** | Upload evidências admission + anexos kanban + docs gerados | `BLOB_READ_WRITE_TOKEN` | `access: "private"` desde fase 10.5a. Proxy autenticado para evitar URLs vazadas. |
| **Resend** | Email transacional (kanban assignment, comments, deadlines) | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` | Defaults: `noreply@mlservicoseco.com.br` / `adm@mlservicoseco.com.br`. Templates HTML inline. |
| **Brasil API** | CEP, CNPJ, feriados, IBGE | — (público) | `server/integrations/brasil-api.ts`. Usado em `lookup` router + `holidays.importYear`. |
| **ReceitaWS** | Fallback CNPJ | — (público) | Acionado se Brasil API falhar (hotfix #11). User-Agent custom. |
| **gov.br** | Assinatura digital | `GOVBR_*` (se ativo) | `digitalSignatureRouter`. Suporta PIN/BIOMETRIC/CERTIFICATE. |
| **OAuth Manus** | Login externo opcional | `OAUTH_SERVER_URL`, `VITE_APP_ID`, `OWNER_OPEN_ID`, `COOKIE_SECRET` | Desabilitado se `OAUTH_SERVER_URL` vazio. Local JWT é o default. |
| **AWS S3 (legado)** | Storage antigo | `AWS_REGION`, `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Substituído por Vercel Blob mas import `@aws-sdk/client-s3` ainda no package.json. Pode ser removido. |
| **Vercel (deploy)** | PaaS prod + preview | — | `api/` serverless entrypoint. Cache de build. |

---

## 11. Segurança e compliance

### 11.1 Defesas implementadas

| Categoria | Implementação | Local |
|---|---|---|
| **JWT** | jsonwebtoken HS256, secret 32+ chars, 7d expiry | `auth/jwt-service.ts` |
| **Password hash** | bcryptjs, 12 salt rounds | `auth/jwt-service.ts` |
| **Password strength** | min 8, A-Z, a-z, 0-9, especial | `validatePasswordStrength` |
| **Cookies** | httpOnly, Secure (prod), SameSite Lax, 7d | `_core/cookies.ts` |
| **Helmet CSP** | default-src 'self', script-src 'self', frame-ancestors 'none' | `_core/app.ts` (production only) |
| **CORS** | Whitelist via `CORS_ORIGINS` env (comma-sep) | `_core/app.ts` |
| **Rate limit global** | `RATE_LIMIT_MAX/WINDOW_MS` (default 300/min) | `_core/app.ts` |
| **Rate limit auth** | `AUTH_RATE_LIMIT_MAX/WINDOW_MS` (default 10/min) | `_core/app.ts` regex `/api/trpc/auth.(login|register)/` |
| **Upload size** | 4 MB hard cap (Vercel serverless ~4.5 MB max body) | `UPLOAD_MAX_BYTES` |
| **Upload allowlist** | 5 content-types (pdf, jpeg, png, webp, heic) para evidence; +xlsx/docx/csv/zip/txt para attachments | `ALLOWED_UPLOAD_TYPES` + `ATTACHMENT_ALLOWED_TYPES` |
| **Blob private** | `access: "private"` em todos os uploads (PR #16) | `app.ts` |
| **Blob proxy** | autenticado, valida host, streama via `head()` downloadUrl | `/api/blob/proxy` |
| **RBAC** | publicProcedure / protectedProcedure / managerProcedure / adminProcedure | `_core/trpc.ts` |
| **Scope** | assertEmployeeInScope (admin/self/subordinates) | `utils/scope.ts` |
| **Data masking** | CPF/RG/email/phone/endereço/banco por viewer role | `utils/data-masking.ts` |
| **Audit logging** | toda mutation logada (action, resource, IP, UA) | `trpc.ts` middleware + `audit-middleware.ts` |
| **Read audit** | leitura sensível (admin > target ≠ self) logada | `read_audit_logs` |
| **LGPD consent** | tipos de consent + base legal | `consent_records` |
| **Login logs** | sucesso + falha + IP + UA + reason | `login_logs` |
| **Whitelist register** | emails autorizados a criar conta admin | `ALLOWED_REGISTER_EMAILS` |
| **Antifraude ponto** | geofence + selfie + device fingerprint (fase 7) | `time_records` |
| **REP-P chain** | SHA-256 hash encadeado em `time_records` (NSR + previousHash + recordHash) | `time_records` + `verifyChain` |
| **Portaria 671** | AFD/AFDT/ACJEF com fileSha256 + fileBytes | `compliance_exports` |
| **One-time signatures** | INSERT bloqueado se já existe (documentId, signatoryType) | `signatures.service.ts` |

### 11.2 Categorização LGPD (artigos relevantes)

- **Art. 7º (Bases legais):** `consent_records.legalBasis` com 6 opções
- **Art. 8º (Consentimento explícito):** `consent_records.acceptedAt`, `revokedAt`, `version`
- **Art. 18 (Direitos do titular):** página `/privacidade` permite consultar e revogar
- **Art. 37 (Registro de operações):** `audit_logs` + `read_audit_logs`
- **Art. 46 (Segurança):** TLS, criptografia bcrypt, RBAC, mascaramento
- **Art. 50 (Termos de uso):** consent types capturam aceite de políticas internas

### 11.3 Conformidades

- ✅ **CLT** — contratos, jornada (5x2, 6x1, 12x36, intermitente), férias, 13º
- ✅ **Portaria MTP 671/2021** — REP-P (registro eletrônico programa), AFD/AFDT/ACJEF, hash chain
- ✅ **LGPD (Lei 13.709/2018)** — consent, audit, mascaramento, direito de revogação
- ✅ **Lei 7.418/85 (VT)** — termo de opção
- ✅ **NR-1, NR-6** — Ordem de Serviço, EPIs com CA, PCMSO, PGR
- ✅ **e-Social** — campo `esocialMatricula` em employees (preparado, integração pendente)

### 11.4 Gaps a auditar (do `/security-review`)

| # | Severidade | Local | Item |
|---|---|---|---|
| 1 | MEDIUM | `template-render.service.ts:85` | XSS via placeholders não-escapados (`{{candidateName}}`) renderiza JS no doc gerado, executado quando outro user abre link |
| 2 | MEDIUM | `/api/ws` | Auth fraca: aceita qualquer `userId` query param sem validar token. Anyone pode se passar por outro user |
| 3 | LOW | Schema TS vs DB | `signatoryType` length 40 no TS mas DB ainda 20 (migration faltando) |
| 4 | LOW | `.codex-*.log` na raiz | Pode conter credenciais. Gitignorar e limpar |
| 5 | LOW | Helmet CSP | `style-src: 'unsafe-inline'` por causa de Tailwind/Radix; OK mas validar |

### 11.5 Sem cobertura ainda

- CSRF protection (tRPC sobre cookie session sem token CSRF explícito — depende de SameSite)
- 2FA / MFA
- Detecção de brute-force além de rate limit (lockout temporário)
- Secrets rotation policy
- Cifragem em repouso de campos sensíveis (PII, salário) — atualmente em texto no DB
- Backup automatizado de prod (apenas snapshots TiDB manuais)
- E2E tests (Playwright)
- Penetration test externo

---

## 12. Notificações e tempo real

### 12.1 Sistema de notificação

Três camadas:
1. **Persistente** — `notifications` table, lida via `trpc.notifications.list` (`NotificationBell` component)
2. **WebSocket** — push real-time para client conectado em `/api/ws?userId=N`
3. **Email** — Resend para eventos kanban (assignment, comment, deadline)

### 12.2 Broadcasts (`_core/notification-events.ts`)

| Função | Trigger | Canais |
|---|---|---|
| `notifyOvertimeApproval(userId, ...)` | manager aprova OT | DB + WS |
| `notifyVacationApproval(userId, ...)` | manager aprova férias | DB + WS |
| `notifyJobApproval(deptId, ...)` | aprovação de vaga | WS por depto |
| `notifyAdminAlert(...)` | alerta crítico | WS para todos admins |
| `notifyManagerAlert(...)` | alerta gestores | WS para todos gestores |
| `notifyKanbanCardAssignment` | setAssignees em card | DB + WS + Email |
| `notifyKanbanCardComment` | comentário novo | DB + WS + Email (assignees) |
| `notifyKanbanCardDeadline` | scheduler diário, dueDate ≤ 3 dias | DB + WS + Email |

### 12.3 Daily scheduler (`_core/notification-scheduler.ts`)

- Setinterval 24h (no boot do server)
- Para cada employee/card:
  - Férias com concessionLimit ≤ 60 dias → `notifyOnce(Férias, ...)`
  - ASO com expiryDate ≤ 30 dias → `notifyOnce(ASO)`
  - Banco de horas com expiryDate ≤ 30 dias → `notifyOnce(Banco de Horas)`
  - Kanban cards com dueDate ≤ 3 dias → `notifyKanbanCardDeadline`
- `alreadyNotified` checa duplicação (type + relatedEmployeeId + dueDate)

### 12.4 WebSocket details (`_core/websocket.ts`)

- Path: `/api/ws`
- Query: `?userId=N` (sem validação de token — gap)
- Ping/pong 30s
- Map de `userId → ClientConnection`
- `broadcastNotification(payload)` → DB persist + WS send (se cliente conectado)
- `broadcastToRole(role)` → todos users do role
- `broadcastToDepartment(deptId)` → todos do depto

---

## 13. Migrations e estado do banco

28 migrations em `drizzle/*.sql`:

| # | Arquivo | Função |
|---|---|---|
| 0000 | `thick_captain_america` | Setup inicial: users, employees, contracts |
| 0001 | `motionless_captain_universe` | Permissions matrix |
| 0002 | `orange_komodo` | Departments + positions |
| 0003 | `gifted_spot` | Documents + medical_exams + leaves |
| 0004 | `tiresome_whirlwind` | Vacations + vacation_periods |
| 0005 | `great_valeria_richards` | Time bank + benefits |
| 0006 | `workable_quasimodo` | Trainings + equipment |
| 0007 | `medical_serpent_society` | PPE deliveries + service orders |
| 0008 | `whole_beast` | Settings + dashboard_settings |
| 0009 | `giant_virginia_dare` | Notifications |
| 0010 | `ambitious_morgan_stark` | Document templates |
| 0011 | `strange_shotgun` | Audit logs |
| 0012 | `careful_banshee` | Login logs |
| 0013 | `lively_orphan` | Hour bank distribution |
| 0014 | `chief_clint_barton` | Holidays |
| 0015 | `lean_power_man` | Dependents + absences |
| 0016 | `dizzy_revanche` | RBAC schema + employee_manager_history |
| 0017 | `overrated_lilith` | Employee_positions |
| 0018 | `bent_sentinels` | Time records + overtime |
| 0019 | `boring_kat_farrell` | Compliance + LGPD (consent_records, read_audit_logs, compliance_exports) |
| 0020 | `eminent_stingray` | Antifraude (geofence, selfie, device fingerprint) |
| 0021 | `mushy_silvermane` | Recruitment (job_openings, candidates) |
| 0022 | `lethal_grey_gargoyle` | Inbox (requests, approvals) |
| 0023 | `mixed_viper` | Terminations + employee_movements |
| 0024 | `onboarding_v2_foundation` | Admission v2: `admission_workflows.catalog_version`, `sync_status`, `admission_checklist_items` |
| 0025 | `notifications_user_id` | `notifications.userId` |
| 0026 | `kanban_comments` | `kanban_card_comments` |
| 0027 | `kanban_attachments` | `kanban_card_attachments` |

**⚠️ Pendência:** PR #17 (fase 10.5b) altera `document_signatures.signatoryType` 20 → 40 caracteres no schema TS, **sem migration correspondente**. Precisa rodar:
```sql
ALTER TABLE document_signatures MODIFY COLUMN signatoryType VARCHAR(40) NOT NULL;
```

---

## 14. Feature flags e environment

### 14.1 Feature flags (`server/_core/feature-flags.ts`)

Duas formas de habilitar (logical OR):

**Forma 1** — variável dedicada `<NOME>_ENABLED`:
```bash
ADMISSION_V2_ENABLED=true
```

**Forma 2** — lista em `FEATURE_FLAGS`:
```bash
FEATURE_FLAGS=admission-v2,outra-flag
```

Normalização: nome lower → upper, não-alfanumérico → `_`.

**Flags conhecidas:**
- `admission-v2` — gate da UI v2 do admission. Sem ela: catalog não é instanciado, frontend cai em UI v1 (só checkbox).

### 14.2 Environment variables (`.env.example`)

```bash
NODE_ENV=development
PORT=3000

# Auth
JWT_SECRET=                              # 32+ chars (openssl rand -base64 48)
ALLOWED_REGISTER_EMAILS=email1,email2    # optional override

# Database
DATABASE_URL=mysql://user:pass@host:3306/db

# Cookie (OAuth)
COOKIE_SECRET=

# OAuth (opcional)
OAUTH_SERVER_URL=
VITE_APP_ID=
OWNER_OPEN_ID=

# CORS
CORS_ORIGINS=http://localhost:3000,https://public-self-eight.vercel.app

# Rate limits
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_MAX=10

# Storage S3 (legado)
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=                   # autoinjetado pelo Vercel

# Email Resend
RESEND_API_KEY=
EMAIL_FROM=noreply@mlservicoseco.com.br
EMAIL_REPLY_TO=adm@mlservicoseco.com.br

# Feature flags
ADMISSION_V2_ENABLED=true                # ou FEATURE_FLAGS=admission-v2

# Misc
APP_BASE_URL=https://public-self-eight.vercel.app
DB_POOL_LIMIT=4
```

### 14.3 Vercel env vars (estado em 2026-05-19)

- ✅ `DATABASE_URL` (prod: rh_prime; preview: rh_prime_dev)
- ✅ `BLOB_READ_WRITE_TOKEN` (production, preview, development)
- ✅ `JWT_SECRET`
- ✅ `RESEND_API_KEY`
- ✅ `CORS_ORIGINS`
- ✅ `ADMISSION_V2_ENABLED=true` (production + preview, adicionado hoje)
- ⚠️ Migrations 0024+ status em prod: verificar manualmente

---

## 15. Estado de desenvolvimento

### 15.1 PRs mergeadas (cronologia)

```
#4  hardening — RBAC + lifecycle + inbox + LGPD + analytics + anti-fraude + Portaria (7 fases)
#5  fase 9.1 — modais waive/review com texto livre
#6  fase TLS — pool mysql2 com TLS pra TiDB serverless
#7  fase 9.2 — anexar evidência por URL + assinaturas eletrônicas
#8  fase 9.5 — gates de finalização + sync mirror automático
#9  fase 9.3 — upload nativo de evidências via Vercel Blob
#10 fase 10.1 — sino persistente + email Resend + gatilhos kanban
#11 hotfix CNPJ — User-Agent custom + fallback ReceitaWS
#12 fase 10.2 — card resumido visível
#13 fase 10.3 — comentários + anexos kanban
#14 fase 10.3.2 — card UX expandido + lixeira admin
#15 fase 10.4 — filtros globais + calendar cross-board
#16 fase 10.5a — blob proxy autenticado + uploads private (segurança)
```

### 15.2 Em aberto

- **PR #17** (fase 10.5b) `fase-10.5b-template-gen` — geração de documento via template + fixes (signatoryType length, waivable=true, persistComputedStatus exportado). **Não merged**.
- **Branch local `fase-10.5b-template-gen`** com catalog v1 expandido (16 itens, +9 novos pessoais/trabalhistas/bancários/dependentes/ficha) e template `ficha_cadastral` — alterações **não commitadas**.

### 15.3 Prod hoje

- **Commit ativo no Vercel:** `3RCfP3ePM` → `8a776d5` (PR #14, fase-10.3.2, 15/maio)
- **Rollback aplicado** após problema com PR #16 (flag `ADMISSION_V2_ENABLED` ausente em prod causou UI v2 cair em fallback v1)
- **`main` no GitHub:** `927db11` (PR #16 mergeada) — **divergente da prod**
- **Sem fase 10.4 (filtros/calendar)** e **sem fase 10.5 (proxy/template)** ativos em prod
- **DB prod (`rh_prime`)** com workflows admission antigos com `catalog_version = NULL`

### 15.4 DB dev (`rh_prime_dev`) hoje

- ✅ Wipe completo admission (script `admission-wipe-dev.ts`) — 0 workflows, 0 checklist, 0 docs
- ✅ Seed templates atualizado — 5 templates: `contract_clt`, `term_confidentiality`, `term_vt`, `os_nr1`, `ficha_cadastral`
- ✅ Backup pré-wipe salvo em `backups/rh_prime_dev-2026-05-18T19-26-pre-admission-wipe.json`

### 15.5 Tags de checkpoint

```
checkpoint-pre-admission-resume → 31a15a8 (PR #15, 15-mai 14:34)
checkpoint-pre-fase10.3        → ...
checkpoint-pre-fase10.1
checkpoint-pre-fase9.5
checkpoint-pre-fase9.2
checkpoint-pre-fase9-ui
checkpoint-pre-fase9.1
checkpoint-fase8-completa
checkpoint-pre-fase8
checkpoint-fase7-completa
checkpoint-pre-fase7..pre-fase5
```

Convenção: `pre-faseN` antes de iniciar fase, `faseN-completa` após merge.

### 15.6 Catalog admission v2 atual (após edição local)

16 itens em `server/config/admission-catalog.ts`:

| Categoria | Code | Required | Template | Signature |
|---|---|---|---|---|
| documentacao_pessoal | `ADM_DOC_RG` | optional | — | — |
| documentacao_pessoal | `ADM_DOC_CNH` | optional | — | — |
| documentacao_pessoal | `ADM_DOC_CPF` | required | — | — |
| documentacao_pessoal | `ADM_DOC_RESIDENCIA` | required | — | — |
| documentacao_pessoal | `ADM_DOC_CERT_CIVIL` | required | — | — |
| documentacao_pessoal | `ADM_DOC_TITULO` | required | — | — |
| documentacao_pessoal | `ADM_DOC_RESERVISTA` | optional | — | — |
| documentacao_trabalhista | `ADM_DOC_CTPS` | required | — | — |
| documentacao_trabalhista | `ADM_DOC_PIS` | optional | — | — |
| documentacao_trabalhista | `ADM_CONTRACT_CLT` | required | contract_clt | both_required |
| documentacao_trabalhista | `ADM_TERM_CONFIDENTIALITY` | required | term_confidentiality | both_required |
| saude_seguranca | `ADM_ASO_ADMISSIONAL` | required | — | — |
| saude_seguranca | `ADM_OS_NR1` | required | os_nr1 | employee_required |
| dados_bancarios | `ADM_DADOS_BANCARIOS` | required | — | — |
| beneficios | `ADM_TERM_VT` | optional | term_vt | employee_required |
| dependentes | `ADM_DEPENDENTES` | optional | — | — |
| ficha_cadastral | `ADM_FICHA_CADASTRAL` | required | ficha_cadastral | employee_required |

Todos `waivable: true`.

---

## 16. Backups e disaster recovery

### 16.1 Backups locais (`backups/`)

Gitignored. Mais recentes:

| Data | Arquivo | Conteúdo |
|---|---|---|
| 2026-05-18 | `rh_prime_dev-2026-05-18T19-26-pre-admission-wipe.json` | JSON dump admission_* dev |
| 2026-05-15 | `rh-prime-2026-05-15-0914-pre-fase10.3-mig.sql.gz` | DB inteiro pré-fase 10.3 |
| 2026-05-15 | `rh-prime-2026-05-15-1538-pre-admission-wipe.sql.gz` | Só tabela admission_workflows |
| 2026-05-13 | Vários `pre-tidb-migration` | DB inteiro pré-migração TiDB |
| 2026-05-13 | `pre-fase8-fase9-migrations.sql.gz` | Pré-fase 8/9 |

### 16.2 Scripts de backup

**`scripts/backup-db.ps1`** (Windows PowerShell)
- Parsea `DATABASE_URL` regex
- `mysqldump --single-transaction --quick --no-tablespaces --hex-blob`
- gzip via tar (Windows 10+)
- Retenção: 30 dumps mais recentes
- **Requer mysqldump no PATH** (não presente no ambiente atual de dev)

**`scripts/backup-db.sh`** (bash/POSIX)
- Mesma lógica para Linux/Mac

**`scripts/admission-wipe-dev.ts`** (tsx, criado hoje)
- Dump JSON pré-wipe via mysql2 (SELECT all rows)
- Wipe transacional: signatures → docs → checklist → workflows
- Reset AUTO_INCREMENT
- Verify post-wipe
- Hard fail se DB = prod

### 16.3 TiDB Cloud snapshots

- Console TiDB Cloud → Cluster → Backup tab
- Snapshot manual instantâneo
- Não há cron job automatizado configurado

### 16.4 Rollback strategy

- **Code:** tag `checkpoint-pre-faseN` antes de cada fase, revert via Vercel UI ou `git revert`
- **DB:** restore de `.sql.gz` via `gunzip | mysql` (ou script equivalente)
- **Vercel Deploy:** UI permite promover qualquer deploy histórico como Production (~10 deploys retidos)

### 16.5 Sem cobertura

- Backup automático prod (cron)
- Encryption at rest dos backups
- Restauração testada (drill)
- RPO/RTO definidos

---

## 17. Gaps conhecidos e priorização

### 17.1 Críticos (prioridade alta)

1. **Migration `signatoryType 40` em prod** — schema TS divergente. Aplicar `ALTER TABLE`.
2. **Confirmar migrations 0024-0027 em prod** — Se prod nunca rodou drizzle-kit migrate, schema TS ≠ DB. Queries quebram silenciosamente.
3. **`main` vs prod divergente** — `main` está em PR #16 mergeada, prod rollbackada em PR #14. Decidir: revert PR #16 e fechar #17, OU consertar e re-deploy.
4. **Auth WebSocket** — `/api/ws?userId=N` aceita qualquer userId sem token. Substituir por cookie validation ou token assinado.
5. **XSS template render** — `{{candidateName}}` injetado raw no HTML. Adicionar `escapeHtml()` no `template-render.service.ts`.

### 17.2 Importantes (prioridade média)

6. **PR #17 (fase 10.5b)** — geração de documento incompleta sem merge. Decidir merge + aplicar migration + seed templates em prod.
7. **Logs de credenciais** — `.codex-*.log` na raiz podem ter strings sensíveis. Limpar + gitignorar.
8. **CSRF protection** — tRPC sobre cookie session. SameSite Lax mitiga mas não cobre todos vetores. Avaliar adicionar token CSRF para mutations.
9. **Backup prod automatizado** — hoje é manual. Migrar para GitHub Actions cron ou TiDB snapshot scheduled.
10. **Smoke tests E2E** — sem Playwright. Adicionar cobertura golden path (login → admissão → upload → assinatura → kanban) trava regressões.

### 17.3 Hardening (prioridade baixa)

11. **2FA/MFA** — sem segundo fator hoje. Avaliar TOTP via authenticator app.
12. **Lockout temporário** — rate limit existe mas sem lockout progressivo após N falhas seguidas.
13. **Cifragem em repouso de PII** — CPF, salário, banco em texto. Avaliar cifrar campos específicos (column-level encryption).
14. **Secrets rotation policy** — sem doc/processo definido.
15. **AWS S3 SDK legado** — `@aws-sdk/client-s3` no package.json mas storage migrou para Vercel Blob. Avaliar remover dep + storage.ts cleanup.
16. **Dead pages** — `AdminRecursos.tsx` parece não-rotada. Verificar e remover.
17. **Audit ASCII** — `AUDIT_FRONTEND.md`, `RELATORIO_AUDITORIA.md` na raiz são docs antigos. Mover para `docs/`.
18. **`/api/blob/proxy` rate-limit dedicado** — só usa o global. Adicionar limit específico para evitar abuso de proxy.
19. **CSP `style-src 'unsafe-inline'`** — necessário pra Tailwind/Radix mas validar se pode ser nonce-based.
20. **OAuth Manus vs JWT local** — fluxos paralelos podem ter inconsistências. Documentar qual é o canônico e desabilitar o outro se não usado.

### 17.4 Operacionais

21. **Documentar `.env` real prod vs preview** — variáveis efetivas, escopo, quem gerencia
22. **Runbook de incidente** — quem alerta, como rollback, como debugar
23. **Monitoring/observability** — sem APM hoje. Avaliar Vercel Analytics ou Sentry
24. **CI tests gate** — confirmar GitHub Actions roda vitest e bloqueia PR se falhar

---

## Apêndice A — Comandos úteis

```bash
# Dev
pnpm dev                                  # tsx watch server (porta 3002)
pnpm check                                # tsc --noEmit
pnpm test                                 # vitest run
pnpm format                               # prettier

# Build
pnpm build                                # vite build + esbuild server

# DB
pnpm db:push                              # drizzle-kit generate && migrate
pnpm tsx scripts/admission-wipe-dev.ts    # wipe admission dev
pnpm tsx scripts/seed-templates-dev.ts    # seed templates dev
pnpm tsx scripts/check-kanban-dev.ts      # contar tabelas dev

# Backups
./scripts/backup-db.ps1                   # Windows
./scripts/backup-db.sh                    # POSIX

# Git
git checkout checkpoint-pre-admission-resume  # rollback para sábado
gh pr list --state open                       # PRs em aberto
gh pr merge 17 --squash                       # mergear PR
```

## Apêndice B — Glossário de domínio

- **ASO** — Atestado de Saúde Ocupacional (admissional/periódico/demissional/retorno/mudança)
- **CBO** — Classificação Brasileira de Ocupações (cargo)
- **CIPA** — Comissão Interna de Prevenção de Acidentes
- **CLT** — Consolidação das Leis do Trabalho
- **CTPS** — Carteira de Trabalho e Previdência Social
- **DAS/MEI** — não suportado nativamente, fluxo manual
- **DSR** — Descanso Semanal Remunerado (não no schema atual)
- **e-Social** — sistema unificado do governo (campo preparado, integração TODO)
- **EPI** — Equipamento de Proteção Individual
- **FGTS** — agregado em payroll summary mas não tabela própria
- **GED** — Gestão Eletrônica de Documentos (router `documents`)
- **INSS** — Instituto Nacional do Seguro Social (tipo de afastamento `INSS` em `leaves`)
- **LGPD** — Lei Geral de Proteção de Dados (Lei 13.709/2018)
- **NR-1, NR-6, NR-10, NR-35** — Normas Regulamentadoras MTP
- **OS** — Ordem de Serviço (NR-1)
- **PCMSO** — Programa de Controle Médico de Saúde Ocupacional
- **PGR** — Programa de Gerenciamento de Riscos
- **PIS/PASEP** — Programa de Integração Social / Programa de Formação do Patrimônio do Servidor Público
- **REP-P** — Registro Eletrônico de Ponto Programa (Portaria MTP 671/2021)
- **SESMT** — Serviço Especializado em Engenharia de Segurança e em Medicina do Trabalho
- **VA/VR/VT** — Vale Alimentação / Vale Refeição / Vale Transporte

---

**Total mapeado:** 59 tabelas · 45 routers · ~380 procedures · 42 páginas · 28 migrations · 8 integrações externas · 16 itens catalog admission v2 · 5 templates HTML.

**Conclusão arquitetural:** sistema é grande e modular. Patches existem mas a base é coerente (TS estrito, ESM, drizzle, tRPC, RBAC, audit, LGPD). Refactor in-place + smoke tests E2E + alinhamento git/prod resolve a percepção de insegurança sem rewrite.
