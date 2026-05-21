# AI Agent Setup

This project is being used with both Codex and Claude. The main failure mode is not the repository itself; it is different agent runtimes reading different home directories, credentials, and plugin state.

## Single Source Of Truth

Use this split:

- Project state: `C:\rh-prime`
- Codex user state: `%USERPROFILE%\.codex`
- Claude project state: `C:\rh-prime\.claude`
- Secrets and auth: user-level only, never committed to the repo
- Shared project context: `AGENTS.md`
- Claude project context entrypoint: `CLAUDE.md`
- Shared project MCP manifest: `.mcp.json`

Do not treat MCP login as a project file. It is a user-environment concern.

## Non-Hacky Model

The stable model for using both agents is:

- one checked-in project context file
- one checked-in project MCP manifest when the server is safe to declare publicly
- user-level credentials for each agent
- local project settings kept local

That means:

- `AGENTS.md` is the canonical project memory file
- `CLAUDE.md` points Claude to the same project memory
- `.mcp.json` gives Claude a native project-scoped MCP declaration
- Codex keeps auth and MCP persistence in `%USERPROFILE%\.codex`

This avoids fake synchronization between tools. Each agent uses its own native configuration model, but both read the same project context.

## What Broke Here

In this environment, Codex was able to run from a sandbox home:

- normal user home: `C:\Users\WINDOWS\.codex`
- sandbox home: `C:\Users\CodexSandboxOffline\.codex`

That causes symptoms like:

- `codex mcp list` showing different servers depending on where Codex started
- `codex mcp login vercel` not persisting where you expect
- plugins appearing installed in one context and missing in another
- Claude and Codex seeing the same repo but different tool/auth state

## Standard Workflow

Always start from `C:\rh-prime` in your normal interactive terminal session.

### Codex

Check the active home:

```powershell
echo $env:CODEX_HOME
```

If it is blank, Codex should default to `%USERPROFILE%\.codex`. If it points to a temporary or sandbox user, stop and switch terminals.

Recommended checks:

```powershell
codex mcp list
codex doctor
```

### Vercel MCP

Register once in your normal user profile:

```powershell
codex mcp add vercel --url https://mcp.vercel.com
codex mcp login vercel
```

If the add command says the server already exists, that is fine.

For Claude, the repository now also contains a project-scoped `.mcp.json` entry for Vercel. That makes the server definition part of the project instead of hidden in one local machine.

### Claude

Keep project-specific behavior in:

```text
C:\rh-prime\.claude\
```

This directory is already ignored by Git in this repository, which is the right choice for local agent settings.

## Project Rule

Use this order when something looks inconsistent:

1. Confirm which Windows user is running the terminal.
2. Confirm `CODEX_HOME`.
3. Run `powershell .\scripts\doctor-agents.ps1`.
4. Re-run `codex mcp list`.
5. Only after path/state is correct, re-run login commands.

## Quick Commands

```powershell
powershell .\scripts\doctor-agents.ps1
powershell .\scripts\doctor-agents.ps1 -VerboseChecks
powershell .\scripts\start-codex.ps1
powershell .\scripts\start-claude.ps1
codex mcp list
codex mcp get vercel
codex mcp login vercel
```

## Practical Rule For This Repo

When using both Claude and Codex:

- use Codex for user-level auth, MCP registration, and plugin validation
- use Claude project config only for repo-local behavior
- avoid doing login/setup from sandboxed agent contexts when you expect the result to persist in your normal desktop terminal

## Launchers

Use the project launchers instead of invoking the agents from arbitrary directories:

```powershell
powershell .\scripts\start-codex.ps1
powershell .\scripts\start-claude.ps1
```

What they do:

- `start-codex.ps1`: forces `CODEX_HOME` to `%USERPROFILE%\.codex` and starts Codex with `--cd C:\rh-prime`
- `start-claude.ps1`: starts Claude from `C:\rh-prime` and defaults `CLAUDE_HOME` and `CLAUDE_CONFIG_DIR` to `%USERPROFILE%\.claude`

You can still pass extra arguments through:

```powershell
powershell .\scripts\start-codex.ps1 -- model gpt-5.5
powershell .\scripts\start-claude.ps1 --resume
```

The launchers are convenience only. The real fix is the repository structure:

- `AGENTS.md`
- `CLAUDE.md`
- `.mcp.json`

These are the durable pieces that keep both agents aligned.
