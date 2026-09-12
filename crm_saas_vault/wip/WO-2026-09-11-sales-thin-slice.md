---

type: work-order
status: active
authorized: yes
id: WO-2026-09-11-sales-thin-slice
milestone: C2A
area: sales
branch: working
---------------

# C2A — Thin Sales Consumer

## Authorization

This Work Order authorizes implementation of the **first thin Sales CRM consumer of `@crm/core`**.

Scott has completed the pre-development product decisions.

The Sales pre-development architecture audit concluded:

**READY FOR SALES IMPLEMENTATION WORK ORDER**

No technical blocker or unresolved owner decision prevents this slice from beginning.

This Work Order is the implementation boundary.

Do not infer authorization for adjacent work.

---

# Objective

Create the first independently runnable **Sales CRM vertical** as the second real consumer of CRM Core.

The slice must prove:

```text
CRM Core
   ↑
   ├── Martial Arts
   └── Sales
```

while implementing enough genuine Sales-owned functionality to establish that Sales is a real vertical rather than an empty architecture demonstration.

The initial domain is:

```text
Company / Sales Account
→ Contact(s)
→ Opportunity
→ Pipeline stage
→ Activity / follow-up
→ Won / Lost
```

Strategic Insights is the first real-world design/customer target.

Do **not** migrate or cut over Strategic Insights in this Work Order.

---

# Repository authority

Repository:

`Koifish95/crm_marketing_saas`

Branch:

`working`

Before implementation:

1. Fetch/pull current `working`.
2. Record HEAD SHA.
3. Read the canonical bootstrap/project-state files under `crm_saas_vault/`.
4. Read:

   * `crm_saas_vault/wip/Pre_Development_Product_Architecture_Decision_Worksheet.md`
   * `crm_saas_vault/wip/WO-2026-09-11-sales-predev-audit-return.md`
   * current C1/Core architecture documentation
   * current Work Order protocol
5. Inspect current implementation before assuming paths or APIs from this Work Order remain exact.

Git on `working` wins over historical prompts, ChatGPT memory, old handoffs, or stale WIP assumptions.

If current Git materially contradicts this Work Order, stop and document the conflict rather than improvising around it.

---

# Milestone identity

Create a new durable C-track milestone:

**C2A — Thin Sales consumer**

C2A means:

> First local Sales CRM vertical consuming CRM Core, with Sales-owned CRM domain and no Control Plane product catalog.

Do **not** change or redefine existing C2.

Existing C2 retains its historical meaning, including its Control Plane product-catalog scope.

Update the appropriate durable milestone/current-state documentation to introduce C2A according to current vault conventions.

C2A should begin as authorized/in-progress and end this Work Order as **code-shipped** if acceptance criteria pass.

Do not mark it Successful without Scott's acceptance.

---

# Architecture rules

The required dependency shape is:

```text
Sales → Core
Martial Arts → Core

Core ↛ Sales
Core ↛ Martial Arts

Sales ↛ Martial Arts
Martial Arts ↛ Sales
```

Sales is a vertical product.

Core is shared infrastructure.

Sales-owned CRM entities must remain in Sales.

Do not create generic Core CRM entities merely because Martial Arts and Sales contain conceptually similar functionality.

Use the existing architecture rule:

```text
When uncertain → vertical-owned
Demonstrated shared behavior → candidate for Core
```

Temporary duplication is preferable to premature abstraction.

---

# Application shape

Create:

`sales_template/`

at repository root.

Do not move `martial_arts_template/`.

The Sales application should be a new pnpm workspace member.

Recommended package:

`sales-crm`

with:

`private: true`

Add `sales_template` to `pnpm-workspace.yaml`.

Sales must consume:

`@crm/core`

through the existing workspace package.

Use the current Martial Arts application as evidence for integration patterns, but **do not clone Martial Arts wholesale**.

Do not import Martial Arts code.

---

# Nuxt / application integration

Sales should have its own Nuxt application configuration.

Expected pattern:

* extend `@crm/core`
* use required Nuxt modules already proven by C1
* use `nuxt-auth-utils`
* use existing Tailwind integration pattern where necessary
* own Sales CSS/theme entrypoint
* own runtime configuration
* own Sales registration code

Create Sales-owned shell registration, conceptually:

`lib/register-sales-shell.ts`

Use existing Core registration mechanisms for:

* navigation
* settings
* permissions
* shell integration

Do not register Martial Arts navigation/settings/permissions.

---

# Branding

Core currently contains Martial-Arts-flavored defaults.

Do not refactor those defaults in this slice.

Override them from Sales configuration/environment.

The Sales app should identify itself as a Sales CRM rather than Martial Arts.

