# Renzo Gracie Kaysville — M9 Stabilization and Human-QA Readiness Handoff

**Date:** 2026-09-03  
**Project:** Renzo Gracie Kaysville Acquisition  
**Branch:** `M9`  
**Audience:** Scott, plus a separate ChatGPT instance that will discuss this system conversationally  
**Purpose:** Record what the stabilization pass **actually changed**, how M9 **actually operates now**, what remains incomplete, and how to run human QA.

This document is based on repository inspection of the `M9` working tree on 2026-09-03. It is **not** a restatement of the stabilization prompt. Human acceptance has **not** occurred. M9 has **not** been merged.

---

## 1. Executive summary

The M9 Collaborative Marketing Operations architecture was already implemented in committed checkpoints M9.0–M9.7 (`d99df00` through `b398b8c`). The stabilization pass did **not** add a new milestone. It surfaced backend capabilities that staff previously could only reach through APIs, and tightened a few operational UX gaps so Scott can start a realistic end-to-end human QA pass.

### What the pass accomplished

On this machine, the working tree now lets staff:

- Assign campaign **collaborators** and **programs**, and edit **planned/actual dates**, **channel**, and **budget** in the Campaigns UI.
- Create and edit Marketing Tasks with links to a Campaign, Content Item, Asset, and Event; complete or cancel them.
- Move Content through guided lifecycle actions (Idea → Needs assets / Draft / Approve / Ready to publish / Cancel), set **planned manual publish time**, attach assets, and pick a publication channel.
- Record a **meaningful restriction reason** before Restrict / Do Not Use; open asset files; associate assets with campaign/content.
- Set Event **campaign**, **registration open/close**, edit the Event and Sessions, cancel an Event, show roster answers/source/notes, and **opt in cancelled registrations** to batch preview/process.
- Assign/correct **LeadLine compensation attribution** on the household Lead page, with required reason and visible history.

### Major changes (actual)

| Area | Change |
|---|---|
| Lead detail | New Compensation Attribution panel (ADMIN or `MANAGE_COMPENSATION_ATTRIBUTION`) |
| `/marketing/campaigns` | Collaborators, programs, dates, channel, editable budget |
| `/marketing/tasks` | Related-record pickers, description/notes, save/complete/cancel |
| `/marketing/content` | Edit, lifecycle buttons, planned publish, attach asset, channel picker |
| `/marketing/assets` | Description, campaign/content links, restriction note, open file |
| `/marketing/events` | Campaign + windows on create; event/session editors; cancelled-include |
| Services/schema | Task relations loaded; compensation loaded on `getLead`; asset relations |

### Is M9 ready for human QA?

**READY FOR HUMAN QA on this local working tree**, with caveats below. That means Scott can start formal acceptance testing of the screens in this checkout. It does **not** mean M9 is accepted, merged, or production-ready.

### Remaining blockers / process risks (not product-feature blockers)

1. **Stabilization UI is not committed.** `origin/M9` HEAD is still `b398b8c`. The 12 code files listed in Git state exist only in the working tree. Another machine that `git pull`s `M9` will **not** have this UI until commit + push.
2. **This pass did not re-run** `pnpm test`, `pnpm lint`, or `pnpm build`. Only `pnpm typecheck` was executed successfully after a badge-type fix.
3. **No browser QA by Cursor** in this documentation pass. `pnpm dev` may be running locally; Scott must exercise the UI.
4. **`data/renzo.sqlite` has been staged at times.** Do not commit it.

### Intentionally deferred

- `MANAGE_MARKETING_CONFIGURATION` still unused; compensation basis/BPS has no settings UI.
- Tracking-link delete and UTM edit after create.
- Auto-deriving campaign actual dates from status changes.
- Meta writes / scheduled social publishing.
- SMS/email send (communication intents remain records only).
- Command-center redesign (overview API already returned more than the page shows; page was **not** changed this pass).
- System restart/shutdown UI already exists under Settings; not part of this pass.
- Generalized capability inheritance / SaaS tenancy / PostgreSQL.

---

## 2. Git state

| Item | Value |
|---|---|
| Branch | `M9` |
| HEAD | `b398b8cd559304d4ad00f50de8a0d7f7e855ce6d` (`b398b8c`) |
| Message at HEAD | `Record M9 QA results and the Collaborative Marketing Operations handoff.` |
| Upstream | `origin/M9` — **up to date** (no unpushed commits of the stabilization UI) |
| Merge to `master`/`main` | **Not merged.** Merge-base with `master` is `32b640f` (M8 merge). |
| Stabilization commits | **None.** No commit was created for the code pass. |

### M9 commits already on origin (chronological, oldest first)

These are the **original M9 implementation** commits, not this stabilization slice:

| Hash | Message |
|---|---|
| `7572920` | Initial M9 branch commit |
| `77a0064` | Removing sqlite files from gitignore to move over to laptop |
| `d99df00` | Add User Types, User Roles, and Access Rights with ADMIN safety. |
| `4aa012e` | Expand Marketing Campaigns with lifecycle, ownership, and destinations. |
| `b6dd059` | Add a Marketing Task queue separate from Lead Follow-up. |
| `460fdf9` | Add content planning with optional approval and publication history. |
| `2749d8f` | Add marketing asset library with disk storage and marketing-use controls. |
| `8e93ccd` | Add Acquisition Events with roster, public signup, and batch Lead processing. |
| `05d78e2` | Add Compensation Attribution and a JOINED earned snapshot ledger. |
| `b6b6ff0` | Add a Marketing command center with labeled Meta, CRM, and attributed outcomes. |
| `b398b8c` | Record M9 QA results and the Collaborative Marketing Operations handoff. |

