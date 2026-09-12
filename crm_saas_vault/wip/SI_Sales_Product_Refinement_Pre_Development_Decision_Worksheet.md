---
type: note
status: draft
area: process
updated: 2026-09-11
aliases:
  - SI Sales refinement worksheet
  - Strategic Insights Sales Product Refinement
tags:
  - wip
  - saas
  - decisions
  - sales
---

# Strategic Insights Sales Product Refinement — Pre-Development Decision Worksheet

WIP communication. **Not** the project map. **Not** a work order. Checking boxes records Scott’s decisions. It does **not** authorize implementation.

Cursor may change Sales (or any other product) code only after a separate active [[Work-Order-Protocol]] work order, or Scott’s explicit ask in that later chat.

Do not promote answers from this file into [[SaaS-Decisions]] or ADRs until Scott has completed the checkboxes **and** a follow-up says to promote.

Prior process twin: [[wip/Pre_Development_Product_Architecture_Decision_Worksheet]].

---

## 1. Header / status

| Field | Value |
|---|---|
| Date | 2026-09-11 |
| Repository | `Koifish95/crm_marketing_saas` |
| Branch | `working` |
| HEAD SHA at write | `c3d7fff` (`c3d7ffff87df540867e871be8544a44156d64d8f`) |
| Lockfile `head_at_write` | `beff7e4` in [[project-state.yaml]] — lags this closeout SHA |
| S-track | S0–S6 **Successful**. S7–S11 **not started** |
| C-track | C1 **code-shipped**. C2A **Successful**. C2 / C3 **not started**. D1–D4 **accepted**; D1 schema **not shipped** |
| Implementation authorization | **None.** `authorization.active_work_order: null` |
| Purpose | Settle SI-facing Sales product/workflow decisions before any refinement Work Order |
| This document | **Decision / discovery only** |

---

## 2. Repository reconciliation

Inspected: [[Current-State]], [[project-state.yaml]], [[SaaS-Milestones]], [[SaaS-Decisions]], [[ADR-CRM-Core-Vertical-Architecture]], [[Platform-Architecture]], [[history/C2A_closeout]], [[history/WO-2026-09-11-sales-thin-slice-return]], [[wip/archive/WO-2026-09-11-sales-thin-slice]], `sales_template/` schema/services/pages, `packages/crm-core` record-workspace, Martial Arts follow-up + `lead_notes` + workspace chrome.

### What is currently implemented (Sales)

- `sales_template/` / `sales-crm` on http://localhost:5040. Extends `@crm/core`. Own SQLite + Drizzle journal `0000_wide_cyclops`.
- UI noun **Company** (`sales_accounts`). Contacts require `accountId`. Opportunities require `accountId`. Optional `primaryContactId`. `amountCents` nullable. Stages: `open` → `in_progress` → `won` \| `lost` (free PATCH; no loss reason; no commitment event).
- Activities: description, optional `dueAt`, `completedAt`, optional FKs to company/contact/opportunity. No owner, type, status enum, or notes column.
- Dashboard: counts only (companies, contacts, open/won/lost opportunities, open activities). No pipeline value, overdue queue, or source.
- Record pages wrap Core `AppRecordWorkspace` but are still single-form CRUD. No tabs, no related-record workspace, no `AppRecordSelector` (that component remains Martial Arts–owned).
- No Lead table. No attribution. No offers/catalog. No public capture. No ownership columns. Company `active` boolean only (not prospect/customer lifecycle).
- Demo seed is **Northwind Advisors**, not Strategic Insights data.

### What architecture already decided

- Sales-owned CRM entities. Do not promote Lead/Campaign/public capture into Core until two real implementations exist. D2–D4.
- Strategic Insights is the intended first Sales customer/design target and has **not** been migrated. [[history/C2A_closeout]].
- C2 = Sales vertical **plus** CP product catalog. C2A success does **not** authorize C2.

### What implementation is currently authorized

**None.** Completing this worksheet still authorizes **nothing**.

---

# Decisions

Recommended / default choices are listed first so Scott can approve by checking one box.

Decisions **2, 5–8, 16–18, and 25** need Scott’s business judgment about how Strategic Insights actually sells. Cursor can only advise technically.

---

## Decision 1 — Objective of the next Sales phase

### Repository says

C2A is **Successful**: a thin local Sales consumer that proves Core consumption. C2A closeout explicitly does **not** authorize SI Sales refinement, C2, or Core promotion. No Sales product-depth milestone exists yet.

### ChatGPT recommendation

Turn Sales from the thin architectural proof created by C2A into a **usable Strategic Insights sales/acquisition CRM**.

Do not attempt the entire eventual Sales product.

Do not begin C2/Control Plane provisioning merely because C2A succeeded.

### Cursor assessment

**AGREE.** C2A is a proof. The next product goal is usability for SI’s core sales process, not catalog/provisioning and not a full eventual CRM.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [x] APPROVE — Next phase = usable SI sales/acquisition CRM. Not the entire eventual product. Not C2/CP provision.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE. Turn Sales from the C2A architectural proof into a usable Strategic Insights sales/acquisition CRM without attempting the entire eventual Sales product. C2/Control Plane remains out of scope.

---

## Decision 2 — When a prospect enters Sales

Question: at what point should a potential customer become a record in the Sales CRM?

### Repository says

C2A is **Company-first**. There is no Lead. A Contact cannot exist without `accountId`. An Opportunity cannot exist without `accountId`. Capturing interest today means creating a Company (even a placeholder), then a Contact, then an Opportunity. That is the architectural implication ChatGPT asked Cursor to flag.

### ChatGPT recommendation

As soon as someone provides enough information to represent **actionable commercial interest**.

Do not require creation of a Company before early interest can be captured.

### Cursor assessment

**AGREE.** Company-first is the C2A proof shape, not SI’s capture shape. Keeping it would force fake Companies for unnamed orgs and block “person called, no company yet.”

