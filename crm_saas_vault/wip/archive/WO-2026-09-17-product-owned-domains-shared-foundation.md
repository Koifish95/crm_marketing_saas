---
type: work-order
status: done
id: WO-2026-09-17-product-owned-domains-shared-foundation
milestone: none
decision_refs:
  - "SaaS-Decisions#2026-09-17 — Product-owned domains and shared foundation"
  - "ADR-Product-Owned-Domains-Shared-Foundation"
base_sha: "8c117d4d5d486fca91e014a571a25da53e83b21a"
authorized: yes
authorized_scope: |
  Documentation and architecture-law reconciliation only. Create a superseding ADR,
  update canonical live notes so products own domains and @crm/core is shared
  application foundation, and supersede remaining Core-domain / Core-migrator
  trajectory. No application, schema, package, Docker, or Control Plane code.
forbidden_scope: |
  Do not change application code, schemas, migrations, package names or layout,
  Docker, Control Plane, Sales, Martial Arts, Beauty, VPS, or DNS/TLS.
expected_outputs:
  - durable_docs
durable_docs:
  - Current-State.md
  - SaaS-Milestones.md
  - SaaS-Decisions.md
  - Platform-Architecture.md
  - project-state.yaml
  - ADR-Product-Owned-Domains-Shared-Foundation.md
---

# WORK ORDER — Architecture Pivot: Product-Owned Domains + Shared Foundation

Scott authorized this work in the current Cursor chat on 2026-09-17. Full body is that chat prompt. This file is the archived work-order header for provenance.

**Successful criteria:** A new agent reading only the canonical packet understands product-owned domains, product-owned journals, `@crm/core` as shared foundation, evidence-driven promotion, and that no application refactor is required. One documentation-only commit.

**Stop:** write the return, update durable docs, archive this pair, do not start C3/Beauty/S7 or rename `@crm/core`.
