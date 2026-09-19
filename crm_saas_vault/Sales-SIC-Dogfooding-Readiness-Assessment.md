---
type: note
status: current
area: domain
updated: 2026-09-19
aliases:
  - Sales dogfooding
  - SIC Sales readiness
tags:
  - saas
  - sales
  - dogfooding
---

# Sales — SIC Dogfooding Readiness Assessment

Investigation record from 2026-09-19. The gap tables below are **historical evidence** of what was missing at investigation time. They are not the live map.

**Authorized Minimum V1 shipped 2026-09-19** (work order [[wip/archive/WO-2026-09-19-sales-minimum-v1]], return [[history/WO-2026-09-19-sales-minimum-v1-return]]). Live map: [[Current-State]]. Locked decisions: [[SaaS-Decisions#2026-09-19 — Sales Minimum V1 locked decisions for SIC dogfooding]].

Related live notes: [[Current-State]], [[Platform-Architecture]], [[ADR-Product-Owned-Domains-Shared-Foundation]], [[Control-Plane]]. Official Sales slices C2A–B2 and C2 remain **Successful**. Sales Minimum V1 is **code-shipped** for SIC dogfooding; it is not a new platform milestone and is not owner-accepted Successful.

---

## Implementation status (2026-09-19)

Do not conclude from the investigation tables that these gaps remain open.

| ID | Investigation | Implemented |
|---|---|---|
| SALES-V1-001 | HIGH — complete + next missing | **SUCCESS** — complete with outcome/notes and schedule-next |
| SALES-V1-002 | HIGH — pipeline starts at proposal_quote | **SUCCESS** — Working → Proposal/Quote → Decision → Won/Lost |
| SALES-V1-003 | HIGH — lists hide next action / dollars | **SUCCESS** — opportunity list shows company, stage, $, MRR, next action |
| SALES-V1-004 | HIGH — overdue deep-link ignored | **SUCCESS** — `/activities?queue=overdue` (and other queues) initialize the filter |
| SALES-V1-005 | MEDIUM — Won leftover activities / no serve step | **SUCCESS** — prompt + default cancel; Won serve checklist only |
| SALES-V1-006 | HIGH if Lead-first | **SUCCESS** — Company-first outbound copy; Lead kept for inbound |
| SALES-V1-007 | MEDIUM — no website/phone/city | **SUCCESS** — optional website, phone, city, state |
| SALES-V1-009 | MEDIUM — no structured outcomes | **SUCCESS** — reached / no_answer / left_message / meeting_held / no_show / other |
| SALES-V1-013 | MEDIUM — demo as entity question | **SUCCESS** — demo is a Meeting activity (D6) |
| SALES-V1-019 | LOW — empty offer catalog | **SUCCESS** — seed Martial Arts CRM monthly $250 + Provisioning/Setup one-time $500 as editable Sales offers, not a platform catalog |

Deferred IDs (008, 010–012, 014–018, 020) remain deferred. Investigation executive summary below is **frozen as of the assessment**; current operating statement is in [[Current-State]].

---

---

## Executive Summary

**SIC cannot yet treat Sales as a comfortable primary daily CRM for selling the Martial Arts CRM, but the product is not empty.** Core records exist and the Example Academy walkthrough completed end-to-end: company, two contacts, source, opportunity, $250/month + $500 setup lines, outreach activities, notes, proposal issue/sent/accepted, Decision, Won. Won flipped the company from Prospect to Customer. Nothing then created a Control Plane customer, product instance, or provisioning request.

The standard used here:

> Can Scott use this product every day to organize and execute SIC's real sales effort for the Martial Arts CRM without immediately falling back to spreadsheets, notes, or another CRM because essential workflow is missing?

**Answer:** He *can* store the work if he is disciplined and starts at **Company + Contacts + Opportunity**, using **Activities** as the call list. He will feel friction immediately: the dashboard is reporting, not a worklist; opportunity stages start at Proposal/Quote; completing an outreach does not schedule the next attempt; lists hide next action, dollars, and lifecycle; the dashboard “Overdue” link does not apply the overdue filter. That is enough friction that a parallel spreadsheet of “who do I call next / where is this academy” is likely unless Minimum Sales V1 lands.

**Not ready** for dogfooding as the *primary* operating system. **Ready enough** that Minimum V1 is a small operational slice, not a rebuild and not a Salesforce clone.

| Priority | Count |
|---|---|
| BLOCKER | 0 |
| HIGH | 6 |
| MEDIUM | 8 |
| LOW | 6 |

Open product decisions requiring Scott before implementation: **8**.

A green test suite does not mean operational readiness. Sales tests passed. The gaps below are mostly **missing or thin workflow**, plus one **defect** (overdue deep-link).

---

## Repository / Version Assessed

| Item | Value |
|---|---|
| Repository | `crm_marketing_saas` (`Koifish95/crm_marketing_saas`) |
| Branch | `working` |
| HEAD at investigation start | `027dd55727974cf03c8c949517f6961cb9c08f3a` |
| Remote | `origin/working`, **ahead 6** (hosting-node work not pushed) |
| Working tree at start | Clean |
| Sales path | `sales_template/` (package `sales-crm`) |
| Local URL | http://localhost:5040 |
| SQLite | `file:./data/app.sqlite` (local leftover QA data present; not SI production) |
| Docker image | `crm-sales:c2` |
| Shared foundation | `@crm/core` (`packages/crm-core`) |
| Architecture law | Product-owned domains + shared foundation |
| Official Sales milestones | C2A, C2B Slice A, B1, B2, C2 **Successful** |
| Official S7 / C3 / Beauty | Not started; not assessed as next work |
| `renzo_crm` | Not touched |

Vault lockfile `authorization.active_work_order` is `null`. This investigation was authorized by Scott’s current chat, not a work order. Do not implement gaps from this note alone.

---

## What Sales Is Today

Sales is a **second product** that consumes `@crm/core` for staff login, RBAC, settings, nav, record workspace chrome, and sqlite bootstrap. It owns a **divergent B2B domain**: Lead (optional person) → Convert → Company (`sales_accounts`) + Contact + Opportunity, plus Activities, chronological History notes, Sources/Campaigns/Tracking Links, Offers, commercial lines (one-time + monthly MRR), and a Proposal revision chain with PDF.

It is **not** Martial Arts with the labels changed. It is **not** a Control Plane customer account. The company workspace copy states this explicitly: “Sales Accounts. This is not a Control Plane Customer Account.”

It is a **thin but real CRM**: CRUD + pipeline terminals + quoting, not a daily sales operating system. Public intake exists and defaults **off**. Provisioning Sales environments is a Control Plane capability (C2 + hosting node). That is infrastructure, not product readiness.

Seeded demo data is **Northwind Advisors**, not Strategic Insights. Local sqlite also contains leftover QA companies (C2A QA Company, Renzo Gracie Kaysville, SIC, Scott Coy). Treat that laptop db as disposable.

---

## Current Domain Model

```text
Lead (sales_leads)     optional pre-opportunity person
  displayName, email, phone, reachabilityNote
  stages: new → contacted → qualified → converted
  source / campaign / captured attribution
        │ Convert Lead (explicit)
        ▼
Company (sales_accounts)     Contact (sales_contacts, required company)
  name, notes, active        first/last, email, phone, title
  lifecycle: prospect | customer | former_customer
        │
        ▼
Opportunity (sales_opportunities)     required company
  stages: proposal_quote → decision → won | lost
  primaryContactId (optional)
  ownerUserId
  amountCents / mrrCents  (rolled up from lines)
  source / campaign attribution
  lossReason / lossNotes
  wonAt / lostAt
        │
        ├── Opportunity lines → Offer catalog (one_time | monthly)
        ├── Proposal (one chain per opportunity) → revisions
        ├── Activities (call/email/meeting/task/other)
        └── History notes (recordKind + recordId)
```

**Leads are not Martial Arts leads.** A Sales Lead is a pre-proposal person. Convert creates a company (from `intakeCompanyName` or the person’s display name), a contact, and an opportunity already at `proposal_quote`. The lead row is kept as `converted`.

**There is no separate “deal” vs “opportunity.”** Opportunity is the deal.

**There is no Control Plane / product-instance foreign key** on company or opportunity.

**Primary contact lives on the opportunity**, not on the company. Multiple contacts per company work.

---

## Existing Feature Inventory

Legend: **E2E** = usable in the running app for the SIC walkthrough. Thin = limited fields/UI, not fake.

| Area | UI | Backend | Persistence | Validation | Authorization | Tests | E2E | Notes |
|---|---|---|---|---|---|---|---|---|
| Company / account | Yes | Yes | Yes | Name required | VIEW/MANAGE_SALES | Yes | Yes | Name, notes, active, lifecycle only. No website, address, phone, owner, duplicate check. List shows Active, not lifecycle. |
| Contact | Yes | Yes | Yes | Company + names | Yes | Yes | Yes | Multiple per company. Title/email/phone. No lifecycle. No company-level primary. |
| Lead / prospect | Yes | Yes | Yes | Reachability required | Yes | Yes | Yes | Distinct person concept. Duplicate hint on **public intake only**. |
| Opportunity | Yes | Yes | Yes | Company + name | Yes | Yes | Yes | Starts at Proposal/Quote. No expected close, probability. Won/Lost/Reopen real. |
| Commercial lines / offers | Yes | Yes | Yes | Pricing type + cents | Yes | B1/B2 | Yes | `$250` monthly + `$500` one-time worked. Offer catalog empty until created. |
| Pipeline view | List only | Stage filter API | Stages enum | Stage enum | Yes | Yes | Awkward | No board, no $ on list, no next action. Create form Amount is one-time line helper. |
| Activities | Yes | Yes | Yes | Parent required | Yes | Yes | With friction | Queues exist. Complete does not create next. Opp-card list omits due dates. Create UI: lead or opportunity only. |
| History notes | Yes | Yes | Yes | Non-empty body | Yes | Yes | Yes | Timestamp shown. `authorUserId` stored, **not displayed**. |
| Demo / meeting | Meeting type | Same activities | Same | None for outcome | Yes | Thin | Workaround | No demo date-as-event, no-show, reschedule. |
| Proposal / offer tracking | Yes | Yes | Yes | Revision status machine | Yes | B2 | Yes | Draft → Issue → Mark sent (no email) → Accept/Decline. Accept does **not** auto-Won. PDF + signed upload. |
| Products / offerings | Offers | Yes | Yes | one_time/monthly | Yes | B1 | Yes | Not a platform product catalog. No link to Martial Arts instance. |
| Sources / acquisition | On lead/opp + Campaigns | Yes | Yes | Other requires detail | Yes | B1 | Yes | Seeded sources include Cold Outreach, Referral, Website, Event. Dashboard source table. Public intake off. |
| Dashboard | Yes | reporting.ts | Derived | Range preset | Yes | B1 | Decorative for daily work | Pipeline $, overdue count, period won/lost, source/campaign. Not a named worklist. |
| Reporting | Dashboard only | Same | Same | — | Yes | Thin | Thin | No dedicated reports page. Operational, not BI. |
| Won → customer | Lifecycle | markOpportunityWon | Company.lifecycle | Terminal until Reopen | Yes | Yes | Yes | Prospect → Customer only. |
| Won → Control Plane | No | No | No | — | — | No | Absent | Boundary is documented in UI copy; no implementation. |
| Auth / staff | Shared | @crm/core | users/RBAC | Password | ADMIN / VIEW_SALES / MANAGE_SALES | C1 | Yes | Login worked (`admin` / local password). |
| Docker / provision | CP | crm-sales:c2 | Volumes | Compose contract | — | c2/docker-contract | Infra only | Does not make the CRM ready. |

---

## Runtime Dogfooding Walkthrough

Ran Sales at http://localhost:5040. Logged in as `admin`. Created **Example Academy** (company id 6) and walked SIC’s scenario. Local sqlite already had leftover QA rows; new records below are the investigation’s.

| Step | Result | Classification |
|---|---|---|
| Identify prospect | No dedicated “prospect” object besides Company lifecycle `prospect` or Lead. Started at Company. | Workaround (recommended path) |
| Create company | Worked. Fields: name + notes. Website stuffed into notes. Copy warns this is not a CP customer. | Thin-but-working |
| Create contacts | Pat Owner and Morgan Manager on company 6. Title/email/phone. | Ready |
| Record source | Not on company. Set on opportunity: Cold Outreach + source detail “Outbound academy prospecting.” Captured attribution stored. | Usable with friction |
| Create opportunity | Required company. Default stage **Proposal / Quote**. Header later showed `$500.00 one-time · $250.00 MRR`. | Thin-but-working / stage friction |
| Record $250/mo + $500 setup | Created Offers (Martial Arts CRM monthly $250; Provisioning / setup one-time $500) then two opportunity lines. Rollup correct. | Ready |
| Initial outreach | Activity type `call`, due yesterday, notes “No response”, completed. | Usable with friction |
| Schedule next attempt | Completing did **not** prompt a next date. Created a second call due tomorrow. | Missing loop |
| Conversation | History note on opportunity. | Ready (free text) |
| Schedule demo | Activity type `meeting`, due next week. No demo object, no-show, or completed-vs-rescheduled. | Workaround |
| Complete demo | Not a first-class action. Would be Complete on the meeting. | Missing structure |
| Record notes | History on company and opportunity. Timestamps only; no author in UI. | Thin-but-working |
| Send/record offer | Draft proposal P-2026-0002. Issue snapshot `$500` + `$250` MRR. Mark sent (history: “No email was sent from the CRM”). Accept. | Ready for staff-recorded send |
| Follow-up / pipeline | Decision button. List is not a board. | Friction |
| Mark WON | Won. Company lifecycle **Customer**. History: accept did not auto-Won. Reopen available. Commercial lines still editable. Open activities still listed. | Thin-but-working then stop |
| What happens next | Nothing. No CP customer, instance, provisioning, commercial-terms handoff object. | Missing (serve boundary) |

Dashboard after Won (this month): Won 1, Won $500.00, MRR $250.00, win rate 100%, open pipeline MRR $0.00 (this deal left the open pipeline). Overdue count remained 1 (leftover QA plus filter issues below).

---

## SIC Sales Lifecycle Coverage

Reference lifecycle vs current Sales.

| Step | Classification | Why |
|---|---|---|
| Prospect identified | **USABLE WITH FRICTION** | Company (lifecycle Prospect) or Lead. Two paths. No firmographics. |
| Company / Contact | **READY** | Create/edit/search. Multiple contacts. Thin company record. |
| Initial outreach | **USABLE WITH FRICTION** | Call/email activities with due dates. No outcomes (reached / voicemail / no answer). |
| Repeated follow-up | **USABLE WITH FRICTION** | Manual new activities. Complete does not schedule next. Queues exist if you use the Activities page buttons. |
| Conversation | **READY** | History notes + activity notes. |
| Demo scheduled | **USABLE WITH FRICTION** | Meeting activity is adequate for V1 if Scott accepts it. No calendar. |
| Demo completed | **MISSING** structure; **NOT REQUIRED FOR V1** as a separate entity | Complete the meeting + a note. No-show is a note or lost reason later. |
| Proposal / offer | **READY** | Offers, lines, proposal revisions, PDF, mark sent, accept/decline. |
| Follow-up / negotiation | **USABLE WITH FRICTION** | Decision stage + activities + new proposal revision. |
| Decision WON / LOST | **READY** | Won/Lost/Reopen, structured loss reasons, wonAt/lostAt. |
| Customer / provisioning handoff | **MISSING** | Lifecycle Customer only. Control Plane remains a separate operator tool. |

---

## What Works Well

- Second product identity is clear and correctly isolated from Martial Arts and from Control Plane accounts.
- Company + multiple contacts is the right grain for an academy (owner + GM).
- Opportunity commercial model already matches SIC terms: monthly MRR + one-time setup via lines, not a fake single “amount.”
- Proposal chain is farther along than the rest of the daily workflow: issue snapshot, mark sent without pretending to email, accept without auto-Won, PDF, signed upload.
- Attribution exists (current + captured) with a useful seeded source list including Cold Outreach.
- Won/Lost/Reopen and loss reasons are real, tested, and visible.
- History is chronological and proposal actions write into it.
- VIEW_SALES / MANAGE_SALES and shared staff login work.
- Docker/provision contract for `crm-sales:c2` exists; not a product-readiness substitute.

---

## Where Friction Appears

- **Two front doors:** Lead (one person, no second contact until convert) vs Company (academy). Convert jumps straight to Proposal/Quote.
- **Pipeline is a quote pipeline**, not a pursuit pipeline. Discovery and demo have nowhere honest to sit except leftover `proposal_quote`.
- **Daily work is scattered.** Dashboard numbers; Activities queues; opportunity card activities without due dates; company “open activities” without due dates or complete.
- **Dashboard → `/activities?queue=overdue` does not apply the filter.** `activities/index.vue` initializes `queue` to `'open'` and ignores the query string. Defect.
- **Complete is a dead end.** No outcome, no “schedule next.”
- **Lists are directories, not worklists.** Companies: name + Active. Opportunities: name + company + stage label. No dollars, owner, next action, or close date.
- **Company cannot hold website/address/phone** except notes.
- After Won, **open follow-ups remain** and **lines remain editable**.

---

## Missing Capabilities

Absent on purpose of this product today (not hidden behind a flag):

- Expected close date / probability
- Dedicated demo/no-show/reschedule object
- Structured call outcomes
- Company duplicate merge
- Control Plane customer / product instance / provisioning request from Won
- Email/SMS send from the CRM (Mark Sent is staff-asserted)
- Calendar sync, sequences, dialer, e-sign, Stripe, quote automation engine

These are **not** automatically V1. See Minimum V1 vs Later vs Nonrequirements.

---

## Detailed Gap Analysis

### SALES-V1-001

| Field | Content |
|---|---|
| ID | SALES-V1-001 |
| Area | Activities / follow-up loop |
| Current State | Activities with types, dueAt, open/completed/cancelled, overdue/today/upcoming queues. Complete toggles status. Opportunity “Follow-up” box creates a task with **no due date**. |
| Required Outcome | Scott always knows the next attempt, can complete today’s work, and the next date is captured without a side list. |
| Gap | Complete does not create next. Opp/company activity lists omit due dates. Creating from the opportunity card cannot set type/due. |
| Evidence | `sales_activities`; `createActivity` / `updateActivity`; `opportunities/[id].vue` addActivity; runtime: completed “No response” then a separately created second call. |
| Dogfooding Impact | HIGH — this is the usual reason a CRM loses to a spreadsheet. |
| Proposed Minimum Solution | Require due date on open activities; Complete → optional “next attempt” due + type; show due + type on company/opportunity activity lists. |
| Priority | HIGH |
| Classification | SALE |
| Dependencies | SALES-V1-004 |

### SALES-V1-002

| Field | Content |
|---|---|
| ID | SALES-V1-002 |
| Area | Pipeline stages |
| Current State | `proposal_quote` → `decision` → `won` \| `lost`. Convert and manual create both start at proposal_quote. |
| Required Outcome | Active pursuits (outreach, conversation, demo) are distinguishable from “quote is out.” |
| Gap | No discovery/demo/negotiation stage. Early work either pollutes Proposal/Quote or lives only on Leads (one person). |
| Evidence | `shared/utils/pipeline.ts`; runtime header “Open · Proposal / Quote” immediately after create. |
| Dogfooding Impact | HIGH — Scott cannot answer “where is this academy” honestly. |
| Proposed Minimum Solution | After Scott picks stages (open decision): add 1–2 pre-quote stages **or** rename the first stage to a general Open/Active and keep quote state on the proposal. Do not copy Salesforce. |
| Priority | HIGH |
| Classification | SALE |
| Dependencies | Open decision “Opportunity stages” |

### SALES-V1-003

| Field | Content |
|---|---|
| ID | SALES-V1-003 |
| Area | Lists / daily scan |
| Current State | Company list: name + Active. Opportunity list: name, company, stage. No stage filter in UI (API supports stage). No next action, $, owner, lifecycle. |
| Required Outcome | From Companies or Opportunities, see who is a prospect, stage, value/MRR, and next due. |
| Gap | Directories, not an operating list. |
| Evidence | `companies/index.vue`, `opportunities/index.vue`; runtime company list “Active” only. |
| Dogfooding Impact | HIGH — forces extra clicks or a spreadsheet index. |
| Proposed Minimum Solution | Add lifecycle (companies), one-time + MRR, stage filter, next open activity due to opportunity rows. |
| Priority | HIGH |
| Classification | SALE |
| Dependencies | SALES-V1-001 |

### SALES-V1-004

| Field | Content |
|---|---|
| ID | SALES-V1-004 |
| Area | Dashboard / daily work |
| Current State | Pipeline $, overdue count, lead stage counts, period won/lost, source/campaign tables. Overdue tile links to `/activities?queue=overdue`. |
| Required Outcome | Opening Sales answers “what do I do today / what is overdue / which named deals are active.” |
| Gap | Dashboard is reporting. Named deals are absent. **Defect:** activities page ignores `?queue=`. |
| Evidence | `dashboard.vue`; `activities/index.vue` `queue = ref('open')`; runtime overdue URL still listed future demo 9/26 and no-due-date tasks. |
| Dogfooding Impact | HIGH |
| Proposed Minimum Solution | Honor `queue` query; add a short named overdue + due-today list and open opportunities with next due on the dashboard. Keep existing metrics. |
| Priority | HIGH |
| Classification | SALE |
| Dependencies | SALES-V1-001 |

### SALES-V1-005

| Field | Content |
|---|---|
| ID | SALES-V1-005 |
| Area | Won → serve handoff |
| Current State | Won sets `wonAt`, stage won, company lifecycle prospect→customer. No CP ids. |
| Required Outcome | After Won, Scott knows the next serve step (create CP customer / add Martial Arts instance / provision) without reinventing it in notes. |
| Gap | No handoff record, checklist, or link. |
| Evidence | `markOpportunityWon`; company keys after Won: id, name, notes, active, lifecycle, timestamps. Runtime: still on Sales opportunity. |
| Dogfooding Impact | HIGH for **serve**, not for recording the sale. Parallel Control Plane use is already the operator path. |
| Proposed Minimum Solution | Do **not** auto-provision. Add a Won checklist + pasteable CP reminder (customer name, product Martial Arts, $250 / $500). Optional later: link CP customer id. |
| Priority | HIGH |
| Classification | OPS |
| Dependencies | Open decision “Won → Control Plane” |

### SALES-V1-006

| Field | Content |
|---|---|
| ID | SALES-V1-006 |
| Area | Lead vs Company entry |
| Current State | Lead is a person; convert makes company+contact+opportunity at proposal. Company path skips Lead. |
| Required Outcome | SIC’s academy-shaped prospects (org + several people) have one obvious path. |
| Gap | Two models. Lead cannot hold Owner + GM. Convert names the company after the person unless `intakeCompanyName` is set. |
| Evidence | `convertLead`; `leads/index.vue` “Pre-opportunity commercial interest”; runtime skipped Lead successfully. |
| Dogfooding Impact | HIGH if Scott uses Leads for academies; LOW if he standardizes on Company-first. |
| Proposed Minimum Solution | Document Company-first for SIC outbound. Keep Lead for inbound `/inquire`. Do not merge domains. Optional: “create company from lead” naming default to intake company. |
| Priority | HIGH |
| Classification | SPEC |
| Dependencies | Open decision “Account vs lead” |

### SALES-V1-007

| Field | Content |
|---|---|
| ID | SALES-V1-007 |
| Area | Company firmographics |
| Current State | name, notes, active, lifecycle. |
| Required Outcome | Store website, phone, city/region without burying them in notes. |
| Gap | No website/address/phone on company. Letterhead website is SIC’s, not the prospect’s. |
| Evidence | `sales_accounts` schema; runtime company form. |
| Dogfooding Impact | MEDIUM — notes work; search/filter and proposal recipient quality suffer. |
| Proposed Minimum Solution | Add optional website, phone, city, state on company. Not a full address book. |
| Priority | MEDIUM |
| Classification | DATA |
| Dependencies | None |

### SALES-V1-008

| Field | Content |
|---|---|
| ID | SALES-V1-008 |
| Area | Opportunity close timing |
| Current State | No expected close, no probability. |
| Required Outcome | “What is likely to close soon?” |
| Gap | Cannot sort by close date. Dashboard cannot show closing-soon. |
| Evidence | Schema `sales_opportunities`; grep no expectedClose/probability. |
| Dogfooding Impact | MEDIUM — next activity date can substitute for a while. |
| Proposed Minimum Solution | Optional expectedClose date only. Skip probability for V1. |
| Priority | MEDIUM |
| Classification | SALE |
| Dependencies | Open decision “expected close” |

### SALES-V1-009

| Field | Content |
|---|---|
| ID | SALES-V1-009 |
| Area | Activity outcomes |
| Current State | Complete boolean + free-text notes. |
| Required Outcome | Distinguish no-answer vs conversation vs demo no-show without rereading prose. |
| Gap | No outcome enum. |
| Evidence | `updateActivity` completed flag; Martial Arts follow-up outcomes are a **different product domain**. |
| Dogfooding Impact | MEDIUM |
| Proposed Minimum Solution | Small outcome list on complete: reached, left_message, no_answer, meeting_held, no_show, other. Do not import MA household follow-up. |
| Priority | MEDIUM |
| Classification | SALE |
| Dependencies | Open decision “outreach outcomes”; SALES-V1-001 |

### SALES-V1-010

| Field | Content |
|---|---|
| ID | SALES-V1-010 |
| Area | History authors |
| Current State | `authorUserId` persisted; UI shows timestamp + body. |
| Required Outcome | See who wrote the note when more than Scott exists. |
| Gap | Author hidden. |
| Evidence | `SalesHistory.vue`; `createNote`. |
| Dogfooding Impact | LOW for solo SIC; MEDIUM later. |
| Proposed Minimum Solution | Show author display name. |
| Priority | MEDIUM |
| Classification | SALE |
| Dependencies | None |

### SALES-V1-011

| Field | Content |
|---|---|
| ID | SALES-V1-011 |
| Area | Duplicates |
| Current State | Public intake may flag `possibleDuplicateLeadId`. Companies have no unique name. Contacts no unique email. |
| Required Outcome | Avoid two Example Academy rows. |
| Gap | No company/contact duplicate warning on staff create. |
| Evidence | `public-intake.ts`; companies POST. Runtime allowed Example Academy beside leftover QA names. |
| Dogfooding Impact | MEDIUM as volume grows; LOW at SIC’s current volume. |
| Proposed Minimum Solution | Warn on case-insensitive company name match. No merge engine. |
| Priority | MEDIUM |
| Classification | DATA |
| Dependencies | None |

### SALES-V1-012

| Field | Content |
|---|---|
| ID | SALES-V1-012 |
| Area | Activity parents |
| Current State | API allows account/contact/opportunity/lead. Activities page create: lead **or** opportunity only. |
| Required Outcome | Log a call against a contact/company from the queue page. |
| Gap | UI narrower than API. |
| Evidence | `createActivitySchema`; `activities/index.vue`. |
| Dogfooding Impact | MEDIUM |
| Proposed Minimum Solution | Add company + contact selects on Activities create; keep parent required. |
| Priority | MEDIUM |
| Classification | SALE |
| Dependencies | None |

### SALES-V1-013

| Field | Content |
|---|---|
| ID | SALES-V1-013 |
| Area | Terminal opportunity hygiene |
| Current State | Won/Lost disable stage buttons; Reopen exists. Lines still edit/remove. Open activities remain. |
| Required Outcome | Won deal is historically stable; leftover tasks do not look like today’s work. |
| Gap | Stale open activities after Won (runtime: demo + second outreach still open on Customer company). |
| Evidence | Opportunity page after Won; company open activities. |
| Dogfooding Impact | MEDIUM — pollutes the queue. |
| Proposed Minimum Solution | On Won/Lost, cancel or prompt to complete open activities. Freeze lines unless Reopen. |
| Priority | MEDIUM |
| Classification | SALE |
| Dependencies | Open decision “close leftover activities” |

### SALES-V1-014

| Field | Content |
|---|---|
| ID | SALES-V1-014 |
| Area | Demo workflow |
| Current State | `meeting` activity. |
| Required Outcome | Demo scheduled / completed / no-show / rescheduled. |
| Gap | No dedicated concept. Meeting is enough if outcomes exist (009) and due dates show (001). |
| Evidence | `ACTIVITY_TYPES`; runtime meeting “Schedule product demo.” |
| Dogfooding Impact | LOW–MEDIUM. Not a separate blocker. |
| Proposed Minimum Solution | Keep meeting activities for V1. Revisit dedicated demo only if Scott rejects the workaround. |
| Priority | MEDIUM |
| Classification | SPEC |
| Dependencies | Open decision “dedicated demo”; SALES-V1-009 |

### SALES-V1-015

| Field | Content |
|---|---|
| ID | SALES-V1-015 |
| Area | Products vs platform catalog |
| Current State | Sales Offers are quoting defaults, not Control Plane `productId`. |
| Required Outcome | Opportunity can say “Martial Arts CRM” at $250 / $500. |
| Gap | No link from offer → platform product. Not required to quote. |
| Evidence | `sales_offers`; CP catalog is `martial-arts` \| `sales`. |
| Dogfooding Impact | LOW for quoting; HIGH only if auto-provision is desired (it should not be, yet). |
| Proposed Minimum Solution | Keep Offers. Seed Martial Arts CRM + setup in SIC’s instance when dogfooding starts. Do not build a cross-product catalog. |
| Priority | LOW |
| Classification | SPEC |
| Dependencies | SALES-V1-005 |

### SALES-V1-016

| Field | Content |
|---|---|
| ID | SALES-V1-016 |
| Area | Forecasting |
| Current State | Open pipeline one-time + MRR sums; no weights. |
| Required Outcome | Not required for SIC’s volume. |
| Gap | No probability. |
| Evidence | `salesDashboard`. |
| Dogfooding Impact | LOW |
| Proposed Minimum Solution | Do not build. |
| Priority | LOW |
| Classification | SALE |
| Dependencies | None |

### SALES-V1-017

| Field | Content |
|---|---|
| ID | SALES-V1-017 |
| Area | Company primary contact |
| Current State | Primary contact is per opportunity. |
| Required Outcome | Optional company default contact. |
| Gap | Must set primary on each opportunity. |
| Evidence | `salesOpportunities.primaryContactId`. |
| Dogfooding Impact | LOW |
| Proposed Minimum Solution | Later: default opportunity primary from last-used company contact. |
| Priority | LOW |
| Classification | SALE |
| Dependencies | None |

### SALES-V1-018

| Field | Content |
|---|---|
| ID | SALES-V1-018 |
| Area | Inbound acquisition |
| Current State | Campaigns, tracking links, `/inquire` default off. |
| Required Outcome | SIC outbound does not need public intake to start. |
| Gap | Campaigns unused in the walkthrough; dashboard shows empty campaign performance. |
| Evidence | `sales.public_intake`; campaigns index. |
| Dogfooding Impact | LOW / not required |
| Proposed Minimum Solution | Leave off. Do not port Martial Arts campaign architecture. |
| Priority | LOW |
| Classification | CUST |
| Dependencies | None |

### SALES-V1-019

| Field | Content |
|---|---|
| ID | SALES-V1-019 |
| Area | Offer seed |
| Current State | Seed does not create Offers. Investigation created them in UI/API. |
| Required Outcome | SIC instance has Martial Arts CRM $250 + setup $500 ready. |
| Gap | Empty catalog on fresh db. |
| Evidence | `drizzle/seed.ts` (Northwind, no offers). |
| Dogfooding Impact | LOW (one-time setup) |
| Proposed Minimum Solution | Seed or first-run offers in the SIC Sales environment, not a platform-wide product SKU service. |
| Priority | LOW |
| Classification | OPS |
| Dependencies | None |

### SALES-V1-020

| Field | Content |
|---|---|
| ID | SALES-V1-020 |
| Area | Kanban |
| Current State | List + stage buttons on the record. |
| Required Outcome | Not required at SIC volume. |
| Gap | No board. |
| Evidence | `opportunities/index.vue`. |
| Dogfooding Impact | LOW |
| Proposed Minimum Solution | Do not build before dogfooding. |
| Priority | LOW |
| Classification | SALE |
| Dependencies | SALES-V1-002 |

**BLOCKER count: 0** under the stated definition: prospects, opportunities, next actions, history, and deal status can all be represented. The HIGH gaps are why it will still feel like a side system unless V1 lands.

---

## Proposed Minimum Sales V1

Smallest change set that makes this defensible:

> SIC can use Sales as its primary internal CRM while prospecting, pursuing, and closing customers for the Martial Arts CRM.

1. **Company-first operating path** (docs + UI copy; no Lead deletion). SIC outbound: Company → Contacts → Opportunity. Lead remains inbound.
2. **Next-action loop** (SALES-V1-001, 003, 004): due dates visible; complete-and-schedule-next; lists show next due; dashboard named overdue/due-today; fix overdue query defect.
3. **Honest pipeline** (SALES-V1-002, Scott’s stage decision): at least distinguish pre-quote pursuit from quote-out/decision.
4. **Company website/phone/city** (SALES-V1-007) so notes are not the directory.
5. **Won hygiene + serve checklist** (SALES-V1-013, 005): clear leftover activities; show “next: create/provision in Control Plane” without auto-provisioning.
6. **Seed Martial Arts CRM + setup offers** in the SIC Sales environment (SALES-V1-019).

That is still a Sales-owned domain. It is not promoting CRM objects into `@crm/core`.

---

## Later Improvements

- Structured activity outcomes (009)
- Optional expected close date (008)
- History authors (010)
- Duplicate name warning (011)
- Activity create: company/contact parents (012)
- Company default primary contact (017)
- Link Won opportunity to a Control Plane customer id after Scott decides
- Kanban (020) only after stages settle
- Probability / weighted forecast (016)

---

## Explicit Nonrequirements

Do **not** build these before dogfooding. They would delay Sell → Serve → Learn.

- Automated email/SMS sequences, Gmail/Outlook sync, dialer, AI prospecting
- Calendar synchronization (staff-recorded demo datetime is enough)
- Browser e-sign, Stripe, PDF quote designer beyond existing proposal PDFs
- Auto-provision on Won
- Workflow automation engine, custom objects, enterprise BI
- Recreating Martial Arts household follow-up, trials, or campaign engine inside Sales
- Promoting Sales domain into `@crm/core` / a Core migrator / package rename
- Beauty, C3, official S7, live DNS/TLS — unrelated

---

## Martial Arts Reuse Opportunities

Architecture law: products own domains; `@crm/core` is shared foundation. Do not resurrect Core-owned Lead/Opportunity.

| Pattern | Recommendation |
|---|---|
| Auth, RBAC, settings, nav, record workspace, sqlite, App* UI, env banner | **Shared foundation (already)** |
| Overdue / due-today / upcoming bucketing | **Shared foundation candidate** (date helpers only). Sales already has `queue.ts`. Do not move Sales activities into Core. |
| Chronological notes | **Sales-specific adaptation**. MA lead workspace is household/trial shaped. |
| Follow-up tasks with call outcomes | **Do not share.** MA follow-up is household intro/event consolidation (`follow-up.ts`). Sales needs B2B attempt/next-date. Same *idea*, different semantics. |
| Campaigns / tracking / public intake | **Do not share.** Sales already has its own B1 acquisition. MA campaigns feed gym intros. |
| Offers vs MA programs/memberships | **Do not share.** |
| Proposal PDF | Sales-owned; no MA equivalent to copy. |

---

## Customer Conversion / Control Plane Handoff

**Boundary today**

```text
Sales Company (lifecycle customer)
        ✖ no FK
Control Plane Customer account
        → Product instance (martial-arts | sales)
        → Environments / provision (crm-sales:c2 or martial-arts-acquisition:s4)
```

Won means “staff asserts signed agreement / SOW.” It is not invoice, payment, kickoff, or provision. Proposal Accepted is also not Won.

**What SIC must do manually after Won:** open Control Plane, create or reuse the customer account, Add product instance Martial Arts, provision, store hostnames. Commercial terms ($250 / $500) live on the Sales opportunity lines / accepted proposal snapshot only.

**Recommendation:** keep the boundary. Add an in-app checklist. Do not auto-create CP rows until SIC has done this by hand a few times (Learn before Automate).

---

## External Commercial Fit

If Minimum V1 closed, Sales would fit a **small B2B seller** who:

- sells a handful of offers (subscription + setup) to organizations with a few contacts;
- runs outbound + simple inbound;
- needs a proposal PDF and a short pipeline;
- does **not** need a sales team OS, marketing automation, or CPMS.

It would **not** yet be a general Sales CRM product for a multi-rep team, channel partners, or complex CPQ. Internal SIC dogfooding is the correct next customer. Strategic Insights as an *external* Sales-product tenant remains unmigrated and is a later question.

No pricing recommendation. Existing vault notes do not require one to understand the product.

---

## Recommended Implementation Order

Do not start without a work order after Scott reviews the open decisions.

1. Fix overdue query + dashboard named worklist + list columns (004, 003) — fastest daily-use win, includes a defect.
2. Complete → next attempt + due dates on record activity lists (001).
3. Stage model per Scott’s decision (002).
4. Company website/phone/city (007).
5. Won activity hygiene + serve checklist (013, 005).
6. Seed SIC offers (019).
7. Stop. Dogfood. Then outcomes / expected close / CP link.

---

## Open Product Decisions for Scott

### D1 — Account vs Lead for SIC outbound

1. **Question:** Should SIC’s academy prospects start as Companies, Leads, or both?
2. **Why it matters:** Lead cannot hold Owner + GM; convert starts an opportunity at Proposal/Quote.
3. **Current:** Both exist. Convert uses intake company name or person name.
4. **Options:** (a) Company-first for outbound, Lead for inbound; (b) Lead-first then convert; (c) collapse Lead into Company.
5. **Recommended:** (a).
6. **Consequences:** Copy/nav emphasis; no schema merge; avoids Core-like unification.

### D2 — Opportunity stages

1. **Question:** What stages does SIC actually use before quote?
2. **Why it matters:** Today everything pre-decision is Proposal/Quote.
3. **Current:** `proposal_quote`, `decision`, `won`, `lost`.
4. **Options:** (a) add `working` / `demo`; (b) rename first stage to `active` and use proposal status for quote-out; (c) keep as-is and live on activities.
5. **Recommended:** (b) or a single added `working` stage. Avoid a long Salesforce-style board.
6. **Consequences:** Migration of existing `proposal_quote` rows; list/dashboard labels.

### D3 — Setup fee + MRR representation

1. **Question:** Is two lines (monthly offer + one-time setup) the lasting model?
2. **Why it matters:** Already works for $250 + $500.
3. **Current:** `one_time` and `monthly` lines; opportunity rollup.
4. **Options:** (a) keep lines; (b) first-class fields setupCents + mrrCents; (c) bundles.
5. **Recommended:** (a).
6. **Consequences:** None for V1; seed those two offers.

### D4 — Won → Control Plane customer

1. **Question:** Should Won create or link a Control Plane customer / Martial Arts instance?
2. **Why it matters:** Serve vs Sell; irreversible automation risk.
3. **Current:** Lifecycle customer only.
4. **Options:** (a) checklist only; (b) store optional CP ids; (c) auto-create account+instance.
5. **Recommended:** (a) now; (b) after a few real wins; never (c) in V1.
6. **Consequences:** Avoids coupling Sales sqlite to CP; matches Sell → Serve → Learn.

### D5 — Outreach outcomes

1. **Question:** Must complete capture a structured result?
2. **Why it matters:** Next-attempt quality vs extra UI.
3. **Current:** Notes only.
4. **Options:** (a) notes-only; (b) small enum; (c) MA-style follow-up tasks.
5. **Recommended:** (a) in the first V1 slice if next-date exists; (b) immediately after dogfood pain; never (c).
6. **Consequences:** Enum + complete modal.

### D6 — Dedicated demo concept

1. **Question:** Is a meeting activity enough?
2. **Why it matters:** Extra entity vs adequate workaround.
3. **Current:** `meeting` type.
4. **Options:** (a) meeting + notes; (b) demo fields on activity; (c) demo entity.
5. **Recommended:** (a) for V1.
6. **Consequences:** Avoids calendar/product scope.

### D7 — Product catalog

1. **Question:** Do opportunities need a platform product pick (Martial Arts vs Sales)?
2. **Why it matters:** Handoff vs quoting.
3. **Current:** Offers are Sales-local.
4. **Options:** (a) Offers only; (b) optional `intendedProductId`; (c) full catalog service.
5. **Recommended:** (a) + (b) only when D4 moves past checklist.
6. **Consequences:** Keep product-owned quoting.

### D8 — Close leftover activities on Won/Lost

1. **Question:** Auto-cancel open activities when the deal terminates?
2. **Why it matters:** Queue pollution (observed on Example Academy after Won).
3. **Current:** Left open.
4. **Options:** (a) prompt; (b) auto-cancel; (c) leave open.
5. **Recommended:** (a) or (b) auto-cancel with history note.
6. **Consequences:** Small service change; test Won/Lost.

---

## Evidence / Tests Performed

### Automated (sales_template)

| Command | Result |
|---|---|
| `pnpm test` | **Pass** — 8 files, 41 tests |
| `pnpm lint` | **Pass** (exit 0) |
| `pnpm typecheck` | **Pass** (exit 0) |
| `pnpm build` | **Pass** — Nuxt/Nitro production build |

Test files: `tests/domain/schema.test.ts`, `tests/domain/sales.test.ts`, `tests/b1/b1.test.ts`, `tests/b2/b2.test.ts`, `tests/c1/architecture.test.ts`, `tests/c1/registration.test.ts`, `tests/c1/port.test.ts`, `tests/c2/docker-contract.test.ts`.

`packages/crm-core` has **no** dedicated test tree. Shared-foundation isolation is asserted by `sales_template/tests/c1/architecture.test.ts` (Core does not import Sales/MA; Sales does not import MA). Those tests ran inside `pnpm test`.

### Runtime QA

- Health/dev server: http://localhost:5040 (`pnpm dev`)
- Login: staff sign-in → `/dashboard`
- Created Example Academy, two contacts, two offers, opportunity 8, activities, notes, proposal P-2026-0002 issued/sent/accepted, Decision, Won
- Verified company lifecycle Customer; no CP fields
- Observed dashboard metrics and Activities queue defect on `?queue=overdue`

### Distinction cheat-sheet

| Kind | Examples |
|---|---|
| Defect | Activities page ignores `?queue=` so Dashboard overdue is wrong |
| Missing feature | CP handoff, expected close, activity outcomes, company website |
| Thin-but-working | Company record, activity complete, opportunity list, history without author |
| Product decision | Stages, Lead vs Company, auto-Won/CP, dedicated demo |
| UX friction | Dual nav, follow-up box without due date, stale tasks after Won |

Green tests ≠ dogfooding-ready. Thin ≠ broken.

---

## Git state at assessment write

Investigation started at `027dd55727974cf03c8c949517f6961cb9c08f3a` on `working`, clean, ahead of `origin/working` by 6. Expected repository change for this task: this note plus a [[Home]] index link. No product implementation. No commit unless Scott asks. Do not push.