Technical cost: new Lead entity (Decision 3) and conversion (Decision 5). Contact/Opportunity FKs stay Company-required unless Decision 28 says otherwise.

### Cursor recommendation

Same as ChatGPT. Pair with Decisions 3–5 and 26–29.

### Scott decision

- [x] APPROVE — Capture on actionable interest. Do not require a Company first.
- [ ] REJECT — Keep Company-first capture (C2A shape).
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE. A prospect may enter Sales when there is enough information to represent actionable commercial interest. Company is not required first.

---

## Decision 3 — Sales-owned Lead / Prospect

Question: does Sales need a first-class Lead/prospect concept distinct from Company, Contact, and Opportunity?

### Repository says

No Sales Lead table. Martial Arts `leads` + `lead_lines` are **households**, not sales prospects. D2: Sales builds its own contact/opportunity model; do not promote MA leads into Core. Architecture tests forbid gym nouns in Sales.

### ChatGPT recommendation

**Yes.** Implement it as Sales-owned initially. Do not reuse Martial Arts Household Lead. Do not promote Lead into Core merely because both verticals contain lead-like concepts. The second consumer should provide evidence before abstraction.

### Cursor assessment

**AGREE.** A Sales Lead is a different domain object from an MA household. Copying MA `leads` would be a product error. Core promotion is premature (one real Sales implementation, not two).

### Cursor recommendation

Same as ChatGPT. UI noun (Lead vs Prospect) is Decision 29.

### Scott decision

- [x] APPROVE — Sales-owned Lead/prospect. Do not reuse MA Household Lead. Do not promote into Core yet.
- [ ] REJECT — Stay on Company + Contact + Opportunity only.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE. First-class Sales-owned Lead. Do not reuse Martial Arts Household Lead. Do not promote generic Lead into Core.

---

## Decision 4 — Company requirement for Leads

Question: must every Lead belong to a Company?

### Repository says

Today every Contact and Opportunity belongs to a Company. No Lead exists to attach optionally.

### ChatGPT recommendation

**No.** Company should be optional during early qualification because some prospects may be individuals or their organization may not yet be known.

### Cursor assessment

**AGREE.** Optional Company on Lead is the point of Decision 2. After conversion, whether Opportunity still requires a Company is Decision 27 (blocking).

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [x] APPROVE — Lead.Company is optional until qualification.
- [ ] REJECT — Every Lead must have a Company.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE. A Lead may exist without a Company.

---

## Decision 5 — Qualification / conversion behavior

Question: what should happen when a Lead becomes sufficiently qualified to enter the durable sales workflow?

### Repository says

No conversion path exists. C2A creates Company / Contact / Opportunity independently. Martial Arts “conversion” is trial/member household workflow — not a template to copy.

### ChatGPT recommendation

Conversion should create/associate the appropriate durable commercial records:

- Company/Sales Account where applicable
- Contact
- Opportunity

Only create records that are actually required.

Do not copy Martial Arts conversion semantics automatically.

### Cursor assessment

**AGREE.** Model this as an **explicit Convert action** on the Lead (staff-initiated), not a silent promotion and not MA trial conversion.

Cursor preference for the mechanism:

- Keep the Lead row as history (`converted` / linked IDs). Do not delete it.
- Create Contact if a person is known.
- Create Company only if an organization is known **or** Decision 27 requires a Company for every Opportunity.
- Create Opportunity as the durable sales-work record (Decision 12).
- Do not invent extra records “for completeness.”

### Cursor recommendation

Same as ChatGPT, with explicit Convert + retained Lead history as above.

### Scott decision

- [x] APPROVE — Explicit Convert creates only needed Company / Contact / Opportunity. Keep Lead as history. Do not copy MA conversion.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Also check if you want:**

- [x] Convert is staff-initiated (recommended)
- [ ] Convert is automatic when a stage is selected
- [ ] Lead is archived/hidden after convert
- [x] Lead remains visible and linked after convert (recommended)

**Scott notes:**

> APPROVE Cursor's recommendation. Explicit staff-triggered Convert Lead action. Creates/associates Company where applicable, Contact where applicable, and Opportunity. Retain the original Lead as historical evidence and link it to the resulting records.

---

## Decision 6 — Strategic Insights pipeline stages

Current C2A stages (`open`, `in_progress`, `won`, `lost`) are provisional. Replacing them is a Sales-owned enum/UI change; tests currently hard-code those four codes.

### Repository says

Stages live **only on Opportunity**. There is no Lead lifecycle. Won/Lost are stages, not separate outcome objects. Any stage can be PATCHed to any other (including Won → Lost on the same row).

### ChatGPT recommendation (starting list, not settled)

- New
- Contacted
- Qualified
- Proposal / Quote
- Decision
- Won
- Lost

### Cursor assessment

**AGREE WITH QUALIFICATION** on replacing `open`/`in_progress` with SI business names.

**DISAGREE** that all seven names should live as one Opportunity pipeline without deciding **which record owns which stage**.

New / Contacted / Qualified describe **pre-Opportunity** work if Decision 3 is yes. Proposal / Quote / Decision / Won / Lost describe **Opportunity** work. Putting New on an Opportunity that does not exist yet will recreate Company-first capture under a new label.

This is owner business process **and** a schema fork. Scott must choose.

### Cursor recommendation

- **Lead stages (before convert):** New → Contacted → Qualified (Qualified is the convert gate, or convert is a separate action at Qualified).
- **Opportunity stages (after convert):** Proposal / Quote → Decision → Won | Lost.
- Optionally keep a Qualified Opportunity stage if convert happens earlier than “proposal-ready.”
- Won and Lost remain terminal Opportunity stages (see Decisions 7–8).
- Scott may rename/reorder; codes should be stable slugs (`new`, `contacted`, …) with display labels.

### Scott decision

**Stage ownership (pick one):**

