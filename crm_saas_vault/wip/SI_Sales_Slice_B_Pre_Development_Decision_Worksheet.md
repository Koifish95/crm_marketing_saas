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
| HEAD SHA at this owner-review write | `f46cb32` (`f46cb32816ce5289a58624a486faed75840b62fa`) |
| Prior worksheet write | `aff6e84` (C2B Successful closeout) |
| Lockfile `head_at_write` | `1ac18e4` in [[project-state.yaml]] — Slice A implementation SHA |
| S-track | S0–S6 **Successful**. S7–S11 **not started** |
| C-track | C1 **code-shipped**. C2A **Successful**. C2B **Successful**. C2 / C3 **not started**. D1–D4 **accepted**; D1 schema **not shipped** |
| C2B status | **Successful** (2026-09-12). Evidence: [[history/C2B_closeout]] |
| Implementation authorization | **None.** `authorization.active_work_order: null`. Slice B / B1 / B2 are **not authorized** |
| Purpose | Settle SI Sales Slice B product/architecture decisions before any implementation Work Order |
| This document | **Decision / discovery only** |
| Owner-review state | First owner-review pass recorded 2026-09-12. **Not** DECISIONS COMPLETE. Public acquisition decisions 52+ require Scott’s review. |

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
- No Offer table. No commercial line items. No Source/Campaign tables. No tracking links. No proposal entity, files, or generator. No email delivery. No public capture. No PDF library. Sales does not call `registerPublicPaths`; only `/` and `/login` are public via Core defaults. Authenticated pages use `middleware: auth`.
- `markOpportunityWon` sets `stage='won'` and `updatedAt`. There is **no** `won_at` / `lost_at`.
- Opportunities can be created directly, not only by Lead conversion.
- Demo seed remains Northwind Advisors, not Strategic Insights data.

### What Slice B is intended to add

Unshipped Slice B work already named in [[Current-State]] and the C2B closeout: Offers, MRR, attribution UI, dashboard expansion, Company lifecycle, **proposal generation**.

This worksheet also **reopens Campaigns** because Scott now requires campaign-level attribution and performance, not only a free-text campaign note.

**Owner-review 2026-09-12 further changed acquisition scope:** Decision 13 now **requires Campaign tracking links**, and Decision 42 now **requires public Sales lead intake in B1**. Intended path:

```text
Campaign + Source → Tracking Link → Public Intake Form → Lead → Conversion → Opportunity → Won/Lost
```

Martial Arts / Renzo-derived public `/t/[slug]` → `/trial` is **behavioral evidence only**. Sales must not import MA domain components. Public-intake Decisions 52+ below bound the Sales adaptation. They are **not** yet owner-approved.

### What architecture already constrains

- Sales-owned CRM entities. Do not promote Lead/Campaign/public capture/Offers/Proposals into Core. D2–D4. ADR: diverge first; abstract after two real implementations.
- Martial Arts Campaigns are a mature **gym acquisition** product (slug, kind, collaborators, tracking links, UTM, public `/trial` / `/t/[slug]`). Sales must not import that domain.
- C2 = Sales vertical **plus** Control Plane product catalog. C2B success does **not** authorize C2.
- Proposal generation is already an **approved Slice B product requirement** (prior worksheet Decisions 18 and 26). Do not reopen whether it belongs in Slice B unless Git creates a genuine blocker. It does not.

### What is explicitly deferred unless this worksheet promotes it

C2, D1 schema, SI migration, billing/Stripe/invoicing/QuickBooks, service delivery, Beauty, S7/VPS, DNS/TLS, Core promotion, MA → `apps/` move. **Public Sales intake and Campaign tracking links are no longer deferred** (Decisions 13 and 42, owner-review 2026-09-12). See the deferred table at the end.

### Old decision being reopened

Prior worksheet **Decision 14 — Campaigns** was owner-approved as:

> Do not implement Sales Campaign management in this refinement phase. Capture attribution/source first.

That deferral was correct for Slice A. It is **no longer automatically binding** for Slice B. Scott has supplied new owner requirements: which source a Lead came from, which campaign it came from, and downstream Opportunity/Won performance by source/campaign.

This worksheet **intentionally reconsiders** that Campaign deferral. It does not pretend the old decision never existed. Completing this worksheet still does **not** rewrite [[SaaS-Decisions]] until a later promotion step.

Prior Decision 13 (source attribution as Sales-owned fields, including a campaign **note** rather than a Campaign entity) is likewise being expanded if Campaigns are approved here.

---

# Decisions

Recommended / default choices are listed first so Scott can approve by checking one box.

Owner-review 2026-09-12 recorded Scott’s explicit answers for Decisions **6, 7, 13, 18, 29, 32, 39, 42, 44, 45, 47, 48, 49**. Aligned ChatGPT/Cursor recommendations with no remaining owner choice were auto-approved. **Decisions 52+ (public acquisition boundary) are new and still require Scott.**

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

- [x] APPROVE — Slice B = pre-sale commercial engine (offers, value, attribution/campaigns, proposals, reporting, Company lifecycle). Not delivery/billing/C2.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice.

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

- [x] APPROVE — Stop at commercial close + Company customer transition. Listed items stay out.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — First-class primary attribution and reporting. Not a note-only field.
- [ ] REJECT — Keep Slice A (no attribution UI).
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Reopen Decision 14. Include a bounded Sales-owned Campaign in Slice B for attribution/reporting.
- [ ] REJECT — Keep the old deferral. Source + free-text campaign note only.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Distinct Source vs Campaign. Source without Campaign is allowed.
- [ ] REJECT — Single combined origin field.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Controlled Sources table + Other requires detail. No free-text Source.
- [ ] REJECT — Free-text Source is enough.
- [ ] MODIFY — See Scott notes.

**Initial source list:**

