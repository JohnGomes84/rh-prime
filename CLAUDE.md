# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                    # Dev server (Express + Vite HMR on port 3000)
pnpm build                  # Vite client build + esbuild server bundle → dist/
pnpm start                  # Run built app with auto-restart supervisor
pnpm check                  # TypeScript typecheck (no emit)
pnpm format                 # Prettier
pnpm test                   # Run all Vitest tests
pnpm test -- --run path/to/file.test.ts   # Single test file
pnpm test:e2e               # Playwright end-to-end
pnpm test:e2e:ui            # Playwright with interactive UI
pnpm db:push                # Generate + apply Drizzle migrations
pnpm db:seed:demo           # Seed demo data
pnpm dev:homolog            # Dev with .env.homolog on port 3001
pnpm db:push:homolog        # Apply schema to finhub_homolog DB
```

Integration tests require `DATABASE_URL` in env; they use `describe.skip` otherwise.

## Architecture

Single-repo: React 19 client + Express server, served from one Node process.

```
client/src        React frontend (pages, hooks, components)
server/           Express + tRPC backend
server/_core/     Bootstrap, auth, SSE, observability, runtime wiring
server/routers/   tRPC routers (one file per domain, some with subdirectory)
server/controle/  Cross-cutting concerns (permission cache)
server/lib/       Shared utilities (schedule generation, seeds)
drizzle/          schema.ts + generated SQL migration files
shared/           Constants and types shared client↔server
e2e/              Playwright specs
scripts/          Build, dev, ops, and Windows supervisor scripts
```

### Server bootstrap (`server/_core/index.ts`)

`startServer()` wires everything in order: seeds → Express middleware → OAuth routes → export REST routes → document upload routes → SSE → tRPC → Vite (dev) or static (prod). Port retry logic scans up to 20 ports from `PORT` env if the preferred port is busy.

### Data layer

- **MySQL** via `drizzle-orm/mysql2`. Every router calls `getDb()` — returns `null` without `DATABASE_URL`, so guard with `if (!db) return ...`.
- **Redis** via `ioredis`, optional — falls back silently without `REDIS_URL`.
- Schema lives in `drizzle/schema.ts`. Run `pnpm db:push` after schema changes.
- Dates: always use UTC constructors (`Date.UTC(...)`) when computing recurring dates.

### API layer (tRPC)

- `server/routers.ts` composes all routers into `appRouter`; `AppRouter` type is consumed by the client.
- Three procedure types in `server/_core/trpc.ts`: `publicProcedure`, `protectedProcedure` (any logged-in user), `adminProcedure` (role === "admin").
- Client: `client/src/lib/trpc.ts` exports `trpc`. Mounted in `client/src/main.tsx` with `httpBatchLink` at `/api/trpc`.
- superjson transformer is active — Dates serialize correctly across the wire.

### Non-tRPC REST endpoints

Some routes bypass tRPC and live as plain Express handlers:

| Mount path | File |
|---|---|
| `/api/oauth/*` | `server/_core/oauth.ts` |
| `/api/reports/*` | `server/routers/exportRoutes.ts` |
| `/api/documents/*` | `server/routers/documentUploadRoutes.ts` |
| `/api/notifications/stream` | `server/_core/sse.ts` |
| `/health`, `/ready`, `/metrics` | `server/_core/observability.ts` |

### Auth

- OAuth flow through `server/_core/oauth.ts` → `sdk.ts`. Session stored as JWT in httpOnly cookie (`app_session_id`).
- `createContext` in `server/_core/context.ts` authenticates every request.
- Email domain restriction enforced in `server/_core/auth-domain.ts` (only `@mlservicoseco.com.br` by default, configured via env).

### RBAC / Permissions

- Roles: `admin`, `user`, `leader` on the `users` table.
- Granular per-module permissions in `userPermissions` table (canView/canCreate/canEdit/canDelete per `SystemModule`).
- `server/controle/permissionControl.ts` — in-memory cache (90 s TTL). Call `invalidateUserPermissions(userId)` after any permission change. Admins bypass the table entirely.
- Routers call `checkPermission(userId, module, action)` or the throwing helper `requirePermission`.

### Real-time

- SSE at `/api/notifications/stream` (`server/_core/sse.ts`) — typed events, frontend subscribes via `useNotifications` hook.
- Socket.io also present (`server/_core/websocket.ts`) for live dashboard updates. Frontend uses `useWebSocket` hook.

### Frontend routing

All pages in `client/src/pages/` are lazy-loaded. Every authenticated page wraps its content in `<DashboardLayout>`. Router is in `client/src/App.tsx` using `wouter`.

Path aliases in `vite.config.ts`:
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

### Build output

`pnpm build` produces:
- `dist/public/` — Vite client bundles (manual chunks: `vendor-data`, `vendor-charts`, `vendor-export`, `vendor-ui`, `vendor`)
- `dist/` — esbuild server bundle (`server/_core/index.ts`)

### Environments

| Env | File | DB | Port |
|---|---|---|---|
| Development | `.env.local` | `finhub` | 3000 |
| Homologation | `.env.homolog` | `finhub_homolog` | 3001 |
| Production (Windows) | `.env.production` | — | configured |

Production on Windows runs as a Scheduled Task named `FinhubSupervisor`. Install with `pnpm ops:win:install-supervisor`. Logs at `C:\Finhub\logs\`.

Key env vars: `DATABASE_URL`, `JWT_SECRET`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `REDIS_URL`, `SMTP_*`, `AWS_*`, `PORT`.

## Domain map

| Domain | Router file | Key pages |
|---|---|---|
| Cadastros | `routers/cadastros.ts` | Employees, Clients, Suppliers, Shifts, Functions, CostCenters, BankAccounts |
| Financeiro | `routers/financeiro.ts` | AccountsPayable, AccountsReceivable, PaymentBatches, Payments |
| Planejamentos | `routers/planejamentos.ts` + `planejamentos-alloc-hybrid.ts` | Schedules |
| Portal do Líder | `routers/portalLider.ts` + `routers/portalLider/` | PortalLider, LeaderPortal, PixRequests, PixApprovals |
| Fiscal | `routers/fiscal.ts` + `fiscal-webhook.ts` | NotasFiscaisRecebidas |
| Dashboard | `routers/dashboard.ts`, `dashboard-enhancements.ts`, `dashboard-advanced.ts` | Dashboard |
| Documentos | `routers/documents.ts` + `documentUploadRoutes.ts` | Documents |
| Usuários | `routers/usuarios.ts` | Users |
| Auditoria | `routers/audit.ts` | Audit |
| Admin | `routers/admin.ts` | AdminOccurrences |
| Relatórios | `routers/relatorios.ts` + `report-generation.ts` + `exportRoutes.ts` | Relatorios |

## Testing

Vitest covers `server/**/*.test.ts` and `server/**/*.spec.ts` in a Node environment. When changing routers, auth, billing, exports, scheduling, or documents, add or update tests in the same scope. Playwright specs go in `e2e/*.spec.ts`.