- [ ] APPROVE CHATGPT RECOMMENDATION — One pipeline list on Opportunity (New … Won/Lost). Lead may exist but does not have its own stages.
- [x] APPROVE CURSOR RECOMMENDATION — Split: Lead New/Contacted/Qualified; Opportunity Proposal/Decision/Won/Lost (adjust if notes say otherwise).
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Include these stages** (check all that apply; add names in notes):

- [x] New
- [x] Contacted
- [x] Qualified
- [x] Proposal / Quote
- [x] Decision
- [x] Won
- [x] Lost
- [x] Other / rename / reorder — See Scott notes.

**Scott notes:**

> APPROVE Cursor's qualified recommendation, not ChatGPT's single Opportunity pipeline. Lead lifecycle: New → Contacted → Qualified → Convert (explicit staff action). Opportunity lifecycle: Proposal / Quote → Decision → Won | Lost. Do not place New/Contacted/Qualified onto Opportunity. Exact technical status representation may be refined during Work Order planning; preserve the domain distinction.

---

## Decision 7 — Definition of Won

Question: what event should make an Opportunity Won?

### Repository says

Won is a stage code. No commitment rule, no payment check, no irreversibility, no side effect on Company status.

### ChatGPT recommendation

Won means the prospect has made a **meaningful commitment to purchase the service**, not merely expressed interest or received a proposal. Exact commitment event should be defined. Do not assume invoicing/payment is required unless Scott chooses that.

### Cursor assessment

**AGREE** that Won is a business event, not “they replied.” Code cannot know SI’s handshake. Options below are for Scott.

### Cursor recommendation

Same as ChatGPT. Default technical behavior if Scott picks a commitment event: Won is staff-asserted (checkbox/action), not inferred from a payment system (billing is deferred).

### Scott decision

**Won means (pick one):**

- [ ] Verbal / written commitment to buy (no invoice required)
- [x] Signed agreement / SOW / engagement letter
- [ ] First invoice sent
- [ ] First payment received
- [ ] Kickoff scheduled
- [ ] Other — See Scott notes.

**Also:**

- [x] Won is staff-asserted only (recommended for this phase)
- [ ] System may auto-Won from another event (name it in notes)

**Scott notes:**

> Won = signed agreement / SOW representing commitment to purchase. Do not require invoice issuance, payment receipt, or kickoff. Won remains an explicit staff action unless later automation is separately authorized.

---

## Decision 8 — Definition of Lost

### Repository says

Lost is a stage code. No loss-reason field. Tests allow the same Opportunity to be Won then Lost.

### ChatGPT recommendation

Lost means the sales opportunity has **intentionally been closed without a sale**. Capture a loss reason. ChatGPT recommends **structured category plus optional notes**, with a **reason required** when marking Lost.

### Cursor assessment

**AGREE.** A required structured reason is cheap and is how you learn why SI loses deals. Terminal stages should not be toggled casually; reversing Lost/Won can be an explicit reopen if Scott wants it later.

### Cursor recommendation

Same as ChatGPT. Suggested first categories (Scott can edit): timing, budget, went with other provider, no longer needed, could not reach, not a fit, other.

### Scott decision

**Lost means:**

- [x] APPROVE — Intentionally closed without a sale.

**Loss reason:**

- [x] APPROVE CHATGPT / CURSOR — Required structured category + optional notes
- [ ] Required free-text only
- [ ] Optional notes only
- [ ] No reason captured in this phase

**Also:**

- [x] Won/Lost are terminal until an explicit Reopen action
- [ ] Staff may freely change any stage including Won ↔ Lost (C2A behavior)

**Scott notes:**

> Required structured loss reason plus optional notes. If Other is selected, require explanatory text. Initial reasons: Budget, Timing, Chose another provider, No longer needed, Could not reach, Not a fit, Other. Won/Lost are terminal until staff explicitly reopens the Opportunity.

---

## Decision 9 — Operational follow-up

### Repository says

Sales Activities: description, optional due timestamp, completed/not, optional FKs. List page is CRUD, not a queue. No owner, type, or overdue view. Martial Arts `FollowUpTask` is richer (assign, purpose/type, outcomes, open/completed/cancelled queues) and is **MA-owned**. Do not import it.

### ChatGPT recommendation

Activities should become a real operational follow-up queue supporting, at minimum: owner, activity/task type, due date/time, status, related commercial record, notes/context, completion. Overdue and upcoming work should be visible. Compare with MA follow-up; do not promote either into Core.

### Cursor assessment

**AGREE.** C2A Activities are a stub. MA follow-up is evidence of the *shape*, not a library to reuse (household/trial semantics).

Due date/time should use the existing Sales timezone (`NUXT_PUBLIC_TIMEZONE`, currently `America/Denver`) unless Scott later changes SI timezone. That is not a blocker.

### Cursor recommendation

Same as ChatGPT. Keep Sales-owned. Related record: Lead and/or Opportunity (and optional Contact/Company). Visible queues: overdue, due today, upcoming, completed.

### Scott decision

- [x] APPROVE — Operational activity queue as listed (owner, type, due, status, related record, notes, completion, overdue/upcoming).
- [ ] REJECT — Keep C2A stub Activities.
- [ ] MODIFY — See Scott notes.

**Include these fields/behaviors:**

- [x] Owner (user)
- [x] Type (call, email, meeting, task, other)
- [x] Due date/time
- [x] Status (open / completed; optional cancelled)
- [x] Related Lead and/or Opportunity
- [x] Notes
- [x] Overdue / upcoming visibility
- [x] Other — See Scott notes.

**Scott notes:**

> APPROVE. Real Sales-owned operational queue. Also require due-today visibility. Initial activity types: Call, Email, Meeting, Task, Other. Do not reuse Martial Arts FollowUpTask directly.

---

## Decision 10 — Notes and history

### Repository says

Company/Opportunity `notes` is a single text blob. No chronological interaction log. Martial Arts has `lead_notes` (vertical-owned). Core has `security_events` (auth/admin), not commercial history.

