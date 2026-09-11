# Cursor Prompt — CRM Core + Vertical Architecture ADR and Implementation Planning

## Purpose

Pause feature development and formalize the new **CRM Core + Vertical Product architecture** before changing the codebase.

Scott and ChatGPT have completed the architectural discussion. The major product and dependency decisions below are owner-approved. Your job is to:

1. reconcile these decisions with the current repository and durable documentation;
2. create the formal ADR;
3. inspect the actual implementation deeply enough to recommend the safest migration path;
4. produce a repository-grounded implementation/extraction plan;
5. identify any contradictions, risks, or decisions that still genuinely require owner input;
6. STOP before performing the architectural refactor.

This is a **documentation, architecture-audit, and planning task only**.

Do not begin extracting Core.
Do not create Sales or Beauty code.
Do not reorganize the repository yet.
Do not alter provisioning behavior yet.

The purpose is to make the next implementation authorization precise and safe.

---

# Workspace

Project root:

`C:\Users\Scoy9\Projects\crm_marketing_saas`

Expected remote:

`origin = https://github.com/Koifish95/crm_marketing_saas.git`

Work on `working` unless the repository's current durable Working Agreement says otherwise.

The external Renzo CRM is not part of this SaaS repository and must not be touched.

Do not touch:

- `C:\Users\Scoy9\Projects\renzo_crm`
- Koi-Pi
- `webhosting_renzo_*`
- Renzo runtime data
- Renzo DNS/TLS
- Renzo Git remotes

The `martial_arts_template` in this repository is the implementation we will decompose into shared CRM Core + Martial Arts vertical behavior. It is not the external Renzo deployment.

---

# Read First

Start with documentation, then inspect implementation.

At minimum read, if present:

1. `crm_saas_vault/wip/archive/Clean_Starting_Point_Current_State.md`
2. `crm_saas_vault/wip/Clean_Starting_Point_Decision_Backlog.md`
3. `crm_saas_vault/wip/archive/Clean_Starting_Point_Return.md`
4. `crm_saas_vault/Home.md`
5. `crm_saas_vault/Working-Agreement.md`
6. `crm_saas_vault/SaaS-Milestones.md`
7. `crm_saas_vault/SaaS-Decisions.md`
8. `crm_saas_vault/Customer-Environment.md`
9. `crm_saas_vault/Control-Plane.md`
10. `crm_saas_vault/SaaS-ToDo.md`
11. the latest post-S4 roadmap/decision closeout if it exists
12. relevant S2/S3/S4 closeouts and current control-plane productization/hardening notes

Then inspect the current repository, especially:

- `martial_arts_template/`
- `control_plane/`
- root package/workspace/tooling files
- tests
- migrations/schema
- current Docker/build configuration
- recent Git history relevant to S2-S5/current control-plane work

Do not assume the desired architecture already exists because documentation mentions it.

---

# Owner-Approved Architecture Decisions

Treat the following as decisions, not questions to reopen unless implementation evidence reveals a direct contradiction that makes one impossible.

## ADR-01 — CRM Core Is Shared Infrastructure, Not a Product

The generic CRM is **not** a sellable customer product.

It is the shared CRM foundation consumed by vertical products.

Current intended vertical products include:

- Martial Arts
- Sales / Software
- Beauty

Future verticals may be added.

Do not create a customer-facing `Generic CRM` product merely because Core exists.

---

## ADR-02 — Composition, Not Application Inheritance or Forks

Do not model this as class-style inheritance or as copied/forked applications.

Use composition:

```text
CRM Core
   ↑
   ├── Martial Arts
   ├── Sales / Software
   └── Beauty
```

A likely technical family of solutions is a modular monorepo using **pnpm workspaces + Nuxt layers/shared packages**, but inspect the current stack and recommend the exact repository-grounded implementation.

The architectural requirement is durable; exact folder/tooling details are not yet prescribed.

---

## ADR-03 — Separate Product Builds

Each vertical is a separate deployable product build from shared source.

We do **not** want one universal CRM image containing every vertical behind feature flags.

Conceptually:

```text
crm-martial-arts:<version>
crm-sales:<version>
crm-beauty:<version>
```

A Beauty deployment should not need to ship Martial Arts domain code merely because both consume Core.

---

## ADR-04 — One-Way Dependency Direction

Enforce:

```text
Vertical -> Core
Core -X-> Vertical
Vertical A -X-> Vertical B
```

Core must never import from or depend on Martial Arts, Sales, Beauty, or another vertical.

Verticals may depend on Core.

Verticals must not directly depend on other verticals.

This is not merely a documentation convention. It must eventually be mechanically enforced by build/lint/architecture tests.

Recommend the enforcement mechanism after inspecting the repository.

---

## ADR-05 — Core Membership Is Conservative

Do not optimize for an arbitrary percentage of shared code.

Scott expects Core may eventually contain a large majority of common CRM functionality, but **no percentage target is an architectural requirement**.

A capability belongs in Core when it is genuinely cross-vertical.

When uncertain, keep functionality vertical-specific until multiple verticals prove a stable shared abstraction.

Premature duplication between verticals is preferable to contaminating Core with a false abstraction.

---

## ADR-06 — Promotion-to-Core Gate

Vertical divergence is allowed.

Promoting an existing vertical capability into Core requires deliberate review.

The eventual checklist should include concepts such as:

- demonstrated use/need across at least two verticals;
- same underlying business concept;
- sufficiently compatible lifecycle/behavior;
- nameable without vertical-specific terminology;
- no vertical conditionals required inside Core;
- ownership boundary is clear;
- regression/contract tests exist;
- migration impact is understood.

Refine this checklist in the ADR/implementation plan if repository evidence suggests additional necessary gates.

Default answer to promotion is **No until justified**.

---

## ADR-07 — Vertical-Owned Tables Are Allowed

Verticals may create their own tables when their domain requires them.

Do not artificially avoid tables merely to make the schema look smaller.

Schema ownership and normalized domain modeling matter more than minimizing table count.

A vertical-owned table may reference a Core-owned table through normal foreign keys.

Example conceptually:

```text
martial_arts.household_lead
    lead_id -> core.lead.id
```

The reverse dependency is prohibited.

---

## ADR-08 — Core Tables Are Closed to Vertical-Specific Columns

Verticals may **not** add vertical-specific fields directly to Core-owned tables.

Example of what we do NOT want:

```text
core.lead
- id
- email
- status
- household_id       # prohibited Martial Arts contamination
- stylist_id         # prohibited Beauty contamination
```

Use normalized vertical-owned structures instead:

- vertical domain tables;
- foreign-key relationships;
- join tables;
- vertical-owned extension tables where appropriate.

Do not automatically use extension tables for every difference. If the concept deserves a real domain table, model it as such.

---

## ADR-09 — Explicit Extension Points; No Direct Core Overrides

Verticals may not directly replace/override Core implementation files as their normal extension mechanism.

Core should expose intentional extension contracts where vertical behavior needs to participate, such as:

- services/interfaces;
- events;
- hooks;
- registries;
- navigation registration;
- settings registration;
- UI extension points;
- other explicit contracts appropriate to the current Nuxt/TypeScript architecture.

Do not create a disguised fork model where a vertical says "use Core except replace these files."

Recommend the smallest useful extension mechanism. Do not build a giant plugin framework prematurely.

---

## ADR-10 — Configuration vs Vertical Code

Configuration handles bounded variation **within** a product.

Vertical code handles genuine domain differences.

Likely configuration examples:

- branding;
- bounded terminology/display labels where practical;
- defaults;
- ordinary business settings.

Likely vertical-code examples:

- Martial Arts household/trial workflows;
- Sales opportunity/pipeline behavior;
- Beauty appointment/service/provider behavior.

Do not create a universal configuration engine whose purpose is to transform one product into another.

---

## ADR-11 — Migration Ownership

Core owns Core schema migrations.

Each vertical owns its vertical-specific migrations.

A vertical deployment runs migrations deterministically in dependency order:

```text
Core migrations
    -> Vertical migrations
    -> application start
```

