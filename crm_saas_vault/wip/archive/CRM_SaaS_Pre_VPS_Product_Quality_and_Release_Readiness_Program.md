# CRM SaaS Pre-VPS Product Quality & Release Readiness Program

## Purpose

Execute a deliberate, multi-phase pre-production program for the
`crm_marketing_saas` repository before Strategic Insights, LLC (SIC)
purchases and activates the first real VPS.

This program exists because the platform is approaching the point where
it will move from development into real operation. Before that
transition, Scott wants three major questions answered and, where
authorized, resolved:

1.  **Do the products actually work well from a normal user's
    perspective?**
2.  **Do Martial Arts and especially Sales look and feel like
    intentionally designed commercial software?**
3.  **Can SIC safely update already-provisioned customer product
    environments without risking customer data?**

These are separate phases.

Each phase must receive its own serious investigation, implementation,
testing, runtime QA, documentation, and completion cycle.

Do **not** rush through all phases as one giant code change.

Do **not** treat later phases as permission to skip acceptance of
earlier phases.

The intent is that Scott can start this program, walk away, and allow
Cursor to carry the work forward through the authorized phases without
needing constant prompting.

------------------------------------------------------------------------

# Governing Business Context

Strategic Insights, LLC is moving from product development toward
commercialization.

The governing operating sequence is:

> **Sell → Serve → Learn → Improve → Automate → Scale**

Current near-term product strategy:

-   Martial Arts is the primary commercial product.
-   Sales is SIC's internal CRM and a future commercial product.
-   SIC intends to use Sales to sell Martial Arts.
-   The Control Plane is SIC's private infrastructure-management plane.
-   One Linux hosting node / VPS is the initial production architecture.
-   Customer environments are isolated.
-   Product-owned domains remain the architecture law.
-   `@crm/core` is shared foundation, not a forced shared business
    domain.
-   `renzo_crm` is a separate project and must not be modified unless
    explicitly authorized elsewhere.

The current software has already passed substantial
engineering/readiness work.

This program is **not** permission to reopen architecture merely because
another design might be theoretically cleaner.

The remaining goal is to make the system:

-   understandable;
-   convenient;
-   efficient;
-   visually credible;
-   pleasant to operate;
-   safe to update;
-   ready to prove on real infrastructure.

------------------------------------------------------------------------

# Repository

Repository:

`Koifish95/crm_marketing_saas`

Expected local path:

`C:\Users\Scoy9\Projects\crm_marketing_saas`

Branch:

`working`

Separate repository that is **not** the target:

`C:\Users\Scoy9\Projects\renzo_crm`

Do not modify `renzo_crm`.

------------------------------------------------------------------------

# Authority and Current Truth

Before each phase, determine current truth in this order:

1.  Current repository code
2.  Current Git state/history
3.  `project-state.yaml`
4.  `Current-State.md`
5.  Current ADRs / decisions
6.  Current milestone and product documentation
7.  Current tests
8.  Current phase-specific work products
9.  Historical documents

Do not trust old prompts over current code.

Do not assume a previously documented weakness still exists.

Do not assume a previously successful test means the current user
experience is good.

------------------------------------------------------------------------

# Program Structure

This program has three phases:

## Phase 1 --- Exhaustive User Workflow & Usability Audit

**Investigation only.**

Do not implement Phase 1 findings.

Produce a durable Markdown audit for Scott and ChatGPT to review.

## Phase 2 --- Major UI/UX & Workflow Quality Overhaul

**Implementation authorized only after Phase 1 audit is complete.**

Use the Phase 1 findings as primary evidence.

This is intentionally a substantial product-quality sprint.

## Phase 3 --- Product Release / Customer Environment Update Lifecycle

First investigate the existing update/release architecture.

Then implement repository-solvable gaps needed to safely update
provisioned product environments while preserving customer state.

This phase is about **application releases**, **persistent customer
data**, **migrations**, **backup**, **health validation**, and
**rollback/recovery**.

------------------------------------------------------------------------

# Global Rules

## Do Not Confuse Technical Possibility With Good UX

A workflow is not successful merely because a user can eventually
accomplish it.

Evaluate:

-   discoverability;
-   number of steps;
-   context switching;
-   redundant entry;
-   cognitive load;
-   defaults;
-   information hierarchy;
-   feedback;
-   errors;
-   recovery;
-   navigation;
-   terminology;
-   mobile behavior;
-   visual density;
-   dead ends;
-   whether the next action is obvious.