### ChatGPT recommendation

**Yes.** Commercial records need chronological interaction/history visibility. Start vertical-owned. Compare with MA Notes & History later for Core-promotion evidence. Do not promote now.

### Cursor assessment

**AGREE.** A blob is not a history. Sales-owned `sales_notes` (or equivalent) on Lead / Company / Opportunity (and maybe Contact) is the smallest model. Do not reuse `lead_notes`.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [x] APPROVE — Chronological notes/history, Sales-owned, on the primary commercial records. No Core promotion now.
- [ ] REJECT — Keep a single notes blob.
- [ ] MODIFY — See Scott notes.

**Attach history to:**

- [x] Lead
- [x] Company
- [x] Contact
- [x] Opportunity
- [ ] Activity (if distinct from activity notes)

**Scott notes:**

> APPROVE. Chronological Sales-owned notes/history on Lead, Company, Contact, and Opportunity. Activities may retain their own contextual notes. Do not authorize Core promotion merely because Martial Arts has similar functionality.

---

## Decision 11 — Primary Record Workspace

Question: should Sales adopt the Primary Record Workspace pattern already proven in Martial Arts?

### Repository says

Core already ships `AppRecordWorkspace` (toolbar / header / actions / tabs **slots**) and `record-workspace.ts` query helpers. `AppRecordSelector` and `AppRecordTabs` **remain in Martial Arts**, not Core. Sales Company/Contact/Opportunity pages already wrap `AppRecordWorkspace` but the body is still a save form — not a coherent workspace with related lists, history, activities, and prev/next identity.

### ChatGPT recommendation

**Yes.** Company and Opportunity should become coherent workspaces rather than remaining only disconnected CRUD pages. Do not promote additional MA-specific UI into Core without evidence.

### Cursor assessment

**AGREE WITH QUALIFICATION.** Use the Core chrome that already exists. Build Sales workspace **content** (related Contacts, Activities, notes, convert/pipeline actions) in Sales. If prev/next selector or tabs are needed, copy/adapt into Sales (or use Core slots with Sales-owned tab components). Do **not** import MA selector/tabs. Do **not** promote selector/tabs into Core in this phase — Decision 22 is observe-only.

### Cursor recommendation

Approve ChatGPT’s yes, with the qualification above.

### Scott decision

- [x] APPROVE — Company and Opportunity become coherent workspaces using Core chrome; Sales-owned content; no Core promotion of MA selector/tabs now.
- [ ] REJECT — Keep C2A CRUD pages.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE Cursor's qualified recommendation. Use existing Core AppRecordWorkspace where appropriate. Sales owns workspace-specific tabs/content. Do not import Martial Arts workspace components. Do not perform speculative workspace promotion into Core.

---

## Decision 12 — Primary operational sales record

Question: which record should function as the main day-to-day sales workspace?

### Repository says

Nav today is Companies, Contacts, Opportunities, Activities as peers. Opportunity already has stage + amount. Company is the parent account.

### ChatGPT recommendation

**Opportunity** is the primary sales-work record. Company is the durable commercial relationship/account record. Contacts represent people associated with that relationship.

### Cursor assessment

**AGREE.** Matches conversion (Lead → Opportunity as the work object) and pipeline/Won/Lost. Company remains the account home. After Lead exists, the *inbox* may be Leads until convert; day-to-day selling is still the Opportunity.

### Cursor recommendation

Same as ChatGPT. Operational landing: open Opportunities (and overdue activities). Lead list is the capture/qualification inbox.

### Scott decision

- [x] APPROVE — Opportunity = primary sales-work record. Company = relationship/account. Contacts = people.
- [ ] REJECT — Company is the primary daily workspace.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE. Opportunity is the primary day-to-day sales-work record. Company is the durable commercial/account relationship. Contact represents people associated with that relationship. Lead represents pre-opportunity commercial interest.

---

## Decision 13 — Acquisition / source attribution

### Repository says

No source/channel/campaign fields on Sales records. Martial Arts campaigns/events/attribution are MA-owned (D3).

### ChatGPT recommendation

**Yes.** At minimum record how a prospect entered the pipeline (source, channel, referral, campaign/tracking context where applicable). First implementation Sales-owned. Do not automatically reuse MA Campaign/Event structures.

### Cursor assessment

**AGREE.** A few Sales-owned fields (and optional free text) on Lead, copied onto Opportunity at convert, is enough. Do not build Campaign CRUD (Decision 14).

### Cursor recommendation

Same as ChatGPT. Suggested minimum: `source` (structured), optional `referralName`, optional `campaignNote` (text, not an FK).

### Scott decision

- [x] APPROVE — Sales-owned attribution on Lead (copy to Opportunity on convert). No MA campaign reuse.
- [ ] REJECT — No attribution in this phase.
- [ ] MODIFY — See Scott notes.

**Capture:**

- [x] Source (structured list)
- [x] Channel
- [x] Referral name/person
- [x] Campaign / tracking note (text, not Campaign entity)
- [ ] Other — See Scott notes.

**Scott notes:**

> APPROVE. Capture useful source/attribution. First implementation Sales-owned. Do not automatically reuse Martial Arts Campaign/Event attribution structures. Timing: Slice B (Decision 26).

---

## Decision 14 — Campaigns

Question: should Sales Campaign management be part of the immediate refinement phase?

### Repository says

No Sales campaigns. MA has a mature Campaign workspace. D3: wait; Sales states requirements first.

### ChatGPT recommendation

**No.** Capture source/attribution first. Evaluate Campaigns later against the mature MA implementation before deciding Sales-owned Campaign vs shared primitives.

### Cursor assessment

**AGREE.** Attribution (Decision 13) does not need Campaign entities. Copying MA Campaigns now would be premature Core-shaped work.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [x] APPROVE — No Campaign domain in this phase. Attribution only.
- [ ] REJECT — Include Sales Campaigns now.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE. Do not implement Sales Campaign management in this refinement phase. Capture attribution/source first. Campaign architecture remains a later comparison/decision.