### Working tree (2026-09-03 inspection)

**Stabilization code (uncommitted at inspection; ~1,629 insertions / 40 deletions):**

- `app/pages/leads/[id].vue`
- `app/pages/marketing/assets.vue`
- `app/pages/marketing/campaigns.vue`
- `app/pages/marketing/content.vue`
- `app/pages/marketing/events/[id].vue`
- `app/pages/marketing/events/index.vue`
- `app/pages/marketing/tasks.vue`
- `server/database/schema/index.ts` (Drizzle relations only; **no new migration**)
- `server/services/assets.ts`
- `server/services/leads.ts`
- `server/services/marketing-tasks.ts`
- `shared/types/crm.ts`

**Also seen staged or present in wip (not the application product):**

- `data/renzo.sqlite` — local gym database. **Do not commit.**
- Stabilization prompt, earlier operational handoff, and this results file under `vault/wip/`

**Intentionally left uncommitted at code-inspection time:** the 12 application files. The original prompt asked for commits after each slice and a push at the end. That git workflow was **not completed** for the UI pass. Scott should commit the 12 code files (not sqlite) when he wants `origin/M9` to match what he is testing.

This results document and the two training guides are created in `vault/wip/` as required by the prompt.

---

## 3. Implementation results

For each area: what the **committed M9** already had, what **this working-tree pass** changed, and what still is not in the UI.

### Access Rights / Permissions

**Requested:** ADMIN can configure STAFF without API knowledge.  
**Implemented (committed M9.0):** `/settings/access`, `/users` User Type + extra roles, server `requireAccessRight`, ADMIN bypass.  
**This pass:** **no code change.**  
**Tested this pass:** no.  
**Manually unverified.**

### Campaigns

**Requested:** usable planning UI, not API-only columns.  
**Implemented before:** create/edit name, kind, status, owner, objective, offer, audience, notes, tracking-link add/copy.  
**This pass:** create/edit also send `channel`, `budgetCents`, `startsAt`/`endsAt`/`actualStartsAt`/`actualEndsAt`, `collaboratorUserIds`, `programIds`. Name and budget are editable after create.  
**Not auto:** status `ACTIVE` does **not** stamp actual start; `COMPLETED` does **not** stamp actual end. Dates are staff-entered.  
**Tested this pass:** typecheck only.

### Campaign collaborators

**Requested:** view/add/remove; distinguish owner from collaborators.  
**Implemented:** checkbox lists on create and save; display “Collaborators: …” for non-managers. Owner remains a separate select. Saving replaces the collaborator set (same as the existing `replaceCollaborators` API).  
**Difference from a dedicated “add/remove one person” UI:** it is a multi-select saved with the campaign, not a per-row add/remove API.

### Campaign Program associations

**Requested:** zero, one, or many programs from the catalog.  
**Implemented:** checkboxes against `GET /api/programs`, saved as `programIds`. Empty is valid.

### Campaign dates

**Requested:** planned vs actual, meaning kept clear; derive actual from lifecycle if already safe.  
**Implemented:** four datetime-local fields labeled Planned start/end and Actual start/end.  
**Not implemented:** derivation from lifecycle. Existing `updateCampaign` already stored whatever dates were sent; auto-stamping was **not** the prior design, so it was **not** added.

### Marketing Tasks

**Requested:** links to Campaign, Content, Asset, Event; a task should lead to the work.  
**Implemented:** create + inline edit for those FKs; description and notes; Complete and Cancel; links to `/marketing/content`, `/marketing/assets`, `/marketing/events/:id`.  
**Server:** `listMarketingTasks` / `getMarketingTask` now include `contentItem`, `asset`, `event` relations; FK existence is validated on create/update.  
**Schema:** Drizzle relations added in `server/database/schema/index.ts` (no SQL migration; columns already existed from M9.2).

### Content lifecycle

**Requested:** Idea, Needs Assets, Draft, Needs Review, Approved, Ready to Publish, Published, Cancelled; guided actions; no Scheduled.  
**Implemented:**

| Status | How staff get there |
|---|---|
| IDEA | Default on create unless “Approval required” |
| NEEDS_REVIEW | Create with approval checkbox |
| NEEDS_ASSETS | Button when status is IDEA |
| DRAFT | Button when not already Draft/Published/Cancelled |
| APPROVED | Approve button (`POST .../approve`) when approval required and not yet approved |
| READY_TO_PUBLISH | Ready to publish button (PATCH status) |
| PUBLISHED | Record publication |
| CANCELLED | Cancel button |

**Not a full wizard:** there is no dedicated “Needs Review” button after create. Staff cannot pick an arbitrary status from a dropdown (good). `NEEDS_REVIEW` after the fact is not a named button. Server still accepts any `contentStatusSchema` value on PATCH.

**No Scheduled** — confirmed.

### Planned publication

**Requested:** surface `plannedPublishAt` as intended **manual** time, not Meta schedule.  
**Implemented:** create + edit datetime-local; copy “Planned manual publish time”.  
**Display caveat:** list uses `toLocaleString()` (browser local), not `shared/utils/time.ts` Denver helpers.

### Assets and marketing-use

