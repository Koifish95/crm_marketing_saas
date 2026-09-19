---
type: note
status: current
area: saas
updated: 2026-09-18
aliases:
  - Customer 1 update runbook
tags:
  - saas
  - customer-1
  - ops
---

# Customer #1 update and failed-release runbook

## Before an update

1. Control Plane → Backup the target environment. Confirm the zip validates.
2. Record `expectedImage`, `RELEASE_ID` / git SHA, and `/api/health` `schemaVersion`.
3. If the customer has a non-PROD, update that first.

## Update

1. Build a uniquely identified image: `--build-arg RELEASE_ID=<git-sha>`.
2. Control Plane → Upgrade (requires a backup of **this** env) **or** recreate the edge compose app service with the new tag, same volumes, never `-v`.
3. Wait until `/api/health` is green. Confirm `releaseId` matches the SHA.
4. Log in and complete: dashboard → household → trial or follow-up read.

## Failed release

Do **not** downgrade the SQLite schema.

Safe response:

1. Restore the pre-update backup into the same environment.
2. Run the previous image (`expectedImage` / previous `RELEASE_ID`).
3. Confirm health, login, and a representative workflow.

That pair (known backup + known image) is the rollback.