---

## Decision 15 — Public lead capture

Question: should the next refinement slice include public lead-capture forms?

### Repository says

Sales has no public routes. Core has no capture framework. D4: public capture stays vertical-owned; no generic Core public-capture yet. MA `/trial` is gym-specific.

### ChatGPT recommendation

**Not in the first internal refinement slice.** First make the internal Lead → Opportunity → follow-up → outcome workflow correct. Public capture should then feed that established workflow.

### Cursor assessment

**AGREE.** A public form is not unusually cheap here: it needs a public layout, spam/throttle, and a stable Lead API. Building it before Lead conversion exists would encode the wrong intake shape. Not necessary for internal SI use if staff enter leads.

### Cursor recommendation

Same as ChatGPT. Defer public capture to a later Work Order after the internal workflow exists.

### Scott decision

- [x] APPROVE — No public capture in the first refinement slice.
- [ ] REJECT — Include a thin public form now.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE. Do not include public lead-capture forms in the first internal refinement slice. First establish the internal Lead → conversion → Opportunity → follow-up → outcome workflow. Public capture can feed that workflow later.

---

## Decision 16 — Products / services / offers

Question: does Sales need to know what Strategic Insights is attempting to sell?

### Repository says

Opportunity has a free-text `name` and optional `amountCents`. No offer/service table. C2 catalog is Control Plane product catalog (not this). Billing/Stripe are not started.

### ChatGPT recommendation

**Yes, minimally.** A small Sales-owned Service/Offer concept so Opportunities represent what is being sold. Do not turn this into billing, Stripe, accounting, invoicing, CP product catalog, or a universal product catalog.

### Cursor assessment

**AGREE** that Opportunities should say *what* is for sale. **AGREE WITH QUALIFICATION** on how much table to build: a Sales-owned offer list (name, optional description, optional default amount) referenced by Opportunity is enough. Opportunity can still override the amount. Do not wait on C2.

If Scott’s SI catalog is tiny and stable, even a structured enum of offer names might suffice — but a small table is cleaner.

### Cursor recommendation

Small Sales-owned Offer/Service list; Opportunity has optional `offerId` + override `amountCents`. Not billing.

### Scott decision

- [x] APPROVE — Minimal Sales-owned Offer/Service list; Opportunity references it. No billing/catalog infrastructure.
- [ ] REJECT — Free-text Opportunity name is enough for this phase.
- [ ] MODIFY — See Scott notes.

**Offer fields to include:**

- [x] Name
- [x] Short description
- [x] Default price / amount
- [x] Active/inactive
- [x] Other — See Scott notes.

**Scott notes:**

> APPROVE a minimal Sales-owned Service/Offer concept: Name, Description, Default price/value, Pricing type (one-time | recurring), Active/inactive, and Opportunity association/selection. Do not expand into billing, Stripe, taxes, accounting, invoicing, complex price books, or CP product catalog. Timing: Slice B (Decision 26).

---

## Decision 17 — Opportunity monetary value

### Repository says

`sales_opportunities.amountCents` already exists and is nullable. Dashboard does **not** sum pipeline value. No recurring/MRR fields.

### ChatGPT recommendation

**Yes.** Opportunities should support estimated deal value. Scott must choose whether this phase needs one-time value, recurring monthly value, both, or another structure. Do not infer from generic CRM practice.

### Cursor assessment

**AGREE** that estimated value belongs. Code already has one-time cents. Recurring is a **new** field and a reporting rule (monthly × remaining term vs annual). Cursor cannot know if SI sells retainers, projects, or both.

### Cursor recommendation

Keep one-time estimated value in this phase unless Scott checks recurring. If SI is mostly project/advisory engagements, one-time is enough. If SI is mostly monthly retainers, add monthly amount now.

### Scott decision

**This phase needs:**

- [ ] One-time estimated value only (already in C2A; keep/use it)
- [ ] Recurring monthly value only
- [x] Both one-time and monthly
- [ ] Another structure — See Scott notes.
- [ ] No monetary value in this phase

**Scott notes:**

> Support both one-time value and monthly recurring revenue (MRR). Example: $3,000 one-time implementation/project value and $500/month recurring service value, or both when appropriate. This is Sales opportunity valuation. It does not authorize billing/invoicing. Slice A retains/uses existing one-time amountCents; one-time + MRR enhancements are Slice B (Decision 26).

---

## Decision 18 — Proposals / quotes

Question: should the next implementation slice include actual proposal/quote generation?

### Repository says

No proposal entity, files, or generator. A pipeline stage named Proposal/Quote is only a label.

### ChatGPT recommendation

**Probably not.** The pipeline should support a Proposal/Quote **stage** without a proposal-generation subsystem yet.

### Cursor assessment

**AGREE.** PDF/email proposal generation is a product of its own (templates, versions, accept/reject). A stage plus optional metadata (sent date, amount, link/note) is cheap. A generator is not.

### Cursor recommendation

Defer generation. Allow optional proposal metadata on the Opportunity if Scott wants staff to record “sent quote on DATE / $X” without a file manager.

### Scott decision

- [ ] APPROVE CHATGPT / CURSOR — Pipeline stage only; no proposal-generation subsystem.
- [ ] Support proposal metadata/status (sent date, amount, link/note) without generation
- [x] Require proposal functionality (draft/send/track) in this slice
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> OWNER OVERRIDE. Scott rejected deferring proposal generation. **Build proposal generation.** This is an approved Slice B product requirement (Decision 26), not Slice A, and is **not authorized for implementation yet**. Before Slice B, bound generation so it does not silently expand into billing, accounting, e-signature, or a document-management platform unless separately decided. ChatGPT/Cursor text above remains the historical recommendation.

---

