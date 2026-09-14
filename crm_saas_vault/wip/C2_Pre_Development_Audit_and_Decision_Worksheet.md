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

WIP communication. **Not** the project map. **Not** a work order. Checking boxes records Scott’s decisions. It does **not** authorize implementation.

Cursor may change product, Control Plane, Core, or schema only after a separate active [[Work-Order-Protocol]] work order, or Scott’s explicit ask in that later chat.

C2 is **Sales vertical as second Core consumer + Control Plane product catalog**. Sales CRM capability through B2 already exists. C2 is **not** “build the Sales CRM.”

---

## 1. Purpose / status

| Field | Value |
|---|---|
| Date | 2026-09-14 |
| Repository | `Koifish95/crm_marketing_saas` |
| Branch | `working` |
| HEAD at this write | `653a69ac22f529ad431e1c593723893fe24fbbc9` |
| S-track | S0–S6 **Successful**. S7–S11 **not started** |
| C-track | C1 **code-shipped**. C2A / C2B / B1 / B2 **Successful**. **C2 / C3 not started**. D1 schema **not shipped** |
| Implementation authorization | **None.** `authorization.active_work_order: null`. **C2 is not authorized.** |
| Purpose | Determine what C2 actually needs now that Sales exists through B2. Surface real owner decisions. |
| This document | **Audit + decision worksheet.** Still **not** a work order. Still **not** implementation authorization. |
| Owner-review state | **AWAITING SCOTT / CHATGPT DECISIONS** (C2-01 through C2-06) |

---

## 2. Canonical baseline (Git wins)

Inspected 2026-09-14 on `working` at `653a69a` (dirty: `.obsidian/workspace.json` only; not used).

