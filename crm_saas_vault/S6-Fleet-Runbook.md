---
type: note
status: current
area: saas
updated: 2026-10-14
aliases:
  - S6 runbook
tags:
  - saas
  - s6
---

# S6 fleet reliability runbook

Operator procedure for one hosting node (laptop or the Nuxxion VPS). Official S6 is **Successful** (2026-09-11) as a laptop proof. The same flow, plus digest-pinned rollback, was exercised live on the VPS 2026-10-07 ([[Nuxxion-Production-Acceptance]]).

App: `control_plane/` at http://127.0.0.1:52100 (on the VPS, through the tunnel: [[How-to-Run]])  
Prompt: [[wip/archive/S6_Fleet_Reliability_Cursor_Prompt]]  
ADR: [[SaaS-Decisions#2026-09-10 — S6 backup, restore, and upgrade]]  
Current state: [[Current-State]]

## Backup / restore / copy

Open an environment workspace → **Backup** tab.

1. **Backup** — same-host zip under gitignored `control_plane/data/backups/{customerSlug}/{environmentSlug}/`. CRM sqlite (`VACUUM INTO` + integrity check) + uploads. Each zip has `BACKUP.md`. Retention 14 days. Archived rows are refused; decommissioned rows can still be backed up.
2. **Copy off-host** — `POST …/backup/copy` with either `destinationDir` (an **existing** local folder; the latest zip is copied there, never overwriting a file) or `remotePath` (an `rclone`-style `remote:path` that a script has already verified; the VPS `sic-offhost-backup` job records it only after `rclone check`, and that script also refuses a local destination on the same filesystem as `/opt/sic`).
3. **Restore** — choose a specific backup (`{ confirm, backupId }`). Replaces **this** environment’s data. Same-environment rollback is allowed. Same-customer / same-product **PROD → DEV** copy-down is allowed. DEV → PROD, cross-product, and cross-customer are refused server-side. Siblings stay. Never `-v`. Restore does not change the image.

## Release identity, upgrade, rollback

Environment workspace → **Release** tab shows expected image, running image, `releaseId`, `schemaVersion`. Map: [[Product-Release-Update-Lifecycle]].

1. **Pin the running release** — `POST /api/environments/{id}/release-pin`. API only; there is no button. Reads the running container’s image id, takes the git SHA baked into that image (refuses an image with none), and rewrites the env file to `EXPECTED_IMAGE={repo}@sha256:…` and `RELEASE_ID={sha}@{12-hex digest}`. Recreates the app on the **same** image. Refuses when the only release id available is `dev`. Required once per environment before the first upgrade.
2. **Upgrade** (Release tab or `POST …/upgrade`) — requires an S6 backup of **this** env and a pinned release. Writes the previous digest + release id onto that backup row. When the target is not an existing digest, it takes the image for the deployed commit: the CI image `ghcr.io/koifish95/<product>:<commit>` when GHCR has it, otherwise a build on this host; PROD normally takes the digest its DEV already runs, with no second build. Refuses PROD until a non-PROD on the same instance runs that image (Acme lab `:s2` compose is exempt). Recreates with `--force-recreate --no-deps app`, remounts the same volumes, waits for health.
3. **Rollback** — `POST /api/environments/{id}/rollback` with `{ "confirm": true, "backupId": "<pre-upgrade backup>" }`. API only; the Release tab copy still says “Restore plus the previous image”, which is what this does in one call. Stops the container, restores that backup into the same volumes, starts the digest and release id stored on that backup. Refuses a backup without a stored digest or release id, and any backup that is not this environment’s own. Never follows the mutable tag. No auto-rollback after a failed upgrade.

Do not start an older image against a database that already migrated forward without restoring the matching backup. That is what rollback prevents.

Do **not** use `pnpm backup:prod`. That is the template triple (`:5000/:5010/:5020`), not the SI/Acme fleet.

Proof target: a throwaway extra non-PROD or Acme. Do not treat SI laptop data as durable. Never attach `renzo-*` / `webhosting_renzo_*`.

## Safety

Never `docker compose down`, `-v`, or prune. Relaunch and upgrade remount named volumes.