**Requested:** Unknown/Approved/Restricted/Do Not Use; meaningful restriction reasons; not legal consent.  
**Implemented:** restriction textarea; UI refuses Restrict or Do Not Use if note is shorter than 3 characters (no generic manufactured reason). Server still **only requires** a note for `RESTRICTED`, not for `DO_NOT_USE`. Open file via `/api/marketing/assets/:id/file`. Description, campaign, content item editable. Attach also from Content page.

### Acquisition Events / Sessions / windows / roster / attendance / batch

**Requested:** end-to-end Event workflow; windows visible; cancelled rows only with explicit intent.  
**This pass:**

- Create: campaign, registration opens, registration closes.
- Detail: edit title, description, campaign, program, windows; Cancel event; session create/edit (ends, program, min/max age, capacity, active).
- Roster: source, notes, custom question answers, line notes.
- Batch: checkbox **Include cancelled** per cancelled attendance row; sent as `includeCancelledRegistrationIds`. Default batch still ATTENDED + NO_SHOW only.

**Already implemented (committed, unchanged this pass):** public `/events/:slug`, staff registration, attendance select, exclude-from-processing, preview, ambiguous household picker, process, Follow-Up `EVENT_FOLLOW_UP`, no Trial on process, idempotent re-run.

### Duplicate / existing Lead handling

**Unchanged this pass.** Preview outcomes NEW / MATCH / AMBIGUOUS / ALREADY_PROCESSED. Multiple phone/email matches require explicit household id. No silent merge. Existing household campaign id is preserved (`preservedCampaignId` in history).

### Attribution

**Unchanged this pass** except Lead-detail now **shows** compensation next to the person. Acquisition campaign still lives on LeadHeader from tracking link / public trial / event registration.

### Compensation Attribution / corrections / history / ledger

**Requested:** ADMIN UI at LeadLine; auto + manual; required reason; immutable history; no destructive history edit.  
**Implemented:** panel on `/leads/:id` expanded person details. POST `/api/marketing/compensation/:leadLineId`. History listed read-only. Ledger page `/marketing/compensation` **unchanged** (earned snapshots + Mark paid only).

**Important actual behavior:** `snapshotCompensationEarned` does **not** rewrite an existing earned row. Correcting the credited user **after** a JOINED snapshot updates attribution + history, **not** the ledger amount/owner. If JOINED happened with no eligible owner, a later assignment can create the first snapshot (handler calls snapshot when an active conversion exists and none is stored).

### Marketing command center

**This pass: no file change** to `app/pages/marketing/index.vue` or `marketing-overview.ts`.  
Still shows overdue task count, content needing review/assets/ready, active campaign count, approaching dates count, upcoming events, campaign outcomes table, area links.  
API already computes `upcomingPublications` and approaching campaigns with dates; the page **does not list** upcoming publications by title. Compensation tile is in `areas` only if the user can open `/marketing` (VIEW_MARKETING); the compensation **route** still requires `VIEW_MARKETING_REPORTS` on GET.

### Navigation and UX

- Related-record links on tasks.
- Guided content buttons instead of a raw status dropdown.
- Event registration availability is visible as open/close timestamps + existing Close registration toggle.
- Compensation explanation copy on Lead detail: credit is not household source and not follow-up assignee.
- Command center next-action cards were already there; **not improved** this pass (no new badges for unprocessed registrations).

---

## 4. Backend-only functionality audit

Classification after inspecting APIs vs current Vue.

| Capability | Classification | Notes |
|---|---|---|
| Campaign create/update core fields | Already adequately surfaced; corrected | Budget/channel/dates now editable |
| Campaign collaborators | **Surfaced** | Multi-select save |
| Campaign programs | **Surfaced** | Checkboxes |
| Planned/actual campaign dates | **Surfaced** | Manual; not derived |
| Tracking link create + copy | Already adequately surfaced | |
| Tracking link UTM edit | **Intentionally deferred** | Create API accepts UTMs; extra-link form only label + path. Editing would need a PATCH that does not exist. |
| Tracking link delete | **Intentionally deferred** | No DELETE API. Safer than a destructive UI with no server path. |
| Campaign archive/delete | **Intentionally deferred** | No API. Status CANCELLED is the stop. |
| Marketing Task CRUD + FKs | **Surfaced / corrected** | |
| Content edit + lifecycle | **Surfaced / corrected** | Needs Review after create has no dedicated button |
| Content plannedPublishAt | **Surfaced** | |
| Content attach asset | **Surfaced** | Was API-only `POST .../attach` |
| Asset file GET | **Surfaced** | Open file link |
| Asset restriction note | **Corrected** | UI no longer sends a generic reason |
| Asset campaign/content | **Surfaced** | `eventId` on assets still unused in UI |
| Event create campaign + windows | **Surfaced** | |
| Event PATCH title/description/campaign/windows | **Surfaced** | |
| Event CANCELLED | **Surfaced** | |
| Session PATCH | **Surfaced** | |
| Session min/max age, ends, program, active | **Surfaced** | |
| Registration answers/source/notes | **Surfaced** (display) | Edit notes via API still no roster form |
| includeCancelledRegistrationIds | **Surfaced** | Explicit checkbox |
| Compensation assign POST | **Surfaced** on Lead detail | Not on ledger page |
| Compensation history | **Surfaced** on Lead detail | |
| Compensation ledger + mark paid | Already adequately surfaced | |
| Compensation BPS config | **Intentionally deferred** | `app_settings` keys exist; no UI; `MANAGE_MARKETING_CONFIGURATION` unused |
| Marketing overview extra fields | **Still missing on UI** | `upcomingPublications` list not rendered; unprocessed-registration queue not a first-class card |
| `MANAGE_MARKETING_CONFIGURATION` | **Intentionally deferred** | Catalog + MARKETING_CONFIGURATOR role only. Connecting it without a real config surface would invent product. |
| Communication intents | **Intentionally deferred** | Recorded; no SMS/email send (out of scope) |
| Admin system status/restart/shutdown | Already adequately surfaced | `/settings` — outside this pass |
| Meta read-only map/sync | Already adequately surfaced | `/settings/meta` |

