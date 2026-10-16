---
type: note
status: draft
area: process
updated: 2026-09-11
aliases:
  - Pre-development worksheet
  - Sales architecture decisions
tags:
  - wip
  - saas
  - decisions
---

# Pre-Development Product Architecture Decision Worksheet

WIP communication. **Not** the project map. **Not** a work order. Checking boxes records Scott’s decisions. It does **not** authorize implementation. Cursor may write Sales (or any other product) code only after a separate active [[Work-Order-Protocol]] work order, or Scott’s explicit ask in that later chat.

Do not promote answers from this file into [[SaaS-Decisions]] or ADRs until Scott has completed the checkboxes and a follow-up work order (or Scott) says to promote.

---

## 1. Header / status

| Field | Value |
|---|---|
| Date | 2026-09-11 |
| Repository | `Koifish95/crm_marketing_saas` (`C:\Users\Scoy9\Projects\crm_marketing_saas`) |
| Branch | `working` |
| HEAD SHA at write | `49edcf2` (`49edcf2a96b86bef49e1e93e470879d97eb8f774`) |
| Lockfile `head_at_write` | `584b837` in [[project-state.yaml]] — **lags HEAD** (see reconciliation) |
| S-track | S0–S6 **Successful**. S7–S11 **not started** |
| C-track | C1 **code-shipped**. C2 / C3 **not started**. D1–D4 **accepted**; D1 schema **not shipped** |
| Implementation authorization | **None.** `authorization.active_work_order: null` |
| Purpose | Shared decision surface for Scott, ChatGPT, and Cursor before the next development phase |
| This document | **Decision / discovery only** |

Working tree at write time: the vault project-state protocol files (canonical set, `history/`, repo-root `AGENTS.md`) are **present locally and not all committed**. Git on `working` at `49edcf2` is the recorded SHA. Durable intent of those notes is used here; do not treat uncommitted files as already on `origin`.

---

## 2. Repository reconciliation

Inspected: [[Current-State]], [[project-state.yaml]], [[SaaS-Milestones]], [[SaaS-Decisions]], [[ADR-CRM-Core-Vertical-Architecture]], [[Platform-Architecture]], [[Control-Plane]], [[Customer-Environment]], [[SaaS-Open-Questions]], [[Work-Order-Protocol]], `packages/crm-core`, `martial_arts_template` Core imports, `control_plane/server/database/schema.ts`, `pnpm-workspace.yaml`.

### ChatGPT’s architecture sketch — verified

```text
CRM Core
   ↑
   ├── Martial Arts
   ├── Sales / Software
   └── Beauty
```

| ChatGPT claim | Git |
|---|---|
| Core is shared infrastructure, not a sellable Generic CRM | **Confirmed.** [[ADR-CRM-Core-Vertical-Architecture]]. Core schema is users / types / roles / access-rights / security events / `app_settings` only. |
| C1 is code-shipped | **Confirmed.** `packages/crm-core` (`@crm/core`). Evidence: [[history/C1_CRM_Core_Architecture_Return]]. |
| Martial Arts consumes Core | **Confirmed.** `martial_arts_template` depends on `workspace:*` and imports brand, health, app-env, auth/users/RBAC, settings, nav, shell. |
| Sales is intended as the second Core consumer | **Confirmed.** D1–D4 decision; C-track C2. **Not started.** |
| Sales before Beauty so Sales can challenge Core | **Confirmed.** ADR sequence. C3 not started. |
| S7 / VPS deferred while local product family is established | **Confirmed as architecture priority.** Official S-track still lists S7 next and was **not** rewritten. |
| No new implementation authorized | **Confirmed.** |

### What is currently implemented

- Official S0–S6 **Successful** (laptop fleet, provision, lifecycle).
- C1: pnpm workspace members `packages/crm-core` + `martial_arts_template`. Thin Nuxt Core layer. ESLint + `martial_arts_template/tests/c1/architecture.test.ts` (Core must not import MA / sales / beauty).
- Core capabilities actually extracted: brand, health, app-env, auth/users/RBAC **framework**, settings KV, shell / nav / settings / permission **registration**, record-workspace helper, password policy.
- Martial Arts remains the full gym CRM (households `leads` + `lead_lines`, trials, `/trial`, campaigns, events, marketing). Drizzle journal `0000`–`0020` stays in MA.
- Control plane: `customers` + `environments` only. `industry_template` always written `martial-arts`. Provision builds `martial-arts-acquisition:s4`. Not in the pnpm workspace.

