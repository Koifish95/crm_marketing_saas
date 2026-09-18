---
type: note
status: current
area: architecture
updated: 2026-09-17
aliases:
  - Environment unit
  - Customer Environment
tags:
  - saas
  - architecture
---

# Customer and Environment

S1 **Successful**. Conceptual unit the control plane will list, health-check, and relaunch. Not an implementation spec. Domains, TLS, Compose, provisioning scripts, and billing enforcement are out of this note. Live map: [[Current-State]]. Platform architecture: [[Platform-Architecture]].

Decisions: [[SaaS-Decisions#2026-09-08 — S1 customer environment unit]]. D1 hierarchy: [[SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain]] (D1 retained; D2–D4 modified 2026-09-17). Architecture: [[ADR-Product-Owned-Domains-Shared-Foundation]]. Milestones: [[SaaS-Milestones]].

**Target architecture (accepted D1)** vs **current repository fact** are labeled below. Minimal D1 shipped in C2 and is **Successful** (2026-09-15).

## Target hierarchy (accepted D1)

```text
Customer Account / Organization     (commercial relationship)
    └── Business / Product Instance (exactly one product)
            └── Environments
                    ├── exactly one Type = PROD
                    ├── default one DEV
                    └── zero or more additional non-PROD

Hosting Node
└── zero or more Environments   (placement, not ownership)
```

Example: Smith Holdings → Smith Software (Sales: PROD+DEV) and Smith Aesthetics (Beauty: PROD+DEV).

Rules:

- One account may own multiple product instances; those instances may use different products.
- Each instance belongs to exactly one product. All of its environments use that product.
- PROD and DEV under one instance may **not** be different products.
- Switching products is not a normal environment configuration change. Cross-product conversion is a future explicit migration.
- Do not add billing or account-management product features merely because the account level exists.

Older notes may say “vertical” here. That means **product identity**, not CRM Core composition.

A Hosting Node is **not** a child of an Environment. An Environment is **placed on** a node. Many environments may share a node, including environments from different accounts.

## Current repository fact

C2 **Successful** (2026-09-15): Control Plane has `customers` + `product_instances` + `environments`. Environments keep `customer_id` and require `product_instance_id`. Existing rows backfill as one Martial Arts instance; env identities are unchanged. New accounts start with zero environments (`industry_template` = `unassigned`). Operator adds a product instance with an explicit Martial Arts or Sales pick; that creates PROD+DEV for that instance. One PROD per **instance**. At most one instance per `(customer_id, product_id)` in this slice. Beauty is not a catalog product. `industry_template` is a migration leftover, not product truth.

New env names: `{customer}-{productId}-{type}` (and extras `{customer}-{productId}-{label}`). Backfilled names stay `{customer}-{type}` (example: `lab-acme-prod`, `strategic-insights-prod`).

## Customer Account

| Field | Rule |
|---|---|
| Account ID | Permanent. Does not change if the business is renamed. |
| Slug / display name | Human-readable. May change without changing infrastructure identity. |
| Commercial relationship | Who we sell to. Not a vertical. |
| Optional account-level defaults | Branding/defaults that instances may inherit. Not product identity. |

## Business / Product Instance (target)

| Field | Rule |
|---|---|
| Instance ID | Permanent. |
| Account ID | Parent commercial account. |
| Display name | e.g. Smith Software, Smith Aesthetics. |
| Product | Exactly one. Martial Arts, Sales, or Beauty. |
| Business / branding configuration | Instance-owned defaults for that deployment. |

The platform owner’s own business is a normal account (plus separate control-plane privileges) and may later have more than one instance. See [[Control-Plane]].

## Environment

```text
Customer Environment
├── Environment ID           (stable)
├── Product Instance ID      (target; today: customer id)
├── Customer Account ID      (target; today: same as customer id)
├── Type                     (PROD | DEV | later STAGE, UAT, TRAINING, …)
├── Display name             (DEV, DEV-JOHN, TRAINING, …)
├── Hosting node ID          (placement)
├── Application process      (initially one container; Docker is not a permanent model requirement)
├── Deployed application version
├── Independent database     (initially SQLite)
├── Independent asset storage
├── Environment config / secrets
├── Inherited customer configuration
├── Health contract          (process + readiness + database)
└── Lifecycle                (concept now)
```

| Field | Rule |
|---|---|
| Environment ID | Permanent. Rename does not rename volumes or identity. |
| Type | Role. **Target:** exactly one `PROD` per Product Instance. **Current fact:** exactly one `PROD` per customer row. |
| Display name | Separate from Type. Custom names allowed (`DEV-JOHN`). |
| Application process | One process per environment initially. Today: one container. The conceptual model must not require Docker forever. |
| Database | Per environment. Initially SQLite. No sibling or cross-customer access. |
| Assets | Per environment. Same isolation as the database. |
| Deployed version | Per environment. DEV may run newer software than PROD. A Customer does not have one version. |
| Secrets / runtime config | Environment-owned. See [[#Integration credentials]]. |

## Default entitlement vs capability

**Default entitlement (per Product Instance; today per customer row)**

- exactly one `PROD`
- one `DEV`

**Technical capability**

The model and future provisioner must support additional non-PROD environments (`DEV`, extra DEV such as `DEV-JOHN`, `STAGE`, `UAT`, `TRAINING`, future types) from the start of the architecture — not postponed until after S8.

Technical capability ≠ customer entitlement. Subscription/entitlement configuration will later decide whether a given Customer may create extras. **Do not design or implement payment processing in S1.** Pricing, subscriptions, and billing enforcement are future concerns.

Recorded 2026-09-09 ([[SaaS-Decisions#2026-09-09 — S4 owner decisions (password, form, image, secrets, extras)]]):

- **S4** provisions the default pair only (one PROD + one DEV). No fee.
- **Now (post-S4 ten decisions):** operator may add another non-PROD. Still no fee, no hostname. Refuse a second PROD **on that customer row** (target: refuse a second PROD on that product instance).
- **Later:** customer may request extras for a fee (invoice/contract first; no payment processor required to start).

DEV exists specifically to test newer changes before PROD.

## Configuration inheritance

Account- or instance-level business/configuration values are **defaults** for that instance’s environments. Today those defaults live on the customer row.

An environment may set an **explicit permitted override**. A later Customer-level change must **not** silently overwrite an existing explicit Environment override.

```text
Customer Configuration
    ↓ defaults
Environment Configuration
    ↓ explicit permitted overrides
Effective Environment Configuration
```

Which settings may be overridden, and how changes propagate, are later-milestone mechanics. S1 only locks the inheritance rule.

Target: Product Instance owns business/branding. Environment owns runtime configuration and secrets. Today both branding and the vertical flag sit on `customers`.

## Integration credentials

Environment-specific **by default**.

PROD credentials must not automatically flow into DEV, STAGE, UAT, TRAINING, or any other environment.

```text
Customer
└── Meta integration capability enabled

PROD
└── PROD Meta credentials

DEV
└── DEV/test Meta credentials, or none
```

The same rule applies to future APIs, email providers, webhooks, and similar secrets.

Explicit sharing between environments, if ever added, is a deliberate capability. It is not the default.

## Isolation and copy

- Sibling environments cannot directly access each other’s database or assets.
- Customers cannot directly access another customer’s persistent data.
- **PROD → DEV** copy-down is allowed only as an explicit, operator-controlled action. Control Plane restore enforces this server-side: a selected PROD backup may restore into a sibling DEV of the same Customer Account and Product Instance. Same-environment rollback is also allowed. DEV → PROD, cross-product, and cross-customer restores are refused.
- No silent data synchronization.
- No implicit **DEV → PROD** copy-up.

## Health

Current `/api/health` is minimal and operational:

- application / process availability
- application readiness
- database reachability / health

It is **not** required to expose Customer ID, Environment ID, Type, Hosting Node, version, or build metadata for S1.

The control plane is the authority for identity, placement, and deployed version.

Richer diagnostics (ids, type, version, commit, uptime, dependency status, liveness vs readiness, deploy info) may be added in later milestones, especially S3 and S6. This is not a permanent restriction.

Healthy (for the future control plane) still means: process running **and** `/api/health` reports app + database reachable. See [[Control-Plane]].

## Lifecycle (conceptual)

Early control-plane work only needs **Running / Stopped / Unhealthy**.

Stop is non-destructive: process down, persistent data kept.

Delete / decommission is a **separate gated** action. It is not Stop.

S4 stores `lifecycleStatus` `provisioning` | `ready` | `failed` on environment rows, plus optional `provision_error`. Adding a product instance inserts the instance and default PROD+DEV, then provisions in the background. The operator sees persisted Provisioning / Failed / Healthy; Retry continues the same rows and remounts the same volumes. Gated decommission (`decommissioned`) now exists in the control plane: process removed, volumes kept. Hard delete of rows/volumes is still later.

## Portability

The unit must stay infrastructure-neutral enough to run on a Raspberry Pi now and a VPS/server later without changing Customer / Environment identity. Do not bake Pi-only or Docker-only law into this model.

## Out of S1

Domains, TLS, Compose project layout, image registry, node communication mechanism, backup implementation, upgrade implementation, billing, and S2 boot checklist details.

## Next

[[SaaS-Milestones]] **S2–S6** are Successful. Boot steps: [[S2-Hand-Boot-Checklist]]. Observe: [[S3-Control-Plane-Runbook]]. Provision: [[S4-Provision-Runbook]]. Lifecycle: [[S6-Fleet-Runbook]]. C1 is code-shipped. C2A–B2 and **C2** are Successful. Minimal D1 (`product_instances`) shipped in C2. Do not start C3, Beauty, S7, or SI migration unless Scott asks.

Real Renzo is not a Customer in this model. Strategic Insights Consulting, LLC is laptop-provisioned (S4 proof, not a public hostname). Scott’s sister’s business is not provisioned. The S2 lab `lab-acme` is a proof environment, not a paying customer.
