---
type: note
status: current
area: saas
updated: 2026-09-09
aliases:
  - S2 checklist
  - Lab isolation
tags:
  - saas
  - s2
---

# S2 hand-boot checklist

Repeatable laptop procedure for a **second martial-arts academy** from `martial_arts_template`. This is a lab, not a SaaS customer and not the external `renzo_crm` project.

Docker evidence (original names): [[wip/archive/S2_Docker_Coexist_Evidence]]. Earlier host-process evidence: [[wip/archive/S2_Sprint4_Coexist_Evidence]].

Do **not** attach `webhosting_renzo_*`, leftover laptop `renzo-prod-*` / `renzo-stage-*` / `renzo-dev-*`, or Koi-Pi PRODUCTION SQLite. Do **not** `docker compose down -v`. Do **not** document `setup` as the admin password. Do **not** prune unused `renzo-*` volumes.

`pnpm env:up` starts the **local template** prod/stage/dev triple (`martial-arts-prod` / `stage` / `dev`). That is not the S2 Successful path and not the external Renzo fleet.

The **Successful** path is Docker + named `lab-acme-*` volumes below. The Nitro/directory section is historical overnight proof.

## Isolation contract

- Distinct `DATABASE_URL`, `ASSET_UPLOAD_DIR`, `NUXT_PORT` / `PORT`, `NUXT_SESSION_PASSWORD`, `NUXT_AUTH_PASSWORD`, and `APP_ENV`.
- Sibling environments must not share a sqlite file or upload directory.
- Restarting one process must not delete the other environment’s files. Never `docker compose down -v`.
- Reuse `m10a.isolation` + `m10a-{prod|dev}-isolation.txt`. Do not invent a platform registry here.

## Record these first

| Field | Lab PROD | Lab DEV |
|---|---|---|
| Customer slug | `lab-acme` | `lab-acme` |
| Environment type | `PROD` | `DEV` |
| Lab slug | `lab-acme-prod` | `lab-acme-dev` |
| `APP_ENV` | `production` | `dev` |
| Container | `lab-acme-prod-app` | `lab-acme-dev-app` |
| SQLite volume | `lab-acme-prod-sqlite` | `lab-acme-dev-sqlite` |
| Assets volume | `lab-acme-prod-assets` | `lab-acme-dev-assets` |
| Host data root (Nitro proof) | `data/lab-acme-prod/` | `data/lab-acme-dev/` |
| Timezone | America/Denver (lab value only) | America/Denver (lab value only) |
| ADMIN username | `admin` | `admin` |
| ADMIN password | from `.env.lab-acme-prod` / example — **required** | from `.env.lab-acme-dev` / example — **required** |
| Host port | 52040 | 52050 |
| Health | http://127.0.0.1:52040/api/health | http://127.0.0.1:52050/api/health |
| Hosting node | `laptop` | `laptop` |
| Isolation marker | `m10a-prod-isolation` | `m10a-dev-isolation` |

Example env files: `martial_arts_template/.env.lab-acme-prod.example` and `.env.lab-acme-dev.example`. Copy to `.env.lab-acme-prod` / `.env.lab-acme-dev` (gitignored) if you need local overrides. Example placeholders are lab-only, not SaaS defaults. Docker Compose overrides `DATABASE_URL` / `ASSET_UPLOAD_DIR` / container `PORT=5000`; host publish stays 52040/52050.

If those host ports cannot bind, pick two free ports outside 3000, 5000, 5010, 5020, 5030 and the Windows excluded-port list.

**Image (current operator path):** `martial-arts-acquisition:s2`.  
**Image (original 2026-09-09 proof):** `renzo-acquisition:m10a` at code `0ce3e9d`, image `sha256:0f558c6d4e39…`. Do not rewrite that historical evidence.

Record `git rev-parse HEAD` and `docker image inspect martial-arts-acquisition:s2 --format "{{.Id}}"` on later passes.

## Docker procedure (Successful path)

Work in `martial_arts_template`. Linux Docker engine. Helper: `pnpm lab:docker <lab-acme-prod|lab-acme-dev> <build|up|stamp|get|recreate|ps>`.

1. `pnpm lab:docker lab-acme-prod build` (same image for both labs).
2. `pnpm lab:docker lab-acme-prod up`
3. `pnpm lab:docker lab-acme-dev up`
4. GET both health URLs. Require `ok: true` and `database: "reachable"`.
5. `docker inspect` each container. Mounts must be the four lab volume names only.
6. `pnpm lab:docker lab-acme-prod stamp` and the same for `lab-acme-dev`.
7. `pnpm lab:docker … get`. Markers must differ. Neither uploads dir may contain the sibling marker file.
8. Recreate **one** environment: `pnpm lab:docker lab-acme-prod recreate` (never `-v`). Confirm its sqlite/assets persist and the sibling health stays green.
9. `POST /api/auth/login` on each host port with that environment’s ADMIN password. `setup` must fail.

## Historical: host Nitro / directories (2026-09-08)

Overnight S2 used two built Nitro processes and `data/lab-acme-*/` directories, not volumes. That proof still stands as application isolation. It is **not** a substitute for the Docker Successful line.

```text
pnpm lab lab-acme-prod setup && pnpm lab lab-acme-prod stamp
pnpm lab lab-acme-dev setup && pnpm lab lab-acme-dev stamp
pnpm build
pnpm lab lab-acme-prod serve
pnpm lab lab-acme-dev serve
```

## Dry-run result (2026-09-09)

Docker path followed on this laptop. Both containers healthy. Isolation markers and unique upload files did not leak. PROD recreate without `-v` left DEV healthy and both volume contents intact. Distinct ADMIN logins succeeded; `setup` returned 401. Original image name was `renzo-acquisition:m10a`. See [[wip/archive/S2_Docker_Coexist_Evidence]].
