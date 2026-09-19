---
type: note
status: current
area: process
updated: 2026-09-19
aliases:
  - CURRENT_STATE
  - Current state
tags:
  - saas
  - current
---

# Current state

In-place map of **what exists now** in `crm_marketing_saas`. Update this note in the same work that changes implementation, milestone status, or hard stops. Do not create dated “current state” snapshots here. Dated evidence lives in [[history/_index|history/]].

Chat is not the record. [[wip/_index|wip/]] is not this map. Code is implementation truth; this note is the declared map. If they conflict, investigate, then fix this note.

Orientation: [[Home]] → [[Working-Agreement]] → this file → [[SaaS-Milestones]] → [[SaaS-Decisions]] → [[Platform-Architecture]] → [[project-state.yaml]].

---

## Executive state

This repo is the **generic SaaS platform** plus its first industry product, the **Martial Arts** CRM. It was derived from the external Renzo gym app. Renzo is **not** a customer here and must not be managed, provisioned, or migrated from this tree.

| Layer | Status |
|---|---|
| Official S-track S0–S6 | **Successful** |
| Official S6 (fleet backup / restore / upgrade + start/stop) | **Successful** (2026-09-11). Evidence: [[history/S6_closeout]] |
| CRM Core + vertical ADR | **Partially superseded** (2026-09-17) by product-owned domains + shared foundation |
| D1–D4 | **Accepted**. D1 **retained**. D2–D4 **modified** 2026-09-17 (stay product-owned; Sales does not justify promotion). D1 schema **minimal shipped** in C2 (**Successful** 2026-09-15) |
| C1 Core extraction | **Code-shipped**. Evidence: [[history/C1_CRM_Core_Architecture_Return]] |
| C2A Thin Sales consumer | **Successful** (2026-09-11). Owner-accepted after browser QA at http://localhost:5040. Local `sales_template/` / `sales-crm`. Not C2. Evidence: [[history/C2A_closeout]] |
| C2B SI Sales Refinement Slice A | **Successful** (2026-09-12). Owner-accepted after browser QA at http://localhost:5040. Feature `1ac18e4`. Not Slice B. Not C2. Evidence: [[history/C2B_closeout]] |
| SI Sales B1 (commercial + acquisition) | **Successful** (2026-09-12). Owner-accepted after browser QA at http://localhost:5040. Feature `40851e0`. Not B2. Not C2. Evidence: [[history/B1_closeout]] |
| SI Sales B2 (proposal system) | **Successful** (2026-09-13). Owner-accepted after core QA, refinements, and final regression QA at http://localhost:5040. Feature `84c0cc8`; refinements `c2d611e`; revision-selection `0be7e06`. Not C2. Evidence: [[history/B2_closeout]] |
| C2 / Beauty / S7–S11 | C2 **Successful** (2026-09-15). Beauty and S7–S11 **Not started** |
| Sales pre-development architecture audit | **Complete** (2026-09-11, docs only). Evidence: [[wip/WO-2026-09-11-sales-predev-audit-return]]. |

**Authorized work:** none. Pre-VPS product quality & release readiness **complete** (2026-09-19): Phase 1 [[Product-Workflow-UX-Audit]], Phase 2 [[Product-UX-Overhaul-Return]], Phase 3 [[Product-Release-Update-Lifecycle]] (return [[history/WO-2026-09-19-pre-vps-product-quality-return]]). Sales Minimum V1 remains **code-shipped** for SIC dogfooding; not a platform milestone and not owner-accepted Successful. Hosting-node repository work shipped 2026-09-19; live VPS/DNS/TLS remain external. Official S7/S8 remain **Not started**. Architecture law is [[ADR-Product-Owned-Domains-Shared-Foundation]] (2026-09-17). Hosting-node map: [[Hosting-Node-Architecture]], [[Hosting-Node-Bootstrap-Runbook]], [[Production-Edge-Runbook]]. Do not start C3, Beauty, SI migration, Core-domain promotion, package rename, or `apps/` moves. See [[Working-Agreement]] and [[Work-Order-Protocol]]. Closeout: [[history/C2_closeout]]. Asset upload return: [[history/WO-2026-09-17-ma-multi-asset-upload-return]]. Architecture return: [[history/WO-2026-09-17-product-owned-domains-shared-foundation-return]]. Customer #1 sell-readiness: [[Martial-Arts-Customer-1-Sell-Readiness]], [[history/WO-2026-09-18-ma-customer-1-sell-readiness-return]]. Sales V1 return: [[history/WO-2026-09-19-sales-minimum-v1-return]]. Assessment (investigation record, V1 closed): [[Sales-SIC-Dogfooding-Readiness-Assessment]].

