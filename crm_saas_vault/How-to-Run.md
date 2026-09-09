---
type: note
status: current
area: operations
updated: 2026-09-07
tags:
  - runbook
---

# How to run

Requires Node 22+ and pnpm. Workspace map: [[Workspace]]. Develop / copy / deploy: [[Deploy-Workflow]]. Pi hardware and every update step: [[Koi-Pi-Infrastructure]].

```bash
pnpm install
copy .env.example .env
pnpm db:setup
pnpm dev
```

On macOS/Linux: `cp .env.example .env`.

- App: http://localhost:5030
- Health: http://localhost:5030/api/health

Local `pnpm dev` listens on **5030**. `pnpm dev` and `pnpm preview` run `scripts/run-nuxt.mjs`, which stops whatever is already bound to 5030 and then starts there. Ports **3000, 5000, 5010, and 5020 are never used** by `pnpm dev` (3000 is other apps; 5000/5010/5020 are Docker PRODUCTION / STAGE / DEV). If 5030 still cannot bind, the wrapper tries **5031–5035** in order and then exits. `.env` should include `NUXT_PORT=5030` and `PORT=5030`.

If startup cannot bind 5030–5035, fix the occupant on 5030 and run `pnpm dev` again. Do not treat 3000 or Docker ports as the `pnpm dev` URL.

`pnpm db:setup` runs migrations then seed (programs, intro availability, development admin password hash). Safe to re-run; seed is idempotent. After changing `NUXT_AUTH_PASSWORD` for an existing admin, set `NUXT_AUTH_RESET_PASSWORD=true` once.

Staff UI: http://localhost:5030/login (`admin` or `admin@local` / `setup` in development) then `/dashboard`, `/leads`, `/leads/:id` (household workspace), `/tasks`, `/reports`, `/marketing` (ADMIN, or STAFF with Access Right `VIEW_MARKETING`), `/marketing/campaigns/:id`, `/marketing/content/:id`, `/marketing/tasks`, `/marketing/tasks/:id`, `/marketing/events/:id`, and `/account`. Public intro: http://localhost:5030/trial. Public events: http://localhost:5030/events/:slug. ADMIN Settings: `/settings` (intro schedule, catalog, Access Rights, Meta, Environment backup/restore, Trial outcome setting, process controls). Campaign planning is `/marketing/campaigns` (`/settings/campaigns` redirects). ADMIN users: `/users`. ADMIN security activity: `/security`. Forced first login lands on `/account/password`. After pulling schema changes, run `pnpm db:migrate` (or `pnpm db:setup`) before signing in. The login form does not require an `@`. Record URLs and tabs: [[Design-System#Primary Record Workspace]].

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

Other database commands: `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:generate`, `pnpm db:studio`. Prefer generate + review over `db:push`. See [[Database]].

## Environment

From `.env.example`:

- `APP_ENV` — `dev` | `stage` | `production`. Invalid values fail startup. Missing value defaults to `dev` unless `NODE_ENV=production`.
- `NUXT_SESSION_PASSWORD` — 32+ characters; seals the session cookie
- `SESSION_COOKIE_SECURE` — optional `true`/`false`. Defaults to true only when `APP_ENV=production`.
- `DATABASE_URL` — default `file:./data/renzo.sqlite`
- `NUXT_PORT` / `PORT` — `5030` (local `pnpm dev` listen port)
- `NUXT_AUTH_USERNAME` — bootstrap admin username; default `admin`. Also a valid sign-in identifier.
- `NUXT_AUTH_EMAIL` — bootstrap admin email; default `admin@local`. Also a valid sign-in identifier.
- `NUXT_AUTH_PASSWORD` — seed/bootstrap admin password (hashed at rest). Default `setup` in DEV, STAGE, and PRODUCTION when unset.
- `NUXT_AUTH_RESET_PASSWORD` — optional `true` to re-hash the admin password
- `NUXT_PUBLIC_TIMEZONE` — `America/Denver`
- `META_ACCESS_TOKEN` — required for live Meta pull (leave empty to skip)
- `META_AD_ACCOUNT_ID` — gym ad account (`act_…` or the numeric id)
- `META_GRAPH_API_VERSION` — default `v25.0`
- `ASSET_UPLOAD_DIR` — optional override for marketing asset bytes (default `data/uploads/`)

