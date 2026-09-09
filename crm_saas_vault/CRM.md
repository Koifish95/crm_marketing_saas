---
type: note
status: current
area: domain
updated: 2026-09-05
tags:
  - crm
---

# Lead CRM

M3. Internal operational UI for staff. Public `/trial` bookings from M4 appear as ordinary households and Trials here. Scheduling a Trial creates the confirmation-call FollowUpTask (M5). M6 restyles these screens; M8 adds household lines, conversion, catalog, campaigns, and reports. M9 adds a distinct Marketing hub that can create households only through Event batch processing. Server rules are M3–M9 plus M7 RBAC (VIEWER is not a CRM reader).

Staff work households at `/leads/:id` as a **members-first Primary Record Workspace**. The household name in the header is the searchable record selector. Frequent actions stay in the header (Edit household, Add person, Household workflow, Call where present). Tabs: **Members** (default) | Follow-up | Attribution | Notes & History. There is no Overview tab. Person-level Trials, conversion, lost, offering, and compensation **writes** stay on Members. `/leads/:id?line=` expands that person. Opening from `/leads` copies list filters onto the workspace URL (`search`, `status`, `programId`, `source`, `campaignId`); Previous/Next and the selector walk that `GET /api/leads` result, not raw database ids and not `sessionStorage`. **All leads** restores those filters. Campaign names and derived Acquisition Event titles link to `/marketing/campaigns/:id` and `/marketing/events/:id` when the viewer has `VIEW_MARKETING` (ADMIN always). Event/session is resolved from processed registrations (fallback: event follow-up / compensation), not a household `sourceEventId` column. Follow-up on the household is acquisition `FollowUpTask` only; Marketing Tasks stay under `/marketing/tasks`. Display labels: `shared/utils/labels.ts` (`householdDisplayStatus`). Card Trial/Conversion/Lost/Forecast selection: `shared/utils/lead-line-summary.ts`. Path helper: `shared/utils/lead.ts`.

`/leads` list and Pipeline are household-oriented. Each row is one LeadHeader. Columns: contact, prospect count (LeadLine count), distinct programs, phone, source, derived household status, next upcoming intro. Status and Pipeline columns use `householdDisplayStatus`: **Active** when every person is still nonterminal; **Active · mixed outcomes** when at least one person is `JOINED` or `LOST` and another remains open; **Joined** / **Lost** / **Closed · mixed outcomes** when every person is terminal. Person operational statuses (`TRIAL_SCHEDULED`, `TRIAL_ATTENDED`, `NO_SHOW`) stay on member cards and must not become the household headline. Filters are `ACTIVE`, `ACTIVE_MIXED`, `JOINED`, `CLOSED_MIXED`, `LOST`. Program filter matches any LeadLine. Search matches contact fields and prospective-member names. Source and campaign stay header-level. Campaign remains a filter, not a table column. `/leads?campaignId=` selects that filter so a Marketing Campaign can open its attributed households.

`/leads/new` records a **household inquiry**: household contact (name, phone or email, source, campaign, notes, consents) plus one or more prospective members (name, relationship, age when Kids BJJ, program). Consent copy is “OK to text or call” / “OK to email”; public `/trial` uses “It’s ok to text or call me about this intro.” The contact does not have to be a prospective member. Each person picks their own program. Staff do not schedule a Trial on this page. Submit uses an opaque `idempotencyKey`; the same key returns the original household. Matching phone/email warns and still creates a separate LeadHeader, then persists `lead_possible_duplicates`. `POST /api/leads` with `members[]` is the household path; a legacy body without `members` still creates one default line.

## Routes

| Path | Role |
|---|---|
| `/dashboard` | any authenticated |
| `/tasks` | ADMIN / STAFF |
| `/leads` | ADMIN / STAFF |
| `/reports` | ADMIN / STAFF (financial cents ADMIN-only on the API) |
| `/marketing` | ADMIN, or STAFF with `VIEW_MARKETING` (hub; child pages use Access Rights) |
| `/leads/new` | ADMIN / STAFF |
| `/leads/:id` | ADMIN / STAFF (workspace; Members default; `?line=` person focus; list filters in query) |
| `/marketing/campaigns/:id` | ADMIN, or STAFF with `VIEW_MARKETING` (Campaign workspace) |
| `/settings` | ADMIN (hub: intro, catalog, Access Rights, Meta, Trial outcome setting, tracked-acquisition credit owner, process controls). Campaigns redirect to Marketing |
| `/settings/catalog` | ADMIN |
| `/settings/access` | ADMIN |
| `/settings/meta` | ADMIN |
| `/account` | any authenticated (blocked while `mustChangePassword`) |