## Decision 19 — Prospect / customer lifecycle

Question: what should happen to Company status after an Opportunity is Won?

### Repository says

Company has `active` boolean only. Winning an Opportunity does not change Company. No customer-success module.

### ChatGPT recommendation

Represent the Company as an active customer/prospect lifecycle state as appropriate, but do not expand Sales into service delivery/customer success in this phase.

### Cursor assessment

**AGREE.** Smallest clean model: Company `lifecycle` = `prospect` | `customer` | `inactive`. Set to `customer` when any Opportunity is Won (staff can override). Do not add retainers, projects-as-delivery, onboarding checklists, or CS queues.

### Cursor recommendation

Same as ChatGPT, with the three-state lifecycle above.

### Scott decision

- [x] APPROVE — Company lifecycle prospect / customer / inactive. Won may mark customer. No service-delivery product.
- [ ] REJECT — Keep Company.active only.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE. Company should have its own lifecycle/status (prospect / customer / inactive). Won may mark the Company as customer. Sales-owned; do not automatically become a Core customer-status concept or a service-delivery product. Timing: Slice B (Decision 26).

---

## Decision 20 — Dashboard / reporting

### Repository says

Dashboard is six counts. No pipeline value, overdue list, or source breakdown.

### ChatGPT recommendation

Implement only operational Sales reporting needed for daily use. Do not create a full BI/analytics subsystem.

### Cursor assessment

**AGREE.** Counts + one pipeline-value number + overdue activities is a dashboard, not analytics. Source summary is cheap if Decision 13 lands.

### Cursor recommendation

Same as ChatGPT. Check the metrics Scott actually wants below.

### Scott decision

- [x] APPROVE — Operational dashboard only; no BI project.

**Include:**

- [x] Open opportunities
- [x] Pipeline value
- [x] Overdue activities
- [x] Upcoming activities
- [x] Won (count / value)
- [x] Lost (count / value)
- [x] Source / attribution summary
- [x] Other — See Scott notes.

**Scott notes:**

> APPROVE. Operational Sales dashboard/home only; not a BI project. Include all listed metrics plus conversion count (Leads converted to Opportunities) and due-today activities. Timing: Slice B (Decision 26).

---

## Decision 21 — Ownership / assignment

### Repository says

No `ownerUserId` on Sales domain tables. Core users/RBAC exist and are consumed (thin `/users`, `VIEW_SALES` / `MANAGE_SALES`). MA follow-up assignment is MA-owned.

### ChatGPT recommendation

**Yes.** Leads, Opportunities, and Activities should support ownership/assignment to a user. Design for multiple users even if SI initially has one salesperson. Use existing Core users/RBAC.

### Cursor assessment

**AGREE.** `ownerUserId` FK to Core `users` is the whole design. Filter queues by “mine.” ADMIN/STAFF can reassign. Do not invent a second user system.

### Cursor recommendation

Same as ChatGPT. Also allow Company owner later if useful; not required if Opportunity + Lead + Activity are owned.

### Scott decision

- [x] APPROVE — Owner on Leads, Opportunities, and Activities via Core users.
- [ ] REJECT — No ownership in this phase.
- [ ] MODIFY — See Scott notes.

**Also own:**

- [ ] Company (optional)
- [ ] Contact (optional)

**Scott notes:**

> APPROVE. Keep/extend owner on Lead, Opportunity, and Activity via Core users. Do not add a Core ownership/assignment engine. Do not add Company/Contact owners in this phase unless a later Work Order requires them.

---

## Decision 22 — Core-promotion comparison targets

### Repository says

ADR: diverge first; abstract after two real implementations. C2A return already listed promotion *candidates* (auth pages, App* primitives, run-nuxt). This decision is observe-only.

### ChatGPT recommendation

During/after Sales refinement, compare MA and Sales for genuine shared behavior: Primary Record Workspace, task/activity mechanics, notes/history, ownership, attribution primitives, status/timeline UI, reusable selectors. **Do not authorize promotion in this worksheet.**

### Cursor assessment

**AGREE.** This worksheet must not become a Core extraction license. Selector/tabs are the most likely later candidates if Sales copies the pattern (Decision 11).

### Cursor recommendation

Same as ChatGPT. Observe the list; promote only via a later Work Order.

### Scott decision

- [x] APPROVE — Observe these comparison targets. No promotion authorized.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Observe:**

- [x] Primary Record Workspace
- [x] Task / activity mechanics
- [x] Notes / history
- [x] Ownership
- [x] Attribution primitives
- [x] Status / timeline UI
- [x] Reusable selectors
- [ ] Other — See Scott notes.

**Scott notes:**

> APPROVE. Observe existing Core/MA surfaces. Reuse only by explicit later decision. Do not import Martial Arts components wholesale. Do not perform speculative Core promotion.

---

## Decision 23 — Strategic Insights migration

### Repository says

SI exists as an S4 **Martial Arts** laptop proof (`strategic-insights`, ports 52200/52201). Disposable until VPS in platform docs. C2A did not migrate SI. NEAR-09 still treats SI dogfood definition as open at the platform layer.

### ChatGPT recommendation

**Do not migrate SI during the next product-refinement slice.** Build against SI’s real workflow first. Migration/readiness/cutover gets its own later decision and Work Order.

### Cursor assessment

**AGREE.** Using MA as the live SI CRM while Sales is being redesigned is correct. Cutover before the workflow in Decision 25 exists would strand SI on a half-built app.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [x] APPROVE — No SI migration/cutover in this refinement phase.
- [ ] REJECT — Include migration now.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE. This is Sales product refinement, not SI data/app migration. SI remains a later target. Do not include SI import, mapping, or cutover in this phase.

---

## Decision 24 — C2 / Control Plane provisioning

### Repository says

C2 is **not started** and includes CP product catalog. CP provision is Martial Arts-only (`industry_template` always `martial-arts`). Sales has no Docker image/tag. C2A success does not authorize C2. Local `pnpm dev` on 5040 is sufficient for product-depth work.

