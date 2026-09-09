# M5 Implementation Prompt --- Follow-Up / Task Workflow

**Project:** Renzo Gracie Kaysville Customer Acquisition System\
**Milestone:** M5 --- Follow-Up / Task Workflow\
**Purpose:** Implement the first operational human follow-up workflow
after a prospect schedules an intro class.\
**Status:** Ready for implementation after M4 is accepted, committed,
and pushed.

------------------------------------------------------------------------

# 0. Instructions to Cursor

Implement M5 on top of the completed and accepted M4 codebase.

Before changing code:

1.  Inspect the repository.
2.  Read the durable project documentation under `vault/`.
3.  Read the current milestone and implementation-state notes.
4.  Inspect the actual schema, services, API handlers, Lead detail page,
    dashboard, authentication/RBAC implementation, Trial lifecycle, and
    existing `FollowUpTask` implementation.
5.  Treat the repository/source code as authoritative when
    implementation details differ from older planning notes.
6.  Reuse existing domain entities and services where appropriate rather
    than creating parallel concepts.

Do not begin M6 / production deployment work.

Do not begin Meta integration

Do not add SMS or email sending.

Do not redesign M1--M4 functionality unless a minimal change is required
to integrate M5 correctly.

Do not silently invent business rules that are not specified below. If
an edge case requires a technical default, choose the smallest
reasonable implementation, make it configurable where appropriate,
document the assumption, and include it in the handoff.

------------------------------------------------------------------------

# 1. Business Objective

The gym explicitly wants a human phone call after a prospect schedules
an intro class.

The system should ensure that this follow-up does not depend on staff
remembering that a prospect exists.

The M5 workflow is:

``` text
Trial Scheduled
      ↓
FollowUpTask automatically created
      ↓
Task appears immediately in staff workflow
      ↓
Due within two business days
      ↓
Staff calls prospect
      ↓
Staff records the result
      ↓
Task becomes completed or cancelled
```

The system is assisting the human sales process, not replacing it.

The first M5 task type is:

``` text
PHONE_CALL
```

The purpose of the initial call is generally to:

-   make personal contact
-   welcome the prospect
-   confirm the scheduled intro
-   answer questions
-   improve attendance likelihood
-   surface problems before the scheduled class

M5 does **not** send the call, text, email, or external notification
automatically.

------------------------------------------------------------------------

# 2. Existing Domain Model

The project already has a first-class `FollowUpTask` domain entity from
earlier milestones.

Inspect and reuse it.

Expected existing conceptual values include:

Task type:

``` text
PHONE_CALL
```

Task statuses:

``` text
PENDING
COMPLETED
CANCELLED
```

Do not create a second task table or a separate concept such as
`CallTask` unless the actual repository proves the existing entity
cannot support M5.

Use the existing model and extend it only where M5 genuinely requires
additional data.

------------------------------------------------------------------------

# 3. Core M5 Rule

Whenever a Trial enters the active scheduled state:

``` text
Trial.status = SCHEDULED
```

the system should ensure that an appropriate pending follow-up
phone-call task exists for that Trial.

This includes Trials created through:

-   public `/trial`
-   internal/manual Trial creation
-   rescheduling, when the existing Trial lifecycle creates a new
    scheduled Trial

The task must be created as part of the business workflow, not only as a
frontend side effect.

A direct call to the relevant server-side Trial creation/rescheduling
service must still produce the correct follow-up task.

------------------------------------------------------------------------

# 4. Task Creation Timing

Create the follow-up task **immediately** when the Trial is successfully
scheduled.

Do not wait until the due date to create it.

Expected behavior:

``` text
Trial scheduled
      ↓
PHONE_CALL task exists immediately
      ↓
Status = PENDING
      ↓
Due date = two business days after scheduling
```

This allows staff to call sooner than the deadline.

------------------------------------------------------------------------

# 5. Due-Date Business Rule

For M5, the default follow-up deadline is:

> Two business days after the Trial is scheduled.

For this milestone, business days are:

``` text
Monday
Tuesday
Wednesday
Thursday
Friday
```

Saturday and Sunday are not business days.

Do not implement holiday-calendar logic in M5.

Examples:

``` text
Scheduled Monday    → due Wednesday
Scheduled Tuesday   → due Thursday
Scheduled Wednesday → due Friday
Scheduled Thursday  → due Monday
Scheduled Friday    → due Tuesday
Scheduled Saturday  → due Tuesday
Scheduled Sunday    → due Tuesday
```

Use the application's existing timezone:

``` text
America/Denver
```

The calculation must be deterministic and tested.

------------------------------------------------------------------------

# 6. Due Time

Do not create a vague date-only deadline if the existing schema expects
a timestamp.

Use a clear application default for the due time.

Preferred M5 default:

``` text
5:00 PM America/Denver
```

on the calculated second business day.

This represents "complete the call by the end of the business day."

If the existing schema or architecture strongly favors another
representation, preserve the existing design but document the choice.

Do not hard-code the business rule throughout the codebase.

Centralize the calculation/configuration so the gym can change the
follow-up timing later without rewriting task creation logic.

At minimum, structure the implementation so these concepts are
centralized:

``` text
business-day delay = 2
due time = 5:00 PM
timezone = America/Denver
```

A full settings UI for these values is not required unless it fits
naturally into the existing settings architecture.

------------------------------------------------------------------------

# 7. Idempotent Task Creation

M5 must not create duplicate follow-up tasks because the same operation
is retried or processed twice.

For a given scheduled Trial, there should be at most one active initial
scheduling follow-up task of this type/purpose.

Examples that must not create duplicate pending tasks:

-   browser retry
-   network retry
-   duplicate service invocation
-   public booking idempotency reuse
-   refreshing the page
-   reprocessing the same Trial

If the public booking returns an already-existing Trial via M4
idempotency, do not create a second follow-up task.

Use a robust server-side uniqueness/idempotency strategy.

Do not rely solely on frontend behavior.

If a database constraint/index is appropriate, add it through a proper
migration.

------------------------------------------------------------------------

# 8. Rescheduling Behavior

M4 supports rescheduling by cancelling the old Trial and creating a new
scheduled Trial.

M5 must integrate cleanly with that lifecycle.

Expected behavior:

``` text
Old Trial
SCHEDULED
    ↓
Reschedule
    ↓
Old Trial = CANCELLED
New Trial = SCHEDULED
```

Follow-up behavior:

``` text
Old Trial's still-PENDING initial follow-up task
    ↓
CANCELLED

New scheduled Trial
    ↓
new PENDING PHONE_CALL follow-up task
    ↓
new due date calculated from the reschedule operation
```

Do not alter historical COMPLETED tasks.

A completed call remains part of history even if the prospect later
reschedules.

If the old task is already COMPLETED:

``` text
leave it COMPLETED
```

and create the appropriate task for the newly scheduled Trial.

This gives us an accurate record of what staff actually did.

------------------------------------------------------------------------

# 9. Trial Cancellation Behavior

If a scheduled Trial is cancelled without replacement:

-   any still-PENDING initial scheduling follow-up task for that Trial
    should become `CANCELLED`
-   COMPLETED tasks remain historical
-   CANCELLED tasks remain historical

Do not delete task history.

------------------------------------------------------------------------

# 10. Trial Attendance Behavior

If a Trial becomes:

``` text
ATTENDED
```

before its initial follow-up phone task has been completed, the pending
confirmation-call task is no longer useful.

Automatically cancel the still-PENDING initial scheduling follow-up
task.

Do not alter COMPLETED tasks.

Do not automatically create a membership-sales task in M5 unless the
existing repository already contains an explicitly specified workflow
for that behavior.

That can be a future enhancement.

------------------------------------------------------------------------

# 11. No-Show Behavior

Do not invent an automatic no-show follow-up sequence in M5.

When a Trial becomes:

``` text
NO_SHOW
```

the initial pre-trial confirmation call task should no longer remain
pending.

If it is still PENDING:

``` text
cancel it
```

Preserve completed task history.

Do **not** automatically create a new rescheduling task yet.

The client has not provided a definitive no-show follow-up rule.

The CRM should continue to surface the Lead/Trial as `NO_SHOW` using the
existing M3/M4 behavior.

Document automatic no-show rescheduling work as deferred.

------------------------------------------------------------------------

# 12. Task Ownership

The client has not yet defined a single person who always owns follow-up
calls.

Do not hard-code Pedro, Scott, an instructor, or another individual.

