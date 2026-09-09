# M5 Architect Review — Follow-Up / Task Workflow

**Project:** Renzo Gracie Kaysville Customer Acquisition System  
**Milestone:** M5 — Follow-Up / Task Workflow  
**Reviewed against:** `vault/wip/M5_Implementation_Prompt_2026-08-28.md`  
**Source of truth:** repository at `15790cb` on branch `M5`  
**Date:** 2026-08-28

This document answers every section of `vault/wip/M5_Architect_Review_Request_2026-08-28.md` from the actual implementation, not intended behavior.

------------------------------------------------------------------------

# 1. Executive Assessment

1. **Is M5 fully implemented against the prompt?** Yes for the mandatory workflow. A Trial becoming `SCHEDULED` creates an immediate unassigned `PHONE_CALL` / `INITIAL_SCHEDULE` task due two weekdays later at 5:00 PM America/Denver. Queue, dashboard, lead detail, RBAC, idempotency, and transactional public booking are in code and covered by automated tests. Manual browser QA was not performed.

2. **Defects / partials / unverified / deviations:**
   - Browser QA: **NOT VERIFIED**
   - Tuesday → Thursday and Wednesday → Friday due dates are implied by the same helper, not asserted as separate cases
   - Internal `createTrial` rollback is the same `runTransaction` wrapper, but the forced-failure test is public booking only
   - HTTP tests cover PUBLIC 401, VIEWER GET 200 / write 403, STAFF assign+complete 200, ADMIN manual create 200. They do not separately PATCH-cancel or GET `/api/users` as VIEWER
   - Dashboard “Due today” count excludes already-overdue items even if they were due today; the `/tasks` “Due today” filter includes them
   - Manual create was implemented (optional in the prompt)
   - No M5 settings UI; constants live in `shared/utils/follow-up.ts`

3. **Ready for architect review?** Yes. Core invariants have file/service/API/test evidence.

4. **Ready for human browser acceptance after architect review?** Yes, as the next gate. Do not treat the current session as owner click-through.

5. **Highest-risk areas:**
   1. **Transactional coupling of Trial + FollowUpTask.** Public booking is tested with a spy. Internal create/reschedule/outcome wrap the same helpers; a missed `skipTransaction` or a path that inserts a Trial without `createTrial` would break the invariant.
   2. **Due-date timezone math.** Centralized and unit-tested for Mon/Thu/Fri/weekend, but Tue/Wed and DST edges are not explicit tests. Wrong Denver day would silently mis-prioritize the queue.
   3. **Unverified UI.** Queue, dashboard, and lead-detail actions exist in Vue but were never clicked. Filter semantics, assignment UX, and phone readability on a phone width are the most likely human-acceptance defects.

```text
M5 READY FOR ARCHITECT REVIEW
```

------------------------------------------------------------------------

# 2. Git / Baseline Verification

```text
Starting branch: M5
Starting HEAD: ba43c3d474cd92bd2c4f799d3f8d3ffebc38c988 (Initial push for M5)
Starting working-tree state: clean (implementation began from accepted M4 already on M5)
Ending branch: M5
Ending HEAD: 15790cb081e4381822d2bf4e869464947435511c
M5 commit(s):
  e83ec34ec85a07bf513615843eef67459ea42cb2 feat(follow-up): create confirmation-call tasks when a trial is scheduled
  15790cb081e4381822d2bf4e869464947435511c docs: record M5 commit hash
Remote branch: origin/M5
Push status: pushed (ba43c3d..15790cb → origin/M5)
Ending working-tree state: clean except untracked vault/wip/M5_Architect_Review_Request_2026-08-28.md (prompt) and this review file
```

Confirmations:

- M5 began from the accepted M4 baseline. `ba43c3d` sits on `16ae621` (Merge PR #4 from M4). Working tree was clean before implementation.
- No uncommitted M4 acceptance fixes were mixed into M5.
- Committed files are M5 follow-up schema/services/APIs/UI/tests/vault notes plus `AGENTS.md` route/canonical-file lines. `vault/.obsidian/*` is tracked in the repo from earlier work; **M5 commits did not add or modify Obsidian workspace files**. `.env` was not committed.
- No branch switch, merge, rebase, reset, or force-push occurred during M5 implementation. `git push -u origin HEAD` was a fast-forward.

Exceptions: the architect-review *request* prompt remains untracked (inbox). This review file is new and not in the M5 implementation commits.

------------------------------------------------------------------------

# 3. Files Changed

Material files in `ba43c3d..HEAD`:

## database/schema/migrations

- `server/database/schema/index.ts` — `trialId`, `purpose`, `completedByUserId`, relations, partial unique index
- `drizzle/migrations/0004_flashy_madripoor.sql` — ALTER + index SQL
- `drizzle/migrations/meta/0004_snapshot.json` — drizzle snapshot
- `drizzle/migrations/meta/_journal.json` — journal entry 0004

## server/domain services

- `server/services/follow-up.ts` — create/list/complete/cancel/assign/ensure/cancel-pending
- `server/services/tx.ts` — `runTransaction`
- `server/services/leads.ts` — `createTrial` / `rescheduleTrial` / `setTrialOutcome` / dashboard hook
- `server/services/public-trial.ts` — `skipTransaction: true` so task joins booking tx

## API handlers

- `server/api/follow-up-tasks/index.get.ts` — authenticated list
- `server/api/follow-up-tasks/index.post.ts` — STAFF/ADMIN manual create
- `server/api/follow-up-tasks/[id].patch.ts` — complete/cancel/assign
- `server/api/users.get.ts` — active users for assignment dropdown

## validation/shared schemas/types

- `shared/schemas/enums.ts` — purpose + call-outcome enums
- `shared/schemas/follow-up-task.ts` — create/list/patch Zod
- `shared/utils/follow-up.ts` — delay/due-minute/timezone + due-state helpers
- `shared/types/crm.ts` — richer `followUpTasks` on `LeadRecord`

## task queue UI

- `app/pages/tasks.vue` — `/tasks` queue

## dashboard

- `app/pages/dashboard.vue` — follow-up counts + priority list

## Lead detail

- `app/pages/leads/[id].vue` — complete/assign/cancel + Add call

## navigation/layout

- `app/layouts/internal.vue` — Follow-up nav link
- `AGENTS.md` — `/tasks` and `follow-up.ts` as canonical

## tests

- `tests/m5/follow-up.test.ts` — domain scenarios A–M, O, sort
- `tests/m5/follow-up-auth.test.ts` — scenario N HTTP RBAC

## documentation

- `vault/Implementation-State.md`, `Milestones.md`, `Domain-Model.md`, `Database.md`, `CRM.md`, `Decisions.md`, `Architecture.md`, `Authentication.md`, `Funnel.md`, `Intro-Scheduling.md`, `How-to-Run.md`, `Home.md`, `Glossary.md`
- `vault/wip/M5_Completion_Handoff_2026-08-28.md`

Trial handlers `trials.post.ts` / `outcome.post.ts` / `reschedule.post.ts` were **not** rewritten; they already called services that now own the task lifecycle.

------------------------------------------------------------------------

# 4. FollowUpTask Schema — Actual Final Model

Table `follow_up_tasks` in `server/database/schema/index.ts`.

| Field | Purpose |
|---|---|
| `id` | PK |
| `leadId` | Required FK → Lead (who to call) |
| `trialId` | Nullable FK → Trial; set for automatic initial tasks |
| `type` | `PHONE_CALL` (default) |
| `purpose` | `INITIAL_SCHEDULE` vs `MANUAL` (idempotency discriminator) |
| `status` | `PENDING` `COMPLETED` `CANCELLED` |
| `dueAt` | UTC ms deadline |
| `assignedUserId` | Optional FK → users; null = unassigned |
| `completedByUserId` | Optional FK → users; who completed |
| `completedAt` | UTC ms when completed |
| `outcome` | Controlled enum stored as text; set on complete |
| `notes` | Plain text |
| `createdAt` / `updatedAt` | UTC ms |

1. **Pre-M5:** `id`, `leadId`, `type`, `dueAt`, `status`, `assignedUserId`, `completedAt`, `outcome`, `notes`, `createdAt`, `updatedAt`
2. **Added in M5:** `trialId`, `purpose` (default `MANUAL`), `completedByUserId`
3. **Unassigned automatic tasks:** yes. `ensureInitialFollowUpTask` sets `assignedUserId: null`
4. **History:** updates set `status`; no `DELETE` in follow-up services
5. **Indexes:** `lead_id`, `trial_id`, `due_at`, `status`; partial unique `follow_up_tasks_pending_initial_unique` on `trial_id` WHERE purpose=`INITIAL_SCHEDULE` AND status=`PENDING` AND trial_id IS NOT NULL
6. **FKs:** `lead_id` → leads, `trial_id` → trials, `assigned_user_id` / `completed_by_user_id` → users. Migrate runs `PRAGMA foreign_keys = ON`
7. **Trial belongs to Lead:** `createManualFollowUpTask` checks `trial.leadId !== input.leadId`. Automatic create uses the Trial just inserted for that `leadId`

**Migration:** `drizzle/migrations/0004_flashy_madripoor.sql`

------------------------------------------------------------------------

# 5. Initial Follow-Up Task Identity / Purpose

1. **Identifier:** `purpose = 'INITIAL_SCHEDULE'` plus `type = 'PHONE_CALL'` and `trialId` set. `MANUAL` is the other purpose.
2. **Coexistence:** manual insert uses `purpose: 'MANUAL'`, so it does not hit the partial unique index on pending initial rows.
3. **Same initial task:** same `trial_id` with `purpose=INITIAL_SCHEDULE` and `status=PENDING`.
4. **Historical + replacement:** yes. Unique index is only pending. A cancelled/completed initial on Trial A does not block a pending initial on Trial B.

Logic: `ensureInitialFollowUpTask` and `cancelPendingInitialFollowUp` in `server/services/follow-up.ts`.

------------------------------------------------------------------------

# 6. Automatic Task Creation — Public Trial Booking

```text
POST /api/public/trial
  → bookPublicTrial (server/services/public-trial.ts)
      if reused same phone + same scheduledAt + SCHEDULED Trial:
        return getLead (no createTrial, no new task)
      else db.transaction:
        createLead (if needed)
        createTrial(..., { skipTransaction: true })
          insert trials SCHEDULED
          ensureInitialFollowUpTask
          maybe changeLeadStatus → TRIAL_SCHEDULED + history
Public JSON confirmation has no leadId and no FollowUpTask fields
```

1. Created in `ensureInitialFollowUpTask`, called from `createTrial`
2. Server-side only. `app/pages/trial.vue` posts to `/api/public/trial` only
3. Immediate (same request, before commit)
4. `PHONE_CALL`
5. `PENDING`
6. Unassigned
7. `followUpDueAt(nowMs)` — two weekdays later, 5:00 PM Denver, from operation time
8. Reuse: `reused: true`, no second task (`tests/m5/follow-up.test.ts` “does not create a second initial task…”)
9. Test: `creates a pending phone-call task from a public booking`

------------------------------------------------------------------------

# 7. Automatic Task Creation — Internal Trial Creation

```text
POST /api/leads/:id/trials
  → requireCrmWriteUser
  → createTrial(useDb(), id, parsed.data, user)
      runTransaction:
        insert Trial SCHEDULED
        ensureInitialFollowUpTask
        maybe TRIAL_SCHEDULED history
```

Vue `addTrial` in `app/pages/leads/[id].vue` only POSTs `/api/leads/:id/trials`. It does not POST `/api/follow-up-tasks`.

Same answers as §6 for type/status/unassigned/due. Test: `creates a pending phone-call task from an internal trial`.

------------------------------------------------------------------------

# 8. Transaction Boundary / Atomicity

## Public booking

Owner: `bookPublicTrial` `db.transaction`. Inside: optional `createLead`, `createTrial` with `skipTransaction: true` (insert Trial, `ensureInitialFollowUpTask`, status/history). If `ensureInitialFollowUpTask` throws, the transaction rolls back.

Test `rolls back public booking if follow-up creation fails`: spies `ensureInitialFollowUpTask` to throw. After reject: no lead with phone `8015550309`, `trials` length 0, `follow_up_tasks` length 0.

## Internal Trial creation

Owner: `createTrial` → `runTransaction` unless `skipTransaction`. Same inner operations. **No separate spy-failure test** for the internal HTTP path. Code path is the same wrapper.

1. Public: `bookPublicTrial`. Internal: `createTrial` / `runTransaction`. Reschedule/outcome: those services’ `runTransaction`
2. Trial insert + initial task + status/history (when applicable)
3. Public failure: Lead + Trial + history + task all roll back (verified)
4. Application `createTrial` path: no — task insert is before commit. Raw SQL insert of `trials` (M1 fixtures) can create a SCHEDULED Trial without a task; that is not an API
5. Task without Trial: FK `trial_id` plus insert-after-returning trial id; unique index requires non-null trial_id for pending initial
6. Status/history: `changeLeadStatus` inside the same `tx`

------------------------------------------------------------------------

# 9. Idempotency / Duplicate Prevention

1. **Application:** `ensureInitialFollowUpTask` selects existing pending initial for that trial, returns it
2. **Database:** partial unique index `follow_up_tasks_pending_initial_unique`
3. **Columns/condition:** unique on `trial_id` WHERE purpose=`INITIAL_SCHEDULE` AND status=`PENDING` AND trial_id IS NOT NULL
4. **Repeated service call:** second `ensureInitialFollowUpTask` returns the existing row; insert catch also re-selects on unique conflict
5. **Public retry:** reuse path does not call `createTrial`; test expects 1 row
6. **Concurrency:** unique index + catch-and-reselect is the SQLite race handling. No multi-connection stress test. **PARTIAL** for true concurrent writers
7. **Page refresh:** GET only; no create
8. **Manual tasks:** `purpose=MANUAL`, so they do not collide with the pending-initial unique index

Test: `does not create a second initial task for the same trial` — count 1.

------------------------------------------------------------------------

# 10. Two-Business-Day Due-Date Calculation

`shared/utils/follow-up.ts`:

```text
business-day delay: FOLLOW_UP_BUSINESS_DAY_DELAY = 2
due time: FOLLOW_UP_DUE_MINUTE = 17 * 60  (5:00 PM)
timezone: FOLLOW_UP_TIMEZONE = BUSINESS_TIMEZONE = America/Denver
```

`followUpDueAt(scheduledAtMs)` uses `denverYmd(scheduledAtMs)` then `addBusinessDays` then `denverWallToUtc(dueYmd, 17*60)`. Argument is the **scheduling operation** timestamp (`nowMs` in `createTrial` / reschedule), not `trial.scheduledAt`.

Test `places the deadline at 5:00 PM Denver two weekdays later`:

| Input | Result |
|---|---|
| Monday 2026-08-31 | Wednesday 2026-09-02 5:00 PM Denver (instant also asserted) |
| Thursday | 2026-09-07 |
| Friday | 2026-09-08 |
| Saturday | 2026-09-08 |
| Sunday | 2026-09-08 |

Tuesday → Thursday and Wednesday → Friday: **not separately asserted**. Same `addBusinessDays` function.

1. **DST:** `denverWallToUtc` already used for intro slots; due time goes through it. No dedicated DST follow-up test
2. **Holidays:** ignored by design
3. **Centralized:** yes — change the three constants
4. **Persistence:** `due_at` is `timestamp_ms` UTC integer

------------------------------------------------------------------------

# 11. Reschedule Lifecycle

`rescheduleTrial` in `server/services/leads.ts`, inside `runTransaction`:

1. `getBookableSlot` (M4 availability; `slotId` only)
2. `cancelPendingInitialFollowUp(oldTrialId)` — PENDING initial only
3. old Trial `CANCELLED`
4. `createTrial(..., { nowMs, skipTransaction: true })` → new SCHEDULED Trial + new PENDING initial due from reschedule `nowMs`

Completed old tasks are not in the cancel WHERE (`status = PENDING`), so they stay COMPLETED.

Tests:

- `cancels the old pending task and creates a new one on reschedule`
- `keeps a completed call when the trial is later rescheduled`

M4 reschedule tests in `tests/m4/reschedule.test.ts` still pass (suite green).

------------------------------------------------------------------------

# 12. Trial Cancellation

`setTrialOutcome(..., { status: 'CANCELLED' })` updates Trial then `cancelPendingInitialFollowUp`. COMPLETED rows are not matched. No delete.

Test: combined `cancels the pending confirmation call when a trial is cancelled, attended, or a no-show` — after cancel, task status `CANCELLED`.

No dedicated “COMPLETED remains COMPLETED on trial cancel” assertion. Logic is the same PENDING-only WHERE. **PARTIAL** for that sub-case.

------------------------------------------------------------------------

# 13. ATTENDED Lifecycle

Same `setTrialOutcome` → `cancelPendingInitialFollowUp`. Reason: confirmation call is obsolete once they attended. Completed tasks unchanged (PENDING filter). No sales/membership task is created anywhere in M5 services.

Test: same combined test — after ATTENDED, task `CANCELLED`. Sales-task deferral is absence of insert, documented in vault.

------------------------------------------------------------------------

# 14. NO_SHOW Lifecycle

Same cancel of pending initial. Combined test asserts task `CANCELLED`, lead `NO_SHOW`, and `follow_up_tasks` for that lead **length 1** (no extra reschedule task).

------------------------------------------------------------------------

# 15. Task State Machine

Implemented transitions (only via explicit actions):

```text
PENDING → COMPLETED  (completeFollowUpTask; outcome required)
PENDING → CANCELLED  (cancelFollowUpTask or cancelPendingInitialFollowUp)
PENDING assignee change (assignFollowUpTask)
```

`complete` / `cancel` / `assign` all throw `Only open follow-up tasks can be …` if status ≠ PENDING.

```text
COMPLETED → PENDING     not possible (no such action)
CANCELLED → PENDING     not possible
COMPLETED → CANCELLED   not possible
CANCELLED → COMPLETED   not possible
```

PATCH is not a generic field dump; `action` is `complete | cancel | assign`. No admin correction API.

**Tests:** complete-happy-path in follow-up.test.ts; invalid-transition rejection is **not** a dedicated test (service if-guards only). **PARTIAL**.

------------------------------------------------------------------------

# 16. Assignment / Reassignment

- Automatic: unassigned (`assignedUserId: null`)
- STAFF/ADMIN: `requireCrmWriteUser` on PATCH assign
- VIEWER: 403 on PATCH (tested for complete; same guard for assign)
- Assignee must exist and `active === true` (`requireActiveAssignee`)
- Complete does not clear `assignedUserId`

1. Inactive users: rejected with `Assignee must be an active staff user.`
2. Later inactive: existing `assignedUserId` is left as-is; no reaper. Completing still works; `completedByUserId` is the actor
3. Completion actor: `completedByUserId` + `completedBy` relation, separate from assignee

Tests: HTTP STAFF assign then complete; service complete asserts `assignedUser` still null and `completedBy.id` is admin. No dedicated inactive-assignee test. **PARTIAL**.

`GET /api/users` returns every **active** user including VIEWER, so a VIEWER can appear in the assign dropdown. Write still requires an active row; assigning a VIEWER is allowed by code. Assumption, not a prompt failure.

------------------------------------------------------------------------

# 17. Call Outcomes

`followUpCallOutcomeSchema`: `REACHED` `NO_ANSWER` `LEFT_VOICEMAIL` `WRONG_NUMBER` `OTHER`

1. Required on complete: handler returns 400 if missing; service always receives outcome
2. Server-side Zod + handler check
3. Pending/cancelled do not get an outcome written except complete (pending only). Cancel does not set outcome
4. Complete does not call `changeLeadStatus`
5. Confirmed: complete test leaves Trial `SCHEDULED` and lead `TRIAL_SCHEDULED`

Test: `completes a call with an outcome, note, and completedAt`

------------------------------------------------------------------------

# 18. Task Notes

1. Plain text
2. Max 4000 (`createFollowUpTaskSchema` / `patchFollowUpTaskSchema`)
3. Zod on API; service trims
4. Complete/cancel keep note (`input.notes?.trim() || task.notes`)
5. VIEWER cannot PATCH
6. `OTHER` does not require a note (prompt said OTHER should *allow* a note)

------------------------------------------------------------------------

# 19. Completing a Task

`PATCH /api/follow-up-tasks/:id` `{ action: 'complete', outcome, notes? }` → `completeFollowUpTask`

Sets `status=COMPLETED`, `completedAt=now`, `outcome`, `notes`, `completedByUserId=actor.id`, `updatedAt`. Does not change `dueAt`, `createdAt`, `trialId`, `leadId`, `assignedUserId`.

Missing outcome: 400 `A call outcome is required to complete this task.`

Test: service complete + HTTP STAFF complete with `NO_ANSWER`.

------------------------------------------------------------------------

# 20. Manual Cancellation

1. `PATCH` `{ action: 'cancel', notes? }` → `cancelFollowUpTask`. Automatic cancel: `cancelPendingInitialFollowUp` from Trial lifecycle
2. Row retained, `status=CANCELLED`, `updatedAt` set. No `cancelledAt` column
3. Optional note only; no dedicated cancel timestamp
4. VIEWER cannot (write guard). HTTP cancel-as-VIEWER not separately asserted
5. Public: 401 on PATCH (no PATCH in public tests, but unauthenticated GET/POST 401; PATCH uses same `requireCrmWriteUser` which 401s without user)

------------------------------------------------------------------------

# 21. Manual Follow-Up Task Creation

Implemented (not deferred).

- Lead: required `leadId`
- Trial: optional; must belong to Lead
- dueAt: required
- assignee: optional active user
- note: optional
- Validation: Zod + service
- RBAC: `requireCrmWriteUser`; ADMIN create proven in HTTP test (`purpose=MANUAL`)
- Idempotency: MANUAL does not use the pending-initial unique index. UI: lead-page “Add call” only (no `/tasks` create form)

------------------------------------------------------------------------

# 22. Task API Surface

```text
GET /api/follow-up-tasks
Purpose: list/filter (view=open|due_today|overdue|upcoming|completed|cancelled)
Authentication: requireAuthUser
Authorization: VIEWER/STAFF/ADMIN
Validation schema: listFollowUpTasksQuerySchema
Service: listFollowUpTasks

POST /api/follow-up-tasks
Purpose: manual PHONE_CALL
Authentication: session
Authorization: requireCrmWriteUser (STAFF/ADMIN)
Validation schema: createFollowUpTaskSchema
Service: createManualFollowUpTask

PATCH /api/follow-up-tasks/:id
Purpose: complete | cancel | assign
Authentication: session
Authorization: requireCrmWriteUser
Validation schema: patchFollowUpTaskSchema
Service: completeFollowUpTask / cancelFollowUpTask / assignFollowUpTask

GET /api/users
Purpose: assignment dropdown (id, displayName, role; no hashes)
Authentication: requireAuthUser
Authorization: any authenticated role
Validation schema: none
Service: listActiveStaffUsers
```

Trial integration (unchanged routes, changed services):

- `POST /api/leads/:id/trials` → `createTrial`
- `POST /api/trials/:id/reschedule` → `rescheduleTrial`
- `POST /api/trials/:id/outcome` → `setTrialOutcome`
- `POST /api/public/trial` → `bookPublicTrial` → `createTrial`

`GET /api/dashboard` now includes `followUp` from `followUpDashboard`.

------------------------------------------------------------------------

# 23. Server-Side RBAC Evidence

| Operation | Public | VIEWER | STAFF | ADMIN |
|---|---|---|---|---|
| List/read | 401 | 200 | 200 | 200 |
| Assign | 401 | 403 | 200 | 200 (same write helper) |
| Reassign | 401 | 403 | 200 | 200 |
| Complete | 401 | 403 | 200 | 200 |
| Cancel | 401 | 403 | 200 | 200 |
| Manual create | 401 | 403 | 200 | 200 |
| Configuration | n/a | n/a | n/a | n/a (no M5 config UI) |

HTTP test file: `tests/m5/follow-up-auth.test.ts`  
Proved: PUBLIC GET/POST/users 401; VIEWER GET 200, PATCH complete 403, POST 403; STAFF assign 200, complete 200; ADMIN POST manual 200.

Not separately proved: VIEWER GET `/api/users`; STAFF cancel; ADMIN complete (ADMIN uses same `requireCrmWriteUser` as STAFF).

`server/api/public/*` has no follow-up imports. Public trial response is confirmation fields only (`server/api/public/trial.post.ts`).

------------------------------------------------------------------------

# 24. Task Validation

| Rule | Where |
|---|---|
| type | Zod `followUpTaskTypeSchema`; auto/manual services hardcode `PHONE_CALL` |
| status transitions | service if `status !== 'PENDING'` |
| dueAt | Zod `z.coerce.date()` on create; auto from `followUpDueAt` |
| assignee exists + active | `requireActiveAssignee` |
| Lead exists | `createManualFollowUpTask` / `createTrial` |
| Trial exists | manual create lookup |
| Trial belongs to Lead | `trial.leadId !== input.leadId` |
| outcome enum | `followUpCallOutcomeSchema` |
| outcome required on complete | handler 400 if missing |
| note length | Zod `.max(4000)` |
| role | `requireAuthUser` / `requireCrmWriteUser` |

------------------------------------------------------------------------

# 25. `/tasks` Queue

Staff page `app/pages/tasks.vue`, nav label “Follow-up”. Card per task:

- Lead name → `/leads/:id`
- Phone (`task.lead.phone` or “No phone on file”)
- Type as “Phone call”
- Trial label + intro datetime via `toBusinessDateTime`
- Due datetime via `toBusinessDateTime`
- Status/due-state chip (Overdue / Due today / Upcoming / Open / Completed / Cancelled)
- Assignee display name or Unassigned
- Complete / Assign / Cancel for writers

**Default view:** Open (`view=open` → all PENDING).

Filters map 1:1: Open, Due today, Overdue, Upcoming, Completed, Cancelled.

**Sort** (`sortQueue` in `follow-up.ts`): overdue rank 0, due today 1, upcoming 2, then earliest `dueAt`. Test: `lists overdue pending work before later due dates`.

API: `GET /api/follow-up-tasks?view=`

------------------------------------------------------------------------

# 26. Due-State Semantics

Derived in `followUpDueState` (America/Denver via `denverYmd`):

- **Overdue:** PENDING and `dueAt < now` (timestamp, so after 5:00 PM Denver the same calendar day becomes overdue)
- **Due today (queue filter):** PENDING and Denver YMD of `dueAt` equals today — **includes** overdue-today
- **Due today (dashboard count):** PENDING and `dueState === 'DUE_TODAY'` which requires `dueAt >= now`, so overdue-today is counted as Overdue only
- **Upcoming:** PENDING and not overdue and not same Denver day (due date after today)

`OVERDUE` is not a stored status.

Midnight: `denverYmd` changes at Denver midnight; a 5 PM deadline on date D is upcoming/due-today until `now >= dueAt`, then overdue.

------------------------------------------------------------------------

# 27. Dashboard Integration

`app/pages/dashboard.vue` added a Follow-up card: Overdue / Due today / Upcoming counts, up to 8 priority tasks (name, phone, due, overdue label), link to `/tasks`. Existing total-leads / status / upcoming-trials / MRR blocks remain.

API: `GET /api/dashboard` → `dashboardStats` → `followUpDashboard`. No dedicated dashboard test. **PARTIAL** (code present; no UI test).

------------------------------------------------------------------------

# 28. Lead Detail Integration

`app/pages/leads/[id].vue` Follow-up section: phone-call label, Open/Completed/Cancelled, overdue, due time, assignee, trial label, outcome labels, notes, completed time + completed-by. STAFF/ADMIN: assign, complete (outcome + note), cancel, optional Add call (`POST /api/follow-up-tasks`). Same PATCH API as `/tasks`.

------------------------------------------------------------------------

# 29. Mobile / Responsive Behavior

Queue uses wrapping flex, full-width selects, stacked cards (`space-y-3`, `flex-wrap`). Phone is its own line. **NOT VERIFIED** in a browser at mobile width.

------------------------------------------------------------------------

# 30. M1–M4 Regression Protection

Full `pnpm test`: 51 passed / 9 files (previous M4 suite was 40). M1–M4 files still pass including `tests/m4/intro.test.ts`, `intro-auth.test.ts`, `reschedule.test.ts`, `tests/m3/crm.test.ts`.

M1–M4 code that **had to** change:

- `createTrial` / `rescheduleTrial` / `setTrialOutcome` / `dashboardStats` — hook follow-up
- `bookPublicTrial` — `skipTransaction` so task is in the booking tx
- `getLead` — present tasks without user password hashes
- schema `follow_up_tasks` columns
- dashboard Vue — follow-up card (replaced the old “Lead #id” overdue list)
- lead detail — real task actions instead of “Automatic next-day calls are M5”
- layout — `/tasks` link

Intentional behavior change: scheduling a Trial now inserts a FollowUpTask (the M5 requirement). Seed login `admin` / `setup` unchanged (`tests/helpers/db.ts`, seed).

------------------------------------------------------------------------

# 31. Migration Verification

M5 migrations: **`0004_flashy_madripoor.sql` only.**

## Fresh database

```text
migration result: PASS — openTestDatabase() runs migrateDatabase() including 0004; 51 tests used fresh temp SQLite files
seed/bootstrap result: PASS — seedDatabase() in the same helper; admin/setup still used
```

## Accepted M4 database upgraded to M5

```text
migration result: PASS — pnpm db:migrate on local data/renzo.sqlite exited 0 during implementation
data preservation result: NOT VERIFIED beyond migrate success (no explicit row-count comparison of pre-M5 leads/trials). New columns are nullable or DEFAULT MANUAL, so existing follow_up_tasks rows (if any) should remain
```

Foreign keys: REFERENCES on `trial_id` and `completed_by_user_id`. Indexes and partial unique as in §4. Seed still idempotent; credentials unchanged. No migrate warnings in the command output.

------------------------------------------------------------------------

# 32. Automated Test Inventory

M5 files: `tests/m5/follow-up.test.ts`, `tests/m5/follow-up-auth.test.ts`.

| Scenario | Status | Test | Proves |
|---|---|---|---|
| A Public Trial creates follow-up | PASS | `creates a pending phone-call task from a public booking` | PHONE_CALL PENDING INITIAL_SCHEDULE unassigned, due from createdAt |
| B Internal Trial creates follow-up | PASS | `creates a pending phone-call task from an internal trial` | createTrial inserts task, due = followUpDueAt(MONDAY) |
| C Monday → Wednesday | PASS | `places the deadline at 5:00 PM Denver two weekdays later` | YMD 2026-09-02 and 17:00 Denver instant |
| D Thursday → Monday | PASS | same | YMD 2026-09-07 |
| E Friday → Tuesday | PASS | same | YMD 2026-09-08 |
| F Weekend → Tuesday | PASS | same | Sat and Sun → 2026-09-08 |
| G Retry/idempotency | PASS | `does not create a second initial task for the same trial` | ensure + public reuse → 1 row |
| H Reschedule pending | PASS | `cancels the old pending task and creates a new one on reschedule` | old CANCELLED, new PENDING, due from TUESDAY_MORNING |
| I Reschedule completed | PASS | `keeps a completed call when the trial is later rescheduled` | old COMPLETED+REACHED, new PENDING |
| J Trial cancellation | PASS | combined outcome test | cancel → task CANCELLED |
| K ATTENDED | PASS | combined | attended → task CANCELLED |
| L NO_SHOW | PASS | combined | no-show → task CANCELLED, still 1 task |
| M Complete call | PASS | `completes a call with an outcome, note, and completedAt` | COMPLETED, LEFT_VOICEMAIL, completedAt, completedBy; Trial still SCHEDULED |
| N RBAC | PASS | `rejects public writes, forbids VIEWER writes, and allows STAFF and ADMIN` | 401/403/200 as in §23 |
| O Transaction failure | PASS | `rolls back public booking if follow-up creation fails` | 0 leads/trials/tasks |

Extra: `lists overdue pending work before later due dates` (sort). Due Tue/Wed **PARTIAL** (algorithm only). Invalid transitions **PARTIAL**. Internal rollback **PARTIAL**.

------------------------------------------------------------------------

# 33. Full QA Gate Results

Recorded 2026-08-28 during implementation (not re-run for this review document).

```text
pnpm test
Test files: 9 passed (9)
Tests passed: 51
Tests failed: 0
Skipped: 0
Duration: 40.68s (vitest run after import-path fix)

pnpm lint
PASS
warnings: Node ExperimentalWarning CJS loading ESM @stylistic/eslint-plugin (pre-existing; lint still 0 errors)

pnpm typecheck
PASS
warnings: none reported

pnpm build
PASS
warnings: Node DEP0155 deprecated trailing slash in @vue/shared exports during Nitro build (pre-existing)
```

This review did **not** re-execute the four gates. Treat command output above as implementation-session evidence, not a second independent run.

------------------------------------------------------------------------

# 34. Manual Browser QA

Browser tooling was not available. Local `pnpm dev` was not exercised for M5. API/service tests are **not** browser QA.

| Flow | Status |
|---|---|
| Login admin/setup | NOT VERIFIED |
| Dashboard follow-up section | NOT VERIFIED |
| Open /tasks | NOT VERIFIED |
| Task filters | NOT VERIFIED |
| Assign task | NOT VERIFIED |
| Reassign task | NOT VERIFIED |
| Complete with outcome | NOT VERIFIED |
| Complete with note | NOT VERIFIED |
| Cancel task | NOT VERIFIED |
| Open Lead detail | NOT VERIFIED |
| Work task from Lead detail | NOT VERIFIED |
| Schedule internal Trial → task appears | NOT VERIFIED |
| Public /trial booking → task appears internally | NOT VERIFIED |
| Reschedule → old pending cancelled / new created | NOT VERIFIED |
| Reschedule after completed call | NOT VERIFIED |
| Trial ATTENDED → pending cancelled | NOT VERIFIED |
| Trial NO_SHOW → pending cancelled / no new workflow | NOT VERIFIED |
| Trial CANCELLED → pending cancelled | NOT VERIFIED |
| Mobile-width usability | NOT VERIFIED |
| VIEWER read-only behavior | NOT VERIFIED |

------------------------------------------------------------------------

# 35. Security / Public Exposure Review

1. Public trial JSON has no notes. No public task routes
2. No staff assignment in public confirmation
3. Public cannot PATCH tasks (auth required)
4. `/tasks` uses `middleware: 'auth'`
5. Handlers call `requireAuthUser` / `requireCrmWriteUser` independently of Vue `canWrite`
6. Notes/outcomes Zod-validated
7. No new secrets in source. `GET /api/users` selects id/displayName/role only. `presentFollowUpTask` strips user hashes from lead payloads

Concerns (non-blocking): active VIEWER users are assignable; `GET /api/leads/:id` returns follow-up notes to any authenticated role including VIEWER (prompt allows VIEWER read).

------------------------------------------------------------------------

# 36. Documentation Updated

| Note | Change |
|---|---|
| Implementation-State | M5 current; stop before M6 |
| Milestones | M5 done in code |
| Domain-Model | FollowUpTask fields + lifecycle |
| Database | 0004, indexes |
| CRM | `/tasks`, APIs, follow-up rules |
| Decisions | 2026-08-28 two-business-day / unassigned / outcomes |
| Architecture | M5 no longer deferred; tests mention M5 |
| Authentication | `/tasks` internal |
| Funnel / Intro-Scheduling / How-to-Run / Home / Glossary | follow-up now exists |
| AGENTS.md | `/tasks`, canonical `follow-up.ts` |
| Completion handoff | `vault/wip/M5_Completion_Handoff_2026-08-28.md` |

Records: two weekdays, Mon–Fri, 5:00 PM Denver, unassigned default, outcomes, Trial interactions, no-show = cancel only, no external notifications, M5 implemented.

------------------------------------------------------------------------

# 37. Explicit Scope Verification

```text
M6 production deployment          NOT STARTED
VPS provisioning                  NOT STARTED
PostgreSQL migration              NOT STARTED
Meta API                          NOT STARTED
Facebook Lead Ads                 NOT STARTED
Instagram integration             NOT STARTED
Meta analytics                    NOT STARTED
Pixel / Conversions API           NOT STARTED
SMS                               NOT STARTED
Email                             NOT STARTED
Automated prospect sequences      NOT STARTED
No-show rescheduling automation   NOT STARTED (pending initial task is cancelled only)
Payments / Stripe                 NOT STARTED
Capacity limits                   NOT STARTED
Waitlists                         NOT STARTED
Holiday calendar                  NOT STARTED
Telephony                         NOT STARTED
Multi-tenancy                     NOT STARTED
SaaS billing                      NOT STARTED
Multi-location architecture       NOT STARTED
```

------------------------------------------------------------------------

# 38. Deviations From the Approved M5 Prompt

**Requirement:** Optional manual task creation only if cheap.  
**Actual:** Implemented (API + lead “Add call”; no dedicated create page).  
**Reason:** Small surface on existing FollowUpTask.  
**Impact:** Extra write path; covered by ADMIN HTTP create.  
**Recommended action:** Keep.

**Requirement:** Prompt listed Tue→Thu and Wed→Fri as examples.  
**Actual:** Helper covers them; tests do not name those two weekdays.  
**Reason:** One compact unit test.  
**Impact:** Low; algorithm is the same loop.  
**Recommended action:** Optional extra expects.

**Requirement:** Dashboard Due today vs overdue.  
**Actual:** Dashboard counts split overdue-today into Overdue; queue “Due today” includes same-day overdue.  
**Reason:** Smallest operational split for “what is late” vs “what is due later today”.  
**Impact:** Counts on dashboard can disagree with the Due today tab.  
**Recommended action:** Architect confirm; align if staff find it confusing.

**Requirement:** Settings UI not required.  
**Actual:** Constants only.  
**Reason:** Prompt allowed this.  
**Impact:** Timing change needs a code edit.  
**Recommended action:** Keep until a settings milestone.

**Requirement:** Browser QA if tooling available.  
**Actual:** NOT VERIFIED.  
**Reason:** No browser tools / no exercised dev server.  
**Impact:** Human acceptance still required.  
**Recommended action:** Owner click-through (§43).

------------------------------------------------------------------------

# 39. Assumptions Introduced During Implementation

| Assumption | Classification |
|---|---|
| Due date uses scheduling **operation** time, not class `scheduledAt` | Safe to retain (prompt §8 reschedule wording); confirm with gym if they wanted “two days before class” |
| Holidays are ordinary weekdays | Requires future client decision if gym closes holidays |
| `OTHER` note optional | Safe to retain |
| Default owner none | Safe to retain (prompt) |
| Assigning a VIEWER is allowed if they are active | Temporary / product decision |
| Inactive assignee left on historical PENDING tasks | Safe to retain until a reaper exists |
| `skipTransaction` is only used when a caller already opened a tx | Safe to retain; do not call `createTrial(..., { skipTransaction: true })` from a non-tx handler |

------------------------------------------------------------------------

# 40. Known Issues / Technical Debt

```text
Blocks architect approval
  (none identified)

Blocks human acceptance
  Browser QA NOT VERIFIED — owner must still click the flows

Blocks production later
  Docker image still does not apply migrations/seed (pre-existing)
  Public rate limit in-memory per process (pre-existing)
  No holiday calendar
  Internal Trial create still accepts raw datetime-local (pre-M4 staff path; now also creates a task)

Non-blocking future improvement
  No dedicated invalid-transition or inactive-assignee tests
  No concurrent unique-index stress test
  Dashboard vs queue due-today definition mismatch
  GET /api/users includes VIEWER
  Combined J/K/L test rather than three named tests
  Staff Add call has no trial picker (optional trialId unused in UI)
```

------------------------------------------------------------------------

# 41. Architect Risk Review

1. SCHEDULED Trial without automatic initial task?  
   **NO** for `createTrial` / public book / reschedule. **YES** only for raw `db.insert(trials)` (M1 fixtures). Evidence: `createTrial` always calls `ensureInitialFollowUpTask` before commit.

2. Duplicate automatic initial for one Trial?  
   **NO** at application + unique index. Evidence: select-first, unique WHERE pending initial, test count 1. Concurrent writers: **UNKNOWN** (no stress test); unique index is the backstop.

3. Frontend bypass of lifecycle?  
   **NO** for create/complete/cancel/assign (Zod + service). Client cannot skip task create on Trial create. Manual POST cannot set `purpose=INITIAL_SCHEDULE` (service hardcodes MANUAL).

4. VIEWER or unauthenticated mutate?  
   **NO**. HTTP 401/403. Evidence: follow-up-auth.test.ts.

5. Reschedule destroy completed history?  
   **NO**. Cancel WHERE status PENDING. Test I.

6. Invalid transitions via generic PATCH?  
   **NO**. Action enum; PENDING-only mutations.

7. Wrong deadline around weekends/DST?  
   **NO** for weekends (tested). DST: **UNKNOWN** (helper uses `denverWallToUtc`; no DST fixture). Highlight as residual, not a known FAIL.

8. Task create failure leave partial Lead/Trial?  
   **NO** for public booking (test O). Internal create: **NO** in code (`runTransaction`); **UNKNOWN** empirically (no spy test). Highlight residual.

9. Assign invalid/inactive user?  
   **NO** for assign API (`requireActiveAssignee`). No test. Stale assignee if user deactivated later: leftover FK, not a new assign.

10. Outcome/note leak on public APIs?  
    **NO**. Public trial confirmation has no tasks. Authenticated GET `/api/leads/:id` and `/api/follow-up-tasks` expose notes to VIEWER by design.

------------------------------------------------------------------------

# 42. Final Acceptance Matrix

| Requirement | Status | Evidence / Notes |
|---|---|---|
| Clean accepted M4 starting baseline | PASS | ba43c3d on merged M4; clean tree |
| Public scheduled Trial creates initial task | PASS | follow-up.test.ts public booking |
| Internal scheduled Trial creates initial task | PASS | createTrial test |
| Task created immediately | PASS | same request as Trial insert |
| PHONE_CALL / PENDING | PASS | assertions |
| Unassigned by default | PASS | assignedUser null |
| Two-business-day deadline | PASS | followUpDueAt + tests |
| Weekend skipping | PASS | Sat/Sun → Tuesday |
| 5 PM America/Denver | PASS | denverWallToUtc 17*60 |
| Due-date logic centralized | PASS | shared/utils/follow-up.ts |
| Automatic task creation idempotent | PASS | ensure + reuse test |
| Database duplicate protection | PASS | 0004 partial unique |
| Public booking retry does not duplicate | PASS | reused true, 1 task |
| Task creation transactional with scheduling | PASS | public tx + skipTransaction |
| Failure rolls back partial workflow | PASS | spy test; internal inferred |
| Reschedule cancels old pending task | PASS | test H |
| Reschedule preserves completed old task | PASS | test I |
| Reschedule creates new task | PASS | H and I |
| Trial cancellation cancels pending initial | PASS | combined test |
| ATTENDED cancels pending initial | PASS | combined test |
| NO_SHOW cancels pending initial | PASS | combined test |
| NO_SHOW does not invent new automation | PASS | task count 1 |
| Task history preserved | PASS | no deletes |
| STAFF/ADMIN assignment | PASS | HTTP STAFF assign |
| VIEWER read-only | PASS | GET 200, write 403 |
| Active-user assignment validation | PARTIAL | service guard; no dedicated test |
| Call outcome captured | PASS | LEFT_VOICEMAIL / NO_ANSWER |
| Outcome required on PHONE_CALL completion | PASS | handler 400 + complete tests |
| Plain-text note captured | PASS | complete test |
| Invalid task transitions rejected | PARTIAL | service guards; no dedicated test |
| `/tasks` queue operational | PARTIAL | Vue implemented; browser NOT VERIFIED |
| Open/Due Today/Overdue/Upcoming history views | PARTIAL | API+UI; browser NOT VERIFIED |
| Operational sort order | PASS | list overdue first test |
| Dashboard follow-up visibility | PARTIAL | Vue+API; no dashboard test |
| Lead detail integration | PARTIAL | Vue+same PATCH; browser NOT VERIFIED |
| Public task access blocked | PASS | no public follow-up routes; confirmation stripped |
| Handler/API RBAC tests | PASS | follow-up-auth.test.ts |
| Fresh migration works | PASS | test DBs |
| M4→M5 migration works | PASS | pnpm db:migrate exit 0 |
| M1–M4 regression tests remain green | PASS | 51/51 includes m1–m4 |
| `pnpm test` | PASS | 51 passed |
| `pnpm lint` | PASS | stylistic ESM warning only |
| `pnpm typecheck` | PASS | |
| `pnpm build` | PASS | DEP0155 warning |
| Durable docs updated | PASS | vault list §36 |
| Completion handoff created | PASS | M5_Completion_Handoff_2026-08-28.md |
| M6/deployment not started | PASS | §37 |
| Meta integration not started | PASS | §37 |

------------------------------------------------------------------------

# 43. Human Acceptance Test Recommendations

Ordered for Scott. Automated tests cannot replace these.

**1. Staff understands the queue**  
Steps: Login `admin` / `setup` → Follow-up → confirm Open is default and a scheduled intro’s person, phone, class, due date are readable without IDs.  
Expected: Human labels, Denver times, lead name links.  
Catches: enum dump, missing phone, unreadable cards.

**2. Priority clarity**  
Steps: Create or wait until one task is overdue and one is later; open Open tab.  
Expected: Overdue first, red chip.  
Catches: sort/filter bugs the unit test did not hit with real clock.

**3. Dashboard vs queue counts**  
Steps: Note dashboard Overdue / Due today / Upcoming; open matching `/tasks` filters.  
Expected: Overdue matches. Due today may differ after 5 PM (see §26).  
Catches: staff confusion on the dashboard/queue split.

**4. Assign / complete / note**  
Steps: Assign to yourself → Complete → Reached + a sentence → Save.  
Expected: task Completed, note visible, lead still TRIAL_SCHEDULED.  
Catches: outcome not saved, accidental status change, assignee wiped.

**5. Lead-detail same as queue**  
Steps: Complete or cancel from the lead page; confirm `/tasks` agrees.  
Expected: one source of truth.  
Catches: duplicate/divergent client logic (should not exist, but UX drift can).

**6. Book public intro, see internal task**  
Steps: Logged-out `/trial` book; login; `/tasks` or lead.  
Expected: one Open phone call, unassigned, due two weekdays 5 PM.  
Catches: public path not creating a task in the real app.

**7. Reschedule history**  
Steps: Complete a call, then reschedule the intro.  
Expected: completed row remains; new Open task for the new class.  
Catches: history wipe, due date not refreshed.

**8. Mobile**  
Steps: ~390px width on `/tasks`: phone visible, Complete/Assign usable without sideways scroll.  
Expected: stacked cards.  
Catches: cramped controls.

**9. VIEWER**  
Steps: Log in as VIEWER if a row exists (or confirm buttons absent).  
Expected: can see queue; no Complete/Assign. Direct PATCH should 403 (already automated).  
Catches: UI exposing writes.

**10. No-show / attended**  
Steps: Mark intro Attended or No show.  
Expected: Open confirmation call becomes Cancelled; no extra auto task.  
Catches: leftover Open work after they already came (or no-showed).

------------------------------------------------------------------------

# 44. Final Handoff

```text
Branch: M5
HEAD: 15790cb081e4381822d2bf4e869464947435511c
M5 commit: e83ec34ec85a07bf513615843eef67459ea42cb2 (implementation); 15790cb (handoff hash)
Push status: origin/M5 up to date (ba43c3d..15790cb)
Working tree: clean except untracked architect-review request + this review file
Tests: 51 passed / 0 failed / 9 files (implementation session)
Lint: PASS (CJS/ESM experimental warning)
Typecheck: PASS
Build: PASS (DEP0155 warning)
Migration verification: 0004 fresh PASS; M4→M5 migrate exit 0
Browser QA: NOT VERIFIED
Known blocking issues: none for architect review; human browser acceptance still required
```

```text
M5 READY FOR ARCHITECT REVIEW
```