---

## 5. Workflow documentation

Plain English. Clicks vs automation.

### Campaign workflow

1. Staff with `MANAGE_CAMPAIGNS` (or ADMIN) opens **Marketing → Campaigns**.
2. Create: name, Organic/Paid, status, planned budget (`$0` valid), channel, owner, description, planned/actual dates, collaborator checkboxes, program checkboxes.
3. Server creates a **default tracking link** to `/trial` automatically.
4. Staff copies the link onto a flyer, bio, or QR. When someone books a Trial or Event with that code, **LeadHeader.campaignId** is set. That is acquisition attribution, not compensation by itself.
5. Save updates owner, collaborators, programs, dates, copy fields.
6. Organic `$0` campaigns are first-class. Spontaneous social posts still do not need a Campaign record.

### Marketing Task workflow

1. **Marketing → Tasks.** Views: Overdue / Due today / Upcoming / All (Denver-derived due state on PENDING tasks).
2. Create: title, type (asset request, draft caption, …), due, assignee, campaign, optional content/asset/event, description, notes.
3. This is **not** a Follow-up phone call. Follow-up stays at **Follow-up** / the Lead.
4. Assignee completes or manager cancels. Save writes field edits.

### Content workflow

1. **Marketing → Content.** Create title, caption/body, channels, publisher, campaign, planned **manual** publish time, notes, optional “Approval required”.
2. If approval required → status `NEEDS_REVIEW`. Else `IDEA`.
3. Staff use buttons: Needs assets, Draft, Approve (approver right), Ready to publish, Cancel.
4. Attach photo/clip from the library. `DO_NOT_USE` attached assets block ready/publish (server).
5. After posting **by hand** on Facebook/Instagram, record publication + URL. App **does not post**.
6. Status becomes `PUBLISHED`. Publication history is stored (channel, URL, actor) for a future publisher.

### Asset workflow

1. **Marketing → Assets.** Upload file + optional description/campaign.
2. Marketing-use starts `UNKNOWN`. Approve use, or Restrict / Do not use **with a real reason**.
3. Used assets cannot be deleted (archive). Unused can be deleted (file removed).
4. This is **gym operational** tracking, not legal consent or a DAM.

### Acquisition Event workflow

1. **Marketing → Events.** Create title, description, program, optional campaign, registration open/close.
2. Open the event. Add sessions (start, optional end, capacity, ages, program). Add custom questions.
3. **Publish** (requires at least one active session). Public page: `/events/:slug`.
4. Public registration is blocked if status isn’t PUBLISHED, manual close, or outside the window. Staff registration **bypasses** the public window.
5. Roster: mark Attended / No-show / Cancelled.
6. Processor: Preview → resolve ambiguous households → Process. Creates/matches Leads, LeadLines, household note, **one Event Follow-up per household**. No Trial.

### Event → Lead → Follow-Up → Trial → Join

1. After process, open the household from the roster.
2. Follow-up is a **phone call** on the household (`EVENT_FOLLOW_UP`), assignable to whoever should call — often not the campaign owner.
3. If they want an intro, **Schedule trial** on the person. That is a Trial, distinct from Event attendance.
4. Record attended/no-show on the Trial; convert or lost **per person**. Join does **not** require a fake Trial.

### Compensation workflow

1. If the person arrived with campaign/tracking/event evidence, the server may **auto-create** attribution (campaign **owner** as credited user, method TRACKING_LINK / CAMPAIGN / EVENT, origin SYSTEM).
2. Walk-in with no campaign: usually **no** auto row until ADMIN assigns.
3. ADMIN opens the person on the Lead, sets credited user + eligibility, types a reason (≥ 3 chars), Save compensation.
4. History appends; old rows are not edited.
5. At JOINED, if credited user is set and ELIGIBLE, an **earned snapshot** is written (default 50% of monthly cents). Later offering price edits do not change it.
6. **Marketing → Compensation** ledger: Unpaid / Mark paid. Requires reports view; mark paid requires manage-compensation (or ADMIN).

---

## 6. Attribution and compensation

Keep these four ideas separate. The app stores them on different fields.

| Concept | Where it lives | What later staff work does |
|---|---|---|
| **Acquisition attribution** | LeadHeader `campaignId`, `campaignTrackingLinkId`, UTMs; Event registration copies the same | Follow-up assignee, Trial, Convert **do not** rewrite origin |
| **Lifecycle history** | Lead/line status history, Trial rows, Event registration history, notes | Append-only operational story |
| **Operational ownership** | Follow-up `assignedUserId`; Campaign `ownerUserId` / collaborators; Content publisher | Who works it **now**. Not commission. |
| **Compensation attribution** | `compensation_attributions` per **LeadLine** | Manual correction changes this row + history; does not change LeadHeader campaign |

