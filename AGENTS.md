# RH Prime Agent Context

## Project

- RH Prime = full-stack HR system for Brazilian compliance workflows.
- Monorepo with frontend, backend, DB schema, scripts, and ops docs.
- Start from `C:\rh-prime`.

## Stack

- Frontend: React 19 + Vite + TypeScript + Tailwind + shadcn/ui + wouter
- Backend: Express + tRPC v11 + Drizzle ORM
- DB: MySQL-compatible; current architecture docs reference TiDB/Vercel-era deploy details, while README quickstart still mentions MySQL-style local setup
- Auth: local JWT; optional OAuth flow exists
- Tests: Vitest

## Layout

- `client/` frontend
- `server/` backend and domain modules
- `shared/` shared types/contracts
- `api/` deployment entrypoints/integration glue
- `drizzle/` schema and migrations
- `scripts/` operational helpers
- `docs/` supporting docs

## Source Of Truth

- Code and current behavior: repository files
- High-level technical map: `ARCHITECTURE.md`
- Setup and env baseline: `README.md`, `.env.example`
- Local secrets, OAuth tokens, MCP auth: user home only, never git

## Working Rules

- Read existing code before changing patterns.
- Prefer existing conventions over inventing new abstractions.
- Keep edits minimal, local, and compatible with current architecture.
- Do not commit credentials, local machine paths, or user-specific state.

## Agent Boundary

- Shared project memory belongs in checked-in files like `AGENTS.md`, `CLAUDE.md`, and `.mcp.json`.
- Agent-specific config belongs in `%USERPROFILE%\.codex`, `%USERPROFILE%\.claude`, and local `.claude/`.
- OAuth/login is interactive user state, not project state.

## Common Commands

```powershell
pnpm install
pnpm dev
pnpm build
pnpm test
powershell .\scripts\doctor-agents.ps1
```

## Vercel MCP

- Official endpoint: `https://mcp.vercel.com`
- Safe to declare in project config
- Login must be completed in the user's real terminal session

## Recent Vercel Fix

- 2026-06-24: Production `public-self-eight.vercel.app` was failing because Vercel serverless ESM could not resolve `drizzle/schema.js` importing `./schema-kanban` without an extension.
- Fix applied in `drizzle/schema.ts`: use `export * from "./schema-kanban.js";`.
- Follow-up fix: server-side dynamic imports in `server/db.ts`, `server/routers.ts`, and related routers now include `.js` extensions so Vercel serverless ESM can resolve them.
- Added `.vercelignore` so local agent artifacts, screenshots, logs, storage, and operational scripts are not uploaded to Vercel.
- Latest production deploy succeeded as `dpl_429zX1SNG2nAK6uTqmtpaXXRqAFc`, URL `https://public-mgv7vg738-johneug-5884s-projects.vercel.app`, aliased to `https://public-self-eight.vercel.app`.
- Post-deploy checks passed: `/`, `/api/health`, and `/api/trpc/auth.me` returned HTTP 200; no 500 logs were found on the new deployment.

## Recent Data Protection Work

- 2026-06-24: Hardcoded DB credentials were removed from local scripts `scripts/apply-hostinger.mjs` and `scripts/apply-kanban-missing.mjs`; they now require `DATABASE_URL`.
- `.gitignore` now excludes `.openclaude/`, `.playwright-mcp/`, `storage/`, screenshots, and local operational DB scripts to reduce accidental leaks.
- WebSocket notifications no longer trust `?userId=`; `/api/ws` authenticates via the existing session cookie.
- `/api/trpc` now blocks cross-origin POST requests unless `Origin`/`Referer` matches the request host or configured `CORS_ORIGINS`.
- Production crypto/webhook helpers no longer use hardcoded default secrets; they use explicit `ENCRYPTION_KEY`/`WEBHOOK_SECRET` or fall back to `JWT_SECRET`.
- Admin-only tightening: manual notification creation, integration email sending, and webhook management now require `admin`.

## Recent Access UI Work

- 2026-06-24: Access/admin pages already existed as protected routes: `/usuarios`, `/hierarquia`, and `/seguranca-config`.
- Fix applied in `client/src/components/DashboardLayout.tsx`: added admin-only sidebar links for `Usuários`, `Hierarquia`, and `Segurança` under the `Sistema` section.
- Backend RBAC for these user-management operations remains in `server/routers/auth-rbac.ts`; only `admin` can list/create users or update roles.
- Follow-up hardening: public self-registration is disabled by default. It now requires `PUBLIC_REGISTRATION_ENABLED=true` on the server and `VITE_PUBLIC_REGISTRATION_ENABLED=true` on the client.
- `client/src/pages/EmployeeDetail.tsx` now only renders the employee-user linking action for admins, and only fetches the user list when the dialog opens.
- `client/src/pages/SecuritySettings.tsx` is now a read-only view of effective access/security policies instead of static placeholder text.
- 2026-06-24: `/usuarios` evolved into the main operational access screen:
  - `server/routers/auth-rbac.ts` now exposes admin-only `resetUserPassword` and `linkEmployee`.
  - `server/db.ts` now provides `listUsersWithAccessInfo()` with last successful login and linked employee info.
  - `client/src/pages/UserManagement.tsx` shows last login/linked employee and allows admins to reset passwords or link users to employees from the user dialog.
  - Self-demotion from admin is blocked in `updateUserRole`.

