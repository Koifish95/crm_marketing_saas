---
type: note
status: current
area: process
updated: 2026-09-08
aliases:
  - SaaS alignment
  - Current understanding
tags:
  - saas
  - alignment
  - discovery
---

# SaaS Project Alignment and Current Understanding

**Date:** 2026-09-08  
**Workspace:** `C:\Users\Scoy9\Projects\crm_marketing_saas`  
**Task:** Discovery and alignment only. No implementation, no architecture specification, no productization roadmap.

This document is a durable alignment artifact. It records what the sources currently establish, what later instructions added, and what remains unresolved. It is not a license to implement.

## Source status

The alignment instructions asked to prioritize the completed handoff:

`Renzo_CRM_to_SaaS_Productization_Handoff_2026-09-08.md`

**That completed handoff was not found** in this workspace or under `C:\Users\Scoy9\Projects`. A repository-wide search returned only the *create* prompt.

Sources actually used:

| Source | Role | Confidence as current |
|---|---|---|
| `vault/wip/Cursor_SaaS_Project_Alignment_Instructions_2026-09-08.md` | Task contract + newer product/ops directions after the intended handoff | High for *this* workstream's working directions |
| `vault/wip/Create_Renzo_CRM_to_SaaS_Productization_Handoff_Prompt_2026-09-08.md` | Describes what the missing handoff was *intended* to contain; not the handoff itself | High as intent; not evidence of completed discovery |
| Repo-root `AGENTS.md` | Product briefing for the copied Renzo codebase | High for Renzo constraints; explicitly *not* SaaS |
| Durable vault notes: `Home`, `Implementation-State`, `Milestones`, `Architecture`, `Domain-Model`, `Requirements`, `Funnel`, `CRM`, `Authentication`, `Database`, `Decisions`, `Open-Questions`, `Intro-Scheduling`, `Design-System`, `How-to-Run`, `Deploy-Workflow`, `Operations-PRODUCTION-SQLite`, `Koi-Pi-Infrastructure`, `Workspace`, `Overview` | Current Renzo customer-implementation map | High for documented Renzo rules; some notes are stale relative to later notes |
| This workspace itself | Appears to be the intended SaaS snapshot/copy of Renzo | Likely; Git/history relationship not verified in this pass |

A full repository audit of application code was **not** performed. Code is treated as authoritative for implementation details, but this document stays on documented sources except where a documented contradiction already requires later verification.

Confidence vocabulary used below:

```text
Known / confirmed
Working decision
Likely
Hypothesis
Suspected
Unknown
Decision required
Repository verification required
```

---

## 1. Executive Understanding

### What Renzo CRM is

**Known / confirmed.** Renzo CRM (working name: **Renzo Gracie Kaysville Acquisition**) is a single-gym customer-acquisition application for **Renzo Gracie Jiu Jitsu in Kaysville, Utah**. It is an information system that captures leads, stores intro (Trial) history, supports staff follow-up, and runs collaborative marketing operations that **feed** acquisition.

It is explicitly **not**:

- a gym-management product;
- a social-media manager;
- a membership, billing, or attendance system;
- multi-tenant SaaS.

The original problem was delay between interest, contact capture, and a locked intro time. Through about **mid-November 2026** the gym's acquisition window matters. Scott is building and operating the system; he is not a traditional social media manager. The gym owns Meta/business assets. Scott currently owns/controls the application and infrastructure.

The desired Renzo path is:

```text
interest → phone → scheduled intro → staff notified → next-day personal call → attend or no-show → join or keep following up
```

The system automates capture, scheduling, task creation, and state. It does **not** automate the sales conversation.

### What the SaaS productization effort is

**Working decision / emerging direction.** A separate workstream intends to productize the *kind of system Renzo proved* into a commercial platform: an ultra-general marketing, lead-generation, and CRM platform for small and medium-sized businesses.

This workspace (`crm_marketing_saas`) is **likely** the intended snapshot/reference copy of the Renzo codebase. The create-handoff prompt said Scott would copy `renzo_crm` under a different project name and treat that copy as a technical starting reference — **not** as the correct SaaS architecture.

The intended process remains:

```text
Discovery
→ Product Definition
→ Architectural Analysis
→ Repository Audit
→ Decisions
→ Productization Roadmap
→ Implementation
```

Current discovery is intentionally shifting toward **infrastructure and provisioning**: how to reliably create and operate additional customer environments, starting with another martial-arts academy, while preserving a path toward additional industry variants and larger hosting.

### Why they are separate

**Known / confirmed for Renzo; working decision for the split.**

Renzo production is a live academy system. Koi-Pi PRODUCTION SQLite (`webhosting_renzo_sqlite`) already holds real academy records. Deploy, backup, UX acceptance, and September-campaign evidence belong to that customer implementation.

SaaS productization is a different question: what product is being sold, what architecture can onboard customer #2 without a code fork, and how environments are provisioned and operated.

Mixing them would risk:

- changing live Renzo behavior to satisfy hypothetical tenants;
- treating Renzo-specific rules (household, Trial, compensation, intro timetable, branding, Denver timezone, Renzo hostnames) as universal platform law;
- breaking PRODUCTION data or the Pi hosting contract while experimenting;
- committing SaaS refactors into Renzo production history.

The create-handoff prompt is explicit that the wrong next step is:

```text
copy renzo_crm
→ tell Cursor "make it multi-tenant"
→ immediately refactor
```

The alignment instructions repeat that prohibition and add: do not interpret this task as converting Renzo, building a control plane, migrating the database, building billing, or creating the final SaaS architecture.

### Where the project is currently heading

**Working direction, not completed architecture.**

```text
Platform
→ Industry Template
→ Customer Instance
→ Enabled Capabilities
→ Configuration
```

Near-term commercial shape:

- first industry variant: **Martial Arts**, with Renzo as design partner and proving ground;
- likely second variant: **Beauty / Salon / Esthetician**, because its acquisition workflow differs and will expose what is actually generic;
- do **not** launch by supporting every industry;
- sales-led onboarding, not self-service signup;
- platform owner also gets a normal customer CRM environment plus a higher-level control plane;
- each customer is expected to receive an **individually containerized environment**;
- initial hosting may be a Raspberry Pi used to prove provisioning, then VPS/server nodes;
- lead capture starts with trackable links to a public form;
- deeper Meta integration is a later funnel-visibility goal, not current work.

The existing Renzo application is **evidence**. It is not automatically the final SaaS architecture.

---

## 2. Current Renzo Capability Understanding

Classification key:

```text
Implemented
Partial
Planned
Not in scope
Unknown / requires repository verification
```

This inventory is from durable vault notes and `Implementation-State.md` (updated 2026-09-08). It is not a code audit.

### 2.1 Foundation and operations

| Capability | Status | Notes |
|---|---|---|
| Nuxt 4 monolith (Vue + Nitro + Drizzle + SQLite) | Implemented | One app. No Python. No Express/FastAPI sidecar. |
| Local `pnpm dev` on :5030 | Implemented | Never binds 3000 / 5000 / 5010 / 5020. |
| Laptop Docker DEV / STAGE / PRODUCTION | Implemented | `:5020` / `:5010` / `:5000`. One image. Isolated volumes. |
| Pi public HTTP then HTTPS | Implemented / live-validated | M10C / M10D. Hosts `app` / `stage.app` / `dev.app`. Cert expires 2026-12-06. |
| Health check | Implemented | `GET /api/health` (process + `select 1`). |
| Migrations + seed | Implemented | `0000`–`0020`. Seed idempotent. Docker entrypoint documented as migrate-then-seed. See §15 for a stale Database.md contradiction. |
| Vitest suite | Implemented | Grouped by milestone. Latest documented run: 321 passed / 64 files. No Playwright. |
| Same-host backup / restore (laptop) | Implemented / Partial | M10B zip of SQLite + uploads. PRODUCTION daily 02:00 Denver, 14-day retention. Pi restore **not LIVE-VALIDATED**. |
| Off-host / cloud backup | Planned / later M10 | Explicitly not started. |
| PostgreSQL | Planned / later | Decision: SQLite now, Postgres if needed. Do not write SQLite-only app logic. |
| CI/CD | Unknown / not documented as present | Deploy is Git push + refresh + Pi rebuild. No documented GitHub Actions product pipeline. |

### 2.2 Authentication, users, RBAC, security

| Capability | Status | Notes |
|---|---|---|
| Username or email login | Implemented | `admin` / `admin@local` / `setup` in DEV, STAGE, and PRODUCTION when unset (pilot convenience). |
| Sealed cookie sessions | Implemented | `nuxt-auth-utils`, 8 hours, no Remember Me, no JWT. |
| scrypt password hashes | Implemented | `@adonisjs/hash`. Permanent policy: 8+ chars, uppercase, special. |
| Forced first-login password change | Implemented | New users `mustChangePassword`; default temp `Change1!`. |
| ADMIN reset vs require-change | Implemented | Reset sets chosen permanent password. Require-change keeps current password and forces change after next sign-in. |
| Session revocation | Implemented | `users.session_version`. |
| Coarse roles | Implemented | `ADMIN` / `STAFF` / `VIEWER`. VIEWER is dashboard-only. |
| Marketing Access Rights | Implemented | Code catalog on top of coarse roles. ADMIN has every right in code. STAFF starts with none. |
| User administration | Implemented | `/users`. Never hard-delete. Cannot self-deactivate or remove last ADMIN. |
| Security activity | Implemented | Append-only `security_events` at `/security`. |
| Login throttle | Partial | In-memory IP+email after 5 failures. Not multi-instance. Not a hard lockout. |
| Public rate limit | Partial | In-memory per process. Documented as not production-grade for multiple instances. |
| MFA / emailed forgot-password | Not in scope for current V1 | Explicitly deferred. |
| HTTPS / Secure cookies on Pi | Implemented | After M10D. Laptop HTTP uses Secure=false. |

