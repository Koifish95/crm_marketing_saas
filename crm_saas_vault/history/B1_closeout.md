---
type: note
status: historical
area: process
updated: 2026-09-12
aliases:
  - B1 closeout
  - SI Sales B1 Successful
tags:
  - history
  - saas
  - b1
---

# SI Sales B1 closeout

Definitive record of **SI Sales B1 — Commercial Model + Acquisition Foundation**. Written 2026-09-12 after Scott’s browser owner-acceptance pass.

**Not the live map.** Live map: [[Current-State]]. **B2 is not authorized.** **C2 was not started.** This closeout does **not** authorize B2 (proposals/PDF/versioning/e-sign/portal/form builder), C2, Core promotion, D1, Control Plane Sales provisioning, Beauty, S7/VPS, DNS/TLS, billing, or SI migration.

Related: [[SaaS-Milestones]], [[SaaS-Decisions#2026-09-12 — Official SI Sales B1 is Successful]], [[history/WO-2026-09-12-si-sales-b1-commercial-acquisition-return]], [[wip/archive/WO-2026-09-12-si-sales-b1-commercial-acquisition]].

## 1. Successful

Sales-owned commercial model and acquisition foundation on the C2A/C2B Sales app. Owner-accepted by Scott on **2026-09-12** at http://localhost:5040 after the full manual B1 browser QA in the implementation return.

He confirmed:

- public intake disabled/enabled behavior
- public inquiry submission
- Lead creation without automatic Company creation
- duplicate replay vs genuine repeat submission
- Campaign creation
- Campaign spanning multiple Sources
- multiple Tracking Links per Campaign+Source
- tracked Lead attribution
- garbage/unknown token 404
- public-intake security as practically testable
- captured vs current attribution
- attribution correction history
- Lead conversion preserving attribution
- Offers
- Opportunity commercial lines
- one-time totals
- MRR quantity calculation
- Offer edits not rewriting existing quoted lines
- migrated existing Opportunity amounts
- Company lifecycle
- Won/Lost timestamps
- Reopen behavior
- dashboard/reporting
- RBAC/regression checks
- Martial Arts remaining independent

Scott reported the B1 acceptance flow works properly. Owner acceptance is explicitly granted.

`sales_template/` (package `sales-crm`) remains the second working local consumer of `@crm/core`. Path and port are unchanged. Public intake still defaults **off** until staff enable it.

## 2. What exists

| Item | Value |
|---|---|
| Path | `sales_template/` |
| Package | `sales-crm` |
| Local | http://localhost:5040 (`pnpm dev`) |
| Database | `sales_template/data/app.sqlite` |
| Journal | `0000_wide_cyclops` + Slice A `0001_thankful_lyja` + B1 `0002_cheerful_firebrand` |
| Sources | Controlled `sales_sources` (11 seeded, including Website / Organic and Other) |
| Campaigns | `sales_campaigns` spanning Sources; **no** primary source |
| Tracking Links | Campaign+Source; many per pair; opaque `/t/{token}` |
| Attribution | Immutable captured + editable current; reporting uses current |
| Public intake | Config-driven `/inquire` and `/t/{token}`; Core `app_settings` key `sales.public_intake` |
| Offers / lines | `sales_offers` + `sales_opportunity_lines`; `MRR = qty × monthly unit`; `amount_cents` derived one-time cache |
| Company lifecycle | `prospect` / `customer` / `former_customer`; Won promotes Prospect → Customer |
| Close dates | Dedicated `won_at` / `lost_at`; Reopen clears them |
| Docker / CP Sales product | **not** implemented |

Strategic Insights remains the intended first real-world Sales customer/design target. It has **not** been migrated or cut over.

## 3. Not in B1 / still deferred

**B2** is the next Slice B **candidate** and is **not yet authorized**. Proposal generation remains an approved Slice B product requirement and stays in **B2**.

Also not started: C2 (Sales vertical **plus** CP product catalog). D1 schema. Control Plane Sales provisioning. Beauty. S7/VPS. DNS/TLS. Billing. SI migration/cutover. Core promotion. Customer form builder. Browser e-sign. Detailed visitor analytics.

Closing B1 does **not** implicitly authorize any deferred item.

## 4. Git

Inspected 2026-09-12 on `working`. Product code was unchanged after the B1 feature commit. `4ac0f30` records the result SHA on the return/lockfile only.

| Item | Value |
|---|---|
| Authorization / start | `83506fc4f5aefc54ff65bfd3365081e16100526e` |
| Implementation | `40851e04ac0cc64fc3315cf698991ef39c432987` |
| Result SHA stamp | `4ac0f305109838a92c07de07f7deec25ee81456e` |
| HEAD at closeout inspect | `4ac0f305109838a92c07de07f7deec25ee81456e` |
| Scope | Vault Successful record only. No application code in this closeout. |

## 5. Handoff

No active B1 implementation work order remains. ChatGPT should read this closeout and the current canonical set, then determine the next **authorized planning** step. Do not assume B2 implementation is authorized. Do not begin B2, proposal generation, PDF work, C2, or SI migration without a separate authorization.