- [x] Referral
- [x] Website / Organic
- [x] Facebook
- [x] Instagram
- [x] Google
- [x] Email
- [x] Cold Outreach
- [x] Networking / Event
- [x] Existing Customer
- [x] Partner
- [x] Other (requires detail)
- [ ] Add/remove — See Scott notes.

**Scott notes:**

> APPROVED 2026-09-12. Sales-owned controlled Sources table, not free text. Seed the listed set. `Other` requires source detail. Users with Sales-management rights (`MANAGE_SALES`) may add/deactivate Sources later. Do not build a large source-administration subsystem.

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

Sales-owned `sales_campaigns`: name, description, status (`draft` \| `active` \| `completed` \| `archived`), optional startsAt/endsAt, optional budgetCents, timestamps. No slug, no collaborators.

**Owner-review reconciliation (Decision 45):** Do **not** keep `primarySourceId` on Campaign. A Campaign may span multiple Sources. Source is recorded on the Lead (and on each Tracking Link). Campaign-level Primary Source has no remaining useful semantics and would contradict Decision 45.

### Scott decision

- [x] APPROVE CURSOR — Bounded Campaign fields as above. Optional budget. No MA clone.
- [ ] APPROVE CHATGPT LIST AS WRITTEN — Include active/inactive *and* lifecycle if both are listed.
- [ ] OMIT BUDGET FROM V1
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVED 2026-09-12 — Cursor version, reconciled with Decision 45. Campaign fields: Name; Description/objective; Status; Start date; End date; optional budget; created/updated timestamps. Lifecycle Draft / Active / Completed / Archived. Do **not** add a redundant active/inactive boolean. Do **not** store a Campaign-level Primary Source. Multi-source association happens via tracking links and Lead attribution (Decisions 13, 45, 53).

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

- [x] APPROVE — Primary Source + optional Campaign + optional detail. No multi-touch.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Lead holds primary attribution for converted deals. Public capture still deferred.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12 for “Lead is the normal attribution origin.” The original “public capture still deferred” clause on this checkbox is **superseded by Decision 42** (public Sales intake now required in B1). Lead remains the origin record that public intake will create.

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

- [x] APPROVE — Carry IDs **and** name snapshots onto Opportunity at convert. Keep source Lead link.
- [ ] IDs ONLY — Join live Source/Campaign rows; accept rename/archive effects.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Staff may correct attribution; write a history note; no version table.
- [ ] FREEZE AFTER WON — Corrections allowed only before Won.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Listed Campaign/Source metrics. No accounting-grade ROI.
- [ ] REJECT — Counts only (Leads / Opportunities / Won).
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] CHOOSE DIFFERENT DIRECTION — See Scott notes.
- [ ] APPROVE CURSOR RECOMMENDATION — No tracking-link table in Slice B. Manual attribution now.
- [ ] APPROVE CHATGPT RECOMMENDATION — Create a lightweight tracking-link data model now, without public forms.

**Scott notes:**

> MODIFIED BY OWNER 2026-09-12. Campaign tracking links **are required** as part of the intended acquisition workflow. They are not deferred merely because public intake did not previously exist.

> Intended real-world path: Marketing outreach/post/ad → clickable tracking link → public intake → Sales Lead. Distribution examples: Instagram, Facebook, Meta ads, other social posts, other outreach/marketing surfaces where a URL can be provided.

> The tracking mechanism must preserve Campaign and Source/channel so reporting can connect acquisition activity to Leads, Opportunities, Won/Lost, one-time value, and MRR. A tracking link may encode a specific Campaign + Source combination (Decision 45).

> Study standalone `renzo_crm` / Martial Arts `/t/[slug]` → public intake as **behavioral evidence only**. Do not import Martial Arts domain components into Sales, do not assume gym intake fields fit SI, do not clone blindly, and do not promote MA code into Core without separate authorization. Adapt the acquisition pattern to the generic/SI Sales domain. Exact public boundary: Decisions 52+.

**Owner-review Cursor update:** Original Cursor recommendation to defer tracking links is **withdrawn given Decision 42**. Tracking links without public intake were dead schema; with public intake in B1 they are the attribution mechanism. New model: Decision 53.

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

- [x] APPROVE — Sales-owned Offer catalog. Not Core. Not billing/inventory.
- [ ] REJECT — Keep free-text Opportunity name only.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — One-time and monthly Offer types. Compose mixed deals with multiple lines. No annual/usage/tiered.
- [ ] ADD ANNUAL NOW
- [ ] ADD COMBINED OFFER TYPE
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Multiple Offer lines per Opportunity.
- [ ] REJECT — One Offer per Opportunity.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Offer defaults; line stores quoted price; Offer edits do not rewrite existing lines.
- [ ] REJECT — Always live-link to current Offer price.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE CURSOR RECOMMENDATION — Price override only. No discount field/engine.
- [ ] APPROVE CHATGPT OPTIONAL DISCOUNT — Simple optional line- or proposal-level discount display, still no coupons/approvals.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVED 2026-09-12 — Cursor recommendation. Quoted price overrides only. Offer supplies the default; Opportunity commercial line stores the actual quoted price. No discount engine/field in B1. No coupons, discount rules, or discount approval workflows unless separately authorized later.

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

