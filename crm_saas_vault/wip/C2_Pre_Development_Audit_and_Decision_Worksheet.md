---
type: note
status: current
area: process
updated: 2026-09-14
aliases:
  - C2 worksheet
  - C2 pre-development audit
tags:
  - wip
  - saas
  - decisions
  - c2
---

# C2 — Pre-Development Audit and Decision Worksheet

WIP communication. **Not** the project map. **Not** a work order. Recorded owner decisions do **not** authorize implementation.

Cursor may change product, Control Plane, Core, or schema only after a separate active [[Work-Order-Protocol]] work order, or Scott’s explicit ask in that later chat.

C2 is **Sales vertical as second Core consumer + Control Plane product catalog**, including the **minimal D1 Product Instance layer** so one Customer Account can own Martial Arts and Sales. Sales CRM capability through B2 already exists. C2 is **not** “build the Sales CRM.” C2 is **not** Option C (full multi-instance account-management redesign). C2 is **not** Strategic Insights cutover.

Owner decisions **C2-01 through C2-06** were approved **2026-09-14**. This file is **planning-ready**. ChatGPT may draft a Work Order from it. Drafting still does **not** authorize implementation.

---

## 1. Purpose / status

| Field | Value |
|---|---|
| Date | 2026-09-14 |
| Owner decisions recorded | **2026-09-14** |
| Repository | `Koifish95/crm_marketing_saas` |
| Branch | `working` |
| HEAD at inspect (this update) | `b3dd62c95b514d4cadbf9843e33afbbed1d7b4c5` |
| S-track | S0–S6 **Successful**. S7–S11 **not started** |
| C-track | C1 **code-shipped**. C2A / C2B / B1 / B2 **Successful**. **C2 / C3 not started**. D1 schema **not shipped** (C2 will ship **minimal** D1 when authorized) |
| Implementation authorization | **None.** `authorization.active_work_order: null`. **C2 is not authorized.** |
| Purpose | Architecture/product audit plus recorded owner decisions for a future C2 Work Order. |
| This document | **Decision record + reconciled plan.** Still **not** a work order. Still **not** implementation authorization. |
| Owner-review state | **DECISIONS COMPLETE — Planning-ready.** C2-01 B, C2-02 B, C2-03 A, C2-04 A, C2-05 A, C2-06 A. |

### Decision summary (2026-09-14)

| ID | Decision |
|---|---|
| **C2-01** | **B** — Minimal D1 ships in C2 (`product_instances`; backfill existing rows; do not aesthetically rename live env identities) |
| **C2-02** | **B** — C2 Successful must prove one Customer Account owning Martial Arts **and** Sales (PROD+DEV each). Disposable test data. **Not** SI migration. **Not** by mutating an important existing MA environment |
| **C2-03** | **A** — Hybrid catalog: DB stores product id on the Product Instance; CP **code** owns executable product definition |
| **C2-04** | **A** — No Campaign / public-capture Core promotion |
| **C2-05** | **A** — Explicit product selection. UX is Account → Add Product Instance → Select Product. Creating a Customer does **not** choose its one product |
| **C2-06** | **A** — New Sales image `crm-sales:c2`. Do not rename/retag existing MA images |

The first draft of Parts D/F/G assumed C2-01 A + C2-02 A (thin catalog, Sales-only new customer). **Those assumptions are rejected.** Parts B–H below are reconciled to **C2-01 B + C2-02 B**.

---

## 2. Canonical baseline (Git wins)

Inspected 2026-09-14 on `working` at `b3dd62c` (dirty: `.obsidian/workspace.json` only; not used). Implementation state is unchanged from the audit: C2 still **not started**.

| Source | Fact |
|---|---|
| [[Current-State]] / [[project-state.yaml]] | B2 **Successful**. C-track `next: C2`. C2 **not started**. `authorization.active_work_order: null`. `d1_schema: not_shipped`. SI not migrated. |
| [[SaaS-Milestones]] | C2 = “Sales vertical as second Core consumer + CP product catalog” — **Not started**. |
| [[SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain]] | D1 **accepted**, schema **not implemented**. Target: Account → Product Instance → Environments. One PROD per **instance**. |
| [[Customer-Environment]] | Same target. Implemented: `customers` + `environments` only; one PROD per **customer row**; `industry_template` always `martial-arts`. |
| [[ADR-CRM-Core-Vertical-Architecture]] | Product identity is first-class on the Product Instance (ADR-18). Do not infer product only from image names. |
| [[Work-Order-Protocol]] | This worksheet **never** authorizes implementation. |