### What is accepted architecture (not fully shipped)

- Target: Customer Account → Product Instance (exactly one vertical) → Environments. [[Customer-Environment]], D1.
- Vertical → Core only. Diverge first; abstract after two real implementations. D2–D4 wait on MA leads / campaigns / public capture.
- Intended image names `crm-martial-arts` / `crm-sales` / `crm-beauty` are **target**. Current tags `:s2` / `:s4`.
- Product family locally before production VPS.

### What is merely planned

- Sales vertical, Beauty vertical, C2 (as currently worded: Sales **plus** CP product catalog), C3, D1 CP schema, Map B rewrite around Core, `martial_arts_template` → `apps/`.

### What is explicitly not started

- Sales app, Beauty app, C2, C3, S7–S11, D1 schema, DNS/TLS, VPS, billing, self-service, plugin framework, generic public capture.

### What implementation is currently authorized

**None.**

### Stale or contradictory documentation (flagged, not repaired)

- [[ADR-CRM-Core-Vertical-Architecture]] banner: C1 shipped. Sections 2 and 4 still describe the **pre-C1** tree (no workspace, no Core). Historical context, easy to misread.
- [[SaaS-Milestones]] **C2** = “Sales vertical as second Core consumer **+ CP product catalog**.” ChatGPT’s first slice is a thin Sales consumer **without** catalog. Same ID, two meanings.
- [[SaaS-Open-Questions]] DEF-01: “Sales is C2 when authorized.” Same overload.
- Do not conflate: **Sales vertical** (C-track) vs **S9 dogfood** (owner CRM to sell the SaaS) vs **Strategic Insights on MA** (S4 laptop proof; NEAR-09: disposable, MA is not a long-term fit).
- [[project-state.yaml]] `head_at_write: "584b837"` ≠ HEAD `49edcf2`. Protocol notes exist in the working tree and are not all committed.

---

# Decisions

Recommended / default choices are listed first so Scott can approve by checking one box.

---

## Decision 1 — Next product objective

Should **Sales CRM / Sales-Software** become the next product objective after the current C1/Core state?

### Repository says

Accepted sequence: Core → Martial Arts → **Sales as second consumer** → prove shared abstractions → Beauty → then production VPS. [[SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain]]. C2 is not started and not authorized. Beauty is C3 / later S10. Official S7 is not started; architecture law defers VPS.

### ChatGPT recommendation

**Yes.** Do not authorize development yet. Use Sales as the next product objective. Beauty remains later. S7/VPS remains deferred.

### Cursor assessment

**AGREE.** Git already chose this order. “Next product objective” ≠ “start coding.”

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [x] APPROVE — Use Sales CRM / Sales-Software as the next product objective. Beauty later. S7/VPS deferred. No implementation authorized by this box.
- [ ] REJECT
- [ ] MODIFY — See Scott notes below.

**Scott notes:**

>

---

## Decision 2 — Repository readiness before Sales development

Is C1/Core + Martial Arts ready to begin designing/building the Sales consumer, or is another Core/Martial-Arts extraction slice required first?

### Repository says

C1 shipped frameworks only. Core has **no** CRM entities (no leads, opportunities, accounts). MA still owns journal `0000`–`0020` and re-exports several Core services. Control plane provision is Martial Arts-only. Architecture test covers Core ↛ MA/sales/beauty. No Sales package exists. Full coupling inventory is **not** a durable note; only C1 closeout + code.

### ChatGPT recommendation

**Do not guess. Perform a dedicated read-only repository architecture audit before authorizing Sales development.** The audit should determine what Core contains, what MA consumes, remaining coupling, workspace/build/migration constraints, architecture-test coverage, what Sales can consume immediately, and whether another extraction step is technically necessary before Sales.

### Cursor assessment

**AGREE WITH QUALIFICATION.**

A skim of `packages/crm-core` is already enough to say: **another C1-style extraction is not a prerequisite** for a thin Sales app that consumes the same frameworks. Remaining MA/Core coupling (shared journal in MA, re-exports, CP `martial-arts` hard-wire) does not block a local Sales `pnpm dev`.

A **read-only audit work order** is still the right *next formal activity* before Sales **code**, so coupling is catalogued rather than discovered mid-build. That audit is investigation, not a second Core rewrite.

