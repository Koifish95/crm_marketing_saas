---
type: work-order
status: done
id: WO-2026-09-19-cp-operator-experience
milestone: none
decision_refs:
  - "Control-Plane"
  - "Customer-Environment"
  - "Product-Release-Update-Lifecycle"
  - "ADR-Product-Owned-Domains-Shared-Foundation"
base_sha: "5e26fe8c40894059afd11aefb6b4b267aca5fdb0"
authorized: yes
authorized_scope: |
  Control Plane operator/admin/developer experience before VPS activation.
  Information architecture, fleet visibility, customer/product-instance/environment
  lifecycle, Archive & Delete, reports/statistics from truthful data, backups/release
  UX, hosting-node visibility, safety confirmations, docs/vault updates, and the
  Windows loopback gate already identified in this chat. Governing prompt:
  Control_Plane_Operator_Experience_and_Lifecycle_Milestone_Prompt.md.
forbidden_scope: |
  External renzo_crm, Koi-Pi, webhosting_renzo_* volumes, docker compose down -v,
  prune, Beauty, C3, billing, self-service signup, live VPS/DNS/TLS activation,
  Core-domain promotion, package rename, Kubernetes, multi-region, fabricated
  telemetry, bulk destructive delete, bulk restore, bulk PROD upgrade.
expected_outputs:
  - code
  - tests
  - durable_docs
durable_docs:
  - Current-State.md
  - SaaS-Milestones.md
  - SaaS-Decisions.md
  - Control-Plane.md
  - project-state.yaml
---

# Control Plane operator experience & lifecycle

Scott authorized this chat and the governing prompt in `crm_saas_vault/wip/Control_Plane_Operator_Experience_and_Lifecycle_Milestone_Prompt.md`.

**Successful criteria:** owner acceptance vs code-shipped. Do not mark a platform milestone Successful. The operator standard in the prompt is the implementation bar.

**Hard stops:** Renzo external; never `-v` / prune; no VPS/DNS/TLS activation; no Beauty/C3.

**Stop condition:** write the return, update durable docs, archive the pair. Do not start VPS activation or another product milestone.

Return: [[history/WO-2026-09-19-cp-operator-experience-return]].