- [x] CONFIRM — Both one-time value and MRR on the Opportunity.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Derive one-time + MRR from lines. Migrate existing `amountCents` into a one-time line. No header override.
- [ ] KEEP HEADER OVERRIDE — Lines plus a manual Opportunity amount override.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Recurring metric is MRR. No separate ARR source of truth.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] CONFIRM — Proposal generation remains in Slice B. Do not reduce to metadata-only.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Proposal belongs to Opportunity. Multiple versions; one current.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Listed contents. No tax/invoicing. One branded template, not a template CMS.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Issued proposal lines are snapshots. Offer/Opportunity edits do not rewrite issued proposals.
- [ ] REJECT — Live-link proposals to current Opportunity lines.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Listed proposal states. Issued is immutable; revisions create a new version.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE CURSOR — HTML preview + locally generated PDF. No paid doc API. No Chromium.
- [ ] APPROVE CHATGPT AS WRITTEN — PDF required; Cursor chooses any safe stack approach including Chromium if needed.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Generate/download + status. No in-app email send in Slice B.
- [ ] REJECT — Include email delivery now.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE CURSOR / CHATGPT BOUNDARY — Visual signature block; staff-recorded acceptance; optional uploaded signed copy; Won stays explicit. **No** DocuSign clone. **No** browser customer e-sign in Slice B.
- [ ] INCLUDE BROWSER E-SIGN NOW — Accept the public-access / legal / security scope as part of Slice B.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVED 2026-09-12 — shared ChatGPT/Cursor recommendation. Slice B may support a customer-facing signature area, staff-recorded proposal acceptance, optional uploaded signed proposal/agreement artifact, and explicit staff-controlled Opportunity Won. Do **not** implement browser customer e-signature, a DocuSign/Adobe Sign clone, a public signing portal, or a legal-evidence/audit signature system in Slice B.

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

- [x] APPROVE CURSOR — Snapshot in DB + local `data/proposals/` files for generated and optional signed PDFs. No object storage.
- [ ] GENERATED PDF ONLY — No signed-copy upload in Slice B.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Accepted proposal does not auto-Won. Won stays an explicit staff action.
- [ ] REJECT — Accepting a proposal marks the Opportunity Won.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Prospect / Customer / Former Customer (replaces prior “inactive”).
- [ ] KEEP PRIOR NOUNS — Prospect / Customer / Inactive.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVED 2026-09-12 — Cursor terminology. Use Prospect / Customer / Former Customer. Prefer this business lifecycle over Inactive. Reconcile/migrate existing `active` semantics during the eventual authorized implementation.

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

- [x] APPROVE — Won promotes Prospect → Customer. Lost does not downgrade. Former Customer is explicit.
- [ ] REJECT — Staff set Company lifecycle only; Won does not change it.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Multiple Opportunities per Company over time, including after Customer.
- [ ] REJECT — Limit to one open Opportunity.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Operational + commercial dashboard. Not a BI project.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Listed operational metrics + drill-through to existing lists.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Listed outcome metrics with an explicit reporting period.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Source and Campaign breakdowns as listed. No multi-touch modeling.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Presets listed + custom range. Anchors decided in 47–48.
- [ ] PRESETS ONLY — No custom range in Slice B.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVED 2026-09-12 — Cursor-qualified version. Support practical presets plus custom date range. Use metric-specific date semantics (Decisions 47 and 48) rather than one generic record date for every metric.

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

- [x] APPROVE — All listed capabilities stay Sales-owned. No Core promotion in Slice B.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Inspect MA as evidence only. No MA imports. No promotion in Slice B.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

---

## Decision 42 — Public lead capture (prior deferral overridden)

### Repository says

Sales has no public layout or public Lead API. Prior Decision 15 deferred public capture until the internal workflow existed. That internal workflow now exists (Slice A Successful). Public capture is still a new surface (spam, layout, stable API) and is listed as not implemented in [[Current-State]].

### ChatGPT recommendation

No. Build the internal data model and manual attribution workflow so future tracking links/forms can populate it. Do not expand Slice B into public lead capture unless a specific dependency makes that unavoidable and Scott approves.

### Cursor assessment

**AGREE.** Campaign attribution does **not** require public forms. Decision 13’s tracking links would be the only pressure to add public routes; Cursor recommends deferring those too.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [x] MODIFY — See Scott notes. Prior deferral **overridden**.
- [ ] APPROVE — Public lead capture stays deferred. Internal attribution model only.
- [ ] REJECT — Include a thin public form in Slice B.

**Scott notes:**

> PRIOR DEFERRAL OVERRIDDEN / MODIFIED BY OWNER 2026-09-12. Public Sales lead intake is now required in **B1**.

> Intended acquisition path: Campaign + Source → Tracking Link → Public Intake Form → Lead → Conversion → Opportunity → Won/Lost.

> This is a material scope change from the earlier decision to defer public capture. Do not silently preserve public lead capture in the deferred section. This does **not** automatically authorize implementation. Exact public boundary: Decisions 52+.

**Owner-review Cursor update:** Original Cursor recommendation to defer public capture is **withdrawn given this owner override**. Public intake is now a B1 requirement. Martial Arts `/trial` is gym-shaped (household, programs, class slots, SMS consent). Sales must ship a **generic SI inquiry form**, not a trial-booking clone. Remaining blocking questions are Decisions 52–64.

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

- [x] APPROVE — Local Sales refinement only. Listed production/migration items stay out.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

**Two implementation Work Orders after this worksheet** (still not authorized by checking boxes).

**Owner-review 2026-09-12 working B1/B2 intent** (not final until Decisions 52+ are resolved):

**B1 — Commercial model + acquisition foundation**

- Controlled Sources
- Bounded Campaigns (no Campaign-level Primary Source; Decision 45)
- Campaign/Source attribution on Lead and Opportunity
- Campaign tracking links (Decision 13)
- Public Sales intake (Decision 42)
- Automatic Lead creation from public intake
- Attribution preservation / correction
- Offers
- Opportunity commercial lines
- One-time + MRR valuation; migrate current `amount_cents`
- Company lifecycle + Won promotion
- `won_at` / `lost_at`
- Baseline operational / commercial / attribution reporting

**B2 — Proposal system + reporting completion**

- Proposal entity/model, versions/revisions
- Opportunity/Offer line snapshots
- Printable preview + PDF generation
- Generated artifact handling + optional signed-copy handling
- Proposal workflow
- Remaining dashboard/reporting refinement