Lockfile: [[project-state.yaml]].

---

## Repository

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Branch | `working` |
| Remote | `origin` https://github.com/Koifish95/crm_marketing_saas.git (not `renzo-crm`) |
| `main` | first commit only — do not develop there |

```text
crm_marketing_saas/
├── pnpm-workspace.yaml          # packages/crm-core + martial_arts_template + sales_template
├── package.json                 # root workspace stub; Node 22+; pnpm 10
├── packages/crm-core/           # @crm/core — shared application foundation (C1 shipped; name historical)
├── martial_arts_template/       # Martial Arts product; local :5030; Docker :5000/:5010/:5020
├── sales_template/              # Sales product (sales-crm); local :5040; Docker image crm-sales:c2
├── control_plane/               # NOT in the workspace; http://127.0.0.1:52100
└── crm_saas_vault/              # this vault
```

**Runtime:** Martial Arts, Sales, and Control Plane run on a **laptop lab node** (`kind=laptop`) or a **Linux hosting node** (`kind=vps`, same local Docker). Laptop `pnpm dev` remains MA :5030 and Sales :5040. Control Plane is always `127.0.0.1:52100` (SSH tunnel from a remote operator). Never `docker compose down -v`, never prune, never attach `webhosting_renzo_*` / leftover `renzo-*` volumes. Do not copy laptop sqlite onto the Pi. Do not touch `Projects/renzo_crm` or Koi-Pi PRODUCTION.

**Image tags in use:** `martial-arts-acquisition:s2` (Acme lab), `martial-arts-acquisition:s4` (provisioned MA), `crm-sales:c2` (provisioned Sales). Do not rename or retag existing MA images.

**Live sqlite caveat:** `control_plane/data/control-plane.sqlite` is gitignored. Source seeds **lab-acme**. Strategic Insights is the S4 laptop proof. A live registry may contain extra rows that are **not** in git. Do not promote live sqlite into product docs.

---

## Target vs implemented

**Target** (accepted D1 + 2026-09-17 foundation ADR) — [[Platform-Architecture]], [[ADR-Product-Owned-Domains-Shared-Foundation]], [[Customer-Environment]]:

```text
Customer Account / Organization
    ↓
Business / Product Instance     (exactly one product)
    ↓
Product                         (Martial Arts | Sales | Beauty)
    ↓
Environments                    (exactly one PROD, default DEV, optional extras — same product)
```

Products own their domains, schemas, and complete migration journals. `@crm/core` is the shared **application foundation** (name is historical), not a shared CRM domain. One-way dependency: Product → Foundation only. Beauty, when authorized, is another independent product — not a Core-proof exercise.

Official S-track still lists S7 (hosting/VPS) after S6. Product family locally first remains C-track *priority*, not a silent rewrite of S7. Both notes remain valid in their roles: [[SaaS-Milestones]] is the official S-track; [[ADR-Product-Owned-Domains-Shared-Foundation]] is architecture law. C-track IDs are separate.

**Implemented (C2 Successful, 2026-09-15):** Control Plane has `customers` + `product_instances` + `environments`. One account may own Martial Arts and Sales instances. One PROD per **product instance**. New accounts are created with zero environments (`industry_template` sentinel `unassigned`). Operator then **Add product instance** with an explicit product pick. That insert returns immediately; Docker image build and compose run as server-side provisioning (`lifecycleStatus` `provisioning` → `ready` / `failed`, optional `provision_error`). Retry continues the same rows and remounts the same volumes. Existing rows backfill as one Martial Arts instance; env slug / container / volume / image / port identities are unchanged. New instances use `{customer}-{productId}-{type}` names. Hybrid catalog in CP code (`martial-arts`, `sales` only). Beauty is not a catalog entry. Restore is selectable (`backupId`) with server-side same-customer/same-product rollback and PROD→DEV copy-down.