Lockfile C-track `last_successful: C2B` remains **intentional**. B2 is SI Sales, not C2.

---

# Part A — Current-state findings

Unchanged as **implementation truth**. C2 has not been coded. Summary of the 2026-09-14 audit:

- **Core** (`@crm/core`): Nuxt layer — brand/app-env/health helpers, auth/users/RBAC **services**, settings KV + registries, shell/nav/public-path frameworks, eight Core tables. No HTTP routes, no migrations, no CP integration. Vertical → Core only.
- **Martial Arts**: provisionable via CP. Image `martial-arts-acquisition:s4` (lab `:s2`). Repo-root Dockerfile. Volumes `{slug}-sqlite` / `{slug}-assets`. Health `GET /api/health`. Domain stays vertical.
- **Sales**: local `:5040` only. No Docker. Proposal files under `data/proposals/`. Health already Core-shaped. Domain through B2 stays vertical.
- **Control Plane**: `customers` + `environments` + `hosting_nodes` + `environment_backups`. No `product_instances`. New customer always inserts `industryTemplate: 'martial-arts'` and `{customer}-prod` / `{customer}-dev`. One-PROD is `assertOneProdPerCustomer`. Upgrade siblings are **all environments of the customer**. Backup zips sqlite + `/app/data/uploads` only. Ports 52200–52999 (lab-acme 52040/52050).

Lab identities that the future Work Order must **preserve**:

| Env slug | Container | Volumes | Image | Ports |
|---|---|---|---|---|
| `lab-acme-prod` / `lab-acme-dev` | `lab-acme-*-app` | `lab-acme-*-sqlite` / `-assets` | `martial-arts-acquisition:s2` | 52040 / 52050 |
| Provisioned MA (e.g. SI laptop) | `{slug}-app` | `{slug}-sqlite` / `{slug}-assets` | `martial-arts-acquisition:s4` | 52200+ |

Live `control_plane/data/control-plane.sqlite` is gitignored and may contain extra rows. Backfill must be written against **schema + seed + that live file**, without requiring those rows to be deleted.

---

# Part B — Gap analysis (reconciled to C2-01 B + C2-02 B)

What blocks Control-Plane-managed Sales **and** a real Product Instance model.

| Gap | Evidence | Blocks C2? |
|---|---|---|
| No `product_instances` table; env rows hang off `customer_id` only | `control_plane/server/database/schema.ts` | **Yes** (C2-01) |
| One-PROD invariant is per **customer** | `assertOneProdPerCustomer` in `provision-registry.ts` | **Yes** — would forbid a second product’s PROD on the same account |
| Env slug `{customer}-{type}` is globally unique | `environments_slug_unique`; `environmentNames()` | **Yes** — a second product cannot also be `{customer}-prod` |
| Extra-env slug `{customer}-{label}` | `extraEnvironmentNames()` | **Yes** if two instances add the same label |
| New customer **is** MA provision | `createCustomerWithDefaultEnvironments` + `customers/new.vue` | **Yes** (C2-05) — must become Account first, then Add Instance |
| `industry_template` unused, always `martial-arts`, NOT NULL | schema + insert | **Yes** as source of truth; keep only as migration leftover |
| Upgrade sibling check is **all envs of the customer** | `fleet-backup.ts` `siblings = fleet.filter(item => item.customer.id === row.customer.id)` | **Yes** — MA DEV on `:s4` would block Sales PROD upgrade to `crm-sales:c2` |
| No Sales Docker image / compose / entrypoint | no `sales_template/Dockerfile` | **Yes** |
| CP image/Dockerfile/template hard-wired to MA | `PROVISIONED_IMAGE`, `imageBuildArgs`, `templateRoot()` | **Yes** |
| Sales proposals not in fleet backup | `data/proposals/` vs `/app/data/uploads` | **Yes** |
| Env branding `"{displayName} Acquisition"` | `provision-env.ts` | **Yes** for Sales identity |
| Health contract / Core consumption / Sales CRM domain | already exist | No |
| SI cutover / copy-down / Beauty | out of scope | No |

