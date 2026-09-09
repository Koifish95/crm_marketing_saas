---
type: note
status: current
area: operations
updated: 2026-09-06
tags:
  - handoff
  - m10a
  - m10
---

# M10A Implementation and M10 Continuation Handoff

**Date:** 2026-09-06  
**Purpose:** Factual post-M10A state for the next ChatGPT / Cursor instance. Repository reality is the source of truth, not the original M10A prompt.  
**Database:** SQLite (no PostgreSQL in this document or in M10A)  
**Timezone:** America/Denver  
**Prior handoff:** [[M10A_Docker_Environment_Foundation_Implementation_Handoff_2026-09-05]] (written at `39b9906`; later superseded in Git by `5bc0ead` and `9d8f70d`)

This file does **not** start M10B, VPS, Caddy, DNS, or PostgreSQL. It records what exists now.

---

# 1. Executive Summary

M10A is **functionally implemented** as a local Docker foundation: one production-built image, three isolated environments (DEV, STAGE, PRODUCTION), plus laptop `pnpm dev` as a fourth data source that is not a Docker environment.

Scott has given human approval on M10A. Vault status notes (`Milestones.md`, `Implementation-State.md`, `Home.md`) still say “awaiting Scott acceptance” and have not been flipped.

**What M10A actually implemented**

- One image `renzo-acquisition:m10a` from `Dockerfile` (Nuxt production build, not `nuxt dev`).
- Three isolated Docker runtimes: `APP_ENV=dev|stage|production`, each with its own Compose project or combined-stack service, network, SQLite volume, and asset volume.
- Combined stack `docker-compose.all.yml` / `pnpm env:up` so all three run at once.
- Environment identity in health, Settings, logs, chrome color (DEV red, STAGE green, PRODUCTION academy navy), and a non-production banner on DEV/STAGE.
- PRODUCTION seed does not invent `admin` / `setup`. DEV and STAGE (working tree) do.
- Operator scripts: start/stop/restart/logs/ps/build, DEV-only volume reset, PRODUCTION←laptop load, PRODUCTION→STAGE+DEV pull.
- In-app ADMIN Settings → Environment: download a zip of this process’s SQLite + uploads, restore that zip on another running process (the bidirectional copy path).

**Can DEV, STAGE, and PRODUCTION all run?** **Yes, implemented and currently tested live on this host.** At documentation time (2026-09-06):

| Container | Status | Health JSON `appEnv` |
|---|---|---|
| `renzo-prod-app-1` | Up, Docker `healthy`, `:5000` | `production` |
| `renzo-stage-app-1` | Up, Docker `healthy`, `:5010` | `stage` |
| `renzo-dev-app-1` | Up, Docker `healthy`, `:5020` | `dev` |

They use the **same image and codebase**. Identity is `APP_ENV`, not `NODE_ENV` (all Docker containers run `NODE_ENV=production`).

**Independent data?** **Yes, by construction and by live markers.** Each environment has its own named SQLite volume and asset volume. Live containers currently hold distinct isolation markers (`m10a-dev-isolation` / `m10a-stage-isolation` / `m10a-prod-isolation`) in both `app_settings` and `data/uploads/*.txt`.

**Incomplete M10A acceptance items**

- Working-tree operator additions (in-app zip, env switcher, `env:pull`, `env:prod:load-local`, STAGE `admin`/`setup`) are **implemented but not committed**.
- Full host suite (`pnpm test` / `lint` / `typecheck` / `build`) was **not re-run** in this documentation session except `tests/m10` (**20 passed**). Last recorded full suite: **289 passed** on 2026-09-05.
- Browser login / Marketing / Asset-upload smoke inside containers: **NOT TESTED** in this session.
- `pnpm env:isolation:check` and persistence-through-recreate: **NOT RE-RUN** in this session (would bounce the live stack). Markers and health were read from already-running containers.
- M10A is **not merged** to `origin/master`.

**Known operational concerns (not blockers for later M10 planning)**

- PRODUCTION first-admin bootstrap is still “set `NUXT_AUTH_PASSWORD` or restore/load a database that already has users.” No production credential-distribution system.
- Settings Shutdown cannot stop Compose (no Docker socket). `restart: unless-stopped` may bring the process back.
- `SESSION_COOKIE_SECURE` is explicit in env files (`false` for local HTTP). The `sessionCookieSecure()` helper is tested but **not wired** into `nuxt.config.ts`.
- Historical `data/renzo.sqlite` (and m1/m3/m4 fresh files) remain tracked from earlier milestones.
- `9d8f70d` committed `.obsidian/workspace.json` and the M10A implementation prompt.

```text
                    SAME CODEBASE / SAME IMAGE
                      renzo-acquisition:m10a
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
        DEV                  STAGE              PRODUCTION
    APP_ENV=dev           APP_ENV=stage       APP_ENV=production
    :5020 → :5000         :5010 → :5000        :5000 → :5000
    renzo-dev-sqlite      renzo-stage-sqlite   renzo-prod-sqlite
    renzo-dev-assets      renzo-stage-assets   renzo-prod-assets
    renzo-dev-net         renzo-stage-net      renzo-prod-net
    red chrome + banner   green chrome + banner academy navy
    admin / setup         admin / setup        no invented setup

  Laptop pnpm dev is NOT a Docker env:
    :5030  data/renzo.sqlite  data/uploads/
```

Copy between those four stores is documented in **§5.2**. Host pull is PRODUCTION → STAGE and DEV. Bidirectional copy (including DEV ↔ STAGE) is the in-app zip.

---

# 2. Git / Repository State

Inspected 2026-09-06 on this machine.

| Item | Actual value |
|---|---|
| Current branch | `M10` |
| Upstream | `origin/M10` (branch is **up to date**) |
| HEAD | `9d8f70d72729957b0310547b5a3965ad0fd7413d` — `M10A finished, doing QA` |
| Working tree | **Dirty.** Substantial uncommitted M10A follow-on plus vault/wip M9 archive moves |
| Intended M10A changes committed? | **No.** Operator copy, Settings Environment, env switcher, STAGE `setup`, pull/load-local live only in the working tree |
| M10A commits pushed? | **Yes** through `9d8f70d`. Uncommitted work is not pushed |
| Merged to default branch? | **No.** `origin/master` is `f885b4a` (`Merge pull request #9 from Koifish95/M9`). `origin/master...HEAD` = `0 / 6` (six M10 commits ahead, none unique to master) |
| Local `master` | `32b640f`, **behind `origin/master` by 47** |
| Tags | **None** |
| Remote | `origin` `https://github.com/Koifish95/renzo-crm.git` |
| `origin/HEAD` symbolic-ref | **not set** |

## 2.1 M10A commits (chronological)