| Source | Fact |
|---|---|
| [[Current-State]] / [[project-state.yaml]] | B2 **Successful** (owner accepted 2026-09-13). C-track `next: C2`. C2 **not started**. `authorization.active_work_order: null`. `c2_not_authorized_by_b2: true`. D1 accepted, schema not shipped. SI not migrated. S7 not started. |
| [[SaaS-Milestones]] | C2 = “Sales vertical as second Core consumer + CP product catalog” — **Not started**. |
| [[SaaS-Decisions#2026-09-13 — Official SI Sales B2 is Successful]] | B2 closed. C2 unchanged and not started. |
| [[history/B2_closeout]] | C2 remains separate and unauthorized. |
| [[Work-Order-Protocol]] | This worksheet **never** authorizes implementation. |
| [[ADR-CRM-Core-Vertical-Architecture]] | Vertical → Core only. D1 product instance is target. Promotion default **No until justified**. |
| [[Customer-Environment]] | Target: Account → Product Instance → Vertical → PROD+DEV. Implemented: `customers` + `environments` only. |

### Confirmed against this prompt

The prompt’s assumptions match Git:

- SI Sales B2 is Successful.
- C2 is next C-track work.
- C2 is not started.
- C2 is not currently authorized.
- There is no active Work Order.

Lockfile C-track `last_successful: C2B` is **intentional**. B2 is SI Sales, not C2. Do not treat B2 Successful as C2 Successful.

### Git discrepancies (stale current-map sentences; not used as law)

These notes lag [[Current-State]]. Git/Current-State win.

| Note | Stale wording | Truth |
|---|---|---|
| [[Home]] “Where development stands” | Mentions C2A Successful; omits B1/B2 Successful in that paragraph | B1 and B2 are Successful. C2 still not started. |
| [[ADR-CRM-Core-Vertical-Architecture]] §2 | “C2 / D1 schema / Slice B are not started” | Slice B B1/B2 **are** Successful. C2 and D1 schema still not started. |
| [[SaaS-Open-Questions]] DEF-01 | “C2A or C2B success does not authorize C2 or Slice B” | Slice B B1/B2 already closed. C2 still unauthorized. |
| [[project-state.yaml]] `head_at_write` | `dae437a` (B2 closeout) | HEAD is stamp `653a69a`. Harmless lockfile lag. |

Do not silently follow older C2 extraction narratives ([[history/CRM_Core_Extraction_Implementation_Plan]]) where they still describe “introduce Sales” as C2. Sales already exists.

---

# Part A — Current-state findings

## A1. CRM Core (`packages/crm-core`, `@crm/core`)

Nuxt **layer** (`extends: ['@crm/core']`), not a runnable CRM and not consumed by Control Plane.

**Already shared correctly**

| Facility | Evidence |
|---|---|
| Framework integration | Empty layer `packages/crm-core/nuxt.config.ts`; workspace dep |
| Branding helper | `shared/utils/brand.ts` (`publicBrand`, `NUXT_PUBLIC_*`) |
| App/env identity | `shared/utils/app-env.ts`, `identity.ts` |
| Health payload | `shared/utils/health.ts` `coreHealthBody` — verticals own `GET /api/health` |
| Auth/users/RBAC **services** | `server/services/auth.ts`, `users.ts`, `access-rights.ts`, `password.ts`, `login-throttle.ts` |
| Settings KV | `server/services/app-settings.ts` + settings **registry** |
| Shell / nav **framework** | `registerNavItems`, layout `app/layouts/internal.vue`, plugin `00.core-shell.ts` |
| Permission catalog registry | `registerAccessRights` — Core ships no vertical right names |
| Public-path extension | `registerPublicPaths` |
| Core tables | `users`, `user_types`, `user_roles`, `user_type_roles`, `user_role_access_rights`, `user_role_assignments`, `security_events`, `app_settings` |

**Boundaries (enforced)**

- Core ↛ Martial Arts / Sales / Beauty: Core eslint + MA/Sales `tests/c1/architecture.test.ts`.
- Sales ↛ Martial Arts: Sales eslint + C2A architecture test.
- Core does **not** import Control Plane (also not named in the forbid list).
- Core has **no** `server/api` routes, **no** pages, **no** migrations, **no** in-package tests.

**Not Core today (and should not become Core merely because both apps have copies)**

- HTTP login/me/logout/users/settings pages and APIs (duplicated per vertical)
- DB connection / `useDb` / Drizzle journals
- Domain CRM (leads, companies, campaigns, proposals, trials, …)
- Customer / product-instance / provisioning
- Neutral brand defaults: Core still defaults to `Martial Arts Acquisition` / `Academy`; layout subtitle hardcodes `Acquisition`

## A2. Martial Arts (`martial_arts_template/`, package `martial-arts-acquisition`)

First Core consumer. Local http://localhost:5030. Laptop Docker host ports 5000/5010/5020. Control Plane provisioned image `martial-arts-acquisition:s4` (lab `:s2`).

**Consumes Core** via `extends: ['@crm/core']`, `lib/register-ma-shell.ts`, `registerPublicPaths` (`/trial`, `/events…`, `/t…`), schema re-export of Core tables.

**Remains vertical-owned:** programs, households (`leads`/`lead_lines`/trials), follow-up, MA campaigns/events/content/assets/Meta, compensation, intro booking, BJJ seed (`ADULT_BJJ` / `KIDS_BJJ`), journal `0000`–`0020`.

**Provisionable today.** Repo-root Docker build (`martial_arts_template/Dockerfile` copies `packages/crm-core`). Compose cwd = template root. Named volumes `{slug}-sqlite` / `{slug}-assets`. Container `PORT=5000`. SQLite provisioned `file:/app/data/sqlite/crm.sqlite`. Uploads `/app/data/uploads`. Entrypoint migrate+seed (`docker/runtime-init`). Health `GET /api/health`. Bootstrap `admin` / `setup` with must-change.

**Accidentally MA-specific in the platform contract (Control Plane, not MA domain):**

- Hard-coded image `martial-arts-acquisition:s4`, Dockerfile path, `TEMPLATE_ROOT` → `../martial_arts_template`
- `industry_template` always written `martial-arts` and never consulted
- Env render `NUXT_PUBLIC_APP_NAME = "{displayName} Acquisition"` (`control_plane/server/services/provision-env.ts`)
- Core `APP_ENV_HOST_PORTS` 5000/5010/5020
- Reserved slug `martial-arts`

## A3. Sales (`sales_template/`, package `sales-crm`)

Second Core consumer. **Local only** http://localhost:5040. **No Dockerfile, no compose, no `docker/`, no CP product.**

**Already proven (not C2):**

| Slice | What |
|---|---|
| C2A | Company / Contact / Opportunity / Activity on Core |
| C2B | Lead, convert, pipeline Proposal/Quote → Decision → Won\|Lost |
| B1 | Sources, Campaigns, Tracking Links, public `/inquire` `/t/{token}`, Offers, commercial lines, Company lifecycle, reporting |
| B2 | Proposal chain, PDFKit PDFs, signed upload, immutable revisions |

**Consumes Core** the same way MA does: `extends`, `lib/register-sales-shell.ts`, `VIEW_SALES` / `MANAGE_SALES`, public paths `/inquire` `/t…`.

**Sales-owned tables:** `sales_accounts`, `sales_contacts`, `sales_leads`, `sales_opportunities`, `sales_activities`, `sales_notes`, `sales_sources`, `sales_campaigns`, `sales_tracking_links`, `sales_offers`, `sales_opportunity_lines`, `sales_public_submissions`, `sales_proposals`, `sales_proposal_revisions`, `sales_proposal_lines`. Journal `0000`–`0003`.

**Runtime that already matches platform health:** `GET /api/health` is the same shape as MA (`coreHealthBody` + `select 1`). Admin seed exists. SQLite default `file:./data/app.sqlite`. Proposal artifacts `./data/proposals` (`SALES_PROPOSALS_DIR`).

**Missing as a platform-managed product:** see Part B.

## A4. Control Plane (`control_plane/`, http://127.0.0.1:52100)

S3–S6 Successful. **Not** in the pnpm workspace. No operator login. Loopback only.

**Schema (no D1):** `customers`, `environments`, `hosting_nodes`, `environment_backups`. **No** `product_instances` table.

**Customer row today** = commercial account **and** the only product instance. Columns include unused `industry_template` (always `'martial-arts'`). Create API **rejects** a product field (`tests/s5/provision-payload.test.ts`).

**Environment row:** `customer_id`, `type` PROD/DEV/STAGE/UAT/TRAINING, `slug` `{customer}-{type}`, `container_name`, `compose_project`, `compose_file`, env files, `health_url` `http://127.0.0.1:{port}/api/health`, `access_url` `http://localhost:{port}`, `sqlite_volume` / `assets_volume`, `expected_image`, `host_port`, `lifecycle_status`.

**Provision path (always MA):**

1. `Customers → New customer` (`app/pages/customers/new.vue`) — display name, slug, timezone, admin email. No product picker.
2. `createCustomerWithDefaultEnvironments` writes `industryTemplate: 'martial-arts'`, allocates two ports in **52200–52999**, inserts PROD+DEV.
3. `ensureLocalImage` builds `-f martial_arts_template/Dockerfile` tag `martial-arts-acquisition:s4`.
4. Compose up from `templateRoot()` + `docker-compose.provisioned.yml`.
5. One-PROD invariant is **per customer row** (`assertOneProdPerCustomer`). Extra envs must be non-PROD.

Lab-acme is seeded on **52040/52050** with image `:s2` and is outside the provision allocator.

**Lifecycle (product-agnostic if compose/image/volumes match):** observe = `docker inspect` + GET registered health URL (`ok` and `database === 'reachable'`); relaunch `up -d --force-recreate --no-deps app`; start/stop compose; backup zip sqlite + `/app/data/uploads`; restore; upgrade rebuilds **MA Dockerfile** after an S6 backup; PROD upgrade waits for non-PROD image match (Acme `:s2` exempt). Never `-v` / prune / `down` on relaunch.

**Backup would miss Sales proposals** unless they live under `/app/data/uploads` (or a volume CP already copies). Current snapshot: `control_plane/server/services/fleet-backup-snapshot.ts`.

**PROD→DEV copy-down** is accepted S1 policy and is **not implemented**. Not an S6 feature. Do not silently add it as C2.

---

# Part B — Gap analysis

What prevents Sales from being a Control-Plane-managed product. Not a Sales CRM feature list.

| Gap | Evidence | Blocks C2? |
|---|---|---|
| No Sales Docker image | No `sales_template/Dockerfile` | **Yes** |
| No Sales compose / named volumes | No `docker-compose*.yml` / `docker/` | **Yes** |
| No container migrate+seed | MA `docker/entrypoint.sh` + `runtime-init`; Sales migrate is host `pnpm db:migrate` | **Yes** |
| CP image/Dockerfile/template hard-wired to MA | `provision-contract.ts` `PROVISIONED_IMAGE`; `provision-runtime.ts` `imageBuildArgs`; `docker-relaunch.ts` `templateRoot()` | **Yes** |
| No product picker | `customers/new.vue` + `customers.post.ts` | **Yes** |
| `industry_template` unused | Always `'martial-arts'` | **Yes** (must become a real selector or be replaced) |
| No D1 product instance | One product per customer row; env slug `{customer}-prod` | Only if C2 Successful requires one account to own MA **and** Sales (C2-01/C2-02) |
| Sales proposals not in fleet backup | `data/proposals/` vs CP `/app/data/sqlite` + `/app/data/uploads` | **Yes** (lifecycle parity) |
| Env branding says “Acquisition” | `renderProvisionedEnv` | **Yes** for honest Sales identity; small |
| Upgrade always rebuilds MA Dockerfile | `upgradeRegisteredEnvironment` | **Yes** for Sales upgrade |
| Local `:5040` vs container `:5000` | Intentional; provisioned should follow MA container 5000 + allocated host port | No (keep both) |
| Health contract | Already compatible | No |
| Core consumption / CRM domain | Already exists | No |
| SI production cutover | Explicitly out | No |
| Copy-down PROD→DEV | Not implemented for MA either | No (defer) |

---

# Part C — Core-promotion matrix

Two-vertical comparison after B2. **Conservative.** Same name ≠ same capability. Promotion is **not** required to ship C2 unless noted.

Classification: **A** Core already · **B** clearly vertical · **C** candidate · **D** unclear / owner.

| Concern | MA | Sales | Owner now | Class | Required for C2? | Recommendation |
|---|---|---|---|---|---|---|
| Auth/password/session services | Core services | Core services | Core | A | No | None |
| Users / RBAC **framework** + Core tables | Core + MA rights catalog | Core + `VIEW_SALES`/`MANAGE_SALES` | Core framework; vertical catalogs | A | No | None |
| Settings KV + section registry | Core + MA sections | Core + Sales sections | Core framework | A | No | None |
| Shell / nav registration | `register-ma-shell` | `register-sales-shell` | Core framework | A | No | None |
| Brand / app-env / health **helpers** | Core | Core | Core | A | No | Optional later: neutralize MA-flavored Core defaults. Not a C2 gate. |
| `GET /api/health` | Identical wrapper | Identical wrapper | Vertical HTTP | C | **No** | Defer. Thin and already Core-shaped. |
| Auth/users/settings **HTTP + pages** | MA copies | Sales copies | Vertical | C | **No** | Defer. Duplication is real; extracting pages is a Core sprint, not provision. |
| `security-audit` service | Broad MA action list | Smaller Sales list + intake events | Table Core; service vertical | C | **No** | Defer. Common record/list helper could move later; action enums differ. |
| Drizzle / `useDb` / journals | MA `0000`–`0020` | Sales `0000`–`0003` | Vertical | B | No | Keep. ADR: Core migrations only when tables move. |
| Lead / household / trial | `leads`/`lead_lines`/trials, required `programId` | `sales_leads` person, optional Company, convert | Vertical | B | No | **D2 stands.** Do not promote. |
| Company / account | No Sales-like Company | `sales_accounts` lifecycle | Vertical | B | No | Sales-only |
| Campaigns | Gym marketing campaign + collaborators + `/trial` destination | Campaign spanning Sources; no primary source | Vertical | B | No | **Keep D3 wait.** Names match; schemas and jobs do not. |
| Tracking / public capture | `/trial`, `/events/[slug]`, `/t/[slug]` → household | `/inquire`, `/t/{token}` → Lead; intake defaults off | Vertical | B | No | **Keep D4 wait.** Shared “token URL” is not a generic Core capture framework. |
| Offers / commercial lines / proposals / PDFs | Absent | Sales-owned B1/B2 | Vertical | B | No | Never Core |
| Programs, follow-up, events, Meta, compensation | MA-owned | Absent | Vertical | B | No | Never Core |
| Reporting / dashboard | MA gym ops | Sales commercial/attribution | Vertical | B | No | Never Core |
| Docker / provision / backup | CP + MA compose | Missing | Control Plane | — | **Yes** (CP, not Core) | Product catalog in CP. Do not put provision into `@crm/core`. |
| `utcNowMs` / small time helpers | Vertical copies | Vertical copies | Vertical | C | **No** | Ignore. Trivia. |

**Promotion verdict for C2:** do **not** promote domain or HTTP pages as part of C2. The two-vertical evidence **strengthens** D2–D4 (diverge first). The wait condition “until Sales exists” is now met; that is a reason to **schedule a later comparison**, not to fold promotion into C2. Confirm as **C2-04**.

---

# Part D — Proposed C2 architecture (smallest)

Depends on C2-01. The shape below is the smallest architecture that matches accepted law **without** pretending D1 is already shipped.

```text
Operator
  → Control Plane (product catalog, code-defined)
      → Customer row (commercial account)
          → chosen Product (martial-arts | sales)
              → PROD + DEV environments
                  → product image / compose / volumes / env
                  → independent sqlite + assets
                  → GET /api/health
                  → existing S4–S6 lifecycle
```

### Product catalog (recommend hybrid — C2-03)

**Code-defined** product modules in Control Plane, for example `control_plane/server/products/`:

| Field | Martial Arts (today’s constants) | Sales (new) |
|---|---|---|
| `id` | `martial-arts` | `sales` |
| Display name | Martial Arts | Sales |
| Template root | `martial_arts_template/` | `sales_template/` |
| Dockerfile | `martial_arts_template/Dockerfile` (unchanged) | `sales_template/Dockerfile` (new, same repo-root COPY of `packages/crm-core`) |
| Compose file | `docker-compose.provisioned.yml` | `docker-compose.provisioned.yml` (Sales copy) |
| Image | **keep** `martial-arts-acquisition:s4` | new `crm-sales:c2` (C2-06) |
| Health | `/api/health` | `/api/health` |
| Container port | 5000 | 5000 |
| SQLite in container | `/app/data/sqlite/crm.sqlite` | `/app/data/sqlite/crm.sqlite` (local Sales stays `./data/app.sqlite`) |
| Assets | `/app/data/uploads` | `/app/data/uploads` **and** `SALES_PROPOSALS_DIR=/app/data/uploads/proposals` so S6 backup already copies PDFs |
| Env template | current `renderProvisionedEnv` | same plus product-specific `NUXT_PUBLIC_APP_NAME` (no forced “Acquisition”) |
| Init | existing MA runtime-init | Sales entrypoint: migrate + existing Sales seed (admin, access, sources) |

Beauty is **not** a catalog entry in C2.

**Stored** product id: reuse `customers.industry_template` **if** C2-01 = one product per customer. If C2-01 ships D1, store product id on `product_instances` and stop treating the customer row as the instance.

### Sales Docker (new files; MA Docker untouched)

Mirror MA, filter `sales-crm`:

- `sales_template/Dockerfile`
- `sales_template/docker/entrypoint.sh` + runtime-init (migrate + seed)
- `sales_template/docker-compose.provisioned.yml` (named volumes `{slug}-sqlite` / `{slug}-assets`, `HOST_PORT`, `EXPECTED_IMAGE`)

Do **not** rename MA image tags, MA volume names, or existing `{customer}-prod` slugs. That is the regression boundary.

### Control Plane wiring (replace constants with product lookup)

Touched today:

- `control_plane/server/services/provision-contract.ts` (`PROVISIONED_IMAGE`, `environmentNames`)
- `provision-registry.ts` (stop hard-coding `martial-arts`)
- `provision-runtime.ts` / `docker-relaunch.ts` (`imageBuildArgs`, `templateRoot`)
- `provision-env.ts` (product-aware brand lines; optional `SALES_PROPOSALS_DIR`)
- `app/pages/customers/new.vue` + `server/api/customers.post.ts` (product field)
- upgrade path (build the **selected** product Dockerfile)
- fleet backup: no schema change if Sales proposals sit under uploads

Host ports: keep **52200–52999** for all provisioned products. Lab 52040/52050 stay Acme.

### What this does not do

- Does not move Sales onto Core domain tables.
- Does not change Martial Arts compose used by lab-acme (`:s2`) except by not touching it.
- Does not implement copy-down, VPS, DNS, operator auth, or Beauty.
- Does not cut over Strategic Insights (SI remains disposable MA proof data).

---

# Part E — Decision register

Do not manufacture trivia. If the architecture already answers it, it is in Part D as a recommendation.

---

### C2-01 — How deep is product identity in C2?

**Question:** Does C2 ship the accepted D1 split (Customer Account → Product Instance → Environments), or a thinner catalog that still treats one customer row as one product?

**Why it matters:** Env slugs are `{customer}-prod`. One-PROD is per **customer**. One account owning Martial Arts **and** Sales cannot use that scheme without colliding. D1 is accepted target architecture ([[Customer-Environment]], ADR-18) but **not shipped**. C2 is defined as a **product catalog**, which is necessary either way; full D1 is not automatically the same milestone.

**Current evidence:** `customers` + `environments` only. `industry_template` stored, unused. No `product_instances`.

| | Option A | Option B | Option C |
|---|---|---|---|
| | **Thin catalog (defer D1).** New customer chooses Martial Arts **or** Sales. One product per customer row. Reuse `industry_template` as the stored product id. Keep `{customer}-prod` slugs and one-PROD-per-customer. | **Minimal D1.** Add `product_instances`. Backfill each existing customer as one Martial Arts instance **without renaming** current env slugs. New instances get instance-qualified slugs. One PROD per **instance**. | **Full D1 + multi-instance operator UX** in the same C2 (Smith Holdings → two businesses). |
| Cursor | **Recommend A for C2 Successful.** Smallest coherent catalog. Preserves S4–S6 proofs. Records D1 as explicit follow-on (not silently cancelled). | Correct long-term. Larger schema/UI/backfill risk inside the first Sales provision. | Too large. Mixes catalog + account model + regression. |

**Consequences:** A means a commercial account cannot own both products until a later D1 work order. B/C make that possible in C2 and must protect existing `{slug}-prod` rows.

**Scott must decide before implementation:** **Yes.**

- [ ] A — thin catalog; defer D1 schema
- [ ] B — minimal D1 in C2
- [ ] C — full D1 + multi-instance UX in C2

---

### C2-02 — What “choose Sales” means for existing customers

**Question:** Must C2 Successful include adding a Sales product to an **existing** Martial Arts customer (lab-acme or Strategic Insights), or is a **new** Sales-only customer enough?

**Why it matters:** Existing-customer add **requires** C2-01 B/C (or a hacky second customer row). New-customer-only matches Option A. SI is disposable MA test data and is **not** the Sales cutover ([[Current-State]]).

**Current evidence:** Customer workspace can add extra **non-PROD** environments of the same (implied MA) product. There is no “add product.”

| | Option A | Option B |
|---|---|---|
| | C2 QA provisions a **new throwaway Sales customer** (PROD+DEV). Existing MA customers are regression-only. SI is not migrated. | C2 Successful requires attaching Sales to an existing account. |
| Cursor | **Recommend A.** Matches “do not treat SI as a real operating CRM.” Safer regression story. | Only if Scott wants the Smith Holdings demo in this milestone. |

**Scott must decide before implementation:** **Yes.**

- [ ] A — new Sales customer is enough
- [ ] B — existing account must be able to gain a Sales instance

---

### C2-03 — Where the product catalog lives

**Question:** Are product definitions code, database, or hybrid?

**Why it matters:** Only two products now (Beauty next). A DB catalog invites unused extensibility. Pure DB cannot ship Docker paths without also storing code-like config. Pure code cannot record which product a customer runs.

**Current evidence:** No catalog. Constants in `provision-contract.ts`.

| | Option A | Option B | Option C |
|---|---|---|---|
| | **Hybrid.** Code-defined product modules (id, image, Dockerfile, compose, env, volumes, health). DB stores only the product **id** on the customer (or instance). | Entire catalog as CP sqlite rows (image, dockerfile path, …). | Code-only; infer product from image name. |
| Cursor | **Recommend A.** Enough for MA + Sales now, Beauty later. Matches ADR “product identity is first-class” without a plugin loader. | Over-flexible for two products; upgrade/rebuild still needs code. | Violates ADR-18 (do not infer product only from image names). |

**Scott must decide before implementation:** **Yes** (confirm). Implementation detail of module filenames is **not** an owner question.

- [ ] A — hybrid (code modules + stored product id)
- [ ] B — DB-defined catalog
- [ ] C — infer from image name

---

### C2-04 — Reopen D3/D4 (campaigns / public capture) inside C2?

**Question:** Sales now has Campaigns, Tracking Links, and public intake. D3/D4 said wait until a second implementation. Does C2 include promoting those into Core?

**Why it matters:** First honest two-vertical comparison is possible. The schemas still diverge (MA gym marketing + `/trial` household vs Sales campaign+source + `/inquire` Lead). Promotion would contaminate Core and explode C2 scope.

**Current evidence:** Part C. ADR promotion default **No until justified**.

| | Option A | Option B |
|---|---|---|
| | **Keep wait.** C2 is catalog + provision. Schedule a later Core-promotion review, not this milestone. | Promote campaigns and/or public capture during C2. |
| Cursor | **Recommend A.** Required commonality is not demonstrated. C2 does not need it. | Conflicts with “C2 is not more CRM / not Core promotion.” |

**Scott must decide before implementation:** **Yes** (confirm). If B is chosen, C2 is the wrong milestone name.

- [ ] A — do not promote; C2 stays provision/catalog
- [ ] B — include Core promotion of campaigns/public capture

---

### C2-05 — New-customer operator default

**Question:** After a catalog exists, is product choice **required** on `Customers → New customer`, or does Martial Arts remain the default with Sales as an advanced option?

**Why it matters:** Today every provision is MA with no mention of product. A silent default will keep creating MA instances by habit. A required picker makes the catalog real in owner QA.

**Current evidence:** `new.vue` has no product field. Tests assert the API has no `industryTemplate`.

| | Option A | Option B |
|---|---|---|
| | **Required picker** (Martial Arts \| Sales). No implicit default. | Default Martial Arts; Sales optional. |
| Cursor | **Recommend A.** C2 Successful is “CP understands two products.” A default recreates today’s MA-only path. | Faster for Scott’s existing MA workflow; weaker proof. |

**Scott must decide before implementation:** **Yes.**

- [ ] A — required product picker
- [ ] B — default MA, optional Sales

---

### C2-06 — New Sales image name (MA tags frozen)

**Question:** What image tag does provisioned Sales use? Martial Arts tags stay `martial-arts-acquisition:s4` / lab `:s2` (do not rename in C2 — that is an audit recommendation, not this decision).

**Why it matters:** ADR target names are `crm-martial-arts` / `crm-sales` / `crm-beauty`. Today’s MA fleet uses `martial-arts-acquisition`. Package name is `sales-crm`. Mixing a third convention is costly.

**Current evidence:** Vault: target names not current tags. CP: `PROVISIONED_IMAGE = 'martial-arts-acquisition:s4'`.

| | Option A | Option B |
|---|---|---|
| | **`crm-sales:c2`** (or `:s4` if Scott prefers lockstep with MA’s s-tag). New name, ADR-aligned. | **`sales-crm:s4`** matching npm package `sales-crm`. |
| Cursor | **Recommend A** (`crm-sales:c2`). Leaves MA tags stable. Aligns with intended `crm-*` family for the **new** image only. | Fine if Scott wants package/image parity; less aligned with ADR image names. |

**Scott must decide before implementation:** **Yes** (naming). Do **not** retag existing MA images in the same work.

- [ ] A — `crm-sales:c2` (recommended)
- [ ] B — `sales-crm:s4`
- [ ] Other: ________

---

### Not asked (audit recommendations, not owner decisions)

Recorded so they are not re-litigated as C2-xx:

- Keep MA image `martial-arts-acquisition:s4` / lab `:s2`, MA Dockerfile path, lab ports 52040/52050, template triple 5000/5010/5020.
- Sales laptop `pnpm dev` stays http://localhost:5040. Provisioned Sales uses container port 5000 + allocated 52200–52999.
- Provisioned Sales sqlite filename `crm.sqlite` (CP already prefers it); local remains `app.sqlite`.
- Put proposal PDFs under the assets/uploads volume (`SALES_PROPOSALS_DIR=/app/data/uploads/proposals`) instead of a third volume.
- Run existing Sales seed in the container (admin + access + controlled sources), analogous to MA runtime-init. Empty-of-admin is not useful.
- Do not implement PROD→DEV copy-down in C2 (not present for MA).
- Do not neutralize Core brand defaults as a C2 gate; fix **CP env render** per product.
- Do not extract auth pages or `security-audit` into Core in C2.
- Do not add Beauty to the catalog.
- Do not infer product from image name alone (ADR-18).
- C2 proof customer is disposable. Do not decommission or rebuild lab-acme or SI to “make room.”
- Control Plane stays out of the pnpm workspace.

---

# Part F — Proposed C2 Successful criteria

Refine only after C2-01/C2-02. Default below assumes **C2-01 A** and **C2-02 A** (thin catalog, new Sales customer). If Scott chooses D1/multi-product, add instance-level one-PROD and “add Sales to existing account” rows.

## F1. Owner / browser QA (this is Successful)

Control Plane at http://127.0.0.1:52100.

1. New customer shows a **product** choice: Martial Arts and Sales (and not Beauty).
2. Choosing **Sales** provisions isolated **PROD + DEV** (two host ports in 52200–52999, two sqlite volumes, two assets volumes).
3. Both Sales environments show **healthy** (container running **and** `/api/health` with reachable database).
4. Staff can open the Sales `accessUrl`, log in (provisioned `admin` / `setup`, must-change), and see the existing Sales CRM (not a blank Core shell). Local `:5040` still works independently.
5. Proposal PDFs created in that environment survive **Relaunch** (same volumes) and are included in **Backup / Restore**.
6. **Start / Stop** work on a Sales environment without setting `decommissioned` and without `-v`.
7. **Upgrade** of the Sales DEV (then PROD, per S6 rule) rebuilds the **Sales** image, not `martial-arts-acquisition`.
8. **Martial Arts regression:** provision a **new** MA customer (or observe lab-acme) — image remains `martial-arts-acquisition:s*`, health/relaunch/backup still work, one-PROD-per-customer still enforced, extra non-PROD still MA.
9. Existing lab-acme / SI rows are not renamed, not retagged as a side effect, and not decommissioned by C2.
10. Choosing Sales does not create MA tables/seed (no `ADULT_BJJ`). Choosing MA does not create `sales_proposals`.

Scott marks C2 **Successful** only after this pass. Code existing is not Successful.

## F2. Automated verification (implementation acceptance, not Successful)

- Control Plane tests: product field on create; MA path still builds MA image; Sales path selects Sales Dockerfile/image/compose; one-PROD invariant unchanged for the chosen identity unit (customer or instance).
- Sales image: `pnpm test` / lint / typecheck / build still pass on `sales_template` (existing 7 files / 40 tests at B2 closeout; count may grow).
- Architecture tests: Core ↛ verticals; Sales ↛ MA.
- No `docker compose down -v` in any new path.
- Backup zip for a Sales env contains sqlite **and** proposal files under uploads.

## F3. Intentionally deferred (not C2 Successful)

D1 multi-instance accounts (unless C2-01 B/C). Copy-down. Core promotion. Beauty. SI migration. E-sign, email, portal, billing. S7/S8. Operator login. Image registry. Renaming MA images to `crm-martial-arts`. Moving templates under `apps/`.

---

# Part G — Proposed implementation slices

Not authorized. Suggested Work Order boundaries after decisions.

| Slice | Intent | Notes |
|---|---|---|
| **C2-S1** | Sales Docker runtime | Dockerfile, compose.provisioned, volumes, entrypoint migrate+seed, health in-container. Prove with **manual compose**, not CP. MA Docker **untouched**. |
| **C2-S2** | CP code-defined product catalog + provision selection | Replace hard-coded MA constants. API accepts product id. MA default path remains bit-compatible. |
| **C2-S3** | Operator New customer picker + env render | C2-05. Product-specific brand env. Sales `SALES_PROPOSALS_DIR`. |
| **C2-S4** | Lifecycle parity | Upgrade uses product Dockerfile. Backup/restore proof for Sales uploads/proposals. Start/stop/relaunch tests. |
| **C2-S5** | MA regression + owner QA | New MA customer and/or lab-acme observe; new Sales customer; then Scott’s F1 list. |

If C2-01 = B, insert **C2-S0** (product_instances + backfill, one-PROD per instance, slug policy) **before** S2. Do not mix S0 into S1.

Stop after each slice. Do not start S7, Beauty, or SI cutover from any slice.

---

# Part H — Forbidden / deferred scope

Out of C2 unless a **later** work order says otherwise:

- Additional Sales CRM features; Proposal expansion; public signing; e-sign; CRM email; customer portal
- Billing / invoicing / Stripe; self-service signup
- Beauty implementation or Beauty catalog entry
- Strategic Insights production migration / cutover
- VPS; S7 hosting/security/remote nodes; S8 DNS/TLS/public hostnames
- Generalized plugin architecture; arbitrary third-party vertical loading
- Premature multi-region / orchestration
- Core promotion of leads, campaigns, public capture, auth pages (unless C2-04 = B, which Cursor recommends against)
- Renaming/retagging existing Martial Arts images or lab-acme/SI slugs
- `docker compose down -v`, prune, Renzo/`webhosting_renzo_*` volumes
- Control Plane operator auth (NEAR-04)
- D1 schema **if** C2-01 = A

---

## What Scott / ChatGPT should do next

1. Walk **C2-01 through C2-06** (checkboxes above).
2. If answers match Cursor recommendations, ChatGPT may **draft** a C2 Work Order. Drafting still does **not** authorize implementation until the work order is in git with `authorized: yes` (or Scott pastes it into a Cursor chat).
3. Do not start C2 implementation from this worksheet.
