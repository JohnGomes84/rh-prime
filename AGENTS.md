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
