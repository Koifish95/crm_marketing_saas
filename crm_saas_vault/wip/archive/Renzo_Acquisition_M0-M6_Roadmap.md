# Renzo Gracie Kaysville Acquisition System
# Implementation Roadmap: M0 Through M6

## Purpose

This document defines the implementation sequence for the Renzo Gracie Kaysville Customer Acquisition System from the initial application foundation through Meta integration.

The system is intended to support this business funnel:

```text
Ad
→ Prospect Interest
→ Contact Capture
→ Intro Scheduling
→ Lead
→ Next-Day Follow-Up
→ Intro Visit
→ Attend / No Show / Reschedule
→ Join
```

The system should automate repetitive process steps while preserving deliberate human interaction where it creates value.

Meta is treated as an external acquisition source.

The internal application owns the acquisition workflow.

The project should be implemented incrementally.

Each milestone should:

1. Have a narrow objective.
2. Produce a usable architectural layer.
3. Update permanent project documentation.
4. Include tests appropriate to the milestone.
5. Be thoroughly QA'd.
6. Be committed with detailed commit notes.
7. Be pushed to the explicitly specified branch.
8. Stop before beginning the next milestone unless the controlling prompt explicitly authorizes continuation.

The milestone order is:

```text
M0  Application Foundation
M1  Core Database / Domain Model
M2  Authentication / Authorization
M3  Lead CRM
M4  Intro Scheduling Funnel
M5  Follow-Up / Task Workflow
M6  Meta Integration
```

---

# Development and Version Control Workflow

## Branch Control

The user will explicitly specify the Git branch to use in each implementation prompt.

Cursor must not choose, create, switch, rename, merge, rebase, or delete branches unless explicitly instructed.

At the beginning of development work:

1. Confirm the current branch.
2. Confirm it matches the branch named in the prompt.
3. If it does not match, STOP and report the mismatch.
4. Do not automatically switch branches unless the prompt explicitly authorizes it.

The user is responsible for placing the repository on the intended working branch before development begins.

The branch named in the implementation prompt is the authoritative branch for that work.

Example instruction:

```text
Work only on branch: m2-authentication
```

Cursor should verify:

```bash
git branch --show-current
```

and continue only when the result matches the requested branch.

---

## Milestones Are Development Sprints

Treat each milestone as a discrete development sprint.

A milestone is not complete merely because the feature appears to work.

Each milestone follows this lifecycle:

```text
Read Requirements
      ↓
Inspect Relevant Documentation
      ↓
Inspect Relevant Code
      ↓
Implement Milestone
      ↓
Update Tests
      ↓
Update Documentation
      ↓
Thorough QA
      ↓
Review Git Diff
      ↓
Commit
      ↓
Push
      ↓
Report Results
```

Do not begin the next milestone before the current milestone has completed this lifecycle unless the user explicitly instructs Cursor to execute multiple milestones in one prompt.

---

## Multi-Milestone Prompts

The user may provide Cursor with multiple milestones at once.

When that happens, Cursor should treat each milestone as an independently versioned sprint.

Example:

```text
M2
Implement authentication

QA
Commit
Push

M3
Implement Lead CRM

QA
Commit
Push

M4
Implement public intro scheduling

QA
Commit
Push
```

Do not implement M2 through M4 and then make one large final commit.

Each milestone must receive its own:

- implementation boundary
- tests
- documentation updates
- QA cycle
- commit
- push

This creates useful rollback points and preserves version history across the project.

---

## Pre-Milestone Requirements

Before starting a milestone:

1. Verify the requested Git branch.
2. Read the controlling implementation prompt.
3. Read the relevant permanent vault documentation.
4. Read relevant WIP information if referenced.
5. Inspect the current implementation state.
6. Review the previous milestone status.
7. Check `git status`.
8. Identify pre-existing uncommitted changes.

Do not overwrite or silently absorb unrelated user changes.

If unrelated uncommitted changes exist, document them before proceeding and avoid modifying them unless required by the requested work.

---

## Documentation During Development

Documentation updates are part of the milestone.

Before a milestone can be committed, update relevant vault documentation when the implementation materially changes:

- architecture
- schema
- domain model
- workflows
- business rules
- security
- deployment
- integrations
- environment variables
- development commands
- current implementation state
- milestone status
- decisions
- limitations
- unresolved questions

Do not create documentation noise for trivial code changes.

The goal is reliable project memory.

---

# QA Requirements

Every development milestone must undergo a deliberate QA pass before commit.

QA should be appropriate to the milestone rather than mechanically running irrelevant checks.

At minimum, consider:

```text
Lint
Typecheck
Unit tests
Integration tests
Database migration
Seed behavior
Fresh database setup
Build
Relevant API behavior
Relevant UI behavior
Authorization behavior
Regression checks
Documentation accuracy
```

---

## Standard QA Commands

Use the repository's actual scripts.

Typical examples may include:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:setup
```

Do not invent script names if they do not exist.

If a required QA script is missing, either use the appropriate direct command or document the gap.

---

## Database Milestone QA

When schema or migrations change, QA should include both:

### Fresh environment path

```text
Empty database
    ↓
Run all migrations
    ↓
Run seed
    ↓
Application/test validation
```

### Upgrade path

```text
Existing development database
    ↓
Apply new migration
    ↓
Validate existing data/schema
```

Do not consider a database milestone complete if only a freshly created database works.

---

## UI QA

When a milestone adds user-facing functionality, validate the actual workflow where practical.

Examples:

```text
Login
Lead creation
Lead status changes
Trial scheduling
Public form submission
Task completion
```

Automated tests do not eliminate the need to reason through the actual user flow.

Do not claim browser/UI verification occurred unless it actually occurred.

---

## QA Failure Rule

If QA fails:

1. Do not commit.
2. Diagnose the failure.
3. Fix issues within milestone scope.
4. Re-run relevant QA.
5. Commit only after the milestone is in a passing state.

If the failure cannot be resolved without changing scope, STOP and report the blocker.

Do not hide failing tests or disable checks merely to produce a commit.

---

# Git Review Before Commit

Before committing a milestone:

1. Run `git status`.
2. Review the final diff.
3. Confirm only intended files changed.
4. Confirm no credentials/secrets were added.
5. Confirm generated files are appropriate to commit.
6. Confirm documentation reflects the implementation.
7. Confirm QA passed.
8. Confirm no next-milestone work leaked into the current diff.

Useful commands include:

```bash
git status
git diff
git diff --staged
```

Use additional Git inspection commands where helpful.

---

# Commit Requirements

Each completed milestone gets its own commit.

Commit messages should be descriptive and useful six months later.

Avoid vague messages such as:

```text
updates
changes
work
fix stuff
M2 done
```

Prefer a concise subject with detailed body notes.

Example:

```text
feat(auth): implement M2 session authentication

- add password hashing and credential verification
- protect internal Nuxt routes with session middleware
- add ADMIN, STAFF, and VIEWER authorization helpers
- seed environment-driven development admin
- add authentication integration tests
- document auth architecture and security boundaries
```

The exact conventional-commit prefix is optional unless otherwise documented, but detailed commit context is required.

---

## Commit Scope

A milestone commit should include:

- implementation
- tests
- migrations
- configuration
- documentation
- related cleanup required by that milestone

Do not intentionally split one milestone into many tiny commits unless explicitly requested.

Default:

```text
One milestone
=
One high-quality milestone commit
```

Exception:

A milestone may require multiple commits when there is a strong technical reason, such as a prerequisite migration or an independently valuable corrective commit.

If multiple commits are used, document why.

---

# Push Requirements

After successful QA and commit:

1. Confirm the commit exists locally.
2. Push the current explicitly approved branch.
3. Verify the push succeeded.
4. Do not push unrelated branches.
5. Do not force push unless explicitly instructed.

Typical pattern:

```bash
git push
```

or, if the upstream has not yet been configured and the prompt allows it:

```bash
git push -u origin <explicit-branch-name>
```

Do not invent a remote or branch name.

Do not push to `main` unless the user explicitly identified `main` as the working branch for the task.

---

# Post-Push Milestone Report

After each milestone commit and push, report:

1. milestone completed
2. branch used
3. commit hash
4. commit subject
5. major files created/modified
6. features implemented
7. database migrations, if any
8. tests added/updated
9. QA commands executed
10. QA results
11. documentation updated
12. deviations from milestone requirements
13. unresolved questions/blockers
14. recommended next milestone

If multiple milestones are authorized in one prompt, provide a short checkpoint after each milestone internally and continue only after its commit and push are confirmed successful.

At the end, provide a summary of all milestone commits created during the session.

---

# Prohibited Git Behavior

Unless explicitly requested, do not:

- switch branches
- create branches
- delete branches
- merge branches
- rebase branches
- reset branches
- force push
- amend previously pushed commits
- squash history
- cherry-pick
- modify Git remotes
- push directly to a different branch
- clean unrelated files
- discard user changes

Version-control safety takes priority over convenience.

---

# M0 — Application Foundation

## Objective

Create a running, intentionally blank full-stack application foundation.

M0 proves that the selected technical stack works together before business functionality is introduced.

## Scope

M0 establishes:

```text
Nuxt 4
Vue 3
TypeScript
Tailwind CSS
Drizzle ORM dependencies/configuration
SQLite configuration
Zod
nuxt-auth-utils foundation
environment configuration
linting
formatting
Docker
README/developer setup
basic application shell
```

No business functionality should exist yet.

## Acceptance Criteria

M0 is complete when:

1. Application runs locally.
2. Nuxt renders successfully.
3. TypeScript compiles.
4. Lint passes.
5. Database tooling is configured.
6. SQLite location/configuration is known.
7. Docker configuration exists.
8. Environment configuration is documented.
9. No domain business tables exist.
10. Permanent documentation reflects the skeleton state.
11. QA passes.
12. M0 is committed and pushed to the explicitly approved branch.

## Current Status

M0 is complete.

---

# M1 — Core Database and Domain Model

## Objective

Create the core persistence layer for the customer acquisition funnel.

Domain:

```text
Program ──► Lead ◄── Campaign
              |
              +── LeadStatusHistory
              +── LeadNote
              +── Trial
              +── FollowUpTask
