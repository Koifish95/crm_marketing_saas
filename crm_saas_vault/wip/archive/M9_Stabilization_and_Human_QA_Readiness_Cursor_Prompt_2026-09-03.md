# Renzo Gracie Kaysville — M9 Stabilization and Human-QA Readiness Cursor Prompt

**Date:** 2026-09-03  
**Project:** Renzo Gracie Kaysville Acquisition  
**Branch:** `M9`  
**Purpose:** Final M9 stabilization pass before Scott begins formal human acceptance testing.

## Objective

Treat this as a **stabilization, workflow-completion, and QA-readiness pass**, not a new feature milestone.

M9 has already implemented the major Collaborative Marketing Operations architecture. The goal now is to make the implemented system operationally complete enough that Scott can begin a realistic end-to-end human QA pass without repeatedly stopping because a supported backend capability is inaccessible, an obvious workflow step is missing, or the UI does not clearly communicate what the user should do next.

The repository is the source of truth. Inspect the current `M9` branch, schema/migrations, M9 API/services, Marketing frontend, authorization middleware, tests, and the latest M9 implementation/operational handoff before changing code.

Do not redesign M9 from the original specification when the repository intentionally evolved during implementation.

## Git workflow

Scott has already created and checked out `M9`. Remain on it.

Do not merge to `master`/`main`, force-push, rewrite history, commit secrets, commit the local SQLite database, or perform unrelated refactoring.

Work in focused stabilization slices. After each meaningful slice: implement, test, typecheck/lint/build as appropriate, correct failures, make a descriptive commit, then continue. Push the completed `M9` branch after the stabilization pass is green.

## Operational model to preserve

Acquisition remains Leads/households, LeadLines, Trials, household Follow-Up, conversion/Lost, and acquisition reporting.

Marketing remains Campaigns, Marketing Tasks, Content, Assets, Acquisition Events, attribution, compensation, the Marketing command center, and read-only Meta reporting.

Do not collapse Marketing Tasks into Lead Follow-Up. Do not turn Events into Trials. Do not conflate acquisition attribution, operational ownership, or compensation attribution.

## Stabilization principle: surface implemented capabilities

If a capability is already implemented in the server/schema and is reasonably part of normal M9 staff operation, expose it through a usable frontend workflow. Do not leave normal operational functionality accessible only through direct API calls.

If Cursor determines a capability should not be surfaced before human QA, defer it only for a legitimate architectural, security, data-integrity, or UX reason. In the return handoff document the capability, current implementation, reason, risk, and recommended future action.

## Known backend/UI gaps to audit and surface

### Campaign collaborators
Provide UI to view, add, and remove collaborators and clearly distinguish owner from collaborators.

### Campaign Program associations
Expose one/multiple/no Program associations using the existing Program catalog.

### Campaign dates
Expose planned start/end and actual start/end where appropriate. Keep planned versus actual meaning clear; derive actual dates from lifecycle actions when that is already the safe design.

### Acquisition Event registration windows
Expose registration-open, registration-close, manual closure if implemented, and clearly show whether public registration is available and why.

### Cancelled Event registrations
Audit batch behavior. If supported, expose safely. Never create Leads/Follow-Up from cancelled registrations without explicit staff intent.

### Marketing Task relationships
Expose useful links/selections to Campaign, Content Item, Asset, and Event where supported. A task should lead directly to the work it references.

### Compensation Attribution management — high priority
Provide an ADMIN UI for LeadLine-level compensation attribution. Preserve automatic deterministic attribution, manual ADMIN correction, required correction reason, immutable history, system/manual distinction, and separation from acquisition and operational ownership. Do not expose destructive history editing.

### Content lifecycle coverage
Support the valid M9 lifecycle: Idea, Needs Assets, Draft, Needs Review, Approved, Ready to Publish, Published, Cancelled. Prefer guided valid actions over an unsafe arbitrary status dropdown. Do not add Scheduled.

### Planned publication time
Surface `plannedPublishAt` if supported. Make clear this is an intended manual-publishing time, not a Meta-scheduled post.

### Asset restriction details
Review Unknown/Approved/Restricted/Do Not Use. Require meaningful restriction reasons. Do not silently manufacture a generic reason merely to satisfy validation. Keep clear that this is operational marketing-use tracking, not legal consent management.