### 2.3 Household CRM, trials, follow-up, conversion

| Capability | Status | Notes |
|---|---|---|
| LeadHeader household / inquiry | Implemented | Table `leads`. Contact person, not automatically the member. |
| LeadLine prospective members | Implemented | `SELF` / `CHILD` / `SPOUSE` / `OTHER`. At most one `SELF`. |
| Public `/trial` household booking | Implemented | Phone required. One person or family. Transactional. Never merges. |
| Staff `/leads/new` household create | Implemented | Same model; Trial not required. Opaque idempotency key. |
| Possible-duplicate warning | Implemented | Phone/email indexed, not unique. Staff-only. No merge UI. |
| Trial as separate history rows | Implemented | Reschedule cancels old row and creates new. No overwrite. |
| Intro availability configuration | Implemented | Weekly rules + date exceptions. 14 Denver-day horizon. Not a class scheduler. |
| FollowUpTask confirmation calls | Implemented | Auto-create on Trial `SCHEDULED`. Due two weekdays later at 5:00 PM Denver. Unassigned. |
| Event vs intro call consolidation | Implemented | Overlapping pending Event and intro calls become one household phone call. |
| Manual follow-up tasks | Implemented | `purpose = MANUAL`. |
| Trial outcomes | Implemented | `ATTENDED` / `NO_SHOW` / `CANCELLED`. `allowEarlyTrialOutcomes` ADMIN setting, default ON. |
| Repeat trials after attend | Implemented | Later intro returns open line to `TRIAL_SCHEDULED`. History kept. |
| Conversion per LeadLine | Implemented | Snapshot integer cents. No `Member` table. ADMIN reverse. |
| Lost outcomes | Implemented | Required reason. Cannot mark JOINED lost until conversion reversed. |
| Household display status | Implemented | Active / mixed / Joined / Lost / Closed mixed. Not one person's No-show. |
| Forecast MRR vs Conversion Snapshot MRR | Implemented | Forecast prices open lines only. Neither is cash collected. |
| Catalog: programs, offerings, sources, lost reasons, household pricing | Implemented | ADMIN `/settings/catalog`. |
| Staff household workspace | Implemented | Primary Record Workspace at `/leads/:id`. Members-first. |
| Household merge | Not in scope | Explicit V1 non-goal. |
| Class capacity / waitlists / instructor calendars | Not in scope | |
| Automatic no-show or sales tasks | Not in scope | Completing a call does not change Lead status. |

### 2.4 Marketing operations

| Capability | Status | Notes |
|---|---|---|
| Marketing hub `/marketing` | Implemented | Distinct area that feeds acquisition. |
| Campaign planning workspace | Implemented | Lifecycle, owner, collaborators, programs, Overview brief + Edit. |
| Tracking links + friendly `/t/:slug` | Implemented | Hex `code` / `?c=` still valid. Destinations `/trial` or `/events/:slug` only. |
| First-touch attribution on LeadHeader | Implemented | Campaign, tracking link, UTM. Stamp unless Campaign `CANCELLED`. |
| Content planning | Implemented | Optional one Campaign. Manual publication history. No Meta publish. No `SCHEDULED` status. |
| Assets on disk | Implemented | Metadata in SQLite; bytes in `data/uploads/`. Reusable via `asset_usages`. |
| Marketing Tasks | Implemented | Separate table from FollowUpTask. Cross-campaign queue + focused detail. |
| Acquisition Events / sessions / roster | Implemented | Public `/events/:slug`. Registrations are not Leads until previewed batch. |
| Event → Lead batch process | Implemented | Staff match or force-create. One `EVENT_FOLLOW_UP` per household+event when no pending intro call. |
| Compensation ledger | Implemented | Per LeadLine, snapshot at JOINED. Seed 50% of monthly (`5000` bps), configurable. Not on `/dashboard`. Generated tracking-link SYSTEM credit uses configured owner, not Campaign owner. |
| Campaign Performance | Partial | Gated by `VIEW_MARKETING_REPORTS`. Mixes internal CRM, attributed, and Meta-reported numbers. |
| Meta V1 read-only | Partial | Graph v25.0, `ads_read`, ADMIN manual sync, explicit map by id. App works without credentials. Live pull needs env tokens. |
| Meta posting / CAPI / webhooks / Pixel / Lead Ads / scheduled sync | Not in scope / later | |
| SMS / email / WhatsApp send | Not in scope / later | Consent fields exist. No provider. |
| Unsupervised AI posting | Not in scope | Human approval required later. |

### 2.5 Reporting, admin, UX

| Capability | Status | Notes |
|---|---|---|
| Operational reports | Implemented | `/reports`. Funnel people = unique LeadLines. STAFF operational; ADMIN financial. |
| CSV export | Implemented | Conversion Snapshot MRR, not Forecast MRR. |
| Dashboard | Implemented | Compact current-period. Households, people, attended, conversions, converted MRR this month. |
| ADMIN Settings hub | Implemented | Intro, catalog, Access Rights, Meta, Environment backup/restore, Trial outcome, tracked-acquisition owner, process controls. |
| Environment download / restore | Implemented | In-app zip of this process's SQLite + uploads. |
| Process restart / shutdown | Partial | Shutdown exits Node. Restart only if `APP_RESTART_ENABLED=true`. Compose may restart the container. |
| Primary Record Workspace UX | Implemented | Household, Campaign, Event. Content / Task / Asset use focused detail. |
| Phone / responsive pass | Implemented / Partial | MOBILE-A–H on `working`. No `/m/*`, no bottom nav. Human visual pass on a real phone still outstanding. |
| Design system | Implemented | Navy structure, light work surfaces, academy blue. Tokens in `main.css`. |
| M8 / M9 human acceptance | Partial | Code implemented. Scott browser acceptance still pending. |

### 2.6 Deliberate non-goals still in force for Renzo V1

**Known / confirmed.**

- Billing, invoicing, AR/AP, recurring payments, POS
- Complete membership management, rank / belt tracking
- General class attendance as a gym scheduler
- Waivers, tournaments, payroll, inventory, accounting
- Full website CMS (old `website/` app is git history only)
- Form-builder, DAM as a product
- Privacy-policy page (still an open question for public form)
- Import of old vendor lead exports

Renzo is an **acquisition + marketing operations** system. Conversion is the acquisition boundary. Historical join/lost data is retained for attribution and reporting, not because the app becomes the gym's member system.

---

## 3. Current Technical Architecture Understanding

### Confirmed current implementation

**Frontend.** Nuxt 4.5 / Vue 3 / TypeScript. Tailwind CSS v4 via Vite plugin. Staff layouts: `internal` (navy rail + phone Menu drawer), `default` (public), `auth` (login / forced password). Tokens and primitives in `app/assets/css/main.css` and `app/components/`. Staff enum labels in `shared/utils/labels.ts`. Vue is an interface; it is not the workflow authority.

**Backend.** Same Nuxt process. Nitro API under `server/api/` (kept thin). Domain rules in `server/services/`. Shared Zod contracts in `shared/schemas/`. Time conversion only through `shared/utils/time.ts`. Money only through `shared/utils/money.ts`.

**APIs.** REST-style Nitro routes. Public: health, login, `/trial` availability/booking, `/events/:slug`. Internal CRM, follow-up, reports, marketing, admin users/settings/meta/environment. Authorization is server-side (`requireAuthUser`, CRM helpers, `requireAccessRight`). Hidden buttons are not security.

**Database.** SQLite via `@libsql/client` + Drizzle. Default laptop file `data/renzo.sqlite`. Docker/Pi file `/app/data/sqlite/renzo.sqlite` on named volumes. Migrations `0000`–`0020`. Integer USD cents. UTC epoch milliseconds. America/Denver is the business timezone. Phone or email CHECK on `leads`. Phone/email indexed, not unique.

**Assets / storage.** Marketing asset **bytes on disk** (`ASSET_UPLOAD_DIR`, default `data/uploads/`). Metadata and usages in SQLite. Used assets archive; unused may delete. Original-file thumbs; no generated thumbnail pipeline documented.

**Authentication / sessions.** Server-side sealed cookies. Cookie stores identity claims; every `requireAuthUser` reloads the SQLite row. Role, `mustChangePassword`, and Access Rights come from the database, not a stale cookie. `NUXT_SESSION_PASSWORD` seals the cookie.

**RBAC.** Coarse role plus Access Rights catalog (`VIEW_MARKETING`, `MANAGE_CAMPAIGNS`, `MANAGE_MARKETING_TASKS`, `MANAGE_CONTENT`, `APPROVE_CONTENT`, `MANAGE_ASSETS`, `MANAGE_ACQUISITION_EVENTS`, `PROCESS_EVENT_REGISTRATIONS`, `VIEW_MARKETING_REPORTS`, `MANAGE_MARKETING_CONFIGURATION`, `MANAGE_COMPENSATION_ATTRIBUTION`). User Type contains User Roles; extra roles union. No deny rules.

**Environment configuration.** `APP_ENV=dev|stage|production` is the environment identity and is independent of `NODE_ENV`. Invalid `APP_ENV` fails startup. Documented vars include session password, cookie secure flag, database URL, ports, bootstrap admin, timezone, Meta token/account, asset dir, restart flags. Do not commit `.env`.