## Recent Kanban Assignee Fix

- 2026-06-24: Kanban activity responsible-user selectors showed only current board members, so registered users outside the board did not appear.
- Fix applied in `client/src/pages/kanban-v2/components/NewCardDialog.tsx` and `client/src/components/kanban/CardDetailDrawer.tsx`: assignee options now merge current board members with eligible system user candidates from `kanban.boards.listUserCandidates`.
- Backend fix in `server/modules/kanban/db.ts` and `server/routers/kanban.ts`: `cards.setAssignees` now ensures selected assignees are board members with `viewer` access when needed, without downgrading existing board roles or the owner.
- Production deploy succeeded as `dpl_7WJ149rTCVJWREFs6oeShciztDUR`, URL `https://public-b91o09tmd-johneug-5884s-projects.vercel.app`, aliased to `https://public-self-eight.vercel.app`.
- Validation passed: `pnpm check`, `pnpm test server/modules/auth/auth-service.test.ts`, full `pnpm build`, `/api/health` HTTP 200, and no 500 logs found on the new deployment.

## Recent Access Status Work

- 2026-06-24: User management now has a persisted account status in `users.status` with values `active` and `inactive`.
- Schema change added in `drizzle/schema.ts` plus migration `drizzle/0031_user_account_status.sql`.
- Authentication now rejects inactive users in both the main auth service and the RBAC login path; inactive users also cannot request password reset flows.
- `server/routers/auth-rbac.ts` now exposes admin-only `setUserStatus`, blocks self-deactivation, and prevents disabling the last active admin.
- `client/src/pages/UserManagement.tsx` shows the active/inactive state and lets admins deactivate/reactivate accounts from the edit dialog.
- Validation added in `server/modules/auth/auth-service.test.ts` for inactive-user login rejection.
- 2026-06-25: The database migration history was aligned by inserting the missing rows into `__drizzle_migrations` for `0024_onboarding_v2_foundation` through `0031_user_account_status`.
- `pnpm exec drizzle-kit migrate` now completes successfully against the current database.
- Production deploy succeeded as `dpl_C2QJo9GRQyyY8mbJhUvLD6UiS4yc`, URL `https://public-2o6tgihle-johneug-5884s-projects.vercel.app`, aliased to `https://public-self-eight.vercel.app`.
- Validation passed: `pnpm check`, `pnpm test`, `pnpm build`, `pnpm exec drizzle-kit migrate`, `/api/health` HTTP 200, `users.status` present in the database, and no 500 logs found on the new deployment.

## Recent Kanban Drag and Drop Fix

- 2026-06-25: Classic Kanban drag and drop now accepts dropping cards on a list header / empty list by treating `overData.type === "list"` as a valid destination in `client/src/pages/KanbanBoard.tsx`.
- Latest production deploy succeeded as `dpl_26WyoC5zNyyGduG7dFvPmp59oQ2g`, URL `https://public-cs7z7oav8-johneug-5884s-projects.vercel.app`, aliased to `https://public-self-eight.vercel.app`.
- Validation passed: `pnpm check`, `pnpm build`, and `GET /api/health` returned HTTP 200.

## Recent Employee Timesheet UX Work

- 2026-06-25: Started the employee-facing workday registration improvements in `client/src/pages/Timesheet.tsx`.
- `/ponto` now reads `auth.session` to know the linked employee before loading timesheet records, monthly summary, or open clock record.
- If the user is not linked to an employee, the page shows a clear operational warning and disables the clock button instead of letting backend scope errors surface only after interaction.
- If the user is linked, the page shows the linked employee name and a ready-for-registration badge.
- Production deploy succeeded as `dpl_742roRajXnR48qqbEAmDzh2UQiDC`, URL `https://public-3vnwkct73-johneug-5884s-projects.vercel.app`, aliased to `https://public-self-eight.vercel.app`.
- Validation passed: `pnpm check`, `pnpm build`, and `GET /api/health` returned HTTP 200.

## Recent Timesheet Product Upgrade