All six sit on `M10` after `f885b4a`. Author on these commits: Koifish95.

| Hash | Date | Message | Sprint / purpose | Pushed before next sprint? |
|---|---|---|---|---|
| `2d9590d` | 2026-09-05 21:08 | Add M10A Docker image, entrypoint migrations, and isolated Compose environments. | Image + Compose isolation | **No.** Same-minute batch with the next three |
| `203d683` | 2026-09-05 21:09 | Add APP_ENV identity, non-production banners, and production bootstrap safety. | Identity / banner / seed | **No** |
| `1783545` | 2026-09-05 21:09 | Add M10A operator commands, isolation check, and environment documentation. | `pnpm env:*` + vault | **No** |
| `39b9906` | 2026-09-05 21:11 | Add M10A Docker environment foundation implementation handoff. | First handoff | Pushed together with the batch; `5bc0ead` records that push |
| `5bc0ead` | 2026-09-05 21:12 | Record M10A handoff commit hash after push to origin/M10. | Hash footnote | After the first push |
| `9d8f70d` | 2026-09-06 12:48 | M10A finished, doing QA | Combined stack, ports 5000/5010/5020/5030, Windows build context, chrome colors | **Yes** (current `origin/M10`) |

The intended workflow (implement → QA → commit → **push** → next sprint) was **not** followed for sprints 1–4. They were committed 27 seconds apart in one session because Docker Linux could not start on 2026-09-05. Git still has reviewable checkpoints. `9d8f70d` is a next-day QA/operator correction on the already-pushed branch.

## 2.2 Uncommitted / ignored (do not treat as committed M10A)

**Modified (not staged)** — operator follow-on that **is** current repository behavior:

- `.env.stage.example` — STAGE now documents `admin` / `setup`
- `AGENTS.md`, vault Architecture / Authentication / Database / Decisions / Design-System / How-to-Run / Implementation-State
- `app/app.vue`, `app/layouts/auth.vue`, `app/layouts/internal.vue`, `app/pages/settings/index.vue`
- `docker-compose.all.yml`, `docker-compose.stage.yml`
- `drizzle/seed.ts` — STAGE defaults to `setup` like DEV
- `package.json`, `pnpm-lock.yaml` — `yauzl` / `yazl` for zip backup
- `scripts/env.mjs` — `pull`, `load-local`
- `scripts/env-isolation-check.mjs` — host-shell-safe `docker exec`
- `server/services/security-audit.ts` — `ENVIRONMENT_BACKUP` / `ENVIRONMENT_RESTORE`
- `shared/utils/app-env.ts`, `shared/utils/labels.ts`
- `tests/m10/app-env.test.ts`, `tests/m10/bootstrap-safety.test.ts`

**Untracked (implementation, not committed)**

- `app/components/AppEnvSwitcher.vue`
- `app/pages/settings/environment.vue`
- `server/api/admin/environment/backup.get.ts`
- `server/api/admin/environment/restore.post.ts`
- `server/services/environment-backup.ts`
- `tests/m10/environment-backup.test.ts`
- `tests/m10/environment-backup-http.test.ts`
- `vault/wip/M10A_Implementation_Response_Request_2026-09-06.md` (this request; inbox)
- this handoff file (created by this session)

**Working-tree vault housekeeping (not M10A runtime)**

- Many `vault/wip/M9_*.md` files show as deleted because they were moved to `vault/wip/archive/`. Uncommitted.

**Intentionally ignored (must stay out of Git)**

- `.env`, `.env.dev`, `.env.stage`, `.env.production` (`.gitignore` allows only `*.example`)
- `/data/*.sqlite` for **new** files; **historical** `data/renzo.sqlite`, `data/renzo-m1-fresh.sqlite`, `data/renzo-m3-fresh.sqlite`, `data/renzo-m4-fresh.sqlite` are still tracked
- `/data/uploads/`
- `vault/.obsidian/workspace.json` (repo-root `.obsidian/workspace.json` was committed in `9d8f70d`)

**Secrets in Git:** `git ls-files` shows **no** real `.env` / `.env.dev` / `.env.stage` / `.env.production`. Example files contain placeholders only (`change-me-…`, `setup`). Do not treat those placeholders as production secrets.

---

# 3. Sprint-by-Sprint Implementation Record

The original prompt wanted four isolated Docker-green sprints. Actual history:

```text
2026-09-05 evening: four commits in ~3 minutes, Docker engine blocked, one branch push
2026-09-05 21:12: hash footnote after push
2026-09-06 midday: QA/operator commit 9d8f70d, pushed
2026-09-06 afternoon: uncommitted copy/switcher/STAGE-setup work (this working tree)
```

## Sprint 1–2 — `2d9590d`

- **Objective:** One image, entrypoint migrate/seed, isolated Compose overlays and volumes.
- **Changed:** `Dockerfile`, `docker-compose.yml`, `docker-compose.dev.yml` / `.stage.yml` / `.prod.yml`, `docker/entrypoint.sh`, `docker/runtime-init.ts`, `docker/db-marker.ts`, `.dockerignore`, `.gitattributes`, comment on unused `docker/nginx.conf`.
- **QA before commit:** Host suite later the same session. Docker build **blocked** (WSL2 / virtualization).
- **Push:** With the batch, not before sprint 3.

## Sprint 2–3 — `203d683`

- **Objective:** `APP_ENV` identity, banners, PRODUCTION bootstrap safety, health `appEnv`.
- **Changed:** `shared/utils/app-env.ts`, `server/plugins/app-env.ts`, `AppEnvBanner.vue`, layouts, Settings status, `drizzle/seed.ts`, env examples, `tests/m10/app-env.test.ts`, `tests/m10/bootstrap-safety.test.ts`.
- **QA:** First handoff reports `tests/m10` 9 passed; full suite 289.
- **Committed STAGE rule (later superseded in working tree):** seed defaulted `setup` **only** for `APP_ENV=dev`. STAGE required an explicit password.

## Sprint 4 — `1783545`

- **Objective:** Operator scripts, isolation check, vault/AGENTS docs.
- **Changed:** `scripts/env.mjs`, `scripts/env-isolation-check.mjs`, `package.json` `env:*`, vault notes.
- **QA:** lint / typecheck / build green per first handoff. Docker isolation script **not executed**.

## Handoff — `39b9906` + `5bc0ead`

- First implementation handoff; then recorded the pushed hash.
- **QA:** documentation only.

## QA / ports / combined stack — `9d8f70d`

