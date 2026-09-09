# Cursor Implementation Prompt --- M4 Intro Scheduling Funnel

## Project

Renzo Gracie Kaysville Customer Acquisition System

## Milestone

**M4 --- Intro Scheduling Funnel**

This prompt begins from the completed M0--M3 implementation. M4 is the
only business milestone authorized by this prompt.

Do **not** begin M5 follow-up automation or M6 Meta integration.

------------------------------------------------------------------------

# 1. Required Git / Repository Safety

Work only on the branch already specified by Scott for this
implementation session.

Before making changes:

1.  Run `git branch --show-current`.
2.  Confirm the current branch exactly matches the branch Scott
    specified.
3.  Run `git status`.
4.  Inspect the current HEAD.
5.  Do not switch branches, create branches, merge, rebase, reset,
    cherry-pick, amend pushed commits, force-push, modify remotes, clean
    unrelated files, or discard user changes.
6.  Do not commit local Obsidian configuration files under
    `vault/.obsidian/*`.
7.  If the branch does not match the branch Scott specified, stop and
    report the mismatch rather than changing branches yourself.

At the end of M4:

1.  Run the full QA suite described below.
2.  Review `git status` and the complete diff.
3.  Ensure no unrelated changes are included.
4.  Update permanent project documentation to reflect the implemented M4
    behavior.
5.  Commit M4 as its own milestone commit.
6.  Push the current branch.
7.  Stop. Do not proceed into M5.

------------------------------------------------------------------------

# 2. Read Before Implementing

Before changing code:

1.  Read the relevant permanent documentation in `vault/`.
2.  Read the current README and project configuration.
3.  Inspect the existing M1 domain schema and migrations.
4.  Inspect M2 authentication/authorization.
5.  Inspect the M3 Lead CRM, Trial model, Lead status service,
    validation patterns, API patterns, UI patterns, tests, and existing
    dashboard/application shell.
6.  Reuse existing conventions rather than creating parallel
    architecture.

The source code is authoritative for exact implementation details.

Do not scan or rewrite unrelated parts of the repository.

------------------------------------------------------------------------

# 3. Current Project State

M0--M3 are complete.

The existing application already includes the acquisition-domain
foundation:

``` text
Program
Campaign
Lead
LeadStatusHistory
LeadNote
Trial
FollowUpTask
User
```

Existing lead statuses include:

``` text
NEW
CONTACTED
RESPONDED
TRIAL_SCHEDULED
TRIAL_ATTENDED
NO_SHOW
JOINED
LOST
```

Existing Trial statuses include:

``` text
SCHEDULED
ATTENDED
NO_SHOW
CANCELLED
```

Existing M3 behavior includes:

-   Lead creation and editing
-   Adult and Kids leads
-   phone-only or email-only internal leads
-   duplicate warnings without duplicate rejection
-   notes
-   status history
-   manual Trial creation
-   Trial outcomes
-   Trial rescheduling
-   Joined state and monthly-rate capture
-   authenticated ADMIN / STAFF / VIEWER roles
-   server-side authorization

M4 must extend this existing system rather than replace it.

------------------------------------------------------------------------

# 4. Business Context Learned Since M3

The gym currently does **not** have a true self-service intro scheduling
system.

The current website has a free-trial form. A prospect submits
information, the result goes to the gym's email, and the gym manually
handles the prospect afterward.

The desired future acquisition flow is:

``` text
Ad / Social / Website
        ↓
Public Trial Page
        ↓
Capture Contact Information
        ↓
Select Intro Class Date / Time
        ↓
Lead Created
        ↓
Trial Created
        ↓
Lead Status = TRIAL_SCHEDULED
        ↓
Confirmation
```

The key improvement is that the prospect should be able to lock in a
specific intro date/time while they are actively interested.

M5 will later handle the human follow-up workflow. Do not implement that
automation here.

------------------------------------------------------------------------

# 5. Working Scheduling Assumption

The gym has not yet formally answered which specific classes should
accept first-time trials.

For M4, use this explicit working assumption:

> Any age/program-appropriate class on the supplied Renzo Gracie
> Kaysville class schedule may initially accept a first-time trial.

However, this must be **configuration**, not hard-coded public-form
behavior.

Administrators must be able to enable/disable trial availability through
the internal application so the gym can later say things such as:

-   no trials at 6:00 AM
-   Friday Study Hall should not accept trials
-   temporarily disable a particular recurring class
-   add a new intro-eligible class
-   change an existing class time

without requiring a code deployment.

The public `/trial` page must obtain available options from persisted
configuration.

------------------------------------------------------------------------

# 6. Supplied Class Schedule

Use the following schedule as the initial source for recurring trial
availability.

## Adult BJJ / Adult Training

### Monday

``` text
6:00 AM  Jiu Jitsu with Gi — Adults
6:00 PM  Jiu Jitsu with Gi — Adults
7:00 PM  Jiu Jitsu No-Gi — Adults
```

### Tuesday

``` text
12:00 PM Jiu Jitsu with Gi — Adults
6:00 PM  Jiu Jitsu No-Gi — Adults
7:00 PM  Jiu Jitsu with Gi — Adults
7:00 PM  Striking 101 — Adults
```

### Wednesday

``` text
6:00 AM  Jiu Jitsu No-Gi — Adults
6:00 PM  Jiu Jitsu with Gi — Adults
7:00 PM  MMA Cross Training — Adults
```

### Thursday

``` text
12:00 PM Jiu Jitsu No-Gi — Adults
6:00 PM  Jiu Jitsu No-Gi — Adults
7:00 PM  Jiu Jitsu with Gi — Adults
```

### Friday

``` text
6:00 AM  Jiu Jitsu with Gi — Adults
12:00 PM Open Mat Gi/No-Gi — Adults
6:00–7:30 PM Study Hall (Gi/No-Gi) & Sparring — Adults
7:00 PM  Striking 101 — Adults
```

### Saturday

``` text
10:00–11:30 AM Study Hall (Gi/No-Gi) & Sparring — Adults
```

## Kids BJJ

### Ninjas --- Ages 4--7

``` text
Monday     4:15 PM  Ninjas No-Gi
Tuesday    4:15 PM  Ninjas BJJ
Wednesday  4:15 PM  Ninjas BJJ
Thursday   4:15 PM  Ninjas BJJ
Friday     4:15 PM  Fun Day — Ninjas & Samurai
```

### Samurai --- Ages 8--11

``` text
Monday     5:00 PM  Samurai No-Gi
Tuesday    5:00 PM  Samurai BJJ
Wednesday  5:00 PM  Samurai BJJ
Thursday   5:00 PM  Samurai BJJ
Friday     4:15 PM  Fun Day — Ninjas & Samurai
```

### Future Champs --- Ages 12--16

``` text
Monday     5:00 PM  Future Champs No-Gi
Tuesday    5:00 PM  Future Champs BJJ
Wednesday  5:00 PM  Future Champs BJJ
Thursday   5:00 PM  Future Champs No-Gi
Friday     5:00 PM  Future Champs MMA & Self Defense
```

Do not interpret this as a request to build a complete gym
class-management system.

This schedule exists only to support **intro-trial availability**.

------------------------------------------------------------------------

# 7. Important Domain Boundary

A class existing and a class accepting first-time trials are different
business facts.

Conceptually:

``` text
Class exists
    ≠
Intro booking is enabled
```

M4 should therefore introduce a narrow persisted model for **intro
availability / recurring trial slot rules** rather than turning the
application into a general class scheduler.

Use naming that fits the existing codebase after inspecting it. Examples
might include:

``` text
IntroAvailability
IntroSlotRule
TrialAvailabilityRule
```

Do not blindly use one of those names if the current project conventions
suggest something better.

------------------------------------------------------------------------

# 8. Required M4 Capability --- Configurable Intro Availability

Create an internal ADMIN-facing configuration UI for recurring trial
availability.

A reasonable route is something like:

``` text
/settings/intro-availability
```

but follow the application's existing navigation and routing
conventions.

The configuration must allow an ADMIN to manage the recurring trial
options used by the public form.

At minimum, an availability rule needs enough information to represent:

-   associated Program
-   day of week
-   start time
-   optional end time where needed
-   human-readable class/slot name
-   age minimum where applicable
-   age maximum where applicable
-   enabled/disabled state
-   timestamps consistent with current project conventions

Do not add fields without a demonstrated requirement.

The internal UI must make it easy to:

-   see the current recurring intro schedule
-   distinguish Adult vs Kids availability
-   enable/disable an existing slot
-   add a slot
-   edit a slot
-   preserve validation and authorization

Only ADMIN should be able to change availability configuration unless
the existing authorization architecture strongly indicates another
appropriate rule.

Authenticated STAFF/VIEWER access should follow existing project
conventions, but do not grant configuration writes merely for
convenience.

------------------------------------------------------------------------

# 9. Schedule Exceptions

Recurring weekly rules alone are insufficient.

Design M4 so the gym can override availability for a specific calendar
date without altering the recurring rule.

Examples:

``` text
Labor Day:
No intro bookings

Tuesday 6:00 PM this week:
Disabled

Special Saturday intro class:
Enabled for this date
```

Implement the smallest clean exception model that supports date-specific
availability changes.

Do not build:

-   staff calendars
-   room scheduling
-   complex recurrence engines
-   student class attendance
-   instructor scheduling
-   enterprise calendar functionality

The public availability service should resolve recurring rules plus
applicable date-specific exceptions.

Document the resolution behavior clearly and test it.

------------------------------------------------------------------------

# 10. Kids Scheduling Behavior

The existing business model intentionally treats:

``` text
Lead/contact = parent or guardian
Participant = child
```

Preserve that behavior.

The public trial flow should make Kids scheduling understandable to a
parent without requiring them to know Renzo's internal class names.

Age should determine which age-appropriate Kids availability is
presented.

Current age bands:

``` text
Ninjas          4–7
Samurai         8–11
Future Champs   12–16
```

Do not expose inappropriate age-group slots.

If the existing Lead schema stores date of birth or age-related
participant data differently than expected, reuse the current
implementation rather than creating duplicate fields.

If the existing model lacks enough information to safely derive age,
make the smallest M4-compatible change necessary and document it.

------------------------------------------------------------------------

# 11. Public `/trial` Route

Implement a public, mobile-friendly trial scheduling flow.

Expected route:

``` text
/trial
```

This route must not require authentication.

The public form should capture the information required to create a
valid Lead and Trial using existing domain rules.

At minimum, design for:

## Adult

``` text
First name
Last name
Phone
Email (optional if consistent with current business requirement)
Program
Experience
Relevant consent fields
Intro date/time
```

## Kids

``` text
Parent/guardian contact information
Child participant information required by existing schema
Age/date information required to determine the correct age group
Program
Relevant consent fields
Intro date/time
```

For the public acquisition form, **phone is required** because the gym
specifically wants a phone number for human follow-up.

Do not weaken the existing database invariant requiring at least phone
or email.

Use server-side validation with the project's existing Zod/validation
patterns.

Client-side validation may improve UX but must not be the authoritative
validation layer.

------------------------------------------------------------------------

# 12. Public Availability UX

Do not make the prospect reason about recurring schedule rules.

The application should translate configuration into actual upcoming
bookable dates/times.

Conceptually:

``` text
Adult BJJ

Monday, August 31
6:00 AM — Jiu Jitsu with Gi
6:00 PM — Jiu Jitsu with Gi
7:00 PM — Jiu Jitsu No-Gi

Tuesday, September 1
12:00 PM — Jiu Jitsu with Gi
...
```

For Kids, show only age-appropriate upcoming choices.

Use `America/Denver` for presentation, consistent with the existing
project time policy.

Persist timestamps according to the current project's established UTC
epoch-millisecond convention.

Do not hard-code displayed calendar dates from this prompt. Generate
future dates from the recurring configuration.

Choose a reasonable bounded upcoming booking horizon based on the
simplest maintainable M4 implementation. Make the horizon a clearly
defined application rule/configuration rather than scattering a magic
number throughout the code. Document the chosen behavior.

Do not invent capacity limits because the client has not supplied any.

------------------------------------------------------------------------

# 13. Public Submission Transaction

A successful public scheduling submission must leave the CRM in a
coherent state.

Conceptually:

``` text
Public submission
      ↓
Create Lead
      ↓
Create Trial
      ↓
Lead status → TRIAL_SCHEDULED
      ↓
Write LeadStatusHistory
      ↓
Return confirmation
```

This should behave atomically where practical using the existing
database architecture.

Do not allow a partial result such as:

``` text
Lead created
Trial failed
status inconsistent
```

Reuse the existing Lead and status-transition services where appropriate
instead of duplicating M3 business logic inside the public API route.

The Trial must use the existing Trial domain model rather than
introducing a second public-booking representation.

------------------------------------------------------------------------

# 14. Duplicate Handling

M3 intentionally treats duplicate phone/email as:

``` text
WARN
```

rather than:

``` text
REJECT
```

Do not silently change that global CRM policy.

However, public scheduling must not accidentally create obviously
duplicated records because of double-clicks/retries.

Implement reasonable request/idempotency protection appropriate to the
current stack without building a distributed idempotency platform.

If an existing Lead is detected by the current duplicate rules, preserve
the existing domain philosophy and choose the least surprising M4
behavior after inspecting the code.

Document and test the chosen public duplicate behavior.

Do not implement a full Lead merge system in M4.

------------------------------------------------------------------------

# 15. Attribution Support

The public route should preserve the project's future
acquisition-attribution path.

Support query-string acquisition metadata such as:

``` text
/trial?source=instagram&campaign=fall-adult-bjj
```

Use existing Lead source and Campaign models where possible.

Do not invent arbitrary Campaign records from untrusted query-string
text if the existing domain expects database-backed Campaigns.

Validate/resolve attribution safely.

The form must still work when no attribution parameters are supplied.

Meta integration is **not** part of M4.

------------------------------------------------------------------------

# 16. Confirmation State

After successful scheduling, show a clear confirmation containing the
important booking information, including:

-   prospect/participant context as appropriate
-   selected date
-   selected time
-   selected class/program
-   confirmation that the gym has received the request/booking

Do not implement automated SMS or email confirmation in M4 unless such
behavior already exists and merely needs to be reused.

Messaging automation belongs later.

------------------------------------------------------------------------

# 17. Internal CRM Integration

A Lead created from `/trial` must immediately be visible through the
existing internal CRM.

The Lead detail page should show the created Trial using the existing M3
Trial UI/history.

Do not create a separate "website leads" management screen.

The entire point is:

``` text
Public acquisition surface
        ↓
Existing CRM
```

not two disconnected systems.

------------------------------------------------------------------------

# 18. Dashboard Impact

Update the existing dashboard only as necessary so M4-created Leads and
scheduled Trials are correctly reflected in existing metrics.

Do not turn M4 into a dashboard redesign or analytics milestone.

If existing dashboard queries already pick up the new records
automatically, avoid unnecessary changes.

------------------------------------------------------------------------

# 19. Test User Credentials

Adjust the development/test bootstrap user so the expected test login
credentials are:

``` text
username: admin
password: setup
```

Important:

-   Inspect the existing M2 authentication implementation before
    changing it.
-   The current implementation may use an email-based
    identifier/environment bootstrap. Modify it cleanly so the
    development/test login experience supports the requested `admin`
    username rather than layering a hack on top.
-   Preserve secure password hashing.
-   Never persist the plaintext password.
-   Do not weaken production authentication requirements.
-   Update `.env.example`, seed/bootstrap logic, automated tests,
    README/vault documentation, and login UI labels/validation as
    required by the actual implementation.
-   Do not commit a real production secret.
-   If production bootstrap semantics need to remain environment-driven,
    keep them environment-driven while making the documented
    development/test credentials above work.
-   Existing authorization behavior for ADMIN/STAFF/VIEWER must remain
    intact.

------------------------------------------------------------------------

# 20. Security / Public Form Requirements

Because `/trial` is public, include appropriate baseline protections.

At minimum:

-   authoritative server-side validation
-   normalization consistent with existing Lead handling
-   no trust in client-provided IDs
-   safe handling of source/campaign parameters
-   protection against accidental duplicate submissions
-   no exposure of internal-only fields
-   no ability for public callers to choose arbitrary Lead status
-   no ability for public callers to assign themselves internal
    users/roles
-   no leakage of stack traces or sensitive configuration

Implement lightweight spam/abuse mitigation appropriate for M4 if it can
be done cleanly within the current architecture.

Do not introduce a large third-party anti-bot platform unless clearly
necessary.

Document any intentionally deferred production-hardening item.

------------------------------------------------------------------------

# 21. Explicit M4 Non-Goals

Do **not** implement any of the following in this milestone:

``` text
Automatic next-day FollowUpTask creation
SMS automation
Email automation
Meta OAuth
Meta Graph API
Meta webhooks
Meta Lead Ads ingestion
Messenger automation
Instagram DM automation
Payment processing
Membership billing
Full class scheduling
Existing-member attendance
Belt tracking
Instructor scheduling
Staff calendars
Capacity management
Waitlists
Waiver management
Point of sale
General gym-management functionality
Content-management pipeline
Advanced analytics
SaaS / multi-tenant architecture
```

If a tempting feature does not directly support:

``` text
Public prospect
→ available intro slot
→ Lead
→ Trial
→ TRIAL_SCHEDULED
```

it is probably outside M4.

------------------------------------------------------------------------

# 22. Database / Migration Requirements

Use Drizzle and the project's existing migration process.

Requirements:

-   create forward-only migration(s)
-   do not rewrite previously applied M1--M3 migrations
-   preserve SQLite compatibility
-   avoid SQLite-specific application behavior that unnecessarily blocks
    future PostgreSQL migration
-   use foreign keys consistent with existing domain conventions
-   use timestamps consistent with the existing project
-   seed the supplied recurring schedule in a deterministic, repeatable
    manner
-   ensure seed behavior does not create duplicate availability rows on
    repeated execution

Test both:

1.  fresh database migration + seed
2.  migration of an existing M3 database to M4

------------------------------------------------------------------------

# 23. API / Service Architecture

Follow existing M3 patterns.

Prefer:

``` text
API route
   ↓
validation
   ↓
service/domain logic
   ↓
Drizzle
```

Do not place substantial business logic directly in Vue components.

Create a focused availability service responsible for resolving bookable
dates/times from:

``` text
recurring availability
+
date-specific exceptions
```

Reuse existing Lead/Trial/status services for booking creation wherever
possible.

External-provider logic is irrelevant to M4 and must not be introduced.

------------------------------------------------------------------------

# 24. Authorization Requirements

Preserve the current server-side authorization model.

Expected principles:

``` text
Public:
read public bookable availability
submit public trial booking

Authenticated:
existing CRM reads

ADMIN:
manage intro availability configuration

STAFF:
existing operational CRM writes, unless current architecture says otherwise

VIEWER:
read-only
```

Server enforcement is authoritative.

Do not rely solely on hiding buttons in the UI.

Add authorization tests for the new internal configuration endpoints.

------------------------------------------------------------------------

# 25. Required Automated Test Coverage

Extend the existing test suite substantially.

At minimum cover:

## Availability

-   recurring rule produces correct future dates
-   disabled recurring rule is not public
-   date-specific closure removes a normally available slot
-   date-specific override behavior works as designed
-   Adult availability does not expose Kids-only slots
-   Kids age bands resolve correctly
-   timezone/date boundaries behave correctly for `America/Denver`

## Public form

-   public route/API does not require authentication
-   valid Adult submission succeeds
-   valid Kids submission succeeds
-   phone is required publicly
-   invalid/missing required fields fail
-   invalid program/availability IDs fail
-   disabled/unavailable slot cannot be booked
-   arbitrary status injection is rejected/ignored
-   attribution without parameters works
-   valid source/campaign attribution works according to existing domain
    rules
-   duplicate/retry behavior works as documented

## Transactional behavior

-   successful booking creates Lead
-   successful booking creates Trial
-   Trial is `SCHEDULED`
-   Lead becomes `TRIAL_SCHEDULED`
-   LeadStatusHistory is written
-   failed booking does not leave partial inconsistent state

## Authorization

-   ADMIN can manage availability
-   STAFF cannot change ADMIN-only configuration if that is the chosen
    rule
-   VIEWER cannot change availability
-   unauthenticated caller cannot use internal configuration APIs

## Existing behavior

-   M1--M3 tests remain green
-   login works with development/test credentials `admin` / `setup`
-   password remains hashed
-   existing role enforcement remains intact

Use the existing test framework and conventions.

------------------------------------------------------------------------

# 26. Manual QA Requirements

After automated tests pass, manually verify the running application.

At minimum:

1.  Start from a fresh database.
2.  Migrate and seed.
3.  Log in as:

``` text
admin
setup
```

