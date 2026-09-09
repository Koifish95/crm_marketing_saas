---
type: note
status: current
area: process
updated: 2026-09-04
tags:
  - m9
  - qa
  - handoff
---

# M9 Human QA Corrections — Implementation Handoff

**Date:** 2026-09-04  
**Branch:** `M9`  
**Prompt:** [[wip/M9_Human_QA_Correction_Pass_Cursor_Prompt_2026-09-04]]  
**QA source:** [[wip/archive/M9_Human_QA_Inbox_2026-09-04_to_2026-09-05]]  
**Leftover human work:** [[wip/M9_Remaining_Human_QA]]  
**Human acceptance gate:** Scott  

M9 was **not merged**. M9 is **not marked accepted**.

---

## Git / repository

| Item | Value |
|---|---|
| Branch | `M9` |
| Starting HEAD | `a8d9d23` (`Fixing pain points`) |
| Ending HEAD | `2402398` (`Document M9 acceptance corrections and final QA state.`) |
| Remote | `origin/M9` — this pass pushed each implementation commit, then this handoff |
| Merge | Not merged. Do not merge until Scott accepts. |

### Correction-pass commits

| Hash | Message |
|---|---|
| `ea5b0f9` | Fix M9 acceptance UX feedback, dialogs, and long-link layout. |
| `32da4a2` | Make Event processing transparent and preserve duplicate warnings through Lead creation. |
| `1a63970` | Protect terminal LeadLine outcomes and derive truthful household status. |
| `3b1a09f` | Credit generated-link acquisitions to the configured compensation owner. |
| `17af4de` | Improve Campaign navigation and reusable Asset usage visibility. |
| this commit | Document M9 acceptance corrections and final QA state. |

Working tree after this commit should be clean except local SQLite / `.env` (not committed). `data/renzo.sqlite` was not included.

---

## What was implemented

### Commit A — UX primitives (`ea5b0f9`)

**Changed:** `app/assets/css/main.css`, `app/components/AppConfirm.vue`, `app/components/AppRecordSelector.vue`, `app/pages/trial.vue`, `app/pages/leads/new.vue`, Campaign/Event copy-link notices, Event Roster attendance/exclude row feedback.

**Behavior:**

- Native `dialog:modal` is centered (`margin: auto`); `AppConfirm` also uses `m-auto`.
- Consent copy: public `/trial` “It’s ok to text or call me about this intro.” Staff new lead “OK to text or call” / “OK to email”.
- Copy-link success is a short notice (`Copied the default tracking link.` / `Copied the tracking link.` / `Copied the public URL.`) rendered **outside** header flex so a long URL cannot crush `AppRecordSelector`.
- Event Roster Attendance and Exclude show per-row Saving / Saved / error, disable while in flight, and use `aria-live`. Clearing row feedback avoids dynamic `delete`.

**Deviations:** None material. Selector title used `flex` instead of `inline-flex` so the lookup stays a full-width header control.

**Routes/API:** No new routes. Permissions unchanged.

**Tests:** Existing UI is not Playwright-covered. ESLint `@typescript-eslint/no-dynamic-delete` was fixed in this commit.

### Commit B — Event process + duplicates (`32da4a2`)

**Changed:** `server/services/events.ts`, `shared/schemas/event.ts` (`forceNewRegistrationIds`), `app/pages/marketing/events/[id].vue`, `tests/m9/events.test.ts`.

**Behavior:**

- Public `/events/:slug` still accepts duplicate-looking contact data. No customer warning.
- Staff Roster shows possible-duplicate badges (same-Event registration and CRM household) with match copy and household links.
- Process tab lists actual batch people (not only counts), proposed action, matches, excluded rows, and processed vs not-processed visibility.
- Staff may match an existing household or check “create new instead of matching”.
- Force-create despite CRM matches calls `recordPossibleDuplicates` so the new Lead keeps the warning.
- Copy explains one Event Follow-Up per household.
- Post-process result includes household links.

**Deviations:** Duplicate kinds are `EVENT_REGISTRATION` and `CRM_HOUSEHOLD` in the preview payload. `leadId` typing used `?? undefined` to satisfy `number | undefined` vs `null`.

**Permissions:** Unchanged. Process still requires `PROCESS_EVENT_REGISTRATIONS`. Public routes do not expose staff duplicate text.

