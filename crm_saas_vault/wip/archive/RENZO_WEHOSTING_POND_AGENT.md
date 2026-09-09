# Connect Renzo CRM to WebHosting and The Pond

Work order for a Cursor agent opened on `C:\Users\Scoy9\Projects` (three sibling git repos). Implement Windows scaffolding only. Stop when the Definition of Done is met.

This file is the **work order**. Rationale and non-interference rules live in WebHosting’s vault. Do not duplicate that note; do not follow the parts this box **supersedes**.

---

## Supersedes (read this first)

[`WebHosting/vault/Operations/Renzo-CRM-Integration.md`](WebHosting/vault/Operations/Renzo-CRM-Integration.md) was written before these decisions. Where they conflict, **this file wins**:

| Older note said | Do this instead |
| ---------------- | --------------- |
| Source is `C:\Users\Scoy9\Desktop\renzo_crm` | Sibling [`C:\Users\Scoy9\Projects\renzo_crm`](C:\Users\Scoy9\Projects\renzo_crm) |
| Copy the app tree into `WebHosting/renzo_crm/` now | **Do not copy** the application. Renzo is still in development. Leave a stub folder + README so a later drop-in works |
| One Pi environment (`APP_ENV=production` only) | Three nginx hostnames and three optional compose services (see below) |
| Laptop Docker ports 5000 / 5010 / 5020 | **Never** publish those on the Pi. Route by `Host` header |

Still follow that note for: optional profile, no nginx `depends_on`, JCATS-style variable `proxy_pass`, named volumes, no Caddy, no second Compose project, no Mori-style gitlink.

---

## Mission

Temporary guest on the Raspberry Pi **webhosting** stack, without taking down **Mori Combatives** or **JCATS Janitorial**.

Wire compose, nginx, gitignore, a stub `WebHosting/renzo_crm/`, and The Pond ops config so that when a human later copies the app (excluding `.git`), Pond rsync + an optional compose build can work.

**Out of scope for this run:** SSH to the Pi, Pond guided deploy, `docker compose` against the Pi, real TLS files, real session/Meta secrets, bulk copy of `renzo_crm/`, Renzo product (M8/M9) work.

---

## Three roots (separate git remotes)

| Root | Path | Remote / branch (informational) |
| ---- | ---- | ------------------------------- |
| WebHosting | `C:\Users\Scoy9\Projects\WebHosting` | `Koifish95/WebHosting` / `main` |
| The Pond | `C:\Users\Scoy9\Projects\ThePond` | `Koifish95/ThePond` / `main` |
| Renzo CRM | `C:\Users\Scoy9\Projects\renzo_crm` | `Koifish95/renzo-crm` / `M10` |

Do not `git init` at `C:\Users\Scoy9\Projects`. Do not nest Renzo’s `.git` inside WebHosting. Commits, if the operator asks later, stay in the repo you edited. **Do not commit unless asked.** Do not commit `.env` files or certs.

---

## Public hostnames

| Hostname | Compose service | `APP_ENV` |
| -------- | --------------- | --------- |
| `app.renzogracieutah.com` | `renzo_crm` | `production` |
| `stage.app.renzogracieutah.com` | `renzo_crm_stage` | `stage` |
| `dev.app.renzogracieutah.com` | `renzo_crm_dev` | `dev` |

HTTPS URLs: `https://app.renzogracieutah.com`, `https://stage.app.renzogracieutah.com`, `https://dev.app.renzogracieutah.com`.

All three services: `profiles: ["optional"]`, network `web`, container listen **5000**, **no** `ports:` on the host (`expose: ["5000"]` only), **not** listed on nginx `depends_on`.

Default operator intent after this scaffold exists: start **production** first. Stage and dev are wired so they can start later. Three Node 22 / Nuxt processes on the Pi next to Mori + JCATS is heavy — do not treat “start all three” as required.

---

## Read first (then stop exploring)

