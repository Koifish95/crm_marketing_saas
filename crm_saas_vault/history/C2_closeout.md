---
type: note
status: historical
area: process
updated: 2026-09-15
aliases:
  - C2 closeout
  - C2 Successful
tags:
  - history
  - saas
  - c2
---

# C2 closeout

Definitive record of Milestone **C2 — Sales as second Core consumer + Control Plane product catalog**. Written 2026-09-15 after Scott’s owner acceptance.

**Not the live map.** Live map: [[Current-State]]. Decisions: [[SaaS-Decisions#2026-09-15 — Official C2 is Successful]]. Work order (archived): [[wip/archive/WO-2026-09-14-c2-product-instance-sales-catalog]]. Implementation return: [[history/WO-2026-09-14-c2-product-instance-sales-catalog-return]]. Owner QA checklist: [[history/C2_owner_qa]].

This closeout does **not** authorize C3, Beauty, S7, S8, SI migration/cutover, Core promotion, Option C, billing, VPS, or DNS/TLS.

---

## 1. Successful

Control Plane Product Instances plus a hybrid Martial Arts / Sales catalog, with Sales provisionable as `crm-sales:c2`. Owner-accepted by Scott on **2026-09-15** after disposable-account owner QA (`C2 QA Test`) and two QA-discovered remediations.

Proven composition:

```text
Customer Account
├── Martial Arts Product Instance
│   ├── PROD
│   └── DEV
└── Sales Product Instance
    ├── PROD
    └── DEV
```

---

## 2. What exists

| Item | Value |
|---|---|
| Identity | Customer Account → Product Instance → Environments |
| Schema | `product_instances`; `environments.product_instance_id`; migration `0004_product_instances` |
| Catalog | Hybrid in CP code: `martial-arts` → `martial-arts-acquisition:s4`; `sales` → `crm-sales:c2`. No Beauty |
| Account create | Account only (`industry_template` sentinel `unassigned`); zero environments |
| Add product | Explicit `productId`; default PROD+DEV; HTTP returns after registry insert; Docker provision is background |
| One PROD | Per Product Instance, not per Customer Account |
| New env names | `{customer}-{productId}-{type}`; backfill keeps historical `{customer}-{type}` names |
| Sales image | `crm-sales:c2` |
| Sales artifacts | `SALES_PROPOSALS_DIR=/app/data/uploads/proposals` on the assets volume |
| Restore | Selectable `backupId`; same-env rollback; same-customer/same-product PROD→DEV copy-down; never DEV→PROD |
| Proof account | Disposable **C2 QA Test** (`c2-test`). lab-acme / SI were not the C2 proof |

Existing Martial Arts rows backfill as one Martial Arts instance **without** renaming slug / container / compose / volumes / image / host port.

---

## 3. Git (implementation that actually shipped)

| Commit | Role |
|---|---|
| `35c4aca8c0e02533f8e2278ade1bd6b3c513e025` | Work Order `base_sha` |
| `43454fa08a53975fa509c1871cc53c850cc1e4ba` | Feature: Product Instances + Sales catalog |
| `db7af34da661ea2b0a0a7aa2c284e5fe377b9e30` | QA remediation: provisioning visibility + recoverable failed Sales + Sales Docker |
| `ded805c35a6c63f8b9648720c890f4e34f3b6efa` | QA remediation: selectable restore + PROD→DEV copy-down |
| `6e82c15b811289a5236898e427fc8a166aa4998e` | Record restore-selection SHA |
| `68b4199e7a17624a28f564be64d19180965c6e1f` | Successful closeout (docs/state only) |

SHA-record commits `b75044e` and `fc1f556` document the feature and provisioning remediations. Do not treat `43454fa` as the entire finished C2 implementation.

---

## 4. QA-discovered remediations (preserve, do not sanitize)

### Provisioning visibility / partial Sales

Owner QA on **C2 QA Test** found long-running Add Product Instance looked dead (HTTP awaited `docker build`), and a Sales unique-constraint orphan with no containers. Fix: insert returns immediately; provision is in-process background; image failures mark only those envs `failed` with `provision_error`; Retry continues the same rows/volumes (no `-v`). Sales Dockerfile: `pnpm exec esbuild`, LF entrypoint + CR strip, copy workspace `@libsql`. Recovered Sales: PROD `c2-test-sales-prod-app` `:52208`, DEV `c2-test-sales-dev-app` `:52209`, image `crm-sales:c2`.

### Selectable restore / PROD → DEV copy-down

Owner QA found restore used only the latest zip of the **same** environment, and the zip manifest had to match the target id — blocking Sales PROD → Sales DEV. Fix: `GET .../backups` + `POST .../restore { confirm, backupId }`. Server-side policy: same customer + same Product Instance; rollback; PROD→DEV copy-down; refuse DEV→PROD / cross-product / cross-customer. Snapshot remains SQLite + uploads (including Sales proposal PDFs). Target identity stays.

Live CP validation recorded before owner restore: Sales PROD zip `c2-test_c2-test-sales-prod_2026-09-15_155406.zip` (`5db4cda5-5eea-4178-8381-b1bbec6904c3`) listed as rollback on Sales PROD and copy-down on Sales DEV; missing confirm / cross-product / cross-customer POSTs were 400/409. Scott later checked owner-QA items **#37–#39** on the disposable account.

Copy-down remains **PROD → DEV only. Never DEV → PROD. Never silent.**

---

## 5. Not in C2

Beauty catalog. Option C (multiple instances of the same product). SI migration/cutover. Core promotion of campaigns/public capture. Additional Sales CRM features (e-sign, email, portal). S7/S8/VPS/DNS/TLS. Billing. Scheduled/off-site backup redesign.

---

## 6. Owner QA

Scott’s checklist: [[history/C2_owner_qa]]. Final result boxes record that required checks passed, QA-discovered defects were resolved and retested, and Scott accepts C2 as Successful (2026-09-15).