### Cursor recommendation

Approve ChatGPT’s audit as the next **pre-development** work order. Reject “extract more into Core before Sales exists.” Do not treat this worksheet as that audit.

### Scott decision

- [x] APPROVE — Next formal activity is a **read-only architecture-audit work order** (separate from this file). Do **not** extract more Core first. Do **not** start Sales code from this worksheet.
- [ ] APPROVE CHATGPT ONLY — Audit required; do not take Cursor’s “extraction not required” qualification until the audit finishes.
- [ ] REJECT AUDIT — Proceed to product definition / a later implementation work order without a dedicated audit.
- [ ] REQUIRE ANOTHER CORE EXTRACTION SLICE BEFORE SALES — See notes.
- [ ] MODIFY — See Scott notes below.

**Scott notes:**

>

---

## Decision 3 — Define the Sales product before schema/code

Should we define the minimum viable **Sales CRM product domain and workflow** before designing its database schema or beginning implementation?

### Repository says

D2: Sales builds its own contact/opportunity model; do not promote MA `leads` into Core. D3–D4: campaigns and public capture stay MA until Sales states requirements. ADR: do not copy/fork MA per industry. No Sales domain note exists yet.

### ChatGPT recommendation

**Yes.** Define what the Sales product actually does before building tables. Do not copy Martial Arts and rename concepts.

### Cursor assessment

**AGREE.** Schema-first from MA would recreate household/trial as fake sales objects.

### Cursor recommendation

Same as ChatGPT. Decisions 5–6 are the first cut of that definition, still not schema.

### Scott decision

- [x] APPROVE — Define Sales domain and workflow before schema or implementation.
- [ ] REJECT — Schema/code may start without a written product definition.
- [ ] MODIFY — See Scott notes below.

**Scott notes:**

>

---

## Decision 4 — Sales versus Core ownership rule

When building Sales, should new Sales capabilities default to **Sales ownership** until cross-product evidence proves they belong in Core?

### Repository says

Promotion default is **No until justified**. When uncertain, keep it vertical. Temporary duplication preferred to premature Core. D2–D4 already forbid moving MA leads / campaigns / `/trial` into Core because Sales might need something similar. [[ADR-CRM-Core-Vertical-Architecture]].

### ChatGPT recommendation

**Yes.**

```text
When uncertain → vertical-owned
Demonstrated shared behavior → candidate for Core
```

Do not move Martial Arts `leads`, household workflow, campaigns, acquisition events, `/trial`, or other MA concepts into Core merely because Sales needs something conceptually similar.

### Cursor assessment

**AGREE.** This is already accepted law. The worksheet is confirmation, not a new ADR.

### Cursor recommendation

Same as ChatGPT.

### Scott decision

- [x] APPROVE — New Sales capabilities default to Sales-owned. Duplicate temporarily rather than promote MA concepts into Core.
- [ ] REJECT
- [ ] MODIFY — See Scott notes below.

**Scott notes:**

>

---

## Decision 5 — Minimum Sales domain

What minimum domain should the first Sales product contain?

ChatGPT candidates (suggestions, not settled; names **provisional**):

- Organizations / Accounts
- Contacts
- Opportunities
- Pipeline / Stages
- Activities / Tasks

### Repository says

No Sales schema. D2: Sales contact/opportunity model; eventual Core name need not be `Lead`. D1 **Customer Account** is a **platform** commercial entity, not a Sales CRM company record. MA `leads` = household header — do not reuse that name for Sales.

### ChatGPT recommendation

Use the candidate list as a starting point for Scott to accept/reject per capability. Do not design the final schema yet.

### Cursor assessment

**AGREE WITH QUALIFICATION.** The five capabilities are a reasonable first CRM slice. **Do not** call the company record “Customer Account” (D1 collision). Prefer Sales-owned language such as **Company** or **Sales Account**. Do not use `Lead`, household, Trial, or Campaign as the first Sales nouns. “Activities / Tasks” must not be MA `FollowUpTask`.

### Cursor recommendation

Approve the five as **provisional in-scope concepts**, with Company/Sales Account instead of a platform “Organization/Account” that collides with D1. Exclude MA nouns.

### Scott decision

Include in the first Sales product (provisional names):