For M5:

-   allow a FollowUpTask to be unassigned
-   allow STAFF or ADMIN to assign a task to an active internal user
-   allow reassignment
-   preserve assignment when completing the task
-   record enough information to identify who completed the task if the
    existing domain model supports it

If the existing schema already has an assignee/owner field, reuse it.

If it does not, add the smallest appropriate schema extension through a
migration.

The default automatically-created task should be:

``` text
unassigned
```

unless the existing architecture already has a clearly documented
default-owner rule.

------------------------------------------------------------------------

# 13. Who Can Work Tasks

Use the existing RBAC model.

Expected behavior:

## VIEWER

May:

-   view permitted follow-up task information

May not:

-   assign
-   reassign
-   complete
-   cancel
-   create manual follow-up tasks
-   edit task notes/outcomes

## STAFF

May:

-   view tasks
-   assign/reassign tasks
-   complete tasks
-   cancel tasks
-   record call outcome/notes
-   create a manual PHONE_CALL follow-up task if manual task creation is
    implemented

## ADMIN

May do everything STAFF can do.

ADMIN may also access any M5 configuration introduced by this milestone.

Enforce permissions server-side.

Frontend visibility is not the security boundary.

Add handler/API authorization tests.

------------------------------------------------------------------------

# 14. Task Queue / Internal Workflow

M5 needs a practical place where staff can see the work that needs
attention.

Inspect the current application navigation and dashboard before choosing
the final route.

Preferred implementation:

``` text
/tasks
```

Create an internal task queue if a dedicated task route does not already
exist.

The queue should prioritize operational usefulness over visual
complexity.

At minimum, staff should be able to see:

-   prospect/Lead name
-   phone number
-   task type
-   associated Trial class
-   Trial date/time
-   due date/time
-   task status
-   assignee
-   overdue state

The Lead name should link to the Lead detail page.

Phone number should be easy to read.

Do not expose raw database identifiers as the primary UI.

------------------------------------------------------------------------

# 15. Task Queue Views / Filters

Provide useful basic filtering.

At minimum:

``` text
Open
Due Today
Overdue
Upcoming
Completed
Cancelled
```

If a simpler tab/filter implementation fits the existing UI better, use
it.

Default view should emphasize actionable work:

``` text
PENDING tasks
```

Sort pending work operationally:

1.  overdue first
2.  due today
3.  upcoming
4.  earliest due time first within each group

Completed/cancelled history should remain accessible but should not
dominate the default queue.

------------------------------------------------------------------------

# 16. Due-State Definitions

Use America/Denver.

Conceptually:

## Upcoming

``` text
PENDING
and dueAt > end/current threshold for today
```

## Due Today

``` text
PENDING
and due date is today
```

## Overdue

``` text
PENDING
and dueAt < current time
```

Use the actual timestamp semantics consistently.

Do not store "OVERDUE" as a separate permanent status unless the
existing domain model requires it.

Overdue should normally be derived from:

``` text
status = PENDING
+
dueAt < now
```

------------------------------------------------------------------------

# 17. Dashboard Integration

M5 should surface follow-up work on the existing dashboard.

Do not redesign the entire dashboard.

Add a focused operational section/card showing useful information such
as:

``` text
Follow-Up Tasks

Overdue: 3
Due Today: 5
Upcoming: 8
```

Also show a short list of the highest-priority pending tasks.

The dashboard should link to the full task queue.

This is intended to answer:

> What do staff need to do right now?

Do not add speculative marketing analytics in M5.

------------------------------------------------------------------------

# 18. Lead Detail Integration

The Lead detail page should clearly show follow-up work associated with
that Lead.

The project already displays existing FollowUpTasks in some form.

Inspect and improve/reuse that implementation.

At minimum show:

-   type
-   status
-   due date/time
-   assignee
-   completion/cancellation state
-   call outcome
-   notes
-   created/completed timestamps where useful

Staff should be able to complete the task from either:

-   the task queue
-   the Lead detail page

if that can be implemented cleanly without duplicating business logic.

Both interfaces must call the same server-side task service/API
behavior.

------------------------------------------------------------------------

# 19. Call Outcome

When staff completes a PHONE_CALL task, allow them to record a simple
outcome.

Do not overbuild a full communications system.

