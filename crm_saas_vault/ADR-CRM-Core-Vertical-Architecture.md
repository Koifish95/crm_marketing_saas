---
type: decision
status: current
area: architecture
updated: 2026-09-12
aliases:
  - CRM Core ADR
  - Core plus vertical
tags:
  - adr
  - saas
  - architecture
---

# ADR — CRM Core + Vertical Product Architecture

**Current implementation (2026-09-12):** C1 is **code-shipped** — `pnpm-workspace.yaml`, `packages/crm-core` (`@crm/core`), Martial Arts consumes Core, architecture import tests exist. C2A is **Successful** — `sales_template/` / `sales-crm` is the second local Core consumer. C2B Slice A is **Successful** — Lead, convert, Opportunity workflow. See [[history/C1_CRM_Core_Architecture_Return]], [[history/C2A_closeout]], [[history/C2B_closeout]], and [[Current-State]]. Sections 2 and 4 below still describe the **pre-C1** repository (no workspace, no Core). That is historical context for the decision, not current repo fact. Do not “establish Core” again. C2 (CP catalog) / D1 schema / Slice B are **not** started. C2A or C2B success does not authorize C2 or Slice B.

## 1. Title

CRM Core is shared infrastructure consumed by independently built vertical products.

## 2. Status

**Accepted** (2026-09-11). Owner-approved in the architectural discussion recorded by [wip/archive/Create_CRM_Core_Vertical_Architecture_ADR_and_Planning_Prompt]. D1–D4 resolved the same day: [SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain]. **C1 is code-shipped.** **C2A is Successful.** **C2B Slice A is Successful.** C2 / D1 schema / Slice B are not started. Extraction plan (not a license): [history/CRM_Core_Extraction_Implementation_Plan]. Pointer: [SaaS-Decisions#2026-09-11 — CRM Core + vertical architecture]. Live map: [Current-State].

## 3. Date

2026-09-11

## 4. Context

The repository today is two standalone Nuxt 4 apps and a vault. There is no `pnpm-workspace.yaml`, no Core package, and no vertical plugin seam.

```text
crm_marketing_saas/
├── martial_arts_template/   # product: martial-arts-acquisition (55 tables, one schema file)
├── control_plane/           # operator app; provision hard-wired to Martial Arts
└── crm_saas_vault/
```

`martial_arts_template` is a Martial Arts CRM monolith derived from the external Renzo implementation. Control plane `customers.industry_template` is stored but always written as `martial-arts` and is not used to pick image or compose. Provision builds `martial-arts-acquisition:s4` from the template folder.

Scott wants a product family — Martial Arts, Sales / Software, then Beauty — **before** production VPS work. A generic CRM is not a sellable product. Official Map B still lists S7 (hosting/VPS) after S6; this ADR changes that priority. S0–S6 remain Successful. This ADR does not authorize extraction, Sales, Beauty, or S7.

## 5. Problem

Treating the current Martial Arts app as “the platform,” forking it per industry, or hiding every vertical behind one image and feature flags would contaminate shared code, force lockstep releases, and make Beauty/Sales carry gym domain. There is no mechanical boundary today: services import each other, `leads` is a household header with a required `programId`, staff nav is hard-coded, and seed/UI embed `ADULT_BJJ` / `KIDS_BJJ`.

We need a durable ownership model, a conservative Core membership rule, and an incremental extraction path that keeps Martial Arts working.

## 6. Decision

Adopt **CRM Core + composition of vertical products**.

```text
CRM Core
   ↑
   ├── Martial Arts
   ├── Sales / Software
   └── Beauty
```

- Core is shared infrastructure, not a customer-facing Generic CRM product (ADR-01).
- Composition, not class inheritance and not copied/forked apps (ADR-02).
- Each vertical is a separate deployable image from shared source. Not one universal CRM image (ADR-03).
- Intended images: `crm-martial-arts:<version>`, `crm-sales:<version>`, `crm-beauty:<version>`.
- Exact folder/tooling is deferred to the implementation plan. The architectural requirement is durable.

## 7. Dependency rules

```text
Vertical -> Core
Core -X-> Vertical
Vertical A -X-> Vertical B
```

Core must never import Martial Arts, Sales, Beauty, or another vertical. Verticals may depend on Core. Verticals must not depend on each other.

This is not a documentation convention. It must be mechanically enforced (package dependencies, ESLint import restrictions, architecture tests). See [history/CRM_Core_Extraction_Implementation_Plan].

Do not create intermediate packages shared by only some verticals (`sales_beauty_shared`) without an explicit stable domain boundary (ADR-24). Premature duplication is preferable to a dependency maze.

## 8. Schema / data ownership rules

- A capability belongs in Core only when it is genuinely cross-vertical (ADR-05). No percentage target. When uncertain, keep it vertical.
- Promoting vertical capability into Core requires the promotion gate (ADR-06). Default answer is **No until justified**.
- Verticals may own tables. Vertical tables may FK to Core tables. The reverse is prohibited (ADR-07).
- Verticals may **not** add vertical-specific columns to Core-owned tables (ADR-08). No `household_id` or `stylist_id` on a Core lead. Use vertical tables, joins, or extension tables when the concept deserves them — do not auto-create extension tables for every difference.
- Core and vertical schema may coexist in the same customer/environment SQLite database.

**Accepted (D2):** keep today’s `leads` / `lead_lines` / `trials` Martial Arts-owned. Do not promote them into Core. Household is not a table; `leads.programId` is required; lead `status` includes trial states. Sales builds its own contact/opportunity concepts. After two real implementations, compare and promote only a justified shared abstraction. That name need not be `Lead`.

**Accepted (D3, D4):** campaigns, acquisition events, and public capture (`/trial`, `/events/[slug]`, `/t/[slug]`) stay Martial Arts-owned until Sales exists and the promotion checklist passes. Temporary duplication is preferred to premature Core.

## 9. UI ownership rules

- Core owns reusable UI for Core-owned capabilities: domain, services/API, validation, permissions, default UI, and tests (ADR-19).
- Core owns the common application shell and navigation framework (ADR-21). Verticals register nav/workspace entries. Do not fork the shell per vertical.
- Verticals compose around Core UI through explicit extension points. Do not duplicate Leads/Tasks/Campaigns frontends across verticals **after** those capabilities are genuinely Core-owned.
- Today’s staff sidebar in `martial_arts_template/app/layouts/internal.vue` is hard-coded. That is a seam to replace during shell extraction, not a license to copy the layout.

## 10. RBAC / settings ownership rules

- Core owns permissions for Core capabilities. Verticals own permissions for vertical capabilities. The product build composes both catalogs. Core must not know vertical permission names (ADR-20).
- Current fact: coarse `users.role` (`ADMIN` / `STAFF` / `VIEWER`) plus a marketing access-rights catalog in `shared/utils/access-rights.ts`. Household/trial have no dedicated rights; CRM is role-gated. Extraction must not stuff `households.view` into Core.
- Core owns the Settings framework and shared settings areas (users, roles, branding, general). Verticals register vertical sections (programs, trial, pipeline, services) (ADR-22).
- Configuration handles bounded variation **within** a product (branding, labels, defaults). Vertical code handles genuine domain differences. Do not build a universal config engine that turns one product into another (ADR-10).

## 11. Extension rules

- Verticals may not replace/override Core implementation files as the normal extension mechanism (ADR-09).
- Core exposes intentional contracts: navigation registration, settings registration, permission catalog composition, and later events/hooks/UI slots only when a real consumer needs them.
- Published extension points are versioned contracts (ADR-23). Compatible additions = minor. Fixes = patch. Breaking changes = Core major + migration path.
- Do not build a generic plugin framework for hypothetical needs. Smallest useful mechanism only.
- No disguised fork: “use Core except replace these files.”

## 12. Migration ownership

- Core owns Core schema migrations. Each vertical owns its migrations (ADR-11).
- A vertical deployment runs: Core migrations → vertical migrations → application start.
- Current fact: one Drizzle journal, tags `0000`–`0020`, runtime `drizzle-orm/libsql/migrator` in `martial_arts_template/server/database/migrate.ts`, Docker `runtime-init` migrate+seed. SQLite is one file per environment. Journal order is the contract.
- First extractions keep that journal until a table actually moves. Do not rewrite 0000–0020 as a clean-room Core history.
- Migrations must be tested against existing (non-empty) customer data, not only empty databases.
- Seed ownership follows table ownership. Product seed today mixes programs (MA), access catalog, admin user, and compensation settings.

## 13. Version / release rules

- Core and vertical products are independently versioned (ADR-13). Verticals may consume different Core versions.
- Core uses semver (ADR-14): PATCH compatible fix; MINOR backward-compatible capability; MAJOR breaking contract/schema/API.
- Only the current Core major is supported long-term. When a new major ships, verticals get an explicit migration window. No indefinite multi-major support (ADR-15).
- Every deployable product image eventually carries: vertical identity, product version, Core version, immutable build/Git id (ADR-26). Control plane records/displays these independently. Do not use a combined version string as the only truth.
- Product identity is first-class and selected when a **Business / Product Instance** is created (ADR-18, D1). Do not infer it only from image names. An instance cannot casually switch Martial Arts → Sales/Beauty. Cross-product conversion is a future explicit process — not implemented here.

## 14. Testing / regression contract

A Core change is not releasable because Core tests pass (ADR-12). Before releasing Core:

- Core tests
- every supported vertical’s applicable suite
- migration tests
- critical vertical integration/contract tests

A Core change that breaks a supported vertical is not green. The gate tightens as verticals are added.

## 15. Incremental migration strategy

Do not rewrite Martial Arts from scratch (ADR-16). Decompose `martial_arts_template` incrementally:

1. Identify a genuinely shared capability.
2. Establish ownership in Core.
3. Make Martial Arts consume Core.
4. Run required tests.
5. Stop if the vertical is red.

Once extracted, do not leave two permanent competing implementations.

Do not design Core solely by stripping Martial Arts names (ADR-17):

1. Establish Core architecture/boundaries.
2. Extract only obviously universal capabilities.
3. Keep Martial Arts functioning on Core.
4. Introduce Sales relatively early as the second consumer.
5. Use Sales to challenge what is truly Core.
6. Expand Core from demonstrated shared behavior.
7. Build Beauty after Martial Arts + Sales prove the architecture.

Sales is intentionally before Beauty.

## 16. Product identity direction

**Accepted (D1):** distinguish the commercial relationship from a CRM/product deployment. Target:

```text
Customer Account / Organization
    ↓
Business / Product Instance     (exactly one vertical)
    ↓
Vertical Product
    ↓
Environments (PROD, DEV, optional extras — same vertical)
```

One account may own multiple instances on different verticals (Smith Holdings → Smith Software / Sales and Smith Aesthetics / Beauty). PROD and DEV under one instance may not be different verticals. Vertical switching is not a normal environment setting.

Control plane must eventually treat product/vertical as first-class on the **Product Instance** (ADR-18):

```text
Customer Account: Smith Holdings
Product Instance: Smith Software
Product: Sales
Environment: PROD
Product Version: 1.3.0
Core Version: 1.8.2
Image: crm-sales:1.3.0
Build/Git SHA: <immutable id>
```

**Environment** records deploy identity (product version, Core version, image, git SHA).

**Current repository fact (not yet this model):** `customers` is both the account and the only product instance; `industry_template` sits on that row; provision always writes `martial-arts`; exactly one PROD per customer row. See [Customer-Environment]. Do not implement the split in C1.

## 17. Architecture-proven finish line

The architecture is established when all of the following are true (ADR-27):

1. CRM Core exists as a real shared dependency with the approved boundaries.
2. Martial Arts has been incrementally migrated onto Core without losing required functionality.
3. Sales exists as a genuinely separate vertical build consuming the same Core.
4. Martial Arts and Sales can be provisioned independently through the Control Plane.
5. Both have separate vertical schema/migrations while sharing Core schema/migrations.
6. Both consume Core-owned UI/services for genuinely shared capabilities rather than permanent duplicates.
7. At least one meaningful vertical-specific extension exists in each product.
8. Automated architecture checks enforce Core/vertical dependency boundaries.
9. A Core change has successfully passed the complete cross-vertical regression gate.
10. Core and both verticals have independent version identities visible/recordable by the Control Plane.

Then stop treating Core extraction as an open-ended refactor. Beauty is the third vertical on the established pattern. Beauty is not required before the architecture is considered established. If Beauty later reveals a bad abstraction, adjust deliberately.

## 18. Consequences

- Official Map B S7 (hosting/VPS) waits until the product family exists locally. S6 owner pass can finish independently; do not start S7 on this ADR.
- [Home] “likely second vertical is Beauty” and [SaaS-Milestones] S10 (Beauty/sister) are historical sequencing, not a license to build Beauty before Sales.
- Backlog item “when to extract a shared CRM core” is answered: after this ADR, when Scott authorizes the first extraction sprint.
- Control plane provision remains Martial Arts-only until a product catalog exists. Multi-instance accounts are target architecture, not shipped.
- Laptop SI data stays disposable. S6 backups are production-shaped fleet ops, not a reason to treat SI as durable.

## 19. Benefits

- One Core, many products, without a Generic CRM SKU.
- Independent images and versions; Beauty does not ship gym code.
- Conservative Core membership avoids false abstractions.
- Mechanical enforcement instead of hope.
- Sales early enough to correct Core before Beauty.

## 20. Costs / tradeoffs

- Extraction is slower than a rename/fork.
- Temporary duplication between verticals is accepted.
- Docker build context and provision must learn workspace packages.
- Cross-vertical regression cost grows with each product.
- Operators must understand product identity, not just image tags.
- Existing `leads` household model cannot be naively declared Core.

## 21. Rejected alternatives

| Alternative | Why rejected |
|---|---|
| One universal CRM image + feature flags | Beauty would ship Martial Arts domain (ADR-03). |
| Class-style inheritance or “replace these Core files” | Disguised fork (ADR-02, ADR-09). |
| Copy/fork `martial_arts_template` per industry | Drift, no shared tests, no Core contract. |
| Design Core by stripping MA names, then add Beauty | False Core; Sales is the second consumer (ADR-17). |
| Percentage shared-code target | Not an architectural requirement (ADR-05). |
| Intermediate `sales_beauty_shared` packages by default | Dependency maze (ADR-24). |
| Indefinite multi-major Core support | Support cost (ADR-15). |
| Multi-tenant `tenant_id` inside one CRM process | Already rejected for this platform; environments stay isolated SQLite. |

## 22. Deferred implementation choices

Deferred to [history/CRM_Core_Extraction_Implementation_Plan] and later owner authorization:

- Exact `pnpm-workspace.yaml` membership and whether `control_plane` joins later.
- Nuxt layer vs extra workspace packages as Core grows.
- When to rename `martial_arts_template` → `apps/martial-arts`.
- Image name cutover from `martial-arts-acquisition:s4` to `crm-martial-arts:<version>`.
- Beauty domain.
- Control plane product-instance catalog UI and when to split `customers` into account + instance rows.
- Exact Sales contact/opportunity names after Sales exists (D2: not assumed to be `Lead`).
- Whether campaigns, events, or public capture later pass the promotion checklist (D3–D4: wait).

## 23. Supersedes / conflicts-with

Does **not** supersede S0–S5 Successful closeouts, IMM-01–04, S4 provision decisions, or S6 NEAR-01–03.

**D1 supersedes** the planning recommendation “one Customer = one product family” and the S1 wording that industry template and “exactly one PROD” live on Customer as the permanent model. Those remain **current implementation facts**. Target: one PROD per Product Instance; industry/vertical on the instance. [SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain].

**Conflicts / sequencing (record, do not erase):**

- Map B listed S7 hosting/VPS next after S6. This ADR places Core / Martial Arts / Sales / Beauty **before** production VPS. [SaaS-Milestones] now records a **separate C-track** (C1 shipped, C2/C3 not started) and does **not** rewrite S7.
- [Home] still says the likely second industry is Beauty. Sales is now the second **architecture** consumer; Beauty remains the sister-pilot industry (S10), later.
- [SaaS-Open-Questions] “when to extract Core and build Beauty” is answered for Core timing; Beauty still waits for the architecture-proven finish line.
- Prompt language “do not build fleet backup merely to protect laptop SI” remains true for *motive*. Authorized S6 already shipped production-shaped backup/restore. SI stays disposable. This ADR does not reopen S6.

Preserved in force: retry = continue/resume; display name editable; slug/timezone/admin email read-only; hostname `{slug}.{product-domain}` with domain unset; no DNS/TLS in this work; no `tenant_id`; Renzo is not a customer.

## 24. References

- Prompt: [wip/archive/Create_CRM_Core_Vertical_Architecture_ADR_and_Planning_Prompt]
- Plan: [history/CRM_Core_Extraction_Implementation_Plan]
- Return: [wip/archive/CRM_Core_Architecture_Planning_Return]
- Current state: [Current-State], [Home], [Working-Agreement]
- Roadmap: [SaaS-Milestones], [history/Post_S4_Foundation_Decision_Closeout]
- Domain unit: [Customer-Environment]
- Operator app: [Control-Plane]
- Prior ADRs: [SaaS-Decisions]
- Backlog: [SaaS-Open-Questions]
