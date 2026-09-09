---
type: note
status: current
area: ui
updated: 2026-09-08
tags:
  - marketing
  - campaigns
  - handoff
---

# Campaign workspace Overview + Edit — implementation results

Source prompt: [[wip/Campaign_Workspace_UI_UX_Redesign_Cursor_Prompt_2026-09-08]]. Durable rules: [[Design-System]], [[Implementation-State]]. Friendly URLs already on `working`: [[wip/Friendly_Campaign_Tracking_Links_Implementation_Results_2026-09-08]].

## Starting State

- **Branch:** `working` (tracks `origin/working`)
- **HEAD when this pass started:** `d67bf8b` (“Record friendly-tracking commit hash in the results handoff.”)
- **Relevant dirty work left out:** `data/renzo.sqlite`; `vault/Deploy-Workflow.md`; `vault/Koi-Pi-Infrastructure.md`; untracked prompts `vault/wip/Campaign_Workspace_UI_UX_Redesign_Cursor_Prompt_2026-09-08.md` and `vault/wip/Assets_and_Content_UI_UX_Redesign_Cursor_Prompt_2026-09-08.md`.

## Original Problems

Campaign Overview for managers was a permanent `.form-measure` editor: identity, owner, checkbox collaborators/programs, four datetime fields, and a small Save at the bottom. The page read as a database form. Viewers saw a one-line description. Header copy said “Copy default tracking link.” There was no at-a-glance brief.

## Final Header

- **Identity:** `AppRecordSelector` name + prev/next unchanged.
- **Status:** existing badge on the selector (`Draft` / `Planned` / `Active` / `Completed` / `Cancelled`).
- **Metadata:** kind · planned date range (Denver date-only via `toBusinessDate`) · attributed household count · planned budget (`$0.00 planned` vs `No planned budget`).
- **Tracking-link action:** **Copy campaign link** copies the friendly `origin/t/{publicSlug}` URL (`publicUrl` / `friendlyTrackingPath`). Non-ACTIVE still uses `AppConfirm`.
- **Edit:** **Edit campaign** (`MANAGE_CAMPAIGNS`) sets local `overviewEditing`, jumps to `?tab=overview` if needed, and loads the current record into the form.
- **More:** **Mark completed** and **Cancel campaign** (explicit label + confirm). Hidden when already `CANCELLED`. Discard changes is not in More.

## Overview

Default is a read-only brief (managers and viewers). Not `.form-measure`.

- **Campaign Plan:** objective, offer, target audience, programs as compact text, optional primary channel, description as wrapping text. Empty fields: “Not set”. Notes behind **Show notes**.
- **Ownership:** owner or Unassigned; collaborator names or “No collaborators assigned”. No Campaign publisher (not in the model).
- **Schedule:** Planned and Actual as human date ranges; “Present”/“open” when an end is missing.
- **Activity:** counts from already-loaded lists, each linking to the matching `?tab=` (Content, open Tasks, Assets, Events, Tracking, Performance).
- **High-level metrics:** attributed households, Joined line count from `leads[].lines[].status`, planned budget. No Performance API fetch on Overview; no Meta spend duplicate.

## Edit Mode

- **Activation:** header **Edit campaign**; same route; local boolean (not `?edit=`).
- **Field grouping:** Identity, Ownership, Campaign plan, Schedule (`AppFieldGroup`).
- **Program selection:** tappable chips with `aria-pressed`; selected uses navy fill + white text, not color-only.
- **Collaborator selection:** removable chips + **Add collaborator** `<select>` of remaining users. Not a permanent checkbox grid.
- **Owner:** existing single `<select>` (Unassigned + people). Not compensation owner.
- **Budget:** same USD text field; `$0` remains valid.
- **Plan fields:** objective, offer, audience, description, notes.
- **Dates:** four `datetime-local` fields, two-column from `sm`, stacked on phone.
- **Save/discard:** **Save changes** (same PATCH payload as before, then exit edit); **Discard changes** resets from the loaded campaign and returns to the brief. Labels do not say “Cancel”.
- **Status:** full enum select remains in Edit (server has no transition machine). Terminal **Cancel campaign** also in More so it is not confused with discard.

## Mobile

Actions wrap (`record-header-actions` already `flex-wrap`). Overview is one column below `lg`. Seven sections stay on the existing phone Section `<select>` (`AppRecordTabs` when `tabs.length > 4`). Program chips and collaborator add/remove use `min-h-11` targets.

## Desktop

`lg` two-column brief: Plan + Activity on the main column; Ownership, Schedule, Tracking one-liner on the side. Edit uses two-column field groups from `sm`. Desktop tablist unchanged.

## Components / Files Changed

- `app/pages/marketing/campaigns/[id].vue` — header, Overview brief, Edit mode
- `shared/utils/time.ts` — `toBusinessDate` (America/Denver date-only)
- `vault/Design-System.md`
- `vault/Implementation-State.md`
- this results note

Index, `/new`, Content/Tasks/Assets/Tracking/Events/Performance tab bodies, APIs, and schema were not changed.

## QA

```text
pnpm test       321 passed (64 files). Duration ~341s.
pnpm lint       fails only on pre-existing @stylistic/brace-style in
                shared/utils/id.ts and tests/m10/client-id.test.ts
                (not part of this redesign).
pnpm typecheck  passed.
pnpm build      passed.
```

This Cursor session had no browser MCP. Campaign Overview/Edit was not click-tested at desktop or ~390px.

```text
CODE-VERIFIED
AUTOMATED-TESTED
HUMAN-QA-PENDING
```

## Git

- Starting HEAD: `d67bf8b`
- Commit: `feat(marketing): redesign campaign workspace overview and editing UX`
- Push result and final HEAD recorded after `git push origin working`.

## Deviations

- No Campaign-level publisher (Content-only in schema).
- Overview metrics use GET campaign + already-fetched related lists; Performance tab remains the detailed report (no Meta spend on Overview).
- Friendly copy URL was already implemented; this pass promotes it as **Copy campaign link** in the header.
- Date-only header/schedule labels added `toBusinessDate` in `shared/utils/time.ts` so Vue does not do timezone math.

## Remaining Issues

- Staff click-through of brief vs edit, save/discard, copy friendly link, program chips, collaborator add/remove, More status actions, and phone section navigation is still Scott’s human QA.
