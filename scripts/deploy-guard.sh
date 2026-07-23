#!/usr/bin/env bash
# =============================================================================
# Pre-deploy safety guard for rh-prime.
#
# WHY THIS EXISTS: production once drifted from git because deploys were made
# from a DIRTY working tree (uncommitted code baked into the build). A later
# clean deploy from git silently removed that code. This guard makes that class
# of mistake impossible: it refuses to deploy unless the working tree is a clean
# `main` that matches origin/main and builds successfully.
#
# Usage:  pnpm run deploy:prod   (runs this guard, then `vercel deploy --prod`)
#         bash scripts/deploy-guard.sh   (guard only)
#
# NOTE: use `pnpm run deploy:prod`, not `pnpm deploy` — the latter is a built-in
# pnpm command and will NOT run this guard.
# =============================================================================
set -euo pipefail

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YLW=$'\033[1;33m'; NC=$'\033[0m'
fail() { echo "${RED}✖ DEPLOY BLOCKED:${NC} $1" >&2; exit 1; }
ok()   { echo "${GRN}✔${NC} $1"; }

# Emergency escape hatch (documented in DEPLOY.md). Use only when you understand
# the risk — this is the exact door that caused the incident.
if [ "${DEPLOY_ALLOW_DIRTY:-}" = "1" ]; then
  echo "${YLW}⚠ DEPLOY_ALLOW_DIRTY=1 — safety checks bypassed. You own the outcome.${NC}" >&2
  exit 0
fi

# 1. Must be a git repository.
git rev-parse --git-dir >/dev/null 2>&1 || fail "not a git repository"

# 2. Must be on main (production tracks main).
BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ "$BRANCH" = "main" ] || fail "on branch '$BRANCH' — deploy only from 'main' (run: git checkout main)"
ok "on branch main"

# 3. No uncommitted changes to TRACKED files — the exact failure that caused the incident.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "${RED}Uncommitted changes:${NC}" >&2
  git status --short --untracked-files=no >&2
  fail "commit or stash your changes before deploying"
fi
ok "no uncommitted changes to tracked files"

# 4. Untracked files are NOT deployed — surface them so nobody assumes they are.
UNTRACKED=$(git ls-files --others --exclude-standard || true)
if [ -n "$UNTRACKED" ]; then
  echo "${YLW}⚠ untracked files present (these will NOT be deployed):${NC}" >&2
  echo "$UNTRACKED" | sed 's/^/    /' >&2
fi

# 5. Local main must equal origin/main — deploy only code that is pushed.
git fetch origin main --quiet
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  fail "local main differs from origin/main — push or pull so they match, then deploy"
fi
ok "in sync with origin/main"

# 6. The build must succeed locally before we ship it.
echo "Running production build (this validates the deploy)..."
if ! pnpm build >/tmp/rh-deploy-build.log 2>&1; then
  tail -20 /tmp/rh-deploy-build.log >&2
  fail "build failed — fix it (full log: /tmp/rh-deploy-build.log)"
fi
ok "production build passes"

echo "${GRN}All checks passed — safe to deploy.${NC}"
