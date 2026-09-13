---
type: work-return
status: done
id: WO-2026-09-12-si-sales-b1-commercial-acquisition
milestone: none
base_sha: "83506fc4f5aefc54ff65bfd3365081e16100526e"
result_sha: "40851e04ac0cc64fc3315cf698991ef39c432987"
implementation_result: shipped
tests: "sales_template: pnpm test 6 files / 29 tests pass; pnpm lint pass; pnpm typecheck pass; pnpm build pass; pnpm db:migrate pass on existing sales_template/data/app.sqlite. martial_arts_template: pnpm exec vitest run tests/c1/architecture.test.ts tests/c1/registration.test.ts → 2 files / 5 tests pass."
decisions_discovered: []
durable_docs_updated:
  - Current-State.md
  - project-state.yaml
  - SaaS-Milestones.md
  - SaaS-Decisions.md
  - Platform-Architecture.md
  - Working-Agreement.md
  - sales_template/AGENTS.md
---

# SI Sales B1 return — commercial model + acquisition foundation

**Not the live map.** Live map: [[Current-State]]. Successful closeout: [[history/B1_closeout]]. B2 is **not** authorized. C2 is **not** this slice.

---

## Owner acceptance (2026-09-12)

Scott completed the full manual B1 browser QA at http://localhost:5040 from this return and explicitly granted owner acceptance. He confirmed public intake enable/disable and submit, Lead without automatic Company, replay vs genuine duplicate, Campaigns spanning Sources, multiple Tracking Links per Campaign+Source, tracked attribution, unknown-token 404, practical public-intake security, captured vs current attribution and correction history, convert preserving attribution, Offers and commercial lines, one-time totals, MRR quantity math, Offer edits not rewriting quoted lines, migrated existing amounts, Company lifecycle, Won/Lost timestamps, Reopen, dashboard/reporting, RBAC/regression, and independent Martial Arts operation.

B1 is **Successful**. This file remains implementation evidence. Closing B1 does **not** authorize B2 (proposals/PDF/e-sign/portal/form builder), C2, Core promotion, D1, Control Plane Sales provisioning, Beauty, S7/VPS, DNS/TLS, billing, or SI migration.

---

## Executive result (at code-ship)

**B1 CODE-SHIPPED — READY FOR OWNER ACCEPTANCE**

That was the result when this return was first written. Owner acceptance landed afterward; see [[history/B1_closeout]].

Work order (archived): [[wip/archive/WO-2026-09-12-si-sales-b1-commercial-acquisition]]. Decisions: [[wip/SI_Sales_Slice_B_Pre_Development_Decision_Worksheet]] (1–64).

---

## Executive implementation summary

**B1 CODE-SHIPPED — READY FOR OWNER ACCEPTANCE**