```

## Program

Programs are data rather than a fixed application enum.

Fields:

```text
id
code
name
active
seasonal
createdAt
updatedAt
```

Programs:

```text
ADULT_BJJ
KIDS_BJJ
STRIKING
WRESTLING
```

No Muay Thai.

## Lead

Lead represents the contact person.

Adult:

```text
Lead = participant
```

Kids:

```text
Lead = parent/guardian
Participant = child
```

Lead requires at least phone or email.

Duplicate phone/email is permitted.

## Lead Statuses

```text
NEW
CONTACTED
RESPONDED
TRIAL_SCHEDULED
TRIAL_ATTENDED
NO_SHOW
JOINED
LOST
```

## Trial

Trial is a separate entity.

A Lead may have multiple Trials.

Statuses:

```text
SCHEDULED
ATTENDED
NO_SHOW
CANCELLED
```

No database limit of three trials.

## FollowUpTask

Initial type:

```text
PHONE_CALL
```

Statuses:

```text
PENDING
COMPLETED
CANCELLED
```

## Money

Persist integer cents.

Example:

```text
$175.00 = 17500
```

## Time

Persist UTC epoch milliseconds.

Present in:

```text
America/Denver
```

## Acceptance Criteria

M1 is complete when:

1. Migrations work from a fresh database.
2. Upgrade migration path works.
3. Seeds are idempotent.
4. Relationships are correct.
5. Lead contact database invariant is enforced.
6. Multiple Trials are supported.
7. Multiple FollowUpTasks are supported.
8. Money representation is safe.
9. Timezone strategy is documented.
10. Tests pass.
11. QA passes.
12. M1 documentation is current.
13. M1 is committed and pushed independently.

## Current Status

M1 is complete, subject to any explicitly requested corrective migration.

---

# M2 — Authentication and Authorization

## Objective

Create the secure internal application boundary.

M2 answers:

> Who is allowed inside the internal acquisition application?

Use:

```text
nuxt-auth-utils
```

with server-side sessions.

## Authentication

Create:

```text
/login
logout
protected internal routes
```

Use generic invalid-credential messages.

## Password Storage

Use an established modern hashing implementation.

Never persist plaintext passwords.

## Roles

```text
ADMIN
STAFF
VIEWER
```

Server-side authorization is mandatory.

Client-side hiding alone is not security.

## Public Routes

Examples:

```text
/
/login
```

Future:

```text
/trial
```

## Internal Routes

Examples:

```text
/dashboard
/leads
/tasks
/campaigns
/settings
```

## Acceptance Criteria

M2 is complete when:

1. Development admin bootstrap works.
2. Passwords are securely hashed.
3. Login works.
4. Logout works.
5. Internal routes require authentication.
6. Public routes remain public.
7. Inactive users cannot authenticate.
8. Role utilities exist.
9. Server-side authorization exists.
10. Tests pass.
11. QA passes.
12. Documentation is updated.
13. M2 is committed and pushed independently.
14. M3 functionality has not leaked into the commit.

---

# M3 — Lead CRM

## Objective

Create the first operationally useful internal product.

M3 answers:

> What can staff do with leads once they exist?

## Required Functionality

Create:

```text
/leads
/leads/:id
```

Support:

- create lead
- edit lead
- search
- filters
- pipeline view
- notes
- status history
- manual Trial creation
- Trial outcomes
- Joined
- monthly rate
- duplicate awareness

## Pipeline

```text
NEW
CONTACTED
RESPONDED
TRIAL_SCHEDULED
TRIAL_ATTENDED
NO_SHOW
JOINED
LOST
```

Forward skips are allowed where appropriate.

Corrective/backward changes require explicit audit context.

## Trial Management

Support:

```text
SCHEDULED
ATTENDED
NO_SHOW
CANCELLED
```

Rescheduling preserves history.

## Authorization

ADMIN:

```text
full access
```

STAFF:

```text
operational CRM access
```

VIEWER:

```text
read-only
```

## Acceptance Criteria

M3 is complete when:

1. Leads can be manually created.
2. Leads can be searched/filtered.
3. Lead detail works.
4. Status history is preserved.
5. Notes work.
6. Trials can be managed.
7. Rescheduling preserves history.
8. Joined can be recorded.
9. monthlyRateCents works.
10. Roles are enforced.
11. Tests pass.
12. QA passes.
13. Documentation is updated.
14. M3 is committed and pushed independently.

---

# M4 — Intro Scheduling Funnel

## Objective

Create the public prospect-facing acquisition funnel.

M4 answers:

> How does an interested prospect become a scheduled intro immediately?

## Public Flow

```text
Prospect
   ↓