Use a small controlled set.

Recommended initial values:

``` text
REACHED
NO_ANSWER
LEFT_VOICEMAIL
WRONG_NUMBER
OTHER
```

If the repository already contains a compatible outcome model, reuse it.

Outcome should be optional or required based on the simplest usable
workflow.

Preferred behavior:

``` text
COMPLETED PHONE_CALL
→ outcome required
```

because a completed call task without knowing what happened provides
little operational value.

`OTHER` should allow a note.

Do not automatically change the Lead status merely because a particular
call outcome was selected unless an existing documented rule requires
it.

The task records the interaction; Lead lifecycle remains controlled by
existing Lead/Trial workflow.

------------------------------------------------------------------------

# 20. Notes

Allow STAFF/ADMIN to record a concise note when completing or updating a
follow-up task.

Example:

``` text
Spoke with Sarah. Confirmed Tuesday 6 PM. Asked about what to wear.
```

Preserve the note after completion.

Do not build a general-purpose rich-text communication log in M5.

Use plain text.

Apply reasonable validation/length limits.

------------------------------------------------------------------------

# 21. Completing a Task

Expected flow:

``` text
Open task
    ↓
Call prospect
    ↓
Select outcome
    ↓
Optional note
    ↓
Complete
```

Server behavior should set:

``` text
status = COMPLETED
completedAt = current timestamp
```

and preserve:

-   dueAt
-   createdAt
-   Trial relationship
-   Lead relationship
-   assignee
-   outcome
-   note

If the existing schema uses different field names, follow the
repository.

------------------------------------------------------------------------

# 22. Cancelling a Task

STAFF/ADMIN may manually cancel a task when appropriate.

Expected behavior:

``` text
status = CANCELLED
```

Preserve the record.

If the existing schema supports cancellation metadata, use it.

Do not delete FollowUpTasks to represent cancellation.

------------------------------------------------------------------------

# 23. Manual Follow-Up Tasks

If the existing FollowUpTask service/API already supports manual
creation cleanly, expose a small STAFF/ADMIN UI to create an additional
PHONE_CALL task for a Lead.

This is useful for cases such as:

``` text
"Call again Thursday"
```

Manual task creation should allow:

-   Lead
-   optional associated Trial
-   due date/time
-   assignee
-   note

Do not let this requirement derail the primary automatic scheduling
workflow.

If exposing manual task creation would require substantial unrelated
architecture, document it as deferred rather than overbuilding M5.

Automatic Trial-scheduling tasks are the mandatory portion.

------------------------------------------------------------------------

# 24. Notifications

For M5, the internal application is the notification surface.

Required:

-   task queue
-   dashboard due/overdue visibility

Not required:

-   SMS to staff
-   email to staff
-   push notifications
-   browser notifications
-   Slack
-   external messaging

Do not add external notification infrastructure.

------------------------------------------------------------------------

# 25. No Automated Prospect Messaging

M5 must not send automated prospect communications.

The following remain future work:

``` text
SMS
Email
Messenger
Instagram DM
WhatsApp
```

Consent fields captured during M4 remain useful future data, but M5
should not act on them.

------------------------------------------------------------------------

# 26. Transactional Consistency

Follow-up task creation must participate correctly in the Trial
lifecycle.

For a brand-new public booking, the desired final business operation is
conceptually:

``` text
Lead
+
Trial
+
Lead status/history
+
initial FollowUpTask
```

Do not allow a successful Trial scheduling operation to commit while the
required initial FollowUpTask silently fails.

Extend the transaction boundary appropriately.

The same principle applies to internal Trial creation.

If creating the required task fails, the scheduling operation should
fail/rollback rather than leave the system in a state where a scheduled
prospect has no required follow-up work.

Add failure-path automated tests.

------------------------------------------------------------------------

# 27. Task History / Auditability

Do not delete historical task records.

The system should allow us to answer later:

-   Was a follow-up task created?
-   When was it due?
-   Who owned it?
-   Was it completed?
-   When?
-   What was the outcome?
-   Was it cancelled?
-   Which Trial was it associated with?

Use existing timestamps/audit fields where possible.

Do not build a separate event-sourcing system.

------------------------------------------------------------------------

# 28. Database / Migration Requirements