---

## What is implemented

### Martial Arts product (`martial_arts_template/`)

Full gym CRM derived from Renzo: households as `leads` + `lead_lines`, trials, intro `/trial`, follow-up, campaigns, events, marketing, settings, seed programs (`ADULT_BJJ` / `KIDS_BJJ`). Consumes `@crm/core` for brand, health, app-env, auth/users/RBAC **framework**, settings KV, shell/nav/settings/permission **registration**. Drizzle journal `0000`–`0020` remains in MA.

Staff with `MANAGE_ASSETS` can select one or many files in Asset Library and on Campaign → Assets. Each successful file creates one independent Asset through sequential `POST /api/marketing/assets` (concurrency 1). Partial failures keep successes; retry sends only failed/unattempted files; 401/403 stops the remaining batch. The existing Asset picker still only attaches already-created Assets.

Customer #1 sell-readiness (repository-complete 2026-09-19): unique initial-access passwords, CSRF/trusted-proxy/security headers, VACUUM INTO backups, health `releaseId`/`schemaVersion`, lead CSV import/export, and `deploy/customer-1/` nginx TLS edge templates. Tracker: [[Martial-Arts-Customer-1-Sell-Readiness]]. Live VPS/DNS/TLS remain official S7/S8.

Local: http://localhost:5030 (`pnpm dev`). Laptop Docker PRODUCTION `:5000`, STAGE `:5010`, DEV `:5020`.

### Sales product (`sales_template/`) — C2A–B2 Successful; C2 Successful; Minimum V1 code-shipped

Second working product consuming the shared foundation `@crm/core` (Nuxt `extends`). Package `sales-crm` (`private: true`). Local: http://localhost:5040 (`pnpm dev`). SQLite `file:./data/app.sqlite`. Provisioned sqlite is `file:/app/data/sqlite/crm.sqlite`. Drizzle journal `0000`–`0004` is **Sales-owned** (including `users` / RBAC / `app_settings` created in `0000_wide_cyclops`; V1 firmographics/outcomes in `0004_sales_v1_dogfood`). Docker image **`crm-sales:c2`**. Proposal PDFs in provisioned envs use `SALES_PROPOSALS_DIR=/app/data/uploads/proposals` on the existing assets/uploads volume (S6 zip already includes `/app/data/uploads`).

Sales already performed the architectural role of the second consumer: it shares foundation infrastructure and owns a **divergent** domain (not a Core Lead/Campaign). Do not describe Sales as still needing to be built to challenge Core.

**SIC outbound path (D1):** Company → Contacts → Opportunity. **Lead** remains for inbound/public intake. Convert still creates company + contact + opportunity and keeps the Lead.

**Pipeline (D2):** Working → Proposal/Quote → Decision → Won/Lost. Manual create and Lead convert default to **Working**. Existing `proposal_quote` records remain valid. A demo is a Meeting activity, not a stage.

Domain: **Lead** (`sales_leads`; Company optional) → explicit **Convert Lead** → **Company** / Sales Account (`sales_accounts`, optional website/phone/city/state) + Contact + Opportunity. Operational Activities with required due dates, structured outcomes on call/email/meeting, and complete-and-schedule-next. Chronological `sales_notes`. Company list shows lifecycle (Prospect / Customer / Former Customer) separately from Active. Opportunity list shows company, stage, one-time, MRR, and next open activity. Dashboard **Work today** lists overdue, due today, and open opportunities. Won/Lost prompts to cancel remaining open activities (default yes; completed history kept; Reopen does not restore cancelled tasks). Won shows an operator serve checklist (no Control Plane auto-create). Permissions `VIEW_SALES` / `MANAGE_SALES`.

B1 adds Sales-owned Sources, Campaigns (no primary source), Campaign+Source Tracking Links, captured/current attribution, configuration-driven public intake (`/inquire`, `/t/{token}`), Offers, Opportunity commercial lines (one-time + MRR), Company lifecycle (`prospect` / `customer` / `former_customer`), dedicated `won_at` / `lost_at`, and baseline reporting. Public intake defaults **off**. Seeded starter offers (editable, Sales-owned, not a platform catalog): Martial Arts CRM monthly $250 and Provisioning / Setup one-time $500.

