---
type: note
status: current
area: process
updated: 2026-09-04
tags:
  - m9
  - ui-ux
  - handoff
---

# M9 Final UI/UX Normalization — Implementation Handoff

**Date:** 2026-09-04  
**Branch:** `M9`  
**Mode:** Presentation architecture pass (no domain/API/schema changes)  
**Human acceptance gate:** Scott  
**Do not merge M9.** Do not mark M9 accepted.

Prompt: [[wip/M9_Final_UI_UX_Normalization_Cursor_Prompt_2026-09-04]]. Durable conventions: [[Design-System]], [[Decisions]], [[Architecture]].

---

## 20.1 Git state

- **Branch:** `M9` (not merged)
- **Starting HEAD:** `8c1385c` — Mini UI/UX update to marketing section about to start
- **Ending HEAD:** `f8a1089` — Document and finalize M9 record-oriented UI UX conventions.
- **Remote:** `origin/M9` — each bounded commit was pushed
- **M9 was not merged**

| Commit | Hash | Message |
|---|---|---|
| A | `af3555f` | Polish shared record selector and workspace navigation hierarchy. |
| B | `40699d1` | Normalize M9 workspace sections, field groups, and record-list hierarchy. |
| C | `f3377bc` | Improve Event workspace form, roster, and process readability. |
| D | `55bfc40` | Apply normalized record-workspace UX across M9 operational screens. |
| E | `f8a1089` | Document and finalize M9 record-oriented UI UX conventions. |

Untracked prompt `vault/wip/M9_Final_UI_UX_Normalization_Cursor_Prompt_2026-09-04.md` was left untracked (inbox contract, not required in git). `.env` was not committed.

Final `git status` after E: clean working tree on `M9`, ahead of / even with `origin/M9` after push.

---

## 20.2 What was implemented

### Shared chrome

| Piece | Change |
|---|---|
| `app/assets/css/main.css` | Record header, identity trigger, compact nav, selector popover, tabs, field groups, form measure, record-list items |
| `AppRecordWorkspace` | `.record-header` surface + `#actions` slot; toolbar class; no extra wrapping `AppPanel` required for identity |
| `AppRecordSelector` | Clickable identity control (eyebrow + name + chevron SVG); status badge adjacent; `#meta` slot; compact Previous/Next icon buttons (`min-h-10`, aria-labels preserved); popover results with Current marker, hover/keyboard highlight, separators |
| `AppRecordTabs` | Tablist sits on a bottom rule; panel attached underneath |
| `AppFieldGroup` | New. Semantic subsection for long forms. Not a nested card |

**Not created:** separate `AppRecordList` / `AppRecordListItem` Vue wrappers. CSS `.record-list` / `.record-item` was enough.

**Consumers updated for chrome (A):** Campaign, Event, Household Lead, Content, Marketing Task, Asset.

### Event workspace (C)

- Overview / Add session / Custom question / Staff registration grouped with `AppFieldGroup` (Identity vs window; When vs Eligibility; Contact vs Participant)
- Roster is no longer a six-column table. Each **registration** is one `.record-item`: contact + processed badge, participants as inner units with attendance + save feedback, duplicate warning block, answers as secondary meta, exclude control
- Process preview rows use the same list language; counts stay a summary line
- Forms use `.form-measure` so short fields do not span the full canvas

### Campaign, Lead, Content, Task (D)

- Campaign Overview grouped: Identity, Ownership, Plan, Dates. Child lists (Content, Tasks, Assets, Tracking, Events) use `.record-list`
- Content Plan grouped: Identity, Publishing. Asset/publication history uses record-list rows
- Marketing Task grouped: Work, Assignment, Related records
- Lead Members use record-list items; Add person grouped Person vs Program. Header contact/source/campaign compressed into selector `#meta`; Edit / Add person / Household workflow remain header actions; toggle editors still expand under identity

**Responsive:** identity wraps; meta uses `break-words` / `break-all` on URLs; actions column `max-w-md` and wraps; roster participant row stacks on narrow screens; tabs still overflow-x.

