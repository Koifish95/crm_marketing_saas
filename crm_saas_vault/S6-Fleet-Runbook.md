---
type: note
status: current
area: saas
updated: 2026-09-10
aliases:
  - S6 runbook
tags:
  - saas
  - s6
---

# S6 fleet reliability runbook

Laptop-only operator procedure. Official S6 is **Successful** (2026-09-11). Not off-site SaaS.

App: `control_plane/` at http://127.0.0.1:52100  
Prompt: [[wip/archive/S6_Fleet_Reliability_Cursor_Prompt]]  
ADR: [[SaaS-Decisions#2026-09-10 — S6 backup, restore, and upgrade]]  
Current state: [[Current-State]]

## Backup / restore / copy / upgrade

Open an environment workspace → **Lifecycle**.

1. **Backup** — same-host zip under gitignored `control_plane/data/backups/{customerId}/{environmentId}/`. CRM sqlite + uploads only. Retention 14 days. Decommissioned rows are refused.
2. **Copy off-host** — paste an **existing** folder path. The latest zip is copied there. The control plane does not invent a cloud vendor. If the folder is missing, the copy fails.
3. **Restore** — check the confirm box. Replaces **this** environment’s data from the latest zip (or a zip path). Siblings stay. Never `-v`.
4. **Upgrade** — requires an S6 backup of **this** env. Rebuilds the local image, remounts the same volumes. If the customer has a non-PROD, upgrade that first (Acme lab `:s2` compose is exempt). Rollback = Restore + previous `expectedImage`.

Do **not** use `pnpm backup:prod`. That is the template triple (`:5000/:5010/:5020`), not the SI/Acme fleet.

Proof target: a throwaway extra non-PROD or Acme. Do not treat SI laptop data as durable. Never attach `renzo-*` / `webhosting_renzo_*`.

## Safety

Never `docker compose down`, `-v`, or prune. Relaunch and upgrade remount named volumes.
