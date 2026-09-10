---
type: note
status: current
area: architecture
updated: 2026-09-09
aliases:
  - Environment unit
  - Customer Environment
tags:
  - saas
  - architecture
---

# Customer and Environment

S1 **Successful**. Conceptual unit the control plane will list, health-check, and relaunch. Not an implementation spec. Domains, TLS, Compose, provisioning scripts, and billing enforcement are out of this note.

Decisions: [[SaaS-Decisions#2026-09-08 — S1 customer environment unit]]. Milestones: [[SaaS-Milestones]].

## Hierarchy

```text
Customer
├── Customer ID              (stable)
├── Slug / display name      (changeable)
├── Business / branding configuration
└── Environments
    ├── exactly one Type = PROD
    ├── default one DEV
    └── zero or more additional non-PROD

Hosting Node
└── zero or more Environments   (placement, not ownership)
```

A Hosting Node is **not** a child of an Environment. An Environment is **placed on** a node. Many environments may share a node, including environments from different customers.

## Customer

| Field | Rule |
|---|---|
| Customer ID | Permanent. Does not change if the business is renamed. |
| Slug / display name | Human-readable. May change without changing infrastructure identity. |
| Industry template | Which product variant this customer uses (Martial Arts first). |
| Business / branding configuration | Customer-owned defaults for name, branding, and similar business settings. |

The platform owner’s own business is a normal Customer plus separate control-plane privileges. See [[Control-Plane]].

## Environment

```text
Customer Environment
├── Environment ID           (stable)
├── Customer ID
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
| Type | Role. **Exactly one `PROD` per Customer** (hard invariant). |
| Display name | Separate from Type. Custom names allowed (`DEV-JOHN`). |
| Application process | One process per environment initially. Today: one container. The conceptual model must not require Docker forever. |
| Database | Per environment. Initially SQLite. No sibling or cross-customer access. |
| Assets | Per environment. Same isolation as the database. |
| Deployed version | Per environment. DEV may run newer software than PROD. A Customer does not have one version. |
| Secrets / runtime config | Environment-owned. See [[#Integration credentials]]. |

## Default entitlement vs capability

**Default customer entitlement**

- exactly one `PROD`
- one `DEV`

**Technical capability**

The model and future provisioner must support additional non-PROD environments (`DEV`, extra DEV such as `DEV-JOHN`, `STAGE`, `UAT`, `TRAINING`, future types) from the start of the architecture — not postponed until after S8.

Technical capability ≠ customer entitlement. Subscription/entitlement configuration will later decide whether a given Customer may create extras. **Do not design or implement payment processing in S1.** Pricing, subscriptions, and billing enforcement are future concerns.

Recorded 2026-09-09 ([[SaaS-Decisions#2026-09-09 — S4 owner decisions (password, form, image, secrets, extras)]]):

- **S4** provisions the default pair only (one PROD + one DEV). No fee.
- **Now (post-S4 ten decisions):** operator may add another non-PROD. Still no fee, no hostname. Refuse a second PROD.
- **Later:** customer may request extras for a fee (invoice/contract first; no payment processor required to start).

DEV exists specifically to test newer changes before PROD.

## Configuration inheritance

Customer-level business/configuration values are **defaults** for that Customer’s environments.

An environment may set an **explicit permitted override**. A later Customer-level change must **not** silently overwrite an existing explicit Environment override.

```text
Customer Configuration
    ↓ defaults
Environment Configuration
    ↓ explicit permitted overrides
Effective Environment Configuration
```

Which settings may be overridden, and how changes propagate, are later-milestone mechanics. S1 only locks the inheritance rule.

Customer owns business/branding configuration. Environment owns runtime configuration and secrets.

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
- **PROD → DEV** copy-down is allowed only as an explicit, operator-controlled action.
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

S4 stores `lifecycleStatus` `provisioning` | `ready` | `failed` on environment rows. Delete / decommission is still a later gated action.

## Portability

The unit must stay infrastructure-neutral enough to run on a Raspberry Pi now and a VPS/server later without changing Customer / Environment identity. Do not bake Pi-only or Docker-only law into this model.

## Out of S1

Domains, TLS, Compose project layout, image registry, node communication mechanism, backup implementation, upgrade implementation, billing, and S2 boot checklist details.

## Next

[[SaaS-Milestones]] **S2**, **S3**, and **S4** are Successful. Boot steps: [[S2-Hand-Boot-Checklist]]. Observe: [[S3-Control-Plane-Runbook]]. Provision: [[S4-Provision-Runbook]]. Do not start S5 until Scott asks.

Real Renzo is not a Customer in this model. Strategic Insights Consulting, LLC is laptop-provisioned (S4 proof, not a public hostname). Scott’s sister’s business is not provisioned. The S2 lab `lab-acme` is a proof environment, not a paying customer.