4.  Open the intro-availability administration UI.
5.  Verify seeded Adult and Kids schedule data.
6.  Disable one recurring slot and verify it disappears publicly.
7.  Re-enable it.
8.  Add or edit a slot and verify public availability updates.
9.  Create a date-specific closure and verify the affected date is
    unavailable.
10. Open `/trial` while logged out.
11. Complete an Adult booking.
12. Confirm success state.
13. Log in and verify the Lead exists.
14. Verify the Trial exists.
15. Verify Lead status/history.
16. Complete a Kids booking for at least two different age bands and
    verify age-appropriate options.
17. Attempt invalid/disabled-slot submissions.
18. Verify refresh/double-submit behavior does not create accidental
    duplicate bookings.
19. Verify existing M3 CRM operations still work.
20. Verify VIEWER/STAFF/ADMIN authorization behavior relevant to the new
    screens.

Perform real browser click-through QA if the repository/tooling
environment permits it. If not, explicitly report what could and could
not be manually verified.

------------------------------------------------------------------------

# 27. Full QA Gate

Before committing:

``` text
fresh DB migration
fresh DB seed
existing DB → M4 migration
lint
typecheck
full automated test suite
production build
manual browser/application QA
git diff review
git status review
```

Fix failures rather than documenting them away unless the failure is
demonstrably environmental and unrelated to the implementation.

Do not commit generated junk, temporary databases, local environment
files, browser artifacts, or Obsidian local state.

------------------------------------------------------------------------

# 28. Documentation Requirements

Update permanent documentation under `vault/` to reflect the actual M4
implementation.

Document:

-   public `/trial` flow
-   recurring intro availability model
-   date-specific exception model
-   initial schedule seed
-   Adult behavior
-   Kids age-band behavior
-   public phone requirement
-   booking transaction behavior
-   attribution behavior
-   duplicate/retry behavior
-   authorization
-   test credentials for development/test
-   intentionally deferred M5 behavior
-   any production-hardening items deferred
-   new migrations
-   new routes/APIs/services
-   QA results
-   final M4 commit hash after commit

Do not leave permanent docs describing M4 as blocked once it is
implemented.

If there are WIP notes containing the client scheduling uncertainty,
update/process them according to the vault's existing documentation
conventions rather than creating contradictory permanent documentation.

------------------------------------------------------------------------

# 29. Acceptance Criteria

M4 is complete only when all of the following are true:

1.  A logged-out prospect can open `/trial`.
2.  The prospect can provide valid Adult or Kids contact/participant
    information.
3.  The prospect sees actual upcoming intro dates/times derived from
    persisted configuration.
4.  Kids prospects see only age-appropriate availability.
5.  An ADMIN can manage recurring intro availability from the internal
    UI.
6.  A specific date can be overridden/closed without changing the
    recurring weekly rule.
7.  A valid public booking creates a coherent Lead + Trial +
    status-history result.
8.  The Lead is immediately visible in the existing CRM.
9.  The Trial is immediately visible through the existing Lead workflow.
10. The Lead is `TRIAL_SCHEDULED`.
11. Public phone number is required.
12. Disabled/unavailable slots cannot be booked by bypassing the UI.
13. Public users cannot manipulate internal CRM state beyond the
    intended booking operation.
14. Existing M1--M3 functionality remains operational.
15. Development/test login works with:

``` text
username: admin
password: setup
```

16. Lint passes.
17. Typecheck passes.
18. Full tests pass.
19. Production build passes.
20. Documentation is current.
21. M4 is committed and pushed as its own milestone.
22. Work stops before M5.

------------------------------------------------------------------------

# 30. Implementation Philosophy

Do not over-engineer this milestone.

The target is:

``` text
CONFIGURATION
Recurring Intro Availability
        +
Date Exceptions
        ↓
PUBLIC ACQUISITION
/trial
        ↓
DOMAIN
Lead
+
Trial
+
Status History
        ↓
EXISTING CRM
Operational staff can see the scheduled prospect
```

The application is a **customer-acquisition system**, not a general
gym-management platform.

M4 succeeds when a stranger can go from interest to a specific scheduled
intro class without requiring gym staff to manually receive an email and
arrange the initial date/time.

M5 will handle the next-day human follow-up workflow later.

M6 will handle Meta integration later.

Stop after M4.
