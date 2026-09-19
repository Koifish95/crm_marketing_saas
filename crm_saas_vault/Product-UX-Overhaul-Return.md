---
type: note
status: current
area: product
updated: 2026-09-19
aliases:
  - UX overhaul return
tags:
  - saas
  - ux
  - phase-2
---

# Product UX Overhaul Return (Phase 2)

Work order: [[wip/WO-2026-09-19-pre-vps-product-quality]]. Evidence base: [[Product-Workflow-UX-Audit]]. Architecture: [[ADR-Product-Owned-Domains-Shared-Foundation]].

Phase 2 **code-shipped** the critical staff shell and the highest-friction daily workflows. Remaining visual polish is **explicitly deferred**, not ambiguous OPEN.

---

## What changed

### Shared staff chrome (UX-SHARED-001)

`@crm/core` now ships unlayered `staff-shell.css` and `internal.vue` uses semantic classes (`staff-nav`, `is-open`, `staff-mobile-header`). Desktop rail is in-flow (`position: static`). Phone rail is off-canvas (`translateX(-100%)` until Menu). Products no longer depend on Tailwind `fixed` vs `lg:static` compiling in each CSS bundle.

Staff subtitle is `runtimeConfig.public.staffSubtitle`: Martial Arts **Acquisition**, Sales empty (brand mark already says Sales / CRM).

### Martial Arts

- After attendance, primary actions are **Convert** and **Mark lost** (UX-MA-001).
- Convert with an empty offering catalog explains the gap and links to Settings → Catalog (UX-MA-002).
- Intro confirmation due is the last business day **before** the class (UX-MA-003).
- Attendance / no-show cancels confirmation and creates a **MANUAL** conversion call due two business days later (UX-MA-003 / UX-MA-011).
- Dashboard and Follow-up empty copy mention conversion calls.

### Sales

- Nav order is Company-first: Dashboard, Companies, Opportunities, Activities, Contacts, Leads, then library/admin.
- Companies list: **New company** reveals the create form (UX-SALES-004 partial).
- Opportunity and Company workspaces: summary header first; **Edit details** hides the admin form (UX-SALES-001 / 002 partial).
- Opportunity header shows next open activity.
- Dashboard source performance hides all-zero rows except Unattributed (UX-SALES-007).

---

## Runtime QA

| Check | Result |
|---|---|
| MA desktop 1440 dashboard | Heading and metrics fully visible beside rail |
| MA household `/leads/2` | Name visible; Convert / Mark lost primary |
| Sales desktop dashboard | Rail in-flow; no phone Menu; no Acquisition subtitle; nav order Company-first |
| Sales phone 390 | Menu header; rail off-canvas; Work today readable |
| MA follow-up tests | `tests/m5/follow-up.test.ts` 19 passed; `household-follow-up` 4 passed |
| Sales nav test | `tests/c1/registration.test.ts` 3 passed |

---

## Phase 1 finding status

| ID | Status |
|---|---|
| UX-SHARED-001 | **RESOLVED** |
| UX-SHARED-005 | **RESOLVED** |
| UX-SHARED-009 | **RESOLVED** (Sales `lg:hidden` was the complementary manifestation) |
| UX-MA-001 | **RESOLVED** |
| UX-MA-002 | **RESOLVED** (empty-state + catalog link; seeding still a Scott decision) |
| UX-MA-003 | **RESOLVED** |
| UX-MA-004 | **RESOLVED** (with shell) |
| UX-MA-011 | **RESOLVED** (copy + conversion call) |
| UX-SALES-003 | **RESOLVED** |
| UX-SALES-007 | **RESOLVED** |
| UX-SALES-001 | **RESOLVED** enough for daily scan; add-line/proposal forms still below |
| UX-SALES-002 | **RESOLVED** enough (header + related lists first) |
| UX-SALES-004 | **PARTIAL** — companies list only |
| UX-SHARED-002 | **DEFERRED** — broader primitive unification |
| UX-SHARED-003 | **DEFERRED** — closed dialogs in a11y tree |
| UX-SHARED-004 | **DEFERRED** — checkbox readonly semantics |
| UX-SHARED-006 | **DEFERRED** — keyboard pass after dialogs |
| UX-SHARED-007 | **DEFERRED** — contrast certification |
| UX-MA-005 | **DEFERRED** — compensation on person panel |
| UX-MA-006 | **DEFERRED** — catalog multi-Save |
| UX-MA-007 | **DEFERRED** — event first session |
| UX-MA-008 | **DEFERRED** — queue label noise |
| UX-MA-009 | **DEFERRED** — public trial below-fold |
| UX-MA-010 | **DEFERRED** — users confirm copy |
| UX-MA-012 | **ACCEPTED AS-IS** — preserve marketing copy |
| UX-MA-013 | **ACCEPTED AS-IS** — public trial is the public bar |
| UX-SALES-004 remainder | **DEFERRED** — opportunities/activities/offers still lead with create forms |
| UX-SALES-005 | **DEFERRED** — leftover lab sqlite / duplicate select labels |
| UX-SALES-006 | **DEFERRED** — missing next-action still a warning, not a blocker |
| UX-SALES-008 | **DEFERRED** — activity queue still has a create form above Complete |
| UX-SALES-010 | **ACCEPTED AS-IS** — serve checklist copy kept |

Product decisions 1 (seed offerings) and 4 (lab sqlite cleanup) remain Scott’s. Decision 2 (post-attend follow-up) implemented as automatic MANUAL call. Decision 3 (nav grouping) implemented as reorder, not nested groups.

---

## Tests run

- Martial Arts: `tests/m5/follow-up.test.ts`, `tests/c1/registration.test.ts`, `tests/m8/household-follow-up.test.ts`, `tests/m8/scenarios-follow-up.test.ts`, `tests/m8/staff-trial-workflow.test.ts`, `tests/m8/conversion.test.ts`
- Sales: `tests/c1/registration.test.ts`

Full product lint/typecheck/build not run in this slice. Run them before treating Phase 2 as owner-accepted.

---

## Stop

Phase 2 is **code-shipped** for the defects that made staff apps unusable. Further list-page chrome and a11y dialogs are deferred, not reopened as architecture. Proceed to Phase 3 (release/update lifecycle).