A technically possible workflow that is annoying enough that a normal
user would create a spreadsheet or workaround is a product problem.

------------------------------------------------------------------------

## Do Not Confuse Beauty With Usability

A screen that looks attractive but is slower, less understandable, or
more cumbersome is a failure.

The standard is:

> **Looks good AND feels good.**

------------------------------------------------------------------------

## Do Not Expand Into Speculative Feature Development

This program may expose missing functionality.

Classify findings carefully:

-   **DEFECT**
-   **USABILITY**
-   **VISUAL DESIGN**
-   **WORKFLOW GAP**
-   **ACCESSIBILITY**
-   **RESPONSIVENESS**
-   **INFORMATION ARCHITECTURE**
-   **PERFORMANCE**
-   **PRODUCT DECISION**
-   **DEFERRED FEATURE**

Do not automatically implement a missing feature merely because it would
be nice.

Phase 2 should prioritize the workflows the products already claim to
support.

------------------------------------------------------------------------

## Preserve Product-Owned Domains

Do not resurrect the superseded forced-Core business-domain
architecture.

Martial Arts and Sales may share:

-   design primitives;
-   generic components;
-   auth;
-   RBAC;
-   navigation framework;
-   generic layout;
-   form primitives;
-   tables;
-   dialogs;
-   badges;
-   notifications;
-   environment/runtime utilities;
-   other genuinely domain-neutral foundation.

They should not be forced to share business semantics merely because two
screens look similar.

------------------------------------------------------------------------

# PHASE 1 --- EXHAUSTIVE USER WORKFLOW & USABILITY AUDIT

## Mission

Operate Martial Arts and Sales as if you are a real staff user.

Do not primarily review the source code.

**Use the products.**

The purpose is to answer:

> If a normal employee were given this software tomorrow, would the
> workflows be understandable, convenient, efficient, and pleasant
> enough that they would actually want to use it?

Be demanding.

Treat this as a hostile usability review before commercial launch.

------------------------------------------------------------------------

# Phase 1 --- Preflight

Before testing:

1.  Record repository.
2.  Record branch.
3.  Record HEAD.
4.  Record Git status.
5.  Record remote ahead/behind.
6.  Read canonical project state.
7.  Read current Martial Arts documentation.
8.  Read current Sales documentation.
9.  Read the Sales dogfooding assessment and V1 completion state.
10. Identify current test/demo credentials and safe test databases.
11. Run both products.
12. Use representative test data.
13. Preserve production/customer data if any exists.
14. Do not reset databases merely for convenience.

------------------------------------------------------------------------

# Phase 1 --- User Personas

Test from the perspective of realistic users.

## Martial Arts

At minimum consider:

### Front Desk / Staff

Needs to:

-   understand new leads;
-   manage household/member information;
-   schedule and reschedule trials;
-   record attendance/no-show;
-   follow up;
-   understand what to do next;
-   convert or close leads;
-   work quickly while interrupted.

### Manager / Owner

Needs to:

-   understand pipeline;
-   understand campaign/source performance;
-   see acquisition/conversion;
-   manage events;
-   manage staff/users;
-   inspect history;
-   understand revenue/acquisition results.

### Prospective Member

Where public intake exists:

-   understand the form;
-   complete it easily;
-   select appropriate options;
-   schedule a trial where applicable;
-   understand success/error states.

## Sales

At minimum consider:

### SIC Sales Operator

Needs to:

-   create academy/company;
-   add contacts;
-   create opportunity;
-   understand current pipeline position;
-   record outreach;
-   complete activity;
-   schedule next attempt;
-   find today's work;
-   record conversations;
-   schedule/complete demo;
-   create proposal;
-   record proposal status;
-   mark Won/Lost;
-   hand Won sale to Control Plane.

### Sales Manager / Owner

Even if currently the same person:

-   understand pipeline;
-   understand MRR and one-time pipeline;
-   see overdue work;
-   see activity;
-   see Won/Lost;
-   understand source performance;
-   understand what needs attention.

------------------------------------------------------------------------

# Phase 1 --- Martial Arts Workflow Audit

Walk every meaningful workflow end-to-end.

Do not merely click each page once.

At minimum test:

## Authentication / Entry

-   login;
-   forced password change if applicable;
-   logout;
-   invalid credentials;
-   expired session behavior;
-   permission differences;
-   landing/dashboard experience.

## Dashboard

Determine whether the dashboard answers the user's real operational
questions.

Test:

-   clarity;
-   named actionable work;
-   metric usefulness;
-   links;
-   filters;
-   empty states;
-   stale data;
-   responsive layout.

## Lead / Household Intake

Test:

-   public intake where enabled;
-   manual staff intake;
-   household creation;
-   multiple prospective members;
-   duplicate warnings;
-   source/campaign attribution;
-   missing optional data;
-   validation;
-   error recovery.

## Household Workspace

Test whether a staff member can understand the entire household quickly.

Inspect:

-   members;
-   follow-up;
-   attribution;
-   notes/history;
-   status;
-   primary actions;
-   visual hierarchy;
-   navigation between tabs;
-   important information visibility.

## Trial / Intro Scheduling

Test:

-   schedule;
-   reschedule;
-   cancel;
-   attendance;
-   no-show;
-   multiple members;
-   automatic follow-up effects;
-   conflicting or changed scheduling state;
-   staff understanding of what happened.

## Follow-Up Workflow

Test repeated attempts:

``` text
Attempt
  ↓
Outcome
  ↓
Complete
  ↓
Next attempt if needed
  ↓
History retained
  ↓
Final pursuit decision
```

Look for:

-   excessive clicks;
-   confusing outcomes;
-   dead ends;
-   hidden due dates;
-   unclear history;
-   inability to know what is next;
-   awkward automatic/manual follow-up interaction.

## Conversion / Close

Test:

-   converted/won behavior;
-   lost/closed pursuit;
-   history;
-   leftover tasks;
-   reporting effects;
-   accidental actions;
-   recovery/reopen if supported.

## Campaigns / Tracking

Test:

-   create campaign;
-   tracking links;
-   source attribution;
-   relationship to leads;
-   reporting;
-   terminology;
-   whether screens are understandable without prior developer
    knowledge.

## Events

Test:

-   event creation;
-   sessions;
-   roster;
-   processing;
-   relationship to leads/trials;
-   empty states;
-   navigation.

## Marketing Tasks

Test:

-   create;
-   assign;
-   due;
-   complete;
-   find overdue;
-   context;
-   usefulness.

## Assets

Test:

-   single and multi-image upload;
-   asset browsing;
-   creation flow;
-   error states;
-   file limits;
-   usefulness of metadata;
-   deletion/management where supported.

## Reporting

Test:

-   acquisition;
-   conversion;
-   MRR;
-   source/campaign performance;
-   date filters;
-   clarity;
-   whether numbers can be interpreted without developer knowledge.

## Users / Administration

Test:

-   create staff;
-   roles/permissions;
-   forced password change;
-   reset;
-   deactivate/reactivate;
-   last-admin protection;
-   audit/history.

## Settings

Test all customer-operable settings.

Look for unclear scope, dangerous controls, weak descriptions, or hidden
consequences.

------------------------------------------------------------------------

# Phase 1 --- Sales Workflow Audit

Sales deserves particularly aggressive scrutiny because its current
visual/interaction quality is known to be weaker.

At minimum test:

## Login / Landing

-   first impression;
-   visual credibility;
-   navigation;
-   understanding where to begin.

## Dashboard / Work Today

Test:

-   overdue;
-   due today;
-   active opportunities;
-   metrics;
-   links;
-   whether the page tells Scott what to do.

## Company-First Outbound

Test:

``` text
Company
  ↓
Contacts
  ↓
Opportunity
```

Evaluate:

-   create speed;
-   fields;
-   layout;
-   duplicate entry;
-   company workspace;
-   contact visibility;
-   ability to understand the account at a glance.

## Leads / Inbound

Ensure the inbound Lead workflow remains understandable and clearly
distinct from outbound Company-first operation.

## Opportunity Workspace

Test:

-   stage;
-   commercial value;
-   MRR;
-   contacts;
-   source;
-   activities;
-   notes/history;
-   proposal;
-   next action;
-   Won/Lost;
-   visual hierarchy.

Ask:

> Can I understand this deal in five seconds?

## Activities

Test:

-   create;
-   due dates;
-   queue;
-   overdue;
-   today;
-   upcoming;
-   completion;
-   outcomes;
-   notes;
-   schedule-next;
-   activity history;
-   navigation back to company/opportunity.

## Repeated Outreach

Perform several attempts.

Look for friction in:

-   completion;
-   next scheduling;
-   remembering context;
-   outcomes;
-   returning tomorrow;
-   knowing what is due.

## Demo / Meeting

Use Meeting activity.

Test:

-   schedule;
-   complete;
-   no-show;
-   reschedule if supported through normal activity behavior;
-   notes;
-   next follow-up.

## Offers / Commercial Lines

Test:

-   starter offers;
-   monthly;
-   one-time;
-   editing;
-   opportunity totals;
-   readability.

## Proposal

Test:

-   create;
-   revisions;
-   issue;
-   PDF;
-   mark sent;
-   accept;
-   decline;
-   signed upload if supported;
-   relation to opportunity stage.

## Won / Lost / Reopen

Test:

-   cleanup prompt;
-   open activities;
-   history;
-   lifecycle;
-   reopen;
-   serve checklist;
-   Control Plane handoff.

## Lists

Test:

-   Companies;
-   Contacts;
-   Opportunities;
-   Activities;
-   Leads;
-   Offers;
-   Campaigns.

Ask whether each list is:

-   scannable;
-   filterable;
-   dense enough;
-   too dense;
-   visually noisy;
-   missing key context;
-   requiring excessive opening/closing.

## Reporting / Pipeline

Test whether SIC can understand:

-   active pipeline;
-   MRR;
-   one-time revenue;
-   Won;
-   Lost;
-   source performance;
-   work requiring attention.

------------------------------------------------------------------------

# Phase 1 --- Cross-Product UX Review

Compare Martial Arts and Sales.

Identify:

-   inconsistent button styles;
-   inconsistent spacing;
-   inconsistent forms;
-   inconsistent tables;
-   inconsistent record headers;
-   inconsistent badges;
-   inconsistent dialogs;
-   inconsistent navigation;
-   inconsistent empty states;
-   inconsistent loading/error states;
-   inconsistent success feedback;
-   duplicated components that should be generic;
-   generic components that are too rigid for product-specific UX.

Do not force identical page layouts where the products have different
needs.

We want a **shared visual language**, not cloned products.

------------------------------------------------------------------------

# Phase 1 --- Responsive / Device Review

Test realistic viewport sizes.

At minimum:

-   desktop;
-   laptop;
-   tablet;
-   modern phone width.

Pay particular attention to Martial Arts mobile/tablet usage.

Check:

-   navigation;
-   tables;
-   forms;
-   dialogs;
-   buttons;
-   sticky elements;
-   overflow;
-   touch targets;
-   text wrapping;
-   record workspaces;
-   dashboard cards.

------------------------------------------------------------------------

# Phase 1 --- Accessibility & Interaction Quality

Review practical accessibility:

-   keyboard navigation;
-   focus visibility;
-   labels;
-   button semantics;
-   contrast;
-   disabled states;
-   destructive action confirmation;
-   screen-reader-relevant labels where obvious;
-   error association;
-   touch targets.

Do not turn this into a certification project.

Fixing accessibility should improve general interaction quality.

------------------------------------------------------------------------

# Phase 1 --- Required Audit Deliverable

Create:

`crm_saas_vault/Product-Workflow-UX-Audit.md`

The document must contain:

## Executive Summary

## Methodology

## Products / Versions Tested

## Martial Arts Workflow Map

## Martial Arts Findings

## Sales Workflow Map

## Sales Findings

## Cross-Product Findings

## Mobile / Responsive Findings

## Accessibility Findings

## Workflow Friction Inventory

## Visual Design Problems

## Information Architecture Problems

## Defects Found

## Product Decisions Requiring Scott

## Recommended Phase 2 Scope

## Explicitly Deferred Ideas

## Evidence / Runtime QA

Every finding should have a stable ID, for example:

-   `UX-MA-001`
-   `UX-SALES-001`
-   `UX-SHARED-001`

For each finding include:

-   severity;
-   category;
-   affected workflow;
-   current behavior;
-   user impact;
-   evidence;
-   recommended outcome;
-   whether it belongs in Phase 2.

Severity:

-   CRITICAL
-   HIGH
-   MEDIUM
-   LOW

Do not inflate severity.

------------------------------------------------------------------------

# Phase 1 --- Stop Condition

Phase 1 is complete only when the user-perspective audit is durable and
comprehensive.

**Do not implement the audit findings during Phase 1.**

Commit/archive/document the audit according to repository conventions.

Then proceed to Phase 2 using the audit as the evidence base.

If the audit reveals a product decision that truly cannot be responsibly
resolved from existing product direction, document it. Do not invent a
major business decision merely to keep moving.

For minor UX decisions, use professional judgment.

------------------------------------------------------------------------

# PHASE 2 --- MAJOR UI/UX & WORKFLOW QUALITY OVERHAUL

