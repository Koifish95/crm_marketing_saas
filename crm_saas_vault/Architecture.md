---
type: note
status: current
area: architecture
updated: 2026-09-07
tags:
  - architecture
---

# Architecture

One Nuxt 4 application: Vue UI, Nitro API, Drizzle, SQLite file. No Express/FastAPI split. No Python in V1.

## Stack (running)

| Piece | Choice |
|---|---|
| App | Nuxt 4.5 / Vue 3 / TypeScript |
| CSS | Tailwind CSS v4 (`@tailwindcss/vite`) |
| DB | SQLite via `@libsql/client` + Drizzle ([[Database]]) |
| Validation | Zod |
| Auth | `nuxt-auth-utils` sealed sessions + scrypt ([[Authentication]]) |
| Package manager | pnpm 10, `node-linker=hoisted` |
| Local URL | `pnpm dev` http://localhost:5030 (never 3000/5000/5010/5020; fallbacks 5031–5035). Docker PRODUCTION :5000, STAGE :5010, DEV :5020 |
| Timezone | America/Denver |

PostgreSQL is the later production database if SQLite’s limits show up. Do not write SQLite-only application logic.

Validation lives in `shared/schemas/`. Timestamp conversion lives in `shared/utils/time.ts`. Do not scatter timezone math in Vue. Staff-facing enum labels live in `shared/utils/labels.ts`. Password policy helpers: `shared/utils/password-policy.ts`. User administration: `server/services/users.ts`. Access Rights: `server/services/access-rights.ts` and `requireAccessRight`. Audit: `server/services/security-audit.ts`. UI tokens and primitives: [[Design-System]]. Auth/RBAC: [[Authentication]]. Marketing operations: [[wip/M9_Implementation_Handoff_2026-09-02]]. Primary Record Workspace: [[wip/M9_Primary_Record_Workspace_Handoff_2026-09-03]].

## Principles

1. Keep the core small.
2. Isolate Meta / email / SMS behind services when those milestones start. No Integrations product page in V1.
3. Important events become rows, not tribal knowledge.
4. Manual fallbacks: the app works if Meta or messaging is down.
5. Build for this gym; do not invent multi-tenant SaaS.
6. Human approval for publishing content later; no unsupervised AI posting.

## Staff interaction model

Vue is an interface. Required side effects stay in `server/services/`. Staff record work uses the Primary Record Workspace ([[Design-System]]): compact indexes, stable `:id` URLs, selector/Previous/Next, short headers, contextual tabs. Visual hierarchy is workspace → identity → tab/section → field group → related record; CSS classes `.record-header`, `.record-list`, `.field-group`, `.form-measure`.

| Kind | Index | Record |
|---|---|---|
| Household | `/leads` | `/leads/:id` |
| Campaign | `/marketing/campaigns` | `/marketing/campaigns/:id` (create: `/marketing/campaigns/new`) |
| Acquisition Event | `/marketing/events` | `/marketing/events/:id` |
| Content | `/marketing/content` | `/marketing/content/:id` (focused detail + selector chrome, not tabbed workspace) |
| Marketing Task | `/marketing/tasks` | `/marketing/tasks/:id` (focused detail + selector chrome, not tabbed workspace) |

Nuxt folder routes replaced `app/pages/marketing/campaigns.vue`, `content.vue`, `assets.vue`, and `tasks.vue`. Helpers: `shared/utils/campaign.ts`, `content.ts`, `event.ts`, `lead.ts`, `asset.ts`, `task.ts`. Chrome: `app/components/AppRecordWorkspace.vue`, `AppRecordSelector.vue` (header identity lookup), `AppRecordTabs.vue`.

Campaign list APIs are slim (owner + `householdCount`, no nested `leads[]`). `GET /api/marketing/campaigns/:id` is the full record. Child lists accept `?campaignId=` (Assets: `assets.campaignId` **or** `asset_usages.campaignId`). Content detail links to `/marketing/campaigns/:id` and may carry `?campaignId=` for Back to Campaign. Asset detail loads usage Campaign/Content names. `GET /api/marketing/campaigns/:id/performance` requires `VIEW_MARKETING_REPORTS`.

ADMIN `GET/PATCH /api/admin/settings` includes `allowEarlyTrialOutcomes` and `trackedAcquisitionOwnerUserId` (`compensation.tracked_acquisition_owner_user_id`). Event Process preview returns people, duplicate matches, and proposed action — not counts only. Immediate-save Roster controls return per-row Saving / Saved / error. `AppConfirm` is centered (`dialog:modal { margin: auto }`). ADMIN Settings → Environment downloads and restores a zip of this process’s SQLite plus `ASSET_UPLOAD_DIR` (`GET/POST /api/admin/environment/backup` and `/restore`). Host `pnpm backup:*` writes the same zip format under `data/backups/` (PRODUCTION daily at 02:00 America/Denver, 14-day retention). Copy between Docker environments is download-then-restore or `pnpm backup:restore`; `pnpm env:pull` remains the volume-level shortcut.

