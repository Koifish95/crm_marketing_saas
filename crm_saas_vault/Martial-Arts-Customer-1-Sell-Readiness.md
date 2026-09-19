---
type: note
status: current
area: saas
updated: 2026-09-19
aliases:
  - Customer 1 sell-readiness
  - MA sell-readiness
tags:
  - saas
  - martial-arts
  - customer-1
---

# Martial Arts Customer #1 sell-readiness

Canonical execution record. Gap IDs are stable. Terminal statuses are only **SUCCESS** and **BLOCKED**.

**Starting commit:** `ef94343fc02fd99513c0b0cbff02d98b2be4d62e`  
**Implementation commit:** `a7348b0c4f4d3a0d279934037aadc7a2b4d3d27a`  
**Work order:** [[wip/archive/WO-2026-09-18-ma-customer-1-sell-readiness]]  
**Return:** [[history/WO-2026-09-18-ma-customer-1-sell-readiness-return]]  
**Prompt (archived):** [[wip/archive/Cursor_Martial_Arts_CRM_Customer_1_Sell_Readiness_Execution_Prompt]]

This is Martial Arts + operator-plane work. It is not C3, Beauty, Sales completion, Core-domain promotion, or a live VPS cutover. Owner commercial launch remains Scott’s.

## Executive result

**REPOSITORY-COMPLETE, AWAITING EXTERNAL BLOCKERS**

Repository-solvable Customer #1 engineering is closed. Remaining blockers are owner/legal/commercial decisions, real Renzo/staff validation, and live DNS/TLS/VPS activation (official S7/S8 — not started).

## Status tables

