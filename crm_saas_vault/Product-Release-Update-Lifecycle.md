---
type: note
status: current
area: saas
updated: 2026-09-19
aliases:
  - Release update lifecycle
  - Pre-VPS Phase 3
tags:
  - saas
  - release
  - s6
---

# Product release and update lifecycle

Phase 3 of [[wip/CRM_SaaS_Pre_VPS_Product_Quality_and_Release_Readiness_Program]]. Work order (archived): [[wip/archive/WO-2026-09-19-pre-vps-product-quality]]. Operator procedure for Martial Arts Customer #1 remains [[Customer-1-Update-Runbook]]. Fleet mechanics: [[S6-Fleet-Runbook]].

This is the durable map of how SIC ships a new Martial Arts or Sales application release to an already-provisioned customer environment. It does not authorize live VPS/DNS/TLS.

## What already existed (S6)

Control Plane upgrade is not new. S6 already:

1. Refuses upgrade without an S6 backup of **this** environment.
2. Rebuilds the product image locally (`docker build -t {expectedImage} --build-arg RELEASE_ID=…`).
3. Writes `EXPECTED_IMAGE` into the environment env file.
4. Runs `docker compose up -d --no-deps app` (never `down`, never `-v`, never prune).
5. Blocks PROD until a non-PROD sibling is on the same image (Acme lab `:s2` compose exempt).
6. Waits until `GET /api/health` is `ok` + `database: reachable`.
7. Restores by replacing sqlite + uploads in the same named volumes, then remounting the app.

Health already returned `releaseId` from `RELEASE_ID` / `GIT_SHA` / `dev` via `@crm/core` `coreHealthBody`. Martial Arts also returned `schemaVersion` (`0020_tidy_frog_thor`). Control Plane already stored those fields on fleet observe. The operator UI did not show them.

## Gaps this phase closed

| Gap | Fix |
|---|---|
| Upgrade `compose up` did not `--force-recreate`, so a rebuilt mutable tag could keep the old container | Upgrade now uses `--force-recreate --no-deps app` without `-v` |
| Env file `RELEASE_ID` stayed at provision-time `dev`, overriding image `ENV` | Upgrade stamps `EXPECTED_IMAGE` **and** `RELEASE_ID` |
| Compose-up failure left the env file pointing at the new image | Failed `compose up` restores the previous env file |
| Sales `/api/health` omitted `schemaVersion` | Sales reports `0004_sales_v1_dogfood` |
| Sales image had no `RELEASE_ID` build-arg | Sales Dockerfile matches Martial Arts (`ARG`/`ENV RELEASE_ID`) |
| Control Plane hid `releaseId` / `schemaVersion` | Environment workspace + indexes show them |
| Upgrade had no target-image field | Lifecycle tab accepts a target image and reports previous → new, backup id, release, schema |

## Release identity

A running environment is identified by all of:

- **expected image** (Control Plane row + compose `EXPECTED_IMAGE`, e.g. `martial-arts-acquisition:s4` or `crm-sales:c2`)
- **running image name/id** (docker inspect, shown when the container is up)
- **`releaseId`** from `/api/health` (`RELEASE_ID`, else `GIT_SHA`, else `dev`)
- **`schemaVersion`** from `/api/health` (latest Drizzle journal tag for that product)

Do not use `latest`. Mutable tags (`:s4`, `:c2`) are acceptable only when `RELEASE_ID` is stamped at build/upgrade so two builds of the same tag remain distinguishable in health.

Operator question *“What exact release is Customer A running?”* is answered on the environment workspace: Image, Running image, Release ID, Schema version.

Set `RELEASE_ID` (or `GIT_SHA`) to `git rev-parse HEAD` before Upgrade so health is not `dev`.

## How a release is produced

```text
Development (pnpm) → tests/lint/typecheck/build
        ↓
docker build -t {product-tag} --build-arg RELEASE_ID={git-sha}
        ↓
Control Plane: Backup this environment
        ↓
Upgrade non-PROD first (when the instance has one)
        ↓
Upgrade PROD (same image tag + RELEASE_ID)
        ↓
Health: ok + reachable + matching releaseId + expected schemaVersion
```

Each Customer Account × Product Instance keeps its own named sqlite and assets volumes. Customers do not update simultaneously. SIC can stage a release on one DEV, then selected PRODs.

## Migrations

Both product images run Drizzle migrate at container start (`runtime-init`). Failures exit non-zero; Docker does not mark the app healthy.

| Kind | Rule |
|---|---|
| Additive (new table/column/index) | Normal. Idempotent journal. App start applies it. |
| Destructive (drop/rename/incompatible) | Do not ship until a restore drill exists. Prefer expand/contract. If shipped, rollback is **restore pre-update backup + previous image**, not “run the old image on the new schema.” |
| Failure mid-migrate | Container unhealthy. Stop the bad process. Restore the pre-update zip into the same volumes. Start the previous image. |
| Schema vs app | Health `schemaVersion` must match the journal tag the image was built with. |

Short planned downtime during upgrade is acceptable. This is not zero-downtime.

## Volumes and data

Upgrade recreates the **app container only**. Named sqlite and assets volumes stay. Sales proposal PDFs live on the assets volume. Never `docker compose down -v`. Never prune.

## Failure and rollback

```text
Upgrade
  ↓
Failure (build, compose up, or health timeout)
  ↓
Compose-up failure: env file reverted to previous EXPECTED_IMAGE / RELEASE_ID
  ↓
Health/migration failure: stop the bad container; do not downgrade SQLite in place
  ↓
Restore the pre-update S6 backup into this environment
  ↓
Start/recreate the previous image
  ↓
Health check + login + one representative workflow
```

Control Plane does **not** auto-rollback after a healthy-looking compose that then fails health. The operator gets the error and uses Restore. That pair (known backup + known previous image) is rollback.

## Control Plane workflow

Environment → **Lifecycle**:

1. Backup (required before Upgrade).
2. Optional off-host copy of that zip.
3. Target image field (defaults to current `expectedImage`).
4. Upgrade (busy state while build + recreate + health wait).
5. Notice: previous → new image, backup id, health `releaseId`, `schemaVersion`.
6. On failure: truthful error. Restore remains on the same tab.

Indexes show Release next to Image so SIC can see mixed fleets (Customer A on X, Customer B on Y, Sales SIC on Z).

## Runtime proof (this phase)

| Proof | Result |
|---|---|
| S6 backup/restore/upgrade contract tests | PASS (including `--force-recreate` without `-v`, env stamp) |
| Health parser `releaseId` / `schemaVersion` | PASS |
| Sales docker contract `ARG RELEASE_ID` | PASS |
| Full old-image → new-image docker drill with representative MA + Sales data | **Not re-run** this phase. S6 already proved backup+upgrade remounts volumes. A fresh multi-product image rebuild was not executed here (slow, leftover lab sqlite). |
| Live VPS / registry / off-host cloud | **External.** Repository path does not require them. |

Do not treat leftover laptop labs as official pilots.

## External blockers

Legitimate: no live VPS, no external registry credentials, no off-host cloud folder until a path exists. Off-host copy still works to a local folder SIC chooses.

Not a blocker: Sales schema on health, upgrade recreate, release display, Release ID stamp — those were repository work and are done.