- **Objective:** Make concurrent local use practical: PRODUCTION on `:5000`, STAGE `:5010`, DEV `:5020`, laptop `pnpm dev` on `:5030` and never on Docker ports; one Compose project for all three; Windows Docker context copy (OneDrive/Desktop); chrome remaps navy for DEV/STAGE.
- **Changed (high signal):** `docker-compose.all.yml` (new), `scripts/env.mjs` (combined up, Windows `docker build` from a staged context), `scripts/listen-port.mjs` / `run-nuxt.mjs`, `app/assets/css/main.css`, `app/app.vue` `data-app-env`, Dockerfile init bundling, seed/docs.
- **Also committed:** `vault/wip/M10A_Docker_Environment_Foundation_Cursor_Prompt_2026-09-05.md` (inbox prompt) and `.obsidian/workspace.json`.
- **QA:** Commit message is “doing QA.” This documentation session did not find a recorded full-suite number attached to `9d8f70d`. Docker **does** run on this host now (see §13).

## Working-tree follow-on (no commit)

- **Objective:** Scott can jump between local URLs and copy SQLite + uploads among environments.
- **Implementation:** `AppEnvSwitcher`; Settings → Environment zip download/restore; `pnpm env:pull`; `pnpm env:prod:load-local`; STAGE `admin`/`setup`; Decisions 2026-09-06.
- **QA this session:** `vitest run tests/m10` → **20 passed** (4 files). Live Docker health + distinct isolation markers. Browser copy/restore **NOT TESTED** here. Host `env:pull` / `env:prod:load-local` **NOT RE-RUN** here.

---

# 4. Docker Architecture

## 4.1 Image

| Item | Actual |
|---|---|
| File | `Dockerfile` (multi-stage: `deps` → `build` → `runner`) |
| Base | `node:22-bookworm-slim` (not Alpine) |
| Tag | `renzo-acquisition:m10a` |
| Build | `pnpm install --frozen-lockfile`, stub missing libsql natives, `pnpm build`, esbuild-bundle `docker/runtime-init.ts` and `docker/db-marker.ts` to CommonJS |
| Runtime | `NODE_ENV=production`, `HOST=0.0.0.0`, container `PORT=5000` |
| Command | `ENTRYPOINT docker/entrypoint.sh` → chown data dirs, `gosu node`, `node docker/runtime-init.cjs`, `exec node .output/server/index.mjs` |
| User | Entrypoint starts as root, drops to `node` via `gosu` |
| Healthcheck | `fetch('http://127.0.0.1:5000/api/health')` every 15s, timeout 5s, start period 40s, 5 retries |
| Secrets | `.dockerignore` excludes `.env*` (except `.env.example`), `data/`, `vault/`, `tests/` |
| Windows build | `scripts/env.mjs` copies a local context to `%TEMP%\renzo-acquisition-docker-context` because Docker Desktop cannot read OneDrive/Desktop cloud files |

All three environments run the **production-built Nitro server**, not `nuxt dev`. Laptop `pnpm dev` is the only development server.

## 4.2 Compose files (no profiles)

| File | Role |
|---|---|
| `docker-compose.yml` | Shared `app` service, image, volumes `sqlite-data` / `asset-data`, network `appnet`, health, `restart: unless-stopped` |
| `docker-compose.dev.yml` | Project `renzo-dev`, `APP_ENV=dev`, host **5020**, named volumes/networks |
| `docker-compose.stage.yml` | Project `renzo-stage`, `APP_ENV=stage`, host **5010** |
| `docker-compose.prod.yml` | Project `renzo-prod`, `APP_ENV=production`, host **5000** |
| `docker-compose.all.yml` | Project `renzo`, services `prod` / `stage` / `dev`, **explicit container names** `renzo-*-app-1`, same volume and network **names** as the overlays so data is not duplicated |

Do **not** run the combined stack and a per-environment overlay at the same time. Same host ports and same container names collide.

`pnpm env:up` stops split stacks then `compose -f docker-compose.all.yml up -d --force-recreate`. Single-env `up` stops the combined stack first.

## 4.3 How one app becomes three environments

```text
Build once → renzo-acquisition:m10a
Each service: same image, same in-container paths
  DATABASE_URL=file:/app/data/sqlite/renzo.sqlite
  ASSET_UPLOAD_DIR=/app/data/uploads
Difference is only:
  APP_ENV / NUXT_PUBLIC_APP_ENV
  host port
  env_file (.env.dev / .env.stage / .env.production)
  named volume mounts
  named bridge network
```

No Docker socket is mounted. The app cannot see sibling volumes. That is why in-app copy is zip download/restore, and volume copy is a **host** script.

`init: true`. Restart `unless-stopped`. No Compose `depends_on` (single service per environment).

---

# 5. DEV / STAGE / PRODUCTION Environment Matrix

| Concern | DEV | STAGE | PRODUCTION |
|---|---|---|---|
| Environment identifier | `APP_ENV=dev` | `APP_ENV=stage` | `APP_ENV=production` |
| Local URL / port | http://localhost:5020 | http://localhost:5010 | http://localhost:5000 |
| Intended future hostname (**planned, not live**) | `https://dev.app.renzogracieutah.com` | `https://stage.app.renzogracieutah.com` | `https://app.renzogracieutah.com` |
| Database location/volume | `/app/data/sqlite/renzo.sqlite` on `renzo-dev-sqlite` | same path on `renzo-stage-sqlite` | same path on `renzo-prod-sqlite` |
| Asset/upload location/volume | `/app/data/uploads` on `renzo-dev-assets` | `renzo-stage-assets` | `renzo-prod-assets` |
| Environment/config file | `.env.dev` (from `.env.dev.example`) | `.env.stage` | `.env.production` |
| Compose project / service | `renzo-dev` / `app`, or `renzo` / `dev` | `renzo-stage` / `app`, or `renzo` / `stage` | `renzo-prod` / `app`, or `renzo` / `prod` |
| Container name (combined or overlay) | `renzo-dev-app-1` | `renzo-stage-app-1` | `renzo-prod-app-1` |
| Bootstrap behavior | Catalog seed + `admin` / `admin@local` / `setup` if password unset | **Same as DEV** in the working tree (Decision 2026-09-06). Committed `9d8f70d` still required an explicit STAGE password | Catalog seed only. **No** admin unless `NUXT_AUTH_PASSWORD` is set |
| Health-check behavior | `GET /api/health` → `appEnv: "dev"` | `appEnv: "stage"` | `appEnv: "production"` |
| Visible environment indicator | Red navy remap + “DEV environment — not production” banner + switcher | Green navy remap + STAGE banner + switcher | Academy navy, no banner, switcher still shown on staff chrome |

**Laptop `pnpm dev` (not a Docker environment)**

| Concern | Value |
|---|---|
| URL | http://localhost:5030 (fallbacks 5031–5035; never 3000/5000/5010/5020) |
| SQLite | `data/renzo.sqlite` on the host |
| Uploads | `data/uploads/` |
| Config | `.env` from `.env.example` |
| Switcher | Host port 5030 maps to **no** Docker env (current highlight off) |

