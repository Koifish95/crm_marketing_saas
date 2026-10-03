---
type: note
status: done
area: platform
updated: 2026-10-02
tags:
  - qa
  - ticketing
  - control-plane
---

# QA and unified ticketing implementation

## Objective

Build a reusable internal ticketing capability and a safe, evidence-producing browser QA system in the Control Plane, initially exercising the Martial Arts product. Findings remain reviewable records and never authorize autonomous source changes or deployment.

Authorization: Scott's current 2026-10-02 chat request. This work is not C3, Beauty, S7, VPS, DNS/TLS, SI migration, foundation-domain promotion, or production mutation.

## Architecture discovered

- `control_plane/` is a separate Nuxt 4 operator application outside the pnpm workspace. It uses Nitro APIs, service modules, Drizzle, and a Control Plane-owned SQLite migration journal.
- The Control Plane owns cross-product operational identity: customer, product instance, environment, product/image, and operator activity. It is therefore the correct owner for cross-product tickets, QA runs, findings, and evidence metadata.
- The Control Plane has no operator-account system. Its current authorization boundary is loopback access, or explicit remote access plus token. Ticket assignment can therefore be a nullable operator label now; it must not fabricate a user foreign key.
- Products own their domain models. Martial Arts is a Nuxt 4 product with staff authentication, relational SQLite data, Nitro workflow APIs, and substantial Vitest coverage, but no browser automation.
- Existing durable file patterns store large artifacts outside SQLite. QA evidence will follow that model: metadata and integrity data in SQLite, bytes under a dedicated gitignored Control Plane evidence root.
- Playwright already exists in the repository dependency graph for browser testing elsewhere; there is no competing browser convention.

## Decisions

1. Ticketing and QA are Control Plane-owned operational domains, not `@crm/core` or Martial Arts domain features.
2. Tickets and findings are separate. A reviewed finding may create or link a ticket, be dismissed, or be marked duplicate while preserving its original record and activity.
3. Use normalized relational tables for tickets, comments, activity, attachments, QA runs, exercised workflows, findings, evidence, and finding-ticket links.
4. Store evidence bytes on disk, never in ordinary database rows. Evidence access is mediated by a path-safe Control Plane endpoint.
5. The initial runner only accepts registered Martial Arts non-PROD environments and refuses PROD before opening a browser. It uses explicit QA credentials, captures browser/viewport/route context, and records console, page, and relevant HTTP failures with noise controls.
6. Deterministic browser checks create findings automatically. Subjective UI/UX observations require structured rationale, evidence, suggestion, and confidence; they do not alter product source.
7. No automatic ticket flood: runner output is findings. Operators decide which findings warrant tickets.
8. The present Control Plane loopback/token boundary protects internal ticket details. API/view models keep internal fields separate so a future customer support surface can expose a narrower contract.

## Implementation plan

- [x] Establish existing Control Plane test baseline (25 files / 123 tests passed).
- [x] Add schema migration and shared validation contracts.
- [x] Implement ticket, QA run, finding, activity, and evidence services.
- [x] Add validated APIs, including finding review and finding-to-ticket conversion.
- [x] Add Ticket board, ticket detail/create flows, QA run list/detail, and navigation.
- [x] Add safe Martial Arts Playwright runner with functional, technical, responsive, and deterministic accessibility/UI checks.
- [x] Add service/API/permission/runner tests.
- [x] Run Control Plane test, lint, typecheck, and build; no Martial Arts source changed.
- [x] Update durable architecture/current-state/lockfile documentation and add operator runbook.
- [x] Write and archive the work return.

## Progress

