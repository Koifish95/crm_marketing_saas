---
type: note
status: draft
area: process
updated: 2026-09-12
aliases:
  - SI Sales Slice B worksheet
  - Slice B pre-development decisions
tags:
  - wip
  - saas
  - decisions
  - sales
---

# SI Sales Product Refinement — Slice B Pre-Development Decision Worksheet

WIP communication. **Not** the project map. **Not** a work order. Checking boxes records Scott’s decisions. It does **not** authorize implementation.

Cursor may change Sales (or any other product) code only after a separate active [[Work-Order-Protocol]] work order, or Scott’s explicit ask in that later chat.

Do not promote answers from this file into [[SaaS-Decisions]] or ADRs until Scott has completed the checkboxes **and** a follow-up says to promote.

Prior completed twin: [[wip/SI_Sales_Product_Refinement_Pre_Development_Decision_Worksheet]]. ChatGPT draft input for this file was reviewed against Git on `working` at the SHA below.

---

## 1. Header / status

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Repository | `Koifish95/crm_marketing_saas` |
| Branch | `working` |
| HEAD SHA at write | `aff6e84` (`aff6e84b5da7762b783b7e9f91b9f780d8a84fe2`) |
| Lockfile `head_at_write` | `1ac18e4` in [[project-state.yaml]] — Slice A implementation SHA |
| S-track | S0–S6 **Successful**. S7–S11 **not started** |
| C-track | C1 **code-shipped**. C2A **Successful**. C2B **Successful**. C2 / C3 **not started**. D1–D4 **accepted**; D1 schema **not shipped** |
| C2B status | **Successful** (2026-09-12). Evidence: [[history/C2B_closeout]] |
| Implementation authorization | **None.** `authorization.active_work_order: null`. Slice B is **not authorized** |
| Purpose | Settle SI Sales Slice B product/architecture decisions before any implementation Work Order |
| This document | **Decision / discovery only** |

---

## 2. Repository reconciliation

Inspected: [[Current-State]], [[project-state.yaml]], [[SaaS-Milestones]], [[SaaS-Decisions]], [[ADR-CRM-Core-Vertical-Architecture]], [[Platform-Architecture]], [[Work-Order-Protocol]], [[history/C2B_closeout]], [[history/WO-2026-09-11-si-sales-slice-a-return]], [[wip/SI_Sales_Product_Refinement_Pre_Development_Decision_Worksheet]], `sales_template/` schema/services/pages/dashboard, Martial Arts `campaigns` / `campaign_tracking_links` / UTM attribution as **comparison evidence only**.

### What Slice A currently implements

`sales_template/` / `sales-crm` on http://localhost:5040. Journal `0000_wide_cyclops` + `0001_thankful_lyja`.

```text
Lead (optional Company) → New / Contacted / Qualified → Convert Lead
→ Company + Contact + Opportunity (Company required)
→ Proposal / Quote → Decision → Won | Lost
→ Reopen
```

- Lead: `sales_leads`. Company optional. Converted Lead retained with conversion links.
- Opportunity: `sales_opportunities`. One-time nullable `amount_cents`. Stages `proposal_quote` → `decision` → `won` \| `lost`. Terminal until Reopen. Structured loss reason. `source_lead_id` only (no source/campaign fields).
- Company: `sales_accounts` with `active` boolean only. No prospect/customer lifecycle.
- Contact: requires `account_id`.
- Activities, chronological `sales_notes`, owners on Lead/Opportunity/Activity.
- Company and Opportunity workspaces via Core `AppRecordWorkspace`.
- Dashboard: six counts (companies, contacts, open/won/lost opportunities, open activities). No pipeline value, MRR, overdue queue, source, or campaign.
- No Offer table. No commercial line items. No Source/Campaign tables. No proposal entity, files, or generator. No email delivery. No public capture. No PDF library.
- `markOpportunityWon` sets `stage='won'` and `updatedAt`. There is **no** `won_at` / `lost_at`.
- Opportunities can be created directly, not only by Lead conversion.
- Demo seed remains Northwind Advisors, not Strategic Insights data.

### What Slice B is intended to add

Unshipped Slice B work already named in [[Current-State]] and the C2B closeout: Offers, MRR, attribution UI, dashboard expansion, Company lifecycle, **proposal generation**.

This worksheet also **reopens Campaigns** because Scott now requires campaign-level attribution and performance, not only a free-text campaign note.

### What architecture already constrains

- Sales-owned CRM entities. Do not promote Lead/Campaign/public capture/Offers/Proposals into Core. D2–D4. ADR: diverge first; abstract after two real implementations.
- Martial Arts Campaigns are a mature **gym acquisition** product (slug, kind, collaborators, tracking links, UTM, public `/trial` / `/t/[slug]`). Sales must not import that domain.
- C2 = Sales vertical **plus** Control Plane product catalog. C2B success does **not** authorize C2.
- Proposal generation is already an **approved Slice B product requirement** (prior worksheet Decisions 18 and 26). Do not reopen whether it belongs in Slice B unless Git creates a genuine blocker. It does not.

### What is explicitly deferred unless this worksheet promotes it

C2, D1 schema, SI migration, public capture, billing/Stripe/invoicing/QuickBooks, service delivery, Beauty, S7/VPS, DNS/TLS, Core promotion, MA → `apps/` move. See the deferred table at the end.

### Old decision being reopened

Prior worksheet **Decision 14 — Campaigns** was owner-approved as:

> Do not implement Sales Campaign management in this refinement phase. Capture attribution/source first.

That deferral was correct for Slice A. It is **no longer automatically binding** for Slice B. Scott has supplied new owner requirements: which source a Lead came from, which campaign it came from, and downstream Opportunity/Won performance by source/campaign.

This worksheet **intentionally reconsiders** that Campaign deferral. It does not pretend the old decision never existed. Completing this worksheet still does **not** rewrite [[SaaS-Decisions]] until a later promotion step.

Prior Decision 13 (source attribution as Sales-owned fields, including a campaign **note** rather than a Campaign entity) is likewise being expanded if Campaigns are approved here.

---

# Decisions

Recommended / default choices are listed first so Scott can approve by checking one box.

Decisions that need Scott’s business judgment even when Cursor agrees: **6 (source list), 7 (campaign fields/budget), 13 (tracking links), 18 (discounts), 29 (e-signature), 32 (lifecycle nouns), 39/47/48 (metric dates), 44 (B1/B2 split), 45 (campaign/source cardinality), 49 (MRR × quantity).**

---

# A. Slice B objective and boundary

## Decision 1 — Slice B objective

### Repository says

C2B Slice A is **Successful**: operational SI sales backbone (Lead, convert, Opportunity workflow). Closeout names Slice B as the next product-refinement **candidate** and lists Offers, MRR, attribution UI, dashboard expansion, Company lifecycle, and proposal generation as unshipped. No Slice B Work Order exists.

### ChatGPT recommendation

Turn the Slice A operational sales backbone into a usable **pre-sale commercial engine** for Strategic Insights.

Slice B should allow SI to:

1. define what it sells;
2. associate those offerings with Opportunities;
3. represent one-time and recurring commercial value;
4. know where Leads and Opportunities originated;
5. attribute business to marketing campaigns;
6. generate customer-facing proposals;
7. understand pipeline and acquisition performance;
8. transition Companies appropriately after a sale.

Slice B should stop at the commercial close. It should not become service delivery, project management, ticketing, accounting, or billing.

### Cursor assessment

**AGREE.** That list matches Git’s unshipped Slice B set, plus the newly required Campaign attribution. It is still a product-refinement slice, not C2 and not the entire eventual Sales CRM.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — Slice B = pre-sale commercial engine (offers, value, attribution/campaigns, proposals, reporting, Company lifecycle). Not delivery/billing/C2.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 2 — Slice B remains pre-sale focused