Future hostnames are **planned only**. M10A binds localhost HTTP.

## 5.1 Adding DEV and STAGE as first-class environments

M0 had one Compose app and one SQLite volume behind unused NGINX on 8080. M10A **adds DEV and STAGE** as peers of PRODUCTION, not as “the same container with a different banner.”

Implemented isolation for the new environments:

- Own `APP_ENV` (`dev` / `stage`) so seed, chrome, health, and Settings tell the truth.
- Own host ports (`5020` / `5010`) so all three plus laptop `:5030` can run together.
- Own named volumes (`renzo-dev-*`, `renzo-stage-*`) so wiping or reseeding DEV cannot delete STAGE or PRODUCTION.
- Own bridge networks (`renzo-dev-net`, `renzo-stage-net`).
- Own env files (`.env.dev`, `.env.stage`) with their own `NUXT_SESSION_PASSWORD`.
- Staff `AppEnvSwitcher` (working tree) links PRODUCTION / STAGE / DEV on the current hostname and path so Scott can jump without retyping URLs.
- DEV and STAGE show a sticky non-production banner. Public `/trial` and `/events` do not get a PRODUCTION banner.

Working-tree login convenience: empty DEV **and** STAGE seed `admin` / `setup`. PRODUCTION still does not.

## 5.2 Copying data to and from DEV, STAGE, and PRODUCTION

Containers have **no Docker socket** and cannot mount sibling volumes. Copy is therefore either a **host volume script** or an **in-app zip**.

```text
Laptop pnpm dev  (:5030, data/renzo.sqlite + data/uploads)
        │
        │  HOST  pnpm env:prod:load-local -- --confirm-load-local-into-prod
        │  (overwrites PRODUCTION only)
        ▼
Docker PRODUCTION  (:5000, renzo-prod-sqlite + renzo-prod-assets)
        │
        │  HOST  pnpm env:pull -- --confirm-pull-from-prod
        │  (overwrites STAGE and DEV together)
        ├──────────────────────────► Docker STAGE  (:5010)
        └──────────────────────────► Docker DEV    (:5020)

ANY running process ◄══ zip download / restore ══► ANY other running process
  ADMIN Settings → Environment
  Includes: DEV ↔ STAGE, STAGE ↔ PRODUCTION, DEV ↔ PRODUCTION,
            and laptop :5030 ↔ any Docker URL
```

### What each path copies

Both paths copy **SQLite** (plus WAL/SHM when present) and **marketing upload bytes**. Isolation marker files are **not** copied as-is: pull and restore **restamp** the destination’s marker (`m10a-dev-isolation` / `m10a-stage-isolation` / `m10a-prod-isolation`) in uploads and `app_settings.m10a.isolation`.

Users and passwords come from the **source database**. Session cookies do **not** carry across ports. After a copy, sign in on the destination with the source users.

### Host: PRODUCTION → STAGE and DEV (`pnpm env:pull`)

- Command: `pnpm env:pull -- --confirm-pull-from-prod`
- Requires PRODUCTION volumes to exist.
- Stops all three app containers, copies `renzo-prod-sqlite` → stage/dev sqlite volumes and `renzo-prod-assets` → stage/dev asset volumes (assets may be empty), starts containers, waits for health `appEnv`, restamps STAGE and DEV markers only.
- **Destructive to STAGE and DEV.** PRODUCTION is the source, not overwritten.
- There is **no** host “copy-up” (DEV/STAGE → PRODUCTION) and **no** host “DEV ↔ STAGE only” command.

### Host: laptop → PRODUCTION (`pnpm env:prod:load-local`)

- Command: `pnpm env:prod:load-local -- --confirm-load-local-into-prod`
- Overwrites PRODUCTION from `data/renzo.sqlite` (+ WAL/SHM) and `data/uploads/`.
- **Does not touch STAGE or DEV.** Use `env:pull` afterward if those should match.
- Stop `pnpm dev` first so WAL is flushed.

### In-app: any → any, including DEV ↔ STAGE

This is the **bidirectional** path and the only implemented way to copy **DEV → STAGE**, **STAGE → DEV**, or **into PRODUCTION** from DEV/STAGE without a host volume script.

1. Sign in as ADMIN on the **source** URL (`:5000` / `:5010` / `:5020` / or `:5030`).
2. Settings → Environment (`/settings/environment`) → download zip (`GET /api/admin/environment/backup`). Browser Save As. Filename `renzo-<appEnv>-<denver-date>-<hhmm>.zip`.
3. Use `AppEnvSwitcher` (or type the URL) to open the **destination**.
4. Settings → Environment → choose the zip → type the destination `APP_ENV` (`dev`, `stage`, or `production`) → restore (`POST /api/admin/environment/restore`).
5. Restore replaces that process’s SQLite and uploads, restamps **this** environment’s isolation marker, writes `ENVIRONMENT_RESTORE` audit, then `process.exit(0)`. Docker Compose starts the container again. Local `pnpm dev` stays down until Scott starts it.
6. Sign in with users from the backup.

Wrong confirmation string is rejected. Backup is ADMIN-only. Max size `APP_BACKUP_MAX_BYTES` (default 512 MiB). Zip must contain `manifest.json` + a real SQLite file; path traversal entries are rejected.

### What is not implemented

- No host command that copies only DEV ↔ STAGE without going through PRODUCTION or the zip.
- No host command that copies Docker volumes **into** laptop `data/renzo.sqlite` (reverse of load-local). Use the in-app zip on `:5030` to restore a Docker backup onto the laptop.
- No automated off-host backup, retention, or restore drill (later M10).
- No STAGE or PRODUCTION `reset` / `down -v` helper.

---

# 6. Environment Isolation

Isolation is **structural** (separate volumes, networks, env files, `APP_ENV`) plus **markers** used by the check script and by restore/pull.

| Guarantee | How | Evidence this session |
|---|---|---|
| DEV has its own database | Volume `renzo-dev-sqlite` | Live `renzo.sqlite` in that container; `db-marker get` = `m10a-dev-isolation` |
| STAGE has its own database | `renzo-stage-sqlite` | Marker `m10a-stage-isolation` |
| PRODUCTION has its own database | `renzo-prod-sqlite` | Marker `m10a-prod-isolation` |
| Writes cannot appear in another env | Different volume mounts; no shared SQLite file | Markers differ. Cross-write test script **NOT RE-RUN** |
| Independent Asset storage | `renzo-*-assets` | Live uploads dir contains only that env’s `m10a-*-isolation.txt` |
| Asset files cannot appear in another env | Separate volumes; restore/pull restamp markers | Live listing showed each container only its own marker file |
| Container recreation keeps data | Named volumes; `down` without `-v` | **NOT RE-TESTED** this session |
| Stopping one env does not stop others | Separate services/networks; overlay `down` is per project | Combined stack is one Compose project: `pnpm env:down` stops **all three**. Single `pnpm env:dev:down` uses the overlay project |
| Config does not leak | Per-service `env_file` + hardcoded `APP_ENV` in Compose | Health `appEnv` matches each port |