Proposal generation remains an approved Slice B requirement. Do not move it out of Slice B merely because B1/B2 are separate Work Orders.

Do **not** treat this list as implementation authorization. Public-intake Decisions 52+ must be resolved first.

C2, SI migration, email send, browser e-sign, billing, and customer portal stay out of both.

### Scott decision

- [x] APPROVE CURSOR RECOMMENDATION — B1 then B2, **with the owner-review B1 expansion above**.
- [ ] APPROVE CHATGPT INITIAL SPLIT — Same B1/B2 idea; put all reporting completion in B2 (baseline reporting waits).
- [ ] ONE WORK ORDER — Entire approved Slice B in a single later WO (except deferred table).
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVED WITH QUALIFICATION 2026-09-12. Slice B is divided into B1 and B2. B1 is commercial model + acquisition foundation and **must include tracking links and public Sales lead intake**. B2 is the proposal system + remaining reporting depth. Proposal generation stays in Slice B. Do not finalize the B1 implementation Work Order until public-intake Decisions 52+ are resolved.

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

- [x] ALLOW MULTIPLE SOURCES PER CAMPAIGN
- [ ] APPROVE CURSOR — One primary Source per Campaign.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> SCOTT CHOSE THE MULTI-SOURCE MODEL 2026-09-12 (ChatGPT-implied association, not Cursor’s one-primary-Source default). A Campaign may span **multiple Sources/channels**. Campaign and Source are separate attribution dimensions.

> Example: Campaign `September Managed IT` may produce Leads through Facebook, Instagram, and Google. A Lead records the actual combination (`Campaign = September Managed IT` + `Source = Facebook`). This enables overall Campaign performance **and** Source/channel performance within a Campaign. Do not force separate Campaign records merely because the same initiative appears on multiple channels.

> Tracking links naturally encode a specific Campaign + Source combination. Decision 7’s Campaign-level Primary Source is **removed**.

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

- [x] APPROVE — Direct Opportunities get the same Source/Campaign fields. Convert copies from Lead.
- [ ] REQUIRE A LEAD — Every Opportunity must come from a converted Lead.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — `won_at` / `lost_at`. Reopen clears them. Period outcome metrics use these dates.
- [ ] USE UPDATED AT — No new columns.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVED 2026-09-12. Add dedicated commercial close timestamps: `won_at` and `lost_at`. Won populates `won_at`. Lost populates `lost_at`. Explicit Reopen clears the corresponding close timestamp. Do not use generic `updatedAt` as the commercial close date.

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

- [x] APPROVE CURSOR TABLE — Pipeline is current-state; outcomes use closed/created dates as above.
- [ ] ALL METRICS USE CREATED DATE
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVED 2026-09-12 — Cursor model. Open pipeline value/MRR and Leads-by-stage are current state. Activities use current due-state semantics. New Leads / New Opportunities use creation date within the period. Won uses `won_at` within the period. Lost uses `lost_at` within the period. Win rate = Won / (Won + Lost) for the period. Lead → Opportunity conversion rate may be a simple operational metric; do not misrepresent it as sophisticated cohort/funnel analytics.

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

- [x] APPROVE — MRR and one-time line value = unit price × quantity. Default quantity 1. No proration.
- [ ] IGNORE QUANTITY FOR MRR — Quantity applies only to one-time lines.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVED 2026-09-12. For recurring commercial lines, MRR = quantity × monthly unit price. Example: 10 managed devices × $50/month = $500 MRR. This is commercial valuation only. It does not authorize usage billing.

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

- [x] APPROVE — Separate Opportunity lines and Proposal snapshot lines, copied at issue.
- [ ] ONE LINE TABLE — Proposals point at live Opportunity lines (conflicts with Decision 25).
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

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

- [x] APPROVE — Same as Decision 30 Cursor recommendation.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> AUTO-APPROVED 2026-09-12. ChatGPT and Cursor materially agreed. No remaining owner business choice. Recorded in the first owner-review pass.

---

# Public acquisition boundary — added after Decisions 13/42 owner override

These decisions were **not** in the original 44 or the first Cursor additions 45–51. They exist because Scott required tracking links **and** public Sales intake in B1.

Inspected for this pass: `sales_template/` (no public routes; `createLead` requires display name plus email, phone, or reachability note; auth middleware on staff pages; Core `registerPublicPaths` unused by Sales); Martial Arts / Renzo-derived pattern (`/t/[slug]` resolves a tracking slug, stores attribution in sessionStorage, redirects to `/trial`; public POST `/api/public/trial` with IP rate limit 8/10min, idempotency replay, campaign + tracking-link IDs written onto the Lead; **no click-visit table**; gym-shaped form: household, programs, class slots, SMS consent). Sales must adapt the **pattern**, not the gym domain.

This section does **not** authorize B1 implementation.

## Decision 52 — Public intake fields

### Repository says

Sales Lead identity today: `displayName` required; at least one of email, phone, or `reachabilityNote`. Company is optional on Lead. Convert creates a Company from the display name if none is set. Martial Arts public trial requires first name, last name, **phone**, and books a class — not an SI inquiry.

### ChatGPT position

Scott asked Cursor to recommend the smallest useful generic/SI Sales form. Candidate fields: name; email; phone; Company/business name; message / what they need; preferred contact method; other qualification. Do not copy Martial Arts household/member fields.

### Cursor assessment

**AGREE** that the form must be SI/generic, not gym booking. Phone-required MA trial exists for SMS/scheduling. SI follow-up is typically email. Company cannot be required (Decision 4). A message is useful as the first history note, not as a fake reachability field.

### Cursor recommendation

**Required:** first name, last name (joined into Lead `displayName`), and **email**.

**Optional:** phone; Company/business name (Lead `accountId` stays unset unless staff later attach; store the submitted company name on the Lead as a text field or first note — do not auto-create a Company from a public form); message / what they need (first `sales_notes` entry).