**Survival:** Completing a call, assigning Follow-up to Marta, or Scott converting the kid does not move compensation to Marta. Compensation is established from evidence or ADMIN correction.

**Automatic:** `maybeEstablishSystemCompensation` runs when a **new** LeadLine is created from public Trial (with campaign evidence) or Event batch (new line). It **does not overwrite** an existing attribution.

**Manual:** reason required. Method/origin become MANUAL. Eligibility UNASSIGNED / ELIGIBLE / INELIGIBLE.

**Snapshot:** at convert, `snapshotCompensationEarned`. Amount = `round(monthlyCents * basisBps / 10000)` with default `basisBps = 5000` (50%). Config in `app_settings`, **no staff UI**.

**Paid:** `paymentStatus` UNPAID/PAID, `paidAt`, `paidByUserId`. Ledger Mark paid. Not payroll/accounting.

**Discrepancy vs a naive “always fix the check” expectation:** changing credited user **after** a snapshot exists does **not** rewrite `compensation_earned`. Inspect history on the Lead; the ledger may still show the original owner. If that is wrong for Renzo’s agreement, it is an unresolved product gap, not a hidden UI.

**Households:** credit is per prospective member, not per family. Two kids can differ.

---

## 7. Access Rights

### Model

```
User.role (ADMIN | STAFF | VIEWER)     ← coarse CRM gate
User.userTypeId → User Type
  └ User Type Roles → User Roles → Access Rights
User extra User Role assignments → more Access Rights (union, no deny)
ADMIN (coarse role) → every marketing handler via requireAccessRight bypass
```

STAFF with no extra roles: CRM Leads/Follow-up/Reports, **no** Marketing nav unless they have `VIEW_MARKETING`.

### Seeded types and roles

- Types: Administrator, Staff, Viewer (coarseRole ADMIN/STAFF/VIEWER).
- Roles: Marketing viewer, Campaign manager, Marketing task manager, Content manager, Content approver, Asset manager, Event manager, Event processor, Marketing configurator, Compensation admin.

STAFF type is **not** pre-loaded with marketing roles. ADMIN assigns extras on **Users**.

### ADMIN

- Coarse `ADMIN` always passes `requireAccessRight`.
- Sees Users, Security, Settings.
- Cannot demote **self** off ADMIN; cannot demote the **last active admin**.

### STAFF

- CRM write. Marketing only with rights. Frontend buttons also check `accessRights` from `/api/auth/me`. **Hidden buttons are not security**; APIs enforce.

### VIEWER

- CRM read (existing). No marketing unless given `VIEW_MARKETING`. No write roles typically.

### Frontend gating

- `app/middleware/marketing.ts`: ADMIN or `VIEW_MARKETING`, else `/dashboard`.
- Layout Marketing link: same.
- Page buttons: per-right computed flags (manage campaigns, approve content, process events, etc.).

### Unused / reserved

**`MANAGE_MARKETING_CONFIGURATION`:** in catalog and `MARKETING_CONFIGURATOR`. **Zero** `requireAccessRight(..., 'MANAGE_MARKETING_CONFIGURATION')` calls. Compensation percent and similar remain ADMIN-only `app_settings` or seed. **Do not assign this role expecting a settings screen.**

### Hard-coded remains

- Coarse ADMIN/STAFF/VIEWER for CRM, login, user admin, conversion reverse, settings.
- Access Rights are a **marketing overlay**, not a replacement for CRM roles.

---

## 8. Bugs and workflow defects found

| Symptom | Root cause | Fix | Workflow | Test |
|---|---|---|---|---|
| Collaborators/programs/dates only in API | Campaigns Vue never sent those fields | Forms + save body | Campaigns | Typecheck; no new test |
| Compensation assign API unused by UI | Lead page never called POST | Lead-detail panel + `getLead` loads attribution/history/earned | Compensation | Typecheck; existing `tests/m9/compensation.test.ts` covers **server** only, not the Vue |
| Tasks could not point at content/asset/event | Form omitted FKs; list query omitted relations | UI + service `with` + schema relations | Marketing Tasks | Typecheck |
| Content only Approve / Ready | Incomplete buttons | Guided setStatus + save + planned time + attach | Content | Typecheck |
| Restrict used generic note | Vue sent `'Restricted pending gym note'` | Require staff-typed note | Assets | Typecheck |
| Event windows/campaign not on create | Form omitted schema fields | Create + detail editors | Events | Typecheck |
| Session PATCH unused | No UI | Session editor | Events | Typecheck |
| Cancelled regs never in batch from UI | Preview body omitted `includeCancelledRegistrationIds` | Explicit checkbox | Event process | Typecheck |
| `pnpm typecheck` failed once | `AppBadge` tone `"default"` invalid | Changed to `"neutral"` | Tasks | **typecheck re-run PASS** |

### Noticed, not fixed

- Command center does not list upcoming publications or “registrations awaiting process”.
- Ledger does not show live attribution (only earned).
- After-JOINED compensation correction does not rewrite earned snapshot.
- Content/campaign datetime display not consistently Denver via `shared/utils/time.ts`.
- No new Vitest cases for the Vue/API wiring of this pass.
- `asset.eventId` unused.
- Tracking links cannot be edited/deleted.
- `NEEDS_REVIEW` has no post-create button.