**Docker.** One application image (`renzo-acquisition:m10a` documented; Pi image also referred to as `webhosting-renzo_crm`). Node 22 Debian slim, not Alpine. Multi-stage. Per-environment overlays plus `docker-compose.all.yml` for laptop. Persistent named volumes for SQLite and uploads. Entrypoint: migrations, then seed, then Nitro as user `node` via `gosu`. `restart: unless-stopped`. App containers have **no Docker socket**.

**NGINX / TLS.** Renzo is a **guest** on the existing WebHosting nginx stack. It does not own ports 80/443. Host-header routing. Let's Encrypt cert `renzo` with SANs for the three names. HTTP ACME not redirected; `location /` 301s to HTTPS. GoDaddy is authoritative DNS. No Cloudflare for Renzo. No Caddy. No apex / `www`.

**Development / staging / production.**

| Environment | Purpose | Laptop | Pi |
|---|---|---|---|
| Local `pnpm dev` | Daily coding | `:5030`, file SQLite in `data/` | Does not run |
| DEV | Disposable / experimental copy | `:5020`, `renzo-dev-*` volumes | `dev.app…`, `webhosting_renzo_*_dev` |
| STAGE | Pre-prod copy | `:5010`, `renzo-stage-*` | `stage.app…`, `webhosting_renzo_*_stage` |
| PRODUCTION | Live academy | `:5000`, `renzo-prod-*` | `app…`, `webhosting_renzo_sqlite` / `_assets` |

Copy-down exists (PRODUCTION → STAGE/DEV). Copy-up does not. Laptop and Pi volume names are different worlds. Laptop backups do not protect Pi volumes.

**Backups.** One zip format (`environment-backup.ts`, manifest v2): SQLite after `PRAGMA wal_checkpoint(TRUNCATE)` plus uploads. In-app Settings download/restore. Host `pnpm backup:*`. PRODUCTION scheduler `renzo-backup-1` at 02:00 America/Denver, 14 days, prune only after success. Restore requires `--confirm-env` and restamps isolation. Same-host only.

**Deployment.** Develop in `Projects/renzo_crm` (product remote `renzo-crm`, branch `working`). Refresh `WebHosting/renzo_crm` with `Refresh-FromSibling.ps1` (code only; never `data/` or filled `.env*`). Sync drop-in to Pi. Rebuild **named** Renzo services only, never `down -v`. WebHosting Git commit only for nginx/compose/host docs. ThePond Ops Console **Renzo** page is the allowed UI path.

**Testing.** Vitest. HTTP tests inject `event.context.authUser`; production uses the session cookie. Two pre-existing stylistic lint errors in `shared/utils/id.ts` and `tests/m10/client-id.test.ts`. M6–M9 visual acceptance is Scott’s browser pass. No Playwright.

**Other infrastructure.** Koi-Pi is `aarch64` Raspberry Pi at LAN `192.168.0.13`. Compose project `webhosting`. Renzo containers listen on 5000 **inside** the Docker network only (`expose`, no host `ports:`), because other sites already own laptop-style ports on the Pi. NAT hairpin from LAN to the public IPv4 often times out; valid tests are off-LAN or `--resolve` to `192.168.0.13`. Public WAN IPv4 can change.

### Future plans (not current)

- Off-host backup replication (later M10; do not start unless asked)
- M10B Pi backup/restore **validation**
- PostgreSQL cutover
- Meta create/publish, OAuth, webhooks, Pixel, CAPI, Lead Ads, Messenger
- SMS / email / WhatsApp messaging
- MFA, emailed forgot-password, JWT
- Class schedules, capacity, waitlists, holiday calendars, telephony
- SaaS control plane, multi-customer provisioning, billing, self-service signup

Architecture principle still written into Renzo notes: **“Build for this gym; do not invent multi-tenant SaaS.”** That is a Renzo-production constraint. It is not a SaaS-workstream prohibition against *later* designing tenancy — it is a warning not to do that design inside the live customer app.

---

## 4. Product Direction

### Emerging generalized product

**Working decision.** The long-term product is an ultra-general marketing, lead-generation, and CRM platform for SMBs. It will not launch as “every industry.” Initial development and commercial validation focus on one or two industry variants, then expand from evidence.

The generalized lifecycle is:

```text
Marketing
→ Engagement
→ Lead
→ Follow-Up
→ Industry-Specific Acquisition Workflow
→ Acquisition Outcome
```

Mapped onto current Renzo evidence:

| Generalized step | Renzo evidence today | Confidence it belongs in the platform |
|---|---|---|
| Marketing | Campaign, Content, Assets, Marketing Tasks | Probably generic |
| Engagement | Tracking links, public forms, Event pages, later Meta | Probably generic as *mechanism*; channel mix unresolved |
| Lead | LeadHeader + contact + attribution | Clearly generic as *prospect record*; household shape unresolved |
| Follow-Up | FollowUpTask phone-call queue | Probably generic as *work item*; phone-call-after-trial timing is martial-arts/Renzo |
| Industry-specific acquisition workflow | Trial / intro class scheduling, guardian/child, Event roster → household | Industry-specific (martial arts). Beauty will differ. |
| Acquisition outcome | Conversion / Lost per person; compensation snapshot | Outcome concept probably generic; membership-cents and 50% ledger are Renzo-specific |

### Success metrics (martial arts)

**Working decision from alignment instructions.**

- Lead creation is an important funnel metric.
- A **booked trial** is currently the stronger indicator that lead-generation/acquisition work succeeded.
- Paying-member conversion may still be tracked as a downstream business outcome.
- The academy's ability to close after the person is in the trial/sales process should **not** necessarily be the platform's primary performance metric.

This distinction should remain visible in future product and reporting discussions. It already has a faint echo in Renzo: completing a follow-up call does not change Lead status; Conversion is a separate explicit act; Forecast MRR is opportunity, not cash.

### Product boundary after acquisition

**Working decision.** Once the business has successfully acquired the customer, the core responsibility of this application largely ends.

Historical conversion/outcome information may still be retained for attribution and reporting.

A future separate offering *may* manage or create customers after sale. That is **not** part of the current core product definition.

This matches Renzo's existing non-goals: no `Member` table, no billing, no class attendance product, no rank tracking. Conversion is the acquisition boundary.

### What the product is not

The core product is not the customer's full post-sale operational system. It is not a social-media publisher. It is not an unsupervised AI poster. It is not a generic gym OS.

---

## 5. Platform / Industry Template / Customer Model

Conceptual hierarchy — **direction to investigate, not completed architecture**:

```text
Platform
→ Industry Template
→ Customer Instance
→ Enabled Capabilities
→ Configuration
```

Promotion path for repeated requirements:

```text
Customer-specific requirement
→ Customer configuration/extension
→ repeated across customers?
→ Industry Template
→ generic across industries?
→ Platform
```

Customer-specific requirements should generally become configuration or controlled extensions rather than customer code forks.

### Candidate responsibilities (hypotheses)

**Platform (hypothesis).** Shared application/runtime capabilities that do not encode one industry's acquisition ritual: identity, users, RBAC, prospect records, campaigns, content, assets, marketing tasks, follow-up work items, tracking/attribution primitives, reporting primitives, configuration store, public form hosting, environment administration, later control-plane operations.

**Industry Template (hypothesis).** Packaged workflow, terminology, default catalog, default public forms, and enabled capabilities for a class of businesses.

**Customer Instance (working direction).** An isolated running environment for one customer, configured from a template, with that customer's data, assets, users, branding, and enabled capabilities.

**Enabled Capabilities (hypothesis).** Which modules a customer actually gets (Events? Compensation? Meta? Intro scheduling?). Renzo already has a coarse version of this as Access Rights plus ADMIN settings. Whether SaaS capabilities are the same mechanism is unresolved.

**Configuration (hypothesis).** Names, timezone, programs/offerings, availability, tracking destinations, credit-owner, copy, domains. Renzo already has substantial in-app configuration. How much of today's "Renzo-shaped" behavior is secretly hard-coded remains a repository-audit item.

### Martial Arts template

**Working direction.** First industry variant. Renzo is the first real implementation, design partner, proving ground, and starting reference.

Likely martial-arts-shaped concepts (not yet a template spec):

- Trial / intro class as the primary acquisition appointment
- Guardian / child household
- Program catalog (adult vs kids, seasonal programs)
- Intro availability as a weekly timetable, not a full class scheduler
- Booked trial as a stronger success metric than paid membership
- Event (open house / kids night) as a feeder that becomes households later

Do **not** treat every Renzo rule as the martial-arts template. Some rules are Renzo-Kaysville-specific (prices, schedule, branding, compensation split, Scott as tracked-acquisition owner, hostnames, mid-November window).

### Beauty / Salon / Esthetician variant

**Working direction only.** A likely second variant because acquisition differs from martial arts. It is important as a *contrast case* that can falsify "household + trial" as platform universals.

Do **not** design the beauty variant in this alignment task. Note only: a consult, treatment booking, membership/package, or walk-in retail motion may replace "intro class." That is exactly why the second variant exists.

### What this hierarchy is not

It is not a decided package/module system. It is not a decided monorepo vs multi-repo layout. It is not a decided feature-flag product. It is not permission to extract a framework before customer #2 is understood.

---

## 6. Platform Core Candidates

Each item is classified from **documented behavior**, not from a code audit.

### Clearly generic