/trial
   ↓
Contact info
   ↓
Choose intro time
   ↓
Submit
   ↓
Lead created/associated
   ↓
Trial created
   ↓
Confirmation
```

## Public Form

Adult:

```text
firstName
lastName
phone
email optional
program
experience
consent
```

Kids:

```text
parent/guardian contact
child participant fields
```

Phone is required publicly.

## Scheduling

Do not create a full gym scheduler.

Implement only the intro availability model required by confirmed business rules.

Potential lightweight concept:

```text
IntroAvailability
```

Do not invent schedule rules.

## Attribution

Support parameters such as:

```text
/trial?source=instagram&campaign=fall-adult-bjj
```

No Meta integration is required.

## Spam Protection

Use:

- honeypot
- IP rate limiting
- server-side validation

Captcha may be added if required before production.

## Acceptance Criteria

M4 is complete when:

1. `/trial` is public.
2. Adult submission works.
3. Kids submission works.
4. Phone is required.
5. Active programs are respected.
6. Allowed intro times are enforced.
7. Lead is created/associated.
8. Trial is created.
9. Status becomes TRIAL_SCHEDULED.
10. Attribution is captured.
11. Consent is persisted.
12. Spam protections exist.
13. Tests pass.
14. QA passes.
15. Documentation is updated.
16. M4 is committed and pushed independently.

---

# M5 — Follow-Up and Task Workflow

## Objective

Guarantee that required human follow-up work is surfaced and completed.

M5 answers:

> How do we ensure the next-day personal phone call happens?

## Workflow

```text
Trial Scheduled
      ↓
PHONE_CALL task created
      ↓
Task becomes due
      ↓
Staff sees it
      ↓
Staff calls prospect
      ↓
Outcome recorded
```

## Task UI

Create:

```text
/tasks
```

Support:

- due today
- overdue
- upcoming
- completed
- assigned tasks

## Task Actions

Support:

- complete
- cancel
- assign/reassign
- outcome
- notes

## Scheduling Rule

Do not blindly use `+24 hours`.

Use a documented configurable business rule.

Example concepts:

```text
followUpCallDelayDays
followUpCallDueTime
timezone
```

## Background Processing

Use the simplest reliable mechanism appropriate to project scale.

Do not introduce queues/distributed infrastructure without need.

## Idempotency

Automatic task creation must not duplicate work.

## Acceptance Criteria

M5 is complete when:

1. Trial scheduling can create the intended FollowUpTask.
2. Task creation is idempotent.
3. Timing follows configured business rules.
4. Due tasks are visible.
5. Overdue tasks are visible.
6. Tasks can be completed/cancelled.
7. Outcomes can be recorded.
8. Lead detail shows task history.
9. Authorization is enforced.
10. Tests pass.
11. QA passes.
12. Documentation is updated.
13. M5 is committed and pushed independently.

---

# M6 — Meta Integration

## Objective

Connect Meta acquisition channels to the internal application.

M6 begins only after:

- Meta assets are inventoried
- correct access is granted
- current ad configuration is understood
- post-click flow is confirmed
- desired acquisition path is selected

## Potential Acquisition Paths

Option A:

```text
Meta Ad
   ↓
/trial
```

Option B:

```text
Meta Ad
   ↓
Meta Instant Form
   ↓
Internal Lead
   ↓
Scheduling
```

Option C:

```text
Meta Ad
   ↓