### Repository says

Won means a signed agreement/SOW exists (Slice A). There is no invoicing, Stripe, QuickBooks, ticketing, or service-delivery module. C2 and SI migration are not started.

### ChatGPT recommendation

Slice B ends at the successful commercial commitment and CRM-side customer transition.

Out of scope unless a later decision explicitly changes this: invoicing; payment processing; Stripe; QuickBooks; accounts receivable; service delivery; project execution; support tickets; customer success workflows; contract lifecycle management beyond what is necessary for the approved proposal flow; Control Plane provisioning; SI production migration.

### Cursor assessment

**AGREE.** Git has no mailer, payment, or delivery stack. Pulling any of those in would silently become a different milestone.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — Stop at commercial close + Company customer transition. Listed items stay out.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

# B. Attribution and Campaigns

## Decision 3 — Attribution is a first-class Slice B capability

### Repository says

No source, channel, or campaign columns on `sales_leads` or `sales_opportunities`. Opportunity has `source_lead_id` only. Dashboard cannot break down by origin. Prior Decision 13 approved Sales-owned attribution for Slice B, implemented as fields (including a campaign **note**), not a Campaign entity.

### ChatGPT recommendation

Treat attribution as a first-class Sales capability.

The system should eventually answer: where Leads come from; which sources/campaigns produce Opportunities; which produce Won business; what one-time and MRR value came from each; which acquisition efforts appear productive.

Attribution is business intelligence, not merely a note about who claimed credit.

### Cursor assessment

**AGREE.** Staff cannot answer those questions from current Git. A free-text campaign note cannot support Campaign performance reporting. First-class attribution is justified by the new owner requirements.

### Cursor recommendation

Same as ChatGPT. Bound it to **primary** Source + optional Campaign (Decision 8). Do not build a BI warehouse.

### Scott decision

- [ ] APPROVE — First-class primary attribution and reporting. Not a note-only field.
- [ ] REJECT — Keep Slice A (no attribution UI).
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 4 — Reopen the prior Campaign deferral

### Repository says

Prior worksheet Decision 14: **No Campaign domain** in the refinement phase; attribution/source first. That was the Slice A boundary and is still the last owner-approved Campaign decision. Canonical closeout still lists “attribution UI” as unshipped Slice B work and does **not** yet name a Campaign entity. Martial Arts already has a full Campaign product; Sales must not import it (D3).

### ChatGPT recommendation

Reopen the previous Campaign deferral and include a **bounded Sales Campaign capability in Slice B** to support attribution.

This does not mean cloning the Martial Arts Campaign implementation or building a full marketing automation platform.

### Cursor assessment

**AGREE.** The old Decision 14 answer is being reconsidered because **owner requirements changed**, not because the old answer was wrong for Slice A. Source-only fields cannot answer “which campaign produced Won MRR.” A bounded Sales-owned Campaign is the smallest model that satisfies the new requirement.

### Cursor recommendation

Same as ChatGPT. Smallest Campaign: named marketing effort with lifecycle + primary Source + optional dates/budget. No MA clone. No automation. Tracking links: Decision 13.

### Scott decision

- [ ] APPROVE — Reopen Decision 14. Include a bounded Sales-owned Campaign in Slice B for attribution/reporting.
- [ ] REJECT — Keep the old deferral. Source + free-text campaign note only.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 5 — Source and Campaign are distinct concepts

### Repository says

Sales has neither. Martial Arts uses `campaigns.channel` plus UTM on tracking links and leads. That is gym-shaped and public-capture-shaped, not a Sales Source catalog.

### ChatGPT recommendation

Yes. **Source** is the broad acquisition channel (Referral, Website/Organic, Facebook, …). **Campaign** is the specific organized marketing effort (e.g. September Managed IT Outreach).

A Lead may have a Source without a Campaign. A Campaign should have a Source/channel association where useful. Source should not be inferred solely from free text.

### Cursor assessment

**AGREE.** Collapsing them into one field would make “Facebook” and “Q4 Facebook ads” indistinguishable in reporting.

### Cursor recommendation

Same as ChatGPT. Cardinality of Campaign → Source is Decision 45.

### Scott decision

- [ ] APPROVE — Distinct Source vs Campaign. Source without Campaign is allowed.
- [ ] REJECT — Single combined origin field.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 6 — Controlled Sources

### Repository says

No Sales source list. Lost reasons already use a controlled enum with `Other` requiring text. That pattern works.

### ChatGPT recommendation

No free-text Source. Use a controlled source model/list with stable internal identifiers, user-facing names, active/inactive state, and an optional detail/note. Allow `Other`, but require source detail when `Other` is selected. Avoid hard-coding reporting logic around display strings.

Suggested values: Referral; Website / Organic; Facebook; Instagram; Google; Email; Cold Outreach; Networking / Event; Existing Customer; Partner; Other.

### Cursor assessment

**AGREE.** A small Sales-owned `sales_sources` table (code, name, active) is better than a hardcoded enum if Scott will add channels later. Seed the list. `Other` + required detail matches Slice A Lost.

### Cursor recommendation

Same as ChatGPT. Seed the suggested list unless Scott unchecks items. Staff with `MANAGE_SALES` can add/deactivate sources later; do not build a heavy admin product.

### Scott decision

- [ ] APPROVE — Controlled Sources table + Other requires detail. No free-text Source.
- [ ] REJECT — Free-text Source is enough.
- [ ] MODIFY — See Scott notes.

**Initial source list:**

- [ ] Referral
- [ ] Website / Organic
- [ ] Facebook
- [ ] Instagram
- [ ] Google
- [ ] Email
- [ ] Cold Outreach
- [ ] Networking / Event
- [ ] Existing Customer
- [ ] Partner
- [ ] Other (requires detail)
- [ ] Add/remove — See Scott notes.

**Scott notes:**

>

---

## Decision 7 — Campaign minimum model

### Repository says

No Sales campaigns. Martial Arts `campaigns` includes name, slug, channel, kind, budgetCents, active, status, description, objective, offer, targetAudience, notes, owner, startsAt/endsAt, actual start/end, collaborators, and tracking links. That is **too much** to copy.

### ChatGPT recommendation

Initial Campaign fields: Name; Description/objective; Status; Start date; End date; Primary Source/channel; optional budget; active/inactive or lifecycle state; created/updated timestamps.

Suggested lifecycle: Draft → Active → Completed → Archived.

Do not build complex campaign budgeting, ad-platform synchronization, content calendars, or automation unless separately approved.

### Cursor assessment

**AGREE WITH QUALIFICATION.** The ChatGPT field list is the right *maximum* for Slice B. Do **not** add MA slug/kind/offer/targetAudience/collaborators/actualStartsAt. Optional budget is a planning number in cents, not accounting. Lifecycle enum can replace a separate active boolean (`Archived` = inactive).

### Cursor recommendation

Sales-owned `sales_campaigns`: name, description, status (`draft` \| `active` \| `completed` \| `archived`), optional startsAt/endsAt, optional primarySourceId, optional budgetCents, timestamps. No slug, no collaborators, no tracking-link requirement.

### Scott decision

- [ ] APPROVE CURSOR — Bounded Campaign fields as above. Optional budget. No MA clone.
- [ ] APPROVE CHATGPT LIST AS WRITTEN — Include active/inactive *and* lifecycle if both are listed.
- [ ] OMIT BUDGET FROM V1
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 8 — Primary attribution model

### Repository says

Nothing. MA stores UTM fields on leads and tracking links; it is still not a multi-touch model.

### ChatGPT recommendation

No multi-touch. Use **primary acquisition attribution**: Primary Source, optional Primary Campaign, optional Source Detail. Do not build first-touch/last-touch/weighting models yet.

### Cursor assessment