**Omit from B1:** preferred contact method as a separate control (staff use email/phone that were provided); household/age/program/class slot/SMS consent; CAPTCHA fields unless Decision 58 adds one.

### Scott decision

- [ ] APPROVE CURSOR — Required first+last name and email. Optional phone, company name, message. No gym fields. No auto-created Company.
- [ ] REQUIRE EMAIL OR PHONE — Either email or phone satisfies identity (closer to Slice A staff Lead rules).
- [ ] REQUIRE PHONE — Match Martial Arts public trial.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 53 — Tracking-link model (Campaign + Source)

### Repository says

MA tracking links belong to a Campaign, have `code`, `publicSlug`, `label`, `isDefault`, UTM columns, `destinationPath` (usually `/trial`), and `active`. Source is **not** a first-class FK; UTM `utm_source` is free text. `/t/[slug]` redirects to the destination. Decision 45: a Campaign spans multiple Sources. Decision 13: a link may encode Campaign + Source.

### ChatGPT position

A tracking link should naturally encode a specific Campaign + Source combination. Evaluate multiple links for the same Campaign+Source, optional human-readable label, stable token/slug, active/inactive, and destination. Do not assume the MA model is automatically correct.

### Cursor assessment

**AGREE** that the link is the Campaign+Source join for acquisition. A Campaign-level source list table is unnecessary if every public attributed Lead comes through a link (or staff assignment). Multiple links per Campaign+Source are justified (different posts, audiences, creative). UTM free-text is weaker than a Source FK given Decision 6. Arbitrary `destinationPath` is an open-redirect risk; B1 destination should be the Sales public intake only.

### Cursor recommendation

`sales_tracking_links`: `campaignId` (required), `sourceId` (required), `label` (human-readable, e.g. “September IT — Instagram bio”), opaque `token` (unique, not a sequential id), `active` boolean, timestamps. Destination is always the Sales public intake (token in the path). Allow many links per Campaign+Source. Inactive links 404. Do not copy MA UTM columns, default-link, or arbitrary destination paths in B1.

Public URL shape for B1: `/t/{token}` → intake form (Decision 59).

### Scott decision

- [ ] APPROVE CURSOR — Each tracking link is Campaign + Source + label + opaque token + active. Many links per pair. Intake-only destination.
- [ ] ALLOW CUSTOM DESTINATIONS — Staff may point a link at an external URL (open-redirect / off-site risk).
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 54 — Attribution written from a tracking link

### Repository says

MA writes `campaignId`, `campaignTrackingLinkId`, and UTM fields onto the Lead. Sales has no such columns. Decision 10 snapshots Source/Campaign onto Opportunity at convert. Decision 11 allows later staff correction with a history note.

### ChatGPT position

When someone submits through a tracked link, evaluate writing Source ID, Campaign ID, Tracking Link ID, source detail, and original acquisition timestamp. Determine whether Lead should retain the specific Tracking Link as durable evidence even though Source/Campaign drive most reporting.

### Cursor assessment

**AGREE** that the link id is audit evidence. Reporting should still group by Source and Campaign, not by every Instagram creative token, unless staff drill into a link.

### Cursor recommendation

On successful public submit via `/t/{token}`:

- Lead `sourceId` = link.sourceId
- Lead `campaignId` = link.campaignId
- Lead `trackingLinkId` = link.id (durable; do not clear on later Source/Campaign correction)
- Snapshot `sourceName` / `campaignName` / `trackingLinkLabel` at capture time
- `createdAt` is the acquisition timestamp (no extra column unless we later need “first seen vs submitted”)
- Optional source detail: leave empty unless the submitter typed something; do not stuff the link label into source detail

Reporting uses current Source/Campaign (Decision 11). Tracking Link id remains the original capture pointer.

### Scott decision

- [ ] APPROVE — Write Source, Campaign, Tracking Link id + name snapshots onto the Lead. Keep trackingLinkId as original evidence after corrections.
- [ ] SOURCE AND CAMPAIGN ONLY — Do not persist trackingLinkId on the Lead.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 55 — Untracked / direct public visitors

### Repository says

MA trial can be opened without `/t/` (plain `/trial`). Attribution then depends on query/session or is empty. Decision 6 seeds `Website / Organic`. Decision 8 allows Source without Campaign.

### ChatGPT position

Recommend behavior when someone reaches the public intake without a tracking link. Example: Source = Website / Organic, Campaign = null, Tracking Link = null. Do not force fake Campaign attribution.

### Cursor assessment

**AGREE.** Fake Campaigns poison Campaign performance. Direct URL is a real Website/Organic path.

### Cursor recommendation

Untracked public intake (no token, or unknown token shown as 404 rather than silently untracked — unknown tokens are Decision 58):

- Source = seeded `Website / Organic`
- Campaign = null
- Tracking Link = null

Staff may later correct (Decision 11). Also expose a stable untracked form URL (Decision 59) so the site/footer can link without minting a Campaign.

### Scott decision

- [ ] APPROVE — Untracked submits get Source Website/Organic, no Campaign, no tracking link. Unknown tokens 404.
- [ ] REQUIRE A TRACKING LINK — Public form is only reachable via `/t/{token}`.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 56 — Attribution precedence vs staff correction

### Repository says

Decision 11 already approved: staff may correct attribution; write a history note; no version table; corrections allowed after convert and after Won; reporting follows the current Opportunity/Lead snapshot.

### ChatGPT position

If the tracking link said Facebook + Campaign A but staff later learn it was Referral, determine whether staff may correct it, whether original captured attribution remains historically visible, and what reporting uses after correction.

### Cursor assessment

**AGREE** this is Decision 11 applied to public capture. Do not add a second attribution engine. Original trackingLinkId (Decision 54) is enough original evidence if we also write a history note on first capture (“Submitted via {label}”).

### Cursor recommendation

