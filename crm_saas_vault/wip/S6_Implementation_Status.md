---
type: note
status: current
area: saas
updated: 2026-09-10
tags:
  - wip
  - saas
  - s6
---

# S6 implementation status

Official S6 (Map B): Fleet Reliability / Lifecycle. **Implemented. Not Successful.** Scott’s browser/Docker pass is still required.

Prompt: [[wip/S6_Fleet_Reliability_Cursor_Prompt]]. Runbook: [[S6-Fleet-Runbook]]. ADR: [[SaaS-Decisions#2026-09-10 — S6 backup, restore, and upgrade]].

## Shipped

- Environment workspace **Lifecycle** tab
- `POST /api/environments/:id/backup` — same-host zip
- `POST /api/environments/:id/restore` — gated, one env, no `-v`
- `POST /api/environments/:id/backup/copy` — existing destination folder only
- `POST /api/environments/:id/upgrade` — backup required; local rebuild; non-PROD before PROD (Acme lab exempt)
- Last backup shown on `/api/status`
- Unit tests for path keys, decommissioned refuse, retention 14 days, zip identity, PROD upgrade gate

Do not call `pnpm backup:prod` for the fleet.

## Not Successful yet

Owner pass still needed: backup + restore + off-host copy (operator pastes a real folder) + upgrade on a throwaway extra or Acme. SI is not the durable proof.

## Git

| Item | Value |
|---|---|
| ADR / prompt | `2dfd8d1` |
| Feature | `76d0f71` |
| S6 Successful | unchecked |

## Stop

Do not start S7. Do not mark S6 Successful.