---

## 9. UX changes (task-driven)

The pass **surfaces work**, it does **not** redesign the theme.

**What needs my attention next?** (as implemented, including prior M9.7)

1. Acquisition **Dashboard** / **Follow-up** still first for new Leads and overdue calls (unchanged).
2. **Marketing** hub: overdue Marketing Task count, content needing review, active campaigns, upcoming events.
3. Tasks view filters overdue / today / upcoming.
4. Content buttons advertise the next legal step rather than a dump of enum values.
5. Event process copy still says cancelled stay out unless included.
6. Lead compensation copy states it is not source and not current worker.

**Gaps vs a stronger command center:** no deep links from overview to a specific content id; `upcomingPublications` unused in the template; compensation not on the hub cards (link exists in area grid). Unauthorized users without reports still should not open the ledger (API 403).

Empty states on campaigns/tasks/content/assets/events were already present; not rewritten.

---

## 10. Automated validation

**Do not treat as a full green gate.**

| Command | When | Result |
|---|---|---|
| `pnpm typecheck` | During stabilization, after badge fix | **PASS** (exit 0) |
| `pnpm test` | This stabilization/documentation pass | **Not executed** |
| `pnpm lint` | This pass | **Not executed** |
| `pnpm build` | This pass | **Not executed** |
| `pnpm db:generate` / new migration | This pass | **Not needed / not run** (no new tables; relations only) |
| Browser / Playwright | This pass | **Not executed** |

Prior M9 implementation close (HEAD `b398b8c` handoff) reported full `pnpm test` / lint / typecheck / build green **before** these uncommitted Vue changes. That result **does not automatically cover** this working tree.

Existing tests that still matter (not re-run here): `tests/m9/*.ts` including compensation, events batch, access-rights HTTP, assets restriction note on server, content approval gate.

---

## 11. M8 regression status

Stabilization touched Lead **detail** (added a panel) and marketing pages. It did not change Trial outcome services, Follow-up due math, conversion snapshot money rules (except loading compensation onto `getLead`), or Meta client.

| Area | Automated this pass | Still for Scott |
|---|---|---|
| Leads list / household model | No | Yes — open a household, confirm convert/lost/trial still work with the new panel |
| LeadHeader vs LeadLine | No code change to insertLeadLine | Yes |
| Trials / reschedule / repeated intros | Untouched services | Yes |
| Follow-up queue `/tasks` | Untouched | Yes |
| Conversion / reverse | Untouched except getLead payload larger | Yes |
| Lost | Untouched | Yes |
| Pricing / forecast | Untouched | Yes |
| Campaign attribution on public `/trial` | Untouched `resolveCampaignAttribution` | Yes — use a copied tracking link |
| Meta read-only | Untouched | Yes if credentials present; app must work without |
| Auth / sessions | Untouched | Yes — VIEWER vs STAFF vs ADMIN |

---

## 12. Human QA plan

Executable without source. Use `admin` / `setup` in development unless you created other users.

### Session A — Access Rights

**A1. ADMIN sees Access**  
Setup: log in as ADMIN.  
Action: Settings → Access.  
Expected: User Types, Roles, Rights list including unused “Manage marketing configuration”.  
Inspect: toggling a role on Staff type saves.

**A2. STAFF without marketing**  
Setup: user Type Staff, no extra roles.  
Action: log in, look at nav.  
Expected: Dashboard, Leads, Follow-up, Reports. **No Marketing.** `/marketing` redirects to dashboard.

**A3. Event processor only**  
Setup: STAFF + Event Manager + Event Processor extras.  
Action: Marketing → Events, open event.  
Expected: can add sessions if Event Manager; Process panel if Processor. Campaigns save may 403.

**A4. VIEWER**  
Expected: cannot write Leads; no Marketing unless you granted VIEW_MARKETING.

**A5. Anti-lockout**  
Action: try to change your own Type off Administrator.  
Expected: error; last admin cannot be demoted.

### Session B — Campaigns and Marketing Tasks

**B1. Organic $0 campaign**  
Action: create Organic, budget 0, owner yourself, one collaborator, one program, planned dates.  
Expected: default tracking link; copy URL includes code. Collaborator listed after save.

**B2. Tracking link Trial**  
Action: open copied URL, book `/trial`.  
Expected: new household **Source/campaign** shows this campaign. Later Follow-up assignee change does **not** clear campaign.

**B3. Task with links**  
Action: create task type Request assets, due today, link campaign + later an asset/content/event.  
Expected: Overdue/Due today views; Complete removes from pending; Cancel available; links open related pages.

### Session C — Content and Assets

**C1. Approval path**  
Action: create content, check approval required.  
Expected: Needs review. Ready to publish **fails** until Approve (if you are not approver, use a second user). After approve, Ready, then Record publication with channel + URL. Status Published. App did not post to Meta.

**C2. Planned time**  
Action: set planned manual publish.  
Expected: field visible; understood as reminder, not a scheduled Meta post.

**C3. Asset restrict**  
Action: upload, click Restrict with empty note.  
Expected: error asking for a reason. Type a real reason, Restrict. Do not use similarly. Approve use works without note.

**C4. Do not use blocks publish**  
Action: attach DO_NOT_USE asset to content, Ready to publish.  
Expected: server error about DO_NOT_USE.

**C5. Open file**  
Action: Open file.  
Expected: authenticated download/view, not a public CDN.

