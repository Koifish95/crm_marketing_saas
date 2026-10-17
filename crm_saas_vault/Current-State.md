---
type: note
status: current
area: process
updated: 2026-10-15
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
| Sales pre-development architecture audit | **Complete** (2026-09-11, docs only). Evidence: [[wip/archive/WO-2026-09-11-sales-predev-audit-return]]. |
| Unified QA/ticketing + Martial Arts runner | **Operationally proven**; the seven findings from deep UI/UX audit `b80cd8c9-1569-40ea-83be-953fc9ae4cbe` were triaged, remediated, regression-tested, deployed to `lab-acme-dev`, retested, and resolved 2026-10-03 |

**Authorized work:** none. Control Plane operator experience & lifecycle **code-shipped** (2026-09-20): audit [[Control-Plane-Operator-UX-Audit]], return [[history/WO-2026-09-19-cp-operator-experience-return]]. Not an official S-track Successful. Pre-VPS product quality & release readiness **complete** (2026-09-19): Phase 1 [[Product-Workflow-UX-Audit]], Phase 2 [[Product-UX-Overhaul-Return]], Phase 3 [[Product-Release-Update-Lifecycle]] (return [[history/WO-2026-09-19-pre-vps-product-quality-return]]). Sales Minimum V1 remains **code-shipped** for SIC dogfooding; not a platform milestone and not owner-accepted Successful. A Nuxxion DigitalOcean VPS already exists. The Control Plane has been used there through an SSH tunnel, and environment provisioning has been exercised. That is not S7 or S8 Successful. Acme hosting acceptance, including reboot recovery, is live-proven ([[Nuxxion-Production-Acceptance]]). Official S7/S8 remain **Not started**. Immediate commercial priority is Top Tier Hauling ([[customers/Top-Tier-Hauling]]): committed external payer on the Sales CRM, revenue not collected. Unrelated feature work is frozen. This paragraph does not authorize provisioning or implementation. Architecture law is [[ADR-Product-Owned-Domains-Shared-Foundation]] (2026-09-17). Hosting-node map: [[Hosting-Node-Architecture]], [[Hosting-Node-Bootstrap-Runbook]], [[Production-Edge-Runbook]]. Do not start C3, Beauty, SI migration, Core-domain promotion, package rename, or `apps/` moves. See [[Working-Agreement]] and [[Work-Order-Protocol]]. Closeout: [[history/C2_closeout]]. Asset upload return: [[history/WO-2026-09-17-ma-multi-asset-upload-return]]. Architecture return: [[history/WO-2026-09-17-product-owned-domains-shared-foundation-return]]. Customer #1 sell-readiness: [[Martial-Arts-Customer-1-Sell-Readiness]], [[history/WO-2026-09-18-ma-customer-1-sell-readiness-return]]. Sales V1 return: [[history/WO-2026-09-19-sales-minimum-v1-return]]. Assessment (investigation record, V1 closed): [[Sales-SIC-Dogfooding-Readiness-Assessment]].

Lockfile: [[project-state.yaml]].

---

## Commercial priority

