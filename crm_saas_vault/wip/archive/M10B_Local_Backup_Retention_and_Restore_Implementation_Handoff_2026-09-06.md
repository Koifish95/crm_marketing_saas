---
type: note
status: current
area: operations
updated: 2026-09-06
tags:
  - handoff
  - m10b
  - m10
---

# M10B Local Backup, Retention, and Restore — Implementation Handoff

**Date:** 2026-09-06  
**Purpose:** Factual record of M10B as implemented on branch `M10`. Not a copy of the implementation prompt.  
**Database:** SQLite  
**Timezone:** America/Denver  
**Prior:** [[M10A_Implementation_and_M10_Continuation_Handoff_2026-09-06]]

This file does **not** start VPS, Caddy, DNS, HTTPS, off-host backup, PostgreSQL, or M11.

---

# Executive summary

M10B implemented a **same-host** backup and restore system that reuses the M10A Environment zip package.

- Manual backup and restore for DEV, STAGE, and PRODUCTION.
- Automatic daily PRODUCTION backup at **02:00 America/Denver**.
- PRODUCTION retention **14 days**. STAGE/DEV are manual only.
- Restore requires `--confirm-env` matching the destination and restamps isolation so the destination stays itself.
- The required PRODUCTION → STAGE restore drill was run on this host and passed.

Acceptance criteria in the M10B prompt were met in code and live Docker QA. M10B is **ready for Scott / ChatGPT review**. It is **not** Scott-accepted yet and is **not** merged to `master`.

**Limitation (prominent):** backups live on the same physical host as the app (`data/backups/`). They do not survive disk failure, laptop loss, theft, fire, ransomware on the host, or losing the machine. Off-host copies are later M10.

---

# Git state

| Item | Value |
|---|---|
| Branch | `M10` |
| Upstream | `origin/M10` (`https://github.com/Koifish95/renzo-crm.git`) |
| Starting HEAD (M10A done) | `d2debb5` — `10A done` |
| Ending HEAD | Sprint 4 documentation commit on `origin/M10` (message starts with `Document M10B`) |
| Merged to master | No |
| Working tree after Sprint 4 | Clean except the untracked M10B implementation prompt (inbox; not committed) |

| Hash | Message | Sprint | Pushed |
|---|---|---|---|
| `4d25f3c` | Record M10A acceptance and keep report windows current. | 0 | Yes, before Sprint 1 |
| `8cf0d84` | Add host-side manual backups using the M10A zip package. | 1 | Yes, before Sprint 2 |
| `10fd786` | Add guarded host restore that preserves destination identity. | 2 | Yes, before Sprint 3 |
| `5107562` | Add scheduled PRODUCTION backups with 14-day retention. | 3 | Yes, before Sprint 4 |
| Sprint 4 | Document M10B backup operations and PRODUCTION→STAGE restore drill. | 4 | With this handoff |

---

# Architecture

## Package

Canonical writer/reader: `server/services/environment-backup.ts`.

- Manifest **v2**: `version`, `appEnv`, `createdAt`, `timezone`, `sqliteSha256`, `uploadCount`, `files`.
- Restore still accepts manifest **v1**.
- Zip entries: `sqlite/renzo.sqlite`, `manifest.json`, `uploads/…`.
- Isolation marker files are not stored as ordinary uploads; restore restamps destination `m10a.isolation` and `m10a-*-isolation.txt`.
- Secrets (`.env*`, session password, Meta token) are **not** in the zip.

In-app ADMIN `GET/POST /api/admin/environment/backup` and `/restore` use the same package. Host `pnpm backup:*` uses the same package.

## Host store

```text
data/backups/          (gitignored; RENZO_BACKUP_DIR override)
  status.json
  production/<Denver-stamp>/renzo-production-<stamp>.zip
  stage/<Denver-stamp>/renzo-stage-<stamp>.zip
  dev/<Denver-stamp>/renzo-dev-<stamp>.zip
```

Stamps come from `shared/utils/backup.ts` (`America/Denver`, e.g. `2026-09-06T161900-0600`). The store is a host bind mount, **not** inside `renzo-*-sqlite` or `renzo-*-assets`.

## SQLite consistency

1. Prefer `PRAGMA wal_checkpoint(TRUNCATE)` via `docker/db-marker.cjs checkpoint` (running container) or libsql in `writeBackupArchive`.
2. Then copy/zip the sqlite file.
3. If the checkpoint helper is missing from an older running app image, host backup logs a warning and copies anyway.

## Scheduler