| Candidate | Reasoning |
|---|---|
| Users / authentication / sessions | Every customer environment needs staff identity, login, password policy, session revocation. Renzo's sealed-cookie + scrypt approach is *an* implementation, not necessarily the platform's forever choice, but the *need* is generic. |
| Coarse roles + capability grants | ADMIN / STAFF / VIEWER plus extra rights is a common SMB pattern. The specific marketing catalog may be template-level. |
| Campaign as an internal planning object | Distinct from Meta Campaign. Organic or paid. Owner, collaborators, lifecycle, optional budget. This is marketing operations, not martial arts. |
| Content planning + manual publication history | Planning/approval without auto-publish is broadly useful. |
| Assets + reusable usages | File library with restriction states is generic DAM-lite. Disk-local storage is an implementation, not a product definition. |
| Marketing Tasks | Collaborative work items distinct from customer-follow-up work. Generic. |
| Tracking links / public slugs / first-touch attribution | Trackable URLs onto a public form are the stated general acquisition mechanism. |
| Public form → Lead | Alignment instructions: visitor follows a link, submits a form, Lead is created. Renzo `/trial` is a specialized instance of this. |
| Follow-up work queue with due buckets | The *idea* of pending/overdue/due-today/upcoming work is generic. Denver-derived buckets and two-weekday phone calls are not. |
| Reporting / export primitives | Counts, funnels, CSV. Metric definitions will vary. |
| Application settings key/value | Already used for Trial outcome policy and compensation. Generic mechanism. |
| Audit log | `security_events` is a generic admin need. |
| Environment backup package | Zip of database + uploads is a generic ops primitive, especially if each customer is isolated. |

### Probably generic

| Candidate | Reasoning |
|---|---|
| Lead / prospect record | Clearly needed. Shape is not. Phone-or-email, non-unique contacts, and "never merge on public submit" may be platform policy or template policy. |
| Lead notes and status history | Operational CRM hygiene. Status vocabulary may be template-specific. |
| Lead sources | Useful, but the enum (`INSTAGRAM`, `FACEBOOK`, …) is a starting catalog, not necessarily frozen. |
| Duplicate *warning* (not identity) | Sensible default for public capture. Merge remains a product decision. |
| Idempotent public submit keys | Generic anti-double-submit. |
| Owner / collaborator / assignee | Campaign owner vs task assignee vs attribution owner are already separate in Renzo. That separation is probably worth preserving. |
| Access Rights as a catalog | The *mechanism* is probably generic. The *codes* may split into platform vs template. |
| Read-only Meta adapter | Many SMBs advertise on Meta. Keeping the app useful when disconnected is a platform principle. Deep Meta funnel is future. |

### Industry-specific (Martial Arts, not automatically Beauty)

| Candidate | Reasoning |
|---|---|
| Trial / intro class entity | Martial-arts acquisition ritual. Other industries may have consults, tours, or no appointment object. |
| Intro availability timetable | Gym class schedule used as bookable first-visit slots. Not a generic scheduler, and not every industry books this way. |
| Guardian / child / Kids program path | Central to kids martial arts. Beauty may need a simpler person model. |
| Programs as BJJ / striking / wrestling | Catalog *mechanism* is generic; these rows are martial arts. |
| Acquisition Events as gym events that later become households | The *event → later CRM* pattern might recur; the roster/attendance semantics look gym-shaped. |
| Booked trial as primary success metric | Explicitly martial-arts working decision. |

### Renzo-specific

| Candidate | Reasoning |
|---|---|
| Branding, navy tokens, academy name, `/trial` copy | Built for this gym. |
| Hostnames `*.renzogracieutah.com` | Customer domain, not platform domain. |
| Seeded Kaysville weekly schedule | Working assumption for this academy. |
| Adult $175 / Kids $150 / household additional $155 | Gym starting prices in seed. Logic must not hard-code them; the numbers are Renzo's. |
| Compensation 50% of monthly to a configured person (Scott today) | Business arrangement for this implementation. M9 even moved credit *off* Campaign owner because it is Scott's deal. |
| Pilot login `admin` / `setup` on PRODUCTION | Temporary convenience. Not a SaaS default. |
| America/Denver as *the* business timezone | Correct for Renzo. Platform must not assume Denver. |
| Mid-November 2026 acquisition window | Renzo seasonal urgency, not a product rule. |
| "No Muay Thai" | Local program decision. |
| Ownership split: gym owns Meta, Scott owns the app | Renzo commercial arrangement. |
| Pi guest-on-WebHosting constraints (no host ports, no Caddy, no Cloudflare) | This customer's hosting contract. A future VPS customer should not inherit those locks as product law. |
| `householdDisplayStatus` vocabulary and mixed JOINED+LOST households | May be martial-arts household, or may be Renzo UX. Unresolved. |

### Unresolved — do not promote yet

| Candidate | Why unresolved |
|---|---|
| Household as a platform entity | Alignment instructions explicitly warn that `Household` needs more analysis before being declared universal. Renzo invented it because kids intros are guardian-contact + child-participant, and because public booking must not merge on shared phone. Beauty and single-adult B2C may not want this complexity. |
| LeadHeader table name vs concept | Table `leads` *is* the household. Renaming or splitting for SaaS is a later model decision. |
| Conversion Snapshot MRR as a platform metric | Useful if the industry sells recurring memberships. Not every SMB does. |
| Compensation attribution | May be a martial-arts or even Renzo-only commercial add-on. |
| Event registrations staying off the CRM until batch process | Strong privacy/ops choice for gym events. Not obviously universal. |
| Primary Record Workspace | Powerful UX principle ("records are workspaces, not forms"). Whether it is platform UX law or Renzo staff-console language is undecided. |
| Access Right codes vs product plans | Unknown whether SaaS packaging uses the same catalog, feature flags, or something else. |
| Timezone and money helpers | The *discipline* (persist UTC ms, integer cents, convert at edges) is platform-worthy. The Denver/USD defaults are not. |

---

## 7. Customer Environment Model

**Working direction:** each customer receives an **individually containerized environment** rather than all customers immediately sharing one application-level tenant.

This is **not** permission to implement. It is also **not** a silent decision about every database, storage, network, or process boundary.

### What Renzo already proves (evidence, not the SaaS design)

Renzo already runs **three isolated environments of one customer** (DEV / STAGE / PRODUCTION):

- same image;
- distinct `APP_ENV`;
- distinct SQLite volumes;
- distinct asset volumes;
- distinct hostnames or ports;
- no Docker socket inside the app;
- backup/restore as a zip of *this process's* data;
- isolation marker restamped on restore so STAGE stays STAGE.

That is environment isolation for **one academy**, not multi-customer isolation.

Laptop and Pi already disagree on volume names, ports, and how the edge is attached. That disagreement is a warning: "a container" is not a complete environment contract.

### Implications and open questions

**Application containers.**  
Likely one app container per customer environment, following Renzo. Unknown: whether STAGE/DEV exist per customer, or only PRODUCTION plus shared platform staging. Unknown: whether the control plane shares the same image. Unknown: process user, restart policy, health contract beyond `/api/health`.

**Databases.**  
Renzo is one SQLite file per environment. Individually containerized *suggests* database-per-customer, but that is **not decided**. Alternatives still listed in the create-handoff prompt: shared DB + `tenant_id`, schema-per-tenant, DB-per-tenant, hybrid. SQLite-per-container is operationally simple and matches current backups; it may not survive concurrency or multi-node ambitions. PostgreSQL remains a later Renzo item and a SaaS unknown.

**Persistent storage.**  
SQLite and uploads must outlive container recreate. Renzo proves named Docker volumes work if operators never `down -v`. SaaS must define volume naming, backup location, and what happens on node failure.

**Assets.**  
Bytes on local disk are a SaaS risk: they are not in Git, not in the image, and laptop backups do not follow the container to another node. Object storage vs volume replication is unresolved.

**Configuration.**  
Today: `.env` files + `app_settings` + catalog tables + intro rules. Unknown which of these become template defaults, customer settings, secrets, or control-plane records. `APP_ENV` today means dev/stage/production of *Renzo*, not "customer identity."

**Secrets.**  
Session password, bootstrap admin, Meta token, future messaging keys. Refresh scripts already refuse to overwrite filled `.env*`. A provisioner must create secrets without committing them and without copying Renzo's PRODUCTION `.env`.

**Networking.**  
Renzo containers listen on 5000 internally; nginx routes by `Host`. That pattern can port, but the Pi cannot publish 5000/5010/5020. A multi-customer node needs a routing rule per customer. Unknown: one nginx for all customers vs per-customer edge.

**Domains.**  
Renzo locked three names under `renzogracieutah.com`. SaaS needs a domain strategy: platform subdomain (`customer.app.example.com`), customer vanity domain, or both. Not decided.

**TLS.**  
Let's Encrypt on nginx for three SAN names works for one customer. Multi-customer issuance, renewal, and HTTP-01 routing are unresolved. Do not assume the Renzo certbot units are the SaaS design.

**Upgrades.**  
Renzo upgrade is: rebuild image, recreate named services, keep volumes, run migrations on start. That is a candidate pattern. Unknown: can all customers move together, or must versions be pinned per customer? Unknown: rollback.

**Backups / restore.**  
The zip format is a strong candidate primitive. Unknown: where zips live, whether the control plane triggers them, how restore is authorized, and how Pi vs VPS backup locations differ. Off-host copy is already a known Renzo gap.

**Logs / health.**  
Health is a single HTTP JSON endpoint. Logs are `docker logs`. There is no documented centralized observability. A control plane that claims "environment status" does not yet have a telemetry design.