VIEWER is dashboard-only. The dashboard API still returns pipeline counts and names; CRM pages and APIs are 403. CRM reads and writes use `requireCrmAccessUser` / `requireCrmWriteUser`. Direct `/leads` or `/tasks` URLs redirect; APIs return 403.

## API

Layer: UI → `/api/leads*` and `/api/follow-up-tasks*` → `server/services/leads.ts` / `server/services/follow-up.ts` → Drizzle.

- `GET/POST /api/leads` (POST may send a household `members[]` + `idempotencyKey`, or the legacy one-line body)
- `GET/PATCH /api/leads/:id`
- `POST /api/leads/:id/status`
- `POST /api/leads/:id/notes`
- `POST /api/leads/:id/trials`
- `POST /api/trials/:id/outcome`
- `POST /api/trials/:id/reschedule`
- `GET /api/leads/duplicates`
- `GET /api/dashboard`
- `GET /api/follow-up-tasks`, `POST /api/follow-up-tasks`, `PATCH /api/follow-up-tasks/:id`
- `GET /api/users` (active users for assignment; ADMIN/STAFF; no password hashes)
- `GET/POST /api/admin/users*` (ADMIN user administration)
- `GET /api/admin/security-events` (ADMIN)
- `GET/PATCH /api/admin/settings` (ADMIN; `allowEarlyTrialOutcomes`)
- `GET /api/programs`, `GET /api/campaigns`, `GET /api/lead-sources`, `GET /api/lost-reasons`, `GET /api/membership-offerings`, `GET /api/household-pricing-rules`
- `GET /api/reports`, `GET /api/reports/export` (STAFF/ADMIN; Meta CSV ADMIN-only)
- `GET /api/reports/meta`, `POST /api/admin/meta/*` (ADMIN)
- `GET/POST /api/marketing/*` (Access Rights; ADMIN always)
- `GET/POST /api/admin/users*` (ADMIN user administration)

## Status rules

Forward skips are allowed (`NEW` → `TRIAL_SCHEDULED`, `RESPONDED` → `JOINED`).

A **correction** requires a note:

- moving backward on `NEW → CONTACTED → RESPONDED → TRIAL_SCHEDULED → TRIAL_ATTENDED → JOINED`
- leaving `JOINED` or `LOST`

`NO_SHOW` → new Trial → `TRIAL_SCHEDULED` is operational, not a correction. `TRIAL_ATTENDED` → new Trial → `TRIAL_SCHEDULED` is the same operational cycle (prospects may take several intros before joining). The Trial create path writes the status-history note. Manual backward pipeline edits still require a note. JOINED and LOST do not move from scheduling a Trial; reverse conversion or explicit reopen first.

Every change writes `LeadStatusHistory`.

## Trials

Staff can still see Trial history here. Public bookings, **staff add trial**, and **staff reschedule** use configured intro slots ([[Intro-Scheduling]]). Staff pick a bookable class/time; arbitrary datetimes are not accepted. Reschedule: old trial `CANCELLED`, new trial `SCHEDULED`. The Trial takes class name, date, and time from the selected availability slot.

Creating a trial from `NEW` / `CONTACTED` / `RESPONDED` / `NO_SHOW` / `TRIAL_ATTENDED` sets that LeadLine (and the header when the header is in that same set) to `TRIAL_SCHEDULED`. Prior Trial rows are not changed. Recording `ATTENDED`, `NO_SHOW`, or `CANCELLED` on a leftover Trial does **not** reopen a `JOINED` or `LOST` person and does not rewrite household derived state from that outcome. JOINED still requires conversion reversal; LOST still requires explicit reopen. JOINED/LOST people cannot get a new Trial until those correction paths. The same Trial create/reschedule/outcome path also maintains the confirmation-call FollowUpTask.

