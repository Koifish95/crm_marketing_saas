---
type: work-return
status: done
id: WO-2026-10-02-qa-ticketing-platform
milestone: none
base_sha: "00b757e88863268d266c95e4c3d633ed7b7a4885"
result_sha: none
implementation_result: shipped
tests: "control_plane: pnpm test (26 files / 129 tests), pnpm lint, pnpm typecheck, pnpm build; disposable built-server API/page smoke passed"
decisions_discovered:
  - "Control Plane owns cross-product QA and unified tickets; findings remain separate from tickets"
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
  - SaaS-Decisions.md
  - Platform-Architecture.md
  - Control-Plane.md
  - QA-Ticketing-Architecture.md
  - QA-Ticketing-Runbook.md
---

# QA and unified ticketing return

Scott authorized the outcome directly in the 2026-10-02 chat; there was no separate active WIP work-order file to archive. This return uses a stable ID for durable evidence. This is code-shipped platform capability, not a new S/C milestone and not owner-accepted **Successful**.

## Shipped

- Control Plane-owned relational tickets, comments, activity, evidence attachments, relations, QA runs, workflows, findings, evidence metadata, and finding-ticket links in migration `0008_qa_ticketing`.
- Validated ticket APIs, lifecycle enforcement, terminal resolution, paginated/filterable board, manual create, detail, comments, activity, assignment labels, evidence, and QA origin visibility.
- QA run and finding review UI with create-ticket, link, dismiss, and same-run duplicate actions that preserve the source finding.
- File-backed, root-contained, SHA-256-recorded evidence; registry backup now includes a sibling evidence snapshot.
- Martial Arts Playwright runner using a registered ready non-PROD environment only. Read-only workflow coverage includes authentication, dashboard, leads, follow-up, marketing, settings, and mobile dashboard. Explicit `--allow-test-data` adds disposable lead creation.
- Deterministic heading, accessible-name, form-label, and horizontal-overflow checks plus console, exception, request-failure, HTTP failure, screenshot, route, viewport, workflow, and build context.
- Durable architecture and operator runbook.

## Explicitly not shipped

- Production QA, autonomous remediation, source edits, deploys, scheduled QA, customer portal, notifications, SLA/analytics, GitHub linkage, coding-agent consumption, or automatic retest.
- A live Martial Arts QA run: selecting credentials and a safe registered environment is an operator action. No production or customer environment was inferred or accessed.

## Proof

| Check | Result |
|---|---|
| Baseline Control Plane tests | 25 files / 123 tests passed |
| Final Control Plane tests | 26 files / 129 tests passed |
| Lint | Passed |
| Typecheck | Passed |
| Production build | Passed |
| Disposable built-server smoke | Ticket create/list API passed; ticket detail and QA runs pages HTTP 200 |

The disposable smoke database was removed after verification. Unrelated pre-existing/concurrent Sales work was not modified or discarded.