`pnpm env:isolation:check` starts the **overlay** stacks (not `env:up`), writes markers, asserts no foreign marker, then restarts and recreates DEV without `-v`. Docs: do not run it while `pnpm env:up` is up (container name collision). **NOT RUN** this session.

---

# 7. SQLite Implementation

| Topic | Actual |
|---|---|
| App default (laptop) | `DATABASE_URL` default `file:./data/renzo.sqlite` (`server/database/index.ts`) |
| Docker path | `file:/app/data/sqlite/renzo.sqlite` on the sqlite volume |
| File helper | `sqliteFilePath()` understands `file:` URLs |
| Foreign keys | `PRAGMA foreign_keys = ON` in migrate and seed |
| Empty environment | Entrypoint `runtime-init.cjs` → `migrateDatabase()` then `seedDatabase()` unless `APP_SKIP_SEED=true` |
| Migrations | Image copies `drizzle/migrations`; `DRIZZLE_MIGRATIONS_DIR=/app/drizzle/migrations` |
| Seed | Idempotent catalog (programs, intro rules, pricing, access catalog, compensation keys). Admin only if a password is resolved (see §10) |
| WAL | Backup/load-local copy `-wal`/`-shm` when present; backup checkpoints with `PRAGMA wal_checkpoint(TRUNCATE)` |
| Locking | Not newly characterized in Docker. Copy scripts **stop** app containers before volume copy so the file is not open |
| Later M10 SQLite risk | Single-writer file on a VPS; no automated off-host copy yet; tracked historical `data/renzo.sqlite` in Git is a hygiene problem, not a runtime path for Docker |

PostgreSQL is **not** recommended from this implementation alone. M10 still treats SQLite as valid.

---

# 8. Persistent Assets / Files

| Topic | Actual |
|---|---|
| Upload dir | `ASSET_UPLOAD_DIR` or `join(process.cwd(), 'data', 'uploads')` (`server/services/assets.ts`) |
| Docker | `/app/data/uploads` → `renzo-*-assets` |
| Rebuild | Image rebuild does not mount over named volumes |
| Ownership | Entrypoint as root `chown -R node:node` on sqlite and uploads, then `gosu node` |
| Isolation markers | `m10a-dev-isolation.txt` / `m10a-stage-isolation.txt` / `m10a-prod-isolation.txt` in uploads (operational, not marketing assets) |

**State that must survive application-container replacement**

1. SQLite file (and WAL/SHM if present) on the environment’s sqlite volume (Docker) or `data/renzo.sqlite` (laptop).
2. Marketing asset bytes under the environment’s uploads directory.
3. Isolation marker file + `app_settings.m10a.isolation` (rewritten after pull/restore; still operational state).
4. Per-environment secrets in `.env.dev` / `.env.stage` / `.env.production` / laptop `.env` on the **host** (not in the container layer).

No other durable application files were found (no extra local caches required for CRM). Nuxt `.output` is in the image. In-memory login throttle and public rate limit **do not** survive process restart.

---

# 9. Configuration and Secrets

## 9.1 Keys that matter

| Key | Role | Differs by env? |
|---|---|---|
| `APP_ENV` | `dev` \| `stage` \| `production`. Invalid throws. Missing: `dev` unless `NODE_ENV=production` | Yes (Compose forces it) |
| `NUXT_PUBLIC_APP_ENV` | Public chrome/banner; should match `APP_ENV` | Yes |
| `NODE_ENV` | Docker always `production` | No in Docker |
| `NUXT_SESSION_PASSWORD` | Cookie seal, 32+ chars; required when `NODE_ENV=production` | **Must differ** |
| `SESSION_COOKIE_SECURE` | `true`/`false`. Examples set `false` for local HTTP | Set `true` behind real HTTPS |
| `DATABASE_URL` | Compose overwrites to the volume path | Path same in-container; file differs by volume |
| `ASSET_UPLOAD_DIR` | Compose `/app/data/uploads` | Volume differs |
| `NUXT_AUTH_USERNAME` / `EMAIL` / `PASSWORD` | Seed bootstrap | DEV/STAGE default `admin` / `setup` (working tree); PRODUCTION unset |
| `NUXT_AUTH_RESET_PASSWORD` | Re-hash admin once | Optional |
| `NUXT_PUBLIC_TIMEZONE` | `America/Denver` | Shared |
| `META_ACCESS_TOKEN` / `META_AD_ACCOUNT_ID` / `META_GRAPH_API_VERSION` | Optional Meta V1 | Per env; empty is valid |
| `APP_RESTART_ENABLED` / `APP_RESTART_EXIT_CODE` | Docker `true` / `0` | Docker vs laptop |
| `APP_SKIP_SEED` | Skip seed at container start | Optional |
| `APP_BACKUP_MAX_BYTES` | Restore upload cap | Optional |
| `DRIZZLE_MIGRATIONS_DIR` | Set in image/Compose | Shared |
| `HOST` / `PORT` | Container listen | Shared `0.0.0.0:5000` |
| `NUXT_PORT` / `PORT` | Laptop `5030` | Laptop only |

No application `APP_ORIGIN` / public base URL is required in M10A. `AppEnvSwitcher` uses the **current browser hostname** and swaps only the host port.

**SMTP / email / SMS:** no env keys recognized for sending. Not implemented.

**Meta:** optional; app runs with blanks. `META_APP_ID` / `META_APP_SECRET` are not used.

## 9.2 Files

Committed templates: `.env.example`, `.env.dev.example`, `.env.stage.example`, `.env.production.example`.  
Real env files: gitignored. First `pnpm env:* up` copies the example if the real file is missing.

**Secrets tracked in Git:** none found for live env files. Placeholder strings in examples are not production secrets. Historical tracked SQLite may contain old local hashes — treat as a later hygiene item, not a new M10A leak.

---

# 10. Bootstrap / Initialization Safety

Container start: migrate → seed (unless `APP_SKIP_SEED=true`) → Nitro. Failure exits non-zero (not healthy).

`getBootstrapAdmin()` (working tree):

```text
password = NUXT_AUTH_PASSWORD  if set
        or "setup"             if APP_ENV is not production
        or undefined           if APP_ENV=production
```

