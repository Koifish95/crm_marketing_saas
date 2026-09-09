---
type: note
status: current
area: saas
updated: 2026-09-09
aliases:
  - Lab isolation
tags:
  - saas
  - s2
---

# S2 lab isolation naming

Hand-boot two martial-arts environments from the same `martial_arts_template` code. No control plane. No `webhosting_renzo_*`. No `renzo-prod-*`.

Successful proof path is two Docker containers with named lab volumes. Host Nitro + `data/lab-acme-*/` remains a valid earlier isolation proof.

## Lab customer

| Field | PROD | DEV |
|---|---|---|
| Customer slug | `lab-acme` | `lab-acme` |
| Environment type | `PROD` | `DEV` |
| Lab slug | `lab-acme-prod` | `lab-acme-dev` |
| `APP_ENV` | `production` | `dev` |
| Hosting node | `laptop` | `laptop` |
| Container | `lab-acme-prod-app` | `lab-acme-dev-app` |
| SQLite volume | `lab-acme-prod-sqlite` | `lab-acme-dev-sqlite` |
| Assets volume | `lab-acme-prod-assets` | `lab-acme-dev-assets` |
| Host data root (Nitro proof) | `data/lab-acme-prod/` | `data/lab-acme-dev/` |
| Port | 52040 | 52050 |
| Isolation marker | `m10a-prod-isolation` | `m10a-dev-isolation` |

Example env files: `martial_arts_template/.env.lab-acme-prod.example` and `.env.lab-acme-dev.example`. Copy to `.env.lab-acme-prod` / `.env.lab-acme-dev` (gitignored) if you need local overrides. Replace the placeholder ADMIN passwords before treating a login as real.

## Commands

From `martial_arts_template`:

```text
pnpm lab:docker lab-acme-prod build
pnpm lab:docker lab-acme-prod up
pnpm lab:docker lab-acme-prod stamp
pnpm lab:docker lab-acme-prod get
pnpm lab:docker lab-acme-prod recreate
```

Same slug swap for `lab-acme-dev`. Recreate never uses `-v`. Host Nitro commands (`pnpm lab … setup|serve`) remain for the 2026-09-08 directory proof.

## Isolation contract

- Distinct `DATABASE_URL`, `ASSET_UPLOAD_DIR`, `NUXT_PORT` / `PORT`, `NUXT_SESSION_PASSWORD`, `NUXT_AUTH_PASSWORD`, and `APP_ENV`.
- Sibling environments must not share a sqlite file or upload directory.
- Restarting one process must not delete the other environment’s files. Never `docker compose down -v`.
- Reuse `m10a.isolation` + `m10a-{prod|dev}-isolation.txt`. Do not invent a platform registry here.

Operator checklist: [[S2-Hand-Boot-Checklist]] (written in Sprint 5).