Inspect the current `FollowUpTask` schema first.

Only add fields that M5 actually needs.

Possible required concepts include:

-   associated Lead
-   associated Trial
-   type
-   status
-   dueAt
-   assigned user
-   outcome
-   note
-   completedAt
-   createdAt
-   updatedAt
-   purpose/idempotency discriminator

Do not blindly add fields already present.

Any schema change must use the repository's established migration
process.

Verify:

-   fresh database migration
-   migration from the accepted M4 database
-   seed/bootstrap behavior
-   indexes/constraints
-   foreign keys
-   idempotency constraint where appropriate

Do not manually mutate the SQLite database as the implementation
mechanism.

------------------------------------------------------------------------

# 29. Seed / Development Data

Preserve the existing development login:

``` text
username: admin
password: setup
```

Do not change those credentials in M5.

If seeded task examples are useful for development, keep them minimal
and deterministic.

Do not create noisy fake production-like data on every startup.

Repeated seed execution must remain safe/idempotent.

------------------------------------------------------------------------

# 30. API Design

Follow the existing Nitro/API conventions.

Use server-side services for business logic.

Do not implement task lifecycle logic separately in multiple Vue pages.

Conceptually, M5 will likely need operations equivalent to:

``` text
GET    /api/follow-up-tasks
POST   /api/follow-up-tasks
PATCH  /api/follow-up-tasks/:id
```

The exact routes should follow the repository's existing conventions.

Operations must support the required workflow:

-   list/filter
-   assign/reassign
-   complete
-   cancel
-   manual create if implemented

Automatic task creation should occur through domain/service logic, not
by having the frontend call a second endpoint after creating a Trial.

------------------------------------------------------------------------

# 31. Security

All internal task APIs require authentication.

Server-side expected permissions:

``` text
READ:
VIEWER
STAFF
ADMIN

WRITE:
STAFF
ADMIN

M5 configuration:
ADMIN
```

Public users must not be able to:

-   list tasks
-   read task notes
-   see staff assignments
-   create tasks
-   complete tasks
-   cancel tasks
-   modify due dates
-   modify outcomes

Do not expose FollowUpTask information through `/api/public/*`.

Add real handler/API authorization tests similar to the M4 correction
approach.

------------------------------------------------------------------------

# 32. Validation

Validate server-side:

-   task type
-   task status transitions
-   due date
-   assignee exists and is active
-   Lead exists
-   Trial exists when provided
-   Trial belongs to the Lead when both are provided
-   outcome values
-   note length
-   role permissions

Do not rely on frontend controls.

Reject invalid state transitions.

Examples:

``` text
COMPLETED → PENDING
```

should not occur accidentally through a generic PATCH unless explicitly
supported.

Design clear task lifecycle rules.

------------------------------------------------------------------------

# 33. M5 Acceptance Scenarios

Automated tests must cover at least the following.

## Scenario A --- Public Trial creates follow-up

``` text
Public prospect schedules Trial
        ↓
Lead created
Trial created
Lead = TRIAL_SCHEDULED
FollowUpTask created
Task type = PHONE_CALL
Task status = PENDING
Task due = +2 business days at configured/default due time
```

## Scenario B --- Internal Trial creates follow-up

``` text
STAFF creates Trial manually
        ↓
FollowUpTask created automatically
```

## Scenario C --- Monday

``` text
scheduled Monday
→ due Wednesday
```

## Scenario D --- Thursday

``` text
scheduled Thursday
→ due Monday
```

## Scenario E --- Friday

``` text
scheduled Friday
→ due Tuesday
```

## Scenario F --- Weekend

``` text
scheduled Saturday/Sunday
→ due Tuesday
```

## Scenario G --- Retry/idempotency

Same Trial processed twice:

``` text
one initial pending task
```

not two.

## Scenario H --- Reschedule

``` text
old Trial CANCELLED
old pending task CANCELLED
new Trial SCHEDULED
new pending task created
```

## Scenario I --- Completed old task + reschedule

``` text
old task COMPLETED
        ↓
reschedule
        ↓
old task remains COMPLETED
new Trial gets new PENDING task
```

## Scenario J --- Trial cancelled

``` text
Trial CANCELLED
→ pending initial task CANCELLED
```

## Scenario K --- Trial attended before task completion

