---
type: note
status: current
area: ui
updated: 2026-09-08
tags:
  - marketing
  - tasks
  - handoff
---

# Marketing Task workspace UX — implementation results

Source prompt: [[wip/Marketing_Task_Workspace_UI_UX_Redesign_Cursor_Prompt_2026-09-08]]. Durable rules: [[Design-System]], [[Implementation-State]]. Do not treat this prompt as the map.

## Starting State

- **Branch:** `working` (tracks `origin/working`)
- **HEAD when this pass started:** `436e1cb` (“Up to date”)
- **Relevant dirty work left out:** untracked prompt `vault/wip/Marketing_Task_Workspace_UI_UX_Redesign_Cursor_Prompt_2026-09-08.md`.

## Original Problems

`/marketing/tasks/:id` was a permanent `.form-measure` editor: every field plus Save / Complete / Cancel as equal footer buttons. Opening a task did not answer what to do, who owns it, when it is due, or what it is related to without reading a form. `#actions` was unused. `completedAt` already came back from GET and was ignored. Asset and Content relations loaded `{ id, title/displayName }` only.

The index always showed a create form above the queue, so the first thing staff saw was a form, not the work list.

## Final Header

- **Identity:** `AppRecordSelector` + prev/next unchanged. Toolbar **All tasks**.
- **Status:** selector badge (`Open` / `Completed` / `Cancelled` via `taskStatusLabel`).
- **Metadata:** type · due-state badge with text (`Overdue` / `Due today` / `Upcoming`) plus due datetime · assignee · Campaign name link. When `COMPLETED`, completed time from `completedAt` replaces the due-state pair.
- **Complete task:** primary in `#actions`, `MANAGE_MARKETING_TASKS`, only if `PENDING`. PATCH `{ status: 'COMPLETED' }`.
- **Edit:** local `taskEditing`; loads the current row into the form. Hidden while already editing.
- **More:** **Cancel task** (destructive `AppConfirm`, then PATCH `{ status: 'CANCELLED' }`). Hidden when already `CANCELLED`. Discard is not in More and is never labeled Cancel.
- **Viewers:** brief only; no Complete / Edit / More.

## Default Task / Assignment / Related Work / Notes

Not `.form-measure`. Phone: one column. Desktop from `lg`: main Task + Related work + Notes; side Assignment.

- **Task:** type badge (`marketingTaskTypeLabel`) and description, or “No description provided”.
- **Related work:** Campaign / Content / Asset / Event as named staff links, or “Not linked”.
- **Notes:** wrapping text, or “No notes”.
- **Assignment:** assignee (or Unassigned), due datetime, status badge plus due-state badge when present.

## Related-record previews

- **Asset:** compact `AppAssetMediaCard` (`max-w-xs`) when linked. GET `asset` now includes `mediaType`, `marketingUseStatus`, `archived`, and campaign name (no migration).
- **Content:** title link, status badge, content’s campaign name, planned publish if present. Optional thumb from already-fetched `/api/marketing/assets` mapped by `contentItemId` (same cheap join as the Content queue). Caption body is not embedded. GET `contentItem` now includes `status`, `plannedPublishAt`, and nested campaign.

## Edit Mode

- **Activation:** header **Edit**; same route; local boolean (not `?edit=`). Watch on the loaded task does not clobber in-progress edits.
- **Groups:** Task (title, type, description), Assignment (assignee, due), Related work (campaign / content / event `<select>`s; Asset via **Choose media** → existing `AppAssetPicker` + clear), Notes.
- **Save/discard:** **Save changes** (same PATCH fields as before, without forcing a status change) then exit edit; **Discard changes** resets from the loaded row and returns to the brief.
- Campaign `<select>`s were not replaced with a searchable Campaign control.

## Action Hierarchy

1. **Complete task** (header, PENDING).
2. **Edit** → Save changes / Discard changes.
3. **More** → Cancel task (confirm).

Reassign and change due stay in Edit. No reopen control (none existed). Creator remains on GET and is not shown.

## Phone Layout

`#actions` wrap via `.record-header-actions`. Brief is a single column below `lg`. Create dialog is a native `<dialog>` like Content. Picker is the existing phone-friendly `AppAssetPicker`.

## Desktop Layout

From `lg`, Assignment sits in a side column. Edit uses `AppFieldGroup` two-column fields from `sm`. Selector popover unchanged.

## Task-index Changes

Filters (overdue / due today / upcoming / all) and card/table scan order are unchanged. The always-on create form moved into header **New task** (`showModal`; title, type, due, assignee, campaign; then navigate to `:id`). Description: “Open a task to work it. This list is separate from Lead Follow-up phone calls.”

## Components / Files Changed

- `app/pages/marketing/tasks/[id].vue` — header, brief, Edit, Complete / Cancel
- `app/pages/marketing/tasks/index.vue` — New task dialog
- `server/services/marketing-tasks.ts` — shared `taskWith` for list + GET (wider asset/content columns)
- `vault/Design-System.md`
- `vault/Implementation-State.md`
- this results note

No schema/migration. PATCH contracts unchanged. Campaign/Content/Asset pages, Follow-up `/tasks`, Meta, and M10 were not changed.

## QA

```text
pnpm test       321 passed (64 files). Duration ~336s.
pnpm lint       fails only on pre-existing @stylistic/brace-style in
                shared/utils/id.ts and tests/m10/client-id.test.ts
                (not part of this redesign).
pnpm typecheck  passed.
pnpm build      passed.
```

This Cursor session had no browser MCP. Marketing Task brief/Edit, Complete / Cancel task, related links, asset picker, and the New task dialog were not click-tested at desktop or ~390px.

```text
CODE-VERIFIED
AUTOMATED-TESTED
HUMAN-QA-PENDING
```

Not **BROWSER-VERIFIED**.

## Git

- Starting HEAD: `436e1cb`
- Commit: `feat(marketing): redesign marketing task workspace UX` (`69586fd`)
- Ending HEAD: `69586fd` on `working` (push follows).

## Deviations

- Reassign / change due live in Edit, not extra More dialogs.
- No reopen control (none exists today).
- Creator is on GET but not shown.
- Due is required in schema; “no due date” is not supported.
- GET `with` widened for the asset card and content preview (no schema/migration). Complete/Cancel from the header PATCH `{ status }` only; Edit save still sends the field payload without forcing status.

## Remaining Issues

- Staff click-through of brief vs edit, Save/Discard, Complete task, Cancel task, related Campaign/Content/Asset/Event links, asset picker, completed-time header, viewer-only brief, and New task dialog (phone and desktop) is still Scott’s human QA.