Top Tier Hauling is the immediate priority (2026-10-06). They are the first committed external paying customer and will use the Sales CRM. Payment has not started. Record: [[customers/Top-Tier-Hauling]]. Decision: [[SaaS-Decisions#2026-10-06 — Top Tier Hauling is the first committed external customer]].

Work that is in scope until they are live and paying: their onboarding, defects that affect production reliability or recovery, capabilities their agreed workflow requires, and documentation that makes the next customer repeatable. Beauty, a Sales redesign, a generic CRM, and other speculative features wait.

The Nuxxion DigitalOcean VPS is already the hosting node. Do not treat “obtain a VPS” as a blocker. Using that node is not S7 or S8 Successful.

2026-10-08 UTC production acceptance ([[Nuxxion-Production-Acceptance]]) is **READY FOR TOP TIER** as a hosting gate. Off-host disaster recovery, upgrade and rollback, and an SSH-managed VPS reboot are live-proven on Acme. Top Tier is still not provisioned. S7 and S8 stay Not started.

---

## Git and the VPS (2026-10-15)

Everything described here is committed and pushed to `origin/working` (release identity, Martial Arts funnel `0021`, QA remediation, vault overhaul; then the deploy foundation in `dd35777` and `6e08a1d`). Control Plane checks at `6e08a1d`: test 139/139, lint and typecheck clean, build passes.

**Workstation → VPS** ([[SaaS-Decisions#2026-10-15 — GitHub is the only source for the VPS; releases are commits pinned by digest]]): develop here, push, then `pnpm vps deploy`. Provisioning and upgrade pin environments to the CI image for the deployed commit (`ghcr.io/koifish95/<product>:<commit>`, [[SaaS-Decisions#2026-10-16 — CI builds product images and pushes them to GHCR; the VPS pulls them]]), or build it on the host when GHCR has none. Procedure: [[How-to-Run#Workstation → VPS: deploy a commit]].

**VPS state after the first deploy (2026-10-16 ~01:00 UTC, verified over SSH):** the hand-copied Control Plane files were archived to `/var/lib/sic/backups/pre-deploy-handcopied_20261016_005845.tgz` and the checkout reset to git. `pnpm vps deploy` moved the VPS from `47159a0` to `cbee291`; the migrator applied the skipped `0008_qa_ticketing` (10 migrations, QA/ticket tables present, `/api/tickets` and `/api/qa/runs` 200). The checkout shows only the generated `deploy/edge/nginx.conf` and `letsencrypt/`. Top Tier Hauling Sales DEV (`52203`) then PROD (`52202`) were stopped and re-provisioned from that commit: both run `crm-sales@sha256:6010e5b97402…`, `cbee2918bda0@6010e5b97402`, schema `0006_sales_prospect_outreach`, volumes kept. Acme PROD/DEV untouched (digest `64897047fdf3`, schema `0020`); `https://acme.nuxxion.com/api/health` 200.

**Sales UI cleanup deploy (2026-10-16 ~22:20 UTC):** `pnpm vps deploy` moved the VPS from `1cd643a` to `03ef751` (CI green, including the `crm-sales` image). Top Tier DEV was upgraded to `ghcr.io/koifish95/crm-sales@sha256:ab634be31071…`, release `03ef751b6db9@ab634be31071`, schema `0006_sales_prospect_outreach`, `pulled: true` (first live GHCR pull). Top Tier PROD is unchanged until the owner approves it. **Sales backups were broken:** the Control Plane backs up a running environment with `node docker/sqlite-snapshot.cjs` inside the app container, and only the Martial Arts image shipped that script. Top Tier DEV and PROD had no S6 backups at all, so the 02:30 UTC off-host backup cannot have covered Top Tier PROD. DEV was stopped (owner OK) and backed up from its volume (backup `bc64d120`) before the upgrade. The Sales image now builds and ships the same script; until an environment runs that image, its backups need the app stopped first. After `990164d` (deployed as `df1a5d3`), DEV was stopped, backed up (`b4b43908`) and upgraded to `df1a5d3c2214@e1fdd8cbf362`; a backup of the running DEV (`d158957e`) then succeeded, so live Sales backups work. With the owner's go, Top Tier PROD was stopped, given its first backup (`965c38ab`) and upgraded at 22:40 UTC to the same digest as DEV (`df1a5d3c2214@e1fdd8cbf362`, about 15 s down); `https://top-tier-hauling.nuxxion.com/api/health` 200 and a backup of the running PROD (`ff2c04dd`) succeeded. Acme untouched.

**Lead intake key and DEV colours deploy (2026-10-17 ~03:31 UTC):** owner-directed through The Board on 2026-10-16 (Log notes; no vault work order was opened, recorded here instead). The Control Plane now generates a 32-byte `LEAD_INTAKE_KEY` for each Sales environment at provisioning, backfills one on upgrade when missing (never overwrites), passes it through `sales_template/docker-compose.provisioned.yml`, shows it once on the environment Release tab ("Show key (once)") and can rotate it; reveal and rotate refuse environments that are not `ready` and all Martial Arts environments; the key is redacted from events, stored errors and docker failures. Sales now sets `data-app-env` on `<html>`, so the existing DEV red / STAGE green navy remap applies (it never did before). `pnpm vps deploy` moved the VPS from `df1a5d3` to `8ee07df` (CI green, including `crm-sales`). Top Tier DEV: live backup `7ac9ab78`, upgraded to `8ee07dfde2a8@cc010420c5d8`, `pulled: true`, `leadIntakeKeyPending: true`, health 200, `data-app-env="dev"`. Top Tier PROD unchanged until the owner approves. Acme untouched.

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
├── pnpm-workspace.yaml          # packages/crm-core + martial_arts_template + sales_template + marketing_site
├── package.json                 # root workspace stub; Node 22+; pnpm 10
├── packages/crm-core/           # @crm/core — shared application foundation (C1 shipped; name historical)
├── martial_arts_template/       # Martial Arts product; local :5030; Docker :5000/:5010/:5020
├── sales_template/              # Sales product (sales-crm); local :5040; Docker image crm-sales:c2
├── marketing_site/              # Nuxxion public site; local :5050; not a customer image; not deployed
├── control_plane/               # NOT in the workspace; http://127.0.0.1:52100
├── deploy/                      # hosting-node bootstrap + systemd unit, edge nginx/ACME, Customer #1 edge templates
├── tools/                       # `pnpm vps` — VPS Control Plane helper (SSH test, status, start/stop/restart, tunnel)
├── docs/                        # customer/staff/operator docs (derived; not this map)
└── crm_saas_vault/              # this vault
```

**Runtime:** Martial Arts, Sales, and Control Plane run on a **laptop lab node** (`kind=laptop`) or a **Linux hosting node** (`kind=vps`, same local Docker). Laptop `pnpm dev` remains MA :5030 and Sales :5040. Control Plane is always `127.0.0.1:52100`. On the Nuxxion VPS it is systemd `sic-control-plane`, always running; the operator reaches it with an SSH tunnel. From the repo root, `pnpm vps` tests SSH, reports status, starts/stops/restarts that one service, and opens the tunnel ([[How-to-Run]]). Never `docker compose down -v`, never prune, never attach `webhosting_renzo_*` / leftover `renzo-*` volumes. Do not copy laptop sqlite onto the Pi. Do not touch `Projects/renzo_crm` or Koi-Pi PRODUCTION.

**Marketing site:** `marketing_site/` (`nuxxion-marketing`) is the public Nuxxion site for Nuxxion Martial Arts. Local `pnpm dev` is http://localhost:5050. It is not a customer product image, does not write Sales or Martial Arts databases, and is not deployed. Phase 1 demo requests are validated locally only. Sales public intake still requires separate first and last names, and its `website` field remains a honeypot.

**Image tags in use:** `martial-arts-acquisition:s2` (Acme lab), `martial-arts-acquisition:s4` (provisioned MA build target), `crm-sales:c2` (provisioned Sales build target). Do not rename or retag existing MA images. A pinned or upgraded environment runs `{repository}@sha256:…`, not the mutable tag; on the VPS both Acme environments run `martial-arts-acquisition@sha256:64897047fdf3…`.

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

Full gym CRM derived from Renzo: households as `leads` + `lead_lines`, trials, intro `/trial`, follow-up, campaigns, events, marketing, settings, seed programs (`ADULT_BJJ` / `KIDS_BJJ`). Consumes `@crm/core` for brand, health, app-env, auth/users/RBAC **framework**, settings KV, shell/nav/settings/permission **registration**. Drizzle journal `0000`–`0021_cheerful_lethal_legion` remains in MA.

Acquisition funnel analytics is a Martial Arts product capability (2026-10-06). Each environment stores its own `acquisition_funnel_events` and activation timestamp. Staff with `VIEW_MARKETING_REPORTS` read unique journeys on Campaign → Performance. The Control Plane does not warehouse those events. Spec: [[Acquisition-Funnel-Analytics]]. Health `schemaVersion` is `0021_cheerful_lethal_legion`.

Staff with `MANAGE_ASSETS` can select one or many files in Asset Library and on Campaign → Assets. Each successful file creates one independent Asset through sequential `POST /api/marketing/assets` (concurrency 1). Partial failures keep successes; retry sends only failed/unattempted files; 401/403 stops the remaining batch. The existing Asset picker still only attaches already-created Assets.

Customer #1 sell-readiness (repository-complete 2026-09-19): unique initial-access passwords, CSRF/trusted-proxy/security headers, VACUUM INTO backups, health `releaseId`/`schemaVersion`, lead CSV import/export, and `deploy/customer-1/` nginx TLS edge templates. Tracker: [[Martial-Arts-Customer-1-Sell-Readiness]]. Live VPS/DNS/TLS remain official S7/S8.

Local: http://localhost:5030 (`pnpm dev`). Laptop Docker PRODUCTION `:5000`, STAGE `:5010`, DEV `:5020`.

### Sales product (`sales_template/`) — C2A–B2 Successful; C2 Successful; Minimum V1 code-shipped

Second working product consuming the shared foundation `@crm/core` (Nuxt `extends`). Package `sales-crm` (`private: true`). Local: http://localhost:5040 (`pnpm dev`). SQLite `file:./data/app.sqlite`. Provisioned sqlite is `file:/app/data/sqlite/crm.sqlite`. Drizzle journal `0000`–`0006_sales_prospect_outreach` is **Sales-owned** (including `users` / RBAC / `app_settings` created in `0000_wide_cyclops`; V1 firmographics/outcomes in `0004_sales_v1_dogfood`; prospect pool in `0005_sales_prospect_pool`; prospect outreach desk in `0006_sales_prospect_outreach`). Health `schemaVersion` is `0006_sales_prospect_outreach`. Docker image **`crm-sales:c2`**. Proposal PDFs in provisioned envs use `SALES_PROPOSALS_DIR=/app/data/uploads/proposals` on the existing assets/uploads volume (S6 zip already includes `/app/data/uploads`).

Sales already performed the architectural role of the second consumer: it shares foundation infrastructure and owns a **divergent** domain (not a Core Lead/Campaign). Do not describe Sales as still needing to be built to challenge Core.

**SIC outbound path (D1):** Company → Contacts → Opportunity. **Lead** remains for inbound/public intake. Convert still creates company + contact + opportunity and keeps the Lead.

**Pipeline (D2):** Working → Proposal/Quote → Decision → Won/Lost. Manual create and Lead convert default to **Working**. Existing `proposal_quote` records remain valid. A demo is a Meeting activity, not a stage.

Domain: **Lead** (`sales_leads`; Company optional) → explicit **Convert Lead** → **Company** / Sales Account (`sales_accounts`, optional website/phone/city/state) + Contact + Opportunity. Operational Activities with required due dates, structured outcomes on call/email/meeting, and complete-and-schedule-next. Chronological `sales_notes`. Company list shows lifecycle (Prospect / Customer / Former Customer) separately from Active. Opportunity list shows company, stage, one-time, MRR, and next open activity. Dashboard **Work today** lists overdue, due today, and open opportunities. Won/Lost prompts to cancel remaining open activities (default yes; completed history kept; Reopen does not restore cancelled tasks). Won shows an operator serve checklist (no Control Plane auto-create). Permissions `VIEW_SALES` / `MANAGE_SALES`.

B1 adds Sales-owned Sources, Campaigns (no primary source), Campaign+Source Tracking Links, captured/current attribution, configuration-driven public intake (`/inquire`, `/t/{token}`), Offers, Opportunity commercial lines (one-time + MRR), Company lifecycle (`prospect` / `customer` / `former_customer`), dedicated `won_at` / `lost_at`, and baseline reporting. Public intake defaults **off**. Seeded starter offers (editable, Sales-owned, not a platform catalog): Martial Arts CRM monthly $250 and Provisioning / Setup one-time $500.

B2 adds a Sales-owned Proposal chain on each Opportunity: draft/issue/mark-sent/accept/decline/supersede, immutable issued commercial snapshots, instance letterhead (`sales.proposal_letterhead`), staff HTML preview, PDFKit-generated PDFs under `data/proposals/`, optional signed PDF upload. Accepted does **not** auto-Won. No browser e-sign, no CRM email, no customer portal.

Sales Minimum V1 is **code-shipped** for SIC to begin dogfooding. It is **not** a new C-track milestone and is **not** owner-accepted Successful. Investigation record: [[Sales-SIC-Dogfooding-Readiness-Assessment]]. Return: [[history/WO-2026-09-19-sales-minimum-v1-return]].

**Prospect pool (internal SIC, 2026-09-27, code-shipped).** Discovered martial-arts businesses live in `sales_prospects` plus `sales_prospect_observations`, not in Company / Work today. Review at `/prospects`. **Promote** creates or links a Company, a Front Desk contact when a public email or phone exists, and a Working opportunity with source Cold Outreach and source detail `prospect:{id}`. The same registrable domain is one prospect. Without a domain, normalized name + city + state is one prospect. A shared phone flags a possible duplicate and does not merge. Do not contact on the prospect blocks promotion. After promotion, Do not contact sets `sales_accounts.do_not_contact`, which also blocks a later promote of a matching academy. Outreach mail is the prospect desk sequence, not a Sales Activity and not a general inbox. No numeric score.

One-state discovery, from `sales_template/`:

```text
pnpm prospect:discover
pnpm prospect:discover -- --refresh
pnpm prospect:enrich
pnpm prospect:enrich -- --limit 25
```

`prospect:discover` still queries OpenStreetMap Overpass for Utah once and caches `data/prospect-cache/overpass/us-ut.json` (gitignored). The operator desk at `/prospects` runs one practice state at a time and stores a row only when it has a name, city, state, its own website, and a public email from that site. Utah and the bordering states stay out of Ready and Sending. Existing Utah rows remain, lane `local`.

The desk shows Stored, Ready, Sending today against a default cap of 5, and Needs you. A three-touch sequence sends only inside a Denver weekday window, with minutes between messages. A reply, bounce, or unsubscribe stops that academy. Any reply that is not an unsubscribe, bounce, or out-of-office lands in Needs you. The product does not write an answer. Opens are recorded only when a public base URL is set, are labeled unreliable, and never schedule the next touch. Two bounces in a Denver day pause sending. Promote still creates or links Company, contact, and a Working opportunity, and it does not send mail. The desk is on for the local dogfood database and off until enabled on any other Sales database. Settings: `/settings/prospects`. Mail is SMTP submit plus IMAP read of one mailbox; tests use a fixture and do not open a socket. Return: [[history/WO-2026-10-02-sales-prospect-outreach-desk-return]]. Decision: [[SaaS-Decisions#2026-10-02 — Sales prospect outreach desk]]. Earlier pool return: [[history/WO-2026-09-27-sales-prospect-pool-return]].

**Local Sales sqlite backup (2026-09-27).** `sales_template/data/app.sqlite` is the internal dogfood database. From `sales_template/`, `pnpm backup:local` runs `VACUUM INTO` after a WAL checkpoint, integrity-checks the snapshot, and writes `data/backups/sales-local-<timestamp>.sqlite`. That directory is gitignored. Retention is 14 days, and the newest snapshot is kept even if it is older. `pnpm backup:restore -- --to <disposable-path>` copies a snapshot to another file and refuses the live database path. On Scott’s PC, Task Scheduler task `Nuxxion Sales local backup` runs `scripts/backup-local-scheduled.cmd` daily at 02:00 local. This is not the Control Plane fleet backup and does not protect provisioned volumes. First-outreach cockpit: [[Nuxxion-First-Outreach-Playbook]]. Return: [[history/WO-2026-09-27-sales-local-backup-return]].

No additional Sales CRM features shipped in C2 (no e-sign, email, portal). Strategic Insights has **not** been migrated as a Control Plane customer. C2 proof used disposable Control Plane account **C2 QA Test**, not lab-acme or SI mutation.

C2A owner-accepted 2026-09-11. Closeout: [[history/C2A_closeout]]. C2B owner-accepted 2026-09-12. Closeout: [[history/C2B_closeout]]. Slice A implementation return: [[history/WO-2026-09-11-si-sales-slice-a-return]]. B1 owner-accepted 2026-09-12. Closeout: [[history/B1_closeout]]. Implementation return: [[history/WO-2026-09-12-si-sales-b1-commercial-acquisition-return]]. Work order (archived): [[wip/archive/WO-2026-09-12-si-sales-b1-commercial-acquisition]]. B2 owner-accepted 2026-09-13. Closeout: [[history/B2_closeout]]. Implementation return: [[history/WO-2026-09-12-si-sales-b2-proposal-system-return]]. Work order (archived): [[wip/archive/WO-2026-09-12-si-sales-b2-proposal-system]]. C2 owner-accepted 2026-09-15. Closeout: [[history/C2_closeout]]. Implementation return: [[history/WO-2026-09-14-c2-product-instance-sales-catalog-return]]. Work order (archived): [[wip/archive/WO-2026-09-14-c2-product-instance-sales-catalog]].

### Shared foundation (`packages/crm-core`, package name `@crm/core`)

C1 units 1–3 **code-shipped** and **still in force**: pnpm workspace, thin Nuxt layer, ESLint/architecture test (foundation must not import MA / sales / beauty), brand/health/app-env, auth/users/RBAC framework, settings KV, shell + registration. The package name is historical; it is the shared **application foundation**, not a CRM domain. No Core migrator. No Core pages. Version `0.0.0` / `workspace:*`. `control_plane` is **out** of the workspace. `martial_arts_template/` was **not** moved to `apps/`. Do not split the package or rename it without a new work order.

### Control Plane (`control_plane/`)

**QA and unified ticketing (code-shipped, operationally proved, and used for a closed remediation loop).** The operator shell adds **Tickets** and **QA Runs**. Relational tickets include source/category/lifecycle, comments, activity, assignment labels, resolution, and evidence links. Persisted QA runs include workflows, structured findings, and file-backed evidence. Findings may be converted/linked, dismissed, or marked duplicate without deletion. The Martial Arts Playwright runner selects an exact registered slug/ID, supports explicit gitignored environment credentials or process-only QA credentials, requires ready non-PROD, and refuses PROD before credential or browser work. The 2026-10-03 deep audit produced seven Medium findings; all were accepted, represented without duplicate tickets, fixed in Martial Arts, regression-tested, deployed only to `lab-acme-dev`, and verified through read-only run `5a840850-ce7d-4856-93cc-5c77e5310c8f`, targeted run `ba7db15b-9fae-4a3f-8c5e-760a60f36a87`, and corrective lead-detail run `89c446c6-a52d-4aa8-ae2a-bb161319c04d`. The seven linked tickets are DONE with original and verification evidence. Evidence bytes are gitignored on disk and copied beside Control Plane registry snapshots. Architecture/runbook: [[QA-Ticketing-Architecture]], [[QA-Ticketing-Runbook]]. Evidence: [[history/WO-2026-10-02-qa-ticketing-operational-proof-return]], [[history/WO-2026-10-03-ma-ui-ux-audit-return]], [[history/WO-2026-10-03-ma-qa-remediation-return]].

http://127.0.0.1:52100. Multi-page shell: Dashboard, Customers, Products, Environments, Tickets, QA Runs, Backups, Reports, Hosting Nodes, Settings. Observe + provision **product instances**. Customers default to **active**; deactivate/reactivate keeps the account. Product instances deactivate independently (customer deactivate also marks them inactive and stops their live processes; customer reactivate restores instance `active` without starting Docker). New customer = account only. Add Product Instance picks Martial Arts or Sales, creates that instance’s PROD+DEV, and provisions in the background. Extra non-PROD attaches to an instance. One-PROD per instance. Upgrade “non-PROD first” is instance-scoped. **Stop** = process halt. **Decommission** = process gone, volumes stay. **Archive & Delete** = final backup + exact registered volume remove; row stays `archived`. Retry = continue/resume the same environments. PROD may store `public_hostname`; access URL becomes `https://{hostname}`. Health URLs stay loopback. No operator login; non-loopback is 403 unless `CONTROL_PLANE_ALLOW_REMOTE` + token. Newly provisioned environments unwrap as `admin` / `setup` with forced password change. `setup` is not a compliant permanent password. Decision: [[SaaS-Decisions#2026-09-24 — Provisioned environments unwrap with admin / setup]]. Hosting node: [[Hosting-Node-Architecture]]. Details: [[Control-Plane]]. Operator UX audit: [[Control-Plane-Operator-UX-Audit]].

### Environment lifecycle

| Action | Command / API | Notes |
|---|---|---|
| Relaunch | `up -d --force-recreate --no-deps app` | Recreate process, same volumes |
| Start | `compose start app` · `POST .../start` | Resume stopped. Not Relaunch. Missing excluded |
| Stop | `compose stop app` · `POST .../stop` | Halt process. Never sets `decommissioned` |
| Bulk start/stop | `POST .../bulk/start` · `.../bulk/stop` | Sequential; `{ scope: selected\|all, ids? }` |
| Decommission | `compose rm -f --stop app` | Sets `decommissioned`. Volumes stay |
| Archive & Delete | `POST .../archive` | Final backup, exact `docker volume rm` of this env’s sqlite/assets, row stays `archived`. Type slug + `ARCHIVE AND DELETE`. PROD cannot skip off-host. |

Start All / Stop All = eligible **registered fleet**, not the table filter. Eligibility: [[Control-Plane]].

### Provisioning

Sales-led. `Customers → New customer` creates the **account only**. From the customer workspace Products tab, **Add product instance** and select Martial Arts or Sales. The Control Plane stores the instance immediately as **Provisioning**. Image build and compose run in the background from the product Dockerfile with **repo-root** context. The image is `<repo>:<commit>` built from the checked-out commit (reused only for a clean tree; refused on a VPS when product source has uncommitted changes), and each new environment is pinned to `<repo>@sha256:…` with `RELEASE_ID=<commit>@<12hex>`. `martial-arts-acquisition:s4` / `crm-sales:c2` remain only as catalog repository names and compose defaults. Compose cwd is that product’s template directory. You can leave the page; Failed rows keep `provision_error` and Retry remounts the same volumes. Initial access is `admin` / `setup` with `NUXT_AUTH_MUST_CHANGE_PASSWORD=true`, written to the env file (chmod 0600). First login opens `/account/password`. Decision: [[SaaS-Decisions#2026-09-24 — Provisioned environments unwrap with admin / setup]]. Runbook: [[S4-Provision-Runbook]].

### Backup / restore (official S6 Successful; C2 copy-down included)

Environment **Backup** tab: same-host zip, **selectable backup history**, gated restore, off-host copy to an existing folder (or a script-verified `rclone` `remote:path`), Explorer reveal (`POST .../backup/reveal` with `{ backupId }`, path must stay under `data/backups/`). Fleet list: `/backups`. Restore requires `{ confirm, backupId }` — it does not silently use the latest zip. Server-side policy: same customer + same Product Instance; same-environment rollback; **PROD → DEV copy-down**; never DEV → PROD; never cross-product or cross-customer. Decommissioned environments may still be backed up (volumes exist); archived environments may not. Snapshot is SQLite via **VACUUM INTO** + persistent uploads (including Sales proposal PDFs). Target identity/port/compose/secrets stay. Retention 14 days. Stale-backup attention is a 7-day heuristic, not a retention policy. Runbooks: [[S6-Fleet-Runbook]], [[Customer-1-Backup-Restore-Runbook]].

**Release pin, upgrade, rollback (uncommitted; live-proven on Acme 2026-10-07).** `POST …/release-pin` pins the running image by digest and stamps `RELEASE_ID={sha}@{12-hex}`. Upgrade refuses until the release is pinned, records the previous digest + release id on the latest backup, and reuses a digest DEV already runs for PROD instead of rebuilding. `POST …/rollback` `{ confirm, backupId }` restores that backup and starts that digest. Pin and rollback are API-only. On the VPS, the 02:30 UTC off-host job backs up each PROD through the Control Plane API and records the rclone path only after `rclone check`.

### Docker / runtime

Exact `docker inspect` + compose. Combined status: container running **and** `/api/health`. Distinct `stopped` vs `missing`. Forbidden: `-v`, `prune`, `down` on relaunch/start/stop.

---

## What is not implemented

Do not assume any of these exist:

- C3 Beauty as an independently owned product; official S7–S11 **Successful** marks. A Nuxxion DigitalOcean VPS is already in use. Acme reboot, backup, off-host restore, and upgrade/rollback are live-proven ([[Nuxxion-Production-Acceptance]]). S7 and S8 are not Successful. See [[Hosting-Node-Bootstrap-Runbook]] and [[customers/Top-Tier-Hauling]]
- Browser e-sign, public signing portal, customer portal, document/theme CMS. Prospect outreach mail is the Sales desk sequence only (capped SMTP/IMAP). It is not a general CRM inbox.
- Automated prospect scoring, Google Places, paid lead data, and social-network scraping
- Beauty product (sister business is the intended second **pilot**, not a shipped product)
- Generic Lead / Campaign / Event / public-capture model in the foundation (not planned)
- Option C account-management redesign (multiple instances of the same product, SI cutover)
- Remote Docker API / multi-node orchestration / image registry as a product
- Owner-accepted public DNS/TLS (S8). Live check 2026-10-15 UTC: `https://acme.nuxxion.com/api/health` returns 200 with a valid Let's Encrypt certificate (expires 2026-12-24); last off-host status `2026-10-15T02:30:12Z OK nuxxion-dr:20261015_023001`. That is evidence, not S8 Successful
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
| Top Tier is the first committed external payer; revenue not collected | [[SaaS-Decisions#2026-10-06 — Top Tier Hauling is the first committed external customer]] |

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
| Run things (VPS Control Plane TL;DR, local dev) | [[How-to-Run]] |
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
| Real customer deployments | [[customers/_index]] |
| Top Tier Hauling | [[customers/Top-Tier-Hauling]] |
| Production acceptance | [[Nuxxion-Production-Acceptance]] |
| Sales SIC dogfooding assessment (investigation + V1 status) | [[Sales-SIC-Dogfooding-Readiness-Assessment]] |
| Pre-VPS workflow/UX audit (Phase 1) | [[Product-Workflow-UX-Audit]] |
| Pre-VPS UX overhaul return (Phase 2) | [[Product-UX-Overhaul-Return]] |
| Pre-VPS release/update lifecycle (Phase 3) | [[Product-Release-Update-Lifecycle]] |
| QA and unified ticketing | [[QA-Ticketing-Architecture]], [[QA-Ticketing-Runbook]] |
| Product / operator documentation package (derived; not this map) | `docs/1 - README.md` |
| Customer #1 production deploy | [[Customer-1-Production-Deploy-Runbook]] |
| Customer #1 backup/restore | [[Customer-1-Backup-Restore-Runbook]] |
| Martial Arts product boundary | [[Martial-Arts-Product-Boundary]] |
| Renzo gym evidence | [[Implementation-State]], [[Milestones]], [[Architecture]], [[Decisions]] |

Renzo gym notes at the vault root are **historical evidence of the source implementation**, not SaaS law. [[Architecture]] is the Renzo/source stack. Platform architecture is [[Platform-Architecture]].
