---
type: decision
status: current
area: architecture
updated: 2026-09-17
aliases:
  - Product-owned domains ADR
  - Shared foundation ADR
  - Architecture pivot
tags:
  - adr
  - saas
  - architecture
---

# ADR — Product-owned domains + shared application foundation

**Accepted** (2026-09-17). Owner-authorized documentation reconciliation after reviewing C1, Martial Arts, Sales, and the Control Plane. This is architecture law. Live map: [[Current-State]]. Pointer: [[SaaS-Decisions#2026-09-17 — Product-owned domains and shared foundation]].

This ADR **supersedes** the remaining CRM-domain, Core-migration, Core-version, and “prove Core with Beauty” trajectory in [[ADR-CRM-Core-Vertical-Architecture]]. It does **not** erase C1. C1’s shipped foundation remains in force.

Package name `@crm/core` is **historical**. It currently means the shared application foundation. This ADR does **not** rename it.

---

## 1. Context

The project originally adopted **CRM Core + vertical products** ([[ADR-CRM-Core-Vertical-Architecture]], 2026-09-11). C1 extracted shared infrastructure into `packages/crm-core`. Sales was introduced as the second consumer to challenge what belonged in Core (D2–D4: wait on domain). C2 made Martial Arts and Sales independently provisionable through the Control Plane.

That work produced two results:

1. **Infrastructure sharing is valuable.** Auth, users, RBAC *framework*, settings KV, shell, nav/settings/permission registration, brand helpers, health, and app-env are used by both products.
2. **CRM-domain convergence is weaker than the original Core finish line assumed.** Martial Arts `leads` is a household with required `programId` and trial states. Sales `sales_leads` converts into Company + Contact + Opportunity. Both have “Campaigns” with different tables, status models, tracking, and public capture. Follow-up vs activities, `/trial` vs `/inquire`, Assets vs proposal PDFs — similar English, different aggregates.

The Control Plane already treats products as catalog entries (`productId` → Dockerfile → image → health path). It does not compose a CRM domain.

Continuing toward Core-owned migrations, Core semver as a Control Plane axis, generic Leads/Campaigns/Follow-ups, or using Beauty to “prove Core” would create coupling the operator plane does not need and the two products do not share.

---

## 2. Decision

Products own their domains. A small shared application foundation owns only demonstrated cross-product infrastructure. Additional functionality is promoted to shared code only when real product implementations demonstrate a clean, genuinely shared contract.

```text
                       Control Plane
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
        Martial Arts       Sales        Beauty
         Product App    Product App    Product App
              \             |             /
               \            |            /
                +-----------+-----------+
                            |
                    Shared Foundation
                    (today: @crm/core)
```

The shared layer is an **application foundation**, not a shared CRM domain model. Products are not required to implement a common CRM domain contract because similar names exist.

---

## 3. Product ownership

Each product is an independently owned customer-facing application. Current products: Martial Arts (`martial_arts_template/`), Sales (`sales_template/`). Beauty is not started.

Each product independently owns:

- domain model, workflows, business rules, domain services
- complete database schema and **complete migration journal**
- pages (including copied login/users/security pages today)
- domain-specific permissions and product configuration
- public intake/capture experiences
- release lifecycle, Docker image, product version

Similarity of terminology does not establish shared architecture. Martial Arts Lead and Sales Lead may remain completely separate aggregates.

The monorepo does **not** imply a single application architecture. Independent deployability does **not** prohibit shared packages.

Do not reorganize into `apps/` or split `@crm/core` into `packages/ui|auth|rbac|runtime` unless a later work order authorizes that maintenance need.

---

## 4. Shared foundation

Preserve C1. Do not remove these capabilities from `@crm/core`. Do not copy them independently into each product as the reuse strategy.

Demonstrated foundation (Martial Arts + Sales):

- authentication / session services, password policy, login throttle
- users and RBAC **framework** (tables + `requireAccessRight`; catalogs stay product-owned)
- settings KV + settings-section registration
- application shell, navigation registration, shared UI primitives
- branding helpers, health helpers, application environment identity
- other genuinely cross-product application infrastructure already proven by both products

Foundation must never import a product. Products may depend on the foundation. Products must not depend on each other. Keep the existing architecture tests.

A future rename `@crm/core` → `@crm/foundation` may be considered separately. **Not this decision’s implementation.**

---

## 5. Domain ownership and promotion

**Default:** product-owned unless demonstrated otherwise.

Do not maintain an expectation that Leads, Campaigns, Follow-Ups, Marketing Tasks, Assets, Households, Trials, Events, public lead capture, Sales Accounts, Contacts, Opportunities, Proposals, product-specific attribution, or product-specific workflows will migrate into the foundation.

Sharing is allowed later. It must be earned.

Replace “implement in multiple verticals, then move it into CRM Core” with:

> Do not extract functionality merely because multiple products contain concepts with similar names.

Promote into shared code only when **all** of the following are true:

1. Multiple real products currently require substantially the **same** behavior.
2. Their semantics are genuinely compatible.
3. A stable shared contract can be identified.
4. Extraction reduces meaningful duplication without forcing product-specific behavior into configuration or extension machinery.
5. Schema ownership and migration implications are understood.
6. The resulting dependency does not unnecessarily couple product releases.

Intentional duplication is acceptable while these conditions are not met.

---

## 6. Database and migrations

Each product owns its **complete** migration history. Existing journals remain authoritative (Martial Arts `0000`–`0020`; Sales `0000`–`0003`).

**Superseded:** Core-owned migration journal; `migrateCore()` then `migrateProduct()` (or equivalent) as the runtime contract.

Shared packages may export common schema definitions and services when genuinely appropriate (today: `users*`, `app_settings`). Then:

- the consuming product owns the journal
- SQL enters that product’s migration history
- the product controls migration execution
- shared packages do not silently migrate product databases
- shared packages do not require an independent journal to run before product migrations

If shared persistence later diverges, prefer product-owned extension structures rather than unrelated columns on shared tables. Product tables may FK to foundation tables (`users.id`). The reverse remains prohibited. Do not add product-specific columns to foundation-owned table definitions.

---

## 7. Control Plane

The Control Plane manages products operationally:

```text
Customer
    → Product Instance
        → Product / Build
            → Docker Image
                → Environment
                    → Hosting Node
                        → Port
                            → eventually DNS / TLS
```

It must not require knowledge of a product’s internal domain. It should not care whether two products share most of their source, only the foundation, or almost nothing.

Product identity and deployable artifact identity (`productId`, image tag, environment) are the operational concepts.

**Do not** require the Control Plane to track an independent CRM Core / foundation version as a deployment axis. Package versions may exist in git; they are not a Control Plane field.

D1 remains in force: Customer Account → Product Instance (exactly one product) → Environments (exactly one PROD per instance). “Vertical” in older notes means **product identity**, not “CRM Core vertical composition.”

---

## 8. C1, Sales, Beauty

**C1 is not a failed effort.** Units 1–3 shipped a useful foundation: workspace, `@crm/core` Nuxt layer, architecture tests, brand/health/app-env, auth/users/RBAC framework, settings KV, shell registration. Journals stayed in the products. That accomplishment stands.

**Superseded as remaining C1/Core success criteria:** Core-owned migration history; Core-first migration orchestration; generic Leads/Campaigns/Follow-Ups/public-capture in Core; Core-owned shared CRM-domain UI; independent Core semver as a Control Plane axis; proving architecture by forcing future products onto shared CRM-domain abstractions.

**Sales already performed the architectural role** of the second consumer. It demonstrated foundation commonality and domain divergence. Do not describe Sales as something that still needs to be built to challenge Core.

**Beauty** (C3 / later S10), when authorized, is another independently owned product application. It may consume the foundation. Its domain is designed around Beauty’s actual requirements. Do not force Beauty into an existing domain abstraction to increase reuse. Beauty is additional evidence, not a Core-proof exercise.

---

## 9. Rule-by-rule disposition of [[ADR-CRM-Core-Vertical-Architecture]]

Read that ADR as **historical law plus retained constraints**. A future agent must not treat its remaining Core-domain finish line as current obligation.

| Rule | Disposition |
|---|---|
| ADR-01 Core is shared infrastructure, not a Generic CRM SKU | **RETAINED** — clarify: shared *application* foundation, not CRM domain |
| ADR-02 Composition, not class inheritance, not file-override forks | **RETAINED** for how products consume the foundation. **MODIFIED:** products are independently owned apps, not verticals composed onto a Core domain |
| ADR-03 Separate deployable images; not one universal CRM image | **RETAINED** |
| One-way dependency; products must not import each other; mechanical enforcement | **RETAINED** (Product → Foundation) |
| ADR-05 membership only when genuinely cross-product; no percentage target | **MODIFIED** — evidence-driven promotion (section 5); similar names are not enough |
| ADR-06 promotion default **No until justified** | **RETAINED** (strengthened) |
| ADR-07 product tables may FK to foundation tables; reverse prohibited | **RETAINED** |
| ADR-08 no product-specific columns on foundation tables | **RETAINED** |
| ADR-09 no “replace these Core files” overlay | **RETAINED** |
| ADR-10 configuration for bounded variation *within* a product; not a universal config engine | **RETAINED** |
| ADR-11 Core owns Core schema migrations; Core then product at runtime | **SUPERSEDED** (section 6) |
| ADR-12 a Core change is not green unless every vertical is green | **MODIFIED** — a foundation-package change runs the suites of products that depend on it; not a Core-as-CRM release train |
| ADR-13/14/15 independent Core semver; CP records Core version; only current Core major | **SUPERSEDED** as a Control Plane / product-release axis. A package version in git is optional and not operator identity |
| ADR-16 incremental Martial Arts extraction, not a rewrite | **RETAINED** historically (C1 already did this). No further domain extraction by default |
| ADR-17 do not design Core by stripping MA names; Sales early as second consumer | **RETAINED** as the reason Sales was built. **SUPERSEDED** as an open sequence — Sales already exists and already challenged the boundary |
| ADR-18 product identity first-class on the Product Instance (D1) | **RETAINED** |
| ADR-19 Core owns UI for Core-owned capabilities | **MODIFIED** — foundation owns shell/primitives; products own pages, including current login/users copies |
| ADR-20/21/22 permission catalogs, shell, settings framework | **RETAINED** as foundation frameworks; product catalogs/sections stay product-owned |
| ADR-23 published extension points are versioned contracts | **RETAINED** for foundation registration APIs. Still no generic plugin framework |
| ADR-24 no `sales_beauty_shared` maze by default | **RETAINED** |
| ADR-26 image carries product + Core + git identity | **MODIFIED** — product identity + image + git. Core/foundation version is not required on the Control Plane |
| ADR-27 architecture-proven finish line | **SUPERSEDED** as an open checklist. Items already true (foundation exists, MA and Sales consume it, independently provisionable, architecture tests, product-specific extensions) remain facts. Remaining items (Core journal, Core-owned shared CRM UI, Core version on CP, Beauty as proof) are **not** required |
| D1 account vs product instance | **RETAINED** |
| D2–D4 wait on MA leads / campaigns / public capture | **MODIFIED** — those remain product-owned. Sales now exists as the second implementation and **does not** justify promoting them. Default is no longer “compare then likely Core” |
| Sequence Core → MA → Sales → prove abstractions → Beauty → VPS | **SUPERSEDED.** Product family locally before production VPS is still the C-track *priority* vs official S7, not a Core-domain sequence |
| Rejected: one image + flags; inheritance; `tenant_id`; percentage shared-code target | **RETAINED** |
| Copy/fork Martial Arts as the *only* reuse mechanism | **RETAINED** as rejected. Shared foundation is the reuse mechanism for infrastructure |

---

## 10. Consequences

- No application, schema, package, Docker, or Control Plane change is required by this ADR. Documentation reconciliation only in the authorizing work order.
- C3 Beauty, when authorized, is a new product app + catalog entry + image, not a Core-domain exercise.
- Do not implement a Core migrator, Core promotion of domain, or `@crm/core` rename without a new work order.
- Official S-track S7 is unchanged. This ADR does not start VPS, DNS/TLS, Beauty, or SI migration.

---

## 11. References

- Prior ADR: [[ADR-CRM-Core-Vertical-Architecture]] (partially superseded; keep for history)
- D1–D4 original: [[SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain]]
- C1 evidence: [[history/C1_CRM_Core_Architecture_Return]]
- Extraction plan (historical; remaining Core-domain units are not law): [[history/CRM_Core_Extraction_Implementation_Plan]]
- Platform map: [[Platform-Architecture]], [[Current-State]], [[Customer-Environment]], [[Control-Plane]]