B2 adds a Sales-owned Proposal chain on each Opportunity: draft/issue/mark-sent/accept/decline/supersede, immutable issued commercial snapshots, instance letterhead (`sales.proposal_letterhead`), staff HTML preview, PDFKit-generated PDFs under `data/proposals/`, optional signed PDF upload. Accepted does **not** auto-Won. No browser e-sign, no CRM email, no customer portal.

Sales Minimum V1 is **code-shipped** for SIC to begin dogfooding. It is **not** a new C-track milestone and is **not** owner-accepted Successful. Stop further Sales feature work until real friction from dogfooding. Investigation record: [[Sales-SIC-Dogfooding-Readiness-Assessment]]. Return: [[history/WO-2026-09-19-sales-minimum-v1-return]].

No additional Sales CRM features shipped in C2 (no e-sign, email, portal). Strategic Insights has **not** been migrated as a Control Plane customer. C2 proof used disposable Control Plane account **C2 QA Test**, not lab-acme or SI mutation.

C2A owner-accepted 2026-09-11. Closeout: [[history/C2A_closeout]]. C2B owner-accepted 2026-09-12. Closeout: [[history/C2B_closeout]]. Slice A implementation return: [[history/WO-2026-09-11-si-sales-slice-a-return]]. B1 owner-accepted 2026-09-12. Closeout: [[history/B1_closeout]]. Implementation return: [[history/WO-2026-09-12-si-sales-b1-commercial-acquisition-return]]. Work order (archived): [[wip/archive/WO-2026-09-12-si-sales-b1-commercial-acquisition]]. B2 owner-accepted 2026-09-13. Closeout: [[history/B2_closeout]]. Implementation return: [[history/WO-2026-09-12-si-sales-b2-proposal-system-return]]. Work order (archived): [[wip/archive/WO-2026-09-12-si-sales-b2-proposal-system]]. C2 owner-accepted 2026-09-15. Closeout: [[history/C2_closeout]]. Implementation return: [[history/WO-2026-09-14-c2-product-instance-sales-catalog-return]]. Work order (archived): [[wip/archive/WO-2026-09-14-c2-product-instance-sales-catalog]].

### Shared foundation (`packages/crm-core`, package name `@crm/core`)

C1 units 1–3 **code-shipped** and **still in force**: pnpm workspace, thin Nuxt layer, ESLint/architecture test (foundation must not import MA / sales / beauty), brand/health/app-env, auth/users/RBAC framework, settings KV, shell + registration. The package name is historical; it is the shared **application foundation**, not a CRM domain. No Core migrator. No Core pages. Version `0.0.0` / `workspace:*`. `control_plane` is **out** of the workspace. `martial_arts_template/` was **not** moved to `apps/`. Do not split the package or rename it without a new work order.

### Control Plane (`control_plane/`)

http://127.0.0.1:52100. Multi-page shell: Dashboard, Customers, Environments, Hosting Nodes, Settings. Observe + provision **product instances**. New customer = account only. Add Product Instance picks Martial Arts or Sales, creates that instance’s PROD+DEV, and provisions in the background. Extra non-PROD attaches to an instance. One-PROD per instance. Upgrade “non-PROD first” is instance-scoped. Gated decommission (volumes stay). Retry = continue/resume the same environments. PROD may store `public_hostname`; access URL becomes `https://{hostname}`. Health URLs stay loopback. No operator login; non-loopback is 403 unless `CONTROL_PLANE_ALLOW_REMOTE` + token. Unique initial-access passwords (never `setup`). Hosting node: [[Hosting-Node-Architecture]]. Details: [[Control-Plane]].

### Environment lifecycle

| Action | Command / API | Notes |
|---|---|---|
| Relaunch | `up -d --force-recreate --no-deps app` | Recreate process, same volumes |
| Start | `compose start app` · `POST .../start` | Resume stopped. Not Relaunch. Missing excluded |
| Stop | `compose stop app` · `POST .../stop` | Halt process. Never sets `decommissioned` |
| Bulk start/stop | `POST .../bulk/start` · `.../bulk/stop` | Sequential; `{ scope: selected\|all, ids? }` |
| Decommission | `compose rm -f --stop app` | Sets `decommissioned`. Volumes stay |