### Unused Access Rights
Audit `MANAGE_MARKETING_CONFIGURATION` and other unused rights. Connect them only to appropriate existing configuration surfaces or document them as reserved/deferred. Do not invent functionality merely to consume a permission.

## Find additional problems before human QA

Audit for server actions without UI, UI without server enforcement, dead navigation, inaccessible records, confusing lifecycle transitions, stale M8 labels, forms that cannot edit displayed values, values silently discarded by forms, duplicate risks, weak empty/error/success states, state changes requiring unnecessary refreshes, timezone/currency issues, misleading Meta terminology, and places where staff could confuse Events with Trials, Campaign owner with compensation owner, Content approval with publication, or Marketing Tasks with Lead Follow-Up.

Correct genuine defects. Do not expand unrelated future scope.

## Opinionated, task-driven UX

Scott approved an opinionated UX. The system should help answer: **What needs my attention next?**

Use clear next actions, actionable empty states, status explanations, useful badges/counts, direct related-record links, warnings for consequential actions, and concise workflow guidance. Do not merely expose database records or overload dashboards.

Expected daily priority: new Leads, due/overdue Lead Follow-Up, Marketing/Campaign work, Content/Assets/Events, then reporting/performance. Preserve acquisition as the primary operational entry point.

## Marketing command center readiness

Audit `/marketing` for useful visibility into active Campaigns, overdue/due Marketing Tasks, Content requiring action/approval, Asset requests/issues, upcoming planned publication, Events requiring attention, registrations awaiting processing, Campaign results, Meta versus internal attribution, and authorized compensation information. Do not expose compensation to unauthorized users.

## Acquisition Event workflow readiness

Review end-to-end:

Create Event → configure Sessions → publish → public registration → household/participant capture → roster → attendance → batch preview → duplicate resolution → execute → LeadHeader/LeadLine relationships → Event Follow-Up → later Trial → conversion.

Confirm Event and Trial remain distinct; multi-participant household signup works; Sessions/capacity/windows validate; Tracking Link attribution survives; Event history remains; existing Leads are enriched rather than duplicated; ambiguous matches require human confirmation; no silent merges occur; processing is idempotent; Follow-Up is household-level; outcomes are LeadLine-level; and Join does not require a fake Trial.

## Attribution and compensation readiness

Keep separate:

- Acquisition Attribution — original funnel source.
- Lifecycle History — what happened afterward.
- Operational Ownership — who currently works it.
- Compensation Attribution — who receives credit.

Validate Campaign → Tracking Link → Event registration → attendance → Lead batch → Follow-Up assigned to another staff member → Trial → Joined → compensation snapshot. Later staff activity must not rewrite origin or compensation owner.

Audit the compensation ledger for owner, basis, amount, earned date, Unpaid/Paid, paid date, and historical snapshot. Do not expand into invoicing, AR/AP, payment processing, payroll, or accounting. Preserve configurability because Scott is still clarifying the exact Renzo compensation agreement.

## Access Rights usability

Verify ADMIN can configure STAFF without API/database knowledge.

Test examples: STAFF + Event Manager/Event Processor; STAFF + Content Manager/Asset Manager; normal STAFF with no Marketing roles; VIEWER restrictions; ADMIN full rights and anti-lockout. Audit frontend visibility and backend enforcement.

## UI/UX stabilization

Review all new M9 screens for cramped cards, padding, overflow, mobile layout, field grouping, excessive vertical space, confusing buttons, destructive confirmation, hierarchy, consequence explanations, table readability, empty/loading/disabled states, and status consistency. Prefer shared fixes. Do not wholesale redesign the accepted theme.

## Preserve future publishing architecture

Do not implement Meta writes or automatic social publishing. Preserve the path from manual publication records to future direct and scheduled publishing via planned timestamps, publication history, channel, external IDs, URLs, and actors.

## Product boundaries

Keep code aligned to shared platform, martial-arts vertical, Renzo configuration, or genuine customer extension. Do not add `if customer == Renzo` logic. Do not implement the future generalized capability-inheritance architecture during this pass.

## Explicitly out of scope