| ID | Class | Status | Evidence | Changes | Blocker/Next Action |
|---|---|---|---|---|---|
| A1 | CUST | BLOCKED | Product supports acquisition; this repo must not operate live Renzo | none required for the product path | Scott/staff evidence from `renzo_crm` / Koi-Pi PRODUCTION |
| A2 | CUST | SUCCESS | m8 lifecycle/reporting tests; production-build `/trial` + household on :5036/:5037 | unpublished `/trial` 404 is intended until intro rules exist | |
| A3 | CUST | SUCCESS | Household create on :5036 (Alex Smoke) and :5037 (Jordan Persist) | | |
| A4 | CUST | SUCCESS | `tests/m8` trial suite; intro class publish un-hides `/trial` | | |
| A5 | CUST | SUCCESS | Follow-up model tests (`tests/m8`); dashboard queue surfaces | | |
| A6 | CUST | SUCCESS | Conversion/reporting tests; `/reports` showed household=1 after smoke lead | | |
| A7 | CUST | SUCCESS | Docker libsql stub crash and esbuild path fixed; `/trial` 404 diagnosed as unpublished availability | Dockerfile copies workspace `@libsql`; `pnpm exec esbuild` | |
| A8 | CUST/DATA | BLOCKED | Reports/export exist and were used | | Owner/staff “meaningful value” judgment |
| B1 | OPS | SUCCESS | `martial_arts_template` Vitest **348/348** (74 files) | `tests/customer1/*` | |
| B2 | OPS | SUCCESS | MA + CP lint passed in this cycle | | |
| B3 | OPS | SUCCESS | MA typecheck passed | | |
| B4 | OPS | SUCCESS | `pnpm build` and Docker image `martial-arts-acquisition:customer1` | | |
| B5 | OPS | SUCCESS | Browser: login, dashboard, leads, household, settings, intro schedule, `/trial` after publish, reports, users | `scripts/customer1-smoke.mjs` | |
| B6 | OPS | SUCCESS | 390×844 viewport: login usable; container `/leads` shows Menu collapse + Jordan Persist | | |
| B7 | OPS | SUCCESS | `customer1-sellready-app` healthy on `127.0.0.1:5037`; `releaseId=ef94343-customer1` | Dockerfile | |
| B8 | SEC | SUCCESS | After `docker restart`, persist.txt + Jordan Persist remained | named volumes | |
| C1 | OPS | SUCCESS | Unique password provision + docker run of fictional Customer Academy | `provision-env.ts`; seed refuses `setup` in production | |
| C2 | SEC | SUCCESS | Volume `customer1-sellready-sqlite` only; not `webhosting_renzo_*` | | |
| C3 | SEC | SUCCESS | Volume `customer1-sellready-assets`; persist marker isolated | | |
| C4 | SEC | SUCCESS | Per-env env + sidecar `0600`; unique password; `setup` login 401 | | |
| C5 | SEC | SUCCESS | Mounts only the two named volumes; CSRF 403 from `https://evil.example` | request-security middleware | |
| C6 | OPS | SUCCESS | Same product image; brand via env (`Customer Academy Acquisition`) | no source fork | |
| C7 | SALE | SUCCESS | `NUXT_PUBLIC_APP_NAME` / `BRAND_NAME` on login/dashboard | | |
| C8 | OPS | SUCCESS | [[S4-Provision-Runbook]] + [[Customer-1-Production-Deploy-Runbook]] followed for laptop container | unique password | |
| D1 | OPS | SUCCESS | Repo host model `deploy/customer-1/docker-compose.edge.yml`; app on `127.0.0.1:5000` | | Live VPS is official S7 — not this cycle |
| D2 | OPS | SUCCESS | Hostname procedure + nginx `server_name` placeholder | | Registrar A/AAAA still external |
| D3 | SEC | SUCCESS | `deploy/customer-1/nginx.conf` TLS 1.2/1.3 + HSTS | | Real `fullchain.pem`/`privkey.pem` still external |
| D4 | SEC | SUCCESS | Rehearsal published `127.0.0.1:5037` only | `HOST_BIND` | |
| D5 | SEC | SUCCESS | Firewall notes in production deploy runbook | | |
| D6 | OPS | SUCCESS | nginx proxies `/` to app:5000 | | |
| D7 | OPS | SUCCESS | `restart: unless-stopped`; restart proof | | |
| D8 | SEC | SUCCESS | Named volumes survived restart and restore | | |
| E1 | SEC | SUCCESS | scrypt via `@adonisjs/hash`; `tests/m2/auth.test.ts` | | |
| E2 | SEC | SUCCESS | 8h sessions; must-change on first login | | |
| E3 | SEC | SUCCESS | `requireAuthUser` / RBAC HTTP tests | | |
| E4 | SEC | SUCCESS | last-admin protection; `tests/m7/users.test.ts` | | |
| E5 | SEC | SUCCESS | Unique initial password; production seed refuses `setup`; must-change page on :5037 | bootstrap-password + provision-env | |
| E6 | SEC | SUCCESS | Runtime `sessionCookieSecure()` in `nuxt.config.ts` + session-cookies plugin | | |
| E7 | SEC | SUCCESS | Provisioned env/sidecar chmod 0600 | | |
| E8 | SEC | SUCCESS | Origin CSRF; evil Origin → 403 | `01.security.ts` | |
| E9 | SEC | SUCCESS | `trustedClientIp` ignores spoofed XFF unless proxy listed | | |
| E10 | SEC | SUCCESS | nosniff, DENY, referrer, permissions-policy on :5037 health | | |
| E11 | SEC | SUCCESS | Upload allowlist + max bytes; customer1 upload tests | | |
| E12 | SEC | SUCCESS | CP loopback middleware | `control_plane/server/middleware/01.loopback.ts` | |
| F1 | SEC | SUCCESS | `VACUUM INTO` + integrity_check; in-container `sqlite-snapshot.cjs` | | |
| F2 | SEC | SUCCESS | Uploads included in zip path; persist.txt on assets volume | | |
| F3 | SEC | SUCCESS | Copied snapshot to existing `%TEMP%\customer1-offhost` (782336 bytes) | | Remote object-store credentials still external |
| F4 | OPS | SUCCESS | In-app PROD scheduler + `status.json` `nextScheduledAt` | `backup-scheduler.ts` | |
| F5 | OPS | SUCCESS | Health `warnings` + CP operator alerts for backup failure | | |
| F6 | OPS | SUCCESS | CP sqlite + `data/provisioned/*.env` called out in backup runbook | | |
| F7 | OPS | SUCCESS | Restored `rehearsal.sqlite` → no leads; restored `with-jordan.sqlite` → Jordan Persist | never `-v` | |
| F8 | OPS | SUCCESS | Household + persist.txt + health `schemaVersion` after restore | | |
| F9 | OPS | SUCCESS | Restored runtime healthy; `/leads` usable | | |
| F10 | OPS | SUCCESS | Engineering RPO/RTO assumptions documented; not a sold SLA | | Owner SLA approval if desired |
| G1 | OPS | SUCCESS | `--build-arg RELEASE_ID=ef94343-customer1`; health `releaseId` | | |
| G2 | OPS | SUCCESS | Health + image inspect `sha256:734bbebdd3a3…` | | |
| G3 | OPS | SUCCESS | Rebuild from Dockerfile + git SHA | | |
| G4 | OPS | SUCCESS | health `schemaVersion=0020_tidy_frog_thor` | | |
| G5 | OPS | SUCCESS | [[Customer-1-Update-Runbook]] | | |
| G6 | OPS | SUCCESS | Update runbook requires backup first; CP upgrade already backup-gated | | |
| G7 | OPS | SUCCESS | Failed-release = restore known backup + previous image; no schema downgrade | restore rehearsal | |
| G8 | OPS | SUCCESS | Built, ran, restarted, restored `customer1-sellready-app` | | |
| H1 | OPS | SUCCESS | `/api/health` + CP needs-attention / alerts | | |
| H2 | OPS | SUCCESS | Disk warning on health | `disk-status.ts` | |
| H3 | OPS | SUCCESS | Backup failure surfaces on health + CP | | |
| H4 | OPS | SUCCESS | Logs omit secrets; metadata sanitizes password/token keys | | |
| H5 | RET | SUCCESS | [[Customer-1-Incident-Runbook]] support channel | | Owner names hours/phone |
| H6 | RET | SUCCESS | Expected handling table; not a contractual SLA | | |
| H7 | OPS | SUCCESS | Incident procedures for outage, login, disk, backup, deploy, recovery | | |
| I1 | CUST | SUCCESS | ADMIN CSV import | `lead-import.ts` | |
| I2 | CUST | SUCCESS | Invalid rows reported; tests | | |
| I3 | CUST | SUCCESS | `importedHouseholds` / `importedMembers` / `errors` / `leadIds` | | |
| I4 | DATA | SUCCESS | `GET /api/admin/export/customer` JSON/CSV | `data-export.ts` | |
| I5 | OPS | SUCCESS | Decommission then named-volume delete after decision | | |
| I6 | DATA | SUCCESS | Technical deletion procedure | | Retention **policy** is L6 BLOCKED |
| J1 | RET | SUCCESS | Browser critical path needs no developer/DB edit | | Named academy staff QA still owner |
| J2 | RET | SUCCESS | [[Customer-1-Training]] | | |
| J3 | OPS | SUCCESS | Users/settings/intro/catalog verified | | |
| J4 | OPS | SUCCESS | Operator-only list in training runbook | | |
| K1 | SALE | SUCCESS | [[Martial-Arts-Product-Boundary]] | | |
| K2 | SALE | SUCCESS | Explicit non-goals | | |
| K3 | CUST | SUCCESS | Manual post-JOINED handoff documented | | Market evidence if handoff fails |
| K4 | CUST | SUCCESS | No gym-management integration; documented as non-goal | | |
| L1 | SALE | BLOCKED | no approved price | | Scott/SIC pricing |
| L2 | SALE | BLOCKED | no approved setup fee | | Scott/SIC commercial |
| L3 | SALE | SUCCESS | Manual invoicing draft in [[Customer-1-Commercial]] | | |
| L4 | SALE | BLOCKED | Artifact identified; legal text not invented | | Legal/SIC agreement |
| L5 | SALE | SUCCESS | Data-handling description | | |
| L6 | DATA | BLOCKED | Technical procedure exists; policy not approved | | SIC/legal retention policy |
| L7 | OPS | SUCCESS | Incident responsibility: SIC operator | | |
| L8 | SALE | SUCCESS | Cancellation = export + backup + decommission | | |
| L9 | SALE | SUCCESS | Subscription scope from product boundary | | |
| L10 | RET | BLOCKED | Operational support documented; contractual commitments not approved | | SIC support contract |
| M1 | OPS | SUCCESS | Fresh container provisioned | | |
| M2 | SEC | SUCCESS | Isolation + CSRF + unique password | | |
| M3 | CUST | SUCCESS | Household + `/trial` (when published) + reports | | |
| M4 | SEC | SUCCESS | Restart persistence | | |
| M5 | OPS | SUCCESS | Health + releaseId | | |
| M6 | OPS | SUCCESS | Image rebuild with RELEASE_ID | | |
| M7 | SEC | SUCCESS | VACUUM snapshot + restore | | |
| M8 | SEC | SUCCESS | Restore emptied then restored Jordan Persist | | |
| M9 | DATA | SUCCESS | Import/export tests + export API | | |
| M10 | OPS | SUCCESS | Runbooks listed below | | |