- 2026-06-25: `/ponto` was upgraded from a simple clock button into a richer employee-facing workday panel.
- `client/src/pages/Timesheet.tsx` now shows today's timeline, current jornada status, next action, online/location/camera/fingerprint conditions, a post-punch receipt with copy action, and a quick route to request point adjustment via `/inbox`.
- `server/routers/timesheet.ts` now exposes `timesheet.uploadSelfie`, validates employee scope, uploads the captured selfie to storage, and stores only the resulting URL in `time_records.selfie_url`.
- The frontend no longer sends base64 selfie payloads directly to `clockIn`; if selfie upload fails, the point is still registered without photo and the employee receives a warning.
- Production deploy succeeded as `dpl_CFpEjQrXjHk4r8uof8dwHKmu73Z9`, URL `https://public-lj6blnl58-johneug-5884s-projects.vercel.app`, aliased to `https://public-self-eight.vercel.app`.
- Validation passed: `pnpm check`, `pnpm test server/routers/timesheet.test.ts`, `pnpm build`, and `GET /api/health` returned HTTP 200.

## Recent User Management Hotfix

- 2026-06-25: Production `/usuarios` crashed with `Cannot read properties of undefined (reading 'color')` when a user role/status value was outside the expected visual config map.
- Fix applied in `client/src/pages/UserManagement.tsx`: role and status values are normalized through `asUserRole` and `asUserStatus` before reading badge config, stats, search labels, and the edit dialog status badge.
- Production deploy succeeded as `dpl_6uXWqP3dnah4QQkkdDsgTmaJjT1w`, URL `https://public-aewyde4ck-johneug-5884s-projects.vercel.app`, aliased to `https://public-self-eight.vercel.app`.
- Validation passed: `pnpm check`, `pnpm build`, and `GET /api/health` returned HTTP 200.

## Recent Employee Linking Fix

- 2026-06-25: `/usuarios` did not show employees in the user-linking select because the frontend requested `employees.list({ limit: 1000 })` while the backend schema capped `limit` at 100, causing the query to fail validation.
- Fix applied in `server/routers.ts`: `employees.list` now accepts `limit` up to 2000, which also supports `UserHierarchy`.
- `client/src/pages/UserManagement.tsx` now surfaces employee-list loading errors inside the linking dialog instead of silently showing an empty select.
- Production deploy succeeded as `dpl_GKe7YLpEXuVSq5wDnKN2KiusqpHC`, URL `https://public-484v2r7ec-johneug-5884s-projects.vercel.app`, aliased to `https://public-self-eight.vercel.app`.
- Validation passed: `pnpm check`, `pnpm build`, and `GET /api/health` returned HTTP 200.

## Recent CI Runtime Work

