---
type: work-return
status: done
id: WO-2026-09-27-sales-local-backup
milestone: none
base_sha: 37920743c1c511e1ab5e24fb3d6da491d61d6404
result_sha: none
implementation_result: shipped
tests: "sales_template vitest tests/domain/local-sqlite-backup.test.ts 3 passed. Live VACUUM INTO snapshot written, restored to a temp file, queried, temp file deleted. Live app.sqlite size and mtime unchanged."
decisions_discovered:
  - "SaaS-Decisions#2026-09-27 — Local Sales dogfood sqlite backup"
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
  - SaaS-Decisions.md
  - history/_index.md
---

# WO-2026-09-27 — Local Sales sqlite backup return

Code-shipped. Not a platform milestone. This return is inside the feature commit, so `result_sha` stays `none`.

## What shipped

- `pnpm backup:local` snapshots `sales_template/data/app.sqlite` with `VACUUM INTO`.
- `pnpm backup:restore -- --to <path>` copies a snapshot elsewhere and refuses the live database path.
- 14-day retention. The newest snapshot is kept.
- Snapshots stay in gitignored `sales_template/data/backups/`.

## What did not ship

Automated email, discovery expansion, Sales workflow changes, Control Plane fleet-backup changes.

## Acceptance

A live snapshot was created, restored to a disposable file, and queried. The restored copy contained the prospect pool, the Wolves Den company, its Working opportunity, and its contact. The live database file was not replaced. The disposable restore was deleted after the check. No email was sent.