Same as Decision 11. Public capture is the first write. Staff may correct Source/Campaign afterward. History note on capture and on each correction. Reporting uses **current** Source/Campaign. `trackingLinkId` stays as captured. Do not freeze public attribution at submit.

### Scott decision

- [ ] APPROVE — Public capture is the first write; staff may correct; history notes + retained trackingLinkId; reporting uses current Source/Campaign.
- [ ] FREEZE PUBLIC ATTRIBUTION — Staff cannot change Source/Campaign that came from a tracking link.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 57 — Duplicate public submissions

### Repository says

MA public trial uses an idempotency key to replay double-clicks; it still **creates a Lead** on a new genuine submit and matches household later by phone in some paths. Sales `createLead` has no duplicate detection. Converted Leads remain as `converted` rows.

### ChatGPT position

Evaluate practical B1 behavior for email, phone, existing open Lead, and already converted Lead/Contact. Avoid destructive automatic merging unless clearly justified. Options: warn, link, create another Lead, suppress, or require staff resolution.

### Cursor assessment

**AGREE** that auto-merge is dangerous (two companies, two people sharing a phone, a returning customer with a new need). Suppressing a second inquiry hides real interest. Creating a second Lead is the honest default if we **surface a possible-duplicate warning** to staff.

### Cursor recommendation

- Same browser idempotency key / double-click: replay, do not create a second Lead.
- New submit with same email or phone as an **open** (non-converted) Lead: **create another Lead** and store `possibleDuplicateLeadId` (or a history note on both) so staff can merge/ignore. Do not auto-merge. Do not auto-suppress.
- Same email/phone as a **converted** Lead or existing Contact: still create a new Lead (new inquiry). History note: “Possible match to converted Lead / Contact {id}.”
- No customer account and no portal (Decision 62).

### Scott decision

- [ ] APPROVE CURSOR — Idempotent replay for double-click; otherwise always create a Lead; staff-visible possible-duplicate note/link; no auto-merge.
- [ ] REUSE OPEN LEAD — If an open Lead with the same email exists, update that Lead instead of creating another.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 58 — Public spam / abuse baseline

### Repository says

Sales has no public POST. Core has in-memory **login** throttle only. MA public trial uses in-memory IP rate limit (`allowPublicRequest`, 8 per 10 minutes), Zod validation, idempotency, and generic 4xx. No CAPTCHA, no honeypot in the trial form reviewed. Tracking slug GET returns 404 for unknown slugs without listing campaigns.

### ChatGPT position

This is now a public unauthenticated boundary. Evaluate minimum B1 controls: rate limiting, server-side validation, honeypot, CAPTCHA or equivalent, payload limits, abuse logging, CSRF relevance, token enumeration, safe error responses. Do not overbuild enterprise anti-abuse.

### Cursor assessment

**AGREE** a proportionate baseline is required. CAPTCHA is the only item that is a real owner/UX choice (third-party script, privacy, extra click). CSRF tokens matter less on a cookie-less public POST than origin/rate limits. Do not return whether an email already exists (enumeration). Opaque tokens + 404 prevents campaign enumeration.

### Cursor recommendation

B1 baseline, no extra vendor:

- IP rate limit on public submit (same order of magnitude as MA: ~8 / 10 minutes)
- Server-side Zod validation; payload size cap
- Hidden honeypot field; drop submissions that fill it (generic success to the bot)
- Opaque tracking tokens; unknown token → 404; do not list Campaigns publicly
- Generic error messages; do not reveal duplicate-email existence to the visitor
- Record throttled/rejected attempts in existing security-audit style if cheap, otherwise server logs
- No CAPTCHA in B1 unless Scott checks it below
- No public CSRF session; form POST is unauthenticated by design

### Scott decision

- [ ] APPROVE CURSOR — Rate limit + validation + honeypot + payload cap + opaque tokens + generic errors. **No CAPTCHA in B1.**
- [ ] ADD CAPTCHA NOW — Include CAPTCHA/Turnstile in B1 (third-party script).
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 59 — Public route architecture

### Repository says

`sales-crm` is one Nuxt 4 app on :5040. Core `registerPublicPaths` already supports vertical public pages/prefixes (MA uses it for `/trial`, `/t/`, `/api/public`). Sales staff pages use `middleware: 'auth'`. `default` layout is an unauthenticated canvas (no staff chrome). A second frontend would be a new deploy unit this repo does not have for Sales.

### ChatGPT position

Evaluate a public route within the Sales app vs another lightweight surface. Prefer the smallest architecture consistent with eventual SaaS productization. Do not introduce a separate frontend merely because Renzo has a distinct public booking page unless technically justified. (Renzo/MA public pages are **in the same Nuxt app**, different layout/auth, not a second codebase.)

### Cursor assessment

**AGREE.** MA’s “separate public front-end” is a page/layout split inside one app. A second Sales SPA is unjustified and would fight later CP provisioning.

### Cursor recommendation

Keep public intake **inside `sales_template`**:

- Register public pages/prefixes via Core `registerPublicPaths`
- `/t/{token}` — resolve link, attach attribution, show or redirect to the form
- `/inquire` (or equivalent) — untracked form
- `/api/public/...` — unauthenticated submit
- Public pages use `default` layout, **no** `auth` middleware
- Staff CRM stays on `internal` layout + auth

No separate frontend service.

### Scott decision

- [ ] APPROVE — Public intake is routes inside the existing Sales Nuxt app. No separate frontend.
- [ ] SEPARATE PUBLIC APP — Build a second deployable for intake.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 60 — SaaS / tenant compatibility (B1 vs later CP)

### Repository says

B1 is a single local Sales sqlite. C2 (CP Sales catalog) and D1 (account vs product instance) are **not started** and **not authorized**. Eventual SaaS: a marketing URL must land on the correct customer instance. Official public hostnames are an S8 concern; product domain is unset.