**AGREE.** Multi-touch would dominate Slice B and is not required to answer Scott’s questions.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — Primary Source + optional Campaign + optional detail. No multi-touch.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 9 — Attribution originates on Lead

### Repository says

Lead is the intake record. Convert creates Company/Contact/Opportunity and sets `source_lead_id`. Staff also create Opportunities directly. Public capture is deferred.

### ChatGPT recommendation

Lead is the normal origin. A Lead should support Primary Source, optional Campaign, optional Source Detail. Manual Leads may be assigned attribution by staff. Future public forms/tracking links may populate the same fields later. Public capture remains outside Slice B unless separately authorized.

### Cursor assessment

**AGREE.** Lead is the right *normal* origin. Direct Opportunities still need attribution (Decision 46). Do not wait on public forms.

### Cursor recommendation

Same as ChatGPT, plus Decision 46 for no-Lead Opportunities.

### Scott decision

- [ ] APPROVE — Lead holds primary attribution for converted deals. Public capture still deferred.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 10 — Attribution survives conversion

### Repository says

Convert copies identity into Company/Contact/Opportunity and keeps `source_lead_id`. It copies **no** origin fields today because none exist. Lead remains mutable after convert (`converted` stage, but the row is still there).

### ChatGPT recommendation

Snapshot/carry the Lead’s primary attribution onto the resulting Opportunity so commercial reporting does not depend on a mutable historical Lead relationship. Preserve the source Lead link. The Opportunity should report Source/Campaign even if campaign metadata changes later. Cursor should advise IDs plus durable snapshot fields vs IDs only.

### Cursor assessment

**AGREE.** Reporting Won value by Campaign must not break if a Campaign is renamed or archived. IDs-only is fragile for history. A dedicated attribution-event table is unnecessary if Opportunity stores both FKs and snapshot names.

### Cursor recommendation

On convert, copy onto Opportunity: `sourceId`, `campaignId` (nullable), `sourceDetail`, plus snapshot `sourceName` / `campaignName` as of convert (and again if later corrected). Keep `sourceLeadId`. Reporting uses Opportunity snapshot fields, not a join through a possibly renamed Campaign.

### Scott decision

- [ ] APPROVE — Carry IDs **and** name snapshots onto Opportunity at convert. Keep source Lead link.
- [ ] IDs ONLY — Join live Source/Campaign rows; accept rename/archive effects.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 11 — Attribution correction

### Repository says

`sales_notes` already records chronological history. There is no dedicated change-log table. Staff can PATCH Leads/Opportunities today.

### ChatGPT recommendation

Yes, authorized staff should be able to correct erroneous attribution. Corrections should not silently destroy history. At minimum, chronological Sales history should record a meaningful attribution change. Do not implement complex attribution versioning unless technically warranted.

### Cursor assessment

**AGREE.** A dedicated attribution-version table is not justified. Write a `sales_notes` line on Lead and/or Opportunity describing the change (from → to). Reporting follows the **current** Opportunity snapshot after correction (Decision 10). Do not freeze attribution at Won unless Scott requires it.

### Cursor recommendation

Same as ChatGPT. History note required. No version table. Corrections allowed after convert and after Won.

### Scott decision

- [ ] APPROVE — Staff may correct attribution; write a history note; no version table.
- [ ] FREEZE AFTER WON — Corrections allowed only before Won.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 12 — Campaign performance scope

### Repository says

Dashboard cannot do any of this. Opportunity value is a single `amount_cents`. No MRR. No wonAt.

### ChatGPT recommendation

At minimum: Leads; converted Leads/Opportunities; open Opportunities; Won; Lost; Lead-to-Opportunity conversion rate; Opportunity win rate; one-time pipeline value; Won one-time value; MRR pipeline; Won MRR. If Campaign budget is included, simple spend-versus-results visibility is useful, but do not claim accounting-grade ROI.

### Cursor assessment

**AGREE WITH QUALIFICATION.** Those metrics are the right *target* once lines, MRR, and closed timestamps exist. Conversion/win rates and “this month” totals are meaningless without date anchors (Decisions 47–48). Budget vs results is optional and must be labeled as planning, not ROI.

### Cursor recommendation

Ship Campaign/Source performance as a Sales-owned report using those metrics. No ROI claim. Date rules from Decisions 47–48. Put a **baseline** version in B1 (Decision 44).

### Scott decision

- [ ] APPROVE — Listed Campaign/Source metrics. No accounting-grade ROI.
- [ ] REJECT — Counts only (Leads / Opportunities / Won).
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 13 — Campaign tracking links

### Repository says

Sales has **no public routes**. Martial Arts tracking links exist to hit `/trial` and `/t/[slug]` and stamp UTM + campaign onto public capture. A tracking-link row without a public destination does not populate Leads. Public capture was deferred (prior Decision 15) and ChatGPT still defers it (Decision 42).

### ChatGPT recommendation

Include a lightweight Campaign tracking-link concept **only if it can be useful without dragging public forms into Slice B**. Desired future behavior is that a campaign-specific URL/token can eventually populate Campaign/Source automatically. Do not build public landing pages/forms solely to justify tracking links. Cursor should assess now vs defer until public capture.

### Cursor assessment

**DISAGREE** with creating a tracking-link model in Slice B. It is not useful without public capture. It would copy MA’s public-attribution shape into Sales before Sales has a public intake. Staff can assign Campaign/Source on the Lead by hand. Reserve a later Work Order to add tokens once public capture exists.

### Cursor recommendation

**Defer tracking links** until public lead capture. Keep Campaign/Source assignable internally now so future links can fill the same fields.

### Scott decision

- [ ] APPROVE CURSOR RECOMMENDATION — No tracking-link table in Slice B. Manual attribution now.
- [ ] APPROVE CHATGPT RECOMMENDATION — Create a lightweight tracking-link data model now, without public forms.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

# C. Services / Offers

## Decision 14 — Sales-owned Offer catalog

### Repository says

Opportunity has free-text `name` and optional `amount_cents`. No offer table. Prior Decision 16 already approved a minimal Sales-owned Offer (Name, Description, Default price, Pricing type one-time|recurring, Active/inactive, Opportunity association). C2 catalog is Control Plane, not this.

### ChatGPT recommendation

Yes. Implement a Sales-owned **Offer** concept with those previously approved fields. Do not promote Offer into Core. Do not create an accounting/product-inventory subsystem.

### Cursor assessment

**AGREE.** This is already an owner-approved Slice B item. A small `sales_offers` table is enough.

### Cursor recommendation

Same as ChatGPT. Opportunity association is via **line items** (Decision 16), not a single `offerId` on the Opportunity.

### Scott decision

- [ ] APPROVE — Sales-owned Offer catalog. Not Core. Not billing/inventory.
- [ ] REJECT — Keep free-text Opportunity name only.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 15 — Offer pricing types

### Repository says

Only one-time `amount_cents`. Prior Decision 17 already requires both one-time and MRR.

### ChatGPT recommendation

Support at minimum: One-time; Monthly recurring. Consider a combined Offer only if it materially simplifies SI’s real selling model. Otherwise allow multiple Offer lines so setup + monthly service can be represented separately. Do not add annual/usage/tiered pricing unless Scott requires it now.

### Cursor assessment

**AGREE.** Combined Offer type would hide two numbers in one row and fight reporting. Multiple lines are the right composition. Annual can wait; if it appears later, store quoted terms and normalize to MRR (Decision 21).

### Cursor recommendation

Same as ChatGPT. Offer.pricingType = `one_time` \| `monthly`. No combined type. No annual/usage/tiered in Slice B.

### Scott decision

- [ ] APPROVE — One-time and monthly Offer types. Compose mixed deals with multiple lines. No annual/usage/tiered.
- [ ] ADD ANNUAL NOW
- [ ] ADD COMBINED OFFER TYPE
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 16 — Multiple Offers per Opportunity