**Resource isolation.**  
Separate containers are not the same as CPU/memory limits, disk quotas, or noisy-neighbor protection. Unresolved, and important if many customers share a Pi.

Do not collapse these into "we chose Docker Compose per customer." That sentence is still a hypothesis until the environment *composition* is decided.

---

## 8. Platform / Control Plane Model

**Working direction.** A higher-level application exists **above** customer CRM environments. It is not another customer admin page.

### Customer CRM functionality (inside an instance)

- Leads / acquisition workflow
- Campaigns, content, assets, marketing tasks
- Follow-up
- Reports
- Users and Access Rights for *that* customer
- That customer's settings, catalog, public forms
- That customer's Meta connection, if any

### Platform operations functionality (control plane)

Expected responsibilities *may eventually* include:

- customer / account inventory
- customer environment inventory
- hosting-node inventory
- provisioning
- environment status
- container / service health
- deployed application versions
- deployments / upgrades
- logs
- backup status
- restore operations
- configuration
- domains / routes
- infrastructure metadata
- operational diagnostics

**Exact scope and architecture remain unresolved.**

### Distinctions that must not be blurred

| If it is… | It belongs… |
|---|---|
| A gym staff member converting a trial | Customer CRM |
| Scott assigning campaign collaborators | Customer CRM (or platform-owner CRM) |
| Creating customer #2's environment | Control plane |
| Mapping a hostname to a container | Control plane |
| Restoring a customer's SQLite after a bad deploy | Control plane (or a tightly gated instance admin tool, like today's Settings → Environment) |
| Changing compensation basis for Renzo | Customer configuration, possibly visible to platform owner |
| Billing the SaaS customer | **Not designed.** Not current core product. Do not assume it lives in the CRM. |

Renzo already has a small "operator" surface inside the customer app (Environment backup/restore, Restart/Shutdown, Meta sync). That is evidence that *some* ops leak into the instance. Whether those remain instance-local or move upward is unresolved.

The control plane should account for **hosting nodes** from day one conceptually, even if the first node is a single Pi. See §10.

---

## 9. Platform Owner / Dogfooding Model

**Working decision.**

```text
Platform Owner
├── Platform / Control Plane privileges
└── Own Customer CRM Environment

Customer A
└── Customer CRM Environment

Customer B
└── Customer CRM Environment
```

The platform owner's own business receives a **normal** customer CRM environment. It should fundamentally operate like other customer environments. The owner *also* has access to the higher-level platform/control-plane application.

Do not make the owner's CRM a special fork unless a future requirement proves that necessary.

### Architectural implications (not implementations)

- Two identities or two sessions may be required: "I am operating the platform" vs "I am working my own leads."
- The owner's CRM should be provisioned through the same path as customer #2. If it is hand-built, the provisioning story is unproven.
- Using the product to market the SaaS product (tracking link → form → Lead → follow-up → demo) implies the owner's CRM is a real dogfood instance, not a stub.
- Control-plane privileges must not accidentally become ADMIN rights *inside* every customer database.
- Renzo PRODUCTION must not be silently reclassified as "the platform owner's CRM" if Renzo the gym and Scott the platform operator are different commercial relationships. **Unknown** whether Renzo-the-gym and Scott-the-SaaS-operator remain one account. Decision required later; do not invent it.
- Today's compensation ledger (50% to Scott) is a Renzo customer arrangement. It should not become a hidden platform-owner backdoor in every instance.

---

## 10. Hosting / Node Model

Conceptual only:

```text
Platform / Control Plane
        |
        +-- Hosting Node: Raspberry Pi
        |     +-- Customer Environment A
        |     +-- Customer Environment B
        |
        +-- Hosting Node: VPS 1
        |     +-- Customer Environment C
        |     +-- Customer Environment D
        |
        +-- Hosting Node: VPS 2
              +-- Customer Environment E
```

The Raspberry Pi is intended to **cheaply prove** provisioning and operations. Do **not** create Raspberry-Pi-specific architecture that would make VPS migration difficult.

### What should stay portable

| Concern | Portable design intent | Renzo/Pi-specific trap |
|---|---|---|
| Environment identity | Explicit `APP_ENV` / customer id / version labels | Inferring env from host port or hostname |
| Data persistence | Named volumes or equivalent, never in the image | Syncing `data/` with source |
| Edge routing | Host/SNI routing in front of internal listen ports | Publishing 5000/5010/5020 on the host |
| TLS | Standard ACME or terminated edge | Assuming the existing `renzo` SAN cert |
| Deploy | Image + migrate on start + keep volumes | `down -v`, folder-rename deploys, copying sqlite |
| Backup | Same package format everywhere | Laptop `pnpm backup:*` as if it were the node |
| Health | HTTP health independent of UI | NAT-hairpin tests from the LAN |
| Architecture | linux/containers, not Pi-only | Alpine + missing libsql natives, ARM-only images without multi-arch plan |
| DNS | Customer/platform records as data | Hard-coding `renzogracieutah.com` |
| Node communication | A defined agent or SSH/API contract | One-off `scp` + human memory |

### What Renzo/Pi evidence is still useful

- Guest-on-an-existing-edge is a valid first-node pattern.
- Image rebuild without destroying volumes is a proven safety rule.
- Isolation markers on restore prevent env identity bleed.
- WAN IP churn and hairpin timeouts are real homelab constraints; a VPS will have different ones. The *control plane* should not assume a stable home IPv4.

### What must not be copied as law

- "Never Cloudflare / never Caddy" is a **Renzo DNS/hosting lock**, not a platform lock.
- ThePond Ops Console **Renzo** page is a one-customer deploy UI. It is evidence that a ship button helps; it is not the control plane.
- Three environments for one gym is not the same as N customers on one node.

---

## 11. Customer Acquisition and Provisioning Journey

Intended flow:

```text
SaaS marketing
→ tracking link
→ lead form
→ Lead
→ follow-up
→ demo/sales
→ customer agreement
→ onboarding
→ template/model selection
→ customer environment provisioning
→ domain/access setup
→ operational customer CRM
```

| Step | Exists today? | Where |
|---|---|---|
| SaaS marketing | Partial / conceptual | Alignment instruction: platform owner will use the product itself. No SaaS marketing site is in scope yet. |
| Tracking link | Implemented in Renzo | Campaign tracking + `/t/:slug`. Reusable as a mechanism. |
| Lead form | Implemented in Renzo | `/trial` is martial-arts/intro-specific, not a generic SaaS signup form. |
| Lead created | Implemented in Renzo | Always new LeadHeader per submission key. |
| Follow-up | Implemented in Renzo | Phone-call task after Trial. A SaaS *sales* follow-up may need a different purpose/workflow. |
| Demo / sales | Human / not in software | Sales-led decision. |
| Customer agreement | Human / not in software | No billing, contracts, or e-sign product. |
| Onboarding | Not implemented as a platform flow | Renzo onboarding is "seed admin + catalog + intro timetable." |
| Template / model selection | Not implemented | Martial Arts vs Beauty is direction only. |
| Environment provisioning | Not implemented as multi-customer | Renzo has Docker + seed + nginx for **this** gym. |
| Domain / access setup | Renzo-specific, manual | GoDaddy records + Let's Encrypt + `admin`/`setup`. |
| Operational customer CRM | Implemented for Renzo only | Live on `app.renzogracieutah.com`. |

**Working decision:** do not prioritize public self-service SaaS signup or instant anonymous provisioning.

The first commercially useful milestone implied by the alignment instructions is **not** "the perfect platform." It is: a new martial-arts customer environment can be generated **reliably on demand**, with Renzo remaining a separate live customer.

---

## 12. Decisions Already Made

This register includes Renzo decisions that still constrain the *evidence base*, plus newer SaaS-workstream decisions from the alignment instructions. Confidence is about whether the decision is settled **for its stated scope**, not whether it should be copied into SaaS.

### 12.1 Workstream and process

| Decision | Rationale | Confidence | Source | Implications |
|---|---|---|---|---|
| Renzo production and SaaS productization are separate workstreams | Live academy data and a commercial platform are different risk domains | High | Create prompt; alignment instructions; AGENTS.md | Do not refactor Renzo to be multi-tenant. Do not treat this copy as automatically correct architecture. |
| Sequence is Discovery → Product Definition → Analysis → Audit → Decisions → Roadmap → Implementation | Avoid "make it multi-tenant" | High | Create prompt; alignment instructions | No implementation from this document. |
| Existing Renzo app is evidence, not the final SaaS architecture | Copying accidents as product law is the main failure mode | High | Alignment instructions | Repository audit comes after conceptual decisions, then reconcilation. |
| Current discovery may shift toward provisioning/infrastructure | Want customer #2 generated on demand | High as *current emphasis* | Alignment instructions | Does not cancel product definition; it reorders attention. |
| Do not start unstarted Renzo milestones unless asked | Protect live system and scope | High for Renzo | AGENTS.md, Milestones | SaaS work must not silently start M10E, Postgres, SMS, etc. inside Renzo. |

### 12.2 Product direction