- `APP_RESTART_ENABLED` — optional `true` only when a supervisor will start the process after ADMIN Restart
- `APP_RESTART_EXIT_CODE` — optional integer passed to `process.exit` on Restart (default `0`)

Do not commit `.env`. After changing Meta values, restart `pnpm dev`, then ADMIN `/settings/meta` → Sync Meta data. Token permission is `ads_read`. `META_APP_ID` / `META_APP_SECRET` are not used.

ADMIN Settings hub: `/settings` (Intro schedule, Catalog, Access Rights, Meta, Allow early Trial outcomes, and process controls). Campaigns live under Marketing. Shutdown exits the Node process. Restart is disabled unless `APP_RESTART_ENABLED=true`. Docker Compose enables Restart and uses `restart: unless-stopped`; use `pnpm env:<env>:down` to stop an environment.

## Docker

Copy the matching example once per environment, then start all three with one Compose project:

```bash
copy .env.dev.example .env.dev
copy .env.stage.example .env.stage
copy .env.production.example .env.production
pnpm env:up
```

On macOS/Linux use `cp`. `pnpm env:up` uses `docker-compose.all.yml` (PRODUCTION :5000, STAGE :5010, DEV :5020). Local `pnpm dev` stays on :5030 and is not in that file. Per-environment overlays (`pnpm env:dev:up` / `env:stage:up` / `env:prod:up`) still work; do not run them at the same time as `env:up` (same host ports and container names).

```bash
pnpm env:ps
pnpm env:logs
pnpm env:restart
pnpm env:down
pnpm env:pull -- --confirm-pull-from-prod
pnpm env:prod:load-local -- --confirm-load-local-into-prod
```

| Environment | APP_ENV | Local URL | Volumes | Chrome |
|---|---|---|---|---|
| DEV | `dev` | http://localhost:5020 | `renzo-dev-sqlite`, `renzo-dev-assets` | red + banner |
| STAGE | `stage` | http://localhost:5010 | `renzo-stage-sqlite`, `renzo-stage-assets` | green + banner |
| PRODUCTION | `production` | http://localhost:5000 | `renzo-prod-sqlite`, `renzo-prod-assets` | academy navy |

Health: `http://localhost:<port>/api/health`.

Other commands for a single environment replace `dev` with `stage` or `prod`:

```bash
pnpm env:dev:ps
pnpm env:dev:logs
pnpm env:dev:restart
pnpm env:dev:down
pnpm env:dev:build
```

`down` does **not** delete volumes. The only destructive helper is DEV-only:

```bash
pnpm env:dev:reset -- --confirm-dev-reset
```

There is no STAGE or PRODUCTION reset command.

`pnpm env:prod:load-local -- --confirm-load-local-into-prod` overwrites Docker PRODUCTION with local `pnpm dev` data (`data/renzo.sqlite` and `data/uploads/`). Stop `pnpm dev` first. STAGE and DEV are left alone. Sign in at http://localhost:5000 with those local users and passwords. Then `pnpm env:pull` if STAGE/DEV should match.

`pnpm env:pull -- --confirm-pull-from-prod` stops PRODUCTION, STAGE, and DEV, copies PRODUCTION SQLite and marketing uploads onto STAGE and DEV, starts the apps again, and restamps STAGE/DEV isolation markers. It overwrites STAGE and DEV data. Sign in there with PRODUCTION users and passwords (session cookies do not carry across environments).

ADMIN Settings → Environment (`/settings/environment`) is the in-app copy path: download a zip of this process’s SQLite plus marketing uploads (browser Save As), then restore that file on the destination environment. Containers still have no Docker socket, so the app cannot copy named volumes directly. After restore, Docker starts the process again; local `pnpm dev` stays down until you start it. Sign in with users from the backup.

## Host backups (same machine only)

M10B stores SQLite + marketing uploads as validated zips under `data/backups/{production,stage,dev}/<Denver-stamp>/`. That directory is gitignored and is **not** inside the live Docker volumes. Backups stay on this host. They protect against a bad deploy, a corrupted live SQLite, or an operator mistake **if the zip is still on disk**. They do **not** survive disk failure, laptop theft, fire, ransomware on the host, or losing the machine.