Start All / Stop All = eligible **registered fleet**, not the table filter. Eligibility: [[Control-Plane]].

### Provisioning

Sales-led. `Customers → New customer` creates the **account only**. From the customer workspace Products tab, **Add product instance** and select Martial Arts or Sales. The Control Plane stores the instance immediately as **Provisioning**. Image build (`martial-arts-acquisition:s4` or `crm-sales:c2`) and compose run in the background from the product Dockerfile with **repo-root** context. Compose cwd is that product’s template directory. You can leave the page; Failed rows keep `provision_error` and Retry remounts the same volumes. Initial access is a unique password written to the env file (chmod 0600) plus a sidecar file — never `setup`. Runbook: [[S4-Provision-Runbook]].

### Backup / restore (official S6 Successful; C2 copy-down included)

Lifecycle tab: same-host zip, **selectable backup history**, gated restore, off-host copy to an existing folder, backup-gated local upgrade, Explorer reveal (`POST .../backup/reveal` with `{ backupId }`, path must stay under `data/backups/`). Restore requires `{ confirm, backupId }` — it does not silently use the latest zip. Server-side policy: same customer + same Product Instance; same-environment rollback; **PROD → DEV copy-down**; never DEV → PROD; never cross-product or cross-customer. Snapshot is SQLite via **VACUUM INTO** + persistent uploads (including Sales proposal PDFs). Target identity/port/compose/secrets stay. Retention 14 days. Runbooks: [[S6-Fleet-Runbook]], [[Customer-1-Backup-Restore-Runbook]].

### Docker / runtime

Exact `docker inspect` + compose. Combined status: container running **and** `/api/health`. Distinct `stopped` vs `missing`. Forbidden: `-v`, `prune`, `down` on relaunch/start/stop.

---

## What is not implemented

Do not assume any of these exist:

- C3 Beauty as an independently owned product; official S7–S11 **Successful** marks; **live** VPS / DNS / TLS issuance
- Browser e-sign, public signing portal, customer portal, CRM email send, document/theme CMS
- Beauty product (sister business is the intended second **pilot**, not a shipped product)
- Generic Lead / Campaign / Event / public-capture model in the foundation (not planned)
- Option C account-management redesign (multiple instances of the same product, SI cutover)
- Remote Docker API / multi-node orchestration / image registry as a product
- Live DNS records / Let's Encrypt against a real hostname (repo-side ACME workflow exists)
- Billing, Stripe, self-service signup
- Remote Control Plane login (SSH tunnel only; loopback bind remains)
- S-track rewritten around Core
- `martial_arts_template` moved to `apps/`
- `@crm/core` rename or split into `ui` / `auth` / `rbac` / `runtime`
- Plugin framework, `tenant_id`, Beauty images
- Core-owned migration journal / `migrateCore()` then product
- Control Plane tracking of a foundation/Core package version

---

## Locked decisions

Link, do not re-litigate. Index: [[SaaS-Decisions]].

