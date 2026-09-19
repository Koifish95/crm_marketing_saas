---
type: work-order
status: done
id: WO-2026-09-19-sales-minimum-v1
milestone: none
decision_refs:
  - "SaaS-Decisions#2026-09-19 — Sales Minimum V1 locked decisions for SIC dogfooding"
  - "ADR-Product-Owned-Domains-Shared-Foundation"
base_sha: "d66727e002f8bcd4255a5633959e2a7371649287"
authorized: yes
authorized_scope: |
  Implement Sales Minimum V1 in sales_template so SIC can dogfood Sales as its
  primary internal CRM for selling Martial Arts CRM. Close SALES-V1-001–007,
  009, 013, 019. Locked decisions D1–D8. Durable docs and assessment annotation.
forbidden_scope: |
  Expected close, probability, forecasting, Demo entity, Kanban, email/SMS,
  calendar sync, e-sign, Stripe, auto Control Plane create/provision, Core
  domain promotion, Beauty, Martial Arts features, infrastructure, renzo_crm.
expected_outputs:
  - code
  - tests
  - durable_docs
durable_docs:
  - Current-State.md
  - SaaS-Milestones.md
  - SaaS-Decisions.md
  - project-state.yaml
  - Sales-SIC-Dogfooding-Readiness-Assessment.md
---

# Sales Minimum V1 — SIC dogfooding

Authorized by Scott’s current chat. Assessment: [[Sales-SIC-Dogfooding-Readiness-Assessment]].

**Successful criteria:** code-shipped after tests + Example Academy runtime rehearsal. Owner acceptance is separate.

**Stop:** write the return, update durable docs, archive the pair. Do not start deferred features.

Archived after code-ship 2026-09-19. Return: [[history/WO-2026-09-19-sales-minimum-v1-return]].