- Docker service `renzo-backup-1` in `docker-compose.all.yml` and the PRODUCTION overlay.
- Image `renzo-acquisition:m10a`, entrypoint `node docker/backup-scheduler.cjs`.
- Mounts **only** PRODUCTION volumes (`renzo-prod-sqlite`, `renzo-prod-assets`) plus `./data/backups`.
- Does **not** mount STAGE or DEV.
- `restart: unless-stopped`. Sleeps until `nextScheduledBackupMs()` (02:00 America/Denver).
- After a successful backup, prunes PRODUCTION zips older than 14 days, always keeping `keepPaths` (the zip just created).
- Failed backup: log + `status.json` `lastFailure`; **no prune**.
- Deterministic QA: `pnpm backup:schedule -- --once` (host path: docker exec/cp, then same create+prune).

## Restore

`pnpm backup:restore -- --env <dest> --from <zip> --confirm-env <same>`:

1. Confirm string must equal destination `APP_ENV`.
2. Validate zip **before** touching destination volumes.
3. Stop only the destination container.
4. Replace only that env’s sqlite + asset volumes (per-file `docker cp` into the volume root — Windows `dir/.` nested a `sqlite/` folder).
5. Start destination; wait for `/api/health` with matching `appEnv` and `database=reachable`.
6. Restamp destination isolation.

Wrong `--confirm-env` exits non-zero. Corrupt zip fails before mutation (unit tests).

---

# Environment matrix

| | DEV | STAGE | PRODUCTION |
|---|---|---|---|
| Scheduled backup | No | No | Daily 02:00 America/Denver |
| Manual backup | `pnpm backup:dev` | `pnpm backup:stage` | `pnpm backup:prod` |
| Restore | Yes, `--confirm-env dev` | Yes, `--confirm-env stage` | Yes, `--confirm-env production` (guarded; not used in the acceptance drill) |
| Directory | `data/backups/dev/` | `data/backups/stage/` | `data/backups/production/` |
| Retention | Manual only | Manual only | 14 days automatic |

Laptop `pnpm dev` `:5030` is not a Docker environment. In-app Settings → Environment still dumps that process.

---

# Operator commands

```bash
pnpm backup:dev
pnpm backup:stage
pnpm backup:prod
pnpm backup:status
pnpm backup:prune
pnpm backup:schedule -- --once
pnpm backup:restore -- --env stage --from data/backups/production/<stamp>/renzo-production-<stamp>.zip --confirm-env stage
docker logs renzo-backup-1
docker restart renzo-backup-1
```

`--confirm-env` values: `dev`, `stage`, `production` (not display labels).

---

# Restore drill evidence

**When:** 2026-09-06, this host, combined stack `docker-compose.all.yml`.

**Source zip:** `data/backups/production/2026-09-06T161900-0600/renzo-production-2026-09-06T161900-0600.zip` (24754 bytes, `uploads=1`, createdAt `1788733142445`).

**Marker:** wrote `m10b-prod-drill-20260906` to PRODUCTION `/app/data/uploads/m10b-prod-drill-20260906.txt`, then `pnpm backup:prod`.

**Restore:** `pnpm backup:restore -- --env stage --from <that zip> --confirm-env stage`. Log: `archive source APP_ENV=production; destination stays stage`. `restore ok stage health appEnv=stage`.

| Check | Result |
|---|---|
| STAGE health | `ok`, `appEnv=stage`, `database=reachable` on `:5010` |
| STAGE isolation | `m10a-stage-isolation` in DB and `m10a-stage-isolation.txt` (not prod) |
| STAGE asset | `m10b-prod-drill-20260906.txt` content `m10b-prod-drill-20260906` |
| STAGE chrome | `/login` HTML contains STAGE; AppEnvSwitcher still lists PRODUCTION (link, not identity) |
| PRODUCTION health | `ok`, `appEnv=production` on `:5000` |
| PRODUCTION unchanged | still has drill file + `m10a-prod-isolation` |
| DEV health | `ok`, `appEnv=dev` on `:5020` |
| DEV unchanged | only `m10a-dev-isolation.txt`; no drill file |
| Zip still on disk | Yes |
| `pnpm backup:status` | last success `stage restore` of that zip |

PRODUCTION was not overwritten. DEV volumes were not touched.

---

# QA record

## Sprint 0

- Marked M10A accepted in vault + `AGENTS.md`.
- Fixed two date-stale M8 report tests (`toYmd` ended 2026-09-05; today 2026-09-06).
- `pnpm test` 300 passed (61 files); lint, typecheck, build passed.

## Sprint 1

- Canonical zip + `data/backups/{env}/`.
- Live `pnpm backup:prod|stage|dev` succeeded.
- Windows `EBUSY` on temp sqlite unlink after libsql close — cleanup is best-effort; command exits 0.

## Sprint 2

- Host restore + confirmation.
- Bug: Windows `docker cp dir/.` nested files under `/app/data/sqlite/sqlite/`. Fixed with per-file copy into the volume root. Re-restore confirmed markers at volume root.
- Wrong `--confirm-env` rejected (exit 1). Unauthorized in-app restore covered by `tests/m10/environment-backup-http.test.ts`.

