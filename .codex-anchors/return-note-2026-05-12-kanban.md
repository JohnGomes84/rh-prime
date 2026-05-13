Kanban return note - 2026-05-12

Context:
- Installed `@openai/codex` globally.
- Installed `vercel/vercel-plugin` for Codex at user scope.
- Installer reported success and asked to restart agent tools to load the plugin.

Kanban work completed:
- Anchoring snapshot saved at `.codex-anchors/kanban-anchor-2026-05-12.patch`.
- Permissions fixed:
  - `public` boards are viewer-only for non-members.
  - `team` boards require `departmentId` and allow same-department viewing.
- Board members:
  - Added candidate listing endpoint.
  - Added member management dialog in UI.
- Board settings:
  - Added dialog to edit name, description, color, visibility, department.
  - Added archive board action.
- Card details:
  - Real assignees shown with names/avatar fallback.
  - Labels editable in drawer.
  - Checklist implemented in drawer.

Validation status:
- `pnpm exec vitest run server/routers/kanban.test.ts` passed.
- `pnpm exec tsc --noEmit` passed.
- `pnpm build` still had pre-existing non-kanban failures:
  - analytics env placeholders in `index.html`
  - `Buffer` import issue in `client/src/pages/SignContracts.tsx`

Bug fixed during session:
- React hooks order error in `client/src/pages/KanbanBoard.tsx` was fixed by moving hook-derived values above conditional returns.

Important schema note:
- Checklist uses new table `kanban_checklist_items` in `drizzle/schema-kanban.ts`.
- Migration for this new table has NOT been created yet.

Recommended next step when returning:
1. Create the SQL migration for `kanban_checklist_items`.
2. Restart agent tools/session so the Vercel plugin loads.
3. Optionally continue kanban with comments/history or subtasks beyond checklist.
