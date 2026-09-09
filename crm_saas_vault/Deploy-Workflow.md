---
type: note
status: current
area: operations
updated: 2026-09-07
tags:
  - deploy
  - git
  - webhosting
---

# Develop, copy, deploy — three remotes

Workspace briefing (every new Cursor instance): `C:\Users\Scoy9\Projects\AGENTS.md` and [[Workspace]]. Thorough Pi map (hardware, directories, every step): [[Koi-Pi-Infrastructure]].

Scott’s daily question:

> I develop in `Projects/renzo_crm`. When I want it on the Pi, I copy into WebHosting and replace the drop-in. Then I push WebHosting?

**Almost.** Develop and **Git-push the product repo**. Copy into the drop-in **selectively**. **Deploy** that copy to Koi-Pi. **Do not** Git-push the whole WebHosting folder.

Git-canonical twin: `WebHosting/vault/Operations/Renzo-Develop-Copy-Deploy-Workflow.md`

---

## The three folders are not one project

```text
C:\Users\Scoy9\Projects\                 ← Cursor workspace only. Not a Git repo. Do not git init.
  renzo_crm\                             ← PRODUCT source of truth. Remote: renzo-crm (branch working)
  WebHosting\                            ← PI RUNTIME. Remote: WebHosting (branch main)
    renzo_crm\                           ← DEPLOYMENT COPY only. No nested .git.
  ThePond\                               ← OPS tooling. Remote: ThePond (branch main)
  vault\                                 ← Scott notes. Not the product remote.
```

| Folder | Role | Open Cursor here when… |
| --- | --- | --- |
| `Projects/renzo_crm` | Write the app | Daily CRM/Marketing work |
| `Projects/WebHosting` | Host nginx/compose/certs | Hosting-contract changes only |
| `Projects/ThePond` | Probes, presets, sync excludes | Ops tooling changes |
| `Projects` | See all three | Cross-repo infra (M10-style) |

**Do not develop in `WebHosting/renzo_crm`.** That folder is integrated for the Pi. It is not a backup of the product and not a substitute for `Projects/renzo_crm`. Do not delete the sibling repo. GitHub is the backup. The sibling is the product.

Do not `git init` at `Projects\`. Do not put a `.git` inside `WebHosting/renzo_crm`.

---

## What “push” means (three different actions)

| Word people say | What it actually is | Which remote |
| --- | --- | --- |
| Push the app | `git commit` + `git push` in `Projects/renzo_crm` | `renzo-crm` / `working` |
| Copy to WebHosting | `Refresh-FromSibling.ps1` | **Not a Git push** |
| Put it on the website | Sync drop-in to Koi-Pi + rebuild Renzo containers | **Not a Git push** |
| Push hosting | `git commit` + `git push` of **named WebHosting files only** | `WebHosting` / `main` |

A normal lead-form or settings change: **product Git push + refresh + Pi rebuild**. No WebHosting Git commit.

---

## The loop (do it in this order)

```text
1. Edit Projects/renzo_crm
2. QA on the laptop
3. git commit + git push   →  origin/working on renzo-crm
4. Refresh-FromSibling.ps1  →  WebHosting/renzo_crm  (code only)
5. Sync that drop-in to the Pi  (exclude data/ and .env*)
   — Ops Console **Renzo** page (**Ship to Pi**), or the same Git tar + named compose by hand
6. Rebuild/recreate named Renzo services only  (no -v)
7. Health-check PRODUCTION
8. git push WebHosting only if nginx/compose/host docs changed
```

### 1–3. Develop and save the product

Open Cursor at `Projects/renzo_crm`. Commit only app files. Push `working`.

This is the real save. Do it **before** you copy.

### 4. Copy into the drop-in (not a wipe)

From `WebHosting/renzo_crm`:

```powershell
powershell -File .\Refresh-FromSibling.ps1
```

This **updates** the deploy copy. It does **not** delete the folder and paste a new one.

It **must not** copy:

- `.git`
- `node_modules/`, `.nuxt/`, `.output/`, `.nitro/`
- `data/` or any `*.sqlite*`
- filled `.env`, `.env.production`, `.env.stage`, `.env.dev`
- the drop-in’s own `README.md`

After refresh, do not keep editing the drop-in. Edit the sibling again and refresh again.

### 5–6. Deploy to Koi-Pi

**Allowed UI:** Ops Console → Pi 1 → **Renzo** → **Ship to Pi**. Confirm, then it auto-runs: push committed `working` → refresh → snapshot sqlite size → tar `renzo_crm/` + `docker-compose.yml` (excludes `data/` and `.env*`) → extract in place (no initial stop) → named recreate → verify → compare sqlite size. **Preview push plan** is the advanced checkbox + Launch path. Then:

```bash
cd /home/scottc/Desktop/projects/WebHosting
docker compose -p webhosting --profile optional up -d --build --no-deps \
  --force-recreate renzo_crm renzo_crm_stage renzo_crm_dev
```

Do **not** use `/host/pi-1/deploy` folder-rename (presets `full` / `renzo*`) for this. Never `down -v`.

PRODUCTION SQLite is volume `webhosting_renzo_sqlite`. Recreate is safe. `down -v` is not. See [[Operations-PRODUCTION-SQLite]].

### 7. Prove PRODUCTION survived

`https://app.renzogracieutah.com/api/health` → `database: reachable`, `appEnv: production`.

### 8. WebHosting Git (rare)

Commit WebHosting **only** when you changed hosting files, for example:

- `docker-compose.yml`
- `NGINX/nginx.conf`
- certbot scripts/units
- drop-in README / Refresh script
- `vault/Operations/*` host notes

Never stage with a Renzo feature: Mori submodule, deleted nested `ThePond/`, `.obsidian`, certs, ACME keys, filled `.env`, `cloudflare-ddns.env`, laptop sqlite.

ThePond gets its own commit only if probes, presets, `sync-excludes.txt`, or the Renzo in-place ops path changed.

---

## Cursor / Git habits

- Daily app window: `Projects/renzo_crm`.
- Cross-repo infra window: `Projects` (Source Control shows **multiple** remotes — that is correct).
- Commit **one repo at a time**.
- `Projects/vault` notes are not a substitute for committing the same rule into `renzo_crm/vault` and the WebHosting twin.

---

## Related

- [[How-to-Run]]
- [[Operations-PRODUCTION-SQLite]]
- [[Architecture]]
- [[Decisions#2026-09-07 — Develop in sibling renzo_crm; drop-in is not the product]]
