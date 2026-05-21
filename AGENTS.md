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
