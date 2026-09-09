# M5 Architect Review Request — Follow-Up / Task Workflow

**Project:** Renzo Gracie Kaysville Customer Acquisition System  
**Milestone:** M5 — Follow-Up / Task Workflow  
**Purpose:** Provide the architect/reviewer with enough implementation evidence to independently determine whether M5 satisfies the approved implementation specification and is ready for human browser acceptance.

---

# 0. Instructions to Cursor

After M5 implementation is complete, answer every section below based on the **actual repository state and implementation**, not on intended behavior.

Do not merely say that a requirement is complete. Provide evidence sufficient for an independent review.

For each material claim, identify the relevant:

- file(s)
- service/function(s)
- API route(s)
- migration(s)
- database constraint/index where applicable
- automated test(s)

If the implementation differs from the M5 specification, explicitly describe the deviation and why it was necessary.

If something was not verified, write `NOT VERIFIED` rather than inferring success.

Do not start M6, production deployment, PostgreSQL migration, Meta integration, SMS, email, or other future milestone work as part of this review response.

---

# 1. Executive Assessment

Answer:

1. Is M5 fully implemented against `M5_Implementation_Prompt_2026-08-28.md`?
2. Are there any known defects, partial requirements, unverified requirements, or deviations?
3. Is M5 ready for architect review?
4. Is it ready for human browser acceptance after architect review?
5. What are the three implementation areas you consider highest-risk and why?

End this section with one of:

```text
M5 READY FOR ARCHITECT REVIEW
```

or

```text
M5 NOT READY FOR ARCHITECT REVIEW
```

---

# 2. Git / Baseline Verification

Provide:

```text
Starting branch:
Starting HEAD:
Starting working-tree state:
Ending branch:
Ending HEAD:
M5 commit(s):
Remote branch:
Push status:
Ending working-tree state:
```

Confirm explicitly:

- M5 began from the accepted M4 baseline.
- No uncommitted M4 acceptance fixes were mixed into M5.
- No unrelated files were committed.
- Local `vault/.obsidian/*` files were not accidentally committed.
- No branch switching, merge, rebase, reset, force-push, or unrelated history rewriting occurred unless explicitly required and documented.

List any exceptions.

---

# 3. Files Changed

List every material file added or modified for M5, grouped by:

- database/schema/migrations
- server/domain services
- API handlers
- validation/shared schemas/types
- task queue UI
- dashboard
- Lead detail
- navigation/layout
- tests
- documentation

For each file, give a one-line explanation of its M5 purpose.

---

# 4. FollowUpTask Schema — Actual Final Model

Show the actual final `FollowUpTask` model relevant to M5.

For each field, explain its purpose, including where applicable:

- Lead relationship
- Trial relationship
- type
- purpose/idempotency discriminator
- status
- dueAt
- assignee
- outcome
- note
- completedAt
- createdAt
- updatedAt

Also answer:

1. Which fields already existed before M5?
2. Which fields were added or changed in M5?
3. Are automatically created tasks allowed to be unassigned?
4. How is task history preserved?
5. What database indexes/constraints apply?
6. What prevents invalid foreign-key relationships?
7. If both Lead and Trial are supplied, where is it validated that the Trial belongs to that Lead?

Provide the migration filename(s).

---

# 5. Initial Follow-Up Task Identity / Purpose

Explain exactly how the system distinguishes the automatically generated initial scheduling confirmation call from other present/future `PHONE_CALL` tasks.

Answer:

1. What field/value identifies the task's purpose?
2. Why can a manual phone task coexist with the automatic initial task?
3. What constitutes "the same initial task" for idempotency purposes?
4. Can a cancelled/completed historical initial task coexist with a later initial task for a replacement Trial?

Show the relevant schema/service logic.

---

# 6. Automatic Task Creation — Public Trial Booking

Trace the actual execution path when a prospect successfully books through `/trial`.

Provide the flow from API handler through service/database operations, including:

```text
Lead
Trial
Lead status/history
FollowUpTask
```

Answer:

1. Where is the task created?
2. Is it created server-side rather than by Vue/frontend code?
3. Is it created immediately?
4. Is it `PHONE_CALL`?
5. Is it `PENDING`?
6. Is it unassigned by default?
7. How is its due date calculated?
8. What happens when M4 booking idempotency returns/reuses an existing booking?
9. What test proves public booking creates exactly the expected task?

---

# 7. Automatic Task Creation — Internal Trial Creation

Trace the actual execution path when STAFF/ADMIN manually schedules a Trial from the CRM.

Answer the same questions as Section 6 and identify the tests proving internal Trial creation cannot bypass M5 follow-up creation.

Confirm that the UI is not responsible for remembering to make a second API request to create the task.

---

# 8. Transaction Boundary / Atomicity

This is a critical review area.

Explain the transaction boundary for:

## Public booking

```text
Lead
+
Trial
+
Lead status/history
+
initial FollowUpTask
```

## Internal Trial creation

Explain:

1. Which service owns the transaction?
2. Which operations are inside it?
3. If FollowUpTask creation fails, what rolls back?
4. Can a scheduled Trial commit without the required initial task?
5. Can the task commit without the Trial?
6. Are status/history changes in the same transaction where required?

Describe the failure-path test that deliberately forces task creation to fail.

State exactly what database state the test verifies after rollback.

---

# 9. Idempotency / Duplicate Prevention

This is another critical review area.

Explain every layer that prevents duplicate automatic initial follow-up tasks.

Answer:

1. Is duplicate prevention enforced in application logic?
2. Is there a database uniqueness constraint/index?
3. What exact columns/condition define uniqueness?
4. How does it behave under repeated service invocation?
5. How does it behave under public booking retry/idempotency reuse?
6. How does it behave under concurrent attempts, to the extent SQLite/current architecture supports this?
7. Does refreshing a page create anything?
8. Can manual tasks still be created without colliding with the automatic-task constraint?

Provide the tests and expected counts demonstrating one initial task rather than two.

---

# 10. Two-Business-Day Due-Date Calculation

Show the actual centralized implementation for follow-up due-date calculation.

Document the effective configuration/constants for:

```text
business-day delay:
due time:
timezone:
```

Expected M5 values are:

```text
2 business days
5:00 PM
America/Denver
```

Explain whether the calculation is based on the scheduling operation timestamp rather than the Trial's future class date.

Provide automated test results for at least:

```text
Monday    → Wednesday
Tuesday   → Thursday
Wednesday → Friday
Thursday  → Monday
Friday    → Tuesday
Saturday  → Tuesday
Sunday    → Tuesday
```

Also answer:

1. How are DST transitions handled?
2. Are holidays intentionally ignored?
3. Is the logic centralized enough to change later?
4. Are raw UTC epoch milliseconds still used for persistence consistent with the application architecture?

---

# 11. Reschedule Lifecycle

Trace the actual reschedule transaction/workflow.

Expected:

```text
Old Trial = CANCELLED
New Trial = SCHEDULED
```

For the old Trial's automatic initial task:

### If PENDING

Expected:

```text
old task = CANCELLED
```

### If COMPLETED

Expected:

```text
old task remains COMPLETED
```

For the replacement Trial:

Expected:

```text
new PENDING PHONE_CALL task
new due date based on reschedule operation
```

Answer:

1. Where is this lifecycle implemented?
2. Is the obsolete task cancellation server-side?
3. Is completed history preserved?
4. Does the new task associate with the replacement Trial?
5. Does M4's corrected availability-driven reschedule behavior remain intact?
6. Are Trial replacement and task lifecycle changes transactional where appropriate?

Provide tests for both pending-old-task and completed-old-task scenarios.

---

# 12. Trial Cancellation

Trace what happens when a scheduled Trial is cancelled without replacement.

Expected:

```text
PENDING initial task → CANCELLED
COMPLETED task → unchanged
historical records → retained
```

Identify the service logic and tests.

Confirm no task records are deleted.

---

# 13. ATTENDED Lifecycle

Trace what happens when a Trial is marked `ATTENDED` while the initial task is still pending.

Expected:

```text
PENDING initial confirmation task → CANCELLED
```

Answer:

1. Why is it cancelled?
2. What happens to a completed task?
3. Is any new membership/sales task created?
4. If not, confirm that this remains deliberately deferred.

Provide the test.

---

# 14. NO_SHOW Lifecycle

Trace what happens when a Trial is marked `NO_SHOW`.

Expected:

```text
PENDING initial confirmation task → CANCELLED
```

and:

```text
NO automatic rescheduling task
NO invented no-show sequence
```

Confirm completed history remains untouched.

Provide the test.

---

# 15. Task State Machine

Document the allowed task lifecycle transitions actually implemented.

At minimum address:

```text
PENDING → COMPLETED
PENDING → CANCELLED
```

Explain how invalid transitions are rejected.

Specifically answer whether these are possible and why:

```text
COMPLETED → PENDING
CANCELLED → PENDING
COMPLETED → CANCELLED
CANCELLED → COMPLETED
```

If administrators have any correction capability, document it explicitly rather than relying on a generic PATCH.

Provide validation/service tests.

---

# 16. Assignment / Reassignment

Explain task ownership behavior.

Confirm:

- automatic tasks begin unassigned
- STAFF can assign
- STAFF can reassign
- ADMIN can assign/reassign
- VIEWER cannot assign/reassign
- assignee must be a valid active internal user
- assignment is preserved when the task is completed

Answer:

1. Can inactive users be assigned?
2. What happens if an assigned user later becomes inactive?
3. Is completion actor recorded separately from assignee? If yes, how? If no, state that clearly.

Provide relevant API/service tests.

---

# 17. Call Outcomes

List the actual allowed PHONE_CALL outcomes.

Expected set unless implementation documents a justified deviation:

```text
REACHED
NO_ANSWER
LEFT_VOICEMAIL
WRONG_NUMBER
OTHER
```

Answer:

1. Is outcome required to complete a PHONE_CALL task?
2. Is outcome validated server-side?
3. Can a pending/cancelled task carry a completion outcome?
4. Does selecting an outcome automatically change Lead status?
5. Confirm that it should not unless an existing explicit rule requires it.

Provide tests.

---

# 18. Task Notes

Explain note behavior.

Answer:

1. Is it plain text?
2. Maximum length?
3. Is validation server-side?
4. Is the note preserved after completion/cancellation?
5. Can VIEWER modify it?
6. Does `OTHER` require a note, or is the note optional?

Document any deviation from the preferred workflow.

---

# 19. Completing a Task

Trace the server-side completion operation.

Confirm it preserves/sets the appropriate fields:

```text
status = COMPLETED
completedAt
outcome
note
dueAt
createdAt
Trial relationship
Lead relationship
assignee
```

If completion actor/audit data is recorded, describe it.

Explain what happens if completion is attempted without a required outcome.

Provide tests.

---

# 20. Manual Cancellation

Trace manual STAFF/ADMIN cancellation.

Answer:

1. Which endpoint/service handles it?
2. Is the task retained?
3. Is cancellation timestamp/reason captured, if supported?
4. Can VIEWER cancel?
5. Can public users cancel?

Provide tests.

---

# 21. Manual Follow-Up Task Creation

State whether manual PHONE_CALL task creation was implemented.

If implemented, document:

- Lead selection
- optional Trial association
- due date/time
- assignee
- note
- validation
- RBAC
- interaction with automatic-task idempotency

If not implemented, state:

```text
DEFERRED
```

and explain why it was reasonably deferred under the M5 prompt rather than treating it as a failure of the mandatory workflow.

---

# 22. Task API Surface

List every M5 task-related API route and method.

For each route provide:

```text
METHOD /path
Purpose:
Authentication:
Authorization:
Validation schema:
Service called:
```

Include list/filter, assignment, completion, cancellation, and manual creation if implemented.

Also identify Trial endpoints/services modified to integrate automatic task lifecycle behavior.

---

# 23. Server-Side RBAC Evidence

Provide an authorization matrix for task operations:

| Operation | Public | VIEWER | STAFF | ADMIN |
|---|---|---|---|---|
| List/read | | | | |
| Assign | | | | |
| Reassign | | | | |
| Complete | | | | |
| Cancel | | | | |
| Manual create | | | | |
| Configuration | | | | |

Then identify the actual handler/API tests proving:

```text
PUBLIC → 401
VIEWER write → 403
STAFF write → success
ADMIN write → success
```

Do not cite only service-unit tests if API/handler authorization was required.

Confirm no FollowUpTask data is exposed through `/api/public/*`.

---

# 24. Task Validation

Document server-side validation for:

- task type
- status transitions
- dueAt
- assignee existence
- assignee active state
- Lead existence
- Trial existence
- Trial belongs to Lead
- outcome enum
- outcome requirement on completion
- note length
- role permissions

For each validation, identify where it lives.

---

# 25. `/tasks` Queue

Describe the implemented task queue from a staff user's perspective.

Confirm whether it displays:

- Lead/prospect name
- phone
- task type
- Trial class
- Trial date/time
- due date/time
- status
- assignee
- overdue state
- Lead-detail link

Describe the default view.

Explain the actual filters/tabs implemented for:

```text
Open
Due Today
Overdue
Upcoming
Completed
Cancelled
```

If names differ, map them to these concepts.

Explain the sort order for actionable tasks.

Expected priority:

```text
1. overdue
2. due today
3. upcoming
4. earliest due first
```

Identify the API/query logic that supports the queue.

---

# 26. Due-State Semantics

Explain exactly how these are derived in `America/Denver`:

```text
Overdue
Due Today
Upcoming
```

Confirm `OVERDUE` is derived rather than stored as a permanent task status unless the implementation intentionally differs.

Explain boundary behavior around midnight and the 5:00 PM due timestamp.

---

# 27. Dashboard Integration

Describe the M5 dashboard changes.

Confirm whether it surfaces counts equivalent to:

```text
Overdue
Due Today
Upcoming
```

Describe the high-priority task preview/list and link to `/tasks`.

Confirm M5 did not redesign the entire dashboard or add unrelated marketing analytics.

Identify API/service changes and tests.

---

# 28. Lead Detail Integration

Describe the final Lead-detail follow-up section.

Confirm it exposes useful human-readable information for:

- type
- status
- due date/time
- assignee
- outcome
- note
- completion/cancellation state
- useful timestamps

Can STAFF/ADMIN complete a task directly from Lead detail?

If yes, confirm it uses the same server-side service/API logic as the task queue rather than duplicate lifecycle logic.

If not, explain the chosen UX.

---

# 29. Mobile / Responsive Behavior

Describe what was done to keep the task workflow usable at common phone widths.

Specifically address:

- readability of task rows/cards
- visibility of phone number
- assignment controls
- completion controls
- horizontal scrolling

If no browser/mobile-width verification occurred, mark this `NOT VERIFIED`.

---

# 30. M1–M4 Regression Protection

Explain how M5 preserved accepted behavior for:

- authentication
- RBAC
- Lead CRM
- Lead status history
- public `/trial`
- Adult scheduling
- Kids scheduling/age bands
- persisted availability
- exceptions
- availability validation
- phone normalization
- booking idempotency
- atomic booking
- corrected availability-driven rescheduling
- Trial statuses/history
- attribution
- existing dashboard metrics
- `admin` / `setup`

List any M1–M4 code that had to change and why.

State whether any accepted behavior intentionally changed.

---

# 31. Migration Verification

List all M5 migrations.

Report verification for:

## Fresh database

```text
migration result:
seed/bootstrap result:
```

## Accepted M4 database upgraded to M5

```text
migration result:
data preservation result:
```

Confirm:

- foreign keys
- indexes
- uniqueness/idempotency constraints
- seed idempotency
- existing login remains `admin` / `setup`

Report any migration warnings or manual intervention required.

---

# 32. Automated Test Inventory

Provide the complete M5-relevant automated test inventory.

Map tests explicitly to the M5 acceptance scenarios:

```text
A  Public Trial creates follow-up
B  Internal Trial creates follow-up
C  Monday → Wednesday
D  Thursday → Monday
E  Friday → Tuesday
F  Weekend → Tuesday
G  Retry/idempotency
H  Reschedule pending old task
I  Reschedule completed old task
J  Trial cancellation
K  ATTENDED
L  NO_SHOW
M  Complete call
N  RBAC
O  Transaction failure/rollback
```

For each scenario provide:

```text
PASS / PARTIAL / FAIL / NOT VERIFIED
Test file/test name
What it proves
```

Also identify any important tests beyond the minimum list.

---

# 33. Full QA Gate Results

Report exact commands and results:

```text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

For tests provide:

```text
Test files:
Tests passed:
Tests failed:
Skipped:
Duration if available:
```

For lint/typecheck/build report:

```text
PASS / FAIL
warnings:
```

Do not omit warnings simply because the command exited successfully.

---

# 34. Manual Browser QA

State exactly what browser QA Cursor actually performed.

For each flow mark:

```text
PASS / FAIL / NOT VERIFIED
```

Flows:

```text
Login admin/setup
Dashboard follow-up section
Open /tasks
Task filters
Assign task
Reassign task
Complete with outcome
Complete with note
Cancel task
Open Lead detail
Work task from Lead detail
Schedule internal Trial → task appears
Public /trial booking → task appears internally
Reschedule → old pending task cancelled/new task created
Reschedule after completed call → completed history preserved/new task created
Trial ATTENDED → pending task cancelled
Trial NO_SHOW → pending task cancelled/no new workflow
Trial CANCELLED → pending task cancelled
Mobile-width usability
VIEWER read-only behavior
```

Do not describe API tests as browser QA.

If browser tooling was unavailable, say so explicitly.

---

# 35. Security / Public Exposure Review

Confirm:

1. No public API exposes task notes.
2. No public API exposes staff assignments.
3. No public API allows task mutation.
4. No public route exposes internal task queue data.
5. Server-side authentication/authorization is enforced independently of UI hiding.
6. Task notes/outcomes are validated as untrusted input.
7. No secrets or credentials were introduced into committed source.

Document any security concern discovered during implementation.

---

# 36. Documentation Updated

List every durable `vault/` document updated for M5 and summarize the change.

Confirm documentation records the actual implemented decisions for:

- two-business-day deadline
- Monday–Friday business days
- 5:00 PM due time
- America/Denver
- unassigned default
- outcomes
- Trial lifecycle interactions
- no-show behavior
- external notifications deferred
- M5 implementation status

Also identify the M5 completion handoff file.

---

# 37. Explicit Scope Verification

For each item below, answer `NOT STARTED` or explain why repository changes were necessary:

```text
M6 production deployment
VPS provisioning
PostgreSQL migration
Meta API
Facebook Lead Ads
Instagram integration
Meta analytics
Pixel / Conversions API
SMS
Email
Automated prospect sequences
No-show rescheduling automation
Payments / Stripe
Capacity limits
Waitlists
Holiday calendar
Telephony
Multi-tenancy
SaaS billing
Multi-location architecture
```

The expected answer for all is `NOT STARTED` unless a minimal non-functional preparation was genuinely necessary and documented.

---

# 38. Deviations From the Approved M5 Prompt

List every deviation, even if minor.

For each:

```text
Requirement:
Actual implementation:
Reason:
Impact:
Recommended action:
```

If there are no deviations, say:

```text
No known deviations.
```

Do not silently reinterpret the prompt.

---

# 39. Assumptions Introduced During Implementation

List every technical/business assumption Cursor had to make that was not explicitly settled by the M5 prompt or existing repository documentation.

For each assumption state whether it is:

```text
Temporary
Configurable
Requires future client decision
Safe to retain
```

---

# 40. Known Issues / Technical Debt

List all known issues, limitations, warnings, and technical debt discovered or introduced during M5.

Separate them into:

```text
Blocks architect approval
Blocks human acceptance
Blocks production later
Non-blocking future improvement
```

Do not omit an issue because it is outside M5 scope.

---

# 41. Architect Risk Review

Answer these directly:

1. Is there any path that can produce a `SCHEDULED` Trial without its required automatic initial follow-up task?
2. Is there any path that can create duplicate automatic initial tasks for one Trial?
3. Can a frontend/client craft a request that bypasses Trial/task lifecycle rules?
4. Can a VIEWER or unauthenticated user mutate task state?
5. Can rescheduling destroy completed follow-up history?
6. Can arbitrary invalid task state transitions occur through a generic update endpoint?
7. Can timezone handling produce the wrong business-day deadline around weekends or DST?
8. Can task creation failure leave partial Lead/Trial/status state committed?
9. Can a task be assigned to an invalid/inactive user?
10. Can task outcome/note data leak through public APIs?

For each answer provide:

```text
YES / NO / UNKNOWN
Evidence
```

Any `YES` or `UNKNOWN` that threatens a core M5 invariant must be highlighted.

---

# 42. Final Acceptance Matrix

Complete this matrix using only:

```text
PASS
PARTIAL
FAIL
NOT VERIFIED
```

| Requirement | Status | Evidence / Notes |
|---|---|---|
| Clean accepted M4 starting baseline | | |
| Public scheduled Trial creates initial task | | |
| Internal scheduled Trial creates initial task | | |
| Task created immediately | | |
| PHONE_CALL / PENDING | | |
| Unassigned by default | | |
| Two-business-day deadline | | |
| Weekend skipping | | |
| 5 PM America/Denver | | |
| Due-date logic centralized | | |
| Automatic task creation idempotent | | |
| Database duplicate protection where appropriate | | |
| Public booking retry does not duplicate task | | |
| Task creation transactional with scheduling | | |
| Failure rolls back partial workflow | | |
| Reschedule cancels old pending task | | |
| Reschedule preserves completed old task | | |
| Reschedule creates new task | | |
| Trial cancellation cancels pending initial task | | |
| ATTENDED cancels pending initial task | | |
| NO_SHOW cancels pending initial task | | |
| NO_SHOW does not invent new automation | | |
| Task history preserved | | |
| STAFF/ADMIN assignment | | |
| VIEWER read-only | | |
| Active-user assignment validation | | |
| Call outcome captured | | |
| Outcome required on PHONE_CALL completion | | |
| Plain-text note captured | | |
| Invalid task transitions rejected | | |
| `/tasks` queue operational | | |
| Open/Due Today/Overdue/Upcoming history views | | |
| Operational sort order | | |
| Dashboard follow-up visibility | | |
| Lead detail integration | | |
| Public task access blocked | | |
| Handler/API RBAC tests | | |
| Fresh migration works | | |
| M4→M5 migration works | | |
| M1–M4 regression tests remain green | | |
| `pnpm test` | | |
| `pnpm lint` | | |
| `pnpm typecheck` | | |
| `pnpm build` | | |
| Durable docs updated | | |
| Completion handoff created | | |
| M6/deployment not started | | |
| Meta integration not started | | |

---

# 43. Human Acceptance Test Recommendations

Based on the actual implementation, provide a concise ordered browser test plan for Scott.

Prioritize tests that automated coverage cannot fully validate, especially:

- staff comprehension
- queue usability
- task priority clarity
- mobile usability
- assignment UX
- outcome/note UX
- Lead-detail workflow
- reschedule history presentation

For each recommended test provide:

```text
Steps
Expected result
What defect this would catch
```

Keep this focused on M5 acceptance rather than future enhancements.

---

# 44. Final Handoff

Provide:

```text
Branch:
HEAD:
M5 commit:
Push status:
Working tree:
Tests:
Lint:
Typecheck:
Build:
Migration verification:
Browser QA:
Known blocking issues:
```

Then end the entire response with exactly one of:

```text
M5 READY FOR ARCHITECT REVIEW
```

or

```text
M5 NOT READY FOR ARCHITECT REVIEW
```

Do not claim readiness if any core invariant is `FAIL`, if transactional consistency is unverified, if API-level RBAC is unverified, or if the required automated acceptance scenarios are materially incomplete.