**Tests:** `tests/m9/events.test.ts` — same-phone grouping (one follow-up); force-new keeps `lead_possible_duplicates` on the new household.

### Commit C — Terminal lifecycle + aggregate household status (`1a63970`)

**Changed:** `server/services/leads.ts` (`setTrialOutcome`), `shared/utils/labels.ts` (`householdDisplayStatus`, `HOUSEHOLD_STATUS_FILTERS`), `shared/schemas/enums.ts` (`ACTIVE` on `householdStatusFilterSchema`), m8/m3 tests, `tests/m9/household-lifecycle.test.ts`.

**Behavior:**

- `JOINED` / `LOST` LeadLines do not `changeLeadLineStatus` when a leftover Trial is marked ATTENDED / NO_SHOW / CANCELLED. Trial row still updates; pending initial follow-up still cancels.
- Nonterminal lines still move to `TRIAL_ATTENDED` / `NO_SHOW`. Header operational status is not rewritten from a terminal person’s outcome.
- Household display:
  - all nonterminal → **Active** (`ACTIVE`)
  - any terminal + any open → **Active · mixed outcomes**
  - all JOINED → **Joined**
  - all LOST → **Lost**
  - JOINED+LOST only → **Closed · mixed outcomes**
- List/Pipeline filters are those five keys. Old operational query values still parse but no longer match derived household keys.

**Deviations:** Header `leads.status` can still be `NEW` / `TRIAL_SCHEDULED` / `NO_SHOW` for compatibility. UI and `listLeads({ status })` use the derived key. No new persisted household status column.

**Tests:** `tests/m9/household-lifecycle.test.ts` covers all-joined, all-lost, joined+lost, lost+active, joined+lost+active, all-nonterminal Active, leftover Trial on JOINED and LOST, and active-person No-show that must not collapse Active mixed into “No-show”. Related m8/m3 assertions updated.

### Commit D — Compensation tracked-acquisition owner (`3b1a09f`)

**Changed:** `shared/utils/compensation.ts` (`compensation.tracked_acquisition_owner_user_id`), `shared/schemas/app-settings.ts`, `server/services/app-settings.ts`, `server/api/admin/settings.patch.ts`, `server/services/compensation.ts`, `app/pages/settings/index.vue`, `drizzle/seed.ts` (empty key only), `tests/m8/app-settings.test.ts`, `tests/m9/compensation.test.ts`.

**Behavior:**

- ADMIN Settings: **Default tracked-acquisition credit owner**. Empty until configured. Validates an **active** user. Does not hard-code Scott.
- `maybeEstablishSystemCompensation`: if `campaignTrackingLinkId` is present, credit that configured user (`origin = SYSTEM`, method still EVENT/TRACKING_LINK/CAMPAIGN by existing evidence priority). If no tracking link, `creditedUserId` stays null / UNASSIGNED even when `campaignId` or `eventId` is stored as evidence.
- Campaign owner is not read for credit.
- Walk-in / staff lead without generated-link evidence remains unassigned unless ADMIN assigns with a reason.
- Historical SYSTEM rows credited to Campaign owners are **not** rewritten.

**Deviations:** No auto-seed of bootstrap ADMIN. Until Scott sets the owner in Settings, new tracking-link attributions are UNASSIGNED. That is intentional (do not guess Scott’s id).

**API:** `PATCH /api/admin/settings` accepts either `allowEarlyTrialOutcomes` or `trackedAcquisitionOwnerUserId` (partial). GET includes owner id, preview, key, label, description. ADMIN only.

**Tests:** Campaign owner A vs configured owner B; campaign-only evidence unassigned; unset setting leaves tracking-link credit unassigned; setting rejects missing users.

### Commit E — Content/Asset navigation (`17af4de`)

**Changed:** `app/pages/marketing/content/[id].vue`, `app/pages/marketing/campaigns/[id].vue`, `app/pages/marketing/assets/[id].vue`, `shared/utils/content.ts`, `server/services/assets.ts`, `server/database/schema/index.ts` (`assetUsages` campaign relation only — no table migration), `tests/m9/content.test.ts`, `tests/m9/assets.test.ts`.

**Behavior:**

