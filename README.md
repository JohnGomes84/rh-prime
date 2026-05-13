# RH Prime

Sistema de Gestão de Recursos Humanos full-stack focado em compliance brasileira (CLT, LGPD, Portaria MTP 671/2021).

## Stack
- **Frontend:** React 19 + Vite + TypeScript + Tailwind + shadcn/ui + wouter
- **Backend:** Express + tRPC v11 + Drizzle ORM + MySQL2
- **DB:** MySQL (Hostinger em produção)
- **Auth:** JWT local + OAuth (Manus) opcional + WebSocket realtime
- **AI:** Forge LLM proxy (resume parser + job description gen)
- **Testes:** Vitest

## Quick start

```bash
pnpm install
cp .env.example .env.local   # ajustar DATABASE_URL, JWT_SECRET
pnpm exec drizzle-kit migrate
pnpm dev                      # http://localhost:3002
pnpm test                     # 155+ testes
pnpm check                    # tsc --noEmit
```

## Variáveis de ambiente

| Var | Obrigatório | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | sim | ≥32 chars |
| `NODE_ENV` | – | development / production / test |
| `PORT` | – | default 3000 |
| `OAUTH_SERVER_URL` | – | OAuth Manus (opcional) |
| `BUILT_IN_FORGE_API_KEY` | – | Habilita endpoints AI |
| `ALLOWED_REGISTER_EMAILS` | – | CSV de emails permitidos no register |

## Estrutura

```
client/         # React app
  src/pages/    # 40+ páginas
  src/components/
  src/_core/hooks/  # useAuth, useRole
server/         # Express + tRPC
  routers.ts    # router raiz
  routers/      # routers especializados
  modules/      # módulos de domínio (auth)
  utils/        # journey-engine, labor-calc, portaria-671, scope, ...
  integrations/ # brasil-api, ai-recruitment, cpf-validator, email, webhooks
  _core/        # context, trpc, sdk, websocket, notification-scheduler
shared/         # tipos + const
drizzle/        # schema + migrations
```

## Funcionalidades entregues

### Autenticação e RBAC
- JWT local + OAuth Manus + WebSocket sessão ao vivo
- Roles: `admin`, `gestor`, `colaborador`
- Whitelist de emails para auto-cadastro
- `useRole()` hook + `<RouteGuard>` + sidebar filtrada
- Hierarquia recursiva (`employees.manager_id`) + escopo de gestor com cache 60s
- Departamentos (tree), histórico de troca de gestor (imutável)
- Mascaramento de dados sensíveis (CPF, salário, endereço, bancário) por contexto

### Cadastro e ciclo de vida
- Funcionários (CRUD + bulk import XLSX/CSV com dry-run)
- Cargos, contratos, dependentes
- **Admissão** com workflow: 7 status, checklist 17 itens em 4 categorias, finalização vinculando ao employee
- **Movimentação interna** versionada (7 tipos: promoção, transferência, salário, etc)
- **Desligamento** com checklist de devolução (8 itens), cálculo verbas, bloqueio progressivo

### Jornada e ponto
- Schedule por contrato (5x2, 6x1, 12x36, parcial 30h/25h, flexível, intermitente)
- Engine de avaliação: atraso, HE 50%/100%/noturno, banco de horas, feriados
- ClockIn/Out com geolocalização, selfie, device fingerprint
- **Geofence configurável** via settings (lat/lng/raio); fora da cerca → PENDING
- Pré-autorização de HE (admin) com auto-aprovação na batida
- Espelho de ponto, aprovação em massa, JourneyAdmin

### Compliance Portaria MTP 671/2021
- AFD, AFDT, ACJEF — geração de arquivos texto
- NSR sequencial + hash chain SHA-256
- Verificação de integridade (recompute hash chain)
- Histórico de exportações com SHA + tamanho

### LGPD
- `consent_records` por user/tipo/versão com base legal
- Consent banner global não-bloqueante
- `/privacidade` para gerenciar 7 tipos de consentimento
- `read_audit_logs` em recursos sensíveis (CPF, salário, etc)

### Folha
- Calculadoras CLT: rescisão, 13º proporcional, férias proporcionais
- Holerite, payroll
- Vinculadas ao funcionário com auto-fill via contrato

### Inbox + workflows
- Caixa de entrada unificada (`/inbox`) com 3 escopos: Minhas / Equipe / Todas
- 8 tipos de solicitação (férias, atestado, ajuste ponto, abono, HE, declaração, adiantamento, outro)
- SLA por tipo + flag de vencido
- Aprovação/rejeição multi-nível com audit

### Integrações públicas
- ViaCEP / BrasilAPI (CEP)
- BrasilAPI Receita (CNPJ → razão social, endereço, CNAE)
- BrasilAPI Feriados (importação anual em massa)
- IBGE Localidades (estados + municípios em selects)