Use appropriate environment/runtime overrides such as the existing Core brand mechanism.

Do not undertake a general Core branding refactor.

---

# Local runtime

Preferred Sales development port:

**5040**

Do not bind:

* 3000
* 5000
* 5010
* 5020
* 5030

If 5040 is unavailable, use an appropriate nearby fallback and document the deviation.

The Sales application must be independently startable locally.

Docker is **not required** for C2A.

Do not build Control Plane provisioning for Sales.

---

# Database ownership

Sales owns its own database.

Preferred development database:

`sales_template/data/app.sqlite`

Follow current SQLite + Drizzle patterns.

Do not share the Martial Arts database.

Do not copy the Martial Arts Drizzle migration journal.

Create:

`sales_template/drizzle/migrations/`

with a fresh Sales journal beginning at Sales migration `0000`.

Sales schema should:

1. consume/import the appropriate Core framework table definitions;
2. define Sales-owned CRM tables separately;
3. create the complete database required by the Sales vertical.

Core continues to own framework schema contracts.

Sales owns Sales CRM domain schema.

Do not create a Core migration journal as part of this Work Order.

---

# Sales domain

Implement the minimum useful Sales domain.

## Company / Sales Account

Implement a Sales-owned commercial organization record.

Use terminology that avoids collision with D1 platform-level Customer Account.

UI may display:

**Company**

or:

**Sales Account**

Choose the clearest implementation terminology and document the decision.

Minimum capability:

* create
* view
* edit
* list/search as appropriate
* basic active/status handling where necessary

Do not create a platform Customer Account relationship.

---

# Contacts

Contacts belong to the Sales vertical.

A Company/Sales Account can have multiple Contacts.

Implement enough fields to support a real sales workflow without attempting a universal contact-management schema.

Minimum useful information should include appropriate identity/contact information such as:

* name
* email
* phone
* relationship to Company/Sales Account where appropriate

Do not reuse Martial Arts household/member tables.

---

# Opportunities

Implement Sales-owned Opportunities.

An Opportunity should belong to the appropriate Company/Sales Account and support association with Contacts where the design reasonably requires it.

Minimum functionality:

* create
* view
* edit
* list
* pipeline/status representation
* Won
* Lost

Do not invent a large enterprise opportunity model.

---

# Pipeline / stages

Final Strategic Insights business-stage terminology remains deferred.

Implement a **small provisional pipeline** sufficient to prove workflow and architecture.

It must support:

* an active/open opportunity state
* progression between provisional stages
* Won
* Lost

Keep stage implementation extensible enough that actual SI business terminology can be decided later.

Do not create an elaborate configurable sales-methodology engine unless the existing architecture makes a minimal implementation trivial.

Document provisional stage names in the return.

---

# Activities / follow-up

Implement Sales-owned Activities/Tasks.

This is **not** Martial Arts `FollowUpTask`.

Activities should support useful follow-up against Sales records, particularly Opportunities and/or Contacts.

Minimum capability should support:

* activity/task description
* relevant relationship
* status/completion
* due date where appropriate
* basic list/display

Keep this intentionally small.

---

# Strategic Insights design target

Use Strategic Insights as the first real-world product-design target.

C2A should leave us with a Sales CRM that could plausibly become Strategic Insights' operating CRM after later refinement.

However:

**Do not migrate Strategic Insights in this Work Order.**

Do not:

* alter existing SI Martial Arts environments
* import SI production/customer data
* perform cutover
* delete disposable SI Martial Arts instances
* implement SI-specific invoicing
* implement SI-specific proposals
* implement SI-specific retainers
* implement QuickBooks integration
* resolve SI timezone unless required for local development

If development exposes an SI-specific requirement that materially affects the architecture, document it in the return as:

`OWNER INPUT REQUIRED BEFORE SI MIGRATION`

Do not expand C2A automatically.

---

# Authentication

Consume existing Core authentication services.

Sales owns the thin application/API integration required to expose them.

The audit established that Core does **not** currently provide complete login API routes/pages.

Create the minimum Sales-owned authentication surface necessary to prove Core consumption.

Do not copy Martial Arts re-export barrels merely for convenience.

Prefer direct imports from documented `@crm/core` exports.

Follow existing credential/session security rules.

Do not commit passwords.

---

# Users / RBAC

Consume Core:

* users
* user types
* roles
* role assignments
* access-right framework
* security functionality

Create Sales-owned access-right codes appropriate to the new Sales domain.

At minimum, permissions should mechanically protect the Sales functionality introduced in C2A.

Do not reuse Martial Arts-specific permissions such as marketing permissions unless they genuinely belong to Sales, which is not expected in this slice.

