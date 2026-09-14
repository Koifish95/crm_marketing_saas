---
type: note
status: historical
area: process
updated: 2026-09-13
aliases:
  - B2 closeout
  - SI Sales B2 Successful
tags:
  - history
  - saas
  - b2
---

# SI Sales B2 closeout

Definitive record of **SI Sales B2 — Proposal / document system**. Written 2026-09-13 after Scott’s final owner-acceptance and regression QA pass.

**Not the live map.** Live map: [[Current-State]]. **C2 is not started and is not authorized.** This closeout does **not** authorize C2, Core promotion, Control Plane Sales provisioning, D1 schema, Beauty, S7/VPS, DNS/TLS, Strategic Insights migration/cutover, public signing, e-sign, CRM email delivery, or billing/invoicing.

Related: [[SaaS-Milestones]], [[SaaS-Decisions#2026-09-13 — Official SI Sales B2 is Successful]], [[history/WO-2026-09-12-si-sales-b2-proposal-system-return]], [[wip/archive/WO-2026-09-12-si-sales-b2-proposal-system]].

## 1. Successful

Sales-owned Proposal system on the C2A/C2B/B1 Sales app. Owner-accepted by Scott on **2026-09-13** at http://localhost:5040 after core B2 owner QA, the 2026-09-13 refinement pass, and final regression QA.

He confirmed:

- Proposal letterhead configuration
- Draft creation/editing
- Draft preview
- Draft commercial truth refreshing from Opportunity lines
- Issue → immutable Proposal snapshot
- generated PDF
- revision chain
- superseding prior issued revisions
- Mark Sent without email
- Accepted without auto-Won
- signed PDF upload/download
- past-valid-through display without automatic status mutation
- alternate same-Company recipient
- Opportunity commercial-line editing
- Opportunity stage/status visibility
- Sent in revision-history display
- immutable issued-Proposal guidance
- signed PDF Upload / View / Download
- historical Proposal revision selection from the Opportunity card

Scott explicitly approved the immutable revision model:

```text
Issued Proposal → frozen historical record
Changes → New Revision
```

Do not reopen that design. No Edit/Reopen on issued revisions.

`sales_template/` (package `sales-crm`) remains the second working local consumer of `@crm/core`. Path and port are unchanged.

## 2. What exists

| Item | Value |
|---|---|
| Path | `sales_template/` |
| Package | `sales-crm` |
| Local | http://localhost:5040 (`pnpm dev`) |
| Database | `sales_template/data/app.sqlite` |
| Journal | `0000_wide_cyclops` + Slice A `0001_thankful_lyja` + B1 `0002_cheerful_firebrand` + B2 `0003_clammy_shocker` |
| Proposals | One chain per Opportunity; draft / issue / mark-sent / accept / decline / supersede |
| Snapshots | Issued revisions are immutable commercial records |
| Letterhead | Instance setting `sales.proposal_letterhead` |
| PDFs | PDFKit-generated under local `data/proposals/` |
| Sent | `sent_at` only; no CRM mailer |
| Accepted | Does **not** call `markOpportunityWon` |
| Signed PDF | Optional staff upload / view / download per revision |
| Valid-through | Display-only; no automatic status mutation |
| Docker / CP Sales product | **not** implemented |

Strategic Insights remains the intended first real-world Sales customer/design target. It has **not** been migrated or cut over.

## 3. Not in B2 / still deferred

**C2** remains next C-track work and is **not authorized**. C2 is Sales vertical **plus** Control Plane product catalog. B2 is not C2.

Also not started: Core promotion. Control Plane Sales provisioning. D1 schema. Beauty. S7/VPS. DNS/TLS. Billing/invoicing. SI migration/cutover. Public signing. Browser e-sign. CRM email delivery. Customer portal.

Closing B2 does **not** implicitly authorize any deferred item.

No B2 forbidden scope was implemented.

## 4. Git

Inspected 2026-09-13 on `working`. Product code was unchanged after the historical-revision selection fix. This closeout is vault Successful record only. No application code in this closeout.

| Item | Value |
|---|---|
| Work Order `base_sha` | `99bb058540a706d52aca8ac30e1e1035800f00e6` |
| Original B2 feature result | `84c0cc88466db931ca37b479d5edc6bc5186a0c0` |
| Owner-QA refinement | `c2d611e803e18f6d91e318ea6cfc9061ae8736d8` |
| Historical-revision selection fix | `0be7e060386d243a58268a8ff12a1e9fa1431dc1` |
| HEAD at closeout inspect | `dde75902506ec99b83f51b70c4903b69e820eabc` |
| Closeout SHA | `dae437aaca315f976fb2dc06fe90a1530ee81376` |
| Scope | Vault Successful record only. No Sales product code. No Core change. |

No schema change in the QA refinement passes (`c2d611e`, `0be7e06`). No Core change in the QA refinement passes.

## 5. Automated tests (final B2 ship)

| Command | Result |
|---|---|
| Sales `pnpm test` | **7 files / 40 tests passed** |
| Sales `pnpm lint` | **pass** |
| Sales `pnpm typecheck` | **pass** |
| Sales `pnpm build` | **pass** |

## 6. Handoff

No active B2 implementation work order remains. ChatGPT should inspect this closeout and the current canonical set **before starting C2 planning**. Do not begin C2, Core promotion, e-sign, email, or SI migration from this closeout.
