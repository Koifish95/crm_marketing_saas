# M5 Completion Handoff — Follow-Up / Task Workflow

**Date:** 2026-08-28  
**Branch:** `M5`  
**Starting HEAD:** `ba43c3d` (`Initial push for M5`)  
**Ending HEAD:** `e83ec34` (`feat(follow-up): create confirmation-call tasks when a trial is scheduled`)  
**M6/Meta/deployment started?** No

------------------------------------------------------------------------

## 1. Starting Git state

Work started on branch `M5` tracking `origin/M5`, clean working tree, HEAD `ba43c3d`. M4 was already merged; this was a clean accepted M4 baseline. No leftover M4 work was mixed in.

## 2. Ending Git state

M5 implementation is on branch `M5`. Untracked/ignored: `.env`, `data/renzo.sqlite`, `vault/.obsidian/*` (not committed).

## 3. Commit(s)

One M5 implementation commit: `e83ec34`.

## 4. Push status

Pushed to `origin/M5` as part of this session.

## 5. Files changed (summary)

- Schema/migration: `follow_up_tasks.trial_id`, `purpose`, `completed_by_user_id`, pending-initial unique index (`0004_flashy_madripoor.sql`)
- Due-date helper: `shared/utils/follow-up.ts`
- Domain: `server/services/follow-up.ts`, Trial lifecycle hooks in `server/services/leads.ts` / `public-trial.ts`
- API: `GET/POST /api/follow-up-tasks`, `PATCH /api/follow-up-tasks/:id`, `GET /api/users`
- UI: `/tasks`, dashboard follow-up card, lead-detail complete/assign/cancel + optional manual call
- Tests: `tests/m5/follow-up.test.ts`, `tests/m5/follow-up-auth.test.ts`
- Vault notes listed in §31

## 6. Schema / migrations

Migration `0004_flashy_madripoor.sql`:

- `trial_id` nullable FK → `trials`
- `purpose` text NOT NULL default `MANUAL`
- `completed_by_user_id` nullable FK → `users`
- index on `trial_id`
- partial unique index `follow_up_tasks_pending_initial_unique` on `trial_id` where purpose is `INITIAL_SCHEDULE`, status is `PENDING`, and `trial_id` is not null

Fresh migrate: Vitest `openTestDatabase()` applies the full chain including `0004`.  
Migrate from M4: local `pnpm db:migrate` on existing `data/renzo.sqlite` succeeded.

## 7. FollowUpTask domain changes

Reused the M1 table. Added trial link, purpose discriminator, and completed-by user. Outcome is a controlled enum on complete, not free text. Type remains `PHONE_CALL` only.

## 8. Automatic task creation

`createTrial` inserts the Trial, then `ensureInitialFollowUpTask`. Public `/trial`, internal trial create, and reschedule (new Trial) all go through that path. Not a Vue side effect.

## 9. Two-business-day calculation

`addBusinessDays` in `shared/utils/follow-up.ts` walks calendar days until two weekdays (Mon–Fri) have elapsed. Weekends are skipped. No holiday calendar.

Mon→Wed, Tue→Thu, Wed→Fri, Thu→Mon, Fri→Tue, Sat/Sun→Tue.

## 10. Due-time behavior

Due instant is 5:00 PM America/Denver on that second business day (`FOLLOW_UP_DUE_MINUTE = 17 * 60`, `denverWallToUtc`). Calculated from the **scheduling operation** time (`nowMs`), not from `trial.scheduledAt`.

## 11. Ownership / assignment

Automatic tasks start unassigned. STAFF/ADMIN can assign/reassign to an active user or unassign. Assignee is preserved on complete. `completedByUserId` records who completed it.

## 12. Queue / dashboard UI

`/tasks` default view is Open (PENDING), with Due today / Overdue / Upcoming / Completed / Cancelled. Pending sort: overdue, due today, upcoming, then earliest due. Dashboard card shows overdue / due today / upcoming counts, a short priority list, and a link to `/tasks`.

## 13. Lead detail integration

Lead page lists tasks with status, due, assignee, outcome, notes, and complete/assign/cancel using the same PATCH API as the queue. Optional “Add call” creates a `MANUAL` task.

## 14. Outcomes / notes

Complete requires `REACHED` | `NO_ANSWER` | `LEFT_VOICEMAIL` | `WRONG_NUMBER` | `OTHER`. Note is optional plain text (max 4000). Completing a call does **not** change Lead status.

## 15. Reschedule

Old Trial → `CANCELLED`. Still-pending `INITIAL_SCHEDULE` task on the old Trial → `CANCELLED`. New Trial → new PENDING task with due date from the reschedule operation.

## 16. Cancellation

Trial `CANCELLED` (no replacement) cancels a still-pending initial task. History is kept.

## 17. ATTENDED

Still-pending initial confirmation task is cancelled. No membership-sales task.

## 18. NO_SHOW

Still-pending initial confirmation task is cancelled. No automatic reschedule/sales task. Lead/Trial still use existing M3 `NO_SHOW` behavior.

## 19. Idempotency