Core and vertical schema may coexist in the same customer/environment database.

Migrations must be tested against existing customer data, not only empty databases.

The exact migration implementation must respect the application's current database technology and migration framework.

---

## ADR-12 — Core Release Regression Gate

A Core change is not releasable merely because Core's own tests pass.

Before releasing a Core change, require:

- Core tests;
- every supported vertical's applicable test suite;
- migration tests;
- critical vertical integration/contract tests.

A Core change that breaks a supported vertical is not green.

As verticals are added, this gate intentionally becomes stricter.

---

## ADR-13 — Independent Core and Vertical Versions

Core and vertical products are independently versioned.

A vertical may temporarily consume a different Core version from another vertical.

Example:

```text
Martial Arts product 1.7.0 -> Core 1.8.2
Sales product 1.3.0        -> Core 1.8.2
Beauty product 1.1.0       -> Core 1.7.5
```

Do not force every vertical into lockstep releases.

---

## ADR-14 — Semantic Versioning for Core

Use semantic versioning as the intended Core contract model:

- PATCH: compatible fix;
- MINOR: backward-compatible capability;
- MAJOR: breaking contract/schema/API change.

Published Core extension points are versioned contracts.

Breaking/removing/changing an established contract requires an appropriate major-version change and migration path.

---

## ADR-15 — Core Version Support Policy

Only the current Core major version is supported long-term.

Verticals may temporarily lag within the supported major.

When a new Core major is introduced, verticals receive an explicit migration window before the previous major is retired.

Do not design indefinite multi-major support.

---

## ADR-16 — Incremental Martial Arts Extraction

Do not rewrite Martial Arts from scratch.

The existing `martial_arts_template` is decomposed incrementally.

For each bounded extraction:

1. identify a genuinely shared capability;
2. move/establish its ownership in Core;
3. make Martial Arts consume the Core implementation;
4. run the required tests/regression checks;
5. do not proceed if the vertical is red.

Once a capability is successfully extracted, do not leave two permanent competing implementations.

Core becomes the owner of the shared implementation.

---

## ADR-17 — Core Is Discovered Through Multiple Verticals

Do not attempt to fully design Core solely by stripping Martial Arts-specific names from the current app.

Sequence conceptually:

1. establish Core architecture/boundaries;
2. extract only obviously universal capabilities;
3. keep Martial Arts functioning on Core;
4. introduce Sales relatively early as the second consumer;
5. use Sales to challenge/refine assumptions about what is truly Core;
6. expand Core based on demonstrated shared behavior;
7. build Beauty after the architecture is proven by Martial Arts + Sales.

Sales is intentionally before Beauty.

---

## ADR-18 — First-Class Product Identity

The Control Plane must eventually treat product/vertical identity as a first-class property.

Conceptually:

```text
Customer: Strategic Insights
Product: Sales
Environment: PROD
Product Version: 1.3.0
Core Version: 1.8.2
Image: crm-sales:1.3.0
Build/Git SHA: <immutable id>
```

Product identity should be selected during provisioning.

Do not infer it only from image names or incidental configuration.

An existing customer cannot casually switch from Martial Arts to Sales or Beauty. Cross-product conversion is a future explicit migration process.

Do not implement that migration now.

---

## ADR-19 — Core Owns Reusable UI for Core Capabilities

Core ownership generally includes the reusable UI for Core-owned capabilities, not just backend/schema code.

A Core capability may own, where appropriate:

- domain/schema;
- services/API;
- validation;
- permissions;
- reusable/default UI;
- tests.

Verticals compose around Core UI through explicit extension points.

Do not duplicate Leads/Tasks/Campaigns/etc. frontend implementations across every vertical when the underlying capability is genuinely Core-owned.

---

## ADR-20 — RBAC Ownership Follows Capability Ownership

Core owns permissions for Core capabilities.

Verticals own permissions for vertical capabilities.

The final product build composes both permission catalogs.

Example:

```text
Core
- leads.view
- leads.edit
- campaigns.manage

Martial Arts
- households.view
- trials.manage

Sales
- opportunities.manage
```

Core must not know about vertical permissions.