### ChatGPT recommendation

**Do not begin C2 yet.** Continue product-depth validation locally before investing in Control Plane multi-product provisioning.

### Cursor assessment

**AGREE.** No repository blocker requires CP work first. D1 schema is also not required to deepen Sales locally.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [x] APPROVE — Do not begin C2 / CP Sales provisioning in this phase.
- [ ] REJECT — Begin C2 first.
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE. C2 remains blocked until Sales is a real vertical. Completing this worksheet does not authorize C2 or Control Plane Sales provisioning.

---

## Decision 25 — Success definition

### Repository says

C2A success was: local Sales app with Company/Contact/Opportunity/Activity and provisional Won/Lost. This next phase needs a new bar. No SI spreadsheet exists in-repo to compare against.

### ChatGPT recommendation

The next meaningful Sales refinement should make this workflow operational:

```text
Initial interest
→ Lead/prospect
→ qualification
→ Company/Contact/Opportunity
→ pipeline progression
→ follow-up activities
→ proposal/decision stage
→ Won/Lost
```

Success means Scott could realistically manage Strategic Insights’ **core acquisition and sales process** inside Sales CRM without needing an external spreadsheet/manual tracker for the core workflow.

This does not mean every SI business function must exist.

### Cursor assessment

**AGREE** on that success bar. It matches Decisions 2–12 and 7–9.

Attempting **every** approved capability from this worksheet in **one** Work Order would be too large (Lead + conversion + stage split + workspace + activities + notes + offers + attribution + dashboard + ownership + lifecycle). See Decision 26 for bounding.

### Cursor recommendation

Approve ChatGPT’s success definition. Bound the first implementation Work Order via Decision 26 rather than weakening this bar.

### Scott decision

- [x] APPROVE — Success = manage SI core acquisition/sales inside Sales without a spreadsheet for that core workflow. Not every SI function.
- [ ] REJECT
- [ ] MODIFY — See Scott notes.

**Scott notes:**

> APPROVE. Success means Scott could realistically manage Strategic Insights’ core acquisition and sales process inside Sales CRM without an external spreadsheet for that core workflow. It does not mean every SI business function must exist.

---

# Additional decisions Cursor believes are required before development

These are not in ChatGPT’s original 25. They block schema or Work Order size.

---

## Decision 26 — First implementation Work Order size

### Repository says

C2A was a thin slice on purpose. The prior architecture worksheet split **audit WO** vs **implementation WO**. This worksheet lists more product than one safe implementation WO.

### ChatGPT recommendation

(Not originally a separate question.) ChatGPT asked Cursor to recommend a smaller bounded slice if all approved capabilities would be too large.

### Cursor assessment

**One WO for the full Decision 25 workflow plus offers, attribution, dashboard, lifecycle, and workspace polish is too large.** It would mix domain invention with UX rebuild and invite scope creep into proposals/campaigns.

### Cursor recommendation

**Two implementation Work Orders after this worksheet** (still not authorized by checking boxes):

1. **Slice A (must hit Decision 25):** Lead (optional Company) + convert + stage model from Decision 6 + Opportunity/Company workspaces + activity queue + notes/history + ownership + Won/Lost reasons. Keep/use existing one-time `amountCents`.
2. **Slice B (after A is usable):** Offers (16), one-time + MRR value (17), attribution UI (13), dashboard metrics (20), Company lifecycle (19), **proposal generation** (18 — product approved for Slice B; not Slice A; not authorized until a Slice B Work Order).

Public capture, Campaigns, C2, SI migration stay out.

### Scott decision

- [x] APPROVE CURSOR RECOMMENDATION — Slice A then Slice B as above. Only A is the next implementation WO after reconciliation.
- [ ] APPROVE ONE WORK ORDER — Implement all approved items from this worksheet in a single later WO (except deferred table).
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVE CURSOR. Split into Slice A then Slice B. Only Slice A is the next implementation Work Order after ChatGPT reconciliation. Checking these boxes does not authorize Slice A.

Slice A = Sales backbone:
- Lead entity
- Lead conversion
- Opportunity pipeline
- Won / Lost
- Loss reason
- Activities
- Notes / history
- Opportunity/Company workspaces
- Owner / assignment
- Existing one-time `amountCents` (no MRR/offers yet)

Slice B:
- Offers / services
- One-time + MRR value
- Source / attribution UI
- Dashboard / metrics
- Company lifecycle
- **Proposal generation** (Decision 18 — approved product requirement for Slice B, not Slice A, not authorized until a Slice B Work Order)

Public capture, Campaigns, C2, and SI migration remain out of both slices.

---

## Decision 27 — Can an Opportunity exist without a Company?

### Repository says

`sales_opportunities.account_id` is **NOT NULL**. Individuals without a known org cannot have an Opportunity today without a placeholder Company.

### ChatGPT recommendation

(Implied by Decisions 4–5: create Company “where applicable.” Not explicit.)

### Cursor assessment

This is the leftover of Company-first. If SI sells to individuals (or “company TBD”), either:

- **Always create a Company** at convert (person name as account, or “Unknown company”), or
- **Relax Opportunity.accountId** to optional (schema change, every Opportunity query/UI must tolerate null).

Placeholder Companies are simpler for reporting (“all deals hang off an account”). Optional Company is truer to Decision 4 but more UI branches.

### Cursor recommendation

**Always create a Company at convert** when an Opportunity is created: use the known org name, else a person-named account (e.g. “Alex Rivera”). Lead.Company stays optional **before** convert. Avoid null `accountId` on Opportunity.

### Scott decision

- [x] APPROVE CURSOR RECOMMENDATION — Opportunity always has a Company; create one at convert if needed (person-named account allowed).
- [ ] ALLOW OPPORTUNITY WITHOUT COMPANY — Make accountId optional.
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVE CURSOR. On convert, create a person-named Company if needed, a default Contact, and an Opportunity. Manual Company/Contact linking can come later. Do not require staff to pick or create Company/Contact before conversion in Slice A. Do not make Opportunity.accountId optional.