Messenger / Instagram
   ↓
Automated interaction
   ↓
Contact capture
   ↓
Scheduling
```

Do not build all three without a business requirement.

## Meta Boundary

Keep provider-specific logic outside the core Lead domain.

Potential location:

```text
server/services/meta/
```

Potential provider-specific data:

```text
MetaAccountConnection
MetaCampaignMapping
MetaLeadReference
MetaWebhookEvent
```

Exact schema depends on verified API requirements.

## OAuth and Tokens

Use Meta-supported authorization.

Store credentials securely.

Do not expose tokens unnecessarily to the client.

## Graph API

Use only required supported capabilities.

Potential uses:

- asset discovery
- lead retrieval
- insights
- publishing
- metadata

Do not assume API access based solely on documentation.

## Webhooks

Prefer event-driven ingestion where supported.

Conceptual flow:

```text
Meta event
   ↓
Webhook
   ↓
Verify authenticity
   ↓
Validate
   ↓
Persist/reference
   ↓
Process idempotently
   ↓
Create/update Lead
```

## Acceptance Criteria

M6 is complete when:

1. Meta connection method is documented.
2. Required assets are identified.
3. Authentication/token storage is secure.
4. Selected Meta acquisition flow works.
5. Events are processed idempotently.
6. Meta-originated contact data can become an internal Lead.
7. Attribution is preserved.
8. Core scheduling/follow-up remains provider-independent.
9. Failures do not corrupt CRM data.
10. Tests pass.
11. QA passes.
12. Documentation is updated.
13. M6 is committed and pushed independently.

---

# Milestone Dependency Map

```text
M0
Foundation
   ↓
M1
Domain Model
   ↓
M2
Authentication
   ↓
M3
Lead CRM
   ↓
M4
Public Intro Funnel
   ↓
M5
Follow-Up Workflow
   ↓
M6
Meta Integration
```

---

# Product Evolution

## After M0

```text
Running application
No business logic
```

## After M1

```text
Running application
+
Acquisition data model
```

## After M2

```text
Secure internal application
+
Users / roles
```

## After M3

```text
Operational Lead CRM
+
Trials
+
Statuses
+
Notes
```

## After M4

```text
Prospects schedule themselves
+
Lead/Trial created automatically
```

## After M5

```text
Follow-up work becomes reliable
+
Human sales process is structured
```

## After M6

```text
Meta acquisition feeds the internal application automatically
```

---

# End-State Architecture at M6

```text
                       META
                        |
            +-----------+-----------+
            |                       |
        Facebook                Instagram
            |                       |
            +-----------+-----------+
                        |
                  Meta Integration
                        |
                        v
                 Acquisition App
                        |
        +---------------+---------------+
        |               |               |
       Lead           Trial        FollowUpTask
        |               |               |
        +---------------+---------------+
                        |
                     Human Staff
                        |
                  Attend / No Show
                        |
                     Joined
                        |
                     Revenue
```

Public acquisition remains independent:

```text
Prospect
   ↓
/trial
   ↓
Lead
   ↓
Trial
   ↓
Follow-Up
```

---

# Standard Cursor Milestone Instruction

When Cursor is given one or more milestones, the controlling prompt should include an explicit branch.

Example:

```text
Work only on branch: m3-lead-crm

Implement M3 according to the milestone roadmap.

After completing M3:

1. Update all relevant vault documentation.
2. Thoroughly QA the implementation.
3. Run lint, typecheck, tests, build, and any milestone-specific checks.
4. Review the final Git diff.
5. Confirm no secrets or unrelated changes are included.
6. Commit M3 with a detailed commit message and body.
7. Push the approved branch.
8. Report the commit hash and QA results.
9. Stop before M4.
```

For a multi-milestone sprint:

```text
Work only on branch: acquisition-sprint

Implement M3, M4, and M5 in sequence.

For EACH milestone independently:

Implement
→ Document
→ QA
→ Review Diff
→ Commit
→ Push
→ Continue

Do not combine M3, M4, and M5 into one final commit.

Each milestone must have its own committed and pushed checkpoint.
```

---

# Final Development Rule

Do not optimize for feature count.

Optimize for the reliability of:

```text
Attention
   ↓
Interest
   ↓
Lead
   ↓
Scheduled Intro
   ↓
Human Follow-Up
   ↓
Attendance
   ↓
Membership
```

Version control should mirror the architecture:

```text
One meaningful milestone
        ↓
One thoroughly validated checkpoint
        ↓
One detailed commit
        ↓
One successful push
```

This creates a project history that is easy to inspect, compare, roll back, and resume.