- Completed repository bootstrap, branch/HEAD/status check, and architecture discovery.
- Confirmed unrelated Sales changes already exist in the worktree and are out of scope.
- Implemented Control Plane migration `0008_qa_ticketing`, services, APIs, operator UI, evidence backup, Playwright runner, and automated coverage.
- Documented architecture and execution in [[QA-Ticketing-Architecture]] and [[QA-Ticketing-Runbook]].
- Operationally proved registered-slug selection, registered gitignored credential loading, read-only and explicitly gated state-changing runs against `lab-acme-dev`.
- Corrected three runner-quality defects found only through live use: build-helper leakage into browser evaluation, an ambiguous Email locator, and premature lead-creation completion. ANSI control codes are removed from persisted errors and route screenshots are deduplicated.
- Converted a real accessibility finding into `TKT-11AF0427`, verified the bidirectional finding/run/environment/evidence context, and linked the final-run recurrence to the same ticket.

## Safety boundaries

- Never target PROD; never infer mutation permission from reachability.
- Never touch Renzo, Koi-Pi, `webhosting_renzo_*`, VPS, DNS/TLS, or production resources.
- Never deploy, change product source from a finding, or delete infrastructure/data.
- QA-created data is disposable and only created in an explicitly selected non-PROD environment.
- Secrets are read from process-only variables or, with an explicit flag, only the registered gitignored local environment file. They are never persisted in run, finding, ticket, evidence, or log records.

## Test results

- Before changes: Control Plane `pnpm test` â€” 25 files / 123 tests passed.
- Final Control Plane `pnpm test`: 26 files / 131 tests passed.
- Final Control Plane `pnpm lint`: passed.
- Final Control Plane `pnpm typecheck`: passed.
- Final Control Plane `pnpm build`: passed.
- Disposable built-server smoke: ticket create/list APIs and rendered ticket detail / QA run pages returned expected results; temp SQLite removed.

## Operational proof

- Read-only run `1c55eb90-ae03-4731-9f48-8222311110b3`: authentication, dashboard, leads, follow-up, marketing, settings, and mobile dashboard all passed; zero findings; six unique screenshots.
- Final disposable-data run `a57ee9c7-e543-4a02-aeba-5aca9024ef0f`: all read-only workflows plus lead creation passed at `/leads/4`; one medium accessibility finding; no console or HTTP failure findings; evidence deduplication verified.
- Ticket `TKT-11AF0427` was created through the review API from the legitimate missing-`h1` finding. Ticket detail, board search, run/finding links, activity, and PNG evidence endpoint were verified. The final recurrence was linked to the same ticket.
- Eight harness false positives were dismissed with review notes and retained as audit history: seven browser-evaluator failures and one ambiguous locator failure.
- PROD protection was exercised against registered `lab-acme-prod` and refused before authentication or browser startup.

## Deep UI/UX audit (2026-10-03)

The existing runner and evidence services were used without adding QA infrastructure. Run `b80cd8c9-1569-40ea-83be-953fc9ae4cbe` captured the major authenticated Martial Arts surfaces at desktop and mobile sizes, plus the public home/trial routes. The run completed with findings and is inspectable through Control Plane QA Runs.

Seven structured findings were persisted: six medium UX findings and one medium accessibility finding. The findings consolidate systemic problems rather than producing page-by-page duplicates. One recurrence is linked to existing ticket `TKT-11AF0427`; the other six are available for operator review. Finding evidence remains attached to the run and is file-backed under the normal QA evidence root.

The audit did not modify Martial Arts product code or create new application records. It identified the strongest clusters as: non-actionable dashboard/empty-state surfaces, inconsistent `intro`/`trial` terminology and unavailable public booking, long mobile data-entry flow, and academy settings exposing infrastructure/recovery concepts. The public `/trial` route currently returns 404 when no class schedule is published; this is recorded as observed behavior, not “fixed” by the audit.

Audit limitations are recorded in the runbook and history return: no populated state-changing workflow was re-run, and keyboard/screen-reader/contrast coverage remains future work.

## Remaining limitations

- The runner currently covers the documented read-only surfaces and disposable lead creation, not every Martial Arts state transition.
- Disposable QA households remain in DEV because the product has no defined safe delete workflow.
- Credentials remain operator-managed; the runner does not create accounts or rotate passwords.