---

# Part C — Core-promotion matrix

Unchanged. **C2-04 = A** is now **recorded**, not pending.

Campaigns / tracking / public intake remain **vertical-owned**. Conceptual similarity is noted for a **later** comparison. C2 does not extract them into Core.

---

# Part D — Proposed C2 architecture (minimal D1 + hybrid catalog)

```text
Customer Account
    │
    ├── Product Instance (product_id = martial-arts)
    │       ├── PROD
    │       └── DEV
    │
    └── Product Instance (product_id = sales)
            ├── PROD
            └── DEV
```

Operator path (C2-05):

```text
Create Customer Account   (no product, no environments)
    → Add Product Instance → Select Product (required)
        → provision that instance’s PROD + DEV
```

One account may then receive a second Add Product Instance for the other product. **C2 Successful** uses a **new disposable** account for that proof. Do not attach Sales to Strategic Insights or rebuild lab-acme to demonstrate it.

This is **not** Option C: no second Martial Arts instance per account, no Smith Holdings account-management product, no billing.

## D1. Schema (smallest coherent)

Add `product_instances`. Attach environments to an instance. Keep `environments.customer_id` as denormalized account pointer (must stay consistent with the instance’s account) so existing queries do not have to be rewritten blindly.

**Recommended `product_instances` (names are implementation-flexible):**

| Column | Role |
|---|---|
| `id` | Stable instance UUID (permanent) |
| `customer_id` | Parent account |
| `product_id` | Stored catalog key: `martial-arts` \| `sales` (not inferred from image) |
| `display_name` | Instance label (backfill: customer display name) |
| `slug` | Instance slug, unique per account (backfill: may equal customer slug for the sole MA instance) |
| `created_at` | |

**Recommended uniqueness**

- `(customer_id, product_id)` unique in C2 — at most one Martial Arts instance and one Sales instance per account. A second instance of the **same** product is Option C and out of C2.
- `environments.slug`, `container_name` remain globally unique.

**Environments**

- Add required `product_instance_id` (after backfill).
- Keep `customer_id`, runtime fields, volumes, image, ports.
- One `type = PROD` per **product_instance_id** (replace `assertOneProdPerCustomer`).
- Extra non-PROD remains allowed **on that instance**, same product.

**`customers.industry_template`**

- Stop using it as provision selector.
- After backfill it is leftover. For new account-only rows (zero instances) it cannot stay a real product id. Future Work Order should use the smallest change (nullable column **or** sentinel such as `unassigned`). Do not keep writing `martial-arts` on accounts that have no MA instance.

**`environment_backups`**

- Keep keyed by `environment_id`. Paths `data/backups/{customerSlug}/{environmentSlug}` still work if env slugs stay unique and unchanged for backfilled rows.

## D2. Backfill / migration (must protect live identities)

For **each existing customer row**:

1. Insert one `product_instances` row: `product_id = martial-arts` (from today’s `industry_template`, which is always that value in code/seed).
2. Point every existing environment of that customer at that instance.
3. **Do not rename** `slug`, `container_name`, `compose_project`, `sqlite_volume`, `assets_volume`, `host_port`, `expected_image`, `health_url`, `access_url`, compose files, or lab isolation markers.

So `lab-acme-prod` stays `lab-acme-prod` / `lab-acme-prod-app` / `lab-acme-prod-sqlite` / image `:s2` / ports 52040. Provisioned MA `{customer}-prod` stays as-is.

**New** instances (after D1) must **not** reuse `{customer}-prod` if that slug is taken. Naming for **new** environment rows:

```text
{customerSlug}-{productId}-{type}
```

Examples on a disposable proof account `c2-proof`:

| Instance | PROD slug | DEV slug |
|---|---|---|
| Martial Arts (new) | `c2-proof-martial-arts-prod` | `c2-proof-martial-arts-dev` |
| Sales (new) | `c2-proof-sales-prod` | `c2-proof-sales-dev` |

Do **not** force backfilled MA rows into the `{productId}` scheme. Dual naming (legacy `{customer}-{type}` vs new `{customer}-{productId}-{type}`) is the safe migration. Document it in the Work Order as a hard protection.

Seed (`lab-seed.ts`, `seed.ts`) must create the backfilled MA instance so empty CP databases and live sqlite both boot.

## D3. Hybrid product catalog (C2-03 A)

**Code** (e.g. `control_plane/server/products/`): executable definition. **Database**: `product_instances.product_id` only.

| Field in code | Martial Arts | Sales |
|---|---|---|
| `id` | `martial-arts` | `sales` |
| Display name | Martial Arts | Sales |
| Template root | `martial_arts_template/` | `sales_template/` |
| Dockerfile | existing MA Dockerfile | new Sales Dockerfile (repo-root `COPY packages/crm-core`) |
| Compose | existing `docker-compose.provisioned.yml` (lab compose files stay lab-only) | new Sales `docker-compose.provisioned.yml` |
| Image | **unchanged** `martial-arts-acquisition:s4` (lab `:s2`) | **`crm-sales:c2`** (C2-06) |
| Health | `/api/health` | `/api/health` |
| Container port | 5000 | 5000 |
| SQLite | `/app/data/sqlite/crm.sqlite` | `/app/data/sqlite/crm.sqlite` (laptop Sales stays `./data/app.sqlite`) |
| Assets | `/app/data/uploads` | `/app/data/uploads` + `SALES_PROPOSALS_DIR=/app/data/uploads/proposals` |
| Env render | current MA lines | product-specific; no forced “Acquisition” |
| Init | existing MA runtime-init | Sales migrate + existing Sales seed |

Beauty is **not** a catalog entry. Do not load products from sqlite config. Do not infer `product_id` from `expected_image`.

## D4. Sales Docker (MA Docker untouched)

New: `sales_template/Dockerfile`, `docker/entrypoint` migrate+seed, `docker-compose.provisioned.yml`. Filter package `sales-crm`. Named volumes follow the **environment slug**, not a global `sales-prod`.

Laptop `pnpm dev` :5040 remains. Provisioned Sales uses allocated **52200–52999**.

## D5. Lifecycle (instance-scoped)

| Operation | C2 rule |
|---|---|
| Observe / health / relaunch / start / stop | Unchanged mechanism; keyed by registered env. Compose cwd + image from **instance product**, not MA constants |
| Extra non-PROD | Created on a **product instance**, same product, instance-qualified slug |
| One PROD | Per **product instance** |
| Backup / restore / off-host copy | Still sqlite + uploads. Sales PDFs must live under uploads |
| Upgrade | Rebuild **that product’s** Dockerfile. Sibling “upgrade non-PROD first” uses **instance siblings only**, not the whole account. Acme `:s2` exemption remains **lab-compose / that instance**, not “any MA env on the account” |
| Decommission | Existing gated env/customer decommission stays; do not invent a new instance-decommission product in C2. Do not decommission lab-acme or SI as part of C2 QA |

Host ports: one pool 52200–52999 for all products. Proof account needs **four** ports.

## D6. Operator UI (minimal, not Option C)

- **New customer:** account fields only (display name, slug, timezone, admin email). **No** product picker. **No** automatic PROD+DEV.
- **Customer workspace:** list Product Instances; **Add Product Instance** with **required** product select (Martial Arts \| Sales; no Beauty; no silent MA default). Creating the instance provisions its default PROD+DEV.
- Refuse Add Product Instance if that `product_id` already exists on the account.
- Environment table/workspace shows **which instance/product** an env belongs to.
- Extra non-PROD stays, but is attached to an instance.
- Do not build a general “move instance between accounts” or “clone business” UI.

## D7. What this does not do

- Core domain promotion; Beauty; SI migration/cutover; copy-down; VPS/DNS; operator auth; renaming MA images; Option C multi-MA-instances; billing.

---