### Repository says

One Opportunity row, one `amount_cents`. No line table. Prior Offer decision said “Opportunity association/selection” but did not forbid multiple.

### ChatGPT recommendation

Yes. Use Opportunity line items rather than a single `offerId`. Each line: Offer reference; description snapshot/override; quantity where meaningful; unit price; pricing type; calculated line value. Supports website setup + monthly hosting/MSP.

### Cursor assessment

**AGREE.** Single `offerId` cannot represent SI mixed deals. Lines also solve `amount_cents` vs MRR dual totals.

### Cursor recommendation

Same as ChatGPT. `sales_opportunity_lines` belong to the Opportunity (working commercial truth). Proposal snapshots are separate (Decision 50).

### Scott decision

- [ ] APPROVE — Multiple Offer lines per Opportunity.
- [ ] REJECT — One Offer per Opportunity.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 17 — Custom pricing

### Repository says

Staff already type `amount_cents` freely. No catalog defaults exist yet.

### ChatGPT recommendation

Yes. The Offer supplies defaults; the Opportunity/proposal line stores the actual quoted commercial terms. Changing the Offer later must not retroactively change existing Opportunity/proposal pricing.

### Cursor assessment

**AGREE.** Copy name, description, pricing type, and default unit price onto the line at add-time. Line is then independent. Same rule for Proposal snapshots.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — Offer defaults; line stores quoted price; Offer edits do not rewrite existing lines.
- [ ] REJECT — Always live-link to current Offer price.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 18 — Discounts

### Repository says

Nothing. Price is whatever staff typed.

### ChatGPT recommendation

Keep v1 simple. Allow staff to override the line price rather than introducing discount rules, coupon systems, or discount approval workflows. If displaying a discount to the customer is important, support a simple optional line-level or proposal-level discount representation, but Cursor should challenge whether it is necessary for this slice.

### Cursor assessment

**AGREE** with override-the-price. **DISAGREE** that a separate discount field is needed for Slice B. A proposal can show the quoted unit price without a struck-through list price. Discount columns become a second truth next to unit price.

### Cursor recommendation

No discount engine and **no discount field** in v1. Staff set the quoted unit price. If SI later needs “list vs quoted” on the PDF, add it in a later slice.

### Scott decision

- [ ] APPROVE CURSOR RECOMMENDATION — Price override only. No discount field/engine.
- [ ] APPROVE CHATGPT OPTIONAL DISCOUNT — Simple optional line- or proposal-level discount display, still no coupons/approvals.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

# D. Opportunity valuation

## Decision 19 — One-time + MRR

### Repository says

`amount_cents` is one-time only, nullable, used in the Opportunity UI. Dashboard does not sum it. Prior Decision 17: **both** one-time and MRR, Sales valuation only, not billing. Slice A kept one-time; MRR waits for Slice B.

### ChatGPT recommendation

Preserve that decision. Opportunity should expose One-time value and MRR.

### Cursor assessment

**AGREE.** Binding prior owner decision. Git does not block it.

### Cursor recommendation

Same as ChatGPT. Store derived Opportunity totals from lines (Decision 20).

### Scott decision

- [ ] CONFIRM — Both one-time value and MRR on the Opportunity.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 20 — Valuation calculation

### Repository says

`amount_cents` is a manually entered integer. Convert does **not** set amount. Existing rows (including Northwind seed $12,000) live only in that column.

### ChatGPT recommendation

Once line items exist, calculate Opportunity one-time value and MRR from active Opportunity commercial lines. Avoid two independent sources of truth. Cursor must determine how to migrate/preserve existing Slice A `amountCents`. A controlled manual override may be useful only if there is a concrete business need.

### Cursor assessment

**AGREE.** Dual entry (header amount vs lines) will drift. No business need for a header override if staff can edit lines.

**Migration:** For each Opportunity with `amount_cents` and no lines, create one `one_time` line (quantity 1, unit price = `amount_cents`, description from Opportunity name, offerId null). Then keep `amount_cents` as a **derived cache** of one-time line totals, plus a new `mrr_cents` cache. After migration, UI edits go through lines.

### Cursor recommendation

Same as ChatGPT. Derive totals from lines. No header override. Migrate existing `amount_cents` into a one-time line as above.

### Scott decision

- [ ] APPROVE — Derive one-time + MRR from lines. Migrate existing `amountCents` into a one-time line. No header override.
- [ ] KEEP HEADER OVERRIDE — Lines plus a manual Opportunity amount override.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 21 — Recurring value means MRR

### Repository says

No recurring field. No ARR.

### ChatGPT recommendation

Standardize on MRR. If future Offers use annual contracts, normalize recurring pipeline to MRR for reporting while preserving actual quoted billing terms separately. Do not build ARR as a separate source of truth; ARR can later be derived as MRR × 12.

### Cursor assessment

**AGREE.** One reporting number. Quantity handling is Decision 49.

### Cursor recommendation

Same as ChatGPT. Slice B Offers are monthly, so quoted terms = MRR with no conversion step yet.

### Scott decision

- [ ] APPROVE — Recurring metric is MRR. No separate ARR source of truth.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

# E. Proposal generation

## Decision 22 — Proposal generation is in Slice B

### Repository says

Prior Decision 18: Scott **overrode** ChatGPT/Cursor and required proposal generation in Slice B. C2B closeout and [[SaaS-Decisions]] repeat that. Git has a Proposal/Quote **stage** only. No proposal table, files, or generator. No technical blocker.

### ChatGPT recommendation

Treat this as binding Slice B scope. Do not silently reduce it back to proposal metadata only.

### Cursor assessment

**AGREE.** Do not reopen whether proposals belong in Slice B. Bound *what* generation means (Decisions 23–31, 50–51). Implementation size may still split B1/B2 (Decision 44) **without** removing proposals from Slice B.

### Cursor recommendation

Same as ChatGPT. Binding product requirement. Split Work Orders if needed; do not drop the requirement.

### Scott decision

- [ ] CONFIRM — Proposal generation remains in Slice B. Do not reduce to metadata-only.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 23 — Proposal relationship

### Repository says

No proposal entity. Opportunity is the primary sales-work record (prior Decision 12).

### ChatGPT recommendation

Proposal belongs to an Opportunity. An Opportunity may have multiple Proposal versions/revisions, but only one should be the current/active proposal at a time.

### Cursor assessment

**AGREE.** Do not hang proposals off Company (a Company may have many Opportunities).

### Cursor recommendation

Same as ChatGPT. `sales_proposals.opportunityId`. One current pointer (or status rule: at most one of draft/issued/accepted that is not superseded).

### Scott decision

- [ ] APPROVE — Proposal belongs to Opportunity. Multiple versions; one current.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 24 — Proposal contents

### Repository says

Core brand comes from `NUXT_PUBLIC_BRAND_NAME` / `BRAND_LOCATION` / `APP_NAME`. Sales has Company, Contact, Opportunity name, one-time amount. No proposal number, expiration, terms, or line snapshots.

### ChatGPT recommendation

Minimally contain: SI identity/branding; customer Company; customer Contact; title; number/reference; created date; expiration/valid-through; scope/summary; Offer/line items; quantities; one-time pricing; recurring pricing/MRR; subtotal/total presentation; terms/notes; acceptance/signature area; status/version. Do not add tax calculation or invoicing.

### Cursor assessment

**AGREE WITH QUALIFICATION.** That content list is the customer-facing artifact, not a template CMS. Use existing Core brand env vars plus a single Sales-owned layout. Signature area is visual (Decision 29). Proposal numbering: Cursor can choose a sequential Sales-owned number (`P-YYYY-NNNN`) unless Scott objects in notes.

### Cursor recommendation

Same content list. One SI-branded template. No tax. No template editor.

### Scott decision