| Decision | Authority |
|---|---|
| Two tracks; Renzo is external | [[Working-Agreement]], [[Home]] |
| Vault is the durable record; wip is not | [[Working-Agreement]], [[Conventions]] |
| Official S-track; S0–S6 Successful | [[SaaS-Milestones]], [[SaaS-Decisions#2026-09-10 — Map B is the official post-S4 roadmap]] |
| S6 backup/restore/upgrade | [[SaaS-Decisions#2026-09-10 — S6 backup, restore, and upgrade]] |
| Core + vertical architecture | Historical; **partially superseded** by [[ADR-Product-Owned-Domains-Shared-Foundation]] |
| Product-owned domains + shared foundation | [[SaaS-Decisions#2026-09-17 — Product-owned domains and shared foundation]] |
| C2A thin Sales consumer Successful | [[SaaS-Decisions#2026-09-11 — Official C2A is Successful]] |
| C2B Slice A Successful | [[SaaS-Decisions#2026-09-12 — Official C2B is Successful]] |
| SI Sales B1 Successful | [[SaaS-Decisions#2026-09-12 — Official SI Sales B1 is Successful]] |
| C2 Successful | [[SaaS-Decisions#2026-09-15 — Official C2 is Successful]] |
| C2 restore selection / PROD→DEV copy-down | [[SaaS-Decisions#2026-09-15 — C2 selectable restore and PROD→DEV copy-down]] |
| D1–D4 | [[SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain]] (D2–D4 modified 2026-09-17) |
| Customer / environment unit | [[Customer-Environment]] |
| Never `-v` / prune / Renzo volumes | [[Control-Plane]] |
| Retry = continue/resume | IMM-02 in [[SaaS-Open-Questions]] |
| Display name editable; slug/timezone/email read-only | IMM-03 |
| Hostname shape `{slug}.{product-domain}`; domain unset | IMM-04 |

---

## Open questions

IMM-01–04 and NEAR-01–03 are **resolved / working**. Do not present them as open. Remaining: [[SaaS-Open-Questions]] (NEAR-04–10, DEF-02–08). C2 is **Successful**.

---

## Hard stops

- No Renzo work. External app is `C:\Users\Scoy9\Projects\renzo_crm`. Do not touch Koi-Pi, `webhosting_renzo_*`, or live Renzo SQLite.
- This SaaS repo is not a license to manage Renzo.
- No VPS / DNS / TLS / public hostnames unless an active work order says so (official S8 / S7).
- No Sales or Beauty unless an active work order authorizes that sprint.
- No premature foundation-domain promotion. D2–D4 stay product-owned.
- No D1 schema rewrite unless authorized. Minimal D1 (`product_instances`) shipped in C2; do not expand to Option C unless a new work order says so.
- No destructive Docker: never `down -v`, never prune, never attach Renzo volumes.
- No architecture that contradicts [[ADR-Product-Owned-Domains-Shared-Foundation]].
- Do not implement a Core migrator, `@crm/core` rename/split, or `apps/` move unless a work order says so.
- Do not `git push --force` to `main` / `master`. Commit one repo at a time, only when asked.
- Do not treat live laptop sqlite extras as official pilots.
- Do not infer permission from [[SaaS-Milestones]], an ADR, a plan, ChatGPT memory, or an archived prompt.

---

## Documentation map

| Topic | Authoritative document |
|---|---|
| Bootstrap / start | [[Home]] |
| How we work | [[Working-Agreement]] |
| Current implementation map | **this file** |
| Roadmap (S-track and C-track) | [[SaaS-Milestones]] |
| Decisions index | [[SaaS-Decisions]] |
| Platform architecture | [[Platform-Architecture]] |
| Core / vertical ADR (historical) | [[ADR-CRM-Core-Vertical-Architecture]] |
| Product-owned domains + foundation ADR | [[ADR-Product-Owned-Domains-Shared-Foundation]] |
| State lockfile | [[project-state.yaml]] |
| Work authorization | [[Work-Order-Protocol]], [[wip/_index]] |
| Customer / environment | [[Customer-Environment]] |
| Control Plane | [[Control-Plane]] |
| Open NEAR/DEF | [[SaaS-Open-Questions]] |
| Historical evidence | [[history/_index]] |
| Customer #1 sell-readiness | [[Martial-Arts-Customer-1-Sell-Readiness]] |
| Sales SIC dogfooding assessment (investigation + V1 status) | [[Sales-SIC-Dogfooding-Readiness-Assessment]] |
| Pre-VPS workflow/UX audit (Phase 1) | [[Product-Workflow-UX-Audit]] |
| Pre-VPS UX overhaul return (Phase 2) | [[Product-UX-Overhaul-Return]] |
| Pre-VPS release/update lifecycle (Phase 3) | [[Product-Release-Update-Lifecycle]] |
| Customer #1 production deploy | [[Customer-1-Production-Deploy-Runbook]] |
| Customer #1 backup/restore | [[Customer-1-Backup-Restore-Runbook]] |
| Martial Arts product boundary | [[Martial-Arts-Product-Boundary]] |
| Renzo gym evidence | [[Implementation-State]], [[Milestones]], [[Architecture]], [[Decisions]] |

Renzo gym notes at the vault root are **historical evidence of the source implementation**, not SaaS law. [[Architecture]] is the Renzo/source stack. Platform architecture is [[Platform-Architecture]].