## Deferred (not in M10D)

- Off-host / cloud backup replication
- M10B Pi backup/restore validation (laptop path exists; not LIVE-VALIDATED on Koi-Pi)
- PostgreSQL cutover (later M10)
- Meta create/publish, OAuth, webhooks, Pixel, Conversions API, Lead Ads, Messenger
- SMS / email send / WhatsApp customer messaging
- MFA, emailed forgot-password, JWT
- Full class schedules, capacity, instructor calendars, waitlists
- Holiday business calendars, staff SMS/email notifications, telephony
- DAM, accounting, form-builder

## Meta

External provider. Inventory is in progress. Suspected public pages (unconfirmed): Facebook `Renzogracieut`, Instagram `renzogracieut`. Gym owns Meta assets; Scott currently owns the application and its infrastructure ([[Decisions]]).

## Deploy shape (M10A / M10B)

Docker: Node 22 Debian slim (not Alpine). Multi-stage image `renzo-acquisition:m10a`. Per-environment overlays: `docker-compose.yml` plus `docker-compose.dev.yml` / `docker-compose.stage.yml` / `docker-compose.prod.yml`. Combined stack: `docker-compose.all.yml` (`pnpm env:up`) starts PRODUCTION, STAGE, and DEV together. Host ports **PRODUCTION 5000 / STAGE 5010 / DEV 5020** → container **5000**. Local `pnpm dev` is **5030**. Persistent named volumes for SQLite and `ASSET_UPLOAD_DIR`. `pnpm env:prod:load-local` copies laptop `data/renzo.sqlite` onto PRODUCTION. `pnpm env:pull` copies PRODUCTION volumes onto STAGE and DEV from the host (no Docker socket in the app). ADMIN Settings → Environment is the in-app operator dump: download a zip, restore it on another running process. Host backups use the same zip (`server/services/environment-backup.ts`) under `data/backups/`. `renzo-backup-1` mounts PRODUCTION volumes plus `./data/backups` and runs `docker/backup-scheduler.cjs` at 02:00 America/Denver; STAGE/DEV are not mounted. SQLite consistency: `PRAGMA wal_checkpoint(TRUNCATE)` then copy/zip. Restore requires `--confirm-env` matching the destination and restamps isolation. Entrypoint applies migrations then seed, then drops to user `node` via `gosu`. `restart: unless-stopped`. Health: `GET /api/health` (process + `select 1`). This repo’s unused `docker/nginx.conf` is not the operator path. Public edge is the existing Pi **nginx** in the sibling WebHosting stack (not Caddy): `https://app.renzogracieutah.com` / `stage.app` / `dev.app`, Host-header routing, no laptop ports 5000/5010/5020 on the Pi. Koi-Pi PRODUCTION SQLite is volume `webhosting_renzo_sqlite` — preserve it on every deploy ([[Operations-PRODUCTION-SQLite]]). Laptop `pnpm backup:*` does not protect that volume. [[Decisions]]

Nitro tracing of libsql native bindings is OS-specific. Docker runs `docker/stub-missing-libsql-natives.mjs` so the Linux build can finish when the Windows package is absent.

## Public edge (Koi-Pi)

Sibling repos: `C:\Users\Scoy9\Projects\WebHosting` and `C:\Users\Scoy9\Projects\ThePond`. Renzo is a guest next to Mori and JCATS. Do not run `pnpm env:up` / `docker-compose.all.yml` on the Pi. Develop in this repo; refresh the WebHosting drop-in without `data/` or `.env*` ([[Deploy-Workflow]]). Hardware, directories, and every update step: [[Koi-Pi-Infrastructure]]. Workspace map: [[Workspace]]. Pi PRODUCTION data is `webhosting_renzo_sqlite` ([[Operations-PRODUCTION-SQLite]]). Off-host backup is still later.

## Testing

Vitest covers M1 domain, M2 auth helpers, M3 CRM services, M4 intro availability/booking, M5 follow-up tasks, M6 display labels, M7 user admin / throttle / RBAC HTTP, and HTTP authorization on intro-availability and follow-up handlers. No Playwright yet. Combined M6/M7 audit: [[wip/archive/M6_M7_Implementation_Audit_Handoff]].

See [[Implementation-State]], [[How-to-Run]], [[Database]], [[Authentication]], [[CRM]], [[Intro-Scheduling]], [[Design-System]].