- [ ] APPROVE — Listed contents. No tax/invoicing. One branded template, not a template CMS.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 25 — Proposal line snapshots

### Repository says

Nothing. Opportunity `amount_cents` is live-editable.

### ChatGPT recommendation

No live link. When a Proposal version is generated/finalized, snapshot its customer-facing commercial terms. Future changes to Offers or Opportunity lines must not rewrite an already-issued Proposal.

### Cursor assessment

**AGREE.** Issued PDFs are evidence. Mutating them is a product bug. Drafts may still copy current Opportunity lines until issued.

### Cursor recommendation

Same as ChatGPT. See Decision 50 for table split.

### Scott decision

- [ ] APPROVE — Issued proposal lines are snapshots. Offer/Opportunity edits do not rewrite issued proposals.
- [ ] REJECT — Live-link proposals to current Opportunity lines.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 26 — Drafting and versioning

### Repository says

Nothing.

### ChatGPT recommendation

Support Draft; Issued/Sent; Accepted; Declined; Expired; Superseded. Staff can edit a Draft. Once Issued, material commercial changes create a new version rather than mutating the historical issued proposal. Only one non-superseded current proposal should normally represent the active commercial offer.

### Cursor assessment

**AGREE.** Those states are cheap enums and match SI’s “send a quote, maybe revise, maybe accept.” Do not auto-expire in a worker unless a later WO adds jobs; Expired can be a staff action or a display rule against valid-through date.

### Cursor recommendation

Same as ChatGPT. No background job in Slice B. UI may show “past valid-through” without auto-status unless inexpensive.

### Scott decision

- [ ] APPROVE — Listed proposal states. Issued is immutable; revisions create a new version.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 27 — Proposal output format

### Repository says

`sales-crm` has no PDF library, no Chromium, no document service. Stack is Nuxt 4 + Node 22 + Nitro. Local SQLite under `sales_template/data/`.

### ChatGPT recommendation

Generate a professional **PDF** from CRM data, with a printable/browser-preview if technically convenient. Artifact should be reproducible from the Proposal snapshot. Cursor should recommend the safest approach for this stack. Do not introduce an external paid document-generation dependency without owner approval.

### Cursor assessment

**AGREE.** PDF is the customer-facing file. Paid DocSpring/etc. is out unless Scott approves. Playwright/Puppeteer would add a browser runtime that this local Sales app does not otherwise need.

### Cursor recommendation

1. In-app **printable HTML preview** from the snapshot (staff QA).
2. Server-generated **PDF** with a free Node library (`pdf-lib` or PDFKit — Cursor picks at implementation). No paid API. No Chromium.
3. Store the generated file (Decision 51). Regeneration from snapshot is allowed if the file is missing; issued snapshot data is the source of truth.

### Scott decision

- [ ] APPROVE CURSOR — HTML preview + locally generated PDF. No paid doc API. No Chromium.
- [ ] APPROVE CHATGPT AS WRITTEN — PDF required; Cursor chooses any safe stack approach including Chromium if needed.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 28 — Proposal delivery

### Repository says

No SMTP, mailer, or notification bus in Sales or Core. Activity type `email` is a follow-up task label, not sending mail.

### ChatGPT recommendation

Defer automated email delivery unless current architecture already makes it trivial and safe. Slice B must allow staff to generate/download the proposal and record its status. Direct email can be a later enhancement.

### Cursor assessment

**AGREE.** Email is **not** trivial here. Adding it would pull in credentials, templates, bounce handling, and a hosting assumption Sales does not have.

### Cursor recommendation

Same as ChatGPT. Download + status only. Staff email the PDF themselves.

### Scott decision

- [ ] APPROVE — Generate/download + status. No in-app email send in Slice B.
- [ ] REJECT — Include email delivery now.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 29 — Electronic signature boundary

### Repository says

Won is an explicit staff action confirming a signed agreement/SOW. No e-sign vendor. No public customer portal. Browser e-sign would need public unauthenticated (or tokenized) access, identity, audit, and legal-evidence design that Sales does not have.

### ChatGPT recommendation

Do **not** build a DocuSign/Adobe Sign replacement. Support a proposal acceptance/signature representation sufficient for SI’s workflow only if it can be done safely. Preferred initial boundary: generated proposal contains signature/acceptance fields; signed external copy can be recorded/attached or acceptance can be staff-recorded; Opportunity Won remains an explicit staff assertion. If Scott wants browser-based customer e-signature, treat that as a **separate explicit scope** (identity, audit, legal-evidence, security, public-access).

### Cursor assessment

**AGREE.** Browser e-sign is a different product: public token routes, consent, evidence trail. That is not “proposal generation.” Visual signature block + staff-recorded Accepted + optional uploaded signed PDF matches Slice A’s Won definition.

### Cursor recommendation

Same as ChatGPT. **No browser e-sign in Slice B.** Flag it as separately authorized later if wanted.

### Scott decision

- [ ] APPROVE CURSOR / CHATGPT BOUNDARY — Visual signature block; staff-recorded acceptance; optional uploaded signed copy; Won stays explicit. **No** DocuSign clone. **No** browser customer e-sign in Slice B.
- [ ] INCLUDE BROWSER E-SIGN NOW — Accept the public-access / legal / security scope as part of Slice B.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 30 — Proposal attachments / signed copy

### Repository says

Sales has no assets table and no uploads volume. Martial Arts marketing assets are MA-owned. Core has no generic file service. Local DB path is `sales_template/data/app.sqlite` (gitignored). Control Plane assets volumes are MA fleet, not this app.

### ChatGPT recommendation

Yes, retain a durable reference/artifact for the final accepted agreement if feasible within current storage architecture. Cursor must recommend: generated PDF bytes/file; filesystem/object reference; uploaded signed PDF; immutable rendered data plus generated-on-demand PDF; or a combination. Do not invent production object storage if it is not yet authorized.

### Cursor assessment

**AGREE WITH QUALIFICATION.** Object storage / S3 is not authorized (S7). Storing large blobs in SQLite is a poor fit. Source of truth for *terms* is the snapshot row; the PDF is a rendering.

### Cursor recommendation

Combination: (1) immutable snapshot rows; (2) generated PDF file on local disk under gitignored `sales_template/data/proposals/`; (3) optional uploaded signed PDF in the same folder; (4) DB columns for paths/filenames/content types. No S3. No MA asset import. Regeneration from snapshot is allowed.

### Scott decision

- [ ] APPROVE CURSOR — Snapshot in DB + local `data/proposals/` files for generated and optional signed PDFs. No object storage.
- [ ] GENERATED PDF ONLY — No signed-copy upload in Slice B.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 31 — Proposal acceptance and Won

### Repository says

Won is terminal until Reopen and means signed agreement/SOW. No proposal status exists to auto-trigger it.

### ChatGPT recommendation

No automatic transition in Slice B. Proposal may become Accepted, but **Won remains an explicit staff action**. UI may make Won obvious after acceptance.

### Cursor assessment

**AGREE.** Auto-Won would violate the Slice A owner definition if a proposal is “accepted” informally.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — Accepted proposal does not auto-Won. Won stays an explicit staff action.
- [ ] REJECT — Accepting a proposal marks the Opportunity Won.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

# F. Company lifecycle

## Decision 32 — Company lifecycle states

### Repository says

`sales_accounts.active` boolean only. Prior Decision 19 approved `prospect` \| `customer` \| `inactive`, Won may mark customer, no service-delivery product.

### ChatGPT recommendation

Minimal commercial lifecycle: Prospect; Customer; Former Customer. Do not force Company lifecycle to mirror Opportunity stages. A Company may have multiple Opportunities over time.

### Cursor assessment

**AGREE WITH QUALIFICATION.** This is the same three-state model as the prior worksheet with **Former Customer** replacing **inactive**. Prefer the new nouns; they match SI language better. Map `active=false` seed/data to Former Customer.