Select-existing + insert + unique partial index. Public booking `reused: true` does not call `createTrial`. Retry of `ensureInitialFollowUpTask` returns the existing pending row.

## 20. Transaction behavior

Public booking already wraps Lead+Trial; `createTrial` is called with `skipTransaction: true` inside that boundary so the FollowUpTask joins the same transaction. Internal `createTrial` / `rescheduleTrial` / `setTrialOutcome` wrap with `runTransaction`. If `ensureInitialFollowUpTask` throws during public booking, Lead+Trial roll back.

## 21. RBAC

READ: VIEWER, STAFF, ADMIN (`GET /api/follow-up-tasks`, `GET /api/users`).  
WRITE: STAFF, ADMIN (create / assign / complete / cancel).  
Public: 401. No FollowUpTask on `/api/public/*`. HTTP tests inject `event.context.authUser`.

## 22. API routes

| Method | Path |
|---|---|
| GET | `/api/follow-up-tasks?view=` |
| POST | `/api/follow-up-tasks` |
| PATCH | `/api/follow-up-tasks/:id` (`action`: complete, cancel, assign) |
| GET | `/api/users` |

## 23. Automated tests

`pnpm test`: **51 passed**, 9 files.

Scenarios A–O covered in `tests/m5/` (public + internal create, weekday due dates, idempotency, reschedule, completed+reschedule, cancel/attend/no-show, complete with outcome, RBAC HTTP, booking rollback if task insert fails). Existing M1–M4 tests remain green.

## 24. lint / typecheck / build

| Command | Result |
|---|---|
| `pnpm lint` | pass (Node CJS/ESM experimental warning only) |
| `pnpm typecheck` | pass |
| `pnpm build` | pass |

## 25. Migration verification

- Fresh: test databases migrate `0000`–`0004`
- From M4: `pnpm db:migrate` on local `data/renzo.sqlite` succeeded
- Seed unchanged: `admin` / `setup`

## 26. Manual browser QA

NOT MANUALLY VERIFIED

No browser automation was available in this session, and the local dev server was not running for a click-through. HTTP/service tests are not a substitute for owner browser QA.

## 27. Deviations from the prompt

- Default due is **two business days**, not calendar “next day”; that matches the prompt’s §5 rule, not the older “next-day” wording in some vault notes.
- Manual task creation **was** implemented (API + lead-page “Add call”) because it was cheap. No separate “new task” page.
- No M5 settings UI; delay/due-minute/timezone are constants in `shared/utils/follow-up.ts`.
- Dashboard “Due today” count is PENDING tasks whose due timestamp is still in the future but on today’s Denver date (already-overdue items are counted under Overdue even if they were due today).

## 28. Assumptions

- Business days = Mon–Fri only; US holidays are ordinary weekdays until a later calendar exists.
- Due date uses the time of the scheduling **operation**, not the intro class datetime.
- Default owner is none.
- `OTHER` allows a note but does not require one.
- Nested SQLite transactions are avoided by `skipTransaction` when a caller already opened a transaction.

## 29. Known issues

- Staff still can add a Trial with a raw `datetime-local` (pre-M4 internal create). That path also creates a follow-up task, which is required.
- `GET /api/users` lists every active user (including VIEWER) as an assignable person. Inactive users are rejected on write.

## 30. Deferred

Meta, SMS/email send, WhatsApp, staff notifications, holiday calendar, no-show automation beyond cancelling the obsolete confirmation task, telephony, capacity/waitlists, billing, PostgreSQL, multi-tenant, M6.

## 31. Documentation updated

`Implementation-State`, `Milestones`, `Domain-Model`, `Database`, `CRM`, `Decisions`, `Architecture`, `Authentication`, `Funnel`, `Intro-Scheduling`, `How-to-Run`, `Home`, `Glossary`, `AGENTS.md`.

## 32. Acceptance matrix

| Item | Result |
|---|---|
| Public Trial creates PHONE_CALL PENDING task | PASS |
| Internal Trial creates task | PASS |
| Monday → Wednesday 5:00 PM Denver | PASS |
| Thursday → Monday | PASS |
| Friday → Tuesday | PASS |
| Weekend → Tuesday | PASS |
| Idempotent / public reuse | PASS |
| Reschedule cancels pending + new task | PASS |
| Completed old task kept on reschedule | PASS |
| Trial cancel cancels pending initial | PASS |
| ATTENDED cancels pending initial | PASS |
| NO_SHOW cancels pending, no new auto task | PASS |
| Complete requires outcome + completedAt | PASS |
| PUBLIC 401 / VIEWER 403 write / STAFF+ADMIN write | PASS |
| Task insert failure rolls back booking | PASS |
| `/tasks` queue + dashboard card + lead actions | PASS (code; UI not clicked) |
| lint / typecheck / test / build | PASS |
| Migration 0004 | PASS |
| Manual browser QA | NOT VERIFIED |
| M6/Meta not started | PASS |

## 33. M6 / Meta / deployment

Not started.

------------------------------------------------------------------------

M5 READY FOR ARCHITECT REVIEW
