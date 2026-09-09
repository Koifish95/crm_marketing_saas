---
type: note
status: current
area: operations
updated: 2026-09-05
tags:
  - handoff
  - m10a
---

# M10A Docker & Environment Foundation — Implementation Handoff

**Date:** 2026-09-05  
**Branch:** `M10`  
**Starting HEAD:** `f885b4a` (`Merge pull request #9 from Koifish95/M9`)  
**Ending HEAD:** `39b9906` (this handoff; branch pushed to `origin/M10`)  
**Database:** SQLite (no PostgreSQL in this sub-milestone)  
**Timezone:** America/Denver

M9 remains the accepted functional baseline. M10A does not change LeadHeader / LeadLine / Trial / Follow-up / Marketing product rules.

---

## Repository / Git

| Item | Value |
|---|---|
| Starting branch | `M10` |
| Starting HEAD | `f885b4a1f169a124634767e2759b74f028428172` |
| Remote | `origin` `https://github.com/Koifish95/renzo-crm.git` |
| Upstream at start | none |

### Commits (chronological)

1. `2d9590d` — Add M10A Docker image, entrypoint migrations, and isolated Compose environments.
2. `203d683` — Add APP_ENV identity, non-production banners, and production bootstrap safety.
3. `1783545` — Add M10A operator commands, isolation check, and environment documentation.
4. `39b9906` — Add M10A Docker environment foundation implementation handoff.

Intentionally uncommitted:

- `.obsidian/workspace.json` — local Obsidian UI state
- `vault/wip/M10A_Docker_Environment_Foundation_Cursor_Prompt_2026-09-05.md` — prompt inbox, not an implementation artifact

Do not commit `.env.dev` / `.env.stage` / `.env.production`, SQLite files, or `data/uploads/`.

---

## Implementation

### Files added

- `docker/entrypoint.sh` — chown persistent dirs, `gosu node`, migrate/seed, then Nitro
- `docker/runtime-init.ts` — bundled at image build; runs Drizzle migrate then seed
- `docker/db-marker.ts` — bundled helper for isolation checks (`set`/`get` `app_settings.m10a.isolation`)
- `docker-compose.dev.yml` / `docker-compose.stage.yml` / `docker-compose.prod.yml`
- `.gitattributes` — `docker/*.sh` LF
- `.env.dev.example` / `.env.stage.example` / `.env.production.example`
- `shared/utils/app-env.ts`
- `server/plugins/app-env.ts`
- `app/components/AppEnvBanner.vue`
- `scripts/env.mjs` / `scripts/env-isolation-check.mjs`
- `tests/m10/app-env.test.ts` / `tests/m10/bootstrap-safety.test.ts`

### Files changed (high signal)