### Cursor recommendation

`lifecycle`: `prospect` \| `customer` \| `former_customer`. Drop using `active` as the product concept (keep or derive it from lifecycle ≠ former_customer if needed for queries).

### Scott decision

- [ ] APPROVE — Prospect / Customer / Former Customer (replaces prior “inactive”).
- [ ] KEEP PRIOR NOUNS — Prospect / Customer / Inactive.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 33 — Won Opportunity promotes Company to Customer

### Repository says

Won does not touch Company. Companies can already have many Opportunities (`account_id` on each).

### ChatGPT recommendation

If Company is Prospect, marking an Opportunity Won should promote it to Customer. Do not downgrade Customer merely because a later Opportunity is Lost. Former Customer should be an explicit staff action or future rule, not inferred from a Lost Opportunity.

### Cursor assessment

**AGREE.** Matches prior Decision 19 and keeps lifecycle from oscillating.

### Cursor recommendation

Same as ChatGPT. Staff may still set Former Customer manually.

### Scott decision

- [ ] APPROVE — Won promotes Prospect → Customer. Lost does not downgrade. Former Customer is explicit.
- [ ] REJECT — Staff set Company lifecycle only; Won does not change it.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 34 — Multiple Opportunities per Company

### Repository says

Already true. `sales_opportunities.account_id` is required; there is no uniqueness. Convert always creates a new Opportunity. Staff can create more.

### ChatGPT recommendation

Yes. Company is the durable commercial relationship; Opportunity is an individual sales pursuit. Existing Customer → new Opportunity must be normal.

### Cursor assessment

**AGREE.** Already implemented. Slice B must not introduce a “one open Opportunity per Company” rule.

### Cursor recommendation

Same as ChatGPT. Confirm as product law so reporting does not assume one deal per Company.

### Scott decision

- [ ] APPROVE — Multiple Opportunities per Company over time, including after Customer.
- [ ] REJECT — Limit to one open Opportunity.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

# G. Dashboard and reporting

## Decision 35 — Dashboard purpose

### Repository says

Dashboard copy is “Open work in the Sales pipeline” and shows six counts. Prior Decision 20 approved an operational dashboard (open opps, pipeline value, overdue/upcoming/due-today, Won/Lost count+value, source summary, conversion count) for Slice B, not a BI project.

### ChatGPT recommendation

Two jobs: (1) **Operational** — what requires attention now? (2) **Commercial** — is the sales/acquisition engine producing results? Avoid a decorative dashboard.

### Cursor assessment

**AGREE.** Expands prior Decision 20 without becoming Metabase. Attribution/Campaign reporting is the new commercial job.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — Operational + commercial dashboard. Not a BI project.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 36 — Operational dashboard metrics

### Repository says

Counts only. Activity queue pages exist (`dueAt`, status) but the dashboard does not use them. Pipeline cents are not summed.

### ChatGPT recommendation

Include: Leads by stage; overdue Activities; due today; upcoming Activities; open Opportunities by stage; one-time pipeline; MRR pipeline. Allow useful drill-through where practical.

### Cursor assessment

**AGREE.** These are queries over existing Activity/Lead/Opportunity tables plus new derived totals. Drill-through = existing list pages with query params, not a new analytics UI.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — Listed operational metrics + drill-through to existing lists.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 37 — Outcome metrics

### Repository says

Won/Lost **counts** are lifetime totals. No period filter. No win rate. No Lead→Opportunity conversion rate. No Won value sum. No `won_at`.

### ChatGPT recommendation

Include: Won count; Lost count; Won one-time value; Won MRR; win rate; Lead → Opportunity conversion rate. Use a clear reporting period rather than misleading lifetime totals where possible.

### Cursor assessment

**AGREE WITH QUALIFICATION.** Lifetime Won on the current dashboard is already easy to misread. Period metrics need closed timestamps (Decision 47) and explicit anchors (Decision 48). Do not show a win rate until the denominator is defined.

### Cursor recommendation

Same metrics, **period-bounded**, after Decisions 47–48. Do not present unlabeled lifetime totals as “this month.”

### Scott decision

- [ ] APPROVE — Listed outcome metrics with an explicit reporting period.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 38 — Attribution reporting

### Repository says

Impossible today.

### ChatGPT recommendation

Breakdowns by Source and Campaign: Leads; Opportunities; Won; Lost; conversion rates; one-time pipeline/value; MRR pipeline/value. Do not implement statistical/multi-touch modeling.

### Cursor assessment

**AGREE.** This is the reason to reopen Campaigns. Use Opportunity snapshots for commercial numbers (Decision 10) and Lead rows for Lead counts.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — Source and Campaign breakdowns as listed. No multi-touch modeling.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 39 — Reporting time ranges

### Repository says

No date filters on `/api/dashboard`. Records have `createdAt` / `updatedAt` only.

### ChatGPT recommendation

Support practical predefined ranges: This month; Last month; Last 30 days; This quarter; This year; Custom range if inexpensive. Cursor should determine which record date anchors are appropriate and flag ambiguous definitions.

### Cursor assessment

**AGREE WITH QUALIFICATION.** The range list is cheap. **Ambiguous without Decisions 47–48.** Custom range is inexpensive (two date inputs). Timezone: use the app’s existing local-time helpers (Sales already has `shared/utils/time.ts`); do not invent a new timezone product.

### Cursor recommendation

Ship the listed presets + custom range. Metric anchors are Decision 48. Closed timestamps are Decision 47.

### Scott decision

- [ ] APPROVE — Presets listed + custom range. Anchors decided in 47–48.
- [ ] PRESETS ONLY — No custom range in Slice B.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

# H. Architecture and boundaries

## Decision 40 — Keep Slice B capabilities Sales-owned

### Repository says

ADR + D2–D4: vertical-owned domain until two real implementations exist. Architecture tests forbid MA nouns in Sales and Core importing verticals.

### ChatGPT recommendation

Keep Sales-owned in Slice B: Sources; Campaigns; attribution; Offers; Opportunity commercial lines; MRR valuation; Proposals; Company lifecycle; Sales reporting. Do not promote these to Core merely because another vertical has analogous concepts. Comparison evidence may be documented for later ADR/Work Order decisions.

### Cursor assessment

**AGREE.** One Sales implementation is not two. Campaign similarity to MA is **not** a promotion license.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — All listed capabilities stay Sales-owned. No Core promotion in Slice B.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 41 — Martial Arts is comparison evidence, not an implementation dependency

### Repository says

Mechanical rule: Vertical A ↛ Vertical B. MA Campaigns include public tracking links and gym capture. Sales pages already wrap Core workspace chrome; they do not import MA components.

### ChatGPT recommendation

Cursor may inspect Martial Arts Campaigns, Tracking Links, attribution, workspaces, reporting, or other relevant behavior. Sales must not import Martial Arts domain/application components. If common behavior is now demonstrated twice, document Core-promotion evidence rather than performing promotion in Slice B.

### Cursor assessment

**AGREE.** Inspection for this worksheet already used MA as evidence (bounded Campaign vs MA’s larger model; defer tracking links because MA’s links exist to serve public capture).

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — Inspect MA as evidence only. No MA imports. No promotion in Slice B.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 42 — Public lead capture remains deferred

### Repository says

Sales has no public layout or public Lead API. Prior Decision 15 deferred public capture until the internal workflow existed. That internal workflow now exists (Slice A Successful). Public capture is still a new surface (spam, layout, stable API) and is listed as not implemented in [[Current-State]].

### ChatGPT recommendation

No. Build the internal data model and manual attribution workflow so future tracking links/forms can populate it. Do not expand Slice B into public lead capture unless a specific dependency makes that unavoidable and Scott approves.

### Cursor assessment

