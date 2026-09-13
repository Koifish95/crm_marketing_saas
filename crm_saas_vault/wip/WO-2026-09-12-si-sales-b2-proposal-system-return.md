---
type: work-return
status: done
id: WO-2026-09-12-si-sales-b2-proposal-system
milestone: SI-Sales-B2
base_sha: "99bb058540a706d52aca8ac30e1e1035800f00e6"
result_sha: "84c0cc88466db931ca37b479d5edc6bc5186a0c0"
implementation_result: shipped
tests: "sales_template: pnpm test 7 files / 38 tests pass; pnpm lint pass; pnpm typecheck pass; pnpm build pass; pnpm db:migrate pass on existing sales_template/data/app.sqlite. martial_arts_template: pnpm exec vitest run tests/c1/architecture.test.ts tests/c1/registration.test.ts → 2 files / 5 tests pass."
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
  - SaaS-Milestones.md
  - SaaS-Decisions.md
  - Platform-Architecture.md
  - Working-Agreement.md
  - sales_template/AGENTS.md
  - Home.md
---

# SI Sales B2 return — proposal system

**Not the live map.** Live map: [[Current-State]]. Work order: [[wip/WO-2026-09-12-si-sales-b2-proposal-system]]. Decisions: [[wip/SI_Sales_B2_Pre_Development_Decision_Worksheet]] B2-01–B2-06 plus Slice B 22–31 / 50–51.

**B2 is code-shipped and is not Successful.** Do not archive this pair until Scott’s owner QA. C2 is **not** this slice.

---

## Executive result

**B2 CODE-SHIPPED — READY FOR OWNER QA**

