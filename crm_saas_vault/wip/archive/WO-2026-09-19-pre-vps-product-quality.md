---
type: work-order
status: done
id: WO-2026-09-19-pre-vps-product-quality
milestone: none
decision_refs:
  - "ADR-Product-Owned-Domains-Shared-Foundation"
  - "SaaS-Decisions#2026-09-19 — Sales Minimum V1 locked decisions for SIC dogfooding"
  - "SaaS-Decisions#2026-09-19 — Pre-VPS release identity, migrations, and upgrade recreate"
base_sha: "4bd015b20a9f5f188580a50cc171680af6328239"
authorized: yes
authorized_scope: |
  Follow crm_saas_vault/wip/CRM_SaaS_Pre_VPS_Product_Quality_and_Release_Readiness_Program.md.
  Phase 1: investigation-only exhaustive UX audit of Martial Arts and Sales; write
  Product-Workflow-UX-Audit.md. Phase 2 authorized only after Phase 1 audit is complete.
  Phase 3 after Phase 2. Product-quality and release-lifecycle work in martial_arts_template,
  sales_template, shared foundation, and Control Plane as the program specifies.
forbidden_scope: |
  renzo_crm; docker compose down -v; prune; Beauty; Core-domain promotion; @crm/core rename;
  speculative feature development beyond program-scoped workflow quality; live VPS/DNS/TLS
  unless Phase 3 documents an external blocker rather than performing it.
expected_outputs:
  - durable_docs
  - code
  - tests
durable_docs:
  - Current-State.md
  - project-state.yaml
  - Home.md
  - Product-Workflow-UX-Audit.md
---

# Pre-VPS product quality & release readiness

Authorized by Scott’s current chat: follow [[wip/CRM_SaaS_Pre_VPS_Product_Quality_and_Release_Readiness_Program]].

**Successful criteria:** each phase SUCCESS or legitimate BLOCKED. Owner acceptance of official milestones is separate. Phase 1 is investigation only.

Archived after all three phases 2026-09-19. Return: [[history/WO-2026-09-19-pre-vps-product-quality-return]].

## Phase log

- **Phase 1 SUCCESS** (2026-09-19) — investigation only. Durable audit: [[Product-Workflow-UX-Audit]]. No product implementation in Phase 1.
- **Phase 2 SUCCESS** (2026-09-19) — staff shell, MA convert/follow-up, Sales nav/workspaces. Return: [[Product-UX-Overhaul-Return]]. Deferred polish listed there.
- **Phase 3 SUCCESS** (2026-09-19) — release identity, upgrade recreate, Sales schemaVersion, Control Plane target image. Map: [[Product-Release-Update-Lifecycle]]. Full docker old→new rebuild drill not re-run this phase; S6 already proved volume-preserving upgrade.