``` text
Trial ATTENDED
→ pending initial confirmation task CANCELLED
```

## Scenario L --- No-show

``` text
Trial NO_SHOW
→ pending initial confirmation task CANCELLED
→ no automatic reschedule task
```

## Scenario M --- Complete call

``` text
STAFF
→ selects outcome
→ note
→ COMPLETED
→ completedAt populated
```

## Scenario N --- RBAC

``` text
PUBLIC → 401
VIEWER write → 403
STAFF write → success
ADMIN write → success
```

## Scenario O --- Transaction failure

Force initial FollowUpTask creation to fail during Trial scheduling.

Expected:

``` text
no partially committed scheduled Trial workflow
```

Verify rollback according to the operation's transaction boundary.

------------------------------------------------------------------------

# 34. UI Acceptance Requirements

The M5 UI should be understandable to normal gym staff.

Avoid technical/database language.

Prefer:

``` text
Follow-Up
Due Today
Overdue
Assigned To
Call Outcome
Complete
Cancel
```

Avoid presenting:

``` text
follow_up_task_id
lead_id
trial_id
enum codes
raw timestamps
```

Use human-readable dates/times in America/Denver.

The task queue should make the next action obvious.

------------------------------------------------------------------------

# 35. Responsive / Practical Use

Gym staff may use this from a phone.

Do not redesign the entire application for mobile, but ensure the task
workflow is usable at common mobile widths.

At minimum:

-   task rows/cards remain readable
-   phone number remains visible
-   Complete/Assign actions remain usable
-   no essential information requires horizontal scrolling if reasonably
    avoidable

Use the existing responsive conventions.

------------------------------------------------------------------------

# 36. Existing Behavior That Must Not Regress

Preserve accepted M1--M4 behavior, including:

-   authentication
-   RBAC
-   Lead CRM
-   Lead status history
-   public `/trial`
-   Adult scheduling
-   Kids age-band scheduling
-   persisted intro availability
-   date-specific exceptions
-   server-side availability validation
-   phone normalization
-   booking idempotency
-   atomic booking
-   internal rescheduling using actual availability
-   Trial statuses
-   Trial history
-   attribution
-   dashboard existing metrics
-   `admin` / `setup`

Do not alter the accepted M4 scheduling UX unnecessarily.

------------------------------------------------------------------------

# 37. Explicitly Deferred

Do not implement these in M5:

-   Meta API
-   Facebook Lead Ads
-   Instagram integration
-   ad analytics
-   Pixel / Conversions API
-   SMS sending
-   email sending
-   automated prospect sequences
-   no-show automation beyond cancelling the obsolete pending
    confirmation task
-   membership billing
-   payment processing
-   Stripe
-   capacity limits
-   waitlists
-   holiday business calendars
-   AI-generated call scripts
-   call recording
-   telephony integration
-   production VPS deployment
-   PostgreSQL migration
-   multi-tenancy
-   SaaS billing
-   multi-location architecture

These belong to later milestones.

------------------------------------------------------------------------

# 38. Documentation

Update durable project documentation to reflect the actual M5
implementation.

At minimum inspect/update the appropriate existing notes for:

-   milestone status
-   domain model
-   database
-   CRM
-   architecture
-   authentication/RBAC if relevant
-   FollowUpTask behavior
-   implementation state
-   decisions

Do not duplicate the same information across unnecessary documents.

Document:

-   two-business-day rule
-   business-day definition
-   due-time rule
-   unassigned-by-default decision
-   task outcomes
-   Trial lifecycle interactions
-   no-show behavior
-   deferred external notifications

------------------------------------------------------------------------

# 39. QA Gates

Before reporting M5 complete, run the repository's full QA gates.

At minimum:

``` text
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Also perform appropriate database migration verification.

Report exact:

-   commands
-   test count
-   pass/fail
-   warnings
-   migration results

Do not report success based only on new M5 tests.

All existing regression tests must remain green.

------------------------------------------------------------------------

# 40. Manual Browser QA

Perform browser QA if tooling is available.

At minimum exercise:

``` text
admin / setup
    ↓
dashboard
    ↓
task queue
    ↓
open task
    ↓
assign
    ↓
complete with outcome/note
```

Also verify:

``` text
schedule test Trial
    ↓