- 2026-06-24: GitHub Actions CI now uses Node 24 in `.github/workflows/ci.yml`.
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` is set in CI to match GitHub's Node 24 action runtime migration.

## Recent Férias CRUD Work

- 2026-06-27: The read-only `/ferias` page became a full vacation management module with a CLT-compliant request/approval workflow (plan in `docs/superpowers/plans/2026-06-25-ferias-crud.md`).
- `client/src/pages/Vacations.tsx` was rewritten: stats (vencidas / 60d / agendadas), an expandable períodos-aquisitivos table showing the gozo periods, and a dialog that lets a colaborador request vacation (creates an Inbox `kind: "ferias"` request) or an admin/gestor schedule it directly. It also fixed pre-existing wrong field names (`acquisitivePeriodStart`/`totalDaysEntitled` → schema's `acquisitionStart`/`daysEntitled`).
- `server/routers/inbox.ts`: approving a `kind: "ferias"` request now creates the `vacationPeriod` and updates `vacation.daysTaken`/`status`. CLT validation (`server/utils/vacation-rules.ts` `validateVacationRequest`) is enforced **server-side** in `inbox.create` and in the approval hook; the gozo `days` is always derived from the dates on the server via `calendarDaysBetween`, never trusted from the client payload.
- `decide()` is now idempotent: it refuses to decide an already `APPROVED`/`REJECTED`/`CANCELLED` request, preventing duplicate vacation periods and double-counted `daysTaken`.
- `server/routers.ts`: added `vacations.listWithEmployee` (joins employee `fullName`) and scoped it plus `vacationPeriods.list`/`listByEmployee` by role/scope (admin/gestor see all, colaborador only own) to close IDOR, matching the recent authorization-hardening direction.
- `server/_core/notification-scheduler.ts`: added a 90-day concessão heads-up. The dedup key in `alreadyNotified` now also considers the notification title (when provided) so the 90-day Info alert no longer suppresses the later 30-day Aviso for the same `concessionLimit`.
- `client/src/pages/Inbox.tsx`: rich rendering of the `kind: "ferias"` payload (período aquisitivo, gozo solicitado, abono).
- Tests added: `server/routers/inbox-ferias.test.ts` (approval hook, tampered-`days` payload, idempotency, rejection). Task 1's `server/utils/vacation-rules.test.ts` already covered the pure CLT rules.
- Validation passed on merged `main`: `pnpm check`, `pnpm test` (206 passing), and `pnpm build`. Browser end-to-end (logged-in flow against a live DB) remains a manual step.
- Merged to `main` as `15cd96f` and pushed (`ba6cd0a..15cd96f`).

## Recent Journey / Collaborator App Work

- 2026-07-22: The timesheet redesign effort was formalized across:
  - `docs/superpowers/plans/2026-07-22-redesenho-ponto-e-jornada.md`
  - `docs/superpowers/specs/2026-07-22-ponto-jornada-redesign.md`
  - `docs/superpowers/specs/2026-07-22-ponto-legado-inventory.md`
  - `docs/superpowers/specs/2026-07-22-schema-journey-v2.md`
  - `docs/superpowers/specs/2026-07-22-v2-backlog-and-cutover-matrix.md`
- Journey V2 foundation landed in:
  - `server/modules/journey-v2/`
  - `server/routers/journey-v2.ts`
  - `drizzle/schema-journey-v2.ts`
  - migration `drizzle/0034_journey_v2_foundation.sql`
- Manual implantation flow for timesheet was expanded to accept full jornada (`clock_in`, `break_start`, `break_end`, `clock_out`) with mandatory justification and approved retroactive registration:
  - backend in `server/routers/timesheet.ts`
  - admin UI in `client/src/pages/JourneyAdmin.tsx`
- Employee-facing `/ponto` remains the operational fallback and already contains:
  - linked-employee guard via `auth.session`
  - Journey V2 daily status
  - timeline of the day
  - latest receipt
  - V2 adjustment requests
  - selfie upload and location/fingerprint capture
- A dedicated collaborator mobile app shell was created under `client/src/app-mobile/` with:
  - `components/MobileAppLayout.tsx`
  - `pages/AppHome.tsx`
  - `pages/AppTimesheetHome.tsx`
  - `hooks/useInstallPrompt.ts`
  - `hooks/useCollaboratorAppAccess.ts`
  - `services/journey.ts`
  - `services/telemetry.ts`
- New protected routes were added in `client/src/App.tsx`:
  - `/app`
  - `/app/ponto`
- The collaborator app is currently PWA-based and uses:
  - `client/public/manifest.webmanifest`
  - `client/public/sw.js`
  - `client/public/app-icon.svg`
  - `client/public/app-icon-maskable.svg`
  - service worker registration in `client/src/main.tsx`
- Current collaborator app scope:
  - home screen with eligibility, linked employee, install prompt, and point competence `26 -> 25`
  - mobile point screen with real entry/exit/interval registration
  - latest receipt
  - V2 day timeline
  - adjustment request creation
  - recent adjustment request list
  - competence visibility and open-adjustment count
- Pilot control now exists server-side instead of frontend-only:
  - helper `getCollaboratorAppPilotAccess()` in `server/_core/feature-flags.ts`
  - surfaced through `server/_core/systemRouter.ts`
  - supports `COLLABORATOR_APP_ALLOWED_ROLES`, `COLLABORATOR_APP_ALLOWED_EMAILS`, `COLLABORATOR_APP_ALLOWED_USER_IDS`
  - admin override remains allowed for testing
- Basic collaborator-app telemetry now exists via Umami-compatible tracking:
  - home viewed
  - timesheet viewed
  - install prompt clicked
  - clock in success
  - clock out success
  - journey event success
  - adjustment request created
- Planning and rollout documentation for the collaborator app now lives in:
  - `docs/superpowers/plans/2026-07-22-app-colaborador-ponto-implantation.md`
  - `docs/superpowers/plans/2026-07-22-app-colaborador-ponto-execution-backlog.md`
  - `docs/superpowers/plans/2026-07-22-app-colaborador-homologacao-e-seguranca.md`
- Current product decision:
  - short/mid-term channel = PWA
  - Android is the first homologation target
  - Apple Safari / Add to Home Screen is supported next
  - native store packaging should only be evaluated after pilot stability
- Validation completed for the recent collaborator app phase:
  - `pnpm check`
  - `pnpm build`
- Important note for continuation:
  - rollout is not yet complete
  - visual install instructions inside the app are still pending
  - session-hardening and final mobile security tightening are still pending
  - production deployment for the latest collaborator-app phase has not yet been recorded in `AGENTS.md`