---

## ADR-21 — Core Owns Shared Application Shell / Navigation Framework

Core owns the common CRM application shell and navigation framework.

Likely shared concerns include:

- app shell/layout;
- common navigation framework;
- user menu;
- shared loading/error patterns;
- common workspace primitives;
- other truly shared UI infrastructure.

Verticals contribute vertical-specific navigation/workspace entries through explicit registration/extension points.

Do not copy/fork the shell per vertical.

---

## ADR-22 — Core Owns Settings Framework

Core owns the common Settings framework and shared settings areas.

Verticals register their own settings sections/pages for vertical-specific concepts.

Example conceptually:

```text
Core Settings
- Users
- Roles/Permissions
- Branding
- General business settings

Martial Arts adds
- Programs
- Trial settings

Sales adds
- Pipeline settings

Beauty adds
- Services
- Provider settings
```

Do not make each vertical independently recreate the Settings framework.

---

## ADR-23 — Published Extension Points Are Stable Contracts

Once a vertical consumes a published Core extension point, treat it as a versioned contract.

Backward-compatible additions may occur in minor versions.

Compatible fixes may occur in patch versions.

Breaking changes require a major Core version and migration path.

Do not casually remove hooks/events/services/registrations used by supported verticals.

---

## ADR-24 — Cross-Vertical Duplication Is Initially Acceptable

If two verticals share similar functionality that does not yet qualify for Core, tolerate some duplication initially.

Do not immediately create intermediate packages such as `sales_beauty_shared` merely because two implementations look similar.

A package shared by only some verticals requires explicit architectural justification and a stable domain boundary.

Avoid a dependency maze.

---

## ADR-25 — Mechanical Architecture Enforcement

Dependency boundaries must eventually be enforced automatically.

The implementation plan should recommend repository-appropriate mechanisms that can detect/fail cases such as:

- Core importing a vertical;
- one vertical importing another vertical;
- forbidden package dependencies;
- other violations of declared ownership boundaries.

Do not prescribe a tool before inspecting the current TypeScript/Nuxt/package setup.

---

## ADR-26 — Product Build Identity

Every deployable product image should eventually carry at least:

- vertical/product identity;
- product version;
- Core version;
- immutable build/Git identifier.

The Control Plane should eventually be able to record/display these independently.

Do not create awkward combined version strings as the only source of truth.

---

## ADR-27 — Architecture-Proven Finish Line

The Core + vertical architecture is considered established when all of the following are true:

1. CRM Core exists as a real shared dependency with the approved dependency boundaries.
2. Martial Arts has been incrementally migrated onto Core without losing required existing functionality.
3. Sales exists as a genuinely separate vertical build consuming the same Core.
4. Martial Arts and Sales can be provisioned independently through the Control Plane.
5. Both have separate vertical schema/migrations while sharing Core schema/migrations.
6. Both consume Core-owned UI/services for genuinely shared capabilities rather than maintaining duplicate permanent implementations.
7. At least one meaningful vertical-specific extension exists in each product, proving they are not merely differently branded copies.
8. Automated architecture checks enforce Core/vertical dependency boundaries.
9. A Core change has successfully passed the complete cross-vertical regression gate.
10. Core and both verticals have independent version identities visible/recordable by the Control Plane.

At that point, stop treating Core extraction as an open-ended refactor.

Beauty becomes the third vertical built using the established pattern.

If Beauty later reveals a bad abstraction, adjust deliberately; Beauty is not required before the architecture can be considered established.

---

# Intended Pre-VPS Product Sequence

This architecture decision changes the roadmap priority.

Scott wants the product family established **before moving to the VPS**.

The current intended sequence is conceptually:

```text
Current Control Plane Foundation
        ->
Establish CRM Core boundary
        ->
Incrementally migrate Martial Arts onto Core
        ->
Build Sales / Software vertical against Core
        ->
Prove Core + Vertical architecture
        ->
Build Beauty vertical
        ->
Mature multi-product Control Plane provisioning/operations
        ->
Production VPS / infrastructure work
```

Do not interpret this as authorization to implement these stages now.