# Part E — Decision register

Owner-approved **2026-09-14**. Original options remain as history. Implementation must follow the **Decision** line, not the old Cursor recommendation where they differ (C2-01, C2-02).

---

### C2-01 — How deep is product identity in C2?

**Question:** Thin catalog (one product per customer row) vs minimal D1 vs full Option C UX.

**Why it matters:** `{customer}-prod` and one-PROD-per-customer cannot host two products. D1 is accepted law but was unshipped.

**Current evidence:** `customers` + `environments` only.

**Decision (2026-09-14): B — Minimal D1 ships in C2.**

Add `product_instances`. Backfill existing customers/environments as one Martial Arts instance **without** renaming live env/container/volume identities. One PROD per instance. **Not** Option C.

- [ ] A — thin catalog; defer D1 schema
- [x] **B — minimal D1 in C2**
- [ ] C — full D1 + multi-instance management redesign

**Scott must decide before implementation:** Resolved.

---

### C2-02 — Multi-product proof

**Question:** Is a Sales-only new customer enough, or must one account own both products?

**Why it matters:** Requires C2-01 B. Must not be proven by cutting over SI or breaking lab-acme.

**Current evidence:** Customer workspace adds extra non-PROD of the implied MA product only.

**Decision (2026-09-14): B — C2 Successful must prove multiple products under one Customer Account.**

Required shape (disposable/local test data):

```text
Test Customer
├── Martial Arts Product Instance
│   ├── PROD
│   └── DEV
└── Sales Product Instance
    ├── PROD
    └── DEV
```

Do **not** migrate Strategic Insights. Do **not** modify or decommission an important existing Martial Arts environment merely to demonstrate this. Implement Add Product Instance on accounts generally; **QA** uses a **new** throwaway account, not SI/lab-acme as the canvas.

- [ ] A — new Sales-only customer is enough
- [x] **B — same account must own MA + Sales**

**Scott must decide before implementation:** Resolved.

---

### C2-03 — Where the product catalog lives

**Decision (2026-09-14): A — Hybrid.**

DB persists Product Instance `product_id`. Control Plane **code** owns executable definition (id, display name, image, Dockerfile/build, compose/runtime, container port, health, init, persistent storage, product-specific env). No DB plugin catalog. No inferring product from image names.

- [x] **A — hybrid**
- [ ] B — DB-defined catalog
- [ ] C — infer from image name

**Scott must decide before implementation:** Resolved.

---

### C2-04 — Reopen D3/D4 inside C2?

**Decision (2026-09-14): A — No Campaign/public-capture promotion.**

MA and Sales remain vertical-owned. Similarity may be observed later; not enough domain equivalence for Core now. C2 stays Product Instance / catalog / provisioning.

- [x] **A — do not promote**
- [ ] B — promote during C2

**Scott must decide before implementation:** Resolved.

---

### C2-05 — Product selection

**Decision (2026-09-14): A — Explicit product selection required.**

When creating a Product Instance, the operator must select the product. Do not silently default to Martial Arts. UX is **Customer Account → Add/Create Product Instance → Select Product**, not “New customer implies one product.”

- [x] **A — required picker on Add Product Instance**
- [ ] B — default MA

**Scott must decide before implementation:** Resolved.

---

### C2-06 — New Sales image name (MA tags frozen)

**Decision (2026-09-14): A — `crm-sales:c2`.**

Do not rename/retag existing Martial Arts images. Those identities are a regression boundary.

- [x] **A — `crm-sales:c2`**
- [ ] B — `sales-crm:s4`

**Scott must decide before implementation:** Resolved.

---

### Newly discovered owner decisions

**None.** Dual env-slug schemes, instance-scoped upgrade, `(customer_id, product_id)` uniqueness, leftover `industry_template`, and proposal-on-uploads are **implementation constraints** (Part D / below), not new Scott questions.

---

### Implementation constraints (Work Order must protect)

Not owner decisions. Future implementation must state these as hard stops:

1. Do not rename existing environment `slug` / `container_name` / `compose_project` / volume names / host ports / `expected_image` for lab-acme or already-provisioned MA customers (including SI laptop rows).
2. Dual env naming: backfilled `{customer}-{type}` stays; **new** instances use `{customer}-{productId}-{type}`.
3. Upgrade “non-PROD first” and image compare **must** be per **product instance**, not per customer. Otherwise MA DEV blocks Sales PROD upgrades (today’s `siblings` filter).
4. `imageBuildArgs` / `templateRoot` / compose file must come from the instance’s `product_id`, including upgrade rebuilds.
5. At most one instance per `(customer_id, product_id)` in C2.
6. Sales proposal artifacts must be inside the assets/uploads volume so S6 backup/restore include them without a third volume type.
7. Do not decommission, rebuild, or retag lab-acme or SI to “make room.” Proof account is new and disposable.
8. Do not `down -v`, prune, or attach Renzo/`webhosting_renzo_*` volumes.
9. Control Plane stays out of the pnpm workspace.
10. Existing S4/S5/S6 tests that assume New customer = MA pair **will break** and must be rewritten around Account + Add Instance; that is expected, not a reason to keep the old UX.

### Not asked (still recommendations)

- Laptop Sales `:5040` stays; provisioned container port 5000.
- Provisioned sqlite filename `crm.sqlite`; local Sales `app.sqlite`.
- Sales container seed = existing Sales seed (admin, access, sources).
- No PROD→DEV copy-down in C2.
- Fix CP env render per product; do not require neutralizing Core brand defaults as a C2 gate.
- No Beauty catalog entry.
- No Core extraction of auth pages / `security-audit` in C2.

---

# Part F — Proposed C2 Successful criteria

Assumes recorded decisions (minimal D1 + multi-product proof). Scott marks **Successful** only after owner QA. Code existing is not Successful.

## F1. Owner / browser QA

Control Plane http://127.0.0.1:52100. Use a **new disposable** Customer Account (not Strategic Insights, not lab-acme as the proof canvas).

