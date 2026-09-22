---
type: note
status: current
area: control-plane
updated: 2026-09-20
tags:
  - saas
  - control-plane
  - ux
---

# Control Plane operator UX audit

Investigation for archived [[wip/archive/WO-2026-09-19-cp-operator-experience]]. Live walkthrough 2026-09-19 against http://127.0.0.1:52100 on branch `working` at `5e26fe8`. Implementation return: [[history/WO-2026-09-19-cp-operator-experience-return]] (code-shipped 2026-09-20; not official S-track Successful).

Live laptop registry (gitignored sqlite, not product law): **5 customers**, **12 environments** (6 PROD / 6 DEV), **2 healthy / 10 stopped / 0 unhealthy / 0 missing**, **1 hosting node** (`laptop`). Accounts present: Acme BJJ, Strategic Insights Consulting, LLC, Still Beauty, LLC, Alianna's Baked Goods, C2 QA Test. C2 QA Test already owns two product instances, so two PROD rows and two DEV rows share the same customer name.

Do not treat Still Beauty / Alianna rows as a Beauty product. They are Martial Arts (or Sales) instances on this laptop registry.

---

## Method

- Read canonical vault: [[Current-State]], [[Control-Plane]], [[Customer-Environment]], [[Product-Release-Update-Lifecycle]], S3/S4/S6 runbooks, hosting-node notes, `docs/` operator package.
- Read `control_plane/` schema, APIs, pages, fleet utils, Docker relaunch/decommission, backup/restore/upgrade.
- Browser walkthrough of Dashboard, Customers, Environments, Settings.
- Did **not** operate live Renzo, Koi-Pi, or `webhosting_renzo_*`.

---

## Findings

### CP-UX-001 — Dashboard is a count strip, not an operations console
- **Severity:** HIGH
- **Screen:** Dashboard
- **Current:** Nine numeric cards plus “Needs attention” limited to unhealthy / unknown / missing / failed. Stopped PROD (10 of 12 live) is invisible as attention. No backup age, no off-host gap, no release mismatch, no failed provision queue, no recent activity.
- **Operator problem:** Cannot answer “what needs me?” without opening every environment.
- **Desired:** Attention queue from truthful data; fleet summary that includes lifecycle and inactive customers.
- **This milestone:** yes

### CP-UX-002 — No operator activity log
- **Severity:** HIGH
- **Screen:** Dashboard / environment workspace
- **Current:** No `operator_events` (or equivalent). Operator cannot see what was started, backed up, upgraded, or decommissioned.
- **Operator problem:** Relies on memory, Docker, and sqlite.
- **Desired:** Small append-only event table, shown on dashboard and environment History.
- **This milestone:** yes

### CP-UX-003 — Customer list has search only
- **Severity:** HIGH
- **Screen:** Customers
- **Current:** Search on name/slug. No active/inactive filter (no status column). No product filter. No sort. Columns: Customer, Slug, Products, Envs, Overall. Overall conflates runtime with lifecycle.
- **Operator problem:** Five accounts already mix pilots, QA, and sister-business placeholders. Default view will drown in cancelled accounts.
- **Desired:** Search, sort, active/inactive, product filter, instance/env counts, last issue.
- **This milestone:** yes

### CP-UX-004 — Customer has no deactivate/reactivate
- **Severity:** HIGH
- **Screen:** Customer workspace → Configuration
- **Current:** “Decommission customer” bulk-removes processes for every environment. Volumes stay. There is no INACTIVE account state. Customer row always appears in the default list.
- **Operator problem:** Cancellation looks like infrastructure teardown. History identity is not a first-class lifecycle.
- **Desired:** ACTIVE → INACTIVE without deleting the account. Decommission remains a distinct environment-process action.
- **This milestone:** yes
- **Not in scope:** Permanent customer deletion (document as later/privacy).

### CP-UX-005 — Product instances are a tab, not a fleet object
- **Severity:** HIGH
- **Screen:** Customer → Products; no `/products` nav
- **Current:** Instance table shows PROD/DEV badges and count. No dedicated workspace. No instance deactivate. Unique `(customer, product)` means a cancelled Sales product still blocks adding Sales again — which is correct if identity is kept, but there is no Inactive state to express “they cancelled Sales, keep Martial Arts.”
- **Operator problem:** C2 QA Test’s two products are easy to miss; environment list shows two “PROD” links with the same customer name.
- **Desired:** Product Instances index + instance lifecycle ACTIVE/INACTIVE. Identity retained.
- **This milestone:** yes

