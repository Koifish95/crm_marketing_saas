---
type: note
status: current
area: architecture
updated: 2026-10-02
tags:
  - qa
  - ticketing
  - control-plane
---

# QA and unified ticketing architecture

The Control Plane owns the platform's cross-product ticketing and QA records. Products continue to own their business domains. The browser runner observes a registered product environment through its public/staff interface; it does not import product domain services, edit application source, deploy, or remediate findings.

## Boundary

```text
Registered non-PROD Environment
        ↓ browser interaction
Martial Arts Playwright runner
        ↓ structured run/workflow/finding/evidence records
Control Plane QA review
        ↓ explicit operator decision
Unified Ticket board
```

This is an operational platform domain because a ticket or QA run may relate to a customer, product, product instance, environment, or no customer at all. It is not a generic CRM domain and does not belong in `@crm/core`.

## Relational model

| Aggregate | Tables | Purpose |
|---|---|---|
| Ticket | `tickets`, `ticket_comments`, `ticket_activity`, `ticket_attachments`, `ticket_relations` | Lifecycle, assignment label, resolution, discussion, history, evidence, and related work |
| QA run | `qa_runs`, `qa_run_workflows` | Historical product/environment/build execution and workflow outcomes |
| Finding | `qa_findings`, `finding_ticket_links` | Structured observation and review state, separate from tickets |
| Evidence | `qa_evidence` | File metadata, integrity hash, route, viewport context, and finding/run ownership |

Ticket sources are `MANUAL`, `QA_AGENT`, `CUSTOMER`, and `SYSTEM`. The latter two are modeled for future producers; no customer support portal exists. Categories are `BUG`, `UI`, `UX`, `FEATURE`, `SECURITY`, `PERFORMANCE`, `ACCESSIBILITY`, and `SUPPORT`. Ticket lifecycle is `NEW → TRIAGED → READY → IN_PROGRESS → REVIEW → TESTING → DONE`, with explicit `REJECTED` and controlled reopen paths. Terminal transitions require resolution text.

Finding lifecycle is `NEW`, then one of `TICKETED`, `LINKED`, `DISMISSED`, or `DUPLICATE`. Review never deletes the finding. A ticket may link multiple findings, and evidence linked to a converted finding is exposed as ticket attachment metadata.

The Control Plane has no operator identity store. `assignee` and activity `actor` are labels, not fabricated foreign keys. If operator authentication is later introduced, migration to a real principal can be decided then.

## Evidence storage

SQLite stores evidence metadata only. Bytes live below `control_plane/data/qa-evidence/{runId}/`, which is gitignored. Storage keys are generated server-side, filenames are sanitized, reads are root-contained, and SHA-256 plus byte size are persisted. The Control Plane registry backup copies the evidence tree beside the SQLite snapshot as `<snapshot>.evidence`; keep both together when copying a backup off host.

No secret is stored in QA records. Credentials are process environment variables. Console/network context is filtered to relevant failures, and the runner redacts configured QA passwords from captured errors.

## QA execution and safety

The initial runner is `control_plane/scripts/qa/martial-arts.ts`. It requires a registered environment ID and checks all of the following before browser launch:

- the environment exists in the Control Plane registry;
- its type is not `PROD`;
- lifecycle is `ready`;
- product is `martial-arts`;
- `/api/health` is reachable.

The default run is read-only: authentication, dashboard, leads, follow-up, marketing, settings, and a mobile dashboard pass. `--allow-test-data` explicitly enables creation of a disposable lead in the selected non-PROD database. The runner captures unexpected console exceptions/errors, failed requests, relevant HTTP 4xx/5xx responses, screenshots, current route, workflow, browser, viewport, and release identity.

Deterministic UI checks currently cover page-level horizontal overflow, missing level-one page heading, visible unlabeled form controls, and visible actions without accessible names. These checks generate findings. Subjective UI/UX reviews must use structured fields—observation, problem rationale, location, evidence, suggestion, and confidence—and must not claim preference as fact or modify source automatically.

## API and visibility

Ticket and QA APIs are internal Control Plane routes and inherit the existing loopback / explicit remote-token boundary. Ticket comments carry `INTERNAL` or `CUSTOMER` visibility so a future support view can expose a deliberately narrowed contract. The current operator UI displays both; there is no customer-facing API or portal.

List APIs paginate and filter in SQLite. The ticket board defaults to 50 rows per page and supports search, status, source, category, priority, and sorting. QA runs preserve history and are not overwritten by later runs.

## Extension to another product

Add a product-specific browser workflow module without importing that product's domain services. Reuse the Control Plane run/finding/evidence services, enforce registered non-PROD selection, record the product/image identity from the registry and health endpoint, and document which mutations are disposable. Do not move product workflows into the shared foundation merely to share the runner.

## Deferred, intentionally

Scheduled/release-triggered QA, run comparison, regression matching, SLA metrics, notifications, GitHub linkage, customer ticket submission/status, coding-agent consumption, and automatic retest are compatible with this model but not implemented. Autonomous remediation and deployment are explicitly outside the boundary.

Runbook: [[QA-Ticketing-Runbook]]. Current implementation: [[Current-State]].
