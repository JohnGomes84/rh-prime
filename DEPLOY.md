# Deploy — RH Prime

**One rule: production ships only from a clean, pushed `main`.** Never deploy from a
dirty working tree. That is what caused the incident where uncommitted code (the
collaborator app, journey v2, PWA) was baked into production and later silently removed
by a clean deploy. The full source was recovered from the Vercel deployment and is now
on `main` — keep it that way: `main` is the only source of truth.

## Source of truth

| Thing | Value |
| --- | --- |
| Git remote (origin) | `github.com/JohnGomes84/rh-prime` |
| Production branch | `main` |
| Vercel project | `public` → https://public-self-eight.vercel.app |
| Vercel team | `johneug-5884s-projects` (`team_kYshp4kkcWpH9rvSRhmLouaR`) |

## How deploys happen

**Vercel Git integration is connected** — every push to `main` auto-deploys to production,
built from git only. This is the primary, safe path: no manual uploads from local machines.

```bash
# normal flow
git checkout main && git pull
# make changes on a branch, open a PR, merge to main  →  Vercel auto-deploys
```

### Manual deploy (fallback / off-cycle)

If you must deploy manually, use the guarded script — never a bare `vercel deploy`:

```bash
git checkout main && git pull
pnpm run deploy:prod        # runs scripts/deploy-guard.sh, then vercel deploy --prod
```

> Use `pnpm run deploy:prod`, **not** `pnpm deploy` — `pnpm deploy` is a built-in pnpm
> command and will NOT run the guard.

The guard **blocks** the deploy unless all of these hold:

1. You are on `main`.
2. No uncommitted changes to tracked files (a dirty tree is refused).
3. Local `main` equals `origin/main` (your code is pushed).
4. `pnpm build` succeeds.

Untracked files are listed as a warning — they are **not** deployed, so never rely on
them being live. (This is the mistake that caused the incident.)

## Rolling back

Production deployments can be reverted in the Vercel dashboard or:

```bash
vercel promote <deployment-url> --scope johneug-5884s-projects
```

## Emergency bypass

Only when you fully understand the risk:

```bash
DEPLOY_ALLOW_DIRTY=1 pnpm run deploy:prod
```

This skips every safety check. Do not use it to ship uncommitted work — that is the exact
mistake this guard prevents.

## The PWA (collaborator app)

The installable PWA is the **collaborator app**, scoped to `/app` (`start_url: /app/ponto`):

- `client/public/manifest.webmanifest` — "RH Prime Colaborador", `scope: "/app"`
- `client/public/sw.js` — caches the `/app` shell (hand-written, collaborator-scoped)
- `client/public/app-icon.svg`, `app-icon-maskable.svg`

Installing from `https://public-self-eight.vercel.app` adds the collaborator ponto app to
the home screen. This is intentional — the admin dashboard is not the installable target.

## What is NOT deployed

`.vercelignore` excludes `Finhub/` (a separate ~1.7 GB project), local agent artifacts,
logs, storage, and operational DB scripts. `node_modules/` and `dist/` are rebuilt on Vercel.