- Content header: `Campaign: [name]` → `/marketing/campaigns/:id`. Toolbar **Back to Campaign** from `?campaignId=` or `item.campaignId`. Campaign workspace links include `?campaignId=`.
- Content remains one optional `campaignId`.
- Asset detail **Used in** lists unique Campaigns and Content from direct assignment plus `asset_usages` (now loaded with names).

**Deviations:** Relation-only Drizzle `with` change; no SQL migration.

### Commit F — Docs (this commit)

Durable notes: [[CRM]], [[Domain-Model]], [[Design-System]], [[Architecture]], [[Decisions]], [[Implementation-State]]. Historical M9 handoffs were not rewritten as if they always described this behavior.

---

## QA evidence

### Final four commands (2026-09-04, after implementation commits A–E; before this docs commit’s extra tests)

```text
pnpm test       → 277 passed (56 files), Duration 303.68s
pnpm lint       → passed (existing Node CJS/ESM experimental warning from ESLint)
pnpm typecheck  → passed (`nuxt typecheck`)
pnpm build      → passed (Nitro “Build complete”)
```

### Focused commands used during development

- Commit C: `tests/m9/household-lifecycle.test.ts` plus m8 household/status/list tests and `tests/m3/crm.test.ts`
- Commit D: `tests/m9/compensation.test.ts`, `tests/m8/app-settings.test.ts`, `tests/m8/app-settings-http.test.ts`
- Commit E: `tests/m9/assets.test.ts`, `tests/m9/content.test.ts`
- Commit B (prior): `tests/m9/events.test.ts`

API/unit tests are not browser QA. Staff click-through of the corrected screens was **not** exercised in a real browser this session.

---

## Errors / problems encountered

- PowerShell does not accept bash `&&`; commands used `;`.
- ESLint `@typescript-eslint/no-dynamic-delete` on Roster row-feedback cleanup; switched to `Object.fromEntries` filter.
- `leadId: number | null` vs `number | undefined` in Event preview matching; coalesced with `?? undefined`.
- After household display became `ACTIVE`, `listLeads({ status: 'NEW' })` in `tests/m3/crm.test.ts` returned empty; filter updated to `ACTIVE`. Operational header `NEW` still exists in the database.
- JOINED/LOST people cannot schedule a **new** Trial (`createTrial` still blocks). The reopen bug is leftover `SCHEDULED` Trials after convert/lost. Tests schedule first, then convert/lost, then record outcome.
- Fake `eventId: 1` in an early compensation test would violate FK; campaign-only evidence is used instead.
- Existing SYSTEM attributions that used Campaign owner were left in place. Local QA data may still show old credit until ADMIN corrects those rows.
- Tracked-acquisition owner is empty after seed/migrate. New generated-link credit is UNASSIGNED until Settings is saved. That is a **required before acceptance** configuration step, not a code defect.

No remaining test, lint, typecheck, or build failures from this pass.

---

## Thoughts while coding

- `householdDisplayStatus` was already the right seam. The bug was falling back to header/person operational status when every line was still open. Coarse Active is a small change with a large QA effect.
- Terminal protection belongs in `setTrialOutcome`, not only the Vue badge. `createTrial` already refused new intros on JOINED/LOST; leftover scheduled rows were the hole.
- Compensation already stored method/evidence separately from `creditedUserId`. Switching the credit lookup from `campaigns.ownerUserId` to an app setting was localized. Campaign/event-without-link staying UNASSIGNED matches Scott’s “only generated links count” rule more strictly than “any campaign evidence credits someone.”
- `asset_usages` already modeled reuse. Staff could not see names because the Drizzle `usages: true` query did not include campaign/content relations. Adding the relation avoided a schema migration.
- Event Process previously summarized counts; Scott needed the same people the Roster showed. Carrying `duplicateWarnings` through preview/execute was more important than a new duplicate table.
- Immediate-save Roster controls without per-row state looked like they did nothing. That pattern should be reused anywhere a select/checkbox PATCHes on change.

---

## Suggestions

### Required before M9 acceptance

1. ADMIN → Settings → set **Default tracked-acquisition credit owner** to Scott (or the intended user). Until then, new tracking-link SYSTEM rows are UNASSIGNED.
2. Scott browser QA using the checklist below. Automated tests did not click the UI.
3. Optional ADMIN correction of **historical** SYSTEM attributions that still name a Campaign owner. There is no backfill in this pass.

