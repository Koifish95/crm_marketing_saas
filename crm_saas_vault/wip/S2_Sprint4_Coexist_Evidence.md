---
type: note
status: current
area: saas
updated: 2026-09-08
tags:
  - saas
  - s2
---

# S2 Sprint 4 coexist evidence

Laptop, 2026-09-08. Same `martial_arts_template` build, two Nitro processes, two data roots. Hosting node: `laptop`. Docker Linux engine was present; Compose was **not** used (that is milestone S4, not this proof).

## Boots

| Lab | Port | Health | `appEnv` | SQLite | Isolation |
|---|---|---|---|---|---|
| lab-acme-prod | http://127.0.0.1:52040/api/health | `ok: true`, database reachable | production | `data/lab-acme-prod/sqlite/crm.sqlite` | `m10a-prod-isolation` |
| lab-acme-dev | http://127.0.0.1:52050/api/health | `ok: true`, database reachable | dev | `data/lab-acme-dev/sqlite/crm.sqlite` | `m10a-dev-isolation` |

5040/5050 are examples in the overnight plan. This laptop excludes ~50360–50759 (and neighbors), so the lab examples use **52040 / 52050**.

Health `app` is still `Renzo Gracie Kaysville Acquisition` (display leftover; Sprint 6).

## Isolation

- PROD upload dir has `m10a-prod-isolation.txt` and does **not** have the DEV marker.
- DEV upload dir has `m10a-dev-isolation.txt` and does **not** have the PROD marker.
- `pnpm lab <slug> get` reads matching `app_settings.m10a.isolation` values.

## Restart without destroying B

1. Stopped the PROD listener (PID on 52040). Did **not** delete files and did **not** `down -v`.
2. DEV `/api/health` stayed green. Both sqlite files and both markers remained.
3. Relaunched PROD (`pnpm lab lab-acme-prod serve`). Both health endpoints green again. Markers unchanged.

## Commands used

```text
pnpm lab lab-acme-prod setup && pnpm lab lab-acme-prod stamp
pnpm lab lab-acme-dev setup && pnpm lab lab-acme-dev stamp
pnpm build
pnpm lab lab-acme-prod serve
pnpm lab lab-acme-dev serve
```