- [ ] Company / Sales Account *(Cursor preferred name; not D1 Customer Account)*
- [ ] Organizations / Accounts *(ChatGPT wording; only if Scott accepts the D1 name collision)*
- [ ] Contacts
- [ ] Opportunities
- [ ] Pipeline / Stages
- [ ] Activities / Tasks *(Sales-owned; not MA FollowUpTask)*
- [ ] Other — see notes

Exclude from the first slice:

- [ ] Household / `leads` / Trial / `/trial`
- [ ] Campaigns / acquisition events
- [ ] Billing / Stripe
- [ ] Other exclusions — see notes

- [x] APPROVE CURSOR NAMING — Company / Sales Account + Contacts + Opportunities + Pipeline/Stages + Activities/Tasks.
- [ ] APPROVE CHATGPT LIST AS-IS — Organizations/Accounts + Contacts + Opportunities + Pipeline/Stages + Activities/Tasks.
- [ ] CHOOSE DIFFERENT DIRECTION — See notes.

**Scott notes:**

>

---

## Decision 6 — Sales workflow / funnel

What business workflow should the first Sales CRM support?

### Repository says

No Sales workflow exists. MA funnel (marketing → intro `/trial` → household follow-up → join) is **not** a sales methodology and must not be copied. D4: no generic public-capture framework yet. S9 dogfood (tracking link → form → Lead) is a **later S-track** idea, not this vertical’s v1 requirement.

### ChatGPT recommendation

**Decide the workflow before schema.** Candidate:

```text
Prospect / Account
→ Contact
→ Opportunity
→ Pipeline progression
→ Activity / follow-up
→ Won / Lost
```

Labeled as a proposal, not assumed generic SaaS law.

### Cursor assessment

**AGREE WITH QUALIFICATION.** “Prospect / Account” doubles Account. A smaller loop:

```text
Company / Sales Account
→ Contact(s)
→ Opportunity
→ Pipeline stages
→ Activity / follow-up
→ Won / Lost
```

No public booking, no campaigns, no household in v1. Stage names are **not** designed here.

### Cursor recommendation

Approve the Cursor loop as the first workflow to react to. Treat ChatGPT’s “Prospect” as optional, not a separate required entity.

### Scott decision

Include these stages in v1:

- [ ] Company / Sales Account as the commercial object
- [ ] Prospect as a separate stage/entity *(ChatGPT; optional)*
- [ ] Contact(s) on the account
- [ ] Opportunity
- [ ] Pipeline stages (names later)
- [ ] Activity / follow-up
- [ ] Won / Lost
- [ ] Public capture form *(not recommended for v1)*
- [ ] Campaigns *(not recommended for v1)*
- [ ] Other — see notes

- [x] APPROVE CURSOR WORKFLOW — Account → Contact(s) → Opportunity → stages → Activity → Won/Lost.
- [ ] APPROVE CHATGPT WORKFLOW — including Prospect / Account as written.
- [ ] CHOOSE DIFFERENT DIRECTION — See notes.

**Scott notes:**

>

---

## Decision 7 — Existing Core consumption

Should Sales initially consume only capabilities **already** extracted into Core, rather than triggering speculative Core expansion before Sales exists?

### Repository says

C1 extracted frameworks, not CRM domain. MA consumes those frameworks and still owns gym domain. D2–D4 wait for a second implementation before promotion.

**Immediately consumable by a future Sales app (classification only):**

| Capability | Where |
|---|---|
| Nuxt layer / `@crm/core` workspace package | `packages/crm-core` |
| Brand | `shared/utils/brand` |
| Health body | `shared/utils/health` |
| App-env | `shared/utils/app-env` |
| Auth, users, RBAC **framework** | Core server services + schema tables listed above |
| Settings KV | `app_settings` + settings registry |
| Shell / nav / settings / permission **registration** | `nav`, `settings-registry`, `permission-catalog`, `core-shell` |
| Record-workspace URL helper | `shared/utils/record-workspace` |
| Import bans | Core ESLint; MA `tests/c1/architecture.test.ts` |

**Not in Core today:** leads, trials, campaigns, events, public capture, compensation, Meta, CP provision, product catalog.

### ChatGPT recommendation

**Yes.** Sales should provide evidence that tells us what Core needs next. Do not expand Core based solely on predictions about Sales.

### Cursor assessment

**AGREE.** Speculative Core “generic Party/Lead” would violate D2.

### Cursor recommendation