### IA
- **Resume parser** (PDF → candidate via Claude vision)
- **Job description generator** em pt-BR Markdown

### Notificações
- Scheduler diário: férias vencendo, ASOs, banco horas, aniversariantes
- WebSocket realtime (`broadcastNotification`, `broadcastToRole`, `broadcastToDepartment`)
- Bell + toast no header

### Analytics (`/analytics`)
- KPIs cabeça: headcount, turnover, absenteísmo
- Charts: admissões vs demissões mensais, absenteísmo justificado/injustificado, evolução headcount
- Operacionais: pendências por gestor, tempo médio aprovação, distribuição banco horas top 15, atrasos por departamento, taxa admissão completa, férias com prazo crítico

### Outros
- Bater ponto: tela full-screen consolidada (rota canônica `/ponto`)
- Aniversariantes do mês na Home
- WhatsApp deeplink (`wa.me/55+phone`) em telefone do funcionário
- Calendar BR business days (excluindo feriados)
- Notificações push via WebSocket (UI hookada)

## Schema (23 migrations)

37 tabelas. Núcleo:
- `users`, `employees` (vinculados via `userId`), `contracts`, `positions`, `departments`
- `time_records` (com NSR + hash chain + selfie + geofence), `overtime_records`, `overtime_authorizations`, `time_bank`
- `vacations`, `leaves`, `absences`, `medical_exams`, `holidays`
- `documents`, `digital_signatures`, `document_templates`
- `requests` + `approvals` (inbox)
- `consent_records`, `read_audit_logs` (LGPD)
- `admission_workflows` + `admission_checklist_items`
- `employee_movements`, `terminations` + `termination_devolution_items`
- `compliance_exports` (Portaria 671)
- `audit_logs`, `login_logs`, `notifications`, `settings`

## Compliance Portaria MTP 671/2021
- REP-P (sistema próprio web/mobile)
- AFD/AFDT/ACJEF gerados via `/compliance-jornada`
- NSR sequencial inteiro
- Hash chain SHA-256 ligando registros
- Retenção 5 anos (sem rotina de delete)

## Compliance LGPD
- Bases legais: consentimento, execução de contrato, obrigação legal, interesse legítimo, proteção ao crédito, tutela da saúde
- Mascaramento por contexto de produto (não só observação)
- Audit de leitura de campos sensíveis
- Revogação de consent registrada com IP + UA + timestamp

## Tags de retorno
Após cada fase principal, criamos tag git para rollback rápido:
- `checkpoint-2026-05-08-fase4-completa` (compliance Portaria 671)
- `checkpoint-pre-fase2`, `checkpoint-fase2-completa` (hierarquia)
- `checkpoint-pre-fase3`, `checkpoint-fase3-completa` (lifecycle)
- `checkpoint-pre-fase4`, `checkpoint-fase4-completa` (inbox)
- `checkpoint-pre-fase5`, `checkpoint-fase5-completa` (LGPD)
- `checkpoint-pre-fase6`, `checkpoint-fase6-completa` (analytics)
- `checkpoint-pre-fase7`, `checkpoint-fase7-completa` (anti-fraude)

Reverter:
```bash
git reset --hard <tag>
git push --force-with-lease
```

## Backlog V2
- **Kiosk mode** (PIN/biometria por funcionário em tablet compartilhado)
- **Manager delegations** (substituições temporárias com vigência)
- **Multi-empresa** (tenant_id em todas as tabelas)
- **eSocial integração** (S-2200 admissão, S-2230 afastamento, S-2299 desligamento)
- **Web Push API real** (service worker + VAPID + subscriptions)
- **PWA installable** com offline queue para batidas
- **Schedule normalização** (templates `schedules` + `schedule_rules`)
- **Rule engine versionado** (tabela `policies` com escopo + vigência)
- **Reconhecimento facial** (face embeddings via Claude Vision)
- **Autenticação 2FA TOTP**

## Scripts úteis

```bash
pnpm dev               # tsx watch server/_core/index.ts
pnpm build             # vite build + esbuild server
pnpm check             # tsc --noEmit
pnpm test              # vitest run
pnpm db:push           # drizzle-kit generate && migrate
pnpm exec drizzle-kit generate  # criar migration nova
pnpm exec drizzle-kit migrate   # aplicar pendentes
```

## Contribuição
Ver `CONTRIBUTING.md`.

## Documentos relacionados
- `COMPLIANCE.md` — checklist de compliance trabalhista
- `SECURITY.md` — política de segurança
- `IR_2026_RECEITA_FEDERAL.md` — tabela IR
- `ASSINATURA_DIGITAL_GOVBR.md` — fluxo gov.br
- `RELATORIO_AUDITORIA.md`, `REVISAO_COMPLETA.md` — auditorias prévias

## Licença
MIT (ver `package.json`).