`ATTENDED` and `NO_SHOW` for a still-`SCHEDULED` Trial are gated by `allowEarlyTrialOutcomes` ([[Decisions#2026-09-02 — Allow early Trial outcomes is an ADMIN setting]]). Default ON. OFF: Lead Detail hides Attended / No-show until `scheduledAt`, and the outcome API rejects earlier requests. Cancel and reschedule keep their existing rules. Lead Detail uses `canRecordTrialOutcome` from `GET /api/leads/:id`; the server remains authoritative.

## Follow-up

Whenever a Trial becomes `SCHEDULED`, the server ensures **one pending household** acquisition `PHONE_CALL` for that LeadHeader, unassigned, due two weekdays later at 5:00 PM America/Denver. Additional Trials in the same household attach to that pending task via `follow_up_task_lines` instead of creating a second call to the same contact. If a pending Event follow-up already exists, intro confirmation **retargets that same row** to `INITIAL_SCHEDULE` (source event is kept; due date is not reset) rather than opening a second call. Completed historical tasks are never rewritten; a genuinely new Trial after a completed confirmation creates a new pending task. Staff work the queue at `/tasks` or on the lead page: assign, complete with a call outcome, or cancel. VIEWER cannot read the queue or lead APIs. Completing a call does not change Lead status. Cards show purpose (Confirm intros / Event follow-up / Follow-up call). Event tasks list linked people and notes, not later Trial times, until they are retargeted as intro confirmation.

Pending queue buckets (Overdue / Due today / Upcoming) are derived, mutually exclusive, and shared by `/tasks` and the dashboard: overdue when `dueAt < now`; due today when `dueAt` is still in the future on today’s America/Denver calendar date; upcoming when the Denver date is after today. They are not stored statuses.

Reschedule of a Trial keeps the pending household confirmation when it can still represent the work (associations retarget to the new Trial; due date is not reset). Trial `CANCELLED` / `ATTENDED` / `NO_SHOW` cancels that pending confirmation only when **no other** non-terminal LeadLine still has a `SCHEDULED` Trial that needs the call. No automatic no-show or sales follow-up. Manual “call again” tasks can be added from the lead page (`purpose = MANUAL`). Event batch processing creates one household `EVENT_FOLLOW_UP` FollowUpTask per event when no pending intro confirmation exists; that is still acquisition call work, not a Marketing Task. If an intro confirmation is already pending, Event process attaches people to that call instead of opening another.

## Household SELF

A LeadHeader may contain at most one LeadLine whose relationship is `SELF`. SELF means that prospective member is the primary contact represented by the header. Additional people must use `CHILD`, `SPOUSE`, or `OTHER`. Guardian-only households (header contact is not a prospective member) may have zero SELF lines. The server rejects a second SELF on public `/trial`, staff New Lead / Add Person, and relationship updates. The Add Person selector hides SELF once a SELF line exists; that is convenience, not authorization. Opening Add person on a household with no Self prefills relationship Self and the header first/last name. Phone stays on the header.

## Forecast MRR vs Conversion Snapshot MRR

**Forecast MRR** (`server/services/forecast.ts`) is the recurring monthly value of acquisition opportunities still available to convert. Only open LeadLines participate. JOINED and LOST lines contribute $0 even if they still have an Offering. Household first/additional pricing and line overrides still apply among remaining open lines.

**Conversion Snapshot MRR** is the integer-cent amount stored on the Conversion row at join time. It does not change when catalog prices change, and it is not added back into Forecast MRR.

This app does not track actual collected revenue (payments, invoices, AR). Do not label either figure as cash collected.

## Join / conversion

Per-line Conversion is the acquisition join. Snapshot integer cents from the offering/forecast/override. If Compensation Attribution is ELIGIBLE with a credited user, the same transaction writes a `compensation_earned` snapshot. Staff may send `membershipOfferingId` on convert; the server persists it on the LeadLine in the same conversion if it was not saved earlier. Convert still requires an offering (or an explicit monthly amount). One-line households can still use header JOINED with `monthlyRateCents` for the M3 path. Multi-line households convert each person separately. ADMIN can reverse a conversion (history kept). Lost requires an ADMIN-managed reason. A converted person cannot be marked lost until that Conversion is reversed — an active Conversion and a Lost outcome cannot coexist on the same LeadLine.

## Duplicates

Phone/email are not unique. Duplicate contact information is allowed. Matching phone or email is a possible duplicate, never household identity and never a silent merge. Public Event signup still accepts duplicate-looking registrations with no customer warning. Staff Roster and Process show advisory Event-registration and CRM-household matches; staff may match an existing household or deliberately create a new one (`forceNew`). Creating new despite CRM matches persists `lead_possible_duplicates` on the new header. Event batch processing still requires an explicit choice when more than one header matches. V1 has no automatic or manual household-merge UI.

Staff create warns live via `GET /api/leads/duplicates` (canonical phone + trimmed case-insensitive email) and still creates a new household. After save, `createStaffHousehold` persists the same structured `lead_possible_duplicates` rows as public `/trial`. Public `/trial` always creates a new household for a new submission key, then persists those rows on the new header. Lead detail and the Leads/Pipeline list show a non-blocking `Possible duplicate` warning with links to matching households. The warning does not change lifecycle status, Forecast MRR, or reports. Public confirmation never reveals it.

Related: [[Domain-Model]], [[Authentication]], [[Funnel]], [[Intro-Scheduling]], [[Design-System]], [[Implementation-State]], [[wip/M9_Implementation_Handoff_2026-09-02]], [[wip/M9_Primary_Record_Workspace_Handoff_2026-09-03]], [[wip/M9_Human_QA_Corrections_Implementation_Handoff_2026-09-04]].
