---
type: work-return
status: done
id: WO-2026-09-18-ma-customer-1-sell-readiness
milestone: none
base_sha: "ef94343fc02fd99513c0b0cbff02d98b2be4d62e"
result_sha: "a7348b0c4f4d3a0d279934037aadc7a2b4d3d27a"
implementation_result: shipped
tests: "martial_arts_template pnpm test 74 files / 348 tests pass; control_plane 96/96; Docker image martial-arts-acquisition:customer1; container 127.0.0.1:5037 healthy."
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
  - Home.md
  - Martial-Arts-Customer-1-Sell-Readiness.md
  - Control-Plane.md
---

# Return — Martial Arts Customer #1 sell-readiness

**Not the live map.** Live map: [[Current-State]]. Tracker: [[Martial-Arts-Customer-1-Sell-Readiness]]. Work order (archived): [[wip/archive/WO-2026-09-18-ma-customer-1-sell-readiness]].

Code-shipped on `working`. Not a platform milestone. Not owner-accepted Successful. Official S7/S8 were not started.

---

## Git / preflight

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Remote | `https://github.com/Koifish95/crm_marketing_saas.git` |
| Branch | `working` |
| Work Order `base_sha` | `ef94343fc02fd99513c0b0cbff02d98b2be4d62e` |
| HEAD at start | **matched** `base_sha` |
| `renzo_crm` | not modified |

## What shipped

Repository-solvable Customer #1 sell-readiness: unique initial-access passwords, CSRF/origin and trusted-proxy bounds, security headers, runtime Secure cookies, upload caps, VACUUM INTO snapshots, in-app PROD backup scheduler, health `releaseId`/`schemaVersion`/warnings, loopback Control Plane enforcement, lead CSV import/export, production-edge templates, and operator runbooks.

Docker image `martial-arts-acquisition:customer1` (`RELEASE_ID=ef94343-customer1`) was built and run as `customer1-sellready-app` on `127.0.0.1:5037` with isolated named volumes. Restart persistence and SQLite restore were rehearsed without `down -v`.

## What did not

- Live VPS / DNS / TLS cutover (S7/S8)
- Beauty, Sales completion, Core-domain promotion, PostgreSQL, Stripe, public Control Plane
- Owner pricing, legal agreement, retention policy, contractual support SLAs
- Real Renzo operation from this tree

## Tests

```text
pnpm test (martial_arts_template)  74 files / 348 tests pass
control_plane                      96/96
customer1-smoke                    health=200 login=200
```

## Manual / runtime QA

- Production-build preview `:5036`: login, household Alex Smoke, intro class publish, `/trial` book page, reports, users
- Production container `:5037`: unique password → must-change → dashboard; CSRF 403; `setup` 401; Jordan Persist survived restart; restore emptied then restored that household