task appears
```

and:

``` text
reschedule Trial
    ↓
old pending task cancelled
new pending task appears
```

If browser tooling is unavailable, explicitly state:

``` text
NOT MANUALLY VERIFIED
```

Do not describe HTTP tests as browser QA.

Human project-owner acceptance will still occur after architect review.

------------------------------------------------------------------------

# 41. Git Workflow

Work on the current project branch according to the repository's
established workflow.

Do not merge branches unless explicitly instructed by the user.

Do not reset unrelated work.

Do not commit local Obsidian files that are intentionally excluded from
project commits.

Before implementation, record the starting branch and HEAD.

After implementation and QA:

-   inspect `git diff`
-   ensure only intended M5 changes are included
-   create a clear M5 implementation commit
-   push to the corresponding remote branch if the current established
    workflow permits it

If the repository state indicates that M4 acceptance changes are still
uncommitted/unpushed, STOP before implementing M5 and report that
condition instead of mixing M4 and M5 into one commit.

M5 must begin from a clean, accepted M4 baseline.

------------------------------------------------------------------------

# 42. Required Completion Handoff

After implementation, create a thorough Markdown handoff:

``` text
vault/wip/M5_Completion_Handoff_2026-08-28.md
```

The handoff should include:

1.  starting Git state
2.  ending Git state
3.  commit(s)
4.  push status
5.  files changed
6.  schema/migrations
7.  FollowUpTask domain changes
8.  automatic task creation behavior
9.  two-business-day calculation
10. due-time behavior
11. ownership/assignment
12. queue/dashboard UI
13. Lead detail integration
14. outcomes/notes
15. reschedule behavior
16. cancellation behavior
17. ATTENDED behavior
18. NO_SHOW behavior
19. idempotency
20. transaction behavior
21. RBAC
22. API routes
23. automated tests
24. lint/typecheck/build
25. migration verification
26. manual browser QA
27. deviations from this prompt
28. assumptions
29. known issues
30. deferred items
31. documentation updated
32. acceptance matrix
33. confirmation that M6/Meta/deployment work was not started

Use:

``` text
PASS
PARTIAL
FAIL
NOT VERIFIED
```

for the acceptance matrix.

End with exactly one assessment:

``` text
M5 READY FOR ARCHITECT REVIEW
```

or:

``` text
M5 NOT READY FOR ARCHITECT REVIEW
```

with reasons.

------------------------------------------------------------------------

# 43. Definition of Done

M5 is implementation-complete when all of the following are true:

-   accepted M4 is the clean starting baseline
-   scheduled Trials automatically create a PHONE_CALL FollowUpTask
-   task is created immediately
-   default deadline is two business days later
-   weekends are skipped
-   due time is centralized and deterministic
-   America/Denver is used
-   automatically-created tasks are unassigned by default
-   task creation is idempotent
-   public and internal Trial creation both trigger the workflow
-   rescheduling cancels obsolete pending task and creates a new task
-   completed historical tasks are preserved
-   Trial cancellation cancels pending initial task
-   ATTENDED cancels obsolete pending initial task
-   NO_SHOW cancels obsolete pending initial task without inventing a
    new workflow
-   STAFF/ADMIN can assign/reassign
-   STAFF/ADMIN can complete/cancel
-   VIEWER is read-only
-   call outcome is captured
-   completion note can be captured
-   task queue exists and is operationally useful
-   overdue/due-today/upcoming work is clear
-   dashboard surfaces actionable follow-up work
-   Lead detail shows task history
-   public users cannot access task data
-   server-side authorization is tested
-   transactional failure behavior is tested
-   migrations work from fresh and accepted-M4 databases
-   existing M1--M4 behavior remains green
-   full tests pass
-   lint passes
-   typecheck passes
-   production build passes
-   documentation is updated
-   M6/Meta/deployment work is not started
-   M5 completion handoff is created

------------------------------------------------------------------------

# Final Instruction

Implement M5 as a focused operational follow-up system.

The goal is not to build a communications platform.

The goal is:

``` text
Prospect schedules intro
        ↓
The system makes it impossible for that human follow-up obligation
to quietly disappear.
```

Keep the workflow simple enough that gym staff will actually use it,
while preserving clean domain logic, auditability, RBAC, and future
extensibility.