| Environment | Unset password | Result |
|---|---|---|
| DEV | defaults `setup` | Creates `admin` / `admin@local` |
| STAGE (working tree) | defaults `setup` | Same (Decision 2026-09-06) |
| STAGE (committed `9d8f70d`) | no default | No admin unless `.env.stage` set a password |
| PRODUCTION | no default | Catalog seeds; **no admin row** |

Seed never inserts an admin with a null password hash. `NUXT_AUTH_RESET_PASSWORD=true` re-hashes an existing admin.

**PRODUCTION first-admin** is unresolved as a product/ops procedure: set `NUXT_AUTH_PASSWORD` once, or `env:prod:load-local` / restore a zip that already has users. There is no “break-glass create ADMIN” UI. Flag for a later M10 security/ops slice — do not invent it here.

**Destructive reset:** only `pnpm env:dev:reset -- --confirm-dev-reset` (`compose down -v` on DEV). No STAGE/PRODUCTION reset command. Seed on an existing DB is additive/idempotent; it does not wipe CRM rows.

---

# 11. Health Checks and Environment Identity

**HTTP:** public `GET /api/health`

```json
{ "ok": true, "app": "Renzo Gracie Kaysville Acquisition", "timezone": "America/Denver", "database": "reachable", "appEnv": "dev|stage|production" }
```

Validates process + `select 1`. No secrets.

**Docker:** HEALTHCHECK and Compose healthcheck hit that URL. Live this session: all three `healthy` and `appEnv` matched the port (see §1).

**ADMIN status:** `GET /api/admin/system/status` adds `nodeEnv`, uptime, `restartEnabled` — still no secrets.

**Identity in UI / logs**

- Startup log: `[renzo] APP_ENV=…` (`server/plugins/app-env.ts`). Warns if `NUXT_PUBLIC_APP_ENV` disagrees.
- `html[data-app-env]` remaps navy (DEV red, STAGE green).
- `AppEnvBanner` on DEV/STAGE: “DEV/STAGE environment — not production.”
- `AppEnvSwitcher` on staff rail, mobile header, and login (working tree). Current env is **host port**, not `APP_ENV` (so `:5030` is none of the three).
- Public `/trial` and `/events` have no PRODUCTION banner.

**Confusion risk:** cookies are per-origin-port, but the switcher keeps path. A user can land on `/leads/:id` on another env where that id does not exist. Chrome color + banner + switcher highlight are the mitigation. PRODUCTION has no banner by design.

---

# 12. Operator Commands

Create env files once (or let `up` copy examples):

```bash
copy .env.dev.example .env.dev
copy .env.stage.example .env.stage
copy .env.production.example .env.production
```

## All three (combined stack)

| Action | Command |
|---|---|
| Build + start | `pnpm env:up` |
| Build image only | `pnpm env:build` |
| Stop (volumes kept) | `pnpm env:down` |
| Restart processes | `pnpm env:restart` |
| Status | `pnpm env:ps` |
| Logs | `pnpm env:logs` |
| Health | `curl http://localhost:5000/api/health` (and `:5010`, `:5020`) |

## One environment (`dev` shown; replace with `stage` or `prod`)

```bash
pnpm env:dev:up
pnpm env:dev:down          # not destructive
pnpm env:dev:restart
pnpm env:dev:build
pnpm env:dev:logs
pnpm env:dev:ps
```

Recreate containers **without** deleting data: `up` uses `--force-recreate` and does not pass `-v`.

Inspect SQLite inside a running container (read-only habit: copy out rather than write):

```bash
docker exec -it renzo-dev-app-1 ls -l /app/data/sqlite
docker exec renzo-dev-app-1 node docker/db-marker.cjs get
```

There is no documented `sqlite3` shell helper.

## Destructive — DEV only

```bash
pnpm env:dev:reset -- --confirm-dev-reset
```

Deletes `renzo-dev-sqlite` and `renzo-dev-assets`. **No STAGE or PRODUCTION reset command is provided. Do not document or run `docker compose down -v` on those projects.**

## Copy (see §5.2)

| Command | Direction | Destructive to |
|---|---|---|
| `pnpm env:prod:load-local -- --confirm-load-local-into-prod` | Laptop → PRODUCTION | PRODUCTION |
| `pnpm env:pull -- --confirm-pull-from-prod` | PRODUCTION → STAGE **and** DEV | STAGE and DEV |
| Settings → Environment download + restore | Any → any (including DEV ↔ STAGE) | Destination process only |

Isolation proof (stops/recreates overlay stacks; **not** concurrent with `env:up`):

```bash
pnpm env:isolation:check
```

---

# 13. QA and Acceptance Evidence

## 13.1 This documentation session (2026-09-06)

| Check | Result |
|---|---|
| `vitest run tests/m10` | **20 passed**, 4 files |
| `pnpm test` (full) | **NOT RUN** this session |
| `pnpm lint` | **NOT RUN** this session |
| `pnpm typecheck` | **NOT RUN** this session |
| `pnpm build` | **NOT RUN** this session |
| Docker image present | **Yes** `renzo-acquisition:m10a` (Scott’s `pnpm env:up` built it; cached layers) |
| DEV / STAGE / PRODUCTION startup | **Yes** — `pnpm env:up` started all three (terminal 1) |
| Simultaneous operation | **Yes** — `docker ps` all Up ~12 minutes |
| Health | **Yes** — Docker `healthy`; HTTP `appEnv` correct on 5000/5010/5020 |
| Isolation markers live | **Yes** — distinct file + `app_settings` values |
| Login / Asset upload browser smoke | **NOT TESTED** this session |
| `pnpm env:isolation:check` | **NOT RUN** this session |
| Persistence after recreate | **NOT TESTED** this session |
| `env:pull` / `load-local` / in-app restore | **NOT RE-RUN** this session (code + unit tests only) |

Scott’s terminal recorded a successful Windows image build and `env:up` after the 2026-09-05 “Docker engine HTTP 500” report. That earlier blocker is **no longer the live state** on this machine.

## 13.2 2026-09-05 handoff (committed era)

| Check | Result |
|---|---|
| `pnpm test` | **289 passed**, 59 files |
| `pnpm lint` / `typecheck` / `build` | passed |
| Docker build / isolation / persistence | **NOT EXECUTED** (WSL2 / virtualization) |

## 13.3 Failures encountered during M10A (from prior handoff + code)