PRODUCTION backs up automatically every day at **02:00 America/Denver** (`renzo-backup-1`, `restart: unless-stopped`). It keeps **14 days**. STAGE and DEV have no scheduler — backup those by hand.

```bash
pnpm backup:prod
pnpm backup:stage
pnpm backup:dev
pnpm backup:status
pnpm backup:prune
pnpm backup:schedule -- --once
pnpm backup:restore -- --env stage --from data/backups/production/<stamp>/renzo-production-<stamp>.zip --confirm-env stage
```

`--confirm-env` must match the destination (`dev`, `stage`, or `production`). Restore restamps that environment’s isolation marker so STAGE stays STAGE. It replaces only that environment’s SQLite and asset volumes. A failed backup does not prune older PRODUCTION zips. Scheduler logs: `docker logs renzo-backup-1`. Off-host / cloud copies remain later M10.

Staff chrome (rail, mobile header, login) links PRODUCTION / STAGE / DEV. On the laptop it swaps ports on the current hostname (`:5000` / `:5010` / `:5020`; `:5030` is none of the three). On the public Pi hosts it swaps the three hostnames (`app.renzogracieutah.com` / `stage.app.renzogracieutah.com` / `dev.app.renzogracieutah.com`) and never uses those laptop ports or `www` variants. Public `/trial` and `/events` stay without a PRODUCTION banner.

Container startup runs migrations, then catalog/bootstrap seed, then Nitro. The init bundle is CommonJS (`docker/runtime-init.cjs`) with `DRIZZLE_MIGRATIONS_DIR=/app/drizzle/migrations`. `APP_SKIP_SEED=true` skips seed. DEV, STAGE, and PRODUCTION create `admin` / `admin@local` / `setup` when `NUXT_AUTH_PASSWORD` is unset. Set `NUXT_AUTH_RESET_PASSWORD=true` once to re-hash existing users to that password. Isolation/persistence check: `pnpm env:isolation:check` (starts the three overlay stacks; do not run it at the same time as `pnpm env:up`). On Windows it must spawn `docker exec` without a host shell so `>` stays inside the container.

Compose restart policy is `unless-stopped`. Image rebuild and `docker compose down` keep named volumes. `docker compose down -v` is destructive — do not use it on PRODUCTION.

## Public Pi URLs (HTTPS)

Daily work stays on this laptop (`localhost:5000` / `:5010` / `:5020`, or `pnpm dev` on `:5030`). Public Pi URLs are HTTPS: `https://app.renzogracieutah.com`, `https://stage.app.renzogracieutah.com`, `https://dev.app.renzogracieutah.com`. No `www` variants. DNS stays at GoDaddy. The Pi does not publish 5000 / 5010 / 5020. Staff chrome uses hostname mode and keeps the current protocol. `SESSION_COOKIE_SECURE=true` on the Pi after M10D.

## Develop → copy → deploy

**Full write-up:** [[Deploy-Workflow]].

Open Cursor at `Projects/renzo_crm` for app work. That repo is the product. `WebHosting/renzo_crm` is only the Pi drop-in. Do not develop there. Do not delete the sibling.

```text
git push renzo-crm working
→ Refresh-FromSibling.ps1
→ sync to Pi (no data/, no .env*)
→ rebuild named Renzo services (no -v)
→ git push WebHosting only if nginx/compose changed
```

“Push the app” is the **renzo_crm** remote. Copying is not a Git push. Deploying to the Pi is not a Git push. Never push the entire dirty WebHosting tree.

## Preserve PRODUCTION SQLite on the Pi

**Read this before every Pi update:** [[Operations-PRODUCTION-SQLite]].

Live PRODUCTION data is Docker volume `webhosting_renzo_sqlite`, file `/app/data/sqlite/renzo.sqlite`. It is not in Git and not in the image. Rebuild/recreate is safe. These are not:

```text
docker compose -p webhosting down -v
docker volume prune
copying laptop data/renzo.sqlite onto the Pi
```

Laptop `pnpm backup:prod` backs up the laptop overlay volume, not Koi-Pi. After a Pi deploy, check `https://app.renzogracieutah.com/api/health` still says `database: reachable`.

More context: [[Implementation-State]], [[Architecture]].