## Mission

Perform a serious commercial-quality UI/UX overhaul of Martial Arts and
Sales, with **special attention to Sales**.

This is not a cosmetic cleanup.

This phase is successful only if the products:

-   look substantially better;
-   feel substantially better;
-   are faster/easier to understand;
-   reduce unnecessary interaction;
-   have strong information hierarchy;
-   behave consistently;
-   work well on realistic devices;
-   preserve domain correctness.

Cursor is authorized to spend substantial development effort here.

Do not optimize for minimizing code changes.

Optimize for product quality while preserving architecture and scope.

------------------------------------------------------------------------

# Phase 2 --- Design Standard

The desired result should feel like:

> **Intentional modern B2B SaaS software built for real daily
> operation.**

Avoid:

-   giant blocky cards everywhere;
-   excessive borders;
-   wasted whitespace;
-   cramped whitespace;
-   dashboard-card overload;
-   giant headings that push work below the fold;
-   visually identical primary/secondary actions;
-   excessive full-page forms;
-   modal abuse;
-   table overload;
-   tiny unreadable metadata;
-   developer-oriented terminology;
-   inconsistent spacing;
-   arbitrary colors;
-   decorative complexity;
-   novelty UI.

Prioritize:

-   hierarchy;
-   clarity;
-   density appropriate to business software;
-   readable typography;
-   predictable actions;
-   fast scanning;
-   useful tables;
-   strong record workspaces;
-   clear status;
-   good feedback;
-   obvious next actions;
-   progressive disclosure.

------------------------------------------------------------------------

# Phase 2 --- Shared Design Foundation

Investigate the current shared UI primitives.

Create or improve shared primitives where genuinely reusable.

Candidates include:

-   typography scale;
-   spacing tokens;
-   page shell;
-   sidebar/top navigation;
-   breadcrumbs where useful;
-   page headers;
-   record headers;
-   buttons;
-   icon buttons;
-   inputs;
-   selects;
-   textareas;
-   checkboxes;
-   radio controls;
-   date/time inputs;
-   form groups;
-   inline validation;
-   cards/panels;
-   tables;
-   filters;
-   tabs;
-   badges/status pills;
-   dialogs;
-   drawers if justified;
-   toasts/notifications;
-   confirmation patterns;
-   empty states;
-   loading/skeleton states;
-   error states;
-   pagination if used;
-   responsive layout helpers.

Do not create a giant abstract design framework for theoretical future
products.

Build what Martial Arts and Sales actually need.

------------------------------------------------------------------------

# Phase 2 --- Sales Priority

Sales currently feels blocky and visually weak.

Treat Sales as the highest-priority visual overhaul.

At minimum redesign/rework as needed:

-   application shell/navigation;
-   dashboard;
-   Companies list;
-   Company workspace;
-   Contacts;
-   Opportunities list;
-   Opportunity workspace;
-   Activities queue;
-   activity completion / next-attempt interaction;
-   Leads;
-   Offers;
-   Proposal workflow;
-   Campaign/source screens;
-   Won serve checklist.

The Opportunity workspace should become a flagship screen.

A user should be able to understand:

-   who;
-   what company;
-   what is being sold;
-   current stage;
-   MRR;
-   one-time value;
-   primary contact;
-   next action;
-   recent history;
-   proposal state;

without visually hunting across a wall of unrelated boxes.

------------------------------------------------------------------------

# Phase 2 --- Martial Arts Priority

Do not neglect Martial Arts merely because it is more mature.

Apply the same product-quality standard.

Focus especially on:

-   dashboard;
-   household workspace;
-   lead/member information hierarchy;
-   trial scheduling;
-   follow-up workflow;
-   campaign workspace;
-   event workspace;
-   marketing tasks;
-   assets;
-   reports;
-   admin/users.

Preserve domain-specific workflows that already work.

Improve them rather than replacing them for stylistic consistency.

------------------------------------------------------------------------

# Phase 2 --- Workflow Improvements

Implement Phase 1 usability findings that are within scope.

Examples of acceptable work:

-   reducing unnecessary clicks;
-   moving important actions closer to the record;
-   improving defaults;
-   improving form order;
-   preserving context after actions;
-   better success feedback;
-   better destructive confirmations;
-   making next action obvious;
-   improving filtering;
-   improving table columns;
-   reducing redundant navigation;
-   clearer empty states;
-   clearer terminology;
-   better responsive behavior.

Do not add large speculative product capabilities merely to improve UX.