The exact milestone decomposition still needs to be proposed from repository evidence.

The key owner constraint is:

> Martial Arts + Sales + Beauty product architecture should be in place locally before the production VPS transition.

Sales comes before Beauty.

---

# Existing Decisions That Remain in Force

Unless current durable documentation shows Scott intentionally superseded them, preserve these recent decisions:

## Provisioning Retry

Retry means resume/continue the existing provisioning attempt.

Preserve existing resources/volumes.

Never silently rebuild.

Rebuild/recreate is a separate future gated operation.

## Customer Editing

For now:

- Display Name may be editable.
- Slug remains read-only.
- Timezone remains read-only.
- Admin email remains read-only.

## Future Hostname

Conceptual hostname:

`{slug}.{product-domain}`

The permanent product domain remains undecided.

Do not implement DNS/TLS as part of this planning task.

## Hosting / Backup Timing

The laptop/desktop remains the development environment for now.

Do not build fleet backup infrastructure merely to protect disposable local test data.

Production backup/recovery will be designed around durable production hosting when that phase is reached.

Do not move VPS work ahead of the Core/vertical product-family work approved above.

---

# Your Task — Part A: Repository-Grounded Architecture Audit

After reading the documentation, inspect the current implementation and determine how these decisions map onto reality.

Do not merely restate the ADR decisions.

Investigate the actual code.

## Audit `martial_arts_template/`

Build an ownership/dependency map of the current application.

Identify candidate areas such as:

- authentication;
- users;
- roles/RBAC;
- leads;
- households;
- trials;
- campaigns;
- campaign content;
- campaign assets;
- marketing tasks;
- general tasks/follow-up;
- acquisition events;
- tracking/attribution;
- notes/history;
- settings;
- application shell/navigation;
- branding;
- health;
- configuration;
- public trial/lead capture;
- any other meaningful domain modules actually present.

For each significant capability classify it as one of:

- **Obvious Core candidate**
- **Likely Core, needs Sales validation**
- **Martial Arts vertical**
- **Configuration concern**
- **Infrastructure/runtime concern**
- **Unclear — needs owner decision**

Explain why.

Do not automatically accept old documentation classifications if code semantics disagree.

## Audit coupling

Identify places where currently shared-looking functionality is tightly coupled to Martial Arts concepts.

Examples to investigate:

- Lead code assuming Household;
- Trial concepts embedded in generic lead lifecycle;
- Martial Arts-specific labels inside reusable components;
- settings pages mixing generic and Martial Arts configuration;
- RBAC permissions mixing ownership;
- navigation hard-coding Martial Arts routes;
- campaign/event workflows tied to trials;
- schema relationships that will complicate extraction;
- seed logic;
- API/service imports;
- shared utility code with vertical assumptions.

This coupling map is critical to the extraction plan.

---

# Your Task — Part B: Recommend Concrete Repository Structure

Based on the current repo, recommend the concrete monorepo/workspace structure that best implements the approved architecture.

Do not change it yet.

Consider whether something conceptually like this fits:

```text
crm_marketing_saas/
├── apps/
│   ├── control-plane/
│   ├── martial-arts/
│   ├── sales/
│   └── beauty/
├── packages/
│   └── crm-core/
└── crm_saas_vault/
```

or whether Nuxt layers/workspace realities suggest a better structure.

You are not required to use those names.

Recommend based on:

- current Nuxt architecture;
- pnpm behavior;
- Docker build contexts;
- test commands;
- migration tooling;
- code ownership;
- ability to build independent images;
- local developer ergonomics;
- CI implications;
- future vertical addition;
- avoiding a massive disruptive repo move before it provides value.

Explicitly answer:

1. Should we introduce `pnpm-workspace.yaml` now if one does not exist?
2. Should Core be primarily a Nuxt layer, one or more workspace packages, or a combination?
3. Which concerns belong in a Nuxt layer versus ordinary TypeScript packages?
4. Should we physically move `martial_arts_template` immediately, or first establish Core alongside it and defer cosmetic repo restructuring?
5. How should independent vertical Docker builds consume Core?
6. How should shared migration code be organized?
7. How should shared tests be organized?