### Suggested later improvement

- Dashboard `byStatus` still uses operational header statuses; list/Pipeline use derived household keys. Align if Scott wants one board language everywhere.
- If Scott wants Event/campaign evidence without a tracking link to credit the configured owner, that would reverse the UNASSIGNED rule chosen here — ask before changing.
- Empty-state copy on Settings when the tracked owner is unset (“New tracking-link credit stays unassigned until you choose a user”).
- Playwright coverage for Event Process, household mixed status, and Settings compensation owner.
- Household merge remains out of scope; force-create + `lead_possible_duplicates` is the V1 override.

Do not treat these as in-pass work.

---

## Known limitations

- M9 not accepted; not merged; no production deploy; SQLite remains.
- No historical compensation rewrite.
- Tracked owner is not inferred from bootstrap ADMIN.
- Public Event and `/trial` still do not warn the customer about possible duplicates.
- Content is still one Campaign; Assets are reusable.
- Dashboard pipeline counts were not changed (existing M8 decision).
- No Playwright. No browser verification this session.
- Meta V1 still read-only; app still runs without Meta credentials.

---

## Scott browser QA checklist

### Household

- [ ] All nonterminal people → household **Active**, not New / Trial scheduled / No-show.
- [ ] JOINED + open person → **Active · mixed outcomes**.
- [ ] LOST + open person → **Active · mixed outcomes**.
- [ ] All JOINED → **Joined**. All LOST → **Lost**. JOINED+LOST only → **Closed · mixed outcomes**.
- [ ] JOINED + LOST + active person → **Active · mixed outcomes**.
- [ ] Record No-show on the remaining active person: household stays **Active · mixed outcomes**, not **No-show**. Person card may say No-show.
- [ ] JOINED + LOST household; record leftover Trial ATTENDED or NO_SHOW: people stay JOINED/LOST; household stays **Closed · mixed outcomes**. Reverse conversion / reopen still required to put them back in pipeline.
- [ ] `/leads` filters Active / mixed / Joined / Closed mixed / Lost match those headlines.

### Event

- [ ] Public `/events/:slug` accepts a second registration with the same phone; no customer duplicate warning.
- [ ] Staff Roster badges same-Event and CRM household matches; links open the household.
- [ ] Attendance / Exclude: Saving then Saved (or error) on that row.
- [ ] Process tab lists people, not only counts; processed vs not-processed is obvious.
- [ ] MATCH / NEW / AMBIGUOUS / ALREADY_PROCESSED remain understandable.
- [ ] Deliberate “create new instead of matching” still processes; resulting Lead shows Possible duplicate with a link.
- [ ] One Event Follow-Up per household (copy + actual task).

### Campaign / Content / Asset

- [ ] Copy Draft tracking link: confirm if prompted; short “Copied…” notice; header/selector does not collapse.
- [ ] `AppConfirm` dialogs are centered.
- [ ] Content detail header `Campaign: [name]` opens `/marketing/campaigns/:id`.
- [ ] From Campaign Content tab, Back to Campaign returns to that Campaign.
- [ ] Asset detail **Used in** lists Campaigns and Content (direct assignment and usages) with working links.
- [ ] Content still has a single Campaign selector, not many-to-many.

### Compensation

- [ ] Settings: choose Scott as Default tracked-acquisition credit owner; Save.
- [ ] Campaign owned by user A; generated tracking link; new public/staff attributed line credits **Scott (B)**, origin SYSTEM.
- [ ] Walk-in / no generated link stays Unassigned until ADMIN assigns with a reason.
- [ ] ADMIN correction still requires a reason; earned snapshot at Joined does not change when the offering price later changes.
- [ ] Pre-existing SYSTEM rows that named a Campaign owner are unchanged until manually corrected.

---

## Stop / product notes

No genuine product contradiction required stopping. Ordinary choices:

- Coarse **Active** instead of echoing person operational status.
- Tracking-link-only SYSTEM credit; no Campaign-owner fallback.
- Empty tracked-owner setting rather than seeding the first ADMIN.
- Force-create Event households persist existing `lead_possible_duplicates` rather than a new table.
