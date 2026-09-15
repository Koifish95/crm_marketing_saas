---
type: note
status: current
area: process
updated: 2026-09-15
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
| CRM Core + vertical ADR | **Accepted** |
| D1–D4 | **Accepted**. D1 schema **minimal shipped** in C2 (**Successful** 2026-09-15) |
| C1 Core extraction | **Code-shipped**. Evidence: [[history/C1_CRM_Core_Architecture_Return]] |
| C2A Thin Sales consumer | **Successful** (2026-09-11). Owner-accepted after browser QA at http://localhost:5040. Local `sales_template/` / `sales-crm`. Not C2. Evidence: [[history/C2A_closeout]] |
| C2B SI Sales Refinement Slice A | **Successful** (2026-09-12). Owner-accepted after browser QA at http://localhost:5040. Feature `1ac18e4`. Not Slice B. Not C2. Evidence: [[history/C2B_closeout]] |
| SI Sales B1 (commercial + acquisition) | **Successful** (2026-09-12). Owner-accepted after browser QA at http://localhost:5040. Feature `40851e0`. Not B2. Not C2. Evidence: [[history/B1_closeout]] |
| SI Sales B2 (proposal system) | **Successful** (2026-09-13). Owner-accepted after core QA, refinements, and final regression QA at http://localhost:5040. Feature `84c0cc8`; refinements `c2d611e`; revision-selection `0be7e06`. Not C2. Evidence: [[history/B2_closeout]] |
| C2 / Beauty / S7–S11 | C2 **Successful** (2026-09-15). Beauty and S7–S11 **Not started** |
| Sales pre-development architecture audit | **Complete** (2026-09-11, docs only). Evidence: [[wip/WO-2026-09-11-sales-predev-audit-return]]. |

**Authorized work:** none. C2 is **Successful** and closed. Do not start C3, Beauty, S7, S8, SI migration, or Core promotion. See [[Working-Agreement]] and [[Work-Order-Protocol]]. Closeout: [[history/C2_closeout]].

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
├── packages/crm-core/           # @crm/core — C1 shipped
├── martial_arts_template/       # first vertical; local :5030; Docker :5000/:5010/:5020
├── sales_template/              # Sales CRM (sales-crm); local :5040; Docker image crm-sales:c2
├── control_plane/               # NOT in the workspace; http://127.0.0.1:52100
└── crm_saas_vault/              # this vault
```

**Runtime:** Martial Arts, Sales, and Control Plane remain laptop Docker (plus local `pnpm dev` for MA :5030 and Sales :5040). Never `docker compose down -v`, never prune, never attach `webhosting_renzo_*` / leftover `renzo-*` volumes. Do not copy laptop sqlite onto the Pi. Do not touch `Projects/renzo_crm` or Koi-Pi PRODUCTION.

**Image tags in use:** `martial-arts-acquisition:s2` (Acme lab), `martial-arts-acquisition:s4` (provisioned MA), `crm-sales:c2` (provisioned Sales). Do not rename or retag existing MA images.

**Live sqlite caveat:** `control_plane/data/control-plane.sqlite` is gitignored. Source seeds **lab-acme**. Strategic Insights is the S4 laptop proof. A live registry may contain extra rows that are **not** in git. Do not promote live sqlite into product docs.

---

## Target vs implemented

**Target** (accepted, not fully implemented) — [[Platform-Architecture]], [[ADR-CRM-Core-Vertical-Architecture]], [[Customer-Environment]]:

```text
Customer Account / Organization
    ↓
Business / Product Instance     (exactly one vertical)
    ↓
Vertical Product                (Martial Arts | Sales | Beauty)
    ↓
