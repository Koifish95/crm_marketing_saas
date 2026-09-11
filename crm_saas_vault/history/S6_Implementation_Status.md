---
type: note
status: current
area: saas
updated: 2026-09-11
tags:
  - wip
  - saas
  - s6
---

# S6 implementation status

Official S6 (Map B): Fleet Reliability / Lifecycle. **Successful** (2026-09-11). Owner pass: Scott.

Definitive record: [[wip/S6_closeout]]. Prompt: [[wip/archive/S6_Fleet_Reliability_Cursor_Prompt]]. Runbook: [[S6-Fleet-Runbook]]. ADR: [[SaaS-Decisions#2026-09-11 — Official S6 is Successful]]. Working decisions: [[SaaS-Decisions#2026-09-10 — S6 backup, restore, and upgrade]].

## Shipped

- Environment workspace **Lifecycle** tab
- `POST /api/environments/:id/backup` — same-host zip
- `POST /api/environments/:id/restore` — gated, one env, no `-v`
- `POST /api/environments/:id/backup/copy` — existing destination folder only; refuse if dest zip exists (409)
- `POST /api/environments/:id/backup/reveal` — `{ backupId }`, path under `data/backups/`, detached Explorer
- `POST /api/environments/:id/upgrade` — backup required; local rebuild; non-PROD before PROD (Acme lab exempt)
- `POST /api/environments/:id/start` and `.../stop` — `compose start app` / `stop app`
- `POST /api/environments/bulk/start` and `.../bulk/stop` — sequential; selected or all eligible registered rows
- Last backup shown on `/api/status`
- Running / success / conflict notices for Backup and Copy off-host
- Unit tests for path keys, decommissioned refuse, retention 14 days, zip identity, PROD upgrade gate, dest-zip conflict, start/stop command contract, bulk plan/partial results

Do not call `pnpm backup:prod` for the fleet.

## Git

| Item | Value |
|---|---|
| ADR / prompt | `2dfd8d1` |
| Feature | `76d0f71` |
| Operator feedback | `35b15bf` |
| S6 Successful | **checked** (2026-09-11) |

## Stop

Do not start S7 unless Scott asks.