```text
Docker Desktop Linux engine HTTP 500 / WSL2 virtualization unavailable
→ cause: host hypervisor, not application code
→ correction: none in repo; later this host can run Linux containers
→ retest: 2026-09-06 pnpm env:up succeeded; three healthy containers

Windows Docker build cannot read OneDrive/Desktop files
→ cause: Docker Desktop file sharing
→ correction: scripts/env.mjs stages a local temp context on win32
→ retest: env:up build FINISHED this host

Windows PowerShell stealing `>` from docker exec sh -c
→ cause: host shell:true
→ correction: spawn docker with shell:false
→ retest: isolation-check script updated; full isolation:check NOT RUN this session

libsql native tracing fails cross-OS image build
→ cause: pnpm only installs the host OS binding
→ correction: docker/stub-missing-libsql-natives.mjs
→ retest: image build cached/success on this host

Empty PRODUCTION / STAGE after first env:up (no laptop CRM data)
→ cause: new named volumes
→ correction (working tree): env:prod:load-local, env:pull, in-app zip
→ retest: unit/HTTP backup tests 20 passed; live copy NOT RE-RUN here
```

---

# 14. Current File / Directory Map

```text
repository/
├── Dockerfile                         # multi-stage production image
├── .dockerignore                      # no secrets, data/, vault/, tests/
├── docker-compose.yml                 # shared app runtime
├── docker-compose.dev.yml             # DEV overlay :5020
├── docker-compose.stage.yml           # STAGE overlay :5010
├── docker-compose.prod.yml            # PRODUCTION overlay :5000
├── docker-compose.all.yml             # all three, same volume names
├── docker/
│   ├── entrypoint.sh                  # chown, gosu, init, nitro
│   ├── runtime-init.ts                # migrate + seed
│   ├── db-marker.ts                   # app_settings m10a.isolation
│   ├── stub-missing-libsql-natives.mjs
│   └── nginx.conf                     # unused leftover
├── .env.example                       # laptop pnpm dev
├── .env.dev.example
├── .env.stage.example
├── .env.production.example
├── scripts/
│   ├── env.mjs                        # all operator + pull + load-local
│   ├── env-isolation-check.mjs
│   ├── run-nuxt.mjs / listen-port.mjs # laptop :5030, forbid Docker ports
│   └── …
├── shared/utils/app-env.ts            # parse, ports, markers, switcher URLs
├── app/components/AppEnvBanner.vue
├── app/components/AppEnvSwitcher.vue  # uncommitted
├── app/pages/settings/environment.vue # uncommitted
├── app/assets/css/main.css            # data-app-env navy remap
├── server/api/health.get.ts
├── server/api/admin/environment/      # uncommitted backup/restore
├── server/services/environment-backup.ts  # uncommitted
├── drizzle/seed.ts                    # bootstrap admin rules
├── data/renzo.sqlite                  # laptop; historical file still tracked
├── data/uploads/                      # laptop assets; gitignored
└── vault/wip/
    ├── M10A_Docker_Environment_Foundation_Implementation_Handoff_2026-09-05.md
    ├── M10A_Docker_Environment_Foundation_Cursor_Prompt_2026-09-05.md
    ├── M10A_Implementation_Response_Request_2026-09-06.md
    └── M10A_Implementation_and_M10_Continuation_Handoff_2026-09-06.md  # this file
```

---

# 15. Deviations From the Original M10A Prompt

| Requested | Implemented | Why | Class |
|---|---|---|---|
| Four Docker-green sprints, push after each | Four commits in one session, one push; Docker QA later | Engine down on 2026-09-05 | Technical limitation, then recovered |
| STAGE bootstrap “deliberate,” not DEV `setup` | Committed: STAGE required explicit password. Working tree: STAGE = DEV `admin`/`setup` | Empty STAGE had no login (Decision 2026-09-06) | Deliberate product/ops change |
| Ports left to implementer | 5000 / 5010 / 5020 / laptop 5030 | Scott wanted PRODUCTION on 5000; `pnpm dev` must not steal it | Improvement |
| Combined concurrent run | `docker-compose.all.yml` + `pnpm env:up` | Overlay-only was awkward for daily use | Improvement |
| Persistence ready for later backups; not a full backup system | In-app zip + host pull/load-local | Scott needed to copy data now; still not off-host/automated | Extra M10A operator work; off-host still deferred |
| Do not hardcode ports in application source | `APP_ENV_HOST_PORTS` lives in `shared/utils/app-env.ts` and switcher uses it | Needed for staff links | Neutral / small coupling |
| Cookie secure applied at runtime from `APP_ENV` | Helper exists; `nuxt.config.ts` only honors `SESSION_COOKIE_SECURE === 'true'` | Examples set `false` for local HTTP | Gap vs first handoff wording |
| Prompt inbox not an implementation artifact | `9d8f70d` committed the M10A prompt | QA commit included it | Hygiene |
| No local Obsidian state | `9d8f70d` committed `.obsidian/workspace.json` | Accidental | Hygiene |
| Isolation check as acceptance | Script exists; live markers present; script **not** re-run this session | Avoid bouncing Scott’s stack | Incomplete evidence, not a code gap |

Do not “fix” these in this handoff unless Scott asks. STAGE `setup` and zip copy are accepted Decisions.

---

# 16. Known Issues / Technical Debt

| Issue | Class |
|---|---|
| Operator copy / switcher / STAGE `setup` **uncommitted** | Should address before calling the Git branch the accepted baseline (commit when Scott asks) |
| Vault still says M10A “awaiting acceptance” after Scott approved | Should address in later M10 / same commit |
| PRODUCTION first ADMIN if volumes are empty | Later M10 (bootstrap/recovery) |
| `sessionCookieSecure()` not used by `nuxt.config.ts` | Later M10 (real HTTPS) |
| Settings Shutdown vs `unless-stopped` | Known limitation; later M10 runbook / optional Compose policy |
| In-memory throttle / rate limit per process | Safe to defer beyond M10 |
| Tracked historical SQLite files in Git | Later hygiene; do not commit new DBs |
| Root `.obsidian/workspace.json` tracked | Hygiene |
| `docker/nginx.conf` unused | Safe to defer (delete in a cleanup slice) |
| `pnpm env:down` stops all three when using the combined project | Documented; not a defect |
| Switcher keeps path across envs (404 if id missing) | Safe to defer |
| Full suite + browser smoke + isolation script not re-run after working-tree copy work | Should address during later M10 / M10A closeout QA |
| Local `master` 47 commits behind `origin/master` | Repo hygiene; M10 is not merged |

**No blocker** that prevents *planning* the next M10 slice. **Do not** treat the dirty working tree as already shipped.

---

# 17. Explicitly Deferred M10 Work