------------------------------------------------------------------------

# Phase 2 --- Browser QA Loop

Do not implement the redesign and stop after tests pass.

Use this loop:

``` text
Inspect
  ↓
Implement
  ↓
Run application
  ↓
Use workflow in browser
  ↓
Evaluate visually + operationally
  ↓
Fix friction
  ↓
Repeat
```

Do this for both products.

Use representative data so screens are tested in:

-   empty state;
-   small realistic dataset;
-   larger/denser realistic dataset where practical.

------------------------------------------------------------------------

# Phase 2 --- Acceptance Workflows

After redesign, repeat the major Phase 1 workflows.

At minimum prove:

## Sales

``` text
Dashboard
  ↓
Company
  ↓
Contacts
  ↓
Opportunity
  ↓
Repeated outreach
  ↓
Demo
  ↓
Proposal
  ↓
Decision
  ↓
Won
  ↓
Control Plane handoff
```

## Martial Arts

``` text
Intake
  ↓
Household / members
  ↓
Trial
  ↓
Attendance / no-show
  ↓
Follow-up attempts
  ↓
Conversion / close
  ↓
Reporting
```

If the redesigned workflow looks better but takes longer or is more
confusing, continue iterating.

------------------------------------------------------------------------

# Phase 2 --- Testing

Run:

-   product tests;
-   shared-foundation tests;
-   lint;
-   typecheck;
-   builds;
-   architecture tests;
-   Docker contract tests.

Add tests where interaction/domain behavior changed.

Do not attempt to snapshot-test every CSS detail.

------------------------------------------------------------------------

# Phase 2 --- Documentation

Create a durable implementation return, for example:

`crm_saas_vault/Product-UX-Overhaul-Return.md`

or follow repository work-order/return conventions.

Update canonical current state.

Mark Phase 1 findings as:

-   RESOLVED
-   ACCEPTED AS-IS
-   DEFERRED
-   BLOCKED

No ambiguous OPEN findings in the final Phase 2 return unless they were
explicitly classified as deferred.

------------------------------------------------------------------------

# Phase 2 --- Stop Condition

Phase 2 is complete when:

> Martial Arts and Sales both feel like coherent commercial
> applications, and the core daily workflows are convenient,
> understandable, responsive, and visually intentional.

Especially:

> Sales must no longer feel like a blocky developer-built CRUD
> interface.

Do not continue adding features after this standard is met.

Proceed to Phase 3.

------------------------------------------------------------------------

# PHASE 3 --- RELEASE, UPDATE, MIGRATION & ROLLBACK LIFECYCLE

## Mission

Determine and prove how SIC updates already-provisioned Martial Arts and
Sales customer environments after new application releases.

The required mental model is:

``` text
Application image
      ≠
Customer state
```

Application containers/images should be replaceable.

Customer state must persist independently.

Typical environment:

``` text
Customer Environment
│
├── Application container/image
│
├── SQLite/database persistent volume
└── Assets persistent volume
```

An update should not mean copying changed source code into a running
customer container.

------------------------------------------------------------------------

# Phase 3 --- Investigation First

Before implementing anything, inspect the current architecture.

Determine exactly what already exists for:

-   release IDs;
-   image tags;
-   Docker Compose;
-   Control Plane environment records;
-   product versions;
-   provisioning;
-   migrations;
-   startup migration behavior;
-   persistent database volumes;
-   asset volumes;
-   backups;
-   restore;
-   health checks;
-   rollback;
-   decommission;
-   generated edge;
-   release identity in `/health`;
-   existing runbooks;
-   existing tests.

Create an internal gap inventory before modifying code.

Do not duplicate mechanisms that already work.

------------------------------------------------------------------------

# Phase 3 --- Required Update Outcome

SIC must be able to perform conceptually:

``` text
Customer running v1.3.0
        ↓
Select v1.4.0
        ↓
Preflight
        ↓
Backup customer state
        ↓
Acquire/build immutable v1.4.0 image
        ↓
Stop/replace application container
        ↓
Run/verify migrations
        ↓
Start v1.4.0
        ↓
Health check
        ↓
Verify release ID
        ↓
SUCCESS
```

Customer database and assets remain intact.

------------------------------------------------------------------------

# Phase 3 --- Failure Outcome

If update fails:

``` text
Update
  ↓
Failure
  ↓
Stop bad release
  ↓
Determine DB compatibility
  ↓
Restore pre-update state if necessary
  ↓
Start known-good release
  ↓
Health check
  ↓
Operator receives truthful result
```

