---
type: note
status: current
area: saas
updated: 2026-09-09
tags:
  - wip
  - saas
  - s3
---

# S3 implementation status

S3 **Successful** (2026-09-09). **S4 is not started.**

## Locked defaults (Scott 2026-09-09)

- App: `control_plane/` — Nuxt 4 + Nitro + Vue + Drizzle + SQLite + pnpm + Vitest
- Listen: `127.0.0.1:52100`
- Registration: seed `lab-acme` PROD/DEV + `laptop` node on first setup
- No operator login
- Relaunch = `docker compose up -d --force-recreate --no-deps app` (same as `pnpm lab:docker … recreate`)
- Do not modify `martial_arts_template` unless a proven blocker

## Architecture

```text
Control Plane
├── Registry (own SQLite, later sprint)
├── Health Service (later)
└── Runtime Adapter — local Docker only (later)
```

CRM containers never receive a Docker socket. Health is on-demand.

## Sprint 1

Nuxt skeleton exists. SHA `5ae4e66`.

## Sprint 2

Registry schema + idempotent `lab-acme` seed. UUID ids. Slugs are not primary keys. Tests prove a second `db:setup` keeps the same customer/node ids. SHA `ade96ed`.

## Sprint 3

Read-only dashboard + `GET /api/environments`. Headlines are `Acme BJJ · PROD`, not container ids. No Docker mutation. SHA `800ed64`.

## Sprint 4

Exact-name `docker inspect` only. Leftover `renzo-*` names are refused. Runtime is running / stopped / missing / unknown. SHA `29e9972`.

## Sprint 5

On-demand `/api/health` on registered loopback URLs only. Combined status: Healthy / Stopped / Unhealthy / Unknown. Refresh button. `/trial` 404 is not used as health. SHA `37d19da`.

## Sprint 6

Relaunch uses `compose up -d --force-recreate --no-deps app` only. Live laptop proof 2026-09-09: stamped both labs, relaunched PROD through `relaunchRegisteredEnvironment`, markers stayed `m10a-prod-isolation` / `m10a-dev-isolation`, both `/api/health` green, both Docker health `healthy`. Sibling was not recreated. SHA `0ef11d0`.

## Sprint 7

Runbook, closeout, milestones marked Successful. Live `GET /api/status` returned both healthy headlines. Homepage HTML showed Refresh + Relaunch and no Provision. Browser click-through **NOT VERIFIED**. SHA `cb2664c`.

## Deviations

None yet.

## Security assumption

Laptop-only, loopback bind, no auth. Recorded for the runbook.