Same as ChatGPT. First Sales slice consumes the table above. New Sales tables stay in Sales.

### Scott decision

- [x] APPROVE — Sales v1 consumes only already-extracted Core capabilities. No speculative Core expansion.
- [ ] REJECT — Allow predicted Core expansion before Sales exists.
- [ ] MODIFY — See Scott notes below.

**Scott notes:**

>

---

## Decision 8 — D1 Product Instance / Control Plane timing

Must Account → Product Instance → Vertical → Environment be implemented in the Control Plane **before** the first Sales product can be developed locally?

### Repository says

D1 is **accepted** and **not shipped**. CP schema is still `customers` + `environments`. Provision always writes `martial-arts` and `martial-arts-acquisition:s4`. [[Control-Plane]]. Martial Arts itself ran locally (`pnpm dev` / template Docker) before S3/S4 provisioned it. A second vertical can do the same.

D1 becomes blocking when **one commercial account** must own a Martial Arts instance **and** a Sales instance on the control plane, or when operators must provision Sales from Customers → New.

### ChatGPT recommendation

**Probably no.** Develop and prove Sales locally first unless repository constraints show Product Instance work is a prerequisite. Implement D1 when independent product provisioning actually requires it.

### Cursor assessment

**AGREE.** No repository constraint requires D1 before a local Sales app. CP cannot provision Sales today; that is an argument **against** waiting on D1, not for it.

### Cursor recommendation

Same as ChatGPT. First Sales slice is **not** CP-provisioned (see Decision 9 and 13).

### Scott decision

- [x] APPROVE CHATGPT / CURSOR — D1 is **not** a prerequisite for local Sales development. Implement D1 when multi-product provision needs it.
- [ ] REJECT — D1 CP schema must ship before any Sales app work.
- [ ] MODIFY — See Scott notes below.

**Scott notes:**

>

---

## Decision 9 — First Sales development success criteria

What should qualify the **first authorized** Sales development slice as successful?

### Repository says

C1 bar: separate Core package, MA consumes it, Core ↛ vertical, MA tests green, `martial_arts_template/` not moved to `apps/`, CP still MA-only, image tags unchanged. Successful ≠ code exists; owner acceptance is separate. C2 as written also mentions CP product catalog — that is **broader** than ChatGPT’s first slice.

### ChatGPT recommendation

Prove architecture, not full CRM parity:

- Sales exists as a genuinely separate product/build.
- Sales consumes CRM Core.
- Core does not import Sales.
- Sales does not import Martial Arts.
- Sales contains at least one meaningful Sales-owned capability.
- Martial Arts continues to build/test successfully.
- Architecture dependency tests remain green.
- Sales can be started locally.
- Existing Core behavior used by Sales is demonstrated.
- No Beauty, S7/VPS, DNS/TLS, billing, or self-service work leaks into the slice.

### Cursor assessment

**AGREE**, plus repository-specific gates so the slice cannot quietly become C2-as-currently-worded or a folder-layout rewrite.

### Cursor recommendation

Approve ChatGPT’s list and the extra criteria below. This is **future** success criteria for a **future** work order. Checking these boxes does not start that work order.

### Scott decision

ChatGPT criteria (check to include in the first-slice bar):

- [ ] Sales exists as a genuinely separate product/build
- [ ] Sales consumes CRM Core
- [ ] Core does not import Sales
- [ ] Sales does not import Martial Arts
- [ ] Sales contains at least one meaningful Sales-owned capability
- [ ] Martial Arts continues to build/test successfully
- [ ] Architecture dependency tests remain green
- [ ] Sales can be started locally
- [ ] Existing Core behavior used by Sales is demonstrated
- [ ] No Beauty, S7/VPS, DNS/TLS, billing, or self-service in the slice

Cursor additions (check to include):

- [ ] No D1 Control Plane schema rewrite
- [ ] Control plane does **not** provision Sales in this slice
- [ ] `martial_arts_template/` is **not** moved to `apps/`
- [ ] Image tag cutover to `crm-sales` is **not** required
- [ ] This slice is **not** marked official S-track Successful
- [ ] This slice is **not** automatically C2 as currently defined (Sales + CP catalog)

- [ ] APPROVE CHATGPT LIST ONLY
- [x] APPROVE CHATGPT LIST + CURSOR ADDITIONS
- [ ] CHOOSE DIFFERENT DIRECTION — See notes.