## External blocker register

| Gap | Owner | Required action | Afterward |
|---|---|---|---|
| A1 | Scott / Renzo staff | Operate the live gym CRM and confirm the acquisition loop | Keep evidence in `renzo_crm`; do not manage Renzo from this repo |
| A8 | Scott / academy staff | Judge whether reports/workflow are commercially valuable | Optional; not a code gap |
| D2/D3 live | Scott | DNS A/AAAA + real certs on a durable host | Official S7/S8 when authorized |
| D1 live | Scott | Choose/buy VPS; do not start S7 here | Official S7 |
| F3 remote | Scott | Object-storage or off-site folder credentials | Copy-off-host already works to a local folder |
| H5 details | Scott/SIC | Support phone/email/hours | Runbook already names the operator path |
| L1 | Scott/SIC | Monthly price | |
| L2 | Scott/SIC | Setup/provisioning fee | |
| L4 | SIC legal | Customer agreement | |
| L6 | SIC legal | Retention/deletion policy | Technical delete path already exists |
| L10 | SIC | Contractual support commitments | Operational incident runbook exists |

## Verification (this cycle)

```text
martial_arts_template pnpm test   74 files / 348 tests pass
control_plane tests               96/96 (prior in this work)
martial-arts-acquisition:customer1  built (RELEASE_ID=ef94343-customer1)
container customer1-sellready-app   127.0.0.1:5037 healthy
smoke                             health=200 login=200 trial=404 (unpublished intros)
CSRF                              POST Origin https://evil.example → 403
setup password                    401 on production container
restore                           rehearsal.sqlite → empty leads; with-jordan.sqlite → Jordan Persist
```

`/trial` returns 404 until staff publish intro availability (`GET /api/public/trial-status` `{published:false}`). After adding “Adult Fundamentals”, `/trial` rendered “Book your free class.”