- `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `docker/nginx.conf`
- `drizzle/seed.ts`, `nuxt.config.ts`, `server/utils/env.ts`
- `server/api/health.get.ts`, `server/api/admin/system/status.get.ts`
- staff/public/auth layouts, Settings process-control copy
- `package.json`, `.gitignore`, `.env.example`, `AGENTS.md`
- vault: Architecture, Authentication, Database, Decisions, Design-System, Home, How-to-Run, Implementation-State, Milestones

### Dockerfile

Multi-stage: `deps` (`pnpm install --frozen-lockfile`) → `build` (`pnpm build` + esbuild bundle of runtime-init and db-marker) → `runner` (Debian slim, `gosu`, `.output`, migrations, bundled init, `@libsql` natives).

- Secrets and `data/` are dockerignored; not baked into layers.
- Image tag: `renzo-acquisition:m10a`
- Container port `5000`
- HEALTHCHECK hits `GET /api/health`
- Process runs as `node` after root entrypoint chowns `/app/data/sqlite` and `/app/data/uploads`

### Compose architecture

Shared `docker-compose.yml` plus environment overlays. Operator scripts always pass both files and `--env-file`.

| | DEV | STAGE | PRODUCTION |
|---|---|---|---|
| Compose project | `renzo-dev` | `renzo-stage` | `renzo-prod` |
| Overlay | `docker-compose.dev.yml` | `docker-compose.stage.yml` | `docker-compose.prod.yml` |
| Env file | `.env.dev` | `.env.stage` | `.env.production` |
| APP_ENV | `dev` | `stage` | `production` |
| Host URL | http://localhost:5020 | http://localhost:5010 | http://localhost:5000 |
| SQLite volume | `renzo-dev-sqlite` | `renzo-stage-sqlite` | `renzo-prod-sqlite` |
| Asset volume | `renzo-dev-assets` | `renzo-stage-assets` | `renzo-prod-assets` |
| Network | `renzo-dev-net` | `renzo-stage-net` | `renzo-prod-net` |
| Banner | yes | yes | no |

In-container paths (all environments):

- `DATABASE_URL=file:/app/data/sqlite/renzo.sqlite`
- `ASSET_UPLOAD_DIR=/app/data/uploads`

`NODE_ENV=production` for all Docker environments (optimized image). Identity is `APP_ENV`, not `NODE_ENV`.

M0 NGINX on host 8080 is **not** the operator path. `docker/nginx.conf` is unused. Caddy/TLS/DNS are later M10.

Restart policy: `unless-stopped`. `docker compose down` does **not** remove volumes. `docker compose down -v` is destructive. The only scripted volume wipe is:

```bash
pnpm env:dev:reset -- --confirm-dev-reset
```

There is no STAGE/PRODUCTION reset command.

### Environment configuration

- Committed templates: `.env.example` (local `pnpm dev`) and `.env.*.example` (Docker).
- Real env files are gitignored.
- `APP_ENV` must be `dev` | `stage` | `production`. Invalid values throw at startup.
- Missing `APP_ENV` defaults to `dev` unless `NODE_ENV=production` (preserves previous production bootstrap behavior for `pnpm preview`).
- `SESSION_COOKIE_SECURE` defaults to true only for `APP_ENV=production`. Local HTTP PRODUCTION-definition example sets `false`. Real HTTPS production must set `true`.
- Session cookie secure flag is applied at runtime in `server/plugins/app-env.ts` so one image can serve local HTTP DEV/STAGE.
- Meta tokens stay optional and per-environment.

### Migration / initialization

Container start: `docker/runtime-init.cjs` → `migrateDatabase()` then `seedDatabase()` unless `APP_SKIP_SEED=true`. Failures exit non-zero. Migrations are additive; they do not delete the SQLite file. Init is bundled as CommonJS because libsql’s native loader uses `require()`.

### Bootstrap / admin

| APP_ENV | Unset `NUXT_AUTH_PASSWORD` |
|---|---|
| `dev` | defaults to `setup` |
| `stage` | no default; Compose requires the var; example uses a STAGE placeholder |
| `production` | no default; catalog still seeds; **no admin row** is created |

Seed never inserts an admin with a null password hash.

### Health

`GET /api/health` (public): `{ ok, app, timezone, database: "reachable", appEnv }`. Runs `select 1`. No secrets. Docker HEALTHCHECK uses this endpoint. `start_period` is 40s to cover migrate/seed.

### Settings restart / shutdown

Docker sets `APP_RESTART_ENABLED=true`. Restart exits the Node process; Compose `unless-stopped` starts it again. No Docker socket is mounted. Shutdown also exits Node; Compose may bring the container back. To stop an environment, use `pnpm env:<env>:down`. Settings copy states this.

### Operator commands

```bash
pnpm env:up
pnpm env:down
pnpm env:restart
pnpm env:logs
pnpm env:ps
pnpm env:build

pnpm env:dev:up
pnpm env:dev:down
pnpm env:dev:restart
pnpm env:dev:logs
pnpm env:dev:ps
pnpm env:dev:build
pnpm env:dev:reset -- --confirm-dev-reset

pnpm env:stage:up
pnpm env:prod:up
# same down/restart/logs/ps/build verbs