Do **not** scan the rest of The Pond (Hub, Finances, Tap Tracker, etc.). Do not refactor Mori, JCATS, SIC, or Top Tier app code.

1. This file.
2. `WebHosting/vault/Operations/Renzo-CRM-Integration.md` (non-interference; ignore superseded rows above).
3. `WebHosting/vault/Operations/ThePond-Ops.md` (presets, `full` skips optional, deploy default `toptier`).
4. `WebHosting/docker-compose.yml` — add services; do not convert idle sites to optional unless asked.
5. `WebHosting/NGINX/nginx.conf` — copy the **JCATS** block (variable `proxy_pass` + existing `resolver 127.0.0.11`), not Mori/SIC `upstream {}`.
6. `ThePond/services/ops-api/config/projects.json` (and `projects.example.json` — keep them in sync).
7. `ThePond/services/ops-api/src/preflight.ts` — maps `OPTIONAL_SERVICE_ENV_FILES` and `PRESET_ASSET_HINTS`.
8. Renzo **read-only:** `Dockerfile`, `.env.production.example` / `.env.stage.example` / `.env.dev.example`, `GET /api/health`. Internal Nitro port is **5000**. Health path is `/api/health`, not `/health`.

---

## Allowlist (only these writes)

### WebHosting

| Path | What to do |
| ---- | ---------- |
| `docker-compose.yml` | Three optional services as specified below |
| `NGINX/nginx.conf` | Three 443 server blocks + names on the port-80 `server_name` list |
| `renzo_crm/README.md` | Stub: drop-in instructions (no app source) |
| `renzo_crm/.env.production.example`, `.env.stage.example`, `.env.dev.example` | Copy from the **sibling examples only**. Do not create filled `.env.production` with real passwords |
| `.gitignore` | Ignore env files, `node_modules`, `.nuxt`, `.output`, `data` under `renzo_crm/` |
| `vault/**` | Optional: fix Desktop paths and “one environment” lines so they match this work order |

**Compose shape (required):**

- `build.context: ./renzo_crm`, `dockerfile: Dockerfile` (same image for all three; do **not** use Renzo’s `docker-compose.all.yml` overlays on the Pi).
- `env_file`: `./renzo_crm/.env.production` / `.env.stage` / `.env.dev` (`required: false` is OK so nginx/Mori still work before those files exist).
- Environment: `APP_ENV` / `NUXT_PUBLIC_APP_ENV` per table; `SESSION_COOKIE_SECURE: "true"` in compose (sibling examples default `false` for laptop HTTP).
- Named volumes, **not** bind mounts inside the WebHosting folder (Pond guided deploy **renames** that folder). Distinct names, e.g. `webhosting_renzo_sqlite` / `webhosting_renzo_assets` and `_stage` / `_dev` pairs. Do **not** reuse laptop names `renzo-prod-sqlite`.
- Do **not** add these services to nginx `depends_on` (today: `web_prod`, `mori_combatives`, `toptier_hauling`).
- Do **not** set `build.context` to `../renzo_crm`. Pond rsyncs only `LOCAL_PROJECT_PATH` (the WebHosting folder).

Build of `./renzo_crm` will fail until a human copies the app. That is expected. Do not start the services.

**Nginx shape (required):**

- Add the three hostnames to the existing port-80 redirect `server_name` list.
- Three `listen 443 ssl` blocks. Pattern:

```nginx
set $renzo_upstream "renzo_crm:5000";
proxy_pass http://$renzo_upstream;
```

Use `renzo_crm_stage:5000` and `renzo_crm_dev:5000` in the other two blocks. Include Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto, Upgrade, Connection. `client_max_body_size 512m;` (Renzo environment zip default cap).

