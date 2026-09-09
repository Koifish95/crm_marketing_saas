---
type: note
status: current
area: saas
updated: 2026-09-08
aliases:
  - S2 checklist
tags:
  - saas
  - s2
---

# S2 hand-boot checklist

Repeatable laptop procedure for a **second martial-arts academy** (not Renzo’s prod/stage/dev triple). Naming: [[S2-Lab-Isolation]]. Evidence: [[wip/S2_Sprint4_Coexist_Evidence]].

Do **not** attach `webhosting_renzo_*`, `renzo-prod-*`, or Koi-Pi PRODUCTION SQLite. Do **not** `docker compose down -v`. Do **not** document `setup` as the admin password.

This checklist boots **two processes from one build**, not a Compose product. Docker coexist was **not** verified on 2026-09-08 even though a Linux engine was present.

## Record these first

| Field | Lab PROD | Lab DEV |
|---|---|---|
| Customer slug | `lab-acme` | `lab-acme` |
| Environment type | `PROD` | `DEV` |
| Lab slug | `lab-acme-prod` | `lab-acme-dev` |
| Timezone | America/Denver (lab value only) | America/Denver (lab value only) |
| ADMIN username | `admin` | `admin` |
| ADMIN password | set in `.env.lab-acme-prod` — **required** | set in `.env.lab-acme-dev` — **required** |
| Data root | `martial_arts_template/data/lab-acme-prod/` | `martial_arts_template/data/lab-acme-dev/` |
| SQLite | `data/lab-acme-prod/sqlite/crm.sqlite` | `data/lab-acme-dev/sqlite/crm.sqlite` |
| Uploads | `data/lab-acme-prod/uploads/` | `data/lab-acme-dev/uploads/` |
| Port | 52040 | 52050 |
| Health | http://127.0.0.1:52040/api/health | http://127.0.0.1:52050/api/health |
| Hosting node | `laptop` | `laptop` |
| Isolation marker | `m10a-prod-isolation` | `m10a-dev-isolation` |

Copy `martial_arts_template/.env.lab-acme-prod.example` → `.env.lab-acme-prod` (gitignored) and replace the placeholder ADMIN and session passwords. Same for DEV. Example files are lab placeholders, not SaaS defaults.

If 52040/52050 cannot bind (Windows excluded-port ranges), pick two free ports outside 3000, 5000, 5010, 5020, 5030 and the `netsh interface ipv4 show excludedportrange` list. Do not reuse Renzo Docker ports.

**Git SHA:** from `martial_arts_template` / repo root, record `git rev-parse HEAD` after the code you built. 2026-09-08 coexist proof was on `working` at `b6465db` (later isolation-doc commits may follow).

## Procedure

Work in `martial_arts_template`. Node 22+ and pnpm.

1. `pnpm install` if `node_modules` is missing.
2. `pnpm lab lab-acme-prod setup` — migrate + seed. Fails if `NUXT_AUTH_PASSWORD` is missing. Fresh sqlite has generic programs/sources/lost reasons, **no** $175/$150/$155 offerings, **no** intro rules, compensation percent `0`.
3. `pnpm lab lab-acme-prod stamp`
4. Repeat steps 2–3 for `lab-acme-dev`.
5. `pnpm build`
6. `pnpm lab lab-acme-prod serve` (leave running).
7. `pnpm lab lab-acme-dev serve` (leave running).
8. GET both health URLs. Require `ok: true` and `database: "reachable"`. `appEnv` must be `production` and `dev` respectively.
9. `pnpm lab lab-acme-prod get` and `pnpm lab lab-acme-dev get`. Markers must differ. PROD uploads must not contain `m10a-dev-isolation.txt`; DEV uploads must not contain `m10a-prod-isolation.txt`.
10. Stop **only** the PROD process. Do not delete `data/lab-acme-dev/`. Confirm DEV health stays green and both sqlite files still exist.
11. Start PROD again. Both health URLs green. Markers unchanged.

`pnpm lab <slug> dev` honors the lab port and does not steal 5030. Two Vite processes share `.nuxt`; do not use dual `dev` as the coexist proof.

## Dry-run result (2026-09-08)

Followed on this laptop. Both health endpoints green. Isolation markers did not leak. PROD stop/restart left DEV sqlite and markers intact. Display name in `/api/health` was still `Renzo Gracie Kaysville Acquisition` (Sprint 6 leftover).

## Official Successful line

[[SaaS-Milestones]] S2 Successful also asks for **Docker** and **isolated volumes**. That part was **not** run. Do not tick S2 Successful until a Docker (or Pi lab volume) pass exists, or Scott accepts the Nitro+directory proof as equivalent.