1. **Account ≠ product.** Operator creates a Customer Account with **no** environments and **no** implied product.
2. Operator **Add Product Instance**, **must** choose Martial Arts (no silent default, no Beauty). That instance receives isolated **PROD + DEV**.
3. On the **same** account, operator **Add Product Instance**, **must** choose Sales. That instance receives its own **PROD + DEV**.
4. Four environments exist: MA PROD/DEV + Sales PROD/DEV. Slugs/containers/volumes/**host ports** do not collide. Each has independent sqlite + assets.
5. Both products become **healthy** (container running **and** `/api/health` with reachable database).
6. Operator opens MA `accessUrl` and sees the Martial Arts app (not Sales). Opens Sales `accessUrl`, logs in (`admin` / `setup`, must-change), and sees the Sales CRM (Companies/Opportunities/Proposals — not MA households/`ADULT_BJJ`).
7. Sales Relaunch keeps volumes. Sales Backup/Restore includes **proposal artifacts**. Start/Stop do not set `decommissioned` and never `-v`.
8. Sales **Upgrade** builds/selects **`crm-sales:c2`**, not `martial-arts-acquisition`. Upgrading Sales does not require MA DEV to be on the Sales image.
9. **MA regression:** lab-acme (and any provisioned MA customer including SI) still observe/relaunch/backup with **unchanged** slugs, containers, volumes, ports, and MA images. Adding a second PROD on a backfilled MA instance is still refused. Extra non-PROD on an instance still cannot be PROD.
10. Backfill: after C2 ships, existing env identities still match pre-C2 names (Part D2). Operator can see those envs attached to a Martial Arts Product Instance.
11. Choosing Sales does not seed MA programs. Choosing MA does not create `sales_proposals`.
12. Local Sales http://localhost:5040 still runs independently.
13. **No** Strategic Insights production migration. **No** Beauty. **No** MA image retag.

## F2. Automated verification (implementation acceptance, not Successful)

- CP: `product_instances` exist; existing seed/lab rows backfill; one-PROD per instance; unique `(customer_id, product_id)`; cannot insert a second `{customer}-prod` for a new product.
- Create customer does **not** insert environments; Add Instance with required `product_id` does.
- MA catalog path still builds `martial-arts-acquisition:s4` from the MA Dockerfile. Sales path builds `crm-sales:c2` from the Sales Dockerfile.
- Upgrade sibling gate is instance-scoped (regression test: MA DEV on `:s4` does not block Sales PROD to `crm-sales:c2`).
- Backup zip for a Sales env contains sqlite **and** proposal files under uploads.
- `sales_template` lint/typecheck/build/test still pass; Core ↛ verticals; Sales ↛ MA.
- No `docker compose down -v` in new paths.

## F3. Intentionally deferred (not C2 Successful)

Option C (multiple instances of the same product; rich account management). Copy-down. Core promotion. Beauty. SI migration. E-sign, email, portal, billing. S7/S8. Operator login. Image registry. Renaming MA images to `crm-martial-arts`. Moving templates under `apps/`. Instance-level decommission product. Making `industry_template` a long-term API.

---

# Part G — Proposed implementation slices

Not authorized. Safer order given current CP coupling: **do not** flip New-customer UX before schema backfill; **do not** point CP at Sales before a Sales image exists.

| Slice | Intent | Notes |
|---|---|---|
| **C2-S1** | Sales Docker runtime | Dockerfile, provisioned compose, volumes, entrypoint migrate+seed, in-container health. Prove with **manual compose**. MA Docker **untouched**. Image tag **`crm-sales:c2`**. |
| **C2-S2** | Minimal D1 schema + backfill | `product_instances`; `environments.product_instance_id`; seed + live-sqlite-safe migration; **do not rename** existing env identities; one-PROD **per instance**; extra-env attached to instance. Temporarily, New customer may still create a MA instance so the fleet is never “account with dangling envs.” |
| **C2-S3** | Hybrid catalog + product-aware lifecycle | Code-defined products. `templateRoot` / `imageBuildArgs` / compose / env render / **upgrade rebuild** keyed by instance `product_id`. Instance-scoped upgrade siblings. |
| **C2-S4** | Operator UX (C2-05) | Create Customer Account with **zero** envs. **Add Product Instance** with **required** product select. Remove implicit MA provision from New customer. Rewrite S4/S5 tests that assumed the old couple. |
| **C2-S5** | Sales provision + backup parity | Add Sales instance → PROD+DEV, `crm-sales:c2`, `SALES_PROPOSALS_DIR` on uploads, backup/restore proof. |
| **C2-S6** | Multi-product proof + MA regression + owner QA | New disposable account with MA **and** Sales. lab-acme/SI identities unchanged. Automated suite + Scott’s F1 list. |

S2’s temporary MA shim is removed in S4. Do not ship S4 without S2 backfill. Do not mix Option C into any slice. Stop after each slice. Do not start S7, Beauty, or SI cutover.

If a single Work Order covers several slices, it must still sequence **schema/backfill before UX split** and **Sales image before Sales provision**.

---

# Part H — Forbidden / deferred scope

- Additional Sales CRM features; Proposal expansion; public signing; e-sign; CRM email; customer portal
- Billing / invoicing / Stripe; self-service signup
- Beauty implementation or Beauty catalog entry
- Strategic Insights production migration / cutover
- VPS; S7 hosting/security/remote nodes; S8 DNS/TLS/public hostnames
- Generalized plugin architecture; arbitrary third-party vertical loading
- Premature multi-region / orchestration
- Core promotion of leads, campaigns, public capture, auth pages
- Option C: multiple instances of the same product; account-management redesign
- Renaming/retagging existing Martial Arts images or lab-acme/SI env identities
- Using lab-acme or SI as the multi-product proof canvas
- `docker compose down -v`, prune, Renzo/`webhosting_renzo_*` volumes
- Control Plane operator auth (NEAR-04)

---

## What Scott / ChatGPT should do next

1. Read **this finalized worksheet** from Git (decisions C2-01 B … C2-06 A).
2. ChatGPT may **draft** a C2 implementation Work Order that names these decisions, the backfill protections, and instance-scoped upgrade. Drafting still does **not** authorize implementation until the work order is in git with `authorized: yes` (or Scott pastes it into a Cursor chat).
3. Do not start C2 implementation from this worksheet.