**Scott notes:**

>

---

## Decision 10 — What follows the first Sales slice

After the first Sales implementation exists, should the next architecture step be an explicit **comparison** of Martial Arts and Sales to decide which duplicated concepts deserve Core promotion?

### Repository says

Diverge first; abstract after demonstrated commonality. C2 on the roadmap currently **bundles** “Sales vertical + CP product catalog” and is **not authorized**. Promotion checklist lives in the ADR, not as an automatic refactor backlog.

### ChatGPT recommendation

**Yes.**

```text
Build small Sales consumer
→ compare Martial Arts vs Sales
→ identify demonstrated commonality
→ decide Core promotions
→ authorize C2 only from evidence
```

Do not treat C2 as an automatic refactor backlog.

### Cursor assessment

**AGREE WITH QUALIFICATION.** The comparison sequence is correct. **Do not** treat today’s C2 ID as that first Sales slice **or** as an automatic follow-on that includes CP catalog. Authorize catalog and promotions separately from evidence.

### Cursor recommendation

Approve the comparison sequence. Record that C2’s current wording is overloaded (Decision 12).

### Scott decision

- [x] APPROVE CHATGPT SEQUENCE — Compare MA vs Sales after the first slice; Core promotions and C2 only from evidence.
- [x] APPROVE CURSOR QUALIFICATION TOO — Do **not** auto-start C2 as “Sales + CP product catalog.”
- [ ] REJECT — After first Sales slice, immediately treat C2 (including CP catalog) as next implementation.
- [ ] CHOOSE DIFFERENT DIRECTION — See notes.

**Scott notes:**

>

---

# Additional Decisions Cursor Believes Are Required Before Development

ChatGPT did not list these. They materially shape the next phase. Same rule: boxes here do **not** authorize code.

---

## Decision 11 — Sales vertical vs S9 dogfood vs Strategic Insights

Is the next product a **new Sales vertical**, or is it “use MA / SI to sell the SaaS” (S9), or “convert SI to Sales”?

### Repository says

First intended **pilots**: Strategic Insights (laptop-provisioned MA, disposable) and sister business (Beauty, not provisioned). NEAR-09: do not treat SI as a real operating CRM; MA is not a long-term fit. S9 Successful is owner CRM + CP + tracking-link follow-up as a **SaaS prospect** — S-track, not C2. C-track Sales is a **vertical product** for sales/software businesses.

### ChatGPT position

`NOT YET PROVIDED` (implied Sales = Sales/Software vertical, not S9).

### Cursor assessment

**AGREE** with the implication; it must be explicit or SI/S9 will leak into the first slice.

### Cursor recommendation

Sales = **new vertical product**. SI stays disposable MA until a later explicit choice. S9 dogfood stays S-track.

### Scott decision

- [ ] APPROVE CURSOR — Sales is a new vertical. SI stays disposable MA. S9 is not this work.
- [x] USE SI AS THE FIRST SALES CUSTOMER / MIGRATION TARGET
- [ ] TREAT S9 DOGFOOD AS THE SALES PRODUCT OBJECTIVE
- [ ] CHOOSE DIFFERENT DIRECTION — See notes.

**Scott notes:**

>

---

## Decision 12 — First Sales slice ID vs C2

Should the first thin Sales consumer use the existing **C2** ID (which currently includes CP product catalog)?

### Repository says

Never reuse an ID for a new meaning (dual-S5 lesson). [[SaaS-Milestones]] C2 today: “Sales vertical as second Core consumer + CP product catalog.” ChatGPT’s first slice omits catalog.

### ChatGPT position

`NOT YET PROVIDED` (uses “first Sales slice” and says authorize C2 only from evidence).

### Cursor assessment

**AGREE** that C2 should not auto-fire. The ID must be split or redefined **before** any implementation work order names `C2`.

### Cursor recommendation

Do **not** call the first slice C2 until Scott picks: new ID (e.g. keep C2 = catalog+promotions) **or** redefine C2 later in [[SaaS-Milestones]] **after** this worksheet, as a durable decision — not in this file as law.

### Scott decision

- [x] APPROVE CURSOR — First thin Sales consumer is **not** C2 as currently worded. Assign/redefine IDs in a later durable note / work order. Do not implement either.
- [ ] REDEFINE C2 NOW TO MEAN ONLY THE THIN SALES CONSUMER — *(durable edit still requires a later authorized docs work order)*
- [ ] KEEP C2 AS SALES + CP CATALOG and put the thin slice under a **new** C-track ID
- [ ] CHOOSE DIFFERENT DIRECTION — See notes.