### ChatGPT position

Do not authorize C2 or D1. Do not invent final tenancy architecture. Do not design a tracking-link scheme that obviously cannot evolve into multi-customer SaaS. Document what B1 should do now vs later CP/Product Instance responsibility.

### Cursor assessment

**AGREE.** Encoding a customer slug into every B1 token would pretend D1 exists. Using only autoincrement ids in public URLs is also brittle. Opaque per-instance tokens are compatible with a later hostname-per-instance model (`{slug}.{product-domain}/t/{token}` at S8).

### Cursor recommendation

**B1 now:** opaque `token` unique **inside this Sales instance**. Public URL is this app’s origin + `/t/{token}` (`http://localhost:5040/t/{token}` locally). No customer id, account id, or CP id in the token.

**Later (not B1):** Control Plane / product-instance hostname (or gateway) selects the instance; that instance looks up the token in **its** database. Token uniqueness is per instance, not global.

Do not build a global link directory in B1.

### Scott decision

- [ ] APPROVE — B1 opaque per-instance tokens only. Tenancy/hostname mapping waits for later CP/S8. No D1/C2 invented here.
- [ ] EMBED CUSTOMER SLUG IN B1 URLS
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 61 — Public intake branding

### Repository says

Core `publicBrand()` already reads `NUXT_PUBLIC_BRAND_NAME`, `NUXT_PUBLIC_BRAND_LOCATION`, `NUXT_PUBLIC_APP_NAME`, `NUXT_PUBLIC_PUBLIC_TAGLINE`. MA trial uses those. Sales `.env.example` already has the same brand knobs. No white-label CMS.

### ChatGPT position

Determine whether B1 public intake should initially be Strategic Insights branded, generic Sales product branded, or configurable through existing brand settings. Support SI dogfooding and eventual SaaS reuse without premature white-label infrastructure.

### Cursor assessment

**AGREE** that hardcoding “Strategic Insights” in Vue templates would have to be ripped out for every other Sales customer. Env brand settings already exist.

### Cursor recommendation

Use **existing Core brand env settings** on the public page (name, location, tagline). For SI dogfood, set those values to Strategic Insights in the local `.env`. Do not add a theme/logo CMS in B1. Optional small logo file via env path is unnecessary unless Scott requires it.

### Scott decision

- [ ] APPROVE — Brand the public form from existing Core brand env vars. SI dogfood = env values, not hardcoded copy.
- [ ] HARDCODE STRATEGIC INSIGHTS COPY IN B1
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 62 — Post-submit success behavior

### Repository says

MA trial shows an in-page confirmation with booked class details. No customer account is created. Sales has no mailer (Decision 28). Decision 29 forbids a public customer portal.

### ChatGPT position

Determine thank-you state/page, confirmation text, no account creation, no customer portal, no scheduling unless separately authorized. Recommend a bounded B1 experience.

### Cursor assessment

**AGREE.** Scheduling is MA-specific. Email confirmation would re-open Decision 28.

### Cursor recommendation

In-page thank-you on the same public route. Short confirmation: we received the inquiry and will follow up. No account. No portal. No calendar/scheduling. No automated email. Do not reveal staff names or internal Lead id.

### Scott decision

- [ ] APPROVE — In-page thank-you only. No account, portal, scheduling, or confirmation email.
- [ ] ADD CONFIRMATION EMAIL — Requires mailer scope (conflicts with Decision 28).
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 63 — Tracking-link analytics level

### Repository says

MA tracking GET does **not** record clicks/visits; attribution is written when the **trial is submitted**. Sales Campaign performance (Decision 12) is Lead/Opportunity/Won based.

### ChatGPT position

Possible levels: (1) successful Lead submissions only; (2) also count link visits/clicks; (3) more detailed sessions/events. Recommend the smallest useful level. Be explicit about privacy if recommending click tracking.

### Cursor assessment

**AGREE** that click logs are a new personal-data surface (IP, user agent, timestamps) without helping Won/MRR reporting. Vanity click-through rates can wait. Submission counts already fall out of Leads with `trackingLinkId`.

### Cursor recommendation

**Level 1 for B1:** count successful Lead submissions (and downstream Opportunity/Won via existing attribution). No visit/click table. No pixel. No session replay.

Link-level performance in B1 = Leads (and later Opportunities/Won) grouped by `trackingLinkId` if useful as a drill-down, not a click funnel.

### Scott decision

- [ ] APPROVE — B1 tracks successful Lead submissions only. No click/visit logging.
- [ ] ALSO COUNT CLICKS — Store visit events (IP/privacy implications).
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Decision 64 — Staff can disable public intake

### Repository says

MA can unpublish `/trial` via public trial-status (`published: false` → 404). Sales has Core settings KV. A public form with no off switch is an ops risk during abuse or before SI is ready to advertise it.

### ChatGPT position

(Not explicit; needed because public intake is now in B1.)

### Cursor assessment

**AGREE.** A boolean is cheaper than taking the process down. Not a CMS.

### Cursor recommendation

A Sales setting or simple `public_intake_enabled` flag (default **off** until staff turn it on). When off: public form and submit API return 404. Tracking tokens still 404. Staff CRM unaffected.

### Scott decision

- [ ] APPROVE — Public intake is staff-toggleable and defaults off.
- [ ] ALWAYS ON ONCE SHIPPED
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

>

---

## Deferred — Not authorized by this worksheet

None of the following is pulled into Slice B unless Scott explicitly promotes it in notes above.

**Removed from deferred (owner-review 2026-09-12):** Campaign tracking links (Decision 13); public Sales lead capture (Decision 42). Those now sit in B1 **pending Decisions 52–64**.

