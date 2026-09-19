---
type: note
status: current
area: saas
updated: 2026-09-18
aliases:
  - Customer 1 backup restore
tags:
  - saas
  - customer-1
  - ops
---

# Customer #1 backup and restore runbook

## What is backed up

- SQLite via **VACUUM INTO** (integrity-checked), not a live torn copy
- Marketing uploads under the assets volume
- Control Plane fleet zip: `control_plane/data/backups/{customerId}/{environmentId}/`
- In-app PRODUCTION scheduler writes under `APP_BACKUP_DIR` (provisioned default `/app/data/sqlite/backups`)

Retention: 14 days. Off-host survival: Control Plane **Copy off-host** to an existing folder, or copy that folder to operator-controlled storage.

## Create a backup

Control Plane → environment → Lifecycle → Backup.

Or in the Martial Arts container (PRODUCTION): the in-app scheduler runs at 02:00 America/Denver. Host-backup status file records last success/failure.

## Off-host copy

Control Plane → Copy off-host → paste an **existing** folder path. The zip is copied there. Remote object-storage credentials are not in the repository.

## Restore

1. Confirm the target environment.
2. Choose a specific `backupId`. Never silently “latest.”
3. Allowed: same-environment rollback; same-customer / same-product PROD → DEV copy-down.
4. Refused: DEV → PROD, cross-product, cross-customer, `down -v`.
5. After restore: authenticate and complete a representative workflow.

## Control Plane registry

`control_plane/data/control-plane.sqlite` is gitignored. Copy it with the backup set if the operator host is lost. Re-seed only restores **lab-acme**, not customer rows. Treat the CP sqlite + `data/provisioned/*.env` as required recovery material.

## Recovery expectations (engineering, not a business SLA)

These are **working assumptions**, not owner-approved contractual RPO/RTO:

- RPO: last successful backup (scheduled daily plus on-demand before updates)
- RTO: restore zip + remount volumes + container healthy, typically under an hour if the host and image are available

Do not quote these as a sold SLA until Scott/SIC approve them.
