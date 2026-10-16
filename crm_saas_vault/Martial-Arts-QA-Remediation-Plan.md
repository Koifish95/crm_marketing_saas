---
type: plan
status: complete
area: martial-arts
updated: 2026-10-03
tags:
  - martial-arts
  - qa
  - ux
---

# Martial Arts QA remediation plan

Authorized by Scott's 2026-10-03 chat request. Scope is limited to the seven findings from QA run `b80cd8c9-1569-40ea-83be-953fc9ae4cbe` against registered DEV environment `lab-acme-dev`.

## Triage

| Finding | Ticket | Classification | Decision and evidence |
|---|---|---|---|
| `a5d70183-2715-44d8-b06d-727bd05f2829` | `TKT-6D8975F2` | UX defect | Accept. Dashboard status totals are rendered as static text although the Leads page already supports status query filters. Screenshot and source reproduce the dead end. |
| `c660fe58-b275-46fe-b2a0-a565ebd086fb` | `TKT-E7CD8696` | UX defect | Accept. Empty Follow-up copy describes how work appears but provides no route to Leads or lead creation. Screenshot and source reproduce it. |
| `3e5b789d-42a9-432d-b7d7-8cb4cb90941a` | `TKT-0B740092` | Responsive UX defect | Accept. The sole submit action follows both long form sections on mobile. Screenshot and source reproduce it. |
| `980a9528-38d0-468c-91b5-0f1e9584b915` | `TKT-7677D430` | Product-boundary UX defect | Accept. Routine academy settings advertise raw SQLite restore, runtime/process details, restart, and shutdown to customer admins. Preserve host/API operations but remove them from the customer-facing navigation and settings surface. |
| `33edb839-14f9-4038-8551-20d17f1dc043` | `TKT-46F9CB26` | Configuration-sensitive UX defect | Accept. With no published availability, the home page still promises booking and `/trial` deliberately throws 404. The zero-schedule state needs useful, honest public messaging. |
| `edee5a53-f74c-4f52-97fe-b40c756aff26` | `TKT-6A25CF0D` | Systemic terminology UX defect | Accept. Screenshots and source show “intro” and “trial” for the same customer-facing milestone. Keep internal schema/API names stable; standardize visible language on “intro class.” |
| `da79672b-97a1-4757-8f3f-47ebff833656` | existing `TKT-11AF0427` | Accessibility defect | Accept recurrence. The record identity is a button containing styled text, leaving the route with no `h1`. Add a semantic heading without changing the visual hierarchy. |

No finding is rejected, deferred, or a duplicate of another finding in this run. The accessibility recurrence remains linked to the existing ticket instead of creating duplicate work. All six previously unreviewed findings were converted through the Control Plane review API, preserving run, environment, evidence, and activity links.

## Root causes and implementation

1. **Action signals are not navigational.** Link dashboard pipeline totals to existing Leads status filters and add useful actions to the Follow-up empty state.
2. **Mobile form actions follow desktop document flow.** Add a mobile sticky submit action with safe-area spacing while retaining the existing desktop action and one form submission path.
3. **Customer and host-operator concerns share one settings surface.** Remove environment/process controls from the academy Settings UI and redirect the legacy environment page; retain server-side backup/restart mechanisms for established operator procedures.
4. **Public availability is treated as route existence.** Render a helpful unpublished state at `/trial` and make home-page promise/action copy conditional on availability.
5. **Internal domain naming leaks into staff/customer copy.** Standardize affected visible labels on “intro class”; do not rename `Trial` tables, APIs, status codes, or domain types.
6. **Record selector styling replaced document semantics.** Give the displayed current-record identity a real `h1` while leaving the selector button and visual design intact.

Likely files: dashboard, Follow-up, new-lead, lead-detail, public home/trial, Settings/index/environment, Martial Arts shell registration, shared visible labels, and focused tests/documentation. Sales and Control Plane implementation are out of scope.

## Regression risks

- Lead status links must use the filter values already accepted by `/leads`; household display filters must not be confused with raw line statuses.
- A sticky mobile submit must not obscure fields, duplicate submission, or appear on desktop.
- Removing settings links must not remove host backup/restart services used by operations.
- `/trial` must remain fully functional when availability is published and return a useful non-booking state when it is not.
- Copy-only terminology changes must not alter persisted enum values, API contracts, reporting calculations, or workflow rules.
- The new heading must not create two level-one headings or weaken the selector's accessible name.

## Verification strategy

- Add focused source/component contract tests for dashboard links, empty-state actions, sticky mobile action, customer-facing Settings boundary, unpublished public state, terminology, and lead-detail heading.
- Run the complete Martial Arts test, lint, typecheck, and production-build suite plus scoped `git diff --check`.
- Build and redeploy only registered `lab-acme-dev` using the existing lab procedure.
- Run targeted Playwright QA against the original routes at desktop and mobile sizes, persist new screenshots/findings/run context, and attach verification evidence/comments to all seven tickets.
- Move tickets through the supported lifecycle and mark `DONE` only after DEV retest passes.

## Result

All seven accepted findings were implemented and verified on registered DEV environment `lab-acme-dev`; no finding was rejected or deferred. Six findings were converted to new tickets through the supported review API, while the recurring heading finding remained linked to existing `TKT-11AF0427`. All seven tickets preserve their original finding, audit run, environment, and evidence links.

The product changes make dashboard pipeline counts navigable, give the empty Follow-up queue useful next actions, keep the create action available on long mobile lead forms, remove host/runtime controls from the academy Settings surface, render a useful HTTP 200 public state when intro booking is unpublished, standardize affected visible acquisition copy on “intro,” and restore a semantic level-one record heading.

Verification passed:

- Martial Arts full suite: 75 files / 355 tests.
- `pnpm lint`, `pnpm typecheck`, production `pnpm build`, and scoped `git diff --check`.
- Docker image rebuild and app-only recreate for `lab-acme-dev`; container healthy. No PROD command was run.
- Standard read-only QA run `5a840850-ce7d-4856-93cc-5c77e5310c8f`: completed with zero findings.
- Targeted remediation run `ba7db15b-9fae-4a3f-8c5e-760a60f36a87`: six passed workflows with six screenshots attached to the affected tickets.
- Corrective lead-detail run `89c446c6-a52d-4aa8-ae2a-bb161319c04d`: verified exactly one `h1` and staff-facing intro terminology on `/leads/4`.

The first targeted script selected `/leads/new` instead of a detail page for its combined heading/terminology check. That evidence and route remain preserved for audit transparency but are explicitly not relied upon; the corrective run and ticket comments identify the valid `/leads/4` evidence. All seven tickets followed `NEW → TRIAGED → READY → IN_PROGRESS → REVIEW → TESTING → DONE` only after DEV verification. No application records were created or changed during remediation QA.