**AGREE.** Campaign attribution does **not** require public forms. Decision 13’s tracking links would be the only pressure to add public routes; Cursor recommends deferring those too.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — Public lead capture stays deferred. Internal attribution model only.
- [ ] REJECT — Include a thin public form in Slice B.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

## Decision 43 — No production deployment/migration in Slice B

### Repository says

Slice A/B are local `sales_template` on :5040. C2, SI migration, S7, DNS/TLS, billing are not started and not authorized.

### ChatGPT recommendation

Slice B is local product refinement. Do not authorize SI migration/cutover; C2/CP provisioning; production VPS; DNS/TLS; billing integration; public self-service.

### Cursor assessment

**AGREE.**

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [ ] APPROVE — Local Sales refinement only. Listed production/migration items stay out.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

>

---

# I. Development slicing

## Decision 44 — Can Slice B be one implementation Work Order?

### Repository says

Slice A was already a large WO (Lead + convert + stages + workspaces + activities + notes + owners + Won/Lost). Slice B as drafted adds: Source catalog, Campaigns, attribution copy/correct/report, Offers, line items, amountCents migration, MRR, Company lifecycle, wonAt/lostAt, dashboard rewrite, **and** a proposal versioning/PDF/file product. `sales-crm` has none of the proposal/PDF/file stack today. Prior Decision 26 split A then B because one WO for everything was too large. ChatGPT now asks whether B itself must split.

### ChatGPT recommendation

Avoid one giant opaque implementation if proposal generation plus Campaigns plus Offers/reporting produces too much surface area.

Likely split:

**B1 — Commercial model + attribution:** Sources; Campaigns; Lead/Opportunity attribution; Offers; Opportunity commercial lines; one-time + MRR calculation; Company lifecycle; baseline attribution/commercial reporting.

**B2 — Proposals + reporting completion:** Proposal model; revisions/snapshots; generated PDF; signed/final artifact handling; proposal workflow; dashboard/reporting completion.

This is for Cursor evaluation, not a pre-authorized split.

### Cursor assessment

**DISAGREE** that one implementation Work Order is safe. **AGREE** with a B1/B2 split, with a tighter reporting boundary than the draft.

Proposal generation is a second product surface (new tables, file I/O, PDF dependency, versioning rules, Won interaction). Combining it with Campaigns + Offers + line migration + dashboard in one session repeats the risk Decision 26 avoided. Campaigns without baseline reporting would also be an incomplete B1.

### Cursor recommendation

**Two implementation Work Orders after this worksheet** (still not authorized by checking boxes):

**B1 — Commercial model + attribution (must be usable without proposals)**

- Controlled Sources
- Bounded Campaigns (no tracking links)
- Lead + Opportunity attribution (IDs + snapshots; no-Lead Opportunities)
- Attribution correction via history notes
- Offers
- Opportunity commercial lines
- Derive one-time + MRR; migrate `amount_cents`
- Company lifecycle + Won promotion
- `won_at` / `lost_at`
- Baseline dashboard: operational metrics + current pipeline one-time/MRR + period Won/Lost + Source/Campaign baseline performance

**B2 — Proposals + reporting completion**

- Proposal model, versions, snapshots
- HTML preview + PDF generate/download
- Local generated + optional signed artifacts
- Proposal workflow (draft/issued/accepted/declined/expired/superseded)
- Won remains explicit
- Dashboard/reporting completion: date-range polish if any leftover, proposal issued/accepted metrics, Campaign performance rates not finished in B1

Public capture, tracking links, C2, SI migration, email send, browser e-sign stay out of both.

### Scott decision

- [ ] APPROVE CURSOR RECOMMENDATION — B1 then B2 with the boundaries above. Only B1 is the next implementation WO after reconciliation.
- [ ] APPROVE CHATGPT INITIAL SPLIT — Same B1/B2 idea; put all reporting completion in B2 (baseline reporting waits).
- [ ] ONE WORK ORDER — Entire approved Slice B in a single later WO (except deferred table).
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

# Additional Decisions Cursor Believes Are Required Before Development

These are not in ChatGPT’s original 44. They block schema, reporting meaning, or B1/B2 boundaries.

## Decision 45 — Campaign → Source cardinality

### Repository says

No Sales Campaign. ChatGPT’s Campaign model includes a **primary** Source. MA uses a free-text `channel` plus per-link UTM, which is a different shape.

### ChatGPT recommendation

(Implied in Decision 5/7: a Campaign has a Source/channel association; not explicit whether one or many.)

### Cursor assessment

**OWNER BUSINESS DECISION REQUIRED**, with a strong technical default. Many-to-many Campaign↔Source makes performance reporting ambiguous (“did this Facebook Lead count for the September campaign’s Google row?”).

### Cursor recommendation

**One primary Source per Campaign** (`campaigns.primarySourceId`, nullable only for Draft). A Lead’s Source should normally match the Campaign’s primary Source when a Campaign is set; staff may override with a history note if needed. If SI truly runs one effort across Facebook and Instagram, create two Campaigns or pick the dominant Source.

### Scott decision

- [ ] APPROVE CURSOR — One primary Source per Campaign.
- [ ] ALLOW MULTIPLE SOURCES PER CAMPAIGN
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 46 — Attribution on Opportunities with no Lead

### Repository says

`createOpportunity` does not require `sourceLeadId`. Staff can open `/opportunities` and create a deal. Convert is not the only path.

### ChatGPT recommendation

(Not explicit. Decision 9 says Lead is the normal origin.)

### Cursor assessment

**AGREE** that Lead is normal, but **blocking** if we omit Opportunity-level assignment. Otherwise direct deals are invisible in Source/Campaign reports.

### Cursor recommendation

Opportunities always have their own Source/Campaign fields (nullable Source only if Scott allows unknown origin). Convert copies Lead → Opportunity. Direct create/edit uses the same fields. Do not require a fake Lead.

### Scott decision

- [ ] APPROVE — Direct Opportunities get the same Source/Campaign fields. Convert copies from Lead.
- [ ] REQUIRE A LEAD — Every Opportunity must come from a converted Lead.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 47 — Closed timestamps for Won / Lost

### Repository says

`markOpportunityWon` / `Lost` set `stage` and `updatedAt` only. Reopen also stamps `updatedAt`. “Won this month” cannot be distinguished from “edited this month.”

### ChatGPT recommendation

(Decision 37/39 asked Cursor to flag ambiguous date anchors.)

### Cursor assessment

**AGREE** this must be decided before dashboard work. Using `updatedAt` is wrong. Using `createdAt` is wrong for Won.

### Cursor recommendation

Add `won_at` and `lost_at` (nullable). Set on Won/Lost. Clear both on Reopen. Period Won/Lost metrics use these timestamps. Do not use `updatedAt`.

### Scott decision

- [ ] APPROVE — `won_at` / `lost_at`. Reopen clears them. Period outcome metrics use these dates.
- [ ] USE UPDATED AT — No new columns.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 48 — Pipeline vs period metric anchors

### Repository says

Current dashboard treats Won as a lifetime count. Mixing “open pipeline” (point-in-time) with “Won this month” (period) is the usual CRM shape, but it must be labeled.

### ChatGPT recommendation

(Decision 39: Cursor should flag ambiguous definitions.)

### Cursor assessment

**OWNER BUSINESS DECISION REQUIRED** for meaning, not for schema. Wrong defaults produce decorative totals.

### Cursor recommendation

| Metric | Anchor |
|---|---|
| Open pipeline one-time / MRR | **Point-in-time**: currently open Opportunities, regardless of created date |
| Leads by stage | Point-in-time current stage counts |
| Overdue / due today / upcoming Activities | Point-in-time vs `dueAt` |
| New Leads in range | `leads.created_at` in range |
| New Opportunities in range | `opportunities.created_at` in range |
| Won count/value/MRR in range | `won_at` in range |
| Lost count in range | `lost_at` in range |
| Conversion rate in range | Opportunities created in range that have a source Lead ÷ Leads created in range *(simple; not a cohort funnel)* |
| Win rate in range | Won in range ÷ (Won + Lost) in range |