Do not pretend rollback is simply restarting the previous image if a
migration made the database incompatible.

------------------------------------------------------------------------

# Phase 3 --- Migration Strategy

Investigate current migrations carefully.

Define and implement a practical initial strategy for:

-   additive migrations;
-   destructive migrations;
-   migration failure;
-   migration idempotency;
-   schema version;
-   application version compatibility;
-   pre-update backup;
-   restore requirements.

Do not over-engineer enterprise zero-downtime migrations.

The initial customer scale is small.

Correctness and recoverability matter more than zero downtime.

Short planned downtime during an update is acceptable if documented and
controlled.

------------------------------------------------------------------------

# Phase 3 --- Immutable Releases

Avoid ambiguous mutable deployment state.

Determine an appropriate release identity strategy.

Prefer a release that can be identified by:

-   version;
-   commit SHA;
-   immutable image tag/digest;
-   build/release ID.

The operator must be able to answer:

> What exact release is Customer A running?

------------------------------------------------------------------------

# Phase 3 --- Control Plane Update Experience

The Control Plane should ultimately provide a practical operator
workflow.

At minimum investigate/implement as appropriate:

-   current release display;
-   target release input/selection;
-   update action;
-   preflight;
-   backup status;
-   migration/update progress;
-   health result;
-   final release identity;
-   failure state;
-   rollback/recovery action or explicit runbook.

Do not expose this publicly.

Control Plane remains private SIC infrastructure.

------------------------------------------------------------------------

# Phase 3 --- Multi-Customer / Product Considerations

The design must support more than one environment.

Example:

``` text
Martial Arts
  Customer A → release X
  Customer B → release X
  Customer C → release Y

Sales
  SIC        → release Z
```

Do not assume every customer must update simultaneously.

SIC should be able to stage releases.

Do not build a sophisticated fleet orchestration platform.

Initial useful capabilities may include:

-   update one environment;
-   see release per environment;
-   intentionally update selected environments;
-   verify success.

Bulk rollout can remain later unless trivially supported by the existing
design.

------------------------------------------------------------------------

# Phase 3 --- DEV → PROD / Release Promotion

Investigate how releases are created and promoted.

Define a practical initial release path, for example:

``` text
Development
   ↓
Tests/build
   ↓
Release image
   ↓
Test/dev environment
   ↓
Acceptance
   ↓
Customer production update
```

Do not assume `latest`.

Do not make production customer environments build arbitrary source code
during update if a safer immutable image workflow is available.

Document the actual chosen process.

------------------------------------------------------------------------

# Phase 3 --- Backup Requirements

Before a state-changing update:

-   create a verified pre-update database backup;
-   preserve assets as required;
-   record backup identity/location;
-   ensure restore path is known.

Do not use unsafe live SQLite file copies if the repository already has
safer snapshot behavior.

Off-host backup integration may remain externally blocked until real
storage exists, but the update mechanism must support the intended
backup flow.

------------------------------------------------------------------------

# Phase 3 --- Runtime Proof

Use local isolated provisioned environments.

Prove at minimum:

## Martial Arts Update

1.  Provision old release.
2.  Create representative customer data.
3.  Create representative asset data.
4.  Record release ID.
5.  Update to new release.
6.  Run migration if applicable.
7.  Verify data.
8.  Verify assets.
9.  Verify health.
10. Verify release ID.

## Sales Update

Repeat with representative:

-   company;
-   contacts;
-   opportunity;
-   activities;
-   commercial lines;
-   proposal;
-   history.

## Failure / Recovery Drill

Intentionally create or simulate a failed update safely.

Prove the operator can return the environment to a truthful known-good
state.

If rollback requires restoring the pre-update database backup, prove it.

Do not destroy unrelated volumes.

Never use broad destructive Docker volume cleanup.

------------------------------------------------------------------------

# Phase 3 --- Release Documentation

Create/update durable documentation covering:

-   how a release is produced;
-   how it is identified;
-   how it is tested;
-   how an environment is updated;
-   what happens to persistent volumes;
-   how migrations run;
-   how backups are created;
-   how failures are detected;
-   how recovery works;
-   how rollback differs with compatible vs incompatible migrations;
-   how to verify customer data after update.

Create a durable report such as:

`crm_saas_vault/Product-Release-Update-Lifecycle.md`

Follow repository naming conventions if a more canonical location
exists.

------------------------------------------------------------------------

# Phase 3 --- External Blockers