## Sprint 3

- Scheduler + 14-day prune + `keepPaths`.
- First Docker run crashed: bundled CJS `import.meta.url` was undefined in `host-backup.ts` `repoRoot`. Fixed lazy `repoRoot()` with `process.cwd()` fallback. Image rebuilt.
- `pnpm backup:schedule -- --once`: PRODUCTION zip created; prune `kept=2 removed=0`. STAGE stayed 1 backup, DEV stayed 2.
- `renzo-backup-1` logs `next PRODUCTION backup at 2026-09-07T08:00:00.000Z`. `docker restart` resumed the same wait.

## Sprint 4 / integrated

```text
pnpm test        308 passed (62 files)
pnpm lint        passed (Node CJS/ESM experimental warning only)
pnpm typecheck   passed
pnpm build       passed
```

Live after drill:

| Container | Status |
|---|---|
| `renzo-prod-app-1` | healthy `:5000` |
| `renzo-stage-app-1` | healthy `:5010` |
| `renzo-dev-app-1` | healthy `:5020` |
| `renzo-backup-1` | Up, next run 2026-09-07T08:00:00.000Z |

In-app Settings → Environment download/restore was **not** re-clicked in a browser this session (HTTP tests exist; host drill is the acceptance path). Staff Settings copy now mentions `data/backups/production/` and `pnpm backup:status`.

`pnpm env:isolation:check` was **not** re-run (it starts overlay stacks and would collide with `env:up`).

---

# Deviations

| Requested | Implemented | Why | Impact |
|---|---|---|---|
| One scheduler mechanism | Docker `renzo-backup-1` **and** host `pnpm backup:schedule` | Host `--once` is the deterministic QA path; container is the always-on path | Operators can QA without waiting until 02:00 |
| Checkpoint always | Fallback copy if `db-marker checkpoint` is missing from a still-running older app container | App containers were not force-recreated after the image rebuild that added checkpoint | Backups still succeed; recreate apps to get in-container checkpoint |
| Settings backup dashboard | Host `pnpm backup:status` + `data/backups/status.json`; one sentence on Settings → Environment | Prompt said host reliability over UI polish | No in-app last-backup widget |
| Image name | Still `renzo-acquisition:m10a` | M10A image tag; no reason to retag mid-slice | None |
| Commit the M10B prompt | Left untracked in `vault/wip/` | Inbox; prompt said not required | Next agent can still read it |

---

# Known issues / technical debt

**Must fix before M10B acceptance:** none found after the scheduler `import.meta.url` fix and the Windows restore copy fix.

**Safe to defer (later M10):**

- Off-host / cloud replication (accepted non-goal).
- Recreate app containers so live `db-marker checkpoint` is present (fallback works).
- Windows temp-dir `EBUSY` after libsql close (command still succeeds).
- In-app last-backup status widget.
- `SESSION_COOKIE_SECURE` helper still not wired in `nuxt.config.ts` (M10A leftover).

**Future:** point-in-time recovery, PostgreSQL, CI backup jobs — out of scope.

STAGE currently holds PRODUCTION data from the acceptance drill (expected). Refresh STAGE from PRODUCTION again with `pnpm env:pull` or another restore if Scott wants a clean STAGE copy.

---

# Explicitly deferred

Still not started: off-host backup, Pi WebHosting / The Pond public cutover, release automation, monitoring, PostgreSQL, M11. Caddy is **not** the planned public edge.

---

# Recommended next M10 slice

**Pi WebHosting + The Pond** (existing nginx, Host-header routing). Scott decided this after M10B. Work order: [[RENZO_WEHOSTING_POND_AGENT]]. Do not start it from this handoff.

Still open before that cutover: whether an off-host backup is required first (M10B does not provide that); Pi `aarch64`; real certs and `.env` files live in WebHosting, not this repo.

---

# Final status block

```text
M10B STATUS: implemented; ready for Scott/ChatGPT review; not accepted; not merged
Branch: M10
HEAD: Sprint 4 documentation commit on origin/M10
Pushed: yes (each sprint pushed before the next)
Merged: no
Working tree: clean except untracked M10B implementation prompt
PROD daily backup: yes, 02:00 America/Denver, renzo-backup-1
Retention: 14 days PRODUCTION only
Manual DEV backup: yes
Manual STAGE backup: yes
Manual PROD backup: yes
Restore DEV: yes (guarded)
Restore STAGE: yes (guarded; live PROD→STAGE drill passed)
Restore PROD: mechanism exists and is guarded; not used in the acceptance drill
PROD → STAGE drill: passed 2026-09-06 (m10b-prod-drill-20260906.txt)
Full regression: 308 passed / lint / typecheck / build passed
Known blockers: none for M10B review
Recommended next milestone: Pi WebHosting / The Pond — only if Scott asks
```
