# Repository Guidelines

## Operational Mode
Treat medium and large requests with a mandatory sequence: `/spec`, `/break`, `/plan`, `/execute`. Do not jump straight to implementation when scope, files, or behavior are still vague. Small, isolated fixes can be handled directly, but any broader change should first define scope, tasks, and affected files.

## Required Workflow
`/spec`: define pages, components, behaviors, business rules, and user flows before coding.  
`/break`: split the spec into small independent tasks; each behavior should map to one task.  
`/plan`: inspect existing code for reuse, identify files to create or modify, list business rules, and cover success, error, and edge cases.  
`/execute`: implement only what was approved in the plan, following existing patterns and avoiding unrelated edits.

## Scope, Reuse, and Safety
Keep scope controlled: do not modify files that were not identified in `/plan`. Reuse existing modules in `client/src`, `server`, `shared`, and `server/_core` before creating new abstractions. Keep business rules on the backend; the frontend should collect input and render results, not decide critical domain behavior. Never expose secrets, tokens, or environment-sensitive values in client code.

## Project Structure
`client/src` contains the React/Vite frontend, including pages, hooks, and UI components. `server` contains routers, domain logic, tests, and operational modules. `server/_core` contains bootstrap, auth, SSE, observability, and runtime wiring. Shared contracts live in `shared`, database schema and migrations live in `drizzle`, end-to-end tests live in `e2e`, and scripts live in `scripts` plus `scripts/windows`.

## Commands
Use `pnpm install` to install dependencies. Use `pnpm dev` for local development, `pnpm build` for production build output, and `pnpm start` to run the supervised app locally. Use `pnpm check` for TypeScript validation, `pnpm test` for Vitest, and `pnpm test:e2e` for Playwright. Use homolog-specific scripts only when the task explicitly targets that environment, for example `pnpm db:push:homolog`, `pnpm db:seed:demo:homolog`, and `pnpm dev:homolog`.

## Coding Standards
Write TypeScript that is simple, readable, modular, and predictable. Follow existing naming patterns: `PascalCase` for React components, `camelCase` for functions and hooks, and descriptive file names such as `documentUploadRoutes.ts`. Avoid duplication, unnecessary abstraction, and scattered logic. Add error handling for user-facing and backend flows, and keep changes easy to understand and maintain.

## Testing Guidelines
Vitest covers `server/**/*.test.ts` and `server/**/*.spec.ts` in a Node environment. Keep unit and integration tests close to the server logic they validate. Put browser and smoke coverage in `e2e/*.spec.ts` with Playwright. When changing routers, auth, billing, exports, scheduling, or documents, add or update tests in the same scope as the change. Before submitting work, run the narrowest relevant test first, then run `pnpm test` for broader backend validation.

## Commit and Pull Request Guidelines
Recent history uses a mix of short operational commits and larger checkpoint commits. Prefer direct imperative messages with a scope when possible, such as `fix: harden auth-domain checks` or `feat: add PIX approval validation`. Pull requests should describe the affected flows, files changed, migrations or seed steps, environment changes, and manual verification steps. Include screenshots for UI changes and call out any known risks, edge cases, or follow-up work.