| Decision | Rationale | Confidence | Source | Implications |
|---|---|---|---|---|
| Long-term product is an ultra-general marketing + lead-gen + CRM platform for SMBs | Broader than "martial arts OS" | Working decision | Alignment instructions | Commercial hypothesis in the create prompt (martial-arts OS) is narrower; see §15. |
| Do not launch by supporting every industry | Validation first | Working decision | Alignment instructions | Templates exist to constrain launch scope. |
| First industry variant is Martial Arts | Renzo exists and is the proving ground | Working decision | Alignment instructions | Renzo remains design partner, not the product. |
| Likely second variant is Beauty / Salon / Esthetician | Contrast workflow to find true generics | Working direction | Alignment instructions | Do not design it now. Do not freeze Household as universal before this contrast. |
| Core purpose is Marketing + Lead Generation + Acquisition Operations | Avoid becoming the customer's post-sale OS | Working decision | Alignment instructions; matches Renzo non-goals | Conversion is an outcome, not the start of membership management. |
| Booked trial is a stronger martial-arts success metric than paid membership | Separates lead-gen performance from close skill | Working decision | Alignment instructions | Reporting must keep this distinction visible. |
| Initial lead capture is trackable links to a public form | Simple, channel-agnostic launch mechanism | Working decision | Alignment instructions | Native Meta/Instagram lead ads are later. |
| Deeper Meta funnel visibility is intended later | Content → impressions → engagement → clicks → leads → outcome | Working direction | Alignment instructions | Do not implement now. Keep Meta optional. |
| SaaS customer acquisition is sales-led | Owner uses the product to market the product | Working decision | Alignment instructions | No self-service provisioning priority. |
| Platform owner gets a normal customer CRM plus control-plane privileges | Dogfood without a special fork | Working decision | Alignment instructions | Provisioning path must work for the owner too. |
| Customer-specific needs become configuration/extensions, then may be promoted | Avoid per-customer forks | Working direction | Create prompt; alignment instructions | Promotion path is policy, not a mechanism yet. |

### 12.3 Isolation and control plane (working, not implemented)

| Decision | Rationale | Confidence | Source | Implications |
|---|---|---|---|---|
| Individually containerized customer environments rather than one shared app-level tenant first | Isolation and operational clarity | Working direction | Alignment instructions | Does **not** decide SQLite vs Postgres, volume layout, or network policy. |
| A higher-level control plane exists above customer CRMs | Multi-environment operations cannot live only in a gym Settings page | Working direction | Alignment instructions | Scope still open. |
| Control plane accounts for hosting nodes (Pi now, VPS later) | Prove ops cheaply without painting into a Pi corner | Working direction | Alignment instructions | Node inventory is part of the model. |
| Do not create Pi-specific architecture that blocks VPS migration | Pi is a proving ground | Working decision | Alignment instructions | Multi-arch, portable volume/backup/edge contracts. |

### 12.4 Renzo product decisions that remain evidence

These are **accepted for Renzo**. They are not automatically SaaS platform law.

| Decision | Rationale | Confidence | Source | SaaS implication |
|---|---|---|---|---|
| Greenfield acquisition app; old CRM/website are history | Spec did not match old schema | High | Decisions 2026-08-25 | SaaS starts from this tree, not the old website. |
| Nuxt 4 monolith, no Python in V1 | Keep core small | High for Renzo | Decisions | Stack reuse is likely but not mandatory for a control plane. |
| SQLite now, PostgreSQL later; no SQLite-only app logic | Small ops burden | High for Renzo | Decisions | Per-customer SQLite is a candidate, not a verdict. |
| App must run without Meta | Manual fallback | High | Decisions | Preserve as platform principle. |
| Trial is not a field on Lead | History of no-show/reschedule | High for Renzo / martial arts | Decisions | Template-level likely. |
| Kids: guardian is the Lead | Communicate with the adult | High for Renzo | Decisions | Household analysis still required. |
| Public booking never merges households | Shared phone is not identity | High for Renzo | Decisions 2026-09-02 | Strong candidate default for public capture. |
| FollowUpTask is first-class; marketing tasks are a different table | Acquisition calls vs creative work | High | Decisions / Domain-Model | Keep the split conceptually. |
| Server owns the workflow | Vue is an interface | High | AGENTS.md | Preserve. |
| Primary Record Workspace | Staff work one record from a stable URL | High for Renzo UX | Decisions 2026-09-03 | UX candidate; not an isolation decision. |
| Conversion per LeadLine; no Member table | Acquisition boundary | High for Renzo | Domain-Model | Aligns with SaaS product boundary. |
| Money as integer cents; time as UTC ms | Portability and correctness | High | Decisions | Platform discipline. Timezone is configurable. |
| Access Rights on top of coarse roles | Marketing is optional for STAFF | High for Renzo | Decisions 2026-09-02 | Mechanism candidate. |
| Generated tracking-link credit uses configured owner, not Campaign owner | Renzo commercial arrangement | High for Renzo | Decisions 2026-09-04 | Do not generalize as platform default without analysis. |
| Friendly `/t/:slug` is an alias; `code` stays canonical | Trustworthy public URL | High | Decisions 2026-09-08 | Reusable tracking primitive. |

### 12.5 Renzo hosting decisions (customer-implementation locks)

| Decision | Rationale | Confidence | Source | SaaS implication |
|---|---|---|---|---|
| Develop in `renzo_crm`, drop-in is not the product | Avoid editing the Pi copy | High | Decisions 2026-09-07 | SaaS repo must have its own Git boundary. |
| Preserve Koi-Pi PRODUCTION SQLite on every deploy | Live academy data | High | Decisions 2026-09-07 | SaaS experiments must not touch that volume. |
| Public edge is existing Pi nginx, not Caddy | Guest on WebHosting | High for Renzo | Decisions 2026-09-06/07 | Not a platform lock. |
| GoDaddy DNS; no Cloudflare for Renzo | Avoid blast radius | High for Renzo | Decisions 2026-09-07 | Not a platform lock. |
| Hostnames only `app` / `stage.app` / `dev.app` | Apex is Website Builder | High for Renzo | Workspace / Decisions | Customer domain strategy still open for SaaS. |
| One image, three isolated Renzo environments | Reproducible runtimes | High | Decisions 2026-09-05 | Pattern for *environments*, not yet for *customers*. |
| Same-host backup zip + 14-day PRODUCTION retention | Recoverable without cloud | High for laptop path | Decisions 2026-09-06 | Pi restore unvalidated. Off-host later. |
| Pilot PRODUCTION login `admin` / `setup` | Temporary convenience | High as current fact | Decisions 2026-09-07 | Must not become SaaS default. Change before real staff use. |

---

## 13. Working Hypotheses

These are **not decisions**. They are the current bets.

1. **A martial-arts template can be extracted from Renzo** without taking Kaysville branding, prices, Scott's compensation deal, or Pi hosting locks with it.
2. **Beauty as a second variant** will show that Household + Trial are template-level, while Campaign / Asset / Tracking / Users stay platform-level.
3. **Individually containerized environments** will be operationally simpler and safer for a small number of customers than a shared-schema multi-tenant app — at the cost of provisioning, upgrade, and density complexity.
4. **SQLite-per-environment** can carry the first few customers if backups, migrations, and volume discipline hold; PostgreSQL becomes a node or customer-size trigger, not a day-one rewrite.
5. **The first control plane can be small**: inventory + provision + health + backup/restore + version — not billing, not a marketplace, not self-service.
6. **The same tracking-link → form → Lead loop** can acquire SaaS customers inside the owner's CRM.
7. **Renzo will continue to discover requirements** that should be evaluated for promotion (customer → template → platform) rather than implemented as special cases.
8. **A Compose-per-customer or Compose-service-per-customer** model can be driven from versioned images plus a config/secret bundle. This is a provisioning hypothesis, not a design.
9. **Primary Record Workspace and server-owned workflow** should survive into the product because they are how the Renzo system stayed operable, not because they are fashionable.
10. **Feature packaging** (what a customer is allowed to enable) can start as template defaults plus a capability list, without a Stripe plan matrix.

---

## 14. Unresolved Decisions

Prioritized toward infrastructure / control plane / provisioning, then longer-term SaaS questions retained from the create-handoff prompt.

### P0 — Must be discussed before any provisioning implementation

1. **Customer environment composition.** What *is* one customer environment? App container(s)? Sidecars? One volume or many? Dev/stage/prod per customer?  
   *Decision required.*

2. **Control-plane architecture.** Separate application vs extension of ThePond vs something else? Does it run on the Pi, on the laptop, or on a future VPS? What is its source of truth?  
   *Decision required.*

3. **Isolation boundary details.** Container isolation is the working direction. Still open: database-per-customer vs other; filesystem; network; secret store; whether customers can ever share a process.  
   *Decision required.* The create prompt still lists shared DB + `tenant_id` as an undecided option; the alignment instructions lean away from that *as the first* model but do not close the others.

4. **Versioned image strategy.** One image for all industry templates? Template baked in? Config mounted? How are versions named and pinned per customer?  
   *Decision required.*

5. **Compose / runtime strategy.** One Compose project per customer? One project per node with many services? Kubernetes is almost certainly premature; that still needs to be said as a decision, not assumed.  
   *Decision required.*

6. **Provisioning workflow.** After sales agreement, what is the exact operator path to a healthy environment? Manual checklist vs script vs control-plane button? What is idempotent? What is human-gated?  
   *Decision required.*

7. **Hosting-node communication and registration.** How does the control plane talk to a Pi or VPS? SSH? Agent? Docker API on the node? ThePond already ships Renzo by tar+compose; is that a prototype or a dead end?  
   *Decision required.*

8. **Configuration vs secrets vs template data.** Which of `.env`, `app_settings`, catalog seed, intro rules, and branding are required to *create* customer #2?  
   *Decision required* after a focused audit.

9. **Domain strategy.** Platform subdomains, customer domains, or both? Who creates DNS records?  
   *Decision required.*

10. **TLS automation.** How certificates are issued and renewed when customer count > 1 and nodes > 1.  
    *Decision required.*