Prefer incremental architecture over a big-bang directory rewrite.

---

# Your Task — Part C: Recommend Boundary Enforcement

We have decided dependency direction must be mechanically enforced.

Inspect the current tooling and recommend the simplest reliable mechanism.

Consider, where appropriate:

- workspace package dependency declarations;
- TypeScript project/package boundaries;
- ESLint import restrictions;
- architecture tests;
- dependency graph tooling;
- CI checks;
- Nuxt layer constraints.

Do not add tools during this task.

Return:

- recommended mechanism;
- why it fits this repo;
- what violations it catches;
- what it does not catch;
- when it should be introduced during extraction.

Avoid unnecessary enterprise tooling.

---

# Your Task — Part D: Recommend Core Extension Mechanisms

We have approved explicit extension points and rejected direct Core overrides.

Inspect actual current use cases and recommend the minimum useful extension model.

Determine where we genuinely need mechanisms such as:

- navigation registration;
- settings registration;
- permission registration;
- route/workspace contribution;
- domain events;
- service interfaces;
- UI slots/components;
- validation hooks;
- lifecycle hooks.

Do not invent a generic plugin system for hypothetical future needs.

For each recommended extension mechanism, tie it to an actual or near-term Martial Arts/Sales need.

Identify extension mechanisms that should **not** be built yet.

---

# Your Task — Part E: Migration and Schema Strategy

Inspect the current schema/migration system.

Recommend how to reach:

```text
Core migrations
    -> Vertical migrations
```

without losing existing Martial Arts data or creating a rewrite.

Address:

- current migration numbering/order;
- table ownership;
- foreign keys from vertical tables to Core tables;
- whether SQLite imposes special migration constraints;
- seed ownership;
- development/test DB initialization;
- existing customer/environment DB upgrade path;
- rollback expectations at this stage;
- how to prove migrations against non-empty databases.

Do not migrate schema during this task.

---

# Your Task — Part F: Testing and Release Gate Design

Translate the approved regression contract into a practical test strategy for this repository.

Recommend layers such as:

- Core unit tests;
- Core integration tests;
- Martial Arts tests;
- Sales tests once it exists;
- Beauty tests later;
- migration tests;
- critical workflow contract tests;
- architecture-boundary tests;
- build/typecheck/lint;
- Docker smoke tests where appropriate.

Identify a **small mandatory critical-workflow suite** for Martial Arts that must remain green throughout extraction.

Do not attempt to test every screen as a prerequisite to beginning.

Recommend what should gate:

- every extraction commit;
- Core release;
- vertical Core-version upgrade;
- product image release.

---

# Your Task — Part G: Incremental Extraction Plan

This is one of the most important outputs.

Inspect dependencies and propose the safest bounded extraction sequence from the current Martial Arts implementation.

Do not assume the sequence in this prompt is correct.

For each proposed extraction unit include:

- capability;
- current location/ownership;
- why it belongs in Core or why it needs validation;
- dependencies;
- schema impact;
- API/service impact;
- UI impact;
- RBAC impact;
- migration impact;
- extension point needed, if any;
- tests required;
- rollback/revert strategy;
- Successful criteria.

Prefer small vertical slices where the ownership transfer can be proven end-to-end.

Do not produce a plan that moves hundreds of files first and tests afterward.

The desired loop is approximately:

```text
Audit bounded capability
    -> establish Core ownership
    -> make Martial Arts consume Core
    -> test
    -> commit
    -> continue
```

Recommend when Sales should begin relative to the extraction sequence.

Remember: Sales should start early enough to challenge Core assumptions, not after we have prematurely declared Core finished.

---

# Your Task — Part H: Sales Vertical Planning Boundary

Do not design the entire Sales CRM yet.

For this plan, identify only enough Sales scope to serve as a meaningful second Core consumer.

We know the Sales / Software vertical is intended before Beauty.

Recommend the minimum Sales vertical needed to prove:

- independent product build;
- shared Core consumption;
- vertical-specific schema;
- vertical-specific UI/workflow;
- vertical-specific RBAC;
- independent migrations;
- independent version identity;
- provisioning through Control Plane.