Environments                    (exactly one PROD, default DEV, optional extras — same vertical)
```

CRM Core is shared infrastructure. Verticals compose on Core. One-way dependency: Vertical → Core only. Sequence: Core → Martial Arts → Sales as second consumer → prove shared abstractions → Beauty → then production VPS.

Official S-track still lists S7 (hosting/VPS) after S6. The Core ADR **changes that priority** (product family locally first). Both notes remain valid in their roles: [[SaaS-Milestones]] is the official S-track; the ADR is architecture law. Do not silently rewrite the S-track. C-track IDs are separate.

**Implemented (C2 Successful, 2026-09-15):** Control Plane has `customers` + `product_instances` + `environments`. One account may own Martial Arts and Sales instances. One PROD per **product instance**. New accounts are created with zero environments (`industry_template` sentinel `unassigned`). Operator then **Add product instance** with an explicit product pick. That insert returns immediately; Docker image build and compose run as server-side provisioning (`lifecycleStatus` `provisioning` → `ready` / `failed`, optional `provision_error`). Retry continues the same rows and remounts the same volumes. Existing rows backfill as one Martial Arts instance; env slug / container / volume / image / port identities are unchanged. New instances use `{customer}-{productId}-{type}` names. Hybrid catalog in CP code (`martial-arts`, `sales` only). Beauty is not a catalog entry. Restore is selectable (`backupId`) with server-side same-customer/same-product rollback and PROD→DEV copy-down.

---

## What is implemented

### Martial Arts vertical (`martial_arts_template/`)

Full gym CRM derived from Renzo: households as `leads` + `lead_lines`, trials, intro `/trial`, follow-up, campaigns, events, marketing, settings, seed programs (`ADULT_BJJ` / `KIDS_BJJ`). Consumes `@crm/core` for brand, health, app-env, auth/users/RBAC **framework**, settings KV, shell/nav/settings/permission **registration**. Drizzle journal `0000`–`0020` remains in MA.

Local: http://localhost:5030 (`pnpm dev`). Laptop Docker PRODUCTION `:5000`, STAGE `:5010`, DEV `:5020`.

### Sales vertical (`sales_template/`) — C2A–B2 Successful; C2 Successful

Second working consumer of `@crm/core`. Package `sales-crm` (`private: true`). Extends `@crm/core`. Local: http://localhost:5040 (`pnpm dev`). SQLite `file:./data/app.sqlite`. Provisioned sqlite is `file:/app/data/sqlite/crm.sqlite`. Drizzle journal `0000`–`0003`. Docker image **`crm-sales:c2`**. Proposal PDFs in provisioned envs use `SALES_PROPOSALS_DIR=/app/data/uploads/proposals` on the existing assets/uploads volume (S6 zip already includes `/app/data/uploads`).

Second working local consumer of `@crm/core`. Package `sales-crm` (`private: true`). Extends `@crm/core`. Local only: http://localhost:5040 (`pnpm dev`). SQLite `sales_template/data/app.sqlite`. Drizzle journal `0000_wide_cyclops` + Slice A `0001_thankful_lyja` + B1 `0002_cheerful_firebrand` + B2 `0003_clammy_shocker`.

Domain: **Lead** (`sales_leads`; Company optional) → explicit **Convert Lead** → **Company** / Sales Account (`sales_accounts`) + Contact + Opportunity. Opportunity stages `proposal_quote` → `decision` → `won` \| `lost` (terminal until Reopen; structured loss reason). Operational Activities, chronological `sales_notes`, owners on Lead/Opportunity/Activity. Company and Opportunity workspaces. Permissions `VIEW_SALES` / `MANAGE_SALES`.

B1 adds Sales-owned Sources, Campaigns (no primary source), Campaign+Source Tracking Links, captured/current attribution, configuration-driven public intake (`/inquire`, `/t/{token}`), Offers, Opportunity commercial lines (one-time + MRR), Company lifecycle (`prospect` / `customer` / `former_customer`), dedicated `won_at` / `lost_at`, and baseline reporting. Public intake defaults **off**.

B2 adds a Sales-owned Proposal chain on each Opportunity: draft/issue/mark-sent/accept/decline/supersede, immutable issued commercial snapshots, instance letterhead (`sales.proposal_letterhead`), staff HTML preview, PDFKit-generated PDFs under `data/proposals/`, optional signed PDF upload. Accepted does **not** auto-Won. No browser e-sign, no CRM email, no customer portal.

No additional Sales CRM features shipped in C2 (no e-sign, email, portal). Strategic Insights has **not** been migrated or cut over. C2 proof used disposable Control Plane account **C2 QA Test**, not lab-acme or SI mutation.

C2A owner-accepted 2026-09-11. Closeout: [[history/C2A_closeout]]. C2B owner-accepted 2026-09-12. Closeout: [[history/C2B_closeout]]. Slice A implementation return: [[history/WO-2026-09-11-si-sales-slice-a-return]]. B1 owner-accepted 2026-09-12. Closeout: [[history/B1_closeout]]. Implementation return: [[history/WO-2026-09-12-si-sales-b1-commercial-acquisition-return]]. Work order (archived): [[wip/archive/WO-2026-09-12-si-sales-b1-commercial-acquisition]]. B2 owner-accepted 2026-09-13. Closeout: [[history/B2_closeout]]. Implementation return: [[history/WO-2026-09-12-si-sales-b2-proposal-system-return]]. Work order (archived): [[wip/archive/WO-2026-09-12-si-sales-b2-proposal-system]]. C2 owner-accepted 2026-09-15. Closeout: [[history/C2_closeout]]. Implementation return: [[history/WO-2026-09-14-c2-product-instance-sales-catalog-return]]. Work order (archived): [[wip/archive/WO-2026-09-14-c2-product-instance-sales-catalog]].

### CRM Core (`packages/crm-core`)

C1 units 1–3: pnpm workspace, thin Nuxt layer, ESLint/architecture test (Core must not import MA / sales / beauty), brand/health/app-env, auth/users/RBAC framework, settings KV, shell + registration. `control_plane` is **out** of the workspace. `martial_arts_template/` was **not** moved to `apps/`.

### Control Plane (`control_plane/`)

http://127.0.0.1:52100. Multi-page shell: Dashboard, Customers, Environments, Hosting Nodes, Settings. Observe + provision **product instances**. New customer = account only. Add Product Instance picks Martial Arts or Sales, creates that instance’s PROD+DEV, and provisions in the background. Extra non-PROD attaches to an instance. One-PROD per instance. Upgrade “non-PROD first” is instance-scoped. Gated decommission (volumes stay). Retry = continue/resume the same environments. Localhost `accessUrl`s. No operator login. Details: [[Control-Plane]].

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

Sales-led. `Customers → New customer` creates the **account only**. From the customer workspace Products tab, **Add product instance** and select Martial Arts or Sales. The Control Plane stores the instance immediately as **Provisioning**. Image build (`martial-arts-acquisition:s4` or `crm-sales:c2`) and compose run in the background from the product Dockerfile with **repo-root** context. Compose cwd is that product’s template directory. You can leave the page; Failed rows keep `provision_error` and Retry remounts the same volumes. Runbook: [[S4-Provision-Runbook]].

### Backup / restore (official S6 Successful; C2 copy-down included)

Lifecycle tab: same-host zip, **selectable backup history**, gated restore, off-host copy to an existing folder, backup-gated local upgrade, Explorer reveal (`POST .../backup/reveal` with `{ backupId }`, path must stay under `data/backups/`). Restore requires `{ confirm, backupId }` — it does not silently use the latest zip. Server-side policy: same customer + same Product Instance; same-environment rollback; **PROD → DEV copy-down**; never DEV → PROD; never cross-product or cross-customer. Snapshot is SQLite + persistent uploads (including Sales proposal PDFs). Target identity/port/compose/secrets stay. Retention 14 days. Runbook: [[S6-Fleet-Runbook]].

### Docker / runtime

Exact `docker inspect` + compose. Combined status: container running **and** `/api/health`. Distinct `stopped` vs `missing`. Forbidden: `-v`, `prune`, `down` on relaunch/start/stop.

---

## What is not implemented

Do not assume any of these exist:

- C3 Beauty, S7–S11, VPS / DNS / TLS
- Browser e-sign, public signing portal, customer portal, CRM email send, document/theme CMS
- Beauty vertical (sister business is the intended second **pilot**, not a shipped product)
- Completed generic Lead model in Core
- Generic Campaign / Event framework
- Generic public-capture framework
- Option C account-management redesign (multiple instances of the same product, SI cutover)
- VPS / remote nodes / image registry
- DNS / TLS / public hostnames / production edge
- Billing, Stripe, self-service signup
- Remote Control Plane auth (or any CP login)
- S-track rewritten around Core
- `martial_arts_template` moved to `apps/`
- Plugin framework, `tenant_id`, Beauty images

---

## Locked decisions

Link, do not re-litigate. Index: [[SaaS-Decisions]].

| Decision | Authority |
|---|---|
| Two tracks; Renzo is external | [[Working-Agreement]], [[Home]] |
| Vault is the durable record; wip is not | [[Working-Agreement]], [[Conventions]] |
| Official S-track; S0–S6 Successful | [[SaaS-Milestones]], [[SaaS-Decisions#2026-09-10 — Map B is the official post-S4 roadmap]] |
| S6 backup/restore/upgrade | [[SaaS-Decisions#2026-09-10 — S6 backup, restore, and upgrade]] |
| Core + vertical architecture | [[ADR-CRM-Core-Vertical-Architecture]] |
| C2A thin Sales consumer Successful | [[SaaS-Decisions#2026-09-11 — Official C2A is Successful]] |
| C2B Slice A Successful | [[SaaS-Decisions#2026-09-12 — Official C2B is Successful]] |
| SI Sales B1 Successful | [[SaaS-Decisions#2026-09-12 — Official SI Sales B1 is Successful]] |
| C2 Successful | [[SaaS-Decisions#2026-09-15 — Official C2 is Successful]] |
| C2 restore selection / PROD→DEV copy-down | [[SaaS-Decisions#2026-09-15 — C2 selectable restore and PROD→DEV copy-down]] |
| D1–D4 | [[SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain]] |
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
- No premature Core promotion (D2–D4 wait).
- No D1 schema rewrite unless authorized. Minimal D1 (`product_instances`) shipped in C2; do not expand to Option C unless a new work order says so.
- No destructive Docker: never `down -v`, never prune, never attach Renzo volumes.
- No architecture that contradicts [[ADR-CRM-Core-Vertical-Architecture]].
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
| Core / vertical ADR | [[ADR-CRM-Core-Vertical-Architecture]] |
| State lockfile | [[project-state.yaml]] |
| Work authorization | [[Work-Order-Protocol]], [[wip/_index]] |
| Customer / environment | [[Customer-Environment]] |
| Control Plane | [[Control-Plane]] |
| Open NEAR/DEF | [[SaaS-Open-Questions]] |
| Historical evidence | [[history/_index]] |
| Renzo gym evidence | [[Implementation-State]], [[Milestones]], [[Architecture]], [[Decisions]] |

Renzo gym notes at the vault root are **historical evidence of the source implementation**, not SaaS law. [[Architecture]] is the Renzo/source stack. Platform architecture is [[Platform-Architecture]].
