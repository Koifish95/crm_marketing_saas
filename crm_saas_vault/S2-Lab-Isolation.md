---
type: note
status: current
area: saas
updated: 2026-09-08
aliases:
  - Lab isolation
tags:
  - saas
  - s2
---

# S2 lab isolation naming

Hand-boot two martial-arts environments from the same `martial_arts_template` code. No control plane. No `webhosting_renzo_*`. No `renzo-prod-*`.

Primary proof path is two local `pnpm` processes. Docker is optional and was not required to name the roots.

## Lab customer

| Field | PROD | DEV |
|---|---|---|
| Customer slug | `lab-acme` | `lab-acme` |
| Environment type | `PROD` | `DEV` |
| Lab slug | `lab-acme-prod` | `lab-acme-dev` |
| `APP_ENV` | `production` | `dev` |
| Hosting node | `laptop` | `laptop` |
| Data root | `data/lab-acme-prod/` | `data/lab-acme-dev/` |
| SQLite | `data/lab-acme-prod/sqlite/crm.sqlite` | `data/lab-acme-dev/sqlite/crm.sqlite` |
| Uploads | `data/lab-acme-prod/uploads/` | `data/lab-acme-dev/uploads/` |
| Port | 52040 | 52050 |
| Isolation marker | `m10a-prod-isolation` | `m10a-dev-isolation` |

Example env files: `martial_arts_template/.env.lab-acme-prod.example` and `.env.lab-acme-dev.example`. Copy to `.env.lab-acme-prod` / `.env.lab-acme-dev` (gitignored) if you need local overrides. Replace the placeholder ADMIN passwords before treating a login as real.

## Commands

From `martial_arts_template`:

```text
pnpm lab lab-acme-prod setup
pnpm lab lab-acme-prod stamp
pnpm lab lab-acme-prod get
pnpm build
pnpm lab lab-acme-prod serve
```

Same for `lab-acme-dev`. `setup` is migrate + seed and **requires** `NUXT_AUTH_PASSWORD`. `stamp` writes `app_settings.m10a.isolation` and the upload-dir marker file using the existing M10A helpers. `get` prints those markers.

`serve` starts the built Nitro process on the lab port (52040 / 52050 on this laptop; 5040–50559 are often Windows-excluded). Use that to run two environments at once. `dev` also honors the lab port and does not steal 5030, but two Vite processes share `.nuxt` and are not the coexist proof.

## Isolation contract

- Distinct `DATABASE_URL`, `ASSET_UPLOAD_DIR`, `NUXT_PORT` / `PORT`, `NUXT_SESSION_PASSWORD`, `NUXT_AUTH_PASSWORD`, and `APP_ENV`.
- Sibling environments must not share a sqlite file or upload directory.
- Restarting one process must not delete the other environment’s files. Never `docker compose down -v`.
- Reuse `m10a.isolation` + `m10a-{prod|dev}-isolation.txt`. Do not invent a platform registry here.

Operator checklist: [[S2-Hand-Boot-Checklist]] (written in Sprint 5).