**Accessibility:** selector keyboard (Arrow/Enter/Space/Escape/Home/End) unchanged; Previous/Next aria-labels kept; attendance selects labeled; focus rings on identity and nav; badges still have text.

**Deviation:** Content/Task/Asset already had selector chrome before this pass; Design-System had said Content was “not selector chrome.” Docs now match the code: focused detail **with** selector, **without** Campaign-style tabs. Lead header still contains toggle-reveal household edit/workflow (accepted inline actions, not a second always-on editor).

---

## 20.3 Selector redesign

**Closed identity.** Record type is an uppercase eyebrow. The name sits in a canvas-backed button with a chevron, hover/open border, and focus ring. It reads as the page title **and** as a control. Status badge sits beside it, not inside the button.

**Popover.** Full-width under the identity (`max-w-[min(36rem,calc(100vw-2rem))]`). Search is the first row. Results are compact rows with a divider, keyboard highlight (`record-selector-option-active`), and a “Current” label plus badge on the open record. Click still `mousedown.prevent` so focus is not stolen before navigate.

**Previous / Next.** No longer full “Previous” / “Next” secondary buttons dominating the left. Icon chevrons to the **right** of the identity, same 40px hit target, disabled at list ends, same `adjacentRecordIds` walk (no wrap). Search-filtered lists still drive neighbors.

**Functionality preserved:** local search of loaded list, `recordTo` navigation, `currentLabel` fallback, loading/empty copy, filtered Lead context, Content `?campaignId=` paths unchanged.

---

## 20.4 QA evidence

Focused during the pass:

- `pnpm exec vitest run tests/m9/record-workspace.test.ts` — **5 passed** (after commit A)

Final gates (commit E):

```text
pnpm test      — 277 passed (56 files)
pnpm lint      — passed (after eslint --fix on Event roster indent)
pnpm typecheck — passed
pnpm build     — passed
```

No new browser/component test framework. No Playwright. Staff click-through of the restyled screens was **not** exercised in a real browser this session (no browser automation in this environment). Scott’s checklist is §20.9.

---

## 20.5 Errors / problems encountered

- PowerShell rejects `&&` in one-liners; commands were sequenced with `;`.
- `git push origin M9` required explicit session approval; pushes then succeeded.
- Commit B is thin on purpose: field-group **CSS** landed in A (same `main.css` as selector chrome); B adds `AppFieldGroup.vue`. Using the primitive starts in C/D.
- Lead header previously duplicated identity (selector name + “Primary contact” block). Compressing to meta is a presentation change; phone/email/source/campaign/UTM/event sessions remain visible. Session names on acquisition events stay in meta.
- Event Roster table → stacked records will look taller on a household with many participants. That is intentional (one registration = one unit). Wide-table scanning is gone.
- `vue/html-indent` failed on Event Roster/Process after the table rewrite (321 errors). `eslint --fix` corrected indent only; markup unchanged.
- Nested `AppPanel` + `.record-list` can still appear on Sessions (edit forms inside a section). Roster itself uses heading + list without a second card wrapper.
- Success `AppAlert` still uses `role="alert"` (pre-existing). Not changed.

---

## 20.6 Thoughts while coding

- The Primary Record Workspace split (index vs `:id`) made this pass possible. The remaining problem was **equal typography**, not missing routes.
- Every workspace had wrapped the selector in `AppPanel` and put Previous/Next as full buttons on the left. Fixing that in three shared components beat restyling six pages independently — until forms, which still live in page templates. `AppFieldGroup` is the reusable piece there.
- Campaign/Event/Task “one giant CSS grid of fields” was the long-form smell. Group titles matter more than another white card.
- Event Roster as a table forced household identity to repeat on every participant row. That is the screenshot problem. Registration-as-unit matches the domain (registration → lines).
- `AppPanel` body inset (`p-6 sm:p-8`) plus an inner `.record-list` (another border) is the nested-card trap. Prefer list-as-surface under a heading when the section **is** the list.
- Selector popover behavior was already good. Visual polish only.
- Content vs Asset many-to-many stays a product question; this pass did not touch it.