### CP-UX-006 — Environment fleet is already messy
- **Severity:** CRITICAL
- **Screen:** Environments
- **Current (live):** 12 rows. Search + Type filter only. No product/lifecycle/runtime/backup/release/hostname filters. No sort. Env link text is often just **PROD** or **DEV**. Two C2 QA Test PROD rows are indistinguishable from the link name. Columns omit lifecycle, schema, last backup, hostname, attention. Start All / Stop All ignore the visible filter (documented, still easy to misuse). `window.confirm` for bulk stop.
- **Operator problem:** Cannot find “stopped Sales PROD without backup” without hunting.
- **Desired:** Search across customer/product/name/slug/hostname/node; filters with clear-all; sort; columns that match operator questions; default hide archived.
- **This milestone:** yes

### CP-UX-007 — Environment workspace mixes operations
- **Severity:** HIGH
- **Screen:** Environment detail
- **Current:** Tabs Overview / Runtime / Lifecycle / Configuration. Lifecycle tab contains Start, Stop, Backup, off-host copy, Restore, Upgrade. Decommission is on Configuration. Hostname is on Overview. No History. No Archive & Delete. No explicit “what remains / what is removed.” Confirmations are checkboxes plus some `window.confirm`.
- **Operator problem:** High-risk restore/upgrade sit next to routine Start. Retirement path is incomplete.
- **Desired:** Overview, Runtime, Backup & Recovery, Release, Network, History. Risk-proportionate dialogs. Stop ≠ Decommission ≠ Archive & Delete.
- **This milestone:** yes

### CP-UX-008 — No Archive & Delete
- **Severity:** CRITICAL
- **Screen:** Environment configuration
- **Current:** Decommission = `compose rm -f --stop app`, lifecycle `decommissioned`, **volumes stay**. There is no exact-volume retirement, no final-backup gate, no retained archive metadata, no strong type-the-slug confirmation.
- **Operator problem:** Cannot fully retire a throwaway environment without raw `docker volume rm` (and the temptation to prune).
- **Desired:** Gated Archive & Delete: stop → final backup → verify → optional/required off-host → record metadata → remove process → remove **exact** registered volumes → `archived` row remains. Never prune, never `-v`, never siblings, never Renzo names.
- **This milestone:** yes

### CP-UX-009 — Backup/recovery is buried
- **Severity:** HIGH
- **Screen:** Environment Lifecycle tab only
- **Current:** Last backup, zip path, off-host on the env. No fleet backup posture. Restore rules exist and are server-gated (good). 14-day retention already decided.
- **Operator problem:** Cannot see which PROD has no backup or no off-host copy.
- **Desired:** Backups index + per-env Backup tab. Do not change zip format.
- **This milestone:** yes

### CP-UX-010 — Release/update path is a target-image field
- **Severity:** HIGH
- **Screen:** Environment Lifecycle
- **Current:** Expected vs running image and release/schema show on Overview. Upgrade is a text field + button. DEV-before-PROD gating exists server-side. No instance-level “DEV is X, PROD is Y” comparison. No last upgrade event.
- **Operator problem:** Safe path is in runbooks, not the console.
- **Desired:** Release section with mismatch, backup readiness, explicit upgrade. No mass deploy.
- **This milestone:** yes

### CP-UX-011 — Reports do not exist
- **Severity:** MEDIUM
- **Screen:** none
- **Current:** Dashboard counts only. Disk warning if free <15% or <2GB. No customers-by-product, no backup posture, no environments-by-release.
- **Operator problem:** Fleet questions require spreadsheets.
- **Desired:** Reports from current registry + observe + backups. No fake uptime %.
- **This milestone:** yes

### CP-UX-012 — Hosting node is a thin table
- **Severity:** MEDIUM
- **Screen:** Hosting Nodes
- **Current:** Name, ID, kind, driver, env count, overall. Detail lists envs. No port table, no running/unhealthy split, no “VPS not live-proven” honesty.
- **Desired:** Counts, ports, warnings that are knowable. Do not pretend the VPS is live.
- **This milestone:** yes

### CP-UX-013 — Settings is empty
- **Severity:** MEDIUM
- **Screen:** Settings
- **Current:** “Nothing to manage here yet.”
- **Operator problem:** Control Plane registry backup API exists (`POST /api/control-plane/backup`) with no UI. Loopback listen facts are undocumented in-app.
- **Desired:** Useful operator settings: listen address, node identity, registry backup. Do not fake operator login.
- **This milestone:** yes

### CP-UX-014 — Navigation does not match operator mental model
- **Severity:** HIGH
- **Screen:** Primary nav
- **Current:** Dashboard, Customers, Environments, Hosting Nodes, Settings.
- **Desired:** Add Product Instances, Backups, Reports only because they have real data. Do not add empty nav.
- **This milestone:** yes

