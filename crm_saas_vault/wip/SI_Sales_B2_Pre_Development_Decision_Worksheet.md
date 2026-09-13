---
type: note
status: draft
area: process
updated: 2026-09-12
aliases:
  - SI Sales B2 worksheet
  - B2 pre-development decisions
tags:
  - wip
  - saas
  - decisions
  - sales
  - b2
---

# SI Sales B2 — Pre-Development Decision Worksheet

WIP communication. **Not** the project map. **Not** a work order. Checking boxes records Scott’s decisions. It does **not** authorize implementation.

Cursor may change Sales (or any other product) code only after a separate active [[Work-Order-Protocol]] work order, or Scott’s explicit ask in that later chat.

Do not promote answers from this file into [[SaaS-Decisions]] or ADRs until Scott has completed the checkboxes **and** a follow-up says to promote.

Prior Slice B decisions: [[wip/SI_Sales_Slice_B_Pre_Development_Decision_Worksheet]] (Decisions 1–64). B1 closeout: [[history/B1_closeout]]. B1 return: [[history/WO-2026-09-12-si-sales-b1-commercial-acquisition-return]].

---

## 1. Purpose / status

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Repository | `Koifish95/crm_marketing_saas` |
| Branch | `working` |
| HEAD at this write | `fbc38f0ed9d670a9ca5bf82ded7fb0c1017912d1` (B1 Successful closeout) |
| B1 feature SHA | `40851e04ac0cc64fc3315cf698991ef39c432987` |
| S-track | S0–S6 **Successful**. S7–S11 **not started** |
| C-track | C1 **code-shipped**. C2A / C2B / B1 **Successful**. C2 / C3 **not started**. D1 schema **not shipped** |
| Implementation authorization | **None.** `authorization.active_work_order: null`. **B2 is not authorized.** |
| Purpose | Settle remaining SI Sales **B2** product/architecture decisions before a B2 Work Order |
| This document | **Decision / discovery only** |
| Owner-review state | **OWNER REVIEW REQUIRED — B2 planning decisions remain.** |

B2 is the **proposal/document portion** of already-approved Slice B. Proposal generation is **in Slice B** (Decision 22). B1/B2 split is Decision 44. This worksheet does **not** reopen whether proposals belong in Slice B.

---

## 2. Canonical baseline

Inspected 2026-09-12 on `working` after fetch/pull (already up to date).