---

## 20.7 Suggestions

### Required before M9 acceptance

None from this pass that should block on architecture. **Scott’s browser pass** is the acceptance gate. If Roster/selector/header fail that pass, fix presentation — do not reopen domain.

### Suggested later improvement

- Extract a tiny `AppRecordList` only if a third roster-like surface appears.
- Consider `role="status"` on success alerts (copy-link, attendance Saved).
- Campaign Overview is still a long scroll even grouped; a future pass could split Plan vs Dates without new tabs.
- Session **edit** forms inside the Sessions list are dense; a “view vs edit” toggle per session would reduce noise (behavior change — not this pass).
- Phone-sized selector popover could become a full-screen sheet later if Scott finds the dropdown cramped.

---

## 20.8 Known limitations

- Dashboard, Reports, Users, Catalog, Follow-up queue, Settings were not redesigned.
- Public `/trial` and `/events/:slug` were not restyled.
- No domain, API, schema, permission, or compensation changes.
- Content remains one optional Campaign; Assets remain reusable via `asset_usages`.
- Meta still does not publish Content.
- Household edit / workflow still toggle from the Lead header (accepted inline actions).
- No automated visual regression tests.

---

## 20.9 Scott browser QA checklist

Work as a real user. Login `admin` / `setup`. App http://localhost:5000.

### Record selector (every record type)

- [ ] Closed identity looks clickable (hover/focus), not a naked H1 + triangle
- [ ] Status badge is next to the name, not tangled inside the control
- [ ] Open: search filters the loaded list; current row is marked Current
- [ ] Keyboard: Down/Enter/Space opens; arrows move; Enter selects; Escape closes
- [ ] Previous/Next are secondary chevrons; disabled at ends; do not wrap
- [ ] Long names wrap; they do not crush actions or overflow horizontally

### Campaign `/marketing/campaigns/:id`

- [ ] Index → workspace; New campaign still lands on `:id`
- [ ] Overview field groups (Identity / Ownership / Plan / Dates); Save still works
- [ ] Content / Tasks / Assets / Tracking / Events lists: one row = one record
- [ ] Copy default tracking link notice does **not** collapse the header
- [ ] Performance tab still permission-gated

### Event `/marketing/events/:id`

- [ ] Staff registration: Contact vs Participant grouping; Add to roster works
- [ ] Roster: one block per registration; participant attendance save still shows Saving/Saved
- [ ] Duplicate warning stays visible without taking over the block
- [ ] Processed vs Not processed is obvious; Open household still works
- [ ] Process preview lists people; Process still creates/matches Leads

### Lead `/leads/:id`

- [ ] Members-first; `?line=` still expands a person
- [ ] Filtered Previous/Next from `/leads?...` still uses that list
- [ ] Member cards are distinct units; convert/lost/schedule still work
- [ ] Edit household / Add person / workflow still available

### Content `/marketing/content/:id`

- [ ] Queue → detail; selector switches items
- [ ] Campaign name links back; Back to Campaign when in campaign context
- [ ] Plan groups; attach asset; record publication (no Meta post)

### Marketing Task `/marketing/tasks/:id`

- [ ] Queue → detail; Complete / Cancel / Save
- [ ] Campaign / content / asset / event relations still save

### Viewports

- [ ] Wide desktop: forms stop around `max-w-3xl`, not full ultrawide
- [ ] Laptop: header identity + actions wrap cleanly
- [ ] Tablet: tabs scroll; roster stacks
- [ ] Phone: selector popover usable; no horizontal overflow from URLs

### Empty / loading

- [ ] Missing record empty state; selector still lists others
- [ ] “Loading record…” still appears while the workspace waits

If anything in this list fails, note it in [[wip/note]] — do not treat this pass as accepted until Scott says so.