Use existing:

`seedAccessFramework(...)`

or current equivalent.

---

# Core shell

Demonstrate that the Sales product consumes the Core shell/framework.

Core-provided functionality should remain available as appropriate, including existing framework areas such as:

* Dashboard
* Users
* Security
* Settings

Sales then registers its own domain navigation.

Expected Sales navigation should represent the implemented domain, such as:

* Companies / Accounts
* Contacts
* Opportunities
* Activities

Do not copy Martial Arts:

* Leads
* Trials
* Follow-up
* Marketing
* Events

---

# Core staff pages / thin vertical pages

The audit established that several actual staff pages remain vertical-owned.

Create the minimum Sales-owned pages necessary to expose Core framework functionality and Sales functionality.

Do not interpret this duplication as authorization to extract those pages into Core during C2A.

If Martial Arts and Sales demonstrate genuine duplicate implementations, document them as **future Core-promotion candidates** in the return.

Do not promote them now.

---

# Demo/dev data

Create only enough development/demo data to exercise the workflow.

Suggested demo shape:

* 1 Company/Sales Account
* 2 Contacts
* 1 open Opportunity
* 1 Activity

Do not use actual Strategic Insights production/customer data.

Do not commit secrets or sensitive information.

---

# Architecture enforcement

Strengthen architecture tests so the repository mechanically proves:

```text
Core ↛ Martial Arts
Core ↛ Sales
Sales ↛ Martial Arts
Martial Arts ↛ Sales
Sales → Core allowed
Martial Arts → Core allowed
```

The audit found that the current `/sales/` path check would not necessarily catch:

`sales_template/`

Correct this.

Use the smallest approach consistent with current C1 testing conventions.

Do not perform a broad testing-framework migration.

Sales should have its own relevant architecture/registration/domain tests.

Existing Martial Arts C1 tests must remain green.

---

# Testing requirements

Before C2A can be considered code-shipped, run appropriate verification for **both** products.

At minimum:

## Sales

Run:

* tests
* lint
* typecheck
* production build
* database/migration setup verification
* architecture tests
* relevant CRUD/domain tests

Verify local Sales startup on port 5040 or documented fallback.

Verify:

* authentication/session
* Core shell
* Sales navigation
* Company/Sales Account workflow
* Contacts
* Opportunities
* pipeline transition
* Activities
* Won/Lost

## Martial Arts

Run existing:

* tests
* lint
* typecheck
* production build

Specifically verify C1 architecture/registration tests remain green.

Do not accept Sales success if Martial Arts is broken.

---

# Acceptance criteria

C2A is **code-shipped** only when all applicable criteria pass:

* [ ] `sales_template/` exists as an independent pnpm workspace package
* [ ] package is appropriately named, preferably `sales-crm`
* [ ] Sales builds independently
* [ ] Sales consumes `@crm/core`
* [ ] Sales demonstrates Core login/session behavior
* [ ] Sales demonstrates Core shell/framework behavior
* [ ] Core does not import Sales
* [ ] Core does not import Martial Arts
* [ ] Sales does not import Martial Arts
* [ ] Martial Arts does not import Sales
* [ ] Sales has its own SQLite database
* [ ] Sales has a fresh Drizzle migration journal
* [ ] Martial Arts migrations were not copied into Sales
* [ ] no gym-specific CRM schema/nouns were promoted into Sales
* [ ] Company/Sales Account functionality exists
* [ ] Contact functionality exists
* [ ] Opportunity functionality exists
* [ ] provisional pipeline/stage functionality exists
* [ ] Won/Lost exists
* [ ] Sales-owned Activity/Task functionality exists
* [ ] Sales permissions protect relevant functionality
* [ ] Sales can start locally
* [ ] preferred port 5040 is used or deviation documented
* [ ] Sales tests pass
* [ ] Sales lint passes
* [ ] Sales typecheck passes
* [ ] Sales production build passes
* [ ] Sales architecture tests pass
* [ ] Martial Arts tests pass
* [ ] Martial Arts lint passes
* [ ] Martial Arts typecheck passes
* [ ] Martial Arts production build passes
* [ ] existing C1 architecture/registration tests remain green
* [ ] no speculative Core CRM expansion occurred
* [ ] no D1 Control Plane schema implementation occurred
* [ ] no Control Plane Sales provisioning occurred
* [ ] no CP product catalog was implemented
* [ ] existing C2 was not redefined
* [ ] Martial Arts was not moved into `apps/`
* [ ] no production Sales image/tag cutover was required
* [ ] no Beauty implementation occurred
* [ ] no S7/VPS work occurred
* [ ] no DNS/TLS work occurred
* [ ] no billing/Stripe work occurred
* [ ] no self-service implementation occurred
* [ ] no Strategic Insights migration/cutover occurred
* [ ] no S9 dogfood implementation occurred