Do not add automatic Meta publishing, scheduled social publishing, waitlists, full legal consent management, accounting/invoicing, PostgreSQL, Docker/environment management, release engineering, SaaS tenancy, generalized workflow engines, or generalized capability inheritance. Those belong later.

## Automated validation

Run targeted tests, the full suite, lint, typecheck, production build, and migration/schema validation where supported. Add regression tests for bugs fixed. Document exact commands/results. Never claim a test passed unless it ran successfully.

## Pre-human-QA workflow simulation

Validate as much as possible:

ADMIN configures Access Rights → creates `$0` organic Campaign → assigns Marketing work → requests/uploads Asset → creates Content → approval if required → records manual publication → creates Event/Sessions → publishes Event → public household registers → attendance → batch preview/process → Follow-Up → Trial → attendance → Join → attribution preserved → compensation snapshot → ledger/reporting.

Clearly distinguish automated/code inspection from browser/manual testing still required from Scott.

## Human QA readiness

Completion means **M9 is ready for Scott to begin formal human acceptance testing**, not that M9 is accepted. Do not merge `M9`.

Scott intends to run the first real Marketing Campaign largely solo after QA. The software should no longer force him to stop because obvious M9 functionality is inaccessible or the workflow fights him.

## Required human acceptance test plan

Create a detailed manual checklist grouped into:

A. Access Rights
B. Campaigns and Marketing Tasks
C. Content and Assets
D. Acquisition Events
E. Attribution and Compensation
F. Reporting / Command Center
G. M8 Regression

For each test provide setup, user role, action, expected result, and important history/data to verify.

## Training documentation foundation

Create training documentation based on the **actual stabilized implementation**, not planned features.

Create:

1. `Renzo_Gracie_Kaysville_ADMIN_Operations_Guide_V1.md`
2. `Renzo_Gracie_Kaysville_Staff_Training_Guide_V1.md`

The ADMIN guide should cover daily workflow, Access Rights, Campaigns, Tracking Links, Marketing Tasks, Content, Assets, Events, batch processing, attribution, compensation, reporting, corrections, and ADMIN-only work.

The staff guide should use plain business language and cover assigned Marketing Tasks, Assets, Content/manual publication, Event rosters/attendance/processing if authorized, and Lead Follow-Up. Prefer task-oriented sections such as “How to process an Event after it ends.” Include purpose, when to use it, steps, what happens afterward, common mistakes, and permissions required.

Treat these as V1 documents that may evolve during Scott's human QA.

## Required return/results Markdown

Create a comprehensive results handoff based on **what was actually implemented**.

Suggested filename:

`Renzo_Gracie_Kaysville_M9_Stabilization_and_Human_QA_Readiness_Handoff_2026-09-03.md`

Place it in the established handoff location such as `vault/wip` if that convention remains current.

It must include:

- executive summary and readiness/blockers;
- Git branch, commits, HEAD, push status, working tree, and confirmation no merge occurred;
- disposition of every known backend/UI gap plus additional gaps found;
- actual workflow changes;
- Access Rights changes;
- Campaign/Task/Content/Asset/Event changes;
- attribution/compensation changes;
- command-center changes;
- bugs found, root causes, fixes, and tests;
- exact automated validation commands/results;
- known limitations separated into accepted limitation, deferred future functionality, and unresolved defect;
- the detailed human-QA plan;
- training files created;
- recommended QA order;
- a final **Voice Discussion Brief** for another ChatGPT instance to discuss with Scott during a commute, including what changed, intentional deferrals, high-risk QA areas, UX decisions, and questions Scott should answer during QA.

## Final acceptance gate for this Cursor pass

This task is complete only when normal M9 backend-supported operational capabilities are surfaced or explicitly justified as deferred; known workflow defects are corrected; Access Rights remain server-enforced; Events operate coherently end-to-end; attribution/compensation remain historically reliable; Content/Assets are usable; the Marketing command center supports next-action thinking; tests/lint/typecheck/build are green or failures are documented; M8 has not knowingly regressed; training docs and the comprehensive return handoff are generated; changes are committed and pushed to `M9`; and `M9` is **not merged**.

The outcome should be a system Scott can approach as a human tester rather than as a developer filling obvious implementation gaps.