### Session D — Acquisition Events

**D1. Create → session → publish**  
Action: create event with campaign + close date, add session, Publish.  
Expected: public `/events/:slug` works inside window; after close date (or Close registration) public rejects; staff can still add roster.

**D2. Household signup**  
Action: public form contact + child participant.  
Expected: roster two names; **not** a Lead yet.

**D3. Attendance + process**  
Action: mark Attended, Preview, Process.  
Expected: household + line + Event follow-up; **no Trial**. Note says attendance is not a Trial. Re-preview shows already processed.

**D4. Duplicate phone**  
Setup: existing Lead with same phone.  
Expected: MATCH or AMBIGUOUS; you must pick if ambiguous; no silent merge; original campaign on existing Lead preserved.

**D5. Cancelled include**  
Action: mark Cancelled, Preview (should exclude), check Include cancelled, Preview again.  
Expected: only then included. Never accidental.

**D6. Join without Trial**  
Action: on processed person, Convert with offering.  
Expected: JOINED without scheduling intro.

### Session E — Attribution and Compensation

**E1. Auto credit**  
Setup: campaign with owner Pedro; tracking link Trial; convert.  
Expected: attribution SYSTEM, credited Pedro if owner set; ledger row 50% of monthly; Unpaid.

**E2. Follow-up is not credit**  
Action: assign Follow-up to Marta, complete call, convert.  
Expected: compensation still Pedro (unless you never had evidence).

**E3. Manual correction**  
Action: Lead → person details → change credited user, eligibility, reason.  
Expected: history line with you as actor and the reason. Cannot delete history.

**E4. After-join correction**  
Action: after E1, change credited user.  
Expected: history updates; **confirm whether ledger owner changed** (current server: earned row likely **unchanged**). Record what you see — this is a high-risk QA item.

**E5. Mark paid**  
Action: Compensation page, Mark paid.  
Expected: Paid + timestamp. Not an invoice.

**E6. Unauthorized**  
Action: STAFF without compensation/report rights.  
Expected: no assign panel; ledger GET 403.

### Session F — Command center / reporting

**F1. Hub counts**  
Action: create overdue task, content needs review, active campaign, published event.  
Expected: `/marketing` numbers move. Copy says this is not the acquisition Dashboard.

**F2. Outcomes labels**  
Expected: planned budget internal; Meta spend only if mapped; people/joined attributed; event registrations CRM.

**F3. Meta disconnected**  
Expected: app still works; spend “Not mapped”.

### Session G — M8 regression

**G1.** New household staff create, two people, schedule Trial, reschedule (old row cancelled, new row), attend, convert one, lost the other.  
**G2.** Follow-up due today vs overdue (Denver). Completing a call does not JOIN.  
**G3.** Kids: guardian is header, child is line.  
**G4.** Login, password change, deactivate user.

---

## 13. Training documentation status

| File | Status | Path |
|---|---|---|
| ADMIN Operations Guide V1 | **Created with this handoff** | `vault/wip/Renzo_Gracie_Kaysville_ADMIN_Operations_Guide_V1.md` |
| Staff Training Guide V1 | **Created with this handoff** | `vault/wip/Renzo_Gracie_Kaysville_Staff_Training_Guide_V1.md` |

They were **not** created during the code pass. They are V1 and should evolve during Scott’s QA.

---

## 14. Known limitations and deferred work

### Accepted M9 limitations

- No Meta/Instagram publishing; publication is a **record**.
- No SMS/email send.
- SQLite locally; not PostgreSQL.
- Compensation is a ledger snapshot, not accounting.
- Assets are not legal consent.
- Events are not Trials.
- Marketing Tasks are not Follow-up.
- Phone/email not unique; duplicates allowed.

### Deliberate future features

- Direct/scheduled publishing using `plannedPublishAt` + publication `externalPostId`.
- Waitlists.
- Compensation agreement UI (`MANAGE_MARKETING_CONFIGURATION` / BPS editor).
- Tracking-link edit/delete APIs.
- Capability-inheritance architecture.

### Technical debt

- Gitignore sqlite lines still commented (`77a0064`); local DB is tracked/staged.
- Mixed timezone display on some marketing datetime fields.
- Overview API fields unused by Vue.
- Stabilization uncommitted at inspection.

### Unresolved defects / product gaps

- Earned snapshot not rewritten on post-join attribution correction.
- Command center not listing process-ready events.
- Content `NEEDS_REVIEW` not a first-class later action.
- No regression tests added for this UI pass.

### Deferred for a legitimate reason

- `MANAGE_MARKETING_CONFIGURATION`: no configuration product to attach it to.
- Actual campaign dates not auto-derived: prior design stored explicit timestamps.
- System restart already on Settings; out of marketing scope.
- Tracking-link delete: no API.

---

## 15. Human-QA readiness verdict

**READY FOR HUMAN QA**

**Meaning:** Scott can start the sessions above on **this checkout**, including uncommitted application files.

**Not meaning:** accepted, merged, production, or that `origin/M9` already contains the new screens.

**Before treating the branch as the QA baseline for another computer:** commit the 12 code files (exclude sqlite), push `M9`, do **not** merge.

**Quality caveats (not a NOT READY list):** full test/lint/build not re-run; no Cursor browser pass; earned-snapshot correction behavior must be confirmed in Session E4.

---

## 16. Recommended QA order