### P1 — Needed before a second live customer, but after the environment unit is defined

11. **Backup / restore for many environments.** Where zips live; off-host; who may restore PRODUCTION-equivalent data; how Pi vs VPS differ.  
    Renzo already has a laptop zip and an unvalidated Pi restore. *Decision required.*

12. **Upgrades and rollback.** Lockstep vs per-customer versions; migration failure; image rollback vs data rollback.  
    *Decision required.*

13. **Health, logs, observability.** What the control plane actually shows. Docker logs do not scale to "customer inventory."  
    *Decision required.*

14. **Customer environment lifecycle.** Create, start, stop, backup, restore, upgrade, suspend, deprovision, data export/delete.  
    *Decision required.*

15. **Failure recovery.** Node down, disk full, WAN IP change, nginx `-t` fail, migration fail, secret loss.  
    *Decision required.*

16. **Security boundaries.** Control plane vs customer data; operator break-glass; network isolation; public form abuse across many sites; session cookie domains.  
    *Decision required.*

17. **Migration from Raspberry Pi to VPS.** What moves: images, volumes, certs, DNS, control-plane records.  
    *Decision required* as a design constraint even if not executed soon.

18. **Resource usage and density.** How many customer environments a Pi or small VPS can run; quotas; noisy neighbor.  
    *Unknown.*

### P2 — Longer-term SaaS questions retained from the intended handoff

19. **Product scope beyond acquisition.** Confirm the boundary stays pre-membership.  
    Working decision exists; commercial pressure may reopen it. Do not silently reopen.

20. **Customer / organization / tenant / location definitions.** Is a customer one business, one location, or one legal entity with many locations?  
    *Decision required.* Renzo is one location.

21. **Multi-location behavior and cross-location users.**  
    *Unknown / decision required.*

22. **Terminology, workflow, and custom fields.** How much a template can rename (Trial vs Consult) without forking code.  
    *Decision required.*

23. **Capabilities vs feature flags vs commercial plans.**  
    *Decision required.* Do not build Stripe first.

24. **Branding, email identity, public page chrome.**  
    *Decision required.* Renzo is hard-branded in UX tokens; how far that goes in code is a repository-audit item.

25. **Billing / subscriptions for the SaaS itself.**  
    *Not in current core product.* Still an unresolved future commercial question.

26. **Git / repository separation.** This workspace is likely the snapshot. Whether to preserve Renzo Git history, start fresh, and how changes flow back to Renzo is **not decided**. Accidental SaaS commits into Renzo production history must be avoided.

27. **Promotion / backport path.** Renzo discovers a requirement → evaluate promotion. SaaS improvements eventually need a controlled path back into Renzo. Mechanism undesigned.

28. **Household universality.**  
    *Unresolved.* Do not declare it platform-core.

29. **Open Renzo gym questions** (do not invent answers): Meta ownership/access, which classes should not accept trials, attendance recording today, intro offer pricing, membership-management software if any, notification channel, privacy-policy URL, M9 human QA leftovers (permissions pass, Content many-to-many, Event duplicate warning, consent boxes). These remain Renzo customer questions. Some will inform the martial-arts template; they are not SaaS blockers by themselves.

---

## 15. Contradictions / Ambiguities

Do not silently reconcile these.

### 15.1 "Do not invent multi-tenant SaaS" vs this workstream

- **Older / Renzo current:** AGENTS.md, Architecture principles, Overview: build for this gym; not multi-tenant SaaS.
- **Newer:** Alignment instructions and create prompt: a SaaS platform with many customer environments.

**Current reading:** both are true in their scopes. Renzo *production* stays single-gym. SaaS work happens in a separate workspace/workstream. The contradiction appears only if someone "just adds tenant_id" to Renzo PRODUCTION.

### 15.2 Commercial hypothesis: martial-arts OS vs ultra-general platform

- **Create-handoff prompt §15:** emerging proposition is "a customer acquisition operating system for martial-arts academies…"
- **Alignment instructions:** ultra-general SMB platform; martial arts first; beauty likely second.

**Current reading:** the alignment instructions are newer and should be treated as the current *product direction*. The martial-arts OS line remains a valid *launch/commercial hypothesis* for the first variant, not the long-term product definition. They are not the same claim.

### 15.3 Tenant isolation options vs individually containerized

- **Create-handoff prompt §18:** isolation is undecided (shared DB + tenant_id vs schema-per-tenant vs DB-per-tenant vs hybrid).
- **Alignment instructions:** working direction is individually containerized environments, without deciding every storage/network boundary.

**Current reading:** container-per-customer is the **working isolation direction**. Shared-schema multi-tenancy is no longer the implied first path, but it is not formally rejected for all time. Database-per-customer is *suggested* by containers + current SQLite, not decided.

### 15.4 Discovery sequence emphasis

- **Create-handoff prompt:** S1 Product Definition before S7 Provisioning.
- **Alignment instructions:** process unchanged, but current discovery *shifts toward* infrastructure/provisioning so a martial-arts environment can be generated on demand.

**Current reading:** not a cancellation of product definition. It is a change in *immediate attention*. There is tension: provisioning a customer environment without a frozen template definition can bake Renzo-as-template too early. That tension should stay visible.

### 15.5 Production hosting: "not deployed" vs live

- **Open-Questions.md** (updated 2026-09-06): production hosting decided, **not deployed**.
- **Decisions 2026-09-06 public-edge ADR:** status "accepted (planned; not deployed)."
- **Implementation-State, Workspace, How-to-Run, Architecture (2026-09-07/08):** M10C/M10D **live-validated**; public HTTPS up; cert expires 2026-12-06.
- **wip/_index.md** (updated 2026-09-05): still lists WebHosting + Pond work order as "planned next public edge; not started."

**Current reading:** later operations notes win. Public HTTPS is live. Open-Questions and some ADRs/WIP index rows are stale.

### 15.6 Docker migrate/seed on start

- **Database.md** "Fresh local database": "Docker’s production image currently starts Nitro only and does **not** copy migrations or run seed."
- **How-to-Run, Architecture, Implementation-State:** container startup runs migrations then catalog/bootstrap seed (`docker/runtime-init.cjs`).

**Current reading:** Database.md paragraph looks **stale**. How-to-Run is more specific and later in operational detail. **Repository verification required** before treating either as SaaS provisioning evidence.

### 15.7 Public `/trial` matching existing leads

- **Database.md Validation:** "Public `/trial` … matches existing leads on that form."
- **CRM, Intro-Scheduling, Decisions 2026-09-02:** public booking **never** selects or merges an existing household; matching contact is a warning only.

**Current reading:** the never-merge decision is current. Database.md wording is leftover from the superseded phone+time idempotency rule.

### 15.8 STAGE/PRODUCTION bootstrap password

- Older ADR: seed does not invent `setup` outside `APP_ENV=dev`.
- 2026-09-06: STAGE bootstraps like DEV.
- 2026-09-07: PRODUCTION also uses `admin` / `setup` for pilot login.

**Current reading:** all three environments invent `setup` when unset. This is a temporary pilot decision and a security smell for any SaaS default.

### 15.9 Milestone numbering

Older notes used M8 = production, M9 = Meta, M9 = schema hardening, original spec M4 = content-before-funnel. Current labels: M8 household/reporting/Meta V1, M9 marketing operations, M10 ops. V2 sequence (2026-08-31) and 2026-09-02 M9 spec win.

### 15.10 This workspace vs `renzo_crm`

Workspace rules and Deploy-Workflow still say the product lives at `Projects/renzo_crm` and default work is Renzo. This Cursor window is `crm_marketing_saas`. The create prompt said a copy would become the SaaS reference.

**Ambiguity:** how this tree relates to `renzo_crm` (copy date, Git remote, whether it should receive Renzo production commits) is **not documented in the sources read**. **Unknown / repository + Git verification required.** Do not assume they should stay in sync.

### 15.11 Owner CRM vs Renzo gym

Alignment instructions say the platform owner gets a normal customer environment. Renzo is a live gym Scott operates. Whether Renzo *is* that owner environment, or a separate design-partner customer, is **unspecified**.

### 15.12 Compensation and "no commission in V1"

Decisions 2026-08-25 "No commission metric in V1 UI" is superseded by M9 ledger, which is still not accounting and still not on `/dashboard`. SaaS must not treat the ledger as either absent or as generic billing.

---

## 16. Risks

### Technical

- **Premature abstraction.** Extracting Platform / Template / Instance frameworks before customer #2 exists will freeze Renzo accidents as architecture.
- **Premature infrastructure complexity.** A control plane, node agents, ACME automation, and per-customer Compose on a Pi can become a larger product than the CRM.
- **SQLite + local assets.** Fine for one gym. Fragile as a fleet: locking, backup consistency, disk, no off-host copy.
- **In-memory throttle / rate limit.** Breaks or weakens across multiple processes/nodes.
- **libsql native bindings are OS-specific.** Already a Docker/Windows issue. Multi-arch (Pi ARM + VPS AMD64) will bite provisioning.
- **Migration-on-start.** Safe when one env upgrades. Dangerous if many customers share an image tag and a bad migration rolls out together.
- **Hidden hard-coding.** Timezone, branding, program codes, hostnames, ports, "Renzo" copy — any of these can make customer #2 a fork. Extent unknown until audit.

### Operational