| Item | Status |
|---|---|
| VPS / provider provisioning | Not started |
| Production Linux host | Not started |
| DNS | Not started |
| `dev.app.renzogracieutah.com` | Planned name only |
| `stage.app.renzogracieutah.com` | Planned name only |
| `app.renzogracieutah.com` | Planned name only |
| Caddy | Not started (`docker/nginx.conf` unused) |
| Let’s Encrypt / HTTPS | Not started |
| Firewall / SSH hardening / host patching | Not started |
| Production secret installation/rotation | Examples only; real files local |
| In-app / host **local** copy | **Implemented** (working tree; not off-host) |
| Automated backups / retention / off-host storage | Not started |
| Restore testing (drills) | Unit tests only; no scheduled drill |
| Deployment/release procedure, tags, rollback | Not started |
| Monitoring / alerts / log aggregation / disk-usage | Not started |
| Production ADMIN bootstrap/recovery | **Unresolved** (see §10) |
| GitHub Actions deploy | Not started |
| PostgreSQL migration | Not started; **do not start unless Scott asks** |
| Raspberry Pi (labeled M11 in `Milestones.md`) | Not started; not the same as VPS |

---

# 18. Recommendations for the Rest of M10

Do not boil the ocean. Scott operates a single-tenant gym app himself. Keep SQLite until a real operational limit appears.

### M10A closeout (not a new milestone)

- **Objective:** Commit the working-tree copy/switcher/STAGE-setup work; flip vault “awaiting acceptance”; optionally archive M9 wip. Re-run `pnpm test`, lint, typecheck, build. Browser: login + Environment download/restore DEV ↔ STAGE.
- **Why first:** Planning M10B against `9d8f70d` would ignore the copy system Scott is already using.
- **Dependencies:** Scott says commit.
- **Decisions:** none beyond “this is the accepted tree.”
- **Gate:** clean (or documented) git status; tests green; one successful DEV→STAGE zip restore.

### Recommended M10B — Off-host backup and restore drill (still local/SQLite)

- **Objective:** Scheduled copy of PRODUCTION sqlite+uploads off the laptop/VPS disk; retention; a written restore drill that Scott has actually run.
- **Why next:** In-app zip is manual and lives where the browser saves it. Losing the host still loses PRODUCTION if nobody copied the zip off-box.
- **Dependencies:** M10A closeout committed. Backup destination decision (external drive vs cloud vs NAS).
- **Decisions:** where files go, how long to keep, whether STAGE/DEV are backed up or only PRODUCTION.
- **Gate:** Scott restores a dated zip onto STAGE without using PRODUCTION as the live source of truth.

### Recommended M10C — Public edge (only after hosting + domain answers)

- **Objective:** One Linux host, Caddy, TLS, DNS for the planned names, `SESSION_COOKIE_SECURE=true` on public PRODUCTION, firewall/SSH.
- **Why not before backups:** A public URL without an off-host copy is a worse failure mode.
- **Dependencies:** Who owns the VPS/domain; STAGE internet exposure policy; PRODUCTION admin bootstrap.
- **Decisions:** VPS vs Raspberry Pi (M11 label vs M10 “VPS” text); gym vs Scott account ownership; whether DEV is public or laptop-only.
- **Gate:** HTTPS health on the PRODUCTION name; HTTP cookies not accepted on that name; DEV/STAGE still isolated.

### Later M10 (do not start as M10B)

- Release tags / GitHub Actions / rollback automation — after there is a host to deploy to.
- Monitoring/alerts — after there is a public URL people depend on.
- PRODUCTION admin recovery UX — if load-local/restore is not enough.
- PostgreSQL — only if SQLite locking/size proves insufficient.

---

# 19. M10 Continuation Question Register

Answers cannot be read from the repo. Recommendations are **not** decisions.

1. **Where does production live, and who owns the account?** VPS vs Raspberry Pi (M11) vs keep-laptop. Gym vs Scott billing.  
   *Recommendation:* Decide this before writing a Caddy/VPS prompt. Do not buy hardware as part of a coding sprint.

2. **Which hostnames go live, and is STAGE on the public internet?** Planned names are `dev.app` / `stage.app` / `app.renzogracieutah.com`.  
   *Recommendation:* PRODUCTION public; STAGE behind auth or VPN if exposed; DEV laptop-only unless Scott wants a shared DEV URL.

3. **Backup destination and retention?** Zip-to-Downloads is not off-host.  
   *Recommendation:* PRODUCTION daily zip or volume snapshot to a drive Scott does not develop on; keep 7–14 days; restore onto STAGE as the drill.

4. **Release/rollback expectation?**  
   *Recommendation:* Image tag + named volumes + zip restore is enough. Skip blue/green and GitHub Actions until a host exists.

5. **Monitoring/alerting?**  
   *Recommendation:* Caddy + `/api/health` + email/SMS later. No metrics stack in M10.

6. **PRODUCTION first ADMIN when the volume is empty?**  
   *Recommendation:* Keep “no invented `setup`.” Document: load-local from laptop or restore a zip, or set `NUXT_AUTH_PASSWORD` once and then change it in-app.

7. **Should a host command copy DEV ↔ STAGE without going through PRODUCTION?**  
   *Recommendation:* No. Zip already does DEV ↔ STAGE. Extra host copy-up increases the chance of clobbering PRODUCTION.

8. **Commit the working tree as M10A closeout before M10B?**  
   *Recommendation:* Yes.

---

# 20. Final M10A State

```text
M10A STATUS: Implemented and Scott-approved. Git branch is not a complete picture
             (operator copy/switcher/STAGE-setup uncommitted). Not merged to master.
Branch: M10
HEAD: 9d8f70d72729957b0310547b5a3965ad0fd7413d
Pushed: yes (through HEAD). Working tree dirty / not pushed.
Merged: no (origin/master = f885b4a M9 merge)
DEV: implemented; live http://localhost:5020 healthy appEnv=dev
STAGE: implemented; live http://localhost:5010 healthy appEnv=stage
PRODUCTION: implemented; live http://localhost:5000 healthy appEnv=production
Independent databases: yes (separate volumes + live distinct DB markers)
Independent Asset storage: yes (separate volumes + live distinct upload markers)
Persistence verified: NOT TESTED this session (recreate). Named volumes implemented.
Health verified: yes (Docker healthy + HTTP appEnv/database this session)
Regression suite: tests/m10 20 passed this session; full pnpm test NOT RUN here
                   (last recorded full suite 289 on 2026-09-05)
Known blockers: none for planning M10B. Commit working tree before treating Git as baseline.
Recommended next M10 sub-milestone: M10A closeout commit + QA, then M10B off-host
                                    backup/restore drill. Not VPS/Caddy until hosting
                                    and domain are decided. Not PostgreSQL unless asked.

Copy (working tree):
  Laptop → PRODUCTION     pnpm env:prod:load-local -- --confirm-load-local-into-prod
  PRODUCTION → STAGE+DEV  pnpm env:pull -- --confirm-pull-from-prod
  Any ↔ any (DEV ↔ STAGE) ADMIN Settings → Environment  (zip download / restore)
```
