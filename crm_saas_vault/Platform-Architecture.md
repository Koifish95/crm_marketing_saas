---
type: note
status: current
area: architecture
updated: 2026-09-19
aliases:
  - ARCHITECTURE
  - Platform architecture
tags:
  - saas
  - architecture
---

# Platform architecture

Live **platform** architecture for `crm_marketing_saas`. This is not the Renzo gym stack; that evidence stays in [[Architecture]].

Law: [[ADR-Product-Owned-Domains-Shared-Foundation]]. Historical Core+vertical ADR (partially superseded): [[ADR-CRM-Core-Vertical-Architecture]]. Index: [[SaaS-Decisions]]. Domain unit: [[Customer-Environment]]. Operator app: [[Control-Plane]]. Hosting node: [[Hosting-Node-Architecture]]. What exists now: [[Current-State]].

Do not treat this note as a work order. Implementation requires [[Work-Order-Protocol]].

---

## Product shape

```text
Platform → Industry Template → Customer Instance → Enabled Capabilities → Configuration
```

Long-term direction: an ultra-general marketing, lead-generation, and CRM platform for SMBs. First industry variant: Martial Arts. First intended pilots: Strategic Insights (laptop-provisioned, disposable) and Scott’s sister’s business (not provisioned). Real Renzo is **not** a customer.

---

## Target hierarchy (accepted D1; minimal shipped in C2)

```text
Customer Account / Organization
    └── Business / Product Instance   (exactly one product)
            └── Environments
                    ├── exactly one Type = PROD
                    ├── default one DEV
                    └── zero or more additional non-PROD

Hosting Node
└── zero or more Environments         (placement, not ownership)
```

- One account may own multiple product instances; instances may use different products.
- Each instance has exactly one product. All of its environments share that product.
- PROD and DEV under one instance may **not** be different products.
- Switching products is not a normal env config change.

**Shipped (C2 Successful, 2026-09-15):** `customers` + `product_instances` + `environments`. One account may own Martial Arts and Sales instances. One PROD per **product instance**. `industry_template` is a migration leftover (`unassigned` on new accounts with no MA instance). See [[Customer-Environment]].

**Hosting node (2026-09-19, not official S7/S8):** Control Plane co-located with local Docker on `laptop` or `vps`. Public hostname is PROD environment configuration. Generated nginx edge. Loopback Control Plane + SSH tunnel. See [[Hosting-Node-Architecture]].

Older notes may say “vertical” for the same idea (product identity on the instance). That does **not** mean “CRM Core vertical composition.”

---

## Products + shared foundation

```text
                       Control Plane
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
        Martial Arts       Sales        Beauty
         Product App    Product App    Product App
              \             |             /
                    Shared Foundation
                    (today: @crm/core)
```

| Topic | Rule |
|---|---|
| Foundation purpose | Shared **application** infrastructure, not a sellable Generic CRM and not a shared CRM domain model |
| Products | Independently owned apps: domain, schema, **complete migration journal**, pages, workflows, image, release |
| Composition | Products may `extends` `@crm/core` for shell/auth/users. Not class inheritance, not file-override forks, not one universal image |
| Dependency | Product → Foundation. Foundation ↛ product. Product A ↛ Product B. Mechanically enforced |
| Foundation UI | Shell, nav **framework**, primitives. Products own pages (login/users copies today are acceptable) |
| Settings / RBAC | Foundation owns frameworks + staff-user tables. Products own permission catalogs and settings sections |
| Extension | Intentional registration contracts only. No generic plugin framework |
| Migrations | **Each product owns the full journal.** Foundation may export table definitions; it does not run `migrateCore()` first |
| Versioning | Product / image identity is what the Control Plane records. Foundation package version is not a CP deployment axis |
| Regression | A foundation-package change runs the suites of products that depend on it |
| Duplication | Prefer product-owned duplication to speculative shared domain |
| Promotion | Default **No**. Extract only when multiple real products need substantially the same behavior and the contract is clean. Similar names are not enough |
| Sequence | Martial Arts and Sales already exist. Beauty, when authorized, is another independent product — not a Core-proof exercise |

**D2–D4 (modified 2026-09-17):** Martial Arts `leads` / trials, campaigns / events, and public capture stay **product-owned**. Sales shipped different Lead, Campaign, activity, and intake models. Do not promote those into the foundation.

C1 is **code-shipped** (`packages/crm-core` as the foundation package). C2A–B2 and C2 are **Successful**. Do not “establish Core” again. Do not grow `@crm/core` into generic Leads/Campaigns. Package rename is not authorized.

The original Core+vertical extraction narrative is historical and not a license: [[history/CRM_Core_Extraction_Implementation_Plan]].

---

## Control plane

Separate operator app: `control_plane/` at http://127.0.0.1:52100. Not another customer admin page and not the platform owner’s CRM.

It lists customers/environments, observes up/down (container running **and** `/api/health`), relaunches without destroying volumes, provisions a Martial Arts or Sales PROD+DEV pair, and runs fleet lifecycle (backup, selectable restore including same-product PROD→DEV copy-down, off-host copy, upgrade, start/stop).

Operational chain: Customer → Product Instance → Product/Build → Docker image → Environment → Hosting Node → Port (DNS/TLS later). The Control Plane does **not** need to know a product’s internal domain, how much source products share, or a foundation package version.

Not in the pnpm workspace. No operator login. Loopback only. Details: [[Control-Plane]].

---

## Hosting contract (current)

Laptop Docker is the only runtime. Production VPS, image registry, operator auth, DNS/TLS, and remote nodes are **not** implemented. Official S-track still names those S7/S8; product family locally first remains C-track *priority*, not a rewrite of S7. State both.

Safety: never `docker compose down -v`, never prune, never attach `webhosting_renzo_*` / leftover `renzo-*` volumes.
