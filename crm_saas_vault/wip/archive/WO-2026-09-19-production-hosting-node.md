---
type: work-order
status: done
id: WO-2026-09-19-production-hosting-node
milestone: none
decision_refs:
  - "SaaS-Decisions#2026-09-19 — Control Plane is the SIC hosting-node management plane"
  - "ADR-Product-Owned-Domains-Shared-Foundation"
base_sha: "ec16eb90a6b945b54529e7fb10580dd606592b00"
authorized: yes
authorized_scope: |
  Investigate and implement the smallest real SIC production hosting-node architecture
  on one Linux VPS: private Control Plane (loopback + SSH tunnel), local Docker runtime,
  public hostname as PROD environment configuration, generated production edge, repo-side
  ACME/TLS workflow, MA and Sales provision, isolation, backup/restore, update, and
  decommission. Update canonical vault docs. Commit locally. Do not push.
forbidden_scope: |
  Do not modify renzo_crm, Koi-Pi, or WebHosting. Do not mark official S7 or S8 Successful.
  Do not expose the Control Plane publicly or weaken loopback to make remote access convenient.
  Do not build Kubernetes, multi-region, cloud-provider APIs, DNS SaaS, billing, Stripe,
  PostgreSQL, Beauty, Sales feature parity, public Control Plane login, or Terraform unless
  evidence requires it. Do not live-create DNS records or a real VPS. Do not docker compose
  down -v or prune.
expected_outputs:
  - code
  - tests
  - durable_docs
durable_docs:
  - Current-State.md
  - SaaS-Milestones.md
  - SaaS-Decisions.md
  - Control-Plane.md
  - Customer-Environment.md
  - Platform-Architecture.md
  - project-state.yaml
  - Hosting-Node-Architecture.md
  - Hosting-Node-Bootstrap-Runbook.md
  - Production-Edge-Runbook.md
---

# Production Control Plane + VPS Hosting Node

Scott authorized this work in the current Cursor chat. Investigate current truth, write the gap analysis, implement every repository-solvable gap, and leave only genuine external blockers.

## Successful criteria

Repository-complete when a Linux VPS plus a temporary SIC hostname is an **activation** exercise, not a new software project. Official S7/S8 remain Not started until owner acceptance of those milestone texts.

## Hard stops

Renzo, `-v`, prune, live DNS, live VPS credentials, public Control Plane, Beauty, Stripe, PostgreSQL, Kubernetes.

## Stop condition

Write the return, update durable docs, archive the pair. Do not start the next ID.