pnpm env:isolation:check
```

First `up` copies the matching `.env.*.example` if the env file is missing.

---

## QA evidence

### Host quality gates (this session)

| Check | Result |
|---|---|
| `pnpm test` | **289 passed**, 59 files |
| `pnpm lint` | passed |
| `pnpm typecheck` | passed |
| `pnpm build` | passed |

M10A unit tests cover `APP_ENV` parsing/rejection, cookie-secure defaults, DEV-only `setup` password, PRODUCTION seed without admin, and STAGE admin only with an explicit password.

### Docker engine (this session)

**Not executed.** Docker Desktop is installed, but the Linux engine returned HTTP 500 (`dockerDesktopLinuxEngine`). `wsl --status` reported WSL2 cannot start because virtualization / Virtual Machine Platform is not enabled on this machine. Therefore these M10A acceptance items are **unproven here**:

- image build
- DEV/STAGE/PRODUCTION startup
- concurrent isolation
- persistence through restart/recreate/rebuild
- container health state
- login / asset upload smoke inside containers

Scott should run, on a host where Docker Linux containers work:

```bash
pnpm env:up
pnpm env:isolation:check
```

Then browser smoke: login, dashboard, a household workspace, Marketing (ADMIN), health, and an Asset upload on DEV and STAGE.

### Sprint checkpoints

| Sprint | Scope | QA | Commit | Push |
|---|---|---|---|---|
| 1–2 Docker image + Compose isolation files | Image, entrypoint, overlays, volumes, ports | Host tests later in the session; Docker build blocked | `2d9590d` | with branch push |
| 2–3 Identity / banner / bootstrap / health | APP_ENV, banner, seed safety, health `appEnv` | `tests/m10` 9 passed; full suite 289 | `203d683` | with branch push |
| 4 Operator scripts + docs | `pnpm env:*`, isolation script, vault | lint/typecheck/build green | `1783545` | with branch push |
| Handoff | this file | written from actual commits | this commit | with branch push |

Implementation was completed in one session rather than four isolated Docker-green sprints because the Docker engine could not start. Git still has reviewable checkpoints.

---

## What Scott can do now

- Local `pnpm dev` is http://localhost:5030.
- Docker concurrent URLs: PRODUCTION http://localhost:5000, STAGE http://localhost:5010, DEV http://localhost:5020.
- DEV login remains `admin` / `setup` when using the DEV example.
- STAGE uses the password in `.env.stage` (change the placeholder).
- PRODUCTION-definition does not create `setup`. Set `NUXT_AUTH_PASSWORD` only if you intentionally want seed to create an admin.

### Destructive operations to avoid

- `docker compose down -v` on STAGE or PRODUCTION
- Any generic “reset all volumes” helper (none is provided)
- Copying `.env.dev` secrets into PRODUCTION
- Committing `.env.dev` / `.env.stage` / `.env.production`

---

## Known limitations

- Docker QA on the implementation machine did not run (hypervisor/WSL2).
- Settings Shutdown cannot stop a Compose-supervised container (no Docker socket, by design).
- Local PRODUCTION-definition uses HTTP and `SESSION_COOKIE_SECURE=false`. Real public HTTPS must set `SESSION_COOKIE_SECURE=true`.
- In-memory login throttle and public rate limit remain per process.
- Historical `data/renzo.sqlite` (and m1/m3/m4 fresh files) are still tracked from earlier milestones; new sqlite files are gitignored.
- `docker/nginx.conf` is leftover and unused.

## Deferred M10 / later work

- VPS purchase/provisioning, SSH, firewall, OS patching
- DNS, `app.renzogracieutah.com`, Caddy, Let’s Encrypt
- PostgreSQL migration
- Automated backups/restore drills
- GitHub Actions deploy, release tags, rollback automation
- External uptime/alerting/log aggregation
- Product work (SMS/email, Meta publish, M11)

---

## Human QA still required from Scott

1. Enable Windows virtualization / Virtual Machine Platform if Docker Desktop cannot start Linux containers.
2. `pnpm env:dev:up` → login, dashboard, household, Marketing, Asset upload, health.
3. Repeat STAGE (different admin password) and PRODUCTION-definition (no `setup` unless explicitly configured).
4. Confirm DEV chrome is red, STAGE green, PRODUCTION academy navy; DEV/STAGE banners still show.
5. `pnpm env:isolation:check`.
6. Restart/recreate a DEV container and confirm data/assets remain.
7. Confirm `pnpm env:dev:down` does not remove STAGE/PRODUCTION volumes.