| Item | Notes |
|---|---|
| C2 / Control Plane Sales provisioning | C2 unchanged; not started |
| D1 Product Instance schema | Accepted; not shipped |
| SI migration / cutover | Local Sales only |
| Customer self-service / customer accounts / public customer portal | Decision 29 / 62 |
| Browser e-sign / public signing portal | Decision 29 |
| Billing / Stripe / invoicing / QuickBooks / accounting | Pre-sale boundary |
| Service delivery / project management / ticketing / CS expansion | Decision 2 |
| Beauty | C3 |
| S7 / VPS | Official S-track |
| DNS / TLS / production deployment | S8 / later |
| Universal CRM abstraction / generic Lead in Core | D2 wait |
| Speculative Core promotion | Decision 40–41 observe-only |
| MA → `apps/` move | Not C-track Slice B |
| Multi-touch attribution | Decision 8 |
| Ad-platform API synchronization / marketing automation | Decision 7 |
| Full contract lifecycle management | Decision 2 / 29 |
| External e-signature integration | Decision 29 |
| In-app proposal email delivery | Decision 28 |
| Paid document-generation SaaS | Decision 27 |
| Click/visit analytics beyond Lead submissions | Decision 63 default |
| CAPTCHA/Turnstile | Decision 58 unless Scott adds it |

NEAR-04–10 remain open in [[SaaS-Open-Questions]] and **do not** block local Sales Slice B planning.

If Scott believes one deferred item **must** be decided now:

- [x] None — leave the remaining table deferred (public intake + tracking links already promoted via 13/42)
- [ ] Promote one item into a new decision — name it in notes

**Scott notes:**

> Public intake and tracking links were promoted by owner override of Decisions 13 and 42. Unrelated deferred items stay deferred.

---

## Scott approval summary

- [x] Decision 1 complete — Slice B objective
- [x] Decision 2 complete — pre-sale boundary
- [x] Decision 3 complete — attribution first-class
- [x] Decision 4 complete — reopen Campaign deferral
- [x] Decision 5 complete — Source vs Campaign
- [x] Decision 6 complete — controlled Sources (+ list)
- [x] Decision 7 complete — Campaign minimum model
- [x] Decision 8 complete — primary attribution
- [x] Decision 9 complete — attribution on Lead (public-capture clause superseded by 42)
- [x] Decision 10 complete — snapshot onto Opportunity
- [x] Decision 11 complete — attribution correction
- [x] Decision 12 complete — Campaign performance metrics
- [x] Decision 13 complete — tracking links **required** (owner override)
- [x] Decision 14 complete — Offer catalog
- [x] Decision 15 complete — pricing types
- [x] Decision 16 complete — multiple lines
- [x] Decision 17 complete — custom pricing
- [x] Decision 18 complete — discounts
- [x] Decision 19 complete — one-time + MRR
- [x] Decision 20 complete — derive from lines / migrate amountCents
- [x] Decision 21 complete — MRR standard
- [x] Decision 22 complete — proposal generation in Slice B
- [x] Decision 23 complete — Proposal belongs to Opportunity
- [x] Decision 24 complete — proposal contents
- [x] Decision 25 complete — proposal snapshots
- [x] Decision 26 complete — proposal states/versions
- [x] Decision 27 complete — PDF output
- [x] Decision 28 complete — no email send
- [x] Decision 29 complete — e-sign boundary
- [x] Decision 30 complete — signed/generated artifacts
- [x] Decision 31 complete — Accepted ≠ Won
- [x] Decision 32 complete — Company lifecycle nouns
- [x] Decision 33 complete — Won promotes Customer
- [x] Decision 34 complete — multiple Opportunities
- [x] Decision 35 complete — dashboard purpose
- [x] Decision 36 complete — operational metrics
- [x] Decision 37 complete — outcome metrics
- [x] Decision 38 complete — attribution reporting
- [x] Decision 39 complete — time ranges
- [x] Decision 40 complete — Sales-owned
- [x] Decision 41 complete — MA evidence only
- [x] Decision 42 complete — public capture **required in B1** (prior deferral overridden)
- [x] Decision 43 complete — no production/migration
- [x] Decision 44 complete — B1/B2 slicing (B1 expanded for acquisition)
- [x] Decision 45 complete — Campaign may span multiple Sources
- [x] Decision 46 complete — no-Lead Opportunity attribution
- [x] Decision 47 complete — won_at / lost_at
- [x] Decision 48 complete — metric date anchors
- [x] Decision 49 complete — MRR × quantity
- [x] Decision 50 complete — Opportunity vs Proposal lines
- [x] Decision 51 complete — file storage
- [ ] Decision 52 complete — public intake fields
- [ ] Decision 53 complete — tracking-link model
- [ ] Decision 54 complete — attribution from tracking links
- [ ] Decision 55 complete — untracked visitors
- [ ] Decision 56 complete — correction vs captured attribution
- [ ] Decision 57 complete — duplicate public submissions
- [ ] Decision 58 complete — spam/abuse baseline
- [ ] Decision 59 complete — public route architecture
- [ ] Decision 60 complete — SaaS/tenant compatibility
- [ ] Decision 61 complete — public branding
- [ ] Decision 62 complete — thank-you behavior
- [ ] Decision 63 complete — analytics level
- [ ] Decision 64 complete — enable/disable public intake
- [x] Deferred table reviewed (tracking links + public intake removed from deferred)

### Planning readiness

- [x] OWNER REVIEW REQUIRED — Public acquisition decisions added after Decisions 13/42 scope change.
- [ ] DECISIONS COMPLETE — Ready for ChatGPT/Cursor pre-development reconciliation / B1 Work Order preparation.
- [ ] NOT READY — Additional owner discussion required beyond 52–64.

**Decision completion does not authorize implementation.**

A separate [[Work-Order-Protocol]] work order is required before B1 or B2 code may change. Checking boxes here does not start Campaigns, tracking links, public forms, Offers, MRR, proposals, PDF generation, dashboard work, Company lifecycle, C2, or SI migration.