Do not present conversion/win rates as scientific funnels.

### Scott decision

- [ ] APPROVE CURSOR TABLE — Pipeline is current-state; outcomes use closed/created dates as above.
- [ ] ALL METRICS USE CREATED DATE
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 49 — How MRR treats quantity

### Repository says

No quantity field. ChatGPT lines include “quantity where meaningful.”

### ChatGPT recommendation

(Line has quantity and calculated line value; MRR definition not explicit at quantity.)

### Cursor assessment

**OWNER BUSINESS DECISION REQUIRED** if SI sells seats/licenses. Default is simple multiplication.

### Cursor recommendation

Monthly line MRR = `unit_price_cents × quantity`. One-time line value = `unit_price_cents × quantity`. Quantity defaults to 1. No proration.

### Scott decision

- [ ] APPROVE — MRR and one-time line value = unit price × quantity. Default quantity 1. No proration.
- [ ] IGNORE QUANTITY FOR MRR — Quantity applies only to one-time lines.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 50 — Opportunity lines vs Proposal lines

### Repository says

Neither table exists. If B1 ships lines and B2 ships proposals, B1 must not paint Opportunity lines as the issued quote.

### ChatGPT recommendation

(Decisions 16 + 25: Opportunity has working lines; issued proposals snapshot terms.)

### Cursor assessment

**AGREE** this needs an explicit owner checkbox so B1/B2 do not fight.

### Cursor recommendation

Two tables. `sales_opportunity_lines` = working commercial truth (B1; drives pipeline/MRR). `sales_proposal_lines` = per-version snapshot (B2). Issuing a proposal copies current Opportunity lines into that version’s snapshot. Later Opportunity line edits do not change issued snapshots. Draft proposals may refresh from Opportunity lines until issued.

### Scott decision

- [ ] APPROVE — Separate Opportunity lines and Proposal snapshot lines, copied at issue.
- [ ] ONE LINE TABLE — Proposals point at live Opportunity lines (conflicts with Decision 25).
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 51 — Generated proposal file storage

### Repository says

Covered technically in Decision 30. Repeated here as a blocking storage choice if Scott approved generation but left storage implicit.

### ChatGPT recommendation

(Decision 30 options.)

### Cursor assessment

**AGREE** with Decision 30 Cursor path. Restated so it cannot be missed before B2.

### Cursor recommendation

Gitignored local directory `sales_template/data/proposals/` + DB metadata. Snapshot rows remain authoritative. No production object storage.

### Scott decision

- [ ] APPROVE — Same as Decision 30 Cursor recommendation.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Deferred — Not authorized by this worksheet

None of the following is pulled into Slice B unless Scott explicitly promotes it in notes above.

| Item | Notes |
|---|---|
| C2 / Control Plane Sales provisioning | C2 unchanged; not started |
| D1 Product Instance schema | Accepted; not shipped |
| SI migration / cutover | Local Sales only |
| Public lead capture | Decision 42 |
| Campaign tracking links / public tokens | Decision 13 Cursor deferral |
| Customer self-service / public customer portal | Would be required for browser e-sign |
| Billing / Stripe | DEF-03 |
| Invoicing / AR | Pre-sale boundary |
| QuickBooks / accounting | Out |
| Service delivery / project management / ticketing / CS expansion | Decision 2 |
| Beauty | C3 |
| S7 / VPS | Official S-track |
| DNS / TLS / production deployment | S8 / later |
| Universal CRM abstraction / generic Lead in Core | D2 wait |
| Speculative Core promotion | Decision 40–41 observe-only |
| MA → `apps/` move | Not C-track Slice B |
| Multi-touch attribution | Decision 8 |
| Ad-platform synchronization / marketing automation | Decision 7 |
| Full contract lifecycle management | Decision 2 / 29 |
| External e-signature integration | Decision 29 unless Scott checks browser e-sign |
| In-app proposal email delivery | Decision 28 |
| Paid document-generation SaaS | Decision 27 |

NEAR-04–10 remain open in [[SaaS-Open-Questions]] and **do not** block local Sales Slice B.

If Scott believes one deferred item **must** be decided now:

- [ ] None — leave the table deferred
- [ ] Promote one item into a new decision — name it in notes

**Scott notes:**

>

---

## Scott approval summary

- [ ] Decision 1 complete — Slice B objective
- [ ] Decision 2 complete — pre-sale boundary
- [ ] Decision 3 complete — attribution first-class
- [ ] Decision 4 complete — reopen Campaign deferral
- [ ] Decision 5 complete — Source vs Campaign
- [ ] Decision 6 complete — controlled Sources (+ list)
- [ ] Decision 7 complete — Campaign minimum model
- [ ] Decision 8 complete — primary attribution
- [ ] Decision 9 complete — attribution on Lead
- [ ] Decision 10 complete — snapshot onto Opportunity
- [ ] Decision 11 complete — attribution correction
- [ ] Decision 12 complete — Campaign performance metrics
- [ ] Decision 13 complete — tracking links (ChatGPT vs Cursor)
- [ ] Decision 14 complete — Offer catalog
- [ ] Decision 15 complete — pricing types
- [ ] Decision 16 complete — multiple lines
- [ ] Decision 17 complete — custom pricing
- [ ] Decision 18 complete — discounts
- [ ] Decision 19 complete — one-time + MRR
- [ ] Decision 20 complete — derive from lines / migrate amountCents
- [ ] Decision 21 complete — MRR standard
- [ ] Decision 22 complete — proposal generation in Slice B
- [ ] Decision 23 complete — Proposal belongs to Opportunity
- [ ] Decision 24 complete — proposal contents
- [ ] Decision 25 complete — proposal snapshots
- [ ] Decision 26 complete — proposal states/versions
- [ ] Decision 27 complete — PDF output
- [ ] Decision 28 complete — no email send
- [ ] Decision 29 complete — e-sign boundary
- [ ] Decision 30 complete — signed/generated artifacts
- [ ] Decision 31 complete — Accepted ≠ Won
- [ ] Decision 32 complete — Company lifecycle nouns
- [ ] Decision 33 complete — Won promotes Customer
- [ ] Decision 34 complete — multiple Opportunities
- [ ] Decision 35 complete — dashboard purpose
- [ ] Decision 36 complete — operational metrics
- [ ] Decision 37 complete — outcome metrics
- [ ] Decision 38 complete — attribution reporting
- [ ] Decision 39 complete — time ranges
- [ ] Decision 40 complete — Sales-owned
- [ ] Decision 41 complete — MA evidence only
- [ ] Decision 42 complete — public capture deferred
- [ ] Decision 43 complete — no production/migration
- [ ] Decision 44 complete — B1/B2 slicing
- [ ] Decision 45 complete — Campaign → Source cardinality
- [ ] Decision 46 complete — no-Lead Opportunity attribution
- [ ] Decision 47 complete — won_at / lost_at
- [ ] Decision 48 complete — metric date anchors
- [ ] Decision 49 complete — MRR × quantity
- [ ] Decision 50 complete — Opportunity vs Proposal lines
- [ ] Decision 51 complete — file storage
- [ ] Deferred table reviewed

### Planning readiness

- [ ] DECISIONS COMPLETE — Ready for ChatGPT/Cursor pre-development reconciliation.
- [ ] NOT READY — Additional owner discussion required.

**Decision completion does not authorize implementation.**

A separate [[Work-Order-Protocol]] work order is required before Slice B (or B1/B2) code may change. Checking boxes here does not start Campaigns, Offers, attribution fields, MRR, proposals, PDF generation, dashboard work, Company lifecycle, public capture, C2, or SI migration.
