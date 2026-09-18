---
type: work-return
status: done
id: WO-2026-09-17-product-owned-domains-shared-foundation
milestone: none
base_sha: "8c117d4d5d486fca91e014a571a25da53e83b21a"
result_sha: pending-documentation-commit
implementation_result: shipped
tests: "docs consistency search in crm_saas_vault live notes; no application test run (no code change)"
decisions_discovered:
  - "Product-owned domains + shared foundation supersedes remaining Core-domain trajectory"
durable_docs_updated:
  - Current-State.md
  - SaaS-Milestones.md
  - SaaS-Decisions.md
  - Platform-Architecture.md
  - project-state.yaml
  - ADR-Product-Owned-Domains-Shared-Foundation.md
  - ADR-CRM-Core-Vertical-Architecture.md
  - Working-Agreement.md
  - Home.md
  - SaaS-Open-Questions.md
  - Customer-Environment.md
  - Control-Plane.md
---

# Return — Product-owned domains + shared foundation

Documentation-only. No application, schema, migration, package, Docker, or Control Plane code changed.

## Shipped

- New architecture law: [[ADR-Product-Owned-Domains-Shared-Foundation]]
- Historical Core ADR marked `status: superseded` with retain/modify/supersede table in the new ADR
- Canonical packet updated so a future agent cannot treat generic Leads/Campaigns, Core migrators, Core version on the Control Plane, or Beauty-as-Core-proof as current obligation
- C1 characterized as a successful foundation extraction; remaining Core-domain finish line superseded after Sales evidence
- D1 retained; D2–D4 modified (product-owned; Sales does not justify promotion)

## Not done (forbidden)

- `@crm/core` rename or split
- `apps/` move
- Beauty, Sales, Martial Arts, Control Plane, VPS, DNS/TLS implementation

## Deviations

- `SaaS-ToDo.md` C2 “not started” row was stale and was corrected (contradiction with Successful C2). SI Sales Slice B checkbox removed because B1/B2 already shipped those items; remaining Sales wants (e-sign, email) stay in [[Current-State]] “not implemented.”
- `result_sha` is filled after the documentation commit lands (lockfile `head_at_write` is the authorization base `8c117d4`).

## Git

Base: `8c117d4`. Feature commit: see `result_sha` after landing.