- **Live Renzo data.** Any confusion between workstreams can destroy `webhosting_renzo_sqlite`.
- **Laptop backups ≠ Pi backups.** Already a documented trap. Multi-node makes it worse.
- **Guest-on-WebHosting.** Other sites, port collisions, nginx bind-mount inode issues, dirty WebHosting trees.
- **WAN IP churn / hairpin.** Homelab node is a weak first production for paying customers, even if it is a good provisioning lab.
- **Pilot password on PRODUCTION.** Unacceptable as a SaaS default; already a Renzo caution.
- **No Playwright / pending human QA.** M8/M9 still await Scott. Productizing an unaccepted UX increases support burden.

### Security

- Control plane with provision/restore power is a high-value target.
- Customer isolation mistakes (shared volume, wrong restore dest, cookie domain, log leakage) are worse than Renzo's current single-tenant mistakes.
- Meta tokens and future messaging secrets in `.env` files on a Pi.
- Public forms on many domains without a real rate-limit story.
- PII in SQLite zips — backups *are* the customer database.

### Product

- Treating Renzo Household/Trial/Compensation as the product.
- Measuring the platform by paid memberships rather than booked acquisition events (for martial arts).
- Building self-service signup, Stripe, and plan matrices before a sales-led second customer exists.
- Building a beauty variant on paper instead of using it only as a contrast question.
- Using Renzo's September campaign as "validated demand" for a SaaS. The create prompt forbids claiming product-market fit. Technical capability ≠ validated demand ≠ PMF.

### Scaling

- Pi density is unknown and likely low if each customer is a full image + SQLite + uploads + nginx route.
- Support burden: N isolated environments means N upgrade, backup, and "why is my form down" incidents.
- Observability gap: today, Scott *is* the control plane.

### Process

- Implementing from this alignment document.
- Auditing the entire repo before deciding the environment unit.
- Committing SaaS work into Renzo remotes, or Renzo PRODUCTION constraints into SaaS as unexamined law.

---

## 17. Repository Evidence Still Needed

Do **not** treat this as a request to audit now. These are the questions documentation cannot close.

1. **Hard-coded Renzo assumptions.** Search for gym name, domain, Denver defaults, prices, program codes, colors, copy, email text, `customer === 'renzo'` branches (M9 said configuration over such branches — verify).
2. **Docker entrypoint vs Database.md.** Confirm `docker/runtime-init.cjs`, image contents, and whether migrations/seed really run on Pi PRODUCTION start.
3. **Git identity of this workspace.** Remotes, history, relationship to `renzo_crm` / `working`, whether it is a copy, a new repo, or an uncommitted tree.
4. **Environment variable surface.** Full `.env.example` and Compose env — what is required to boot a blank instance.
5. **Seed surface.** What a empty database becomes after seed (programs, intro rules, access catalog, admin user, compensation settings). That list *is* the implicit template.
6. **Public routes and branding.** How much of `/trial` and `/events/:slug` is reusable vs gym-specific.
7. **Auth cookie / CORS / host assumptions.** Whether hostnames or ports are baked into session or env-switcher beyond documented AppEnvSwitcher behavior.
8. **Query/reporting coupling.** Whether reports assume one org, one timezone, household helpers, or Meta tables.
9. **File storage coupling.** Path assumptions, size limits, backup completeness.
10. **Background work.** Aside from `renzo-backup-1`, are there timers/jobs that assume a single process?
11. **Security boundaries in handlers.** Confirm every public vs authenticated route; honeypot; rate limit store.
12. **ThePond / WebHosting coupling.** How much provision logic already exists outside this repo (Ops Console Renzo page, certbot units, compose service names) that a SaaS control plane might reuse or conflict with.
13. **Test fixtures as hidden domain.** Milestone tests often encode rules more strictly than prose.

Recommended future audit output (from the create prompt, still valid): Executive Summary, Current Architecture, Domain Inventory, Hard-Coded Assumptions, Configuration, Auth/RBAC, Data Isolation, Org/Location, Database, Asset Storage, Environment Management, Deployment, Jobs/Integrations, Reporting, Branding, Security, Operational Dependencies, SaaS Blockers, Technical Debt, Platform vs Martial Arts vs Renzo-specific capabilities, Decisions, Candidate Architectures, Risks/Tradeoffs, Recommended Sequence.

---

## 18. Recommended Discovery Sequence From Here

This is **not** an implementation roadmap. It is the order in which architectural decisions should be made so implementation can start safely later.

```text
D0  Bootstrap / this alignment          ← done as a document
D1  Decide the customer-environment unit
D2  Decide control-plane vs node responsibilities
D3  Decide the minimum template needed to boot martial-arts customer #2
D4  Focused repository audit against D1–D3 (not a fishing expedition)
D5  Reconcile audit with this document
D6  Decide provisioning + domain/TLS + backup/restore contracts
D7  Write a short architecture spec for those contracts only
D8  Only then: productization roadmap and implementation
```

Why this order:

- **D1 first.** Every other infra question (Compose, images, database, backups, control plane, domains) changes meaning depending on what "a customer environment" contains.
- **D2 second.** You cannot design provisioning until you know what the control plane is allowed to do on a node, and what the node does autonomously (Renzo already migrates on start; that may or may not remain).
- **D3 third.** A blank "platform" will quietly become a clone of Renzo. Naming the *minimum* martial-arts boot set (admin user, empty catalog vs seeded programs, public form type, timezone) prevents that.
- **D4 is a targeted audit**, not "read the whole repo." It exists to falsify D1–D3 against code.
- **D6 before images and scripts.** Domain/TLS/backup are how a "generated" environment becomes a *real* one. Skipping them produces containers nobody can safely operate.
- **Do not** insert Stripe, self-service signup, beauty template design, Meta publish, or a generic feature-flag platform in this sequence.

The create-handoff S0–S8 names remain usable as a longer-term map. They should not override D1 as the next conversation.

---

## 19. Next Decision to Discuss

**Decide what constitutes one customer environment — the unit the control plane will eventually provision.**

Not "Docker vs not Docker." Not "Pi vs VPS." Not "what is the beauty workflow." Those matter later.

The unit decision means answering, at a product/architecture level:

```text
When we say "provision Customer B,"
what running pieces and durable pieces must exist
for that customer to be considered operational?
```

Minimum questions inside that one decision (still one decision, not a questionnaire):

- one application process vs several;
- what persistent state it owns (database file/volume, asset volume, config, secrets);
- whether that customer also gets STAGE/DEV or only PRODUCTION;
- how it is identified (id, slug, hostname) independently of Renzo's `APP_ENV`.

### Why this first

1. The alignment instructions say current discovery is shifting toward generating a martial-arts environment on demand. That sentence is undefined until the environment unit exists.
2. Individually containerized is only a *direction*. Without a composition contract, it will be silently reinterpreted as "copy the Renzo Compose stack and change the gym name."
3. Control-plane scope, image strategy, backup/restore, TLS, and node capacity cannot be designed against a moving object.
4. Template vs platform arguments become concrete: whatever must be present to boot is the first template; everything else can wait.
5. It is reversible on paper and expensive after the first provisioner is written.

After that decision is recorded, the following conversation should be the control-plane/node split — not a jump to implementation.

---

## Appendix A — Renzo evolution (compressed)

Useful context for why the codebase looks the way it does. Not a milestone plan for SaaS.

| Era | What changed | Lesson |
|---|---|---|
| M0–M1 | Greenfield Nuxt + SQLite domain | Trial separate from Lead; money/time disciplines; programs as rows |
| M2 / M7 | Auth, then real user admin + RBAC hardening | Cookie sessions, revocation, VIEWER locked down |
| M3–M5 | CRM, `/trial`, follow-up calls | Server-owned workflow; two-weekday confirmation call |
| M6 | Design system / staff console | Operations console ≠ marketing site |
| M8 | Household, catalog, conversion, campaigns, reports, Meta V1 | Shared phone is not identity; conversion is the boundary |
| M9 | Marketing operations + Access Rights + Events + compensation + workspace UX | Marketing feeds acquisition; tasks are not follow-ups |
| M10A–D | Docker isolation, laptop backup, Pi HTTP/HTTPS | One image, isolated volumes, guest on existing nginx |
| M10B/E/F/H | Backup validation, off-host, Postgres | Partial / not started |
| UX passes 2026-09-03–08 | Record workspace, assets/content, mobile, friendly `/t/:slug` | Records are workspaces; human QA still pending |

Original spec put content before the public form. Intro scheduling outranked content. That sequencing lesson is why the SaaS core is acquisition operations, not a CMS.

## Appendix B — What we should not do next

Retained from the create-handoff prompt and the alignment instructions.

- Do not say "make this multi-tenant" or "convert this to SaaS" as an implementation task.
- Do not generalize the entire repository.
- Do not start a control plane, billing, self-service signup, or Stripe.
- Do not migrate to PostgreSQL "for SaaS readiness."
- Do not design the beauty variant.
- Do not implement Meta's full funnel.
- Do not create Raspberry-Pi-only provisioners that cannot move.
- Do not silently decide database, storage, or TLS mechanisms.
- Do not invent answers to `Open-Questions.md`.
- Do not touch Koi-Pi PRODUCTION SQLite.

## Appendix C — Instructions for subsequent conversation

1. Use this document **together with** the create-handoff prompt (and the completed handoff if it later appears).
2. Before asking Scott a question, check whether documentation or prior decisions already answer it.
3. Ask only unresolved questions.
4. Work major decisions **one at a time**. The next one is §19.
5. Distinguish product decisions, architecture decisions, and implementation decisions.
6. Challenge assumptions.
7. Do not begin implementation until explicitly instructed.
8. Preserve Known / Working decision / Hypothesis / Unknown labels. Do not turn inference into fact.
)