**Scott notes:**

>

---

## Decision 13 — Local runtime shape (high level)

How should the first Sales slice exist in this repository, without designing folders/ports/images yet?

### Repository says

Workspace: `packages/crm-core` + `martial_arts_template` only. `control_plane/` is out. MA was not moved to `apps/`. Local MA: `:5030` / Docker `:5000/:5010/:5020`. ADR deferred exact folder/tooling; architectural requirement is a **separate deployable product**.

### ChatGPT position

`NOT YET PROVIDED` (separate product/build, start locally).

### Cursor assessment

**AGREE** at high level. Folder names, ports, and image tags belong in the **audit** work order, not here.

### Cursor recommendation

First Sales slice = **separate product app in this repo’s pnpm workspace**, startable locally, **not** CP-provisioned, **not** blocked on renaming MA to `apps/`. Exact path/port/image: audit.

### Scott decision

- [x] APPROVE CURSOR — Separate workspace app; local start; not CP-provisioned; not waiting on `apps/` rename. Path/port/image deferred to audit.
- [ ] REQUIRE APPS/ MOVE OF MARTIAL ARTS BEFORE SALES
- [ ] REQUIRE CONTROL-PLANE PROVISION OF SALES IN THE FIRST SLICE
- [ ] CHOOSE DIFFERENT DIRECTION — See notes.

**Scott notes:**

>

---

## Deferred — Do Not Decide Yet

None of the following is required before the next **pre-development** step (this worksheet → likely a read-only audit work order). Cursor does **not** pull any of these into scope.

| Item | Notes |
|---|---|
| Beauty product details | C3 / S10. After Sales proves Core. |
| Beauty schema | Same. |
| Production VPS provider | Official S7. Architecture: product family locally first. |
| S7 implementation | Not started. Not authorized. |
| DNS / TLS | Official S8. Product domain unset (IMM-04). |
| Product domain | Unset. Do not invent. |
| Public customer hostnames | S8. |
| Stripe / billing implementation | DEF-03. Not required for launch. |
| Self-service signup | DEF-07. Do not design. |
| Universal plugin framework | ADR forbids speculative plugins. |
| Generic public-capture framework | D4 wait. |
| Final universal CRM domain terminology | D2: name need not be `Lead`. After two implementations. |
| Cross-product migration | D1: future explicit process. |
| Long-term multi-product account UX | D1 not shipped. |
| Production migration/cutover | After VPS. |

NEAR-04–10 (CP auth, credential delivery, audit log, DNS, published ports, SI dogfood definition, async provision) remain open in [[SaaS-Open-Questions]] and **do not** block a local Sales app.

If Scott believes one deferred item **must** be decided now:

- [x] None — leave the table deferred
- [ ] Promote one item into a new decision — name it in notes

**Scott notes:**

>

---

## Scott Approval Summary

- [x] Decision 1 complete — next product objective
- [x] Decision 2 complete — audit vs more Core extraction
- [x] Decision 3 complete — product before schema
- [x] Decision 4 complete — vertical-owned default
- [x] Decision 5 complete — minimum domain
- [x] Decision 6 complete — workflow
- [x] Decision 7 complete — consume existing Core only
- [x] Decision 8 complete — D1 timing
- [x] Decision 9 complete — first-slice success criteria
- [x] Decision 10 complete — compare after first slice
- [x] Decision 11 complete — Sales vs S9 vs SI
- [x] Decision 12 complete — slice ID vs C2
- [x] Decision 13 complete — local runtime shape
- [x] All blocking decisions complete

### Development authorization

These boxes authorize **planning**, not product implementation.

- [x] DECISIONS COMPLETE — Planning may proceed to the next **pre-development** step (expected: a **read-only architecture-audit** [[Work-Order-Protocol]] work order, then a **separate** implementation work order if Scott wants Sales code).
- [ ] NOT READY — Additional discussion required.

Do **not** treat either box as “Cursor may now implement Sales / C2 / D1 / S7.”

Implementation requires a new file in `wip/` with `type: work-order`, `authorized: yes`, `status: active`, or an explicit Scott ask in a **later** chat that names that work-order ID.