---

## Decision 28 — Minimum Lead identity

### Repository says

No Lead. Contacts require first + last name; email/phone optional.

### ChatGPT recommendation

(Decision 2: “enough information to represent actionable interest” — not field-level.)

### Cursor assessment

Schema and the create form need a minimum. Too strict (require company + email + phone) undoes Decision 2. Too loose (name-only with no way to reach them) creates junk.

### Cursor recommendation

Require a **display name** (person or org) **and at least one** of: phone, email, or a note describing how to reach them. Company optional (Decision 4).

### Scott decision

**A Lead may be saved when it has:**

- [x] APPROVE CURSOR — Display name + at least one of phone / email / reachability note
- [ ] Name only
- [ ] Name + email required
- [ ] Name + phone required
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVE CURSOR. Minimum Lead identity is a display name plus at least one of phone, email, or a reachability note. Other fields remain optional. Do not over-specify required fields before implementation.

---

## Decision 29 — UI noun: Lead vs Prospect

### Repository says

C2A used Company (not Sales Account) to avoid D1 collision. Nav labels are user-facing. MA already occupies “Lead” as household — **in a different app**. Sales can still say Lead internally if Scott prefers; staff will not see both products in one shell.

### ChatGPT recommendation

Uses “Lead/prospect” interchangeably.

### Cursor assessment

Pick one nav word. **Lead** is the usual CRM noun and matches Decision 3. **Prospect** avoids MA vocabulary if that confusion matters to Scott. Schema table should be `sales_leads` either way (prefix already namespaces).

### Cursor recommendation

UI noun **Lead**. Table `sales_leads`.

### Scott decision

- [x] APPROVE CURSOR — UI noun Lead (`sales_leads`)
- [ ] UI noun Prospect (`sales_leads` table still)
- [ ] CHOOSE DIFFERENT DIRECTION — See Scott notes.

**Scott notes:**

> APPROVE CURSOR. UI noun is Lead. Persistence table/entity is `sales_leads`. This avoids collision with Martial Arts `leads` and matches existing Sales table naming.

---

## Deferred — Not authorized by this worksheet

None of the following is pulled into the next Sales refinement unless Scott explicitly promotes it in notes above.

| Item | Notes |
|---|---|
| C2 Control Plane product catalog | C2 unchanged; not started |
| D1 Product Instance schema | Accepted; not shipped; not required for local Sales depth |
| Control Plane Sales provisioning | No Docker/Sales image; not required |
| Beauty | C3 / later S10 |
| S7 / VPS | Official S-track; architecture: product family locally first |
| DNS / TLS / public hostnames | S8; product domain unset |
| Billing / Stripe | DEF-03 |
| Self-service signup | DEF-07 |
| SI migration / cutover | Decision 23 |
| QuickBooks | C2A exclusion; still out |
| Service-delivery / customer-success expansion | Decision 19 |
| Universal CRM abstraction / generic Lead in Core | D2 wait |
| Speculative Core promotion | Decision 22 observe-only |
| Public lead-capture forms | Decision 15 |
| Sales Campaign domain | Decision 14 |
| Proposal-generation subsystem | Decision 18 owner override: **approved for Slice B**, not authorized, not Slice A. Bound later so it does not become billing, accounting, e-sign, or a document platform.
| Final production deployment architecture | After VPS |

NEAR-04–10 remain open in [[SaaS-Open-Questions]] and **do not** block local Sales refinement.

If Scott believes one deferred item **must** be decided now:

- [x] None — leave the table deferred
- [ ] Promote one item into a new decision — name it in notes

**Scott notes:**

> None — leave the table deferred. Proposal generation is **not** promoted into Slice A. It is an approved Slice B product requirement (Decisions 18 and 26), still not authorized, still not a current Work Order.

---

## Scott approval summary

- [x] Decision 1 complete — next-phase objective
- [x] Decision 2 complete — when a prospect enters
- [x] Decision 3 complete — Sales-owned Lead
- [x] Decision 4 complete — Lead Company optional
- [x] Decision 5 complete — conversion
- [x] Decision 6 complete — pipeline stages (owner input)
- [x] Decision 7 complete — Won definition (owner input)
- [x] Decision 8 complete — Lost definition (owner input)
- [x] Decision 9 complete — follow-up queue
- [x] Decision 10 complete — notes/history
- [x] Decision 11 complete — record workspace
- [x] Decision 12 complete — primary sales record
- [x] Decision 13 complete — attribution
- [x] Decision 14 complete — no Campaigns
- [x] Decision 15 complete — no public capture in first slice
- [x] Decision 16 complete — offers (owner input)
- [x] Decision 17 complete — monetary value (owner input)
- [x] Decision 18 complete — proposals (owner input)
- [x] Decision 19 complete — Company lifecycle
- [x] Decision 20 complete — dashboard metrics
- [x] Decision 21 complete — ownership
- [x] Decision 22 complete — Core-promotion observe-only
- [x] Decision 23 complete — no SI migration
- [x] Decision 24 complete — no C2
- [x] Decision 25 complete — success definition
- [x] Decision 26 complete — Work Order size
- [x] Decision 27 complete — Opportunity vs Company
- [x] Decision 28 complete — Lead minimum fields
- [x] Decision 29 complete — UI noun
- [x] Deferred table reviewed

### Planning readiness

- [x] DECISIONS COMPLETE — Ready for ChatGPT/Cursor pre-development reconciliation.
- [ ] NOT READY — Additional owner discussion required.

**Decision completion does not authorize implementation.**

A separate authorized [[Work-Order-Protocol]] work order is required before product code may change.

Do **not** treat either box as “Cursor may now implement Sales refinement / C2 / D1 / SI migration.”