Do not turn this planning task into a full Sales product specification.

Flag later Sales product decisions separately.

---

# Your Task — Part I: Control Plane Impact

Audit the current Control Plane and identify changes eventually required for multi-product provisioning and operations.

At minimum consider:

- Product/Vertical registry/catalog;
- product identity on Customer and/or Environment;
- provisioning input;
- image selection;
- product version;
- Core version;
- immutable build/Git identifier;
- product-aware health/metadata where necessary;
- product-aware environment creation;
- existing customer records created before product identity exists;
- whether Customer or Environment should own product identity in the current domain model;
- whether one Customer could ever legitimately have environments from different vertical products.

That last point may be a genuine owner decision. Do not guess if current decisions do not answer it.

Do not implement Control Plane changes now.

Recommend when each change belongs in the extraction/vertical sequence.

---

# Your Task — Part J: Roadmap Recommendation

Using repository evidence, recommend how to translate this architecture into the next milestones.

The owner constraint is:

```text
Core / Martial Arts / Sales / Beauty
BEFORE
production VPS transition
```

The next 2-4 milestones should be detailed.

Later milestones can remain high-level.

Do not update `SaaS-Milestones.md` yet unless Scott has already separately authorized roadmap edits in a newer durable decision document.

Instead propose the roadmap in the planning artifact.

Clearly distinguish:

- architecture establishment;
- Martial Arts migration;
- Sales vertical proof;
- Beauty vertical;
- Control Plane multi-product capability;
- later production hosting/reliability/security/public exposure.

Avoid artificially forcing every extraction sprint into its own top-level milestone if that makes the roadmap unreadable.

---

# Decisions You May Recommend, But Not Make Silently

If the repository audit reveals a real unresolved fork, document it rather than choosing silently.

Examples:

- whether Product identity belongs on Customer, Environment, or both;
- whether one Customer can own multiple product families;
- exact Lead abstraction if current Household coupling makes the proposed Core boundary ambiguous;
- whether Campaigns/Acquisition Events are truly Core or need Sales validation;
- whether a shared public lead-capture framework belongs in Core;
- any schema ownership conflict that cannot be resolved by the approved one-way dependency rule.

For each unresolved decision:

- state the question;
- show repository evidence;
- give your recommendation;
- explain consequences;
- state whether it blocks the first extraction sprint.

Do not manufacture decisions merely to be exhaustive.

---

# Explicitly Out of Scope

Do NOT implement or begin:

- CRM Core extraction;
- repository restructuring;
- Sales application code;
- Beauty application code;
- product-aware provisioning changes;
- VPS migration;
- remote Hosting Nodes;
- DNS;
- GoDaddy integration;
- TLS / Let's Encrypt;
- reverse proxy/public routing;
- fleet backup/restore;
- upgrade/rollback orchestration;
- image registry;
- operator-auth redesign;
- billing / Stripe;
- entitlements;
- customer self-service;
- external Renzo changes;
- production customer migration.

This prompt authorizes **inspection + ADR + implementation planning only**.

---

# Required Deliverable 1 — Formal ADR

Create a durable ADR in the repository's appropriate architecture/decision documentation location.

Preferred filename if no established ADR naming convention exists:

`crm_saas_vault/ADR-CRM-Core-Vertical-Architecture.md`

If the repository already has an ADR folder/naming convention, follow it and report the actual path.

The ADR should contain:

1. Title
2. Status: Accepted
3. Date
4. Context
5. Problem
6. Decision
7. Dependency rules
8. Schema/data ownership rules
9. UI ownership rules
10. RBAC/settings ownership rules
11. Extension rules
12. Migration ownership
13. Version/release rules
14. Testing/regression contract
15. Incremental migration strategy
16. Product identity direction
17. Architecture-proven finish line
18. Consequences
19. Benefits
20. Costs/tradeoffs
21. Rejected alternatives
22. Deferred implementation choices
23. Supersedes/conflicts-with notes, if any
24. References to relevant current-state documents