### CP-UX-015 — Destructive UX uses `window.confirm` and checkboxes
- **Severity:** HIGH
- **Screen:** Environments bulk stop; env restore/decommission
- **Current:** Browser confirm for bulk stop. Checkbox for stop/restore/decommission. No type-the-slug. Danger actions use `.secondary` (white) not a distinct destructive style.
- **Desired:** In-app confirm dialogs proportional to risk. Archive requires slug + phrase.
- **This milestone:** yes

### CP-UX-016 — Loopback gate rejected Windows local Chrome
- **Severity:** HIGH
- **Screen:** http://127.0.0.1:52100 (also localhost)
- **Current (before this milestone’s loopback patch):** `01.loopback.ts` compared `socket.remoteAddress` to three exact strings. Windows IPv6-mapped `::FFFF:127.0.0.1` and Vite missing-socket + loopback `X-Forwarded-For` became a 403 painted as 500.
- **Operator problem:** Cannot open the operator product on the laptop it binds to.
- **Desired:** Normalize loopback forms; still refuse real remote IPs. Do not set `CONTROL_PLANE_ALLOW_REMOTE` for daily use.
- **This milestone:** yes (patch already started in this chat)

### CP-UX-017 — Attention ignores backup and stopped PROD
- **Severity:** MEDIUM
- **Screen:** Dashboard Needs attention
- **Current:** `needsAttention()` is failed / unhealthy / unknown / missing. Stopped is normal-looking. No backup alerts except health-body “backup failed” strings.
- **Desired:** Attention for failed provision, unhealthy, missing (non-archived), PROD with no/stale backup, PROD with no off-host copy, DEV/PROD release mismatch. Do not treat every stopped DEV as an outage.
- **This milestone:** yes

### CP-UX-018 — Diagnostics require Docker/SQLite for routine facts
- **Severity:** MEDIUM
- **Screen:** Environment Configuration (read-only compose/volume fields exist)
- **Current:** Volume names, compose, ports are on Configuration. Provision error is truncated on customer products tab. No copy-friendly diagnostic block on Overview. No link to operator docs.
- **Desired:** Keep diagnostic fields; surface provision errors and exact resource names on Overview; link `docs/11` / `docs/14`.
- **This milestone:** yes

### CP-UX-019 — Pause is not a real runtime state
- **Severity:** LOW
- **Current:** Stop = `compose stop app`. No distinct pause.
- **Desired:** Do not invent Pause.
- **This milestone:** no (explicit non-action)

### CP-UX-020 — TLS/edge health is only partly knowable
- **Severity:** MEDIUM
- **Current:** PROD hostname write regenerates nginx templates. Live cert issuance is official S8 / external.
- **Desired:** Show hostname, origin, “edge files generated vs live TLS unknown.” Do not fabricate cert expiry.
- **This milestone:** yes (honest status only)
- **BLOCKED — LIVE INFRASTRUCTURE REQUIRED:** real DNS/TLS validation

### CP-UX-021 — Bulk destructive operations
- **Severity:** HIGH (safety)
- **Current:** Bulk start/stop only. No bulk restore/upgrade/delete.
- **Desired:** Keep bulk start/stop. Do not add bulk Archive, restore, or PROD upgrade. Skip bulk backup (slow, easy to hit PROD without per-env backup gate UX).
- **This milestone:** retain start/stop; refuse new bulk destructive

### CP-UX-022 — Responsive tables
- **Severity:** MEDIUM
- **Current:** `.table-wrap { overflow-x: auto }` and stacked nav under 48rem. Long image tags will overflow. No action menus.
- **Desired:** Horizontal scroll, wrap filters, dialogs usable at narrow width. Desktop-first density.
- **This milestone:** yes

---

## Implementation scope for this milestone

In scope: CP-UX-001–018, 020 (honest), 021 (keep safe bulk), 022, 016.

Out of scope: Pause; permanent customer delete; Prometheus; live VPS/DNS/TLS; Beauty/C3; zip format change; backup retention duration (keep 14 days).

## Lifecycle model to implement

```text
Customer:     active ⇄ inactive
Product:      active ⇄ inactive   (identity kept; unique customer+product remains)
Environment:
  provisioning → ready | failed
  ready: Start / Stop / Relaunch
  failed/provisioning: Retry
  ready → decommissioned   (process gone, volumes stay)
  decommissioned or ready → archived   (Archive & Delete: volumes gone, row remains)
```

Stop never sets decommissioned or archived.

## Open business item (not decided here)

Backup retention duration remains 14 days as already implemented. Longer archive-backup retention is a future policy decision.