`sales_template/` / `sales-crm` (http://localhost:5040) now has the approved Proposal system, Sales-owned, with **zero** Core package source changes and **no** Martial Arts domain imports.

```text
Opportunity commercial lines → Draft Proposal → Issue (snapshot + PDF)
     → Mark Sent (sent_at, no mailer) → Accepted | Declined
     → Create revision → Issue (prior becomes superseded)
```

Accepted does **not** call `markOpportunityWon`. Past `valid_through` is display-only. One Proposal chain per Opportunity.

---

## Git / preflight

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Remote | `https://github.com/Koifish95/crm_marketing_saas.git` (`Koifish95/crm_marketing_saas`) |
| Branch | `working` |
| Work Order `base_sha` | `99bb058540a706d52aca8ac30e1e1035800f00e6` |
| HEAD at start (after fetch/pull) | **matched** `base_sha` — already up to date with `origin/working` |
| Dirty at start | `M .obsidian/workspace.json` (not committed); untracked Work Order file (committed with B2) |
| Core package | **unchanged** |

---

## Exact features shipped

- **One Proposal chain per Opportunity** (`UNIQUE opportunity_id` on `sales_proposals`). Number: instance-local `P-{America/Denver year}-{NNNN}` plus revision integer (`P-2026-0007 r2`).
- **Status model:** persist `draft | issued | accepted | declined | superseded`. **Sent** is `sent_at` on the issued revision, not a separate status. Reporting “Sent” = `sent_at IS NOT NULL`.
- **Draft vs Issue:** Draft narrative (title, intro, terms override, notes, recipient, optional `valid_through`) is editable. Commercial lines on a draft **refresh from current Opportunity lines** until Issue. Issue copies current Opportunity lines into `sales_proposal_lines`, snapshots recipient/letterhead/narrative/totals, writes `issued_at`, generates PDF.
- **Create revision:** at most one draft at a time. Prior issued row stays `issued` until the new revision is issued, then it becomes `superseded`. `current_revision_id` points at the in-progress draft if any, else the latest non-superseded revision.
- **Mark Sent:** records `sent_at` + Opportunity history. No SMTP, no mailer, no public delivery.
- **Accepted / Declined:** staff-recorded. Accepted does **not** auto-Won. Past `valid_through` does not mutate status and does not block Accept. No expire worker.
- **Recipient:** one Contact from the Opportunity’s Company; default `primaryContactId`; identity snapshotted at Issue.
- **Letterhead:** Core `app_settings` key `sales.proposal_letterhead`. Optional logo under `data/proposals/_letterhead/`. Text-only valid if logo empty. No SI strings.
- **Closed document slots:** letterhead, recipient, title, intro, lines, one-time + MRR, terms, notes, fixed signature block. HTML preview and PDFKit PDF share those slots.
- **Staff preview:** `/proposals/:id/r/:revisionId` (`auth` + `sales`). No public Proposal routes.
- **PDFs:** PDFKit on `sales-crm` only. Generated: `data/proposals/{proposalId}/{revision}/generated.pdf`. Signed upload: `signed.pdf` (never regenerated). Optional env `SALES_PROPOSALS_DIR`. Gitignore `/data/proposals/`.
- **History:** `createNote` on the **Opportunity** (`record_kind` stays `opportunity`) for created/issued/revised/superseded/marked sent/accepted/declined/signed upload. Existing `SalesHistory.vue`.
- **RBAC:** `VIEW_SALES` for GET/preview/download; `MANAGE_SALES` for mutate/issue/upload. Letterhead settings page uses `admin` middleware (same as intake); APIs VIEW/MANAGE. No new permission.
- **UI:** Opportunity workspace Proposals panel; compact `/proposals` index; `/settings/proposals`; additive dashboard counts (draft/issued/sent/accepted/declined/past-valid-through). No B1 attribution redesign.

---

## Schema / migrations

Journal: `sales_template/drizzle/migrations/0003_clammy_shocker.sql` after `0002_cheerful_firebrand`. Applied with `pnpm db:migrate` against existing `sales_template/data/app.sqlite` (**no** `db:setup` reset).

**New tables:**

- `sales_proposals` — unique `opportunity_id`, unique `proposal_number`, `current_revision_id` (no FK; circular)
- `sales_proposal_revisions` — narrative, recipient snapshots, letterhead snapshots, `valid_through` as **text YYYY-MM-DD**, `issued_at` / `sent_at` / `accepted_at` / `declined_at`, PDF paths
- `sales_proposal_lines` — per-revision commercial snapshot (`description`, `qty`, `pricing_type`, `unit_price_cents`, optional `offer_id` + `offer_name`)

Line math reuses B1 `lineOneTimeCents` / `lineMrrCents`.

---

## PDF engine

**PDFKit** (`pdfkit` ^0.20.2 + `@types/pdfkit` on `sales-crm`).

Why: Work Order recommended PDFKit; Node-native; no Chromium/Playwright/Puppeteer; no paid document API; same closed slots as the staff HTML preview. Production PDF is server PDFKit, not browser print-to-PDF.

Missing generated PDF regenerates from the issued snapshot and may overwrite `generated.pdf`. Signed upload is never regenerated or overwritten by that path. Upload validates PDF type/size.

---

## Artifact storage

```text
sales_template/data/proposals/{proposalId}/{revision}/generated.pdf
sales_template/data/proposals/{proposalId}/{revision}/signed.pdf
sales_template/data/proposals/_letterhead/   # optional instance logo
```

Env override: `SALES_PROPOSALS_DIR` (documented in `sales_template/.env.example`). Gitignore: `/data/proposals/`. No S3.

---

## Major files

**Services:** `sales_template/server/services/proposals.ts`, `proposal-pdf.ts`, `proposal-storage.ts`, `proposal-letterhead.ts`.

**APIs (thin Nitro):**

- `GET/POST /api/opportunities/:id/proposal`
- `GET /api/proposals`, `GET/PATCH /api/proposals/:id`
- `POST /api/proposals/:id/{issue,revise,mark-sent,accept,decline}`
- `GET /api/proposals/:id/revisions/:revisionId/{preview,pdf,logo}`
- `GET/POST /api/proposals/:id/revisions/:revisionId/signed`
- `GET/PATCH /api/settings/proposals` + logo GET/POST/DELETE

**UI:** Opportunity `[id].vue` Proposals panel; `ProposalDocumentView.vue`; `/proposals`; `/proposals/:id/r/:revisionId`; `/settings/proposals`; dashboard strip; `register-sales-shell.ts`.

**Shared:** `shared/utils/proposals.ts`, Zod in `shared/schemas/sales.ts`.

**Tests:** `sales_template/tests/b2/b2.test.ts`.

Workspace root `package.json` now depends on `tslib` so PDFKit → `@swc/helpers` resolves when B1 tests import `reporting.ts` → `proposals.ts` → `proposal-pdf.ts` from repo-root `node_modules`.

---

## Tests executed

| Command | Result |
|---|---|
| `sales_template` `pnpm test` | **7 files / 38 tests passed** (includes `tests/b2/b2.test.ts`) |
| `sales_template` `pnpm lint` | **pass** |
| `sales_template` `pnpm typecheck` | **pass** |
| `sales_template` `pnpm build` | **pass** (`Build complete`) |
| `sales_template` `pnpm db:migrate` | **pass** on existing `data/app.sqlite` |
| `martial_arts_template` architecture + registration | **2 files / 5 tests passed** |

B2 tests cover WO §17: one chain, Issue snapshots, immutability vs Opportunity/Offer edits, same-company recipient, supersede, `sent_at` without email, valid-through display-only + still Accept, no auto-Won, regenerate vs signed, letterhead not SI-hardcoded, public-path/dashboard counts, decline without stage change.

---

## Cursor QA (implementation-level)

Cursor ran automated tests, lint, typecheck, build, and migrate. It did **not** complete a logged-in browser pass at http://localhost:5040. That is Scott’s owner QA.

Known Cursor-environment limits:

- No full staff login / click-through of Draft → Issue → PDF download in a real browser session.
- PDF visual layout (page breaks, logo placement, signature block) needs human eyes on a downloaded file.
- Signed upload UX (file picker, download round-trip) needs the browser.

---

## Owner QA script (Scott)

App: **http://localhost:5040**. Login `admin` / `setup`. Restart `pnpm dev` if the process predates this B2 ship.

1. Configure Proposal letterhead at `/settings/proposals`, including an optional logo. Confirm text-only still looks valid if you later remove the logo.
2. Open or create an Opportunity with commercial lines and at least one Company Contact.
3. Create a Draft Proposal from the Opportunity Proposals panel.
4. Preview the Draft (`/proposals/:id/r/:revisionId`). Confirm lines match the current Opportunity.
5. Issue the Proposal.
6. Download / open the generated PDF. Confirm letterhead, recipient, lines, one-time + MRR, terms, notes, signature block.
7. Edit Opportunity lines and/or an Offer afterward. Re-open the **issued** preview/PDF and confirm the snapshot did **not** change.
8. Create a new revision. Confirm the prior issued revision remains visible. Issue the new revision and confirm the prior becomes Superseded.
9. Mark Sent on the current issued revision.
10. Confirm history shows marked sent and that nothing was emailed.
11. Set optional `valid_through` in the past on a draft, issue (or inspect an issued row), and confirm a past-valid-through display without status mutation.
12. Record Accepted and confirm the Opportunity did **not** automatically become Won.
13. Upload a signed PDF, then download it. Confirm it is distinct from `generated.pdf`.
14. Inspect prior revision(s) and Opportunity history (created / issued / revised / superseded / sent / accepted / signed upload).
15. Change the draft recipient to another same-Company Contact. Confirm a Contact from a different Company cannot be selected.

Do **not** mark B2 Successful until this QA is accepted.

---

## Deviations from Work Order

| Item | WO | Implementation |
|---|---|---|
| Sent status | May be `status = sent` **or** Issued plus `sent_at` | Issued plus `sent_at`. Reporting “Sent” = `sent_at IS NOT NULL`. Keeps Accepted/Declined orthogonal to Mark Sent. |
| Preview route | Example `/opportunities/:id/proposals/:proposalId/revisions/:revisionId/preview` | Flattened to `/proposals/:id/r/:revisionId` to avoid Nuxt typed-route stack explosion. Still staff-only (`auth` + `sales`). No public routes. |
| Root `tslib` | Not specified | Added at workspace root so PDFKit’s `@swc/helpers` resolve when tests load `proposal-pdf.ts` from repo-root `node_modules`. |
| Opportunity `$fetch` typing | Not specified | Untyped `callApi()` wrapper on the Opportunity page to avoid TS2321 excessive stack depth. |

None of these change approved B2 product semantics.

---

## Decisions discovered

None that require owner/ChatGPT reopening of B2-01–B2-06 or Slice B 22–31 / 50–51.

---

## Forbidden-scope confirmation

Not implemented:

- Browser customer e-signature, public signing, customer portal
- In-app email / SMTP / automated delivery
- Multiple concurrent Proposal chains
- Document CMS / theme CMS / arbitrary sections
- Tax, invoicing, Stripe, billing
- S3 / object storage
- Chromium / Playwright / Puppeteer
- B1 reporting/attribution redesign
- C2, D1, VPS/DNS/TLS/S7, Beauty, MA domain imports, Core proposal types
- Company billing-address expansion, RBAC redesign
- SI-specific product strings

---

## Durable-document updates / recommendations

Updated now as **code-shipped, awaiting owner QA** (not Successful):

- [[Current-State]]
- [[project-state.yaml]] (`last_shipped: SI-Sales-B2`, `si_sales_b2: code-shipped`, `b2_awaiting_owner_qa: true`, `authorization.active_work_order: null`)
- [[SaaS-Milestones]]
- [[SaaS-Decisions]] (B2 code-shipped entry, newest first)
- [[Platform-Architecture]]
- [[Working-Agreement]]
- [[Home]]
- `sales_template/AGENTS.md`
- [[wip/_index]]

After Scott accepts owner QA, expected follow-up (do **not** do this now):

- Mark B2 **Successful** in Current-State / lockfile / milestones / a short SaaS-Decisions closeout
- Move this return to `history/` and the work order to `wip/archive/`
- Write `history/B2_closeout.md`

Do not treat this WIP return as the live map.

---

## Known limitations

- Letterhead logo copy into a revision folder is filesystem-local; no object storage.
- `valid_through` is a date string, not a timezone-aware timestamp. Past-valid-through is calendar-date display in America/Denver terms for reporting/UI.
- Compact `/proposals` index is a thin list, not a pipeline product.
- Dashboard strip is counts only.
- PDFKit output will not be pixel-identical to the HTML preview; slots match, typography will not.
- B2 is **not Successful** until owner QA.

---

## What Scott should do next

1. Have ChatGPT inspect this return and Git on `working` before owner QA.
2. Restart Sales if needed and run the 15-step script at http://localhost:5040.
3. Only after that QA: mark B2 Successful (separate closeout). Do not start C2, e-sign, email, or SI migration from this ship.