---

# Explicit exclusions

C2A does **not** authorize:

* existing C2
* Control Plane product catalog
* D1 Product Instance schema
* Sales provisioning through Control Plane
* Beauty
* S7
* VPS
* remote nodes
* DNS
* TLS
* public product hostnames
* billing
* Stripe
* self-service signup
* universal plugin architecture
* generic public capture
* Sales marketing campaigns
* Martial Arts campaign extraction
* generic Lead entity in Core
* Core CRM-domain expansion
* MA → `apps/` migration
* production image-tag cutover
* Strategic Insights data migration
* Strategic Insights environment cutover
* QuickBooks integration
* SI proposal system
* SI invoicing
* SI retainer management
* final universal CRM terminology
* final pipeline business-stage terminology
* official S-track success declarations

If one of these becomes technically necessary, **STOP** and document the blocker.

Do not silently expand scope.

---

# Commit discipline

Follow current repository and Work Order protocol.

Use logical commits rather than one uncontrolled final dump.

At meaningful checkpoints:

1. run relevant tests;
2. inspect the diff;
3. ensure no scope leakage;
4. commit with a descriptive message.

Do not mark C2A Successful merely because code is committed.

Code-shipped and owner-accepted remain separate states.

---

# Durable documentation

As implementation proceeds, update the canonical project state required by current repository protocol.

At minimum, ensure durable truth records:

* C2A exists as a new milestone
* C2 remains unchanged
* C2A scope
* C2A implementation status
* Sales application path
* Sales package identity
* Sales local runtime/port
* Sales database ownership
* Sales → Core dependency
* no CP provisioning yet
* Strategic Insights is the first intended Sales customer/migration target but has not been migrated
* relevant architecture deviations discovered during implementation

Do not promote speculative future design into durable truth.

---

# Required return/results document

Create a thorough Markdown return document according to current vault/WIP conventions.

Suggested conceptual identity:

`WO-2026-09-11-sales-thin-slice-return.md`

The return must include:

## Executive result

One of:

* `C2A CODE-SHIPPED — READY FOR OWNER ACCEPTANCE`
* `PARTIAL — OWNER/ARCHITECTURE DECISION REQUIRED`
* `FAILED — BLOCKER`

## Git state

* starting SHA
* ending SHA
* branch
* commits created

## Implementation summary

What was actually built.

## Repository structure

Document Sales files/package/runtime.

## Domain model

Document actual implemented:

* Company/Sales Account
* Contacts
* Opportunities
* stages
* Activities
* Won/Lost

## Core consumption

Document exactly what Sales consumes from `@crm/core`.

## Database/migrations

Document:

* database path
* migration path
* journal
* Core table integration
* Sales tables

## Authentication/RBAC

Document actual implementation.

## Architecture enforcement

Document tests/rules proving dependency boundaries.

## UI/workflow

Explain how an operator actually uses the Sales product.

## Strategic Insights fit

State what C2A now supports for SI.

List anything still required before SI migration as:

`OWNER INPUT REQUIRED BEFORE SI MIGRATION`

## Tests/results

Include every verification command and result.

Do not merely say "tests passed."

Record:

* command
* working directory
* result
* failures/fixes where relevant

## Deviations

Document every material deviation from this Work Order.

Explain why.

## Technical debt / promotion candidates

Identify duplicated behavior between Martial Arts and Sales that may now have evidence for future Core promotion.

Do **not** implement those promotions.

## Explicitly not implemented

Confirm exclusions remained excluded.

## Owner acceptance checklist

Give Scott a concise browser/manual QA procedure.

He should be able to verify:

1. start Sales
2. log in
3. see Core shell
4. create/open a Company
5. create/open Contacts
6. create an Opportunity
7. move it through provisional pipeline state
8. create/complete an Activity
9. mark Opportunity Won/Lost
10. verify Martial Arts still operates independently

## Handoff to ChatGPT

End with:

* whether C2A is code-shipped
* whether owner acceptance is ready
* unresolved owner decisions
* discovered Core-promotion candidates
* recommended next architecture/product step
* exact items that remain deferred

---

# Stop condition

After implementation, testing, documentation, commits, and push:

**STOP.**

Do not:

* begin C2
* begin Core promotion
* begin SI migration
* begin Beauty
* begin D1
* begin Control Plane Sales provisioning
* begin S7

Push the completed C2A work and return document to `working`.

The next action belongs to Scott + ChatGPT.