Do not weaken or reinterpret the owner-approved decisions above without explicitly flagging the conflict.

---

# Required Deliverable 2 — Repository-Grounded Implementation Plan

Create:

`crm_saas_vault/wip/CRM_Core_Extraction_Implementation_Plan.md`

This should be detailed and implementation-oriented.

Include at least:

1. Executive recommendation
2. Current architecture findings
3. Current Martial Arts capability ownership matrix
4. Coupling/hard-boundary findings
5. Proposed repository/workspace structure
6. Nuxt layer vs package recommendation
7. Dependency enforcement recommendation
8. Core extension mechanism recommendation
9. Schema/migration strategy
10. Test/release-gate strategy
11. Incremental extraction sequence
12. When to introduce Sales
13. Minimum Sales proof scope
14. Control Plane multi-product changes
15. Version/build identity plan
16. Risks
17. Technical debt exposed by extraction
18. Decisions still required
19. Proposed next milestones
20. Exact recommended first implementation sprint
21. Explicit STOP boundary

The first implementation sprint should be small enough to QA, commit, and revert independently.

---

# Required Deliverable 3 — Return / Handoff

Create:

`crm_saas_vault/wip/archive/CRM_Core_Architecture_Planning_Return.md`

Document:

- documentation reviewed;
- repository areas inspected;
- architecture findings;
- major coupling discovered;
- ADR path;
- implementation-plan path;
- unresolved owner decisions;
- recommended first implementation sprint;
- any deviations from this prompt;
- validation performed;
- files changed;
- commit SHA;
- push status;
- explicit confirmation that no architecture refactor or new vertical implementation was started.

This is the handoff artifact Scott can provide to ChatGPT.

---

# Validation Before Finalizing

Before writing the final recommendation:

1. Verify the proposed Core candidates against actual imports/schema/workflows.
2. Verify Martial Arts-only candidates against actual business behavior.
3. Verify the current migration framework before recommending migration structure.
4. Verify current Nuxt/package structure before recommending layers/workspaces.
5. Verify current Docker build assumptions before recommending independent vertical builds.
6. Verify current Control Plane schema before recommending product identity placement.
7. Verify current tests/scripts before defining the regression gate.
8. Search for existing genericization/verticalization work before proposing duplicate infrastructure.
9. Identify any current code that already behaves like a reusable Core primitive.
10. Distinguish repository fact from recommendation throughout the implementation plan.

If you cannot prove something from the repository, label it as recommendation/assumption rather than fact.

---

# Documentation Consistency

Do not broadly rewrite the roadmap during this task.

However, if durable documentation directly contradicts this newly accepted architecture, identify those conflicts in the ADR and planning return.

Do not silently erase historical decisions.

Recommend what should be updated after Scott approves the implementation plan.

---

# Git / Commit / Push

Before beginning:

- inspect `git status`;
- inspect current branch;
- inspect remotes;
- inspect recent log;
- confirm you are in `crm_marketing_saas`, not external Renzo.

This task creates durable architecture/planning documentation, so commit and push the resulting documentation unless the current Working Agreement explicitly requires a different handling.

Work on `working`.

Before commit:

- review the diff;
- ensure no application implementation changes slipped in;
- ensure no secrets/runtime SQLite/uploads/backups are staged;
- ensure links/paths in the new Markdown files are valid;
- ensure owner-approved decisions are represented accurately.

Commit only the documentation relevant to this task.

Push `working` to `origin`.

Do not force-push.
Do not amend unrelated history.
Do not skip hooks.

---

# Final Cursor Chat Response

Keep chat concise because the detailed result belongs in Markdown.

Return only:

- planning status: complete / blocked;
- ADR path;
- implementation-plan path;
- return/handoff path;
- recommended concrete Core technical model (one sentence);
- number of unresolved owner decisions;
- recommended first implementation sprint;
- whether Sales should begin before Core extraction is fully complete;
- commit SHA;
- push status;
- confirmation that no architecture refactor, Sales implementation, Beauty implementation, VPS work, or other new milestone implementation was started.

Then STOP.

Do not begin implementation until Scott reviews the plan.