- Placeholder cert **filenames** only, e.g. `renzocertificate.pem` / `renzoPrivateKey.key` (and stage/dev variants if you split files). **Do not** create dummy PEM contents. **Do not** overwrite Mori, JCATS, SIC, TTH, or Still Beauty keys. **Do not** edit the live Cloudflare token in `NGINX/cloudflare-ddns.env`. **Do not** add Renzo names to Cloudflare `DOMAINS=` — GoDaddy stays authoritative; TLS is Let's Encrypt, not Cloudflare Origin CA. See [[wip/dns_plans]].

### The Pond

| Path | What to do |
| ---- | ---------- |
| `services/ops-api/config/projects.json` | Three optional services; three presets |
| `services/ops-api/config/projects.example.json` | Same |
| `services/ops-api/src/preflight.ts` | Optional env map + preset folder hints only |
| `services/ops-api/config/sync-excludes.txt` | Extra Renzo build/data dirs |
| `services/ops-api/config/site-probes.example.json` | Three probes, `skipWhenStopped: true` |
| `services/ops-api/config/site-probes.json` | Same **if the file exists** (today only the example may exist) |
| `services/ops-api/config/stack-atlas.json` | Three short `sites[]` entries |

**`projects.json` service objects** (do **not** set `"port": 5000` — that number already means SIC on the dashboard):

```json
{ "name": "renzo_crm", "label": "Renzo CRM", "optional": true }
{ "name": "renzo_crm_stage", "label": "Renzo CRM STAGE", "optional": true }
{ "name": "renzo_crm_dev", "label": "Renzo CRM DEV", "optional": true }
```

**Presets** (each service only — not Mori, not SIC, not Top Tier, not `nginx` on the routine presets; first nginx conf/cert deploy later uses existing preset `nginx`):

```json
{ "id": "renzo", "label": "Renzo CRM production only", "services": ["renzo_crm"] }
{ "id": "renzo-stage", "label": "Renzo CRM STAGE only", "services": ["renzo_crm_stage"] }
{ "id": "renzo-dev", "label": "Renzo CRM DEV only", "services": ["renzo_crm_dev"] }
```

Do **not** add these names to preset `full`. `full` already omits `--profile optional`.

**`preflight.ts`:** add to `OPTIONAL_SERVICE_ENV_FILES` (not `CORE_SERVICE_ENV_FILES`):

- `renzo_crm` → `renzo_crm/.env.production`
- `renzo_crm_stage` → `renzo_crm/.env.stage`
- `renzo_crm_dev` → `renzo_crm/.env.dev`

`PRESET_ASSET_HINTS`: `renzo` / `renzo-stage` / `renzo-dev` → `renzo_crm/`.

**`sync-excludes.txt`:** e.g. `renzo_crm/node_modules`, `renzo_crm/.nuxt`, `renzo_crm/.output`, `renzo_crm/.nitro`, `renzo_crm/data`. Do not exclude Dockerfiles or env examples. `**/.git` is already listed.

**Site probes:**

```json
{ "service": "renzo_crm", "label": "Renzo CRM", "urls": ["https://app.renzogracieutah.com"], "skipWhenStopped": true }
{ "service": "renzo_crm_stage", "label": "Renzo CRM STAGE", "urls": ["https://stage.app.renzogracieutah.com"], "skipWhenStopped": true }
{ "service": "renzo_crm_dev", "label": "Renzo CRM DEV", "urls": ["https://dev.app.renzogracieutah.com"], "skipWhenStopped": true }
```

### Renzo sibling

**Read-only.** No edits to product code, Docker overlays, or vault except if you only need to read.

Later (not this run): staff `AppEnvSwitcher` still links `:5000` / `:5010` / `:5020`. On the Pi those ports are the wrong apps. Hostname routing above replaces that; changing the switcher is Renzo-repo work for another day.

---

## Never do

