---
type: work-return
status: done
id: WO-2026-09-19-sales-minimum-v1
milestone: none
base_sha: "d66727e002f8bcd4255a5633959e2a7371649287"
result_sha: "pending-commit"
implementation_result: shipped
tests: "sales_template pnpm test 9 files / 50 tests pass; pnpm lint pass; pnpm typecheck pass; pnpm build pass. Architecture and Docker contract tests included in that suite."
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - SaaS-Milestones.md
  - SaaS-Decisions.md
  - project-state.yaml
  - Sales-SIC-Dogfooding-Readiness-Assessment.md
  - Home.md
---

# Return — Sales Minimum V1 SIC dogfooding

**Not the live map.** Live map: [[Current-State]]. Investigation record: [[Sales-SIC-Dogfooding-Readiness-Assessment]]. Work order (archived): [[wip/archive/WO-2026-09-19-sales-minimum-v1]]. Decisions: [[SaaS-Decisions#2026-09-19 — Sales Minimum V1 locked decisions for SIC dogfooding]].

Code-shipped on `working`. Not a platform milestone. Not owner-accepted Successful. Stop further Sales feature work until SIC dogfood friction.

---

## Git / preflight

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Remote | `https://github.com/Koifish95/crm_marketing_saas.git` |
| Branch | `working` |
| Work Order `base_sha` | `d66727e002f8bcd4255a5633959e2a7371649287` |
| HEAD at start | **matched** `base_sha` |
| `renzo_crm` | not modified |

## What shipped

SALES-V1-001–007, 009, 013, 019 as SUCCESS. D1–D8 implemented. Example Academy V1 rehearsal on http://localhost:5040 (company 7, opportunity 9): Company-first outbound, firmographics, Pat Owner + Morgan Manager, Working opportunity, $250 MRR + $500 setup, complete No Answer → next Call, Reached, Meeting Held, proposal issue/sent/accept without auto-Won, Decision, Won with leftover activity cancelled, Customer lifecycle, serve checklist with $250/$500.

## What did not

- Deferred list (expected close, probability, Kanban, Demo entity, email/SMS, calendar, e-sign, Stripe, auto Control Plane create/provision, Core-domain promotion, Beauty, Martial Arts features, PostgreSQL, public infra)
- Owner-accepted Successful
- Live SIC Control Plane customer cutover

## Proof

`sales_template` `pnpm test` 50/50, `pnpm lint`, `pnpm typecheck`, `pnpm build`. Runtime rehearsal against the running app at :5040. `/activities?queue=overdue` initializes the overdue queue.

## Deviations

- Outcomes required for call/email/meeting; optional for task/other. Meeting complete defaults to Meeting Held; call/email default No Answer.
- Reopen returns to Decision and does not restore cancelled tasks.
- Starter offers are seeded by name if missing; prices are editable and not a platform catalog. Local leftover sqlite may already contain a duplicate `Provisioning / setup` row from earlier QA.
- Pre-V1 Won records in leftover local sqlite were not retroactively cleaned.

## Stop

Do not continue polishing. Next Sales requirements come from Scott using the product.
