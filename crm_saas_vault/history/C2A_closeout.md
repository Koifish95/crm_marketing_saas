---
type: note
status: historical
area: process
updated: 2026-09-11
aliases:
  - C2A closeout
  - C2A Successful
tags:
  - history
  - saas
  - c2a
---

# C2A closeout

Definitive record of Milestone **C2A — Thin Sales consumer**. Written 2026-09-11 after Scott’s browser owner-acceptance pass.

**Not the live map.** Live map: [[Current-State]]. **C2 was not started.** This closeout does **not** authorize C2, SI Sales refinement, Core promotion, D1, Control Plane Sales provisioning, Beauty, S7/VPS, DNS/TLS, billing, or SI migration.

Related: [[SaaS-Milestones]], [[SaaS-Decisions#2026-09-11 — Official C2A is Successful]], [[history/WO-2026-09-11-sales-thin-slice-return]], [[wip/archive/WO-2026-09-11-sales-thin-slice]].

## 1. Successful

First local Sales CRM vertical consuming `@crm/core`, with Sales-owned CRM domain and **no** Control Plane product catalog. Owner-accepted by Scott on 2026-09-11 at http://localhost:5040. He confirmed the Sales application/navigation and the Company, Contact, Opportunity/pipeline, and Activity workflow.

`sales_template/` (package `sales-crm`) is the second working local consumer of `@crm/core`.

## 2. What exists

| Item | Value |
|---|---|
| Path | `sales_template/` |
| Package | `sales-crm` |
| Local | http://localhost:5040 (`pnpm dev`) |
| Database | `sales_template/data/app.sqlite` |
| Journal | `sales_template/drizzle/migrations/0000_wide_cyclops` (not a copy of MA `0000`–`0020`) |
| UI noun | **Company** (table `sales_accounts`) |
| Domain | Company, Contacts, Opportunities, Activities |
| Provisional stages | `open` → `in_progress` → `won` \| `lost` |
| Docker / CP Sales product | **not** implemented |

Strategic Insights remains the intended first real-world Sales customer/design target. It has **not** been migrated or cut over.

## 3. Not in C2A

C2 (Sales vertical **plus** CP product catalog). D1 schema. Control Plane Sales provisioning. Beauty. S7/VPS. DNS/TLS. Billing. SI migration/cutover. Core promotion of duplicated pages/primitives. Final pipeline **business** stage names.

## 4. Git

| Item | Value |
|---|---|
| Inspect at C2A start | `479e4e688d71daba3464ecab52d38a5a0e1c53c1` |
| C2A row (C2 untouched) | `e3212cf572eadb0247b0235ddac05ca6aedd7fa2` |
| Implementation | `89d336afd0cb9cb1b9dccc2362e5b60b03d93d44` |
| Code-shipped docs | `beff7e41d690723fd2b9a94eff76480bb866f94f` |
| Scope | Vault Successful record only. No application code in this closeout. |