- Add Renzo to nginx `depends_on`
- Publish host ports **5000**, **5010**, **5020**, **80**, or **443** on Renzo services
- Run or vendor `pnpm env:up` / `docker-compose.all.yml` as a second Compose project on the Pi
- Introduce Caddy or a second edge proxy
- `docker compose down` on project `webhosting`
- Pond preset `full` or the UI default `toptier` for this work
- Gitlink / submodule / copy of `renzo_crm/.git` into WebHosting
- Bulk copy of `app/`, `server/`, `node_modules`, `.output`, or SQLite data into WebHosting
- Point compose `context` at `../renzo_crm`
- Explore or edit other Pond apps (only `ops-api` config + `preflight.ts`)
- Change Mori, JCATS, SIC, Top Tier, Still Beauty application source
- Write real secrets or real certificate bodies
- SSH to the Pi or run guided deploy

Live operator sites: **Mori** (always-on) and **JCATS** (`optional`). Idle default-stack apps (`web_prod`, `toptier_hauling`) must still be able to start later — do not steal their ports.

---

## Phases

1. Read the list above. Confirm JCATS nginx pattern and current `depends_on`.
2. Stub `WebHosting/renzo_crm/README.md` + example env files from the sibling **examples**. Update WebHosting `.gitignore`.
3. Add the three optional services to root `docker-compose.yml`.
4. Add three nginx vhosts + port-80 names. Placeholder cert paths only.
5. Pond `projects.json` / example, `preflight.ts`, sync-excludes, site-probes, stack-atlas.
6. Optional vault path fixes (Desktop → `Projects\renzo_crm`; three hosts).
7. Stop. Print the handoff checklist. Do not deploy.

---

## Definition of Done

- WebHosting compose has three optional Renzo services, no host port publish, no nginx `depends_on` change for them, named volumes with `webhosting_renzo_` prefixes.
- Nginx has three Host-based 443 blocks using variable `proxy_pass` to `renzo_crm:5000` / `_stage` / `_dev`.
- `WebHosting/renzo_crm/` contains README (+ examples) only — not the Nuxt app.
- Pond lists the three optional services and three presets; preflight maps optional env paths; probes use `skipWhenStopped: true`.
- Mori and JCATS compose/nginx blocks are unchanged except the shared port-80 `server_name` list gaining the three Renzo names.
- You did not SSH, deploy, copy the app, or write secrets/certs.
- End your session with the human checklist below.

Compose **build** of `renzo_crm` is **not** required to pass (the context folder has no Dockerfile until the app is copied). `nginx -t` on Windows may fail on missing placeholder cert files — that is OK; do not generate fake PEMs.

---

## Human checklist (print at the end; do not execute)

1. When Renzo is ready: copy the app into `WebHosting/renzo_crm/` **without** `.git`, `node_modules`, `.output`, `.nuxt`, or `data/*.sqlite`. Keep using the sibling repo as the development tree.
2. Create `.env.production` / `.env.stage` / `.env.dev` on Windows (from examples). `NUXT_SESSION_PASSWORD` ≥ 32 chars, unique per env. `SESSION_COOKIE_SECURE=true`. Do not use `admin` / `setup` in production unless intended. Rsync copies these; Git should not.
3. Drop Let's Encrypt certs into `NGINX/certs/` matching the filenames in `nginx.conf`. Automated renewal. Do **not** append Renzo names to live `DOMAINS=` in `cloudflare-ddns.env`. GoDaddy stays authoritative. See [[wip/dns_plans]].
4. On the Pi (read-only first): `uname -m` (need `aarch64` for libsql; 32-bit is a hard stop). Confirm Mori and JCATS still `running`.
5. Pond deploy: change localStorage `pond-deploy-preset-webhosting` off **`toptier`**. Use preset **`nginx`** for conf/certs, then **`renzo`** for production. Prefer **not** `--no-cache`. Do **not** use `full`.
6. Start stage/dev only if the Pi has RAM; they are optional.
7. Verify `https://app.renzogracieutah.com/api/health` after deploy — not this agent’s job.

Pi SSH (docs, not verified this session): `scottc@192.168.0.13`, remote path `/home/scottc/Desktop/projects/WebHosting`, compose `-p webhosting`.