| Source | Fact |
|---|---|
| [[Current-State]] / [[project-state.yaml]] | B1 **Successful**. No active WO. B2 next Slice B candidate, **not authorized**. C2 not started. D1 not shipped. SI not migrated. |
| [[history/B1_closeout]] | B2 not authorized. Proposal generation remains an approved Slice B requirement and stays in B2. |
| [[SaaS-Decisions#2026-09-12 — Official SI Sales B1 is Successful]] | B1 closed. B2 not authorized. Proposal generation remains in B2. |
| [[Work-Order-Protocol]] | Roadmaps and this worksheet **never** authorize implementation. |

Git/code wins if older worksheet prose about Slice A still describes pre-B1 Sales. Section 3 is implementation truth.

---

## 3. What B1 provides (implementation truth)

`sales_template/` / `sales-crm` on http://localhost:5040. Journal `0000_wide_cyclops` + `0001_thankful_lyja` + `0002_cheerful_firebrand`. Feature `40851e0`.

```text
Campaign + Source → Tracking Link /t/{token} → public intake → Lead
     → convert (snapshot attribution) → Opportunity lines → Won/Lost
```

| Area | After B1 |
|---|---|
| Opportunity | `sales_opportunities`: Company required, optional `primaryContactId`, stages `proposal_quote` → `decision` → `won` \| `lost`, derived `amount_cents` + `mrr_cents`, `won_at` / `lost_at`, captured+current attribution |
| Commercial lines | `sales_opportunity_lines`: optional `offer_id`, description snapshot, qty, `pricing_type` `one_time` \| `monthly`, quoted `unit_price_cents`. Offer edits do not rewrite lines. `MRR = qty × monthly unit` |
| Offers | `sales_offers` catalog, not billing |
| Company | `sales_accounts`: `lifecycle` prospect/customer/former_customer; `active` is availability. **No address/logo/legal fields** |
| Contact | first/last, optional email/phone/title. Tied to Company |
| History | chronological `sales_notes` |
| RBAC | `VIEW_SALES` / `MANAGE_SALES` only |
| Settings | Core `app_settings` JSON for public intake (`sales.public_intake`). Brand from `NUXT_PUBLIC_*` env (`publicBrand()`: app name, brand name, location, tagline). **No logo, address, phone, email, website, or legal footer** |
| Files | Sales has **no** assets table and **no** uploads directory. `.gitignore` ignores sqlite under `data/`, not a proposals folder |
| PDF | **No** PDF/Chromium/document library in this repo (`package.json` search: none) |
| UI | Opportunity workspace already edits lines, attribution, Won/Lost/Reopen. **No** Proposal nav or entity |
| Reporting | Operational dashboard + Source/Campaign/Tracking Link tables. **No** proposal metrics |
| Tests | `tests/b1/b1.test.ts` plus Slice A domain tests; `pnpm db:migrate` on existing sqlite |
| Public | `/inquire`, `/t/{token}`; no customer portal |

Martial Arts has `data/uploads` + `assets` table (marketing files). Pattern evidence only. Do **not** import MA assets/domain into Sales (Decision 41).

---

## 4. Existing owner decisions inherited by B2

**Do not ask Scott these again.** Authority: [[wip/SI_Sales_Slice_B_Pre_Development_Decision_Worksheet]] unless noted.

### Already decided (proposal core)

| ID | Decision | B2 consequence |
|---|---|---|
| **22** | Proposal generation remains in Slice B. Do not reduce to metadata-only. | B2 ships a real Proposal product, not a stage label. |
| **23** | Proposal belongs to an Opportunity. Multiple versions; **one current**. | `sales_proposals.opportunityId`. Not hung off Company. |
| **24** | Listed contents. No tax/invoicing. One branded template, not a template CMS. | Customer-facing artifact includes seller identity, Company, Contact, title, number, created date, expiration/valid-through, scope/summary, lines, qty, one-time, MRR, totals, terms/notes, visual signature area, status/version. Cursor numbering suggestion: `P-YYYY-NNNN` unless a B2 decision changes identity. |
| **25** | Issued proposal lines are **snapshots**. Offer/Opportunity edits do not rewrite issued proposals. | Draft may copy live Opportunity lines; issue freezes a copy. |
| **26** | States: Draft; Issued/Sent; Accepted; Declined; Expired; Superseded. Issued is immutable; revisions create a **new version**. | No background expire worker in Slice B. UI may show past valid-through without auto-status unless inexpensive. |
| **27** | HTML preview + locally generated PDF. **No paid doc API. No Chromium.** | Regeneration from snapshot allowed if the file is missing; **snapshot is source of truth**. |
| **28** | Generate/download + status. **No in-app email send.** | Staff email the PDF themselves. |
| **29** | Visual signature block; staff-recorded acceptance; optional uploaded signed copy; **Won stays explicit**. No DocuSign clone. No browser customer e-sign. No public signing portal. | No tokenized customer signing routes in B2. |
| **31** | Accepted proposal does **not** auto-Won. | UI may make Won obvious after Accepted; staff still clicks Won. |
| **18** (Slice B) | No discount engine/field. Quoted unit price only. | PDF shows quoted unit × qty, not list-vs-discount. |
| **16 + 50** | Opportunity lines = working commercial truth. **Separate** `sales_proposal_lines` snapshot per issued version. Copy at issue. Drafts may refresh from Opportunity lines until issued. | Two tables. Do not live-link issued PDFs to `sales_opportunity_lines`. |
| **30 + 51** | Snapshot in DB + local `sales_template/data/proposals/` files for generated and optional signed PDFs. **No object storage / S3.** | Gitignore that folder at implementation. DB stores path/filename/content-type. |
| **40** | Proposals stay **Sales-owned**. No Core promotion in Slice B. | New tables/services/pages in `sales_template/`. |
| **41** | Inspect MA as evidence only. No MA imports. | Copy the *idea* of local files under `data/`, not MA `assets` tables. |
| **43** | Local Sales refinement only. No SI migration, C2/CP, VPS, DNS/TLS, billing, self-service. | B2 is still laptop `:5040`. |
| **44** | B2 = proposal system + remaining **proposal-related** reporting polish. Do not redesign all B1 reporting. | Dashboard may add a small proposal strip; no new BI product. |
| **60** | Instance-local; no SI identity in infrastructure. Later hostname selects the instance. | Proposal URLs/files stay inside this Sales sqlite/disk. No tenant id in filenames required for B2. |
| **61** (branding principle) | Do not hardcode Strategic Insights into Sales components. Use configurable settings. No form/CMS builder. | Seller letterhead must be **instance configuration**, not Vue constants. B1 brand env vars are **not enough** for a PDF (no address/phone/email/logo). That gap is Decision **B2-03**. |

### Decision 26 vs 28 (Issued/Sent)

Decision 26 listed **Issued/Sent** as one combined label. Decision 28 forbids CRM email send but still requires staff to record **status**. Whether “PDF finalized” and “we sent it” are one state or two is **B2-02**.

### Not inherited as “ask again”

- Browser e-sign, customer portal, automated email, tax, invoicing, S3, Chromium, Core promotion, C2, D1, SI cutover.

---

## 5. Proposed B2 boundary

Center of B2, given Decisions 22–31, 44, 50–51:

### Proposal domain

- Proposal belongs to an Opportunity.
- Sales-owned number + revision identity.
- Lifecycle from Decision 26, refined by B2-02.
- One current commercial offer unless B2-01 says otherwise.
- Per-revision immutable commercial snapshot (`sales_proposal_lines` + totals + names).

### Presentation

- Staff HTML/printable preview from the snapshot (same layout as PDF).
- Local PDF generation (no Chromium).
- One branded template. One-time and MRR presented separately. No tax.

### Artifacts

- Generated PDF on disk under gitignored `data/proposals/`.
- Optional uploaded signed PDF in the same store (Decision 30).
- DB metadata (path, original filename, content type, created at).
- Missing generated file may be regenerated from the snapshot (Decision 27). Signed uploads are not regenerated.

### Workflow

- Draft (editable; lines may refresh from Opportunity).
- Issue/finalize → snapshot + generate PDF; issued revision immutable.
- Material change → new revision; prior becomes Superseded and remains visible.
- Staff-recorded Accepted / Declined.
- Staff explicitly marks Opportunity Won (Decision 31).
- Download PDF. No in-app send.

### Reporting/polish

- Small Opportunity-adjacent and dashboard counts: current draft, issued/open, accepted, declined; optional aging past valid-through as a **display** flag.
- Do not rebuild Source/Campaign reporting.

---

## 6. Explicit exclusions

Out of B2 unless a **new** owner decision (not this worksheet’s default) says otherwise:

- Browser customer e-sign, public signing portal, legal-evidence audit trail (29)
- Customer accounts / portal
- In-app email / SMTP (28)
- Customer-facing form/document CMS or template editor (24)
- Tax, invoicing, Stripe, QuickBooks, billing (2, 24)
- Discount engine (18)
- Object storage / S3 (30, 51)
- Chromium / Playwright / Puppeteer (27)
- C2 CP Sales catalog, D1 schema, SI production migration, VPS, DNS/TLS (43, 60)
- Core promotion of Proposals (40)
- Redesign of B1 attribution/dashboard
- Service delivery / projects / ticketing

---

## 7. Technical assessment (Cursor will decide at Work Order time unless an owner decision changes product meaning)

These are **not** owner questions.

### Schema (recommended)

- `sales_proposals` — `opportunity_id`, stable `proposal_number`, pointer to current revision, timestamps.
- `sales_proposal_revisions` — `proposal_id`, `revision` (integer, starting at 1), `status`, issued/accepted/declined timestamps, valid-through, title, intro/scope/terms/notes snapshots, seller/customer/contact name snapshots, totals caches, `generated_pdf_path`, optional `signed_pdf_path`.
- `sales_proposal_lines` — per revision: description, qty, pricing type, unit price, optional offer id/name snapshot. Derived one-time/MRR same math as B1.

History notes on issue, revise, accept, decline, signed-upload. Reuse `sales_notes` (`record_kind` extended or opportunity-scoped notes). Prefer extending `record_kind` with `proposal` if cheap; otherwise note on the Opportunity. Implementation detail.

Journal **0003** after `0002_cheerful_firebrand`. `pnpm db:migrate` on existing sqlite. No `db:setup` reset as the strategy.

### Numbering

Unless B2-01 changes identity: sequential instance-local `P-{Denver year}-{NNNN}` shared across revisions; revision shown as `P-2026-0007 r2`. Not SI-specific. Unique inside this sqlite.

### PDF architecture

Decision 27 already forbids Chromium and paid APIs.

**Recommendation:** 

1. One Vue (or Nitro HTML) **preview page** bound to a revision snapshot (staff, `auth` + `VIEW_SALES`; generate/mutate `MANAGE_SALES`).
2. Server PDF via **PDFKit** (streamed vector PDF, no browser, works in local Node 22 and later Docker/VPS without bundling Chrome). `pdf-lib` is a reasonable alternate if implementation prefers composing pages; **do not** add Playwright/Puppeteer.
3. Deterministic layout from snapshot fields + instance letterhead config. Embedded standard fonts first; custom font file only if letterhead requires it.
4. Page-break: table-aware wrapping in the PDF layer, not CSS print hacks.

This does **not** change product behavior versus Decision 27.

### Artifact storage

Follow Decisions 30/51: `sales_template/data/proposals/{proposalId}/{revision}/generated.pdf` and optional `signed.pdf`. Env override `SALES_PROPOSALS_DIR` later for Docker volume (same pattern as MA `ASSET_UPLOAD_DIR`), **not** S3. Add `/data/proposals/` to Sales `.gitignore`. Future Control Plane Sales backup would include that directory the way MA includes `uploads/` — document in the B2 return; do not build CP Sales backup in B2.

### Regeneration

- Issued snapshot is authoritative (25, 27).
- Regenerating the **generated** PDF for the same revision is allowed and **overwrites** the generated file (same revision identity).
- Uploaded signed PDF is a distinct artifact; never overwrite it by regeneration.
- Every **Issue/revise** creates a new revision row + new generated file. Old files stay.

### RBAC

Keep `VIEW_SALES` / `MANAGE_SALES`. View/download with VIEW; create/issue/revise/accept/upload with MANAGE. No third permission unless Scott later asks.

### Settings

Seller letterhead (B2-03) should use Core `app_settings` JSON (same pattern as `sales.public_intake`), not `.env` field lists, not hardcoded SI. Brand **name** can still come from `publicBrand()` so SI dogfood stays `.env` for the wordmark.

### UI

Opportunity workspace: Proposals related list + current proposal. Compact Proposals index optional. Preview/download from revision. Do not invent a second CRM.

### Tests

`sales_template/tests/b2/` covering: snapshot copy at issue; Opportunity line edit does not change issued revision; new revision on commercial change; Accepted does not auto-Won; unknown file missing regenerates from snapshot; signed upload stored separately. Copy B1 test style.

### SaaS compatibility

Opaque per-instance files and numbers. No SI string in code. Later `{slug}.{product-domain}` still serves the same app. Do not embed customer slug in proposal numbers.

---

## 8–10. Numbered unresolved owner decisions

Only questions that still change customer/staff/document semantics. Everything else is Section 4 or 7.

---

## Decision B2-01 — One current revision chain, or concurrent independent proposals?

**Why this is still open**

Decision 23: “An Opportunity may have multiple Proposal versions/revisions, but only one should be the current/active proposal at a time.” That settles **sequential revisions**. It does not explicitly say whether SI ever needs **two live alternative quotes** on the same Opportunity (for example Managed IT vs a fixed project package) at the same time.

**Existing repository evidence**

- Decision 23 APPROVE — Proposal belongs to Opportunity. Multiple versions; one current.
- Opportunity is the working commercial record; it has **one** line list, not two parallel packages (B1).
- Decision 50: issuing copies **current Opportunity lines**. Concurrent alternatives would require either two Opportunities or a proposal that is not a copy of the single working line list.

**Cursor recommendation**

**Option A.** One Proposal per Opportunity with a revision chain. Only one current (non-superseded) revision. Alternative commercial packages = a **new Opportunity** (or edit lines, then a new revision). Matches B1’s single working line list and Decision 23/50.

**Option A**

One proposal record per Opportunity. Revisions supersede. Staff cannot have two current issued PDFs on the same Opportunity.

**Option B**

An Opportunity may have multiple independent Proposal records (each with its own revisions). At most one marked Current/Active for reporting/Won. Allows two live quotes; more UI and a conflict with “copy current Opportunity lines” unless drafts can diverge from working lines.

**Option C**

Not useful: Proposal hanging off Company (rejected by Decision 23).

**Owner decision**

`PENDING`

---

## Decision B2-02 — Is “Issued” enough, or do we also record “Sent”?

**Why this is still open**

Decision 26 listed **Issued/Sent** as one combined state. Decision 28: no CRM email, but staff must be able to record status after they email the PDF themselves. Product meaning differs if “the PDF exists” is the same as “the customer has it.”

**Existing repository evidence**

- Decision 26 APPROVE — Draft; Issued/Sent; Accepted; Declined; Expired; Superseded.
- Decision 28 APPROVE — Generate/download + status. No in-app email send.
- No SMTP in Sales/Core.

**Cursor recommendation**

**Option A (preferred).** Two cheap staff actions on the same issued revision: **Issue** (snapshot + PDF; immutable commercial terms) and optional **Mark sent** (timestamp + history note). Status can remain `issued` with `sent_at` nullable, or a distinct `sent` status. No mailer. Matches “record status” without pretending the CRM delivered the file.

**Option A**

Issue = finalized PDF. Optional staff “Mark sent” stores `sent_at` / history. Dashboard can count issued vs sent.

**Option B**

One state only: Issue means “ready and we treat it as sent.” Staff responsibility is outside the CRM. Fewer clicks; weaker “what did we send, and when?”

**Owner decision**

`PENDING`

---

## Decision B2-03 — Seller letterhead: which fields, and how configured?

**Why this is still open**

Decision 24 requires SI identity/branding on the artifact. Decision 61 forbids hardcoding Strategic Insights and says brand env vars are not a CMS. B1 `publicBrand()` only has app name, brand name, location, tagline. Company records have **no** seller address. A customer-ready PDF almost certainly needs more than a name. That extra letterhead is **new B2 configuration**, not a B1 leftover.

**Existing repository evidence**

- Decision 24 content list: “SI identity/branding”.
- Decision 61: Core brand env + configuration-driven intake; **do not hardcode SI**; no theme/logo CMS in B1; optional logo “unnecessary unless Scott requires it.”
- `publicBrand()`: `NUXT_PUBLIC_APP_NAME` / `BRAND_NAME` / `BRAND_LOCATION` / `PUBLIC_TAGLINE` only.
- Public intake already uses `app_settings` JSON for instance copy.

**Cursor recommendation**

**Option A (preferred).** Sales-owned instance settings (Core `app_settings` JSON, e.g. `sales.proposal_letterhead`), editable by ADMIN/MANAGE like intake: legal business name (defaulting to brand name), address lines, phone, email, website, optional logo file in `data/proposals/_letterhead/` (or the same proposals dir), optional footer/legal blurb. Wordmark can still use `publicBrand()`. SI dogfood = fill the settings, not fork Vue. No per-customer white-label theme product.

**Option A**

Configurable letterhead fields listed above, including **optional** logo upload. Text-only PDF is allowed if logo is empty.

**Option B**

Text letterhead only (name, address, phone, email, website, footer). **No logo** in B2. Smaller storage/UI. Less “customer-ready” for some SI quotes.

**Option C**

Brand env vars only (name/location/tagline). Fastest. Weak as a customer PDF; likely forces a follow-up slice.

**Owner decision**

`PENDING`

---

## Decision B2-04 — Which narrative blocks are typed per Proposal vs instance-default?

**Why this is still open**

Decision 24 listed title, scope/summary, terms/notes, signature area. It did not say which of those staff type **every time** vs which are **instance boilerplate** (payment terms, confidentiality, “this is not an invoice”). Building all of them as a mini CMS would violate “not a template CMS.”

**Existing repository evidence**

- Decision 24: one branded template; listed contents; no template editor.
- Decision 18: no discount theater on the PDF.
- Decision 29: visual signature/acceptance area, not a legal e-sign system.
- B1 lines already carry description, qty, type, unit price.

**Cursor recommendation**

**Option A (preferred).** Closed document slots, not a CMS:

| Slot | Source |
|---|---|
| Title | Per revision (default = Opportunity name) |
| Intro / scope | Optional per revision (textarea) |
| Commercial lines | Snapshot from Opportunity at issue (50) |
| Totals | Derived one-time + MRR |
| Terms / legal footer | **Instance default** from letterhead/settings (B2-03), overridable per revision if staff clear/replace |
| Notes | Optional per revision |
| Signature area | Fixed template copy (“Accepted by / date / name”) |

Staff do not add arbitrary extra sections in B2.

**Option A**

Closed slots as the table. Instance default terms + optional per-proposal intro/notes.

**Option B**

Every narrative field is blank per proposal (no instance terms). More typing; no accidental wrong-customer boilerplate.

**Option C**

Rich template editor / repeating custom sections. Out of Decision 24. Do not pick unless Scott explicitly wants a document platform.

**Owner decision**

`PENDING`

---

## Decision B2-05 — Valid-through: required, and stored Expired vs display-only?

**Why this is still open**

Decision 24 includes expiration/valid-through on the artifact. Decision 26 includes **Expired** in the state list but Cursor said **no background job**; UI may show past valid-through without auto-status unless inexpensive. Staff workflow changes if every proposal must have a date, and if the CRM silently flips status at midnight.

**Existing repository evidence**

- Decision 24 contents include expiration/valid-through.
- Decision 26: listed Expired; no Slice B worker; display rule is allowed.
- Decision 28: no email reminders.

**Cursor recommendation**

**Option A (preferred).** Optional `valid_through` date on a revision (staff may leave blank). **Do not** auto-write `expired` in a job. Preview/list may label “past valid-through” when the date is set and in the past. Staff may still Accept a past-dated revision (SI sometimes honors it). Matches Decision 26’s “inexpensive display.”

**Option A**

Optional valid-through. Display-only aging. No auto status flip.

**Option B**

Valid-through **required** at Issue. Still display-only Expired (no job). Forces a date on every issued PDF.

**Option C**

Required date **and** stored status becomes Expired when viewed/listed after that date (computed on read, still no worker). Stricter; can surprise staff if they open an old issued proposal.

**Owner decision**

`PENDING`

---

## Decision B2-06 — Who is the proposal addressed to?

**Why this is still open**

Decision 24 includes customer Company and customer Contact. Opportunity already has optional `primaryContactId`. Company has no billing address. Whether B2 needs a **proposal-specific recipient** (or multiple recipients) is still a staff-workflow choice.

**Existing repository evidence**

- `sales_opportunities.primary_contact_id` nullable.
- Contacts: name, email, phone, title; no mailing address.
- Companies: name, notes, lifecycle; **no address**.
- Decision 24: customer Company + Contact on the artifact.
- No multi-recipient mailer (Decision 28).

**Cursor recommendation**

**Option A (preferred).** One recipient Contact per revision, defaulting to Opportunity primary Contact, staff-selectable from that Company’s contacts. Snapshot name, title, email, phone at issue. Company **name** (and optional notes) snapshot. No second recipient list in B2. No new Company address fields unless Scott needs a bill-to block (if yes, say so in notes; that is extra B2 scope).

**Option A**

Single selectable Contact + Company name snapshot. Default = Opportunity primary Contact.

**Option B**

Always the Opportunity primary Contact. No picker. Simpler; fails when the signer is not the primary.

**Option C**

Multiple recipient Contacts on one proposal. Useful for CC lists; extra UI; still no email send. Defer unless SI actually needs it on the PDF.

**Owner decision**

`PENDING`

---

## 11. Deferred list (not B2 owner questions)

| Item | Why deferred |
|---|---|
| Browser e-sign / portal | Decision 29; separate authorization |
| In-app email send | Decision 28 |
| Tax / invoicing / Stripe | Decisions 2, 24 |
| Discount / list vs quoted | Decision 18 |
| S3 / object storage | Decisions 30, 51; S7 |
| Chromium PDF | Decision 27 |
| C2 / D1 / SI cutover / VPS / DNS | Decisions 43, 60 |
| Company mailing address book | Only if Scott rejects B2-06 Option A without address |
| Concurrent option packages beyond B2-01 | If A is chosen, use another Opportunity |
| Proposal-only forecasting / weighted pipeline | Decision 44: no BI project |
| Customer self-serve download link | Portal; not authorized |
| Core promotion of documents | Decision 40 |

---

## 12. Work Order readiness checklist

A B2 Work Order may be **drafted** only after this worksheet’s six owner decisions are recorded. Checking those boxes still does **not** start code.

Before ChatGPT prepares `WO-…-si-sales-b2-…`:

- [ ] B2-01 recorded
- [ ] B2-02 recorded
- [ ] B2-03 recorded
- [ ] B2-04 recorded
- [ ] B2-05 recorded
- [ ] B2-06 recorded
- [ ] No reopen of Decisions 22–31, 50–51, 28–29, 43, 60
- [ ] Work Order names B2 only; forbidden_scope includes e-sign, email send, C2, D1, SI cutover, billing, Chromium, S3
- [ ] Expected journal `0003`; migrate existing sqlite; tests under `tests/b2/`
- [ ] `authorized: yes` only when Scott says so in Git or the implementing chat

---

## Classification appendix (Step 6 map)

| Topic | Class | Where |
|---|---|---|
| Proposal ≠ Opportunity | A already decided | Decision 23 |
| Lines vs snapshots | A | 16, 25, 50 |
| Revisions / issued immutability | A | 26 |
| HTML preview + PDF | A + B technical library | 27 + §7 |
| Generated + optional signed PDF | A | 30, 51 |
| No browser e-sign | A | 29 |
| Staff-recorded acceptance | A | 29 |
| Won remains explicit | A | 31 |
| No automated email | A | 28 |
| Number format `P-YYYY-NNNN` + revision | B technical | §7; Decision 24 Cursor note |
| One vs many proposal **records** | **C** | B2-01 |
| Draft / Issued / Sent / Accepted / Declined / Expired / Superseded | A list; **C** for Issued vs Sent and Expired | 26 + B2-02 + B2-05 |
| What snapshot copies | A | 25, 50; qty, description, type, unit, offer name, totals |
| Later Opportunity/Offer edits | A | 25, 50: do not rewrite issued |
| Recipient Contact | **C** | B2-06 |
| Seller letterhead / logo / legal | **C** | B2-03 (61 forbids hardcoding SI; env brand is insufficient) |
| Narrative sections | **C** | B2-04 |
| Valid-through / auto-Expired | **C** | B2-05 |
| PDF engine | B | PDFKit (or pdf-lib); no Chromium |
| Disk vs S3 | A | 30, 51 |
| Regeneration vs new artifact | B | §7; same revision may rebuild generated PDF |
| Proposal Accepted vs Won | A | 31 |
| Sending | A + **C** for Sent timestamp | 28 + B2-02 |
| Reporting | B | small counts; no new funnel product |
| RBAC | B | keep VIEW/MANAGE_SALES |

---

**OWNER REVIEW REQUIRED — B2 planning decisions remain.**

Do not create the B2 Work Order until the six `PENDING` decisions are recorded. Do not implement B2 from this file.