1. **Session A (Access)** — if rights are wrong, every later screen lies.
2. **Session G smoke (one Lead + Trial)** — prove M8 still breathes after Lead-detail edits.
3. **Session B (Campaign + tracking link + Task)** — origin of attribution.
4. **Session D (Event)** — highest operational risk (duplicates, cancelled, no fake Trial).
5. **Session E (Compensation)** — especially E2 and E4.
6. **Session C (Content/Assets)** — publishing is manual; don’t block Event QA on it.
7. **Session F (Hub)** — once data exists, counts make sense.
8. **Full Session G** — convert/lost/kids/follow-up.

Why this order: permissions first, then a short acquisition sanity check, then the new marketing pipes that feed Leads, then money/credit, then creative, then dashboard, then deep M8.

---

# Voice Discussion Brief

This section is for another ChatGPT instance to talk with Scott while he is driving. You do not need the repo open. Human QA has not started. M9 is not accepted and not merged.

## What Cursor changed in this stabilization pass

Cursor did **not** rebuild M9. The big tables and APIs were already on the branch. What was missing was **staff screens** for things the server already knew how to do. On Scott’s laptop those screens are in the **working tree**, not in a new git commit yet. If he only pulled GitHub, he would still see the thinner M9 UI.

The important new clicks:

- On a **household**, open a person, and if he is ADMIN (or has compensation rights), he can assign who gets credit, with a required written reason, and see history.
- On **Campaigns**, he can tick collaborators and programs and fill planned versus actual dates. The campaign owner is still separate from collaborators.
- On **Marketing Tasks**, a task can point at a campaign, a piece of content, an asset, or an event, and he can complete or cancel it. That queue is still not the phone Follow-up list.
- On **Content**, he gets next-step buttons instead of a dangerous status dump, a planned **manual** post time, and attach-asset. The app still will not post to Facebook.
- On **Assets**, Restrict/Do not use now demand a real sentence, not a fake “pending note”.
- On **Events**, he can set when public signup opens and closes, edit sessions, cancel the event, see questionnaire answers, and **only if he checks a box** include a cancelled registration when making Leads.

## Workflows worth talking through

**Campaign versus Meta campaign.** Internal campaign = gym initiative. Organic zero-dollar is valid. Meta is read-only numbers if mapped.

**Event versus Trial.** Open house attendance is roster + later batch. Intro class is Trial. Processing an event creates a **call**, not an intro slot.

**Four kinds of “whose is this?”**

1. Where the lead came from (campaign on the household).
2. What happened after (history).
3. Who is calling them this week (Follow-up assignee).
4. Who might get paid if they join (compensation on the **person**, often the campaign owner, correctable by ADMIN).

Later staff activity is not supposed to steal origin or, in the happy path, steal credit. Scott should listen for whether that matches how Renzo actually pays people.

## Bugs fixed (in product language)

Staff no longer have to “just use the API” for collaborators, programs, dates, task links, content steps, asset reasons, event windows, session edits, cancelled-batch, or compensation assignment.

One typecheck break was a badge color named wrong; that’s fixed.

## Intentionally not done

No auto-posting. No texts. No compensation percentage screen. A permission called manage marketing configuration exists as a label and does nothing. Actual campaign dates are not auto-filled when he marks a campaign Active. Tracking links can’t be deleted in the UI. The marketing home page was not redesigned this round.

## Highest QA risk

1. **Compensation after someone already joined** — changing credit may update the story without changing the ledger line. He should try it and say what he wants.
2. **Event batch duplicates** — same phone, two households, must pick; never merge quietly.
3. **Cancelled people becoming Leads** — only with the extra checkbox.
4. **Testing on another PC** — changes aren’t pushed.
5. **Don’t commit the SQLite file** — it is gym data and it may be staged.

## What he should pay attention to in the gym

Run one fake organic campaign with a real tracking link into Trial. Run one tiny event with a parent and kid. Mark attendance. Process. Call list should get an Event follow-up. Then convert without inventing a Trial. Then look at compensation. Then try a staff member with **no** marketing roles and confirm they never see Marketing.

## Architecture choices that differ from “the spec PDF”

The spec wanted actual dates derived from lifecycle if that was already safe. The code stored dates as fields, so Cursor exposed fields instead of inventing auto-stamps.

The spec wanted a compensation admin UI. Cursor put it on the **Lead person**, which is the correct grain (LeadLine), not a separate fake “commission deal” screen.

The spec wanted the command center to scream next actions. The hub already had counts; Cursor did not rebuild it, so “unprocessed event registrations” is not a big red card.

Content statuses exist in the database as eight values; the UI offers **buttons**, not a combo box of all eight. Needs Review is mostly “I checked approval required when I created it.”

## Questions to ask Scott during human QA

- For Renzo, is campaign **owner** the person who should be paid, or the person who ran ads, or someone else?
- After a join, if credit was wrong, should the **ledger check** move, or only the history?
- Do collaborators need to **edit** campaigns, or only be listed? Today they are listed; permission is still the Access Right, not “being a collaborator.”
- Should STAFF like Marta get Marketing by default, or only when he ticks Event Processor / Content Manager? Today: only when he ticks.
- Is a planned publish time useful as a to-do, or will it confuse people into thinking Meta will post?
- When he is ready, does he want this working tree committed and pushed on `M9` without merging?

Talk him through those; the software is now testable as a gym operator, not as a developer filling API holes — as long as he is on the machine that has the uncommitted files.