Legitimate external blockers may include:

-   no live VPS;
-   no external image registry credentials if one is required;
-   no off-host storage credentials;
-   no live DNS/TLS environment.

Do not call repository-solvable engineering work an external blocker.

Local proof should go as far as possible before declaring external
dependency.

------------------------------------------------------------------------

# Phase 3 --- Stop Condition

Phase 3 is complete when this statement is defensible:

> **SIC can ship a new Martial Arts or Sales application release to an
> already-provisioned customer environment while preserving customer
> database/assets, applying required migrations, verifying
> health/release identity, and recovering safely from a failed update.**

Do not continue into Kubernetes, distributed orchestration, high
availability, or enterprise fleet management.

------------------------------------------------------------------------

# PROGRAM-WIDE TESTING & QUALITY RULES

For implementation phases:

-   run relevant automated tests;
-   lint;
-   typecheck;
-   production builds;
-   architecture tests;
-   Docker contract tests;
-   migration tests;
-   runtime browser QA;
-   container/runtime QA where applicable.

Do not mark a phase successful merely because tests pass.

Do not mark a phase failed merely because implementation required
troubleshooting.

Fix repository-solvable problems.

------------------------------------------------------------------------

# GIT DISCIPLINE

At the start of every phase record:

-   branch;
-   HEAD;
-   working tree;
-   ahead/behind remote.

Use coherent commits.

Do not mix unrelated work.

Do not modify `renzo_crm`.

Do not discard uncommitted authorized work.

Do not push unless repository policy/current authorization allows it.

At the end of every phase report:

-   starting SHA;
-   ending SHA;
-   commits;
-   files changed;
-   working-tree state;
-   ahead/behind remote.

------------------------------------------------------------------------

# CANONICAL DOCUMENTATION

Keep canonical state truthful throughout the program.

Update appropriate:

-   `Current-State.md`
-   `project-state.yaml`
-   `Home.md`
-   decisions/ADR documents;
-   milestones;
-   work-order/return indexes;
-   product-specific docs.

Do not mark official milestones Successful unless the repository's
acceptance rules support doing so.

Do not let historical handoffs become current law.

------------------------------------------------------------------------

# PHASE STATUS RULES

Each phase must end as:

-   **SUCCESS**
-   **BLOCKED**

During work, internal statuses may include:

-   INVESTIGATING
-   IMPLEMENTING
-   VERIFYING

A final BLOCKED status requires a legitimate blocker with:

-   exact blocker;
-   why Cursor cannot solve it;
-   what has already been completed;
-   what Scott must provide/do;
-   exact continuation point.

------------------------------------------------------------------------

# REQUIRED FINAL PROGRAM RETURN

When all three phases are complete or legitimately blocked, provide a
concise final return.

Use:

# CRM SaaS Pre-VPS Product Quality Program --- Final Result

## Overall Status

## Phase 1 --- Workflow / Usability Audit

-   status;
-   audit path;
-   finding counts;
-   major conclusions.

## Phase 2 --- UI/UX Overhaul

-   status;
-   major changes;
-   Sales result;
-   Martial Arts result;
-   responsive/browser QA;
-   unresolved/deferred items.

## Phase 3 --- Release / Update Lifecycle

-   status;
-   release architecture;
-   migration behavior;
-   backup behavior;
-   rollback/recovery behavior;
-   runtime proof;
-   external blockers.

## Tests

Exact test/build/runtime results.

## Documentation

Canonical files changed.

## Git

Starting and ending state, commits, remote status.

## Remaining Pre-VPS Blockers

List only genuine blockers.

## Recommendation

State whether the repository is now ready for:

> **Purchase VPS → bootstrap hosting node → private Control Plane →
> provision SIC Sales + Martial Arts → temporary DNS → TLS → off-host
> backups → live acceptance rehearsal.**

Do not invent additional development merely to avoid reaching
deployment.

------------------------------------------------------------------------

# FINAL GOVERNING PRINCIPLE

This program is the final deliberate product-quality and
release-management pass before real infrastructure activation.

Take the time necessary.

Be thorough.

Use the products.

Do not settle for technically functional but unpleasant software.

Do not settle for visually attractive but inefficient software.

Do not over-engineer speculative future scale.

The target is:

> **Commercially credible products that people can actually enjoy using,
> plus a safe and understandable way for SIC to ship updates to those
> products after customers exist.**

Once that is proven:

> **STOP BUILDING FOR HYPOTHETICALS AND MOVE TO THE VPS.**
