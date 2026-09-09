# Renzo CRM — WebHosting deployment copy

This folder is a **deployment copy** of the sibling development repo. Do not treat it as the product source of truth.

**Source of truth:** `C:\Users\Scoy9\Projects\renzo_crm` (own Git remote).  
**This copy:** lives in WebHosting Git after `.gitignore` rules below. Pond rsyncs it to the Pi.

Product docs (stack, local `pnpm dev`, laptop Docker overlays) live in the sibling repo. This file is only drop-in / refresh rules for the Pi compose project.

**Workflow:** develop in the sibling → `git push` `renzo-crm` → this script → sync/rebuild on the Pi. Do not develop here. Do not delete `Projects/renzo_crm`. Do not `git push` the whole WebHosting tree for an app change. Workspace briefing: `C:\Users\Scoy9\Projects\AGENTS.md`. See [`vault/Operations/Renzo-Develop-Copy-Deploy-Workflow.md`](../vault/Operations/Renzo-Develop-Copy-Deploy-Workflow.md).

## Refresh from the sibling repo

From this folder:

```powershell
powershell -File .\Refresh-FromSibling.ps1
```

The script copies accepted source from `C:\Users\Scoy9\Projects\renzo_crm` into this folder. **Do not** copy:

- `.git` / `.git/`
- `node_modules/`
- `.nuxt/` / `.output/` / `.nitro/`
- `data/` (runtime SQLite / uploads — **never copy**; Pi PRODUCTION is volume `webhosting_renzo_sqlite`)
- `*.sqlite`, `*.sqlite-wal`, `*.sqlite-shm`, `*.sqlite-journal`
- filled `.env`, `.env.production`, `.env.stage`, `.env.dev`
- this folder's drop-in `README.md`
- `.obsidian/`, coverage, logs, IDE folders

Keep `Dockerfile`, `package.json`, lockfile, and `*.example` env templates. Live env files already in this folder are left in place.

## Environment files (human / Sprint 7)

Create filled env files **in this folder** from the examples. Do not copy live secrets from the laptop repo.

| File | Used by compose service |
| ---- | ----------------------- |
| `.env.production` | `renzo_crm` |
| `.env.stage` | `renzo_crm_stage` |
| `.env.dev` | `renzo_crm_dev` |

These files are gitignored. Examples (`.env.production.example`, etc.) stay in Git.

## Pi runtime

The Pi uses the **WebHosting root** [`docker-compose.yml`](../docker-compose.yml), not the laptop overlays in this folder (`docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.stage.yml`, `docker-compose.prod.yml`, `docker-compose.all.yml`).

- Three optional services: `renzo_crm`, `renzo_crm_stage`, `renzo_crm_dev`
- Shared image, internal port `5000` only (`expose`, no host `5000`/`5010`/`5020`)
- Named volumes `webhosting_renzo_*` — **PRODUCTION SQLite is `webhosting_renzo_sqlite`**. Recreate containers without `-v`. Never `compose down -v`, never prune volumes, never `docker cp` a laptop sqlite onto the volume. See [`vault/Operations/Renzo-PRODUCTION-SQLite-Preservation.md`](../vault/Operations/Renzo-PRODUCTION-SQLite-Preservation.md).
- Public hostnames via nginx (HTTPS): `https://app.renzogracieutah.com`, `https://stage.app.renzogracieutah.com`, `https://dev.app.renzogracieutah.com`. No `www` variants. Never the parent apex. DNS: GoDaddy. `SESSION_COOKIE_SECURE=true`. No Cloudflare for Renzo.

Sprint plan: [`vault/Operations/RENZO_INTEGRATION_SPRINT_PLAN.md`](../vault/Operations/RENZO_INTEGRATION_SPRINT_PLAN.md).