`sales_template/` / `sales-crm` (http://localhost:5040) now has the approved commercial model and acquisition foundation, Sales-owned, with **zero** Core package changes and **no** Martial Arts imports.

```text
Campaign + Source → Tracking Link /t/{token} → public intake → Lead
     → convert (snapshot attribution) → Opportunity lines → Won/Lost
```

Untracked `/inquire` attributes to seeded **Website / Organic**. Unknown/inactive `/t/{token}` **404**. Reporting uses **current** attribution. `MRR = quantity × monthly unit price`. Dedicated `won_at` / `lost_at`. Company lifecycle `prospect | customer | former_customer`.

---

## Git / preflight

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Remote | `https://github.com/Koifish95/crm_marketing_saas.git` (`Koifish95/crm_marketing_saas`) |
| Branch | `working` |
| Work Order `base_sha` | `83506fc4f5aefc54ff65bfd3365081e16100526e` |
| HEAD at start (after fetch/pull) | **matched** `base_sha` — already up to date with `origin/working` |
| Dirty at start | `M .obsidian/workspace.json` (not committed); untracked Work Order file (committed with B1) |
| Core package | **unchanged** |

---

## Exact features shipped

- Controlled **Sources** (11 seeded, including `Website / Organic` and `Other`; add/deactivate; deactivate does not rewrite historical FKs; `Other` requires source detail).
- **Campaigns** spanning Sources. Status `draft | active | completed | archived`. Optional dates and planning `budget_cents`. **No** Campaign-level Primary Source.
- **Tracking Links** = required Campaign + required Source + label + opaque unique token. Many links per pair. Destination is Sales intake only (no external URL).
- **Captured vs current attribution** on Lead and Opportunity. Convert copies both. Staff correction updates current only and writes `sales_notes`. Direct Opportunities use the same current fields.
- Configuration-driven public intake (`sales.public_intake` in Core `app_settings` KV). Closed 6-field catalog. Default **off**. `/inquire` and `/t/{token}` use `layout: default` (no staff chrome, no `auth` middleware).
- Security: IP rate limit ~8 / 10 min, 32KB payload cap, Zod, honeypot (`website` filled → generic thank-you, **no** Lead), generic errors, security-audit throttles. **No CAPTCHA**.
- Idempotency replay vs genuine duplicate (second Lead + `possible_duplicate_lead_id` + notes on both; visitor is not told). No auto-merge. No public enumeration.
- Aggregate `click_count` on Tracking Link only. Valid token GET increments even if intake is disabled; disabled intake does not create Leads.
- **Offers** catalog (`one_time | monthly`) and Opportunity **commercial lines**. Quoted unit price. Derived one-time + MRR caches. Header `amount_cents` is no longer an independent staff amount.
- Existing Slice A `amount_cents` migrated into one `one_time` line (qty 1, description = Opportunity name, `offer_id` null).
- Company **lifecycle**. Won promotes Prospect → Customer. Lost does not downgrade. `active` remains record availability. Former Customer is not deletion.
- `won_at` / `lost_at`. Reopen clears them. Pre-B1 Won/Lost rows were **not** backfilled from `updatedAt`.
- Dashboard/reporting with Denver presets + custom range. Current-state pipeline unfiltered by creation date. Won uses `won_at`; Lost uses `lost_at`. No ROI. Budget labeled as planning budget only.
- RBAC unchanged: `VIEW_SALES` / `MANAGE_SALES`. Public APIs unauthenticated and narrow.
- Slice A CRM preserved: Lead stages, convert, activities, notes, Won/Lost/Reopen/`Other` text.

---

## Schema / migrations

Journal: `sales_template/drizzle/migrations/0002_cheerful_firebrand.sql` after `0001_thankful_lyja`. Applied with `pnpm db:migrate` against existing `sales_template/data/app.sqlite` (**no** `db:setup` reset).

**New tables:** `sales_sources`, `sales_campaigns`, `sales_tracking_links`, `sales_offers`, `sales_opportunity_lines`, `sales_public_submissions`.

**Altered:**

- `sales_leads` — current Source/Campaign/source detail + name snapshots; captured Source/Campaign/Tracking Link/`captured_at` + name/label snapshots; `intake_company_name`; `possible_duplicate_lead_id`.
- `sales_opportunities` — same current + captured attribution; `won_at`; `lost_at`; `mrr_cents`; `amount_cents` kept as **derived** one-time cache.
- `sales_accounts` — `lifecycle` `prospect | customer | former_customer`.

Migration also: idempotent 11-source seed; convert `amount_cents IS NOT NULL AND > 0` with no lines into one `one_time` line; `mrr_cents = 0` where null; Won companies → `customer`.

Verified on the local laptop DB after migrate: 11 sources; Northwind “Advisory retainer” `$12,000.00` → one `one_time` line `1200000`; C2A QA `$2,500.00` and “Create CRM” `$1,000.00` also lined; companies with Won opportunities are `customer`; `won_at` remains null on pre-B1 rows.

---

## Public acquisition workflow

1. Staff create a Campaign, pick a Source, mint a Tracking Link, copy `{origin}/t/{token}`.
2. Visitor opens `/t/{token}` → click counted → config-driven form (no Campaign dump).
3. Submit creates a Lead (no Company auto-create). `displayName` = first + last. Message → first history note. `intake_company_name` stored. Owner may stay null until staff assign.
4. Untracked `/inquire` uses Source **Website / Organic**, Campaign null, Tracking Link null.
5. Staff convert snapshots current + captured onto the Opportunity.

---

## Attribution behavior

- First write of Source/Campaign also fills **captured** if captured is empty.
- Later correction updates **current only** and appends a from→to `sales_notes` row. Captured columns are immutable.
- Convert copies current IDs + name snapshots and captured evidence onto the Opportunity; keeps `source_lead_id`. Convert prefers `intake_company_name` then `displayName` for the new Company.
- Reporting and dashboard breakdowns use **current** Source/Campaign.
- No version ledger.

---

## Configurable intake behavior

Core `app_settings` key `sales.public_intake` (JSON). Not `.env` for field lists.

Default **off**. Closed catalog: firstName, lastName, email, phone, companyName, message. SI required identity remains first + last + email even if a catalog row is misconfigured. MANAGE_SALES can enable/disable from Campaigns without taking the CRM down. ADMIN can edit copy/fields at `/settings/intake`. When off: configured unavailable copy; POST rejected; valid token clicks may still increment `click_count`.

Public GET `/api/public/intake` returns copy + visible fields + enabled. It does **not** list Sources or Campaigns.

---

## Security controls

- `registerPublicPaths`: pages `/inquire`; prefixes `/api/public`; matcher `/t` and `/t/*`.
- Unauthenticated public APIs only.
- IP rate limit ~8 requests / 10 minutes (`sales_template/server/utils/rate-limit.ts`, duplicated idea from Martial Arts magnitude, **not** imported from MA).
- 32KB content-length cap; Zod parse; generic submit error; honeypot field `website`.
- Security events `PUBLIC_INTAKE_THROTTLED` / `PUBLIC_INTAKE_REJECTED`.
- Unknown/inactive tokens: API **404** “That link is not available.” Page `/t/{token}` throws Nuxt **404** (fatal). Never silent organic fallback.
- No CAPTCHA. No IP/UA/session analytics store.

Smoke (running Sales on `[::1]:5040`): `GET /api/health` 200; `GET /inquire` 200; `GET /api/public/intake` JSON with `enabled: false` and the six-field catalog; `GET /api/public/tracking/no-such-token` 404.

---

## Duplicate / idempotency behavior

- Client UUID idempotency key. Same key replays original thank-you (no second Lead).
- New key + matching normalized email or phone → new Lead + `possible_duplicate_lead_id` + history notes on both. Visitor is not told. No auto-merge. No public Lead enumeration.

---

## Click analytics behavior

Aggregate `click_count` on the Tracking Link, incremented once per successful token resolution (`GET /api/public/tracking/:token`). Conversion = Leads with that `captured_tracking_link_id` / `click_count`. Untracked `/inquire` has no click counter. No visitor/session platform.

---

## Offers / commercial calculations

- Offer: name, description, `pricing_type` `one_time | monthly`, `default_unit_price_cents`, active.
- Line: optional `offer_id`, description snapshot, quantity (default 1), `pricing_type`, quoted `unit_price_cents`. Offer edits do not rewrite existing lines.
- One-time line total = qty × unit. MRR = qty × monthly unit. Opportunity `amount_cents` = sum of one-time line totals; `mrr_cents` = sum of monthly line totals. No header override.

---

## Migration of existing Opportunity amount

SQL in `0002_cheerful_firebrand.sql` plus `createOpportunity({ amountCents })` still materializes a one-time line for compatibility. Staff Opportunity workspace edits lines, not an independent header amount. Local live sqlite confirmed Northwind `1200000` and other Slice A amounts with no prior lines.

---

## Company / Won / Lost behavior

- Lifecycle: `prospect` (default) / `customer` / `former_customer`. `active` is record availability.
- `markOpportunityWon`: set `won_at`; if company is Prospect, promote to Customer.
- `markOpportunityLost`: set `lost_at`; does **not** downgrade Customer.
- `reopenOpportunity`: clear `won_at` and `lost_at` (and existing loss fields).
- Pre-B1 closed rows: lifecycle backfill from `stage = won` only; timestamps left null on purpose.

---

## Reporting behavior

`salesDashboard` + `/dashboard` with presets `this_month | last_month | last_30_days | this_quarter | this_year | custom` in America/Denver (`shared/utils/time.ts`).

- Current open pipeline one-time + MRR: **not** filtered by creation date.
- New Leads / new Opportunities: created-at in range.
- Won count/value: `won_at` in range.
- Lost count: `lost_at` in range.
- Lead→Opportunity and win rate: simple operational ratios, not a cohort funnel.
- Source / Campaign / Tracking Link tables: clicks, Leads, click→Lead, Opportunities, Won/Lost, one-time, MRR. Budget shown as planning budget. **Never ROI**.

---

## RBAC

No second permission catalog. `VIEW_SALES` lists/reports; `MANAGE_SALES` mutates sources/campaigns/links/offers/lines/attribution/intake enable. Public routes unauthenticated. Intake **field catalog** editor lives under Core Settings (`admin` middleware) at `/settings/intake`; enable/disable is also on Campaigns for MANAGE_SALES.

Nav: Campaigns, Offers. Settings: Public intake.

---

## Tests and actual results

| Command | Result |
|---|---|
| `sales_template` `pnpm test` | **6 files, 29 tests passed** (includes `tests/b1/b1.test.ts` plus Slice A / C2A registration / schema) |
| `sales_template` `pnpm lint` | **pass** |
| `sales_template` `pnpm typecheck` | **pass** |
| `sales_template` `pnpm build` | **pass** (`✨ Build complete!`) |
| `sales_template` `pnpm db:migrate` | **pass** on existing `data/app.sqlite` |
| `martial_arts_template` architecture + registration | **2 files, 5 tests passed** (no MA↔Sales coupling) |

Automated tests are **not** owner acceptance.

`tests/b1/b1.test.ts` covers: idempotent sources; add/deactivate; campaigns spanning sources and many links per pair; unknown/inactive token; click count; captured vs current; convert snapshots; public replay vs genuine duplicate; organic vs tracked; disabled intake + honeypot; MRR + `$12,000` amount→line; `won_at` / lifecycle / Lost does not downgrade; dashboard current pipeline + public paths.

---

## Manual QA instructions for Scott

App: http://localhost:5040. Pilot login unchanged: `admin` / `setup`. Restart `pnpm dev` in `sales_template/` if the long-running process predates B1.

Public (no login):

1. Open `/inquire` while intake is **off** — unavailable copy, no staff nav. Submit should fail.
2. Log in → Campaigns → turn public intake **on**. Reload `/inquire` on a phone-width viewport. Submit first/last/email. Confirm a Lead appears. Company is **not** auto-created. Message (if any) is the first history note.
3. Submit the same form twice quickly — one Lead (replay). Submit again with a new session/key and the same email — second Lead with a non-blocking possible-duplicate warning for staff, nothing shown to the visitor.
4. Create a Campaign (no primary source). Add two Tracking Links for the same Campaign+Source and one for a second Source. Copy `/t/{token}`. Open it (click count +1). Submit. Lead Source/Campaign/link match the token. Open a garbage token — **404**, no campaign name.
5. Fill the honeypot (hidden Website field) — thank-you, **no** Lead.
6. Turn intake **off**. Open a valid token — click may increment; submit must not create a Lead.

Staff CRM:

7. Lead workspace: original captured vs current Source/Campaign distinguishable. Change current Source — captured stays; history note written.
8. Convert — Opportunity has attribution snapshots; `source_lead_id` set; company name prefers intake company name.
9. Direct Opportunity: current Source/Campaign editable. Add a monthly Offer line qty 10 at $50 — MRR $500. One-time lines sum to header one-time. Editing an Offer afterward does not rewrite existing lines.
10. Northwind Advisors “Advisory retainer” still shows **$12,000.00** as a one-time line (not a missing amount).
11. Company lifecycle control. Won a Prospect → Customer. Lost does not make them Former Customer. Former Customer remains usable. Active checkbox is not lifecycle.
12. Won sets a close date; Reopen clears it. Do not expect pre-B1 Won rows to have `won_at`.
13. Dashboard: current pipeline includes old open work; Won in “this month” only if `won_at` is this month; Campaign table must not say ROI.
14. VIEW vs MANAGE: VIEW can see lists/dashboard; MANAGE can mutate. Slice A: Lead stages, convert, activities, notes, Lost `Other` text still required.
15. Martial Arts on :5030 still independent.

---

## Deviations from Work Order

- Intake **field-catalog** editor is under Core Settings (ADMIN). MANAGE_SALES enable/disable is on Campaigns. Product-required toggle is available without taking the CRM down.
- Pre-B1 Won/Lost timestamps were **not** invented from `updatedAt` (explicit non-deviation of Decision 38; recorded so QA is not surprised).
- `createOpportunity` still accepts `amountCents` to materialize a one-time line (migration/compat). The Opportunity UI does not treat header amount as independently editable.
- Honeypot is evaluated before the enabled check, so a bot filling the trap still gets generic thank-you when intake is off (no Lead).
- No browser-tool owner pass was possible in this session; public HTTP smoke and automated tests were used instead.

No product contradictions required a hard stop.

---

## Newly discovered decisions / risks

None that reopen Decisions 1–64. Residual QA risk: a Sales `pnpm dev` process that has been up since before B1 should be restarted so Nuxt picks up new public routes/plugins.

---

## Files changed (implementation)

Sales-owned only. Representative set:

- Schema/migration `0002_cheerful_firebrand` + snapshot/journal
- Services: `acquisition.ts`, `commercial.ts`, `public-intake.ts`, `reporting.ts`, `authorization.ts`, `sales.ts`
- Public pages `/inquire`, `/t/[token]`, `PublicIntakeForm.vue`
- Staff: Campaigns, Offers, Sources APIs, opportunity lines, dashboard, Lead/Opportunity/Company workspaces, `/settings/intake`
- Tests: `tests/b1/b1.test.ts` plus registration/schema updates
- Vault: this return, Current-State, lockfile, milestones, decisions, architecture, Working-Agreement, `sales_template/AGENTS.md`, the Work Order file

**Not changed:** `packages/crm-core`, `martial_arts_template` product code, Control Plane, Renzo, `.obsidian/workspace.json`.

---

## Git commit table

Filled after the implementation commit.

| Item | SHA |
|---|---|
| Authorization / start | `83506fc4f5aefc54ff65bfd3365081e16100526e` |
| Feature / closeout | `40851e04ac0cc64fc3315cf698991ef39c432987` |
| Branch | `working` |

Commit: `40851e0` Implement SI Sales B1 commercial model and acquisition foundation.

---

## What remains deferred (B2 / later)

- B2 proposals, PDF, versioning, artifact workflow, visual signature block, staff-recorded acceptance, signed-copy upload
- Customer accounts / portal / browser e-sign / automated proposal email
- Customer-facing form builder
- C2 Control Plane Sales catalog / Sales Docker / CP provisioning
- D1 schema, Beauty, S7/VPS, DNS/TLS, PostgreSQL
- SI production migration/cutover
- Billing / Stripe / invoicing / QuickBooks
- Detailed visitor/session analytics, multi-touch attribution, ad-platform sync, marketing automation
- Core promotion of Sources/Campaigns/public capture
- External Renzo production changes

**STOP. Do not begin B2.**
