---
type: note
status: current
area: process
updated: 2026-09-08
tags:
  - wip
  - saas
---

# SaaS S0–S8 discovery answers

**Date:** 2026-09-08  
**Questions:** [[wip/archive/SaaS_S0-S8_Discovery_Questions_2026-09-08]]  
**Purpose:** Answer from existing decisions and documented direction. This file is `wip` communication, not a substitute for [[SaaS-Decisions]] until promoted.

## How to read this

| Label | Meaning |
|---|---|
| **Answered** | Settled in vault / executed / Scott already accepted |
| **Recommendation** | Cursor recommendation consistent with prior direction; treat as working until contradicted |
| **ASK SCOTT** | Reviewing AI must ask Scott this question. Do not invent an answer. |
| **Audit later** | Cannot be answered from docs; inspect the repo when that milestone starts. Do not ask Scott to guess. |

Do not implement from this file. Follow [[SaaS-Milestones]]: resolve the current milestone, record durably, implement only when Scott authorizes.

---

# S0 — Workspace split

Status: **Successful**.

### S0.1 Is the SaaS workspace a separate Git repository and remote from Renzo?

**Answered.** Yes. Repo root is `C:\Users\Scoy9\Projects\crm_marketing_saas`. Branch `main`. Remote `origin` is https://github.com/Koifish95/crm_marketing_saas.git. Renzo remains `Projects/renzo_crm`, remote `renzo-crm`, branch `working`.

### S0.2 Can SaaS commits accidentally enter Renzo production history?

**Answered.** Not through the current remotes. This repo has no `renzo-crm` remote. Accidental mix-up is still an operator risk if someone adds the wrong remote later. Do not add `renzo-crm` as origin.

### S0.3 Is Renzo production data completely outside the SaaS workspace?

**Answered.** Yes for live academy data. Koi-Pi PRODUCTION SQLite is volume `webhosting_renzo_sqlite`, not in this tree and not in Git. Local template `data/` / sqlite / uploads are gitignored. Never copy that volume into this repo.

### S0.4 What Renzo material is reference versus operational?

**Answered.**

- **Reference / evidence:** `crm_saas_vault` Renzo notes (`Domain-Model`, `Architecture`, `Implementation-State`, `Decisions`, etc.) and `martial_arts_template` as starting code.
- **Operational:** `Projects/renzo_crm`, WebHosting drop-in, Koi-Pi volumes, public Renzo hostnames.

### S0.5 How will Renzo discoveries be evaluated for promotion into SaaS?

**Answered.** [[Working-Agreement]] path:

```text
Renzo-only → martial-arts template? → platform-generic?
```

Default is Renzo-only. Promotion is an explicit [[SaaS-Decisions]] entry.

### S0.6 How will SaaS improvements eventually return to Renzo?

**Recommendation.** A controlled backport will be needed. Mechanism is **not designed**. Do not auto-sync the two remotes.

**ASK SCOTT**  
Reviewing AI: ask Scott: “When a SaaS/template improvement should land in live Renzo, do you want that to stay a manual copy/PR for now, or should we design a formal backport process before S8?”

### S0.7 Is Git history intentionally preserved or replaced?

**Answered.** Replaced / fresh. `git init` here imported no Renzo commits.

### S0.8 Are the two workstreams documented clearly enough for future sessions?

**Answered.** Yes enough to start: [[Home]], [[Working-Agreement]], [[SaaS-Decisions]], [[SaaS-Milestones]], [[Control-Plane]]. Repo-root briefing still leans Renzo-evidence; SaaS map starts at `crm_saas_vault/Home.md`.

### S0.9 Are Renzo-specific deployment constraints separated from SaaS architecture?

**Answered.** Separated in documentation: Renzo locks (GoDaddy, no Cloudflare, no Caddy, no Pi host ports, never `down -v`) stay customer-hosting facts. SaaS model must stay Pi→VPS portable. Do not copy Renzo locks as platform law.

### S0.10 Are handoff, alignment, decisions, milestones, and working agreements durable sources?

**Answered.** Yes, with one gap: the *completed* productization handoff file was never found. Alignment + create-prompt + these vault notes are the current sources.

---

# S1 — Customer environment unit

Already-decided list in the questions file is accepted as the S1 baseline (PROD+DEV default, independent storage, IDs, health, isolation, placement on a node, portable model).

### S1.1 Is exactly one PROD per customer a formal invariant?

**Recommendation.** Yes. Make it a formal invariant: exactly one environment with type `PROD` per customer.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Confirm: exactly one PROD per customer is a hard rule, not just a default?”

### S1.2 Can customers have multiple DEV / STAGE / UAT / TRAINING environments?

**Recommendation.** Yes. Extra environments beyond the default PROD+DEV are allowed later and may be billable. Types (`DEV`, `STAGE`, `UAT`, …) plus a display name (`DEV-JOHN`, `TRAINING`).

**ASK SCOTT**  
Reviewing AI: ask Scott: “Besides the default DEV, do you want extra environments allowed from day one of S4, or only after first launch?”

### S1.3 Which customer-level settings may be overridden per environment?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Which customer settings may a DEV (or other) environment override — timezone, branding, catalog/prices, public-form copy, integrations — and which must stay identical to PROD?”

**Recommendation if Scott wants a default:** Branding and legal name stay customer-level only. DEV may override runtime/debug flags and may run a newer app version. Catalog/prices default to inherited; override is exceptional.

### S1.4 When customer-level configuration changes, how should environments receive it conceptually?

**Recommendation.** Customer config is the source of truth. Environments inherit it unless an explicit override exists. Propagation is conceptual for S1 (not a sync implementation). A change does not rewrite another environment’s database silently.

**ASK SCOTT**  
Reviewing AI: ask Scott: “When you change branding or timezone on the customer, should all environments pick it up automatically on next read, or should each environment apply it only after an explicit promote/apply action?”

### S1.5 Are integration credentials environment-level by default?

**Recommendation.** Yes. Meta tokens, future SMS/email keys, and session-seal secrets are environment-level so DEV cannot share PROD credentials.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Any integration that should be customer-wide (one Meta ad account for PROD and DEV) instead of per environment?”

### S1.6 Should health eventually expose identity/version metadata, or stay control-plane metadata?

**Recommendation.** Control plane stores customer id, environment id, type, node, and deployed version. `/api/health` stays a liveness/readiness contract (process + database reachable). Optional later: health may *echo* environment id/version for verification, but the control plane remains authoritative.

### S1.7 What minimum conceptual state makes an environment operational?

**Recommendation.** All of: stable Environment ID + Customer ID; type; hosting node placement; application process; independent database; independent asset storage; environment secrets/config; health endpoint responding; lifecycle not Stopped/Failed. Domains/TLS are S5, not required for “operational” in S1/S2.

### S1.8 Is the durable model infrastructure-neutral enough for a future non-Docker runtime?

**Answered.** Yes, if we record **application process** (initially one container), not “must be Docker forever.” Node + volumes + secrets + health stay the unit.

---

# S2 — Boot a second martial-arts environment by hand

## Template / product boundary

### S2.1 Minimum configuration to turn a blank app into a Martial Arts CRM?

**Recommendation.** Industry template = Martial Arts. Required to be usable: timezone, currency (USD default ok), at least one Program or an empty catalog staff can fill, ADMIN user, public form enabled or explicitly off, business display name. Prices and intro timetable can start empty if staff can add them.

**Answered (2026-09-09).** Staff can log in without intro times or prices. Seed Adult BJJ + Kids BJJ active and Striking + Wrestling inactive. Public `/trial` stays hidden until ADMIN publishes availability.

### S2.2 Which Renzo capabilities belong in Platform?

**Recommendation.** Users/auth/sessions, coarse roles + Access Rights *mechanism*, Campaigns, Content, Assets, Marketing Tasks, tracking links / first-touch attribution, public form → Lead, follow-up *work items*, notes/history, reporting/export primitives, app settings, audit log, environment backup package, health endpoint.

### S2.3 Which belong in the Martial Arts template?

**Recommendation.** Trial / intro scheduling, intro availability timetable, guardian/child / Kids path, Program catalog shaped for BJJ/striking/wrestling (as *rows*, not code), Acquisition Events as gym-event-to-household, booked-trial as a primary success metric, household display rules *if* Household stays in the template.

### S2.4 Which are Renzo/Kaysville-specific?

**Answered as inventory (do not ship in customer #2).** Academy name/branding/navy tokens as the only look, `renzogracieutah.com`, Kaysville weekly schedule seed, $175/$150/$155 seed prices, 50% compensation-to-Scott, `admin`/`setup` PRODUCTION convenience, America/Denver as the only timezone, “no Muay Thai,” mid-November window, Pi guest-on-WebHosting locks.

### S2.5 Which Renzo assumptions are hard-coded?

**Audit later.** Docs suspect timezone, branding, program codes, hostnames, ports, copy. Do not ask Scott to list code facts. Cursor audits `martial_arts_template` when S2 starts.

### S2.6 Is Household Platform-level or Martial Arts-specific?

**Recommendation.** Treat as **Martial Arts template** until a second industry proves it generic. Alignment left this unresolved on purpose.

**Answered (2026-09-09).** Household stays in the Martial Arts template, not Platform core.

### S2.7 Is guardian/child Martial Arts-specific?

**Recommendation.** Yes (template). Platform still has a person/prospect record.

### S2.8 Is Trial/Intro a Martial Arts template capability?

**Recommendation.** Yes.

### S2.9 Are Acquisition Events enabled by default?

**Answered (2026-09-09).** Capability on; no seeded events.

### S2.10 Is compensation attribution Martial Arts, optional, or Renzo-specific?

**Recommendation.** Optional add-on; **off by default**. The 50% Scott ledger is Renzo-specific and must not seed for customer #2.

**Answered (2026-09-09).** Off by default. Turn on per customer if they want it. No 50% Scott ledger.

### S2.11 Which reports ship in a blank Martial Arts instance?

**Recommendation.** Operational funnel: households/people, booked trials, attend/no-show, conversions. Financial cents / compensation reports only if that capability is on (default off).

### S2.12 Which Access Rights ship by default?

**Recommendation.** Keep Renzo’s model: ADMIN has every right in code; STAFF starts with none; VIEWER dashboard-only. Seed the Access Right *catalog* so ADMIN can assign roles. Do not invent new codes in S2.

### S2.13 Which settings are defaults versus onboarding-required?

**Recommendation.**

- **Defaults:** timezone if provided, USD, Access Right catalog, `allowEarlyTrialOutcomes` on (Renzo default) unless Scott says otherwise.
- **Onboarding-required:** business name, ADMIN identity, timezone if not defaulted.
- **Can wait:** prices, intro timetable, Meta, privacy URL.

**Answered (2026-09-09).** ON for every martial-arts customer unless they change Settings.

### S2.14 Should Lead Sources be seeded?

**Recommendation.** Yes, a small generic set (Walk-in, Referral, Website, Instagram, Facebook, Phone, Other). Not Renzo campaign names.

### S2.15 Should Programs be seeded or empty?

**Answered (2026-09-09).** Seed Adult BJJ + Kids BJJ active; Striking + Wrestling inactive extras.

### S2.16 Should Membership Offerings/prices start empty?

**Recommendation.** Yes, empty. Do not seed Renzo $175/$150.

### S2.17 Should intro availability start empty?

**Recommendation.** Yes, empty. Do not seed the Kaysville weekly timetable.

### S2.18 Should lost reasons have defaults?

**Recommendation.** Yes, generic reasons (Not interested, Price, Schedule, Location, No response, Other). No “Joined another gym” required.

### S2.19 Should Campaign defaults exist?

**Recommendation.** No seeded campaigns. Creating a campaign still creates a default tracking link (platform behavior).

### S2.20 Is the public Trial form enabled automatically?

**Answered (2026-09-09).** Hidden until ADMIN publishes at least one enabled intro time. Not live-empty.

### S2.21 What branding/copy must be configurable?

**Recommendation.** Display name, logo later, public header/title, primary colors eventually, confirmation copy. Not hard-coded “Renzo Gracie.”

### S2.22 What timezone / currency / locale is required?

**Recommendation.** Timezone **required** (no silent America/Denver). Currency USD unless Scott says otherwise. Locale can follow timezone country for S2.

**Answered (2026-09-09).** USD only through S8.

## Manual boot

### S2.23 What operator inputs are required?

**Recommendation.** Customer display name, customer slug, timezone, environment type (PROD and/or DEV), ADMIN username/email, ADMIN password (not `setup`), placement (which machine). IDs may be generated.

### S2.24 Can customer #2 boot without source edits?

**Recommendation.** That is an S2 goal. Unknown until audit. If source edits are required, they must become configuration before calling S2 Successful.

**Audit later.**

### S2.25 Can it boot without copying Renzo SQLite?

**Answered.** Yes — required. Fresh database only.

### S2.26 Can it boot without copying Renzo assets?

**Answered.** Yes — required. Empty asset volume.

### S2.27 Can migrations create a fresh database?

**Recommendation.** Yes. Same migrate-then-seed path Renzo Docker already documents. Confirm in audit.

### S2.28 What seed process is required?

**Recommendation.** Platform catalog (Access Rights, maybe lead sources/lost reasons) + Martial Arts template seed (per S2.14–S2.19) + bootstrap ADMIN. No Renzo households, campaigns, or schedule.

### S2.29 Is seed idempotent?

**Recommendation.** It must be, matching Renzo seed rules. Confirm in audit.

### S2.30 Does seed inject Renzo-specific data?

**Recommendation.** It must not, for S2 Successful. Today’s Renzo seed likely does. Audit and strip.

### S2.31 How is the initial ADMIN created?

**Recommendation.** Seed/bootstrap one ADMIN from operator-supplied identity, `mustChangePassword` as Scott chooses.

### S2.32 How are initial credentials handled?

**Recommendation.** Operator sets a real password. **`admin` / `setup` is prohibited** as a SaaS default (S5/S8 already say this).

**Answered (2026-09-09).** Lab: operator-set password, no forced change. Real customer PROD (S4): force first-login change.

### S2.33 How are runtime secrets created?

**Recommendation.** Generate `NUXT_SESSION_PASSWORD` (and any seal keys) per environment at boot. Do not reuse Renzo’s.

### S2.34 How are Customer ID and Environment ID supplied?

**Recommendation.** Generated by the operator checklist or a small script in S2; control plane generates them in S4. Stable, not derived from display name.

### S2.35 How is Hosting Node placement represented?

**Recommendation.** For S2, a label in the checklist (`laptop` or `koi-pi-lab`). Not a Renzo hostname. Control plane stores node id in S3.

### S2.36 How is environment type supplied?

**Recommendation.** Explicit `PROD` or `DEV` at boot. Default pair is both, even if S2 only boots one first to prove isolation.

### S2.37 How is deployed version recorded?

**Recommendation.** Write the image tag / git SHA into a file or control-plane field. For S2 checklist, record it on paper/checklist even if the app does not store it yet.

### S2.38 How are volume names made stable and collision-free?

**Recommendation.** Include customer id + environment id (or slug + type) in volume names. Never reuse `webhosting_renzo_*` or laptop `renzo-prod-*`.

### S2.39 How is `/api/health` verified?

**Recommendation.** HTTP GET, require process + database reachable (Renzo’s existing contract).

### S2.40 How do we prove DB and asset isolation?

**Recommendation.** Marker file/row in each environment; confirm the other environment cannot see it. Separate volume names.

### S2.41 How do we prove Renzo production is inaccessible?

**Recommendation.** Do not mount Renzo volumes. Health/config `APP_ENV` and isolation marker are this environment’s. Confirm Pi `webhosting_renzo_sqlite` was never attached.

### S2.42 Can the full procedure be repeated from a checklist?

**Answered as requirement.** Yes — that is S2 Successful. Checklist does not exist yet.

## S2 Successful

### S2.43–S2.50

**Answered as acceptance criteria (not yet true).** All must become yes:

43. Independent process  
44. Own admin login  
45. Health green  
46. DB/assets isolated  
47. Stop/restart without data loss  
48. Can coexist with other environments  
49. No source-code fork  
50. Documented repeatable checklist  

---

# S3 — Control plane v1

### S3.1 Is the control plane a separate application?

**Answered.** Yes.

### S3.2 Same repository or separate repository?

**Answered (2026-09-09).** Same SaaS repo, separate app/folder (e.g. `control_plane/` next to `martial_arts_template/`). Not a new remote. Not inside a customer CRM.

### S3.3 Where does v1 run?

**Answered (2026-09-09).** Laptop-only for the S3 proof.

### S3.4 Does it need to run on a Hosting Node?

**Recommendation.** No. It *manages* nodes. Running on the same machine as customers is allowed for a proof and is a poor long-term home.

### S3.5 What is its source of truth?

**Recommendation.** Control-plane registry for inventory (customers, environments, nodes, intended version, placement). Runtime health is observed from the node. When they disagree, show both; do not silently overwrite volumes.

### S3.6 Does it have its own database?

**Recommendation.** Yes, its own store (SQLite is fine for v1). Not a customer CRM database.

### S3.7 Which Customer fields does it store?

**Recommendation.** Customer ID, slug, display name, industry template, created-at, maybe notes. Not leads, campaigns, or PII of gym prospects.

### S3.8 Which Environment fields does it store?

**Recommendation.** Environment ID, customer ID, type, display name, node ID, intended/deployed version, health, lifecycle, last check, process identity (container name as implementation detail), volume names as references — not DB file bytes.

### S3.9 Which Hosting Node fields does it store?

**Recommendation.** Node ID, display name, kind (pi/vps/laptop), reachability, how-to-connect reference (not necessarily the secret itself).

### S3.10 Does it store deployed versions?

**Recommendation.** Yes, per environment.

### S3.11 Current health only or health history?

**Recommendation.** Current health + last-checked timestamp for S3. History is later (S6).

### S3.12 What customer business information must not be duplicated?

**Answered.** Leads, trials, campaign copy, asset bytes, compensation, gym member PII, Meta tokens. Those stay in the customer environment.

### S3.13 How does an existing environment become registered?

**Recommendation.** Operator enters it (S2 checklist outputs become the form).

### S3.14 Is manual registration enough for v1?

**Answered.** Yes.

### S3.15 What fields are required?

**Recommendation.** Customer (or create customer first), environment type, environment id or generate, node, how to find the process/health URL, volume identity enough to refuse `down -v`.

### S3.16 Must Customer and Hosting Node exist first?

**Recommendation.** Yes, or the same form creates Customer then Environment. Node should exist first.

### S3.17 Can environment placement change?

**Recommendation.** Conceptually yes (S6 move). S3: record placement; changing node is out of v1 actions.

### S3.18 Who generates IDs?

**Recommendation.** Control plane generates if missing; S2 may pre-create and register the same IDs.

### S3.19 What happens when metadata disagrees with runtime?

**Recommendation.** Show “registry says X / runtime says Y.” Do not delete volumes to “fix” it. Operator reconciles.

### S3.20 How does the control plane talk to a node?

**Answered (2026-09-09).** Local Docker on the operator laptop. No SSH, no agent.

### S3.21 Minimum secure mechanism for v1?

**Recommendation.** Local Docker socket on the operator laptop, **not** mounted into customer CRM containers. Pi/SSH/agent later.

### S3.22 What credentials are required and where stored?

**Recommendation.** v1 laptop: inherit the operator’s Docker access. Do not put node credentials in a customer environment. Control-plane secrets stay in the control-plane store.

### S3.23 How do we ensure customer containers never gain Docker-control privileges?

**Answered.** Same as Renzo: no Docker socket in the CRM container. Control plane is a different process.

### S3.24 How is a Hosting Node authenticated?

**Recommendation.** S3 laptop: implicit (local). Later: node credential / agent token. Do not invent the Pi scheme in S3.

### S3.25 Status when the node is unreachable?

**Recommendation.** Environments on that node show **Unknown / node unreachable**, not Unhealthy-app. Distinguish node failure from app failure.

### S3.26 What does Running mean?

**Recommendation.** Application process exists and is running (container running, if Docker).

### S3.27 What does Healthy mean?

**Recommendation.** Running **and** `GET /api/health` reports app + database reachable.

### S3.28 How often is health checked?

**Answered (2026-09-09).** On-demand (page load / explicit refresh) is enough for S3 Successful. Periodic poll optional later.

### S3.29 When does Healthy become Unhealthy?

**Recommendation.** Running but health endpoint fails or DB not reachable. Process exited → Stopped or Unhealthy, not Healthy.

### S3.30 Is polling required or is on-demand enough initially?

**Answered (2026-09-09).** On-demand is enough. Polling is nicer, not required.

### S3.31 Is health history necessary?

**Recommendation.** No for S3 Successful.

### S3.32 What does Relaunch mean?

**Answered.** Recreate/restart the process and remount the same durable data. Not provision. Not `down -v`.

### S3.33 Restart or recreate-from-same-version?

**Recommendation.** Same version. Recreate container from the recorded image tag, same volumes. Not “pull latest.”

### S3.34 Are stop / start / relaunch distinct?

**Recommendation.** Yes. Stop = process down, volumes kept. Start = process up on existing volumes. Relaunch = stop then start (or recreate) same version.

### S3.35 Which actions require confirmation?

**Recommendation.** Stop, relaunch, and anything destructive. Start of a stopped env can be one click. Delete/decommission is not an S3 action.

### S3.36 How is volume destruction made impossible through normal actions?

**Answered.** Control-plane actions never pass `-v`, never prune volumes, never delete named volumes. Tests should prove that.

### S3.37 What operator audit trail is required?

**Recommendation.** Who, when, action, environment id, result. Enough to know who relaunched what.

### S3.38–S3.45 What must the list show?

**Recommendation.** Yes to all: customer, type/name, node, health, lifecycle, app version, last check.

### S3.46 Are logs needed in S3?

**Recommendation.** No. S6.

### S3.47 Inventory enough, or customer detail pages?

**Recommendation.** Inventory list is enough for S3 Successful. A simple customer grouping/filter is useful. Full detail pages can wait.

## S3 Successful

### S3.48–S3.54

**Answered as acceptance criteria (not yet true).**

48. Human-readable environments  
49. PROD vs DEV distinguishable  
50. Multiple customers on one node distinguishable  
51. Process + app health visible  
52. Relaunch without data loss  
53. Returns healthy  
54. Provisioning still absent  

---

# S4 — Sales-led provisioning

### S4.1 What customer information is required before provisioning?

**Answered (2026-09-09).** Display name, slug, timezone, admin email. Martial Arts is the only template. Nothing else mandatory. See [[SaaS-Decisions#2026-09-09 — S4 owner decisions (password, form, image, secrets, extras)]].

### S4.2 What environment information is required?

**Recommendation.** Types to create (default PROD+DEV), node placement, app version (or “current stable”).

### S4.3 Is Customer creation separate from Environment creation?

**Recommendation.** Yes, even if one wizard does both. Customer can exist before environments (sales won, not yet provisioned).

### S4.4 Are PROD + DEV created together by default?

**Answered.** Yes, by current S1 direction.

### S4.5 Can one environment be added later?

**Answered (2026-09-09).** Yes as capability. S4 does not ship Add-environment. S6: operator adds extra non-PROD. S8: customer requests extras for a fee.

### S4.6 How is industry template selected?

**Recommendation.** Explicit field. S4/S8 only Martial Arts exists.

### S4.7 How is Hosting Node selected?

**Recommendation.** Manual pick. Capacity awareness not required for S4.

### S4.8 What is required before boot versus configurable afterward?

**Answered (2026-09-09).** Before: IDs, secrets, template, timezone, ADMIN unwrap (`admin` / `setup`) with `mustChangePassword`. After: catalog, intro times, branding polish, Meta, extra users, and the chosen permanent admin password.

### S4.9 What makes provisioning idempotent?

**Recommendation.** Same customer+environment IDs do not create a second pair of volumes. Retry resumes or no-ops if already healthy.

### S4.10 What happens if provisioning fails halfway?

**Recommendation.** Mark Failed. Do not delete volumes automatically. Operator inspects and resumes or gated-cleans.

### S4.11 Can it safely resume?

**Recommendation.** Yes, that is the goal. Design in S4; not S1.

### S4.12 Can partial resources be cleaned up safely?

**Recommendation.** Only via an explicit gated cleanup, never as a side effect of relaunch.

### S4.13 Do all Martial Arts customers use the same versioned image?

**Recommendation.** Yes, same image, versioned tags. Config/template data differ.

### S4.14 Where are images stored?

**Answered (2026-09-09).** Local Docker build on the laptop node only. Not Docker Hub or GHCR until a second machine needs the same image (likely S6).

### S4.15 Do we require ARM64 + AMD64 / multi-arch?

**Recommendation.** Yes as a design constraint (Pi ARM, VPS usually AMD64). S4 laptop-only can be one arch if recorded as a limitation.

### S4.16 How are versions named?

**Recommendation.** Immutable tags from git SHA and/or semver. No floating `latest` for PROD.

### S4.17 Are mutable PROD tags prohibited?

**Recommendation.** Yes.

### S4.18 Which version does new PROD receive?

**Recommendation.** Current stable / last promoted Martial Arts release.

### S4.19 Which version does new DEV receive?

**Recommendation.** Same as PROD at create time, or newer if operator chooses. DEV may later diverge.

**ASK SCOTT**  
Reviewing AI: ask Scott: “On first provision, should DEV start on the same version as PROD, or always on ‘latest candidate’?”

### S4.20 Is template selection configuration-driven or image-driven?

**Recommendation.** Configuration-driven on one CRM image if possible. Separate images only if forced later.

### S4.21 Can future templates use the same image?

**Recommendation.** That is the intent. Not proven.

### S4.22 One Compose project per customer, per environment, or per node?

**ASK SCOTT**  
Reviewing AI: ask Scott only if he has a preference; otherwise use the recommendation.

**Recommendation.** One Compose project **per environment** (or per customer with two services) — pick at S4 design time. Do not decide in S1. Avoid one giant project that `down -v`s everyone.

### S4.23 Is Compose still appropriate at initial scale?

**Recommendation.** Yes for Pi + a handful of customers.

### S4.24 Naming conventions for services, networks, volumes?

**Recommendation.** Include customer id + environment id. Never `renzo-*` or `webhosting_renzo_*` for SaaS customers.

### S4.25 Are environments network-isolated?

**Recommendation.** Yes, no shared app network that lets CRM A talk to CRM B’s DB.

### S4.26 Are CPU/memory limits required before launch?

**Recommendation.** Not required for S4 Successful. Nice on a Pi. Do not block S4.

### S4.27 Who generates session/runtime secrets?

**Recommendation.** Provisioner / control plane, unique per environment.

### S4.28 Where are secrets stored?

**Answered (2026-09-09).** Per-environment `.env` on the node, gitignored, not in Git. Control plane stores references, not live admin passwords or integration tokens. No secrets manager before S8.

### S4.29 Does the control plane store secret values or references?

**Recommendation.** References preferred. Bootstrap admin password shown once, not stored in plaintext.

### S4.30 How are customer settings inherited?

**Recommendation.** Written at provision into the environment (or read from control plane at runtime). Mechanism is S4 design, not S1.

### S4.31 How are environment overrides represented?

**Recommendation.** Explicit override records. Unset = inherit.

### S4.32 Can provisioning occur without editing source files?

**Answered as requirement.** Yes for S4 Successful.

### S4.33 How is a fresh SQLite DB created?

**Recommendation.** Empty file on the new volume + migrate + seed.

### S4.34 Migrations during provisioning or startup?

**Recommendation.** Startup (Renzo pattern), so recreate/upgrade keeps working. Provisioning waits for healthy.

### S4.35 What is the blank/template seed contract?

**Recommendation.** Defined by S2 answers (no Renzo rows). S4 reuses that contract.

### S4.36 How are asset volumes initialized?

**Recommendation.** Empty directory. App creates what it needs.

### S4.37 When does backup protection begin?

**Recommendation.** First successful PROD healthy, or immediately after provision. Do not wait for S8.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Should the first automated backup run as soon as PROD is healthy, or only after you declare the customer commercially live?”

### S4.38 Is node placement manual initially?

**Answered.** Yes.

### S4.39 Does v1 need capacity awareness?

**Recommendation.** No.

### S4.40 Can PROD and DEV live on different nodes?

**Recommendation.** Allowed by the model. S4 may still place both on one node for simplicity.

### S4.41 How is placement recorded?

**Recommendation.** Environment.hosting_node_id in the control plane.

### S4.42 What prevents duplicate provisioning?

**Recommendation.** Unique Customer ID + unique Environment ID; unique volume names; refuse if slug+type already exists.

## S4 Successful

### S4.43–S4.50

**Answered as acceptance criteria (not yet true).** New customer without a new procedure; control plane knows them immediately; PROD/DEV per policy; stable IDs and unique secrets; isolated DB/assets; healthy; Renzo data never copied; self-service still absent.

---

# S5 — Reachable customer access

### S5.1 What is the platform-owned domain?

**ASK SCOTT**  
Reviewing AI: ask Scott: “What domain will the SaaS platform own for customer hostnames (not renzogracieutah.com)?”

### S5.2 Does every environment get a platform hostname?

**Recommendation.** PROD always. DEV yes if we want S5 Successful “DEV separately reachable if desired.”

**ASK SCOTT**  
Reviewing AI: ask Scott: “Should every DEV get a public hostname, or only PROD plus optional DEV?”

### S5.3 What hostname convention represents PROD / DEV / optional environments?

**Recommendation.** Independent of display name. Use customer slug + environment type, e.g. `{slug}.{platform}` and `{slug}-dev.{platform}` or `{env}.{slug}.{platform}`.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Prefer `slug.platform.com` for PROD and `dev.slug.platform.com` for DEV, or another pattern?”

### S5.4 Can customers use vanity/custom domains?

**Recommendation.** Later, maybe billable. Not required for S5 Successful (platform hostname is enough).

### S5.5 Can platform and vanity hostnames coexist?

**Recommendation.** Yes, when vanity exists.

### S5.6 Is custom domain support billable later?

**ASK SCOTT**  
Reviewing AI: ask Scott: “When vanity domains exist, are they a paid add-on?”

### S5.7 Is DNS identity independent of mutable customer display name?

**Answered.** Yes. Slug/id based. Renaming the gym does not rename DNS unless we choose to.

### S5.8 Who creates DNS records?

**ASK SCOTT**  
Reviewing AI: ask Scott: “For the first customers, will you create DNS records by hand, or should S5 automate them?”

**Recommendation.** Manual DNS for first launch is acceptable.

### S5.9 Is DNS manual or automated initially?

**Recommendation.** Manual initially.

### S5.10 Which DNS provider does the SaaS platform use?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Which DNS provider will the *SaaS platform domain* use? (Renzo stays GoDaddy; that does not answer this.)”

### S5.11 Is there one reverse proxy per Hosting Node?

**Recommendation.** Yes. One edge per node, Host/SNI routing. Do not publish CRM ports on the host (Renzo lesson).

### S5.12 How does routing configuration discover environments?

**Recommendation.** Control plane writes or templates routes from registry. No hand-editing nginx for each customer as the long-term path; S5 first customer may still be a documented manual route.

### S5.13 Does the control plane manage routes?

**Recommendation.** Eventually yes. S5 first slice may be checklist + control plane stores the hostname.

### S5.14 How are duplicate hostnames prevented?

**Recommendation.** Unique hostname constraint in the control plane.

### S5.15 Can a bad route break other customers?

**Recommendation.** Must not. Isolated server blocks, test config before reload (`nginx -t` lesson). A failed reload must not wipe all routes.

### S5.16 Are application ports private behind the edge?

**Answered.** Yes. `expose`, not host `ports:`, on shared nodes.

### S5.17–S5.25 TLS

**Recommendation.** Let's Encrypt preferred. Node-level issuance. One cert per hostname (or wildcard if we own the platform zone). Monitor expiry. Vanity later.

**ASK SCOTT**  
Reviewing AI: ask Scott: “For the platform domain, is Let's Encrypt HTTP-01 on the node OK, or do you want DNS-01 / wildcard from the start?”

**Recommendation if needed:** HTTP-01 for platform hostnames; DNS-01 when vanity or wildcard appears. One customer’s cert failure must not take down others’ existing certs.

### S5.26 How is the first real ADMIN created?

**Recommendation.** Provisioning / S2 seed with operator-supplied email/username.

### S5.27 Temporary password + forced change?

**Recommendation.** Yes for invited staff. Operator-set password for the first ADMIN is OK if it is not `setup`.

### S5.28 Are `admin/setup` defaults prohibited?

**Answered.** Yes, as a SaaS default.

### S5.29 Is invitation email needed now?

**Recommendation.** No for S5/S8 if Scott can tell the customer the password out of band.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Do you need invite-by-email before the first paid customer, or is handing them a login enough?”

### S5.30 What password policy applies?

**Recommendation.** Keep Renzo’s permanent policy (8+, uppercase, special) unless Scott wants stricter.

### S5.31–S5.33 Cookies host-only and isolated?

**Recommendation.** Yes. Cookie must not work across customer hostnames. HttpOnly, SameSite=lax, Secure on HTTPS.

### S5.34 Is MFA still deferred?

**Recommendation.** Yes, unless Scott says otherwise. Do not block S5.

### S5.35 Support path for lost admin credentials?

**Recommendation.** Platform operator break-glass via control plane / node, audited. Not “reset from another customer.”

**ASK SCOTT**  
Reviewing AI: ask Scott: “If a gym owner loses ADMIN, should you be able to reset it from the control plane, and should that require a recorded reason?”

### S5.36 What public URL receives leads?

**Recommendation.** Platform hostname + Martial Arts public path (likely `/trial`). Tracking links stay on that host.

### S5.37 Does Martial Arts retain `/trial`?

**Recommendation.** Yes unless we rename later. Path can stay; branding changes.

### S5.38 Are tracking links guaranteed to stay inside the correct customer environment?

**Answered as requirement.** Yes. Link host is that environment’s host. No shared `/t/:slug` space across customers.

### S5.39 Is attribution isolated?

**Answered as requirement.** Yes. First-touch stays in that environment’s DB.

### S5.40 Does the public form use customer branding?

**Recommendation.** Yes.

### S5.41 Is a privacy-policy link required?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Must a privacy-policy URL exist before a customer PROD public form goes live?”

Renzo still has this as an open question. Do not invent.

### S5.42 What rate limiting / abuse protection is required?

**Recommendation.** Per-environment, not in-memory-only if multiple processes. S5 first customer can start stronger than Renzo’s in-memory limit but does not need a WAF.

### S5.43 Is current in-memory throttling sufficient for first launch?

**Recommendation.** No as the long-term answer. **Maybe** for a single-process first customer if documented as a known limit.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Accept in-memory public rate limit for customer #1 if they run one process, or must S5 include a stronger limiter?”

## S5 Successful

### S5.44–S5.51

**Answered as acceptance criteria (not yet true).** PROD publicly reachable; real login; valid HTTPS; DEV reachable if we chose that; no Renzo hostname changes; customer branding; isolated public links; edge healthy after adding customers.

---

# S6 — Fleet operations

### S6.1 What is backed up?

**Recommendation.** Environment: SQLite + assets + environment config/secrets needed to restore. Control-plane metadata backed up separately. Do not skip secrets if restore would be unusable.

### S6.2 How often are PROD and DEV backed up?

**Recommendation.** PROD daily at minimum (Renzo’s 02:00 Denver is evidence, not the law). DEV manual or less frequent.

**ASK SCOTT**  
Reviewing AI: ask Scott: “PROD daily and DEV weekly/manual — OK for first paid customer?”

### S6.3 Are optional environments backed up?

**Recommendation.** Manual unless marked important.

### S6.4 Where are same-host backups stored?

**Recommendation.** Outside live volumes, per environment, like Renzo `data/backups/{env}` but named by customer+env id.

### S6.5 Where are off-host backups stored?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Where should off-host copies go for S6/S8 (external disk, another machine, S3/B2, something else)?”

Same-host-only is **not** enough for paid-customer Successful.

### S6.6 What retention applies?

**Recommendation.** PROD 14 days same-host is a starting point (Renzo). Off-host retention separately.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Keep 14 days of PROD backups, or longer, before first paid customer?”

### S6.7 Are backups encrypted?

**Recommendation.** Off-host should be encrypted. Same-host encryption is desirable.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Require encryption for off-host backups before S8?”

### S6.8 Who can initiate / download / restore?

**Recommendation.** Platform operator only. Customer ADMIN restore inside their environment is a later product choice.

### S6.9 Is backup status visible in the control plane?

**Recommendation.** Yes for S6 Successful (last success, age, fail).

### S6.10 How is backup integrity verified?

**Recommendation.** Manifest + checksum (Renzo zip/sha256 pattern).

### S6.11 Is the format portable Pi → VPS?

**Recommendation.** Yes — that is a requirement of the package format.

### S6.12 Low disk / off-host replication failure?

**Recommendation.** Alert the platform operator. Do not prune the last good backup. Do not fail open into “no backups, still green.”

### S6.13 Can restore affect only one environment?

**Answered as requirement.** Yes.

### S6.14 Does restore stop the environment?

**Recommendation.** Yes, restore replaces files; process must be stopped or restarted after, like Renzo.

### S6.15 Is PROD → DEV restore/copy supported intentionally?

**Answered.** Yes. Explicit, confirmed.

### S6.16 Is DEV → PROD prohibited or heavily gated?

**Recommendation.** Heavily gated; default refuse. Never silent.

### S6.17 Is pre-restore backup automatic?

**Recommendation.** Yes, take a zip of current dest before overwrite.

### S6.18 How are restores routinely tested?

**Recommendation.** Periodic restore to DEV or a scratch env. At least once before S8 Successful.

### S6.19 What recovery-time expectation is acceptable?

**ASK SCOTT**  
Reviewing AI: ask Scott: “If PROD dies, what restore time are you willing to promise yourself (e.g. same day, 4 hours)? Do not promise the customer a tighter number than that.”

### S6.20 How is a new app version made available?

**Recommendation.** Publish an immutable image tag. Control plane lists available versions.

### S6.21 Does DEV receive it first?

**Answered.** Yes, that is DEV’s purpose.

### S6.22 What approves promotion to PROD?

**Recommendation.** Operator action after DEV healthy. Not automatic.

### S6.23 Per-customer or fleet-wide promotion?

**Recommendation.** Per environment / per customer. No forced fleet lockstep.

### S6.24 Can customers remain on different versions?

**Recommendation.** Yes.

### S6.25 How long?

**ASK SCOTT**  
Reviewing AI: ask Scott: “How long may a customer stay on an old version — weeks, until it hurts, or you always push everyone within N days?”

### S6.26 How are migrations handled?

**Recommendation.** On container start, as now. Failed migrate → environment Unhealthy, volumes intact.

### S6.27 What happens if migration/startup fails?

**Recommendation.** Do not destroy volumes. Operator rolls back image or restores pre-upgrade backup.

### S6.28 Can previous image version be relaunched?

**Recommendation.** Yes, same volumes, if schema is compatible. If not, restore backup + old image.

### S6.29 Does app rollback require DB rollback?

**Recommendation.** Only if migrations are incompatible. Assume it might; pre-upgrade backup is mandatory.

### S6.30 Is a pre-upgrade backup mandatory?

**Recommendation.** Yes for PROD.

### S6.31 Can upgrades be one customer at a time?

**Answered.** Yes.

### S6.32 What health checks gate success?

**Recommendation.** Running + `/api/health` after migrate. Control plane marks Updating then Running/Healthy or Failed.

### S6.33 Is rollback automatic or operator-controlled initially?

**Recommendation.** Operator-controlled for first launch.

### S6.34 Which logs are exposed?

**Recommendation.** App/container logs first. Proxy/provision/backup later or as files on the node.

### S6.35 Is centralized log storage required before launch?

**Recommendation.** No. Node `docker logs` + documented access is enough if PII caution is written down.

### S6.36 What retention?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Log retention on the node — days? If no preference, reviewing AI should accept ‘Docker default + don’t promise customers log search.’”

### S6.37 How is PII protected in logs?

**Recommendation.** Do not log full phone/email/tokens. Existing Renzo audit already strips secret-like keys — keep that discipline.

### S6.38 Who can access logs?

**Recommendation.** Platform operator. Not other customers.

### S6.39 Which metrics matter?

**Recommendation.** Disk, backup age, cert expiry, version, health. CPU/memory/DB size useful on a Pi.

### S6.40 What alerts are required?

**Recommendation.** Health failed, backup failed, disk low, cert near expiry, node unreachable.

### S6.41 What should notify the platform operator?

**ASK SCOTT**  
Reviewing AI: ask Scott: “How do you want to be notified (email, text, something else) when PROD is down or backup fails?”

### S6.42 Define Stop, Suspend, Decommission.

**Recommendation.**

- **Stop:** process down, data kept, can start again.  
- **Suspend:** Stop plus “not expected to run” (billing/ops flag). Data kept.  
- **Decommission:** gated delete path; data retained until retention expires or export is done.

### S6.43 Is there a retention period before deletion?

**ASK SCOTT**  
Reviewing AI: ask Scott: “After you decommission a customer, how many days should we keep their data before it can be wiped?”

### S6.44 What happens to backups after decommission?

**Recommendation.** Keep until retention ends, then delete with the data.

### S6.45 Is data export supported?

**Recommendation.** Yes before wipe. Minimum: the backup zip given to the customer.

### S6.46 Can environments be cloned?

**Recommendation.** Not required for S6 Successful. Copy-down covers the needed case.

### S6.47 Can PROD be cloned / copied down to DEV?

**Answered.** Yes, explicit.

### S6.48 Can an environment move between nodes?

**Recommendation.** Yes in the model. Procedure is S6 documentation, may be manual for first launch.

### S6.49 What is the migration procedure?

**Recommendation.** Backup → restore on dest node → cut DNS → verify health → decommission old process (not volumes until confirmed). Details when S6 is implemented.

### S6.50 How is node health monitored?

**Recommendation.** Control plane reachability check + ability to query Docker/health.

### S6.51 What happens if Pi/VPS goes offline?

**Recommendation.** All environments on that node Unknown. Operator restores elsewhere if the node is dead (needs off-host backup).

### S6.52 Can environments be restored on another node?

**Recommendation.** Yes if off-host backup exists. That is why S6 Successful requires off-host.

### S6.53 How does control plane distinguish node failure from app failure?

**Answered.** Node unreachable vs node up + that environment Unhealthy.

### S6.54 What is the minimum Hosting Node bootstrap contract?

**Recommendation.** Docker (or equivalent), ability to run the CRM image, persistent volumes, edge proxy, control-plane reachability, backup location.

### S6.55 How are node / runtime / proxy updates handled?

**Recommendation.** Documented maintenance window. Not automated in first launch.

## S6 Successful

### S6.56–S6.63

**Answered as acceptance criteria (not yet true).** One-customer backup/restore; off-host working; DEV then PROD promote; failed deploy recoverable; enough control-plane state; survive container recreate; node-loss recovery documented; safe enough for a paid customer.

---

# S7 — Owner dogfood path

### S7.1 What entity is the platform-owner customer?

**ASK SCOTT**  
Reviewing AI: ask Scott: “What business name should be the platform-owner CRM customer (the entity that sells the SaaS)?”

### S7.2 Is Strategic Insights the owner CRM customer?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Is Strategic Insights the owner CRM customer, or a different entity?”

Do not assume yes.

### S7.3 Is Renzo a separate design-partner customer?

**Superseded (2026-09-09).** Real Renzo is **not** a SaaS customer or design-partner tenant. It stays an external reference implementation. See [[SaaS-Decisions#2026-09-09 — Real Renzo CRM is external evidence, not a SaaS customer]].

### S7.4 What template does the owner's CRM use?

**Recommendation.** Martial Arts template if the owner is selling like an academy; otherwise we may need a thinner “generic lead” template.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Will you sell the SaaS using the Martial Arts CRM (Trial-shaped), or do you need a generic ‘demo/consult’ workflow for SaaS prospects?”

### S7.5 Is a generic sales/lead template required?

**ASK SCOTT**  
Depends on S7.4. Reviewing AI: if Scott says he will book demos not trials, ask whether S7 must add a generic acquisition workflow or he will misuse Trial as “demo” temporarily.

### S7.6 Can owner sales operate without a special fork?

**Answered as requirement.** Yes. That is S7 Successful.

### S7.7 What acquisition milestone represents a SaaS opportunity?

**ASK SCOTT**  
Reviewing AI: ask Scott: “What is the SaaS equivalent of a booked trial — demo, consult, proposal, or signed agreement?”

### S7.8 Does this expose a missing generic acquisition-workflow capability?

**Recommendation.** Likely yes if the owner’s motion is not “book an intro class.” Record the gap; do not silently fork.

### S7.9 Same identity across control plane and CRM, or separate sessions?

**Recommendation.** Separate sessions. Platform operator vs CRM user.

### S7.10 Should control-plane privilege grant CRM ADMIN automatically?

**Answered.** No.

### S7.11 Must platform privilege remain separate from external customer access?

**Answered.** Yes.

### S7.12 What is the break-glass / support access model?

**Recommendation.** Audited control-plane or node access into a customer environment. Time-bounded if we can.

### S7.13 Is customer consent / audit required for support access?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Before you log into a paying customer’s CRM, do you want a written consent step, or is an internal audit log enough for S8?”

### S7.14 Where do SaaS marketing links live?

**Recommendation.** Owner CRM campaigns + tracking links on the owner PROD public host.

### S7.15 What public form receives a SaaS prospect?

**Recommendation.** Owner environment’s public form (Martial Arts `/trial` or a generic form if S7.4 requires it).

### S7.16 What Lead shape is used?

**Recommendation.** Same Lead/prospect records as the template. Do not invent a second CRM.

### S7.17 What follow-up workflow is used?

**Recommendation.** Existing FollowUpTask (phone call) unless Scott chooses another purpose.

### S7.18 Is a demo the SaaS equivalent of a Trial?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Should a SaaS demo be stored as a Trial, or as a different acquisition object?”

### S7.19 Can Campaign attribution track SaaS acquisition?

**Recommendation.** Yes, that is the point of dogfooding tracking links.

### S7.20 Can Content / Assets / Marketing Tasks manage SaaS marketing?

**Recommendation.** Yes, in the owner CRM.

### S7.21 What outcome is recorded when a customer agrees?

**Recommendation.** An explicit outcome (agreement / won) on the prospect — not silent provision.

**ASK SCOTT**  
Reviewing AI: ask Scott: “What status do you want when they say yes — a Conversion-like ‘JOINED’, a custom ‘WON’, or just a note?”

### S7.22 Does that outcome ever trigger provisioning?

**Recommendation.** No automatic trigger.

### S7.23 Should provisioning remain a separate operator action?

**Answered.** Yes (sales-led).

### S7.24–S7.28 No-special-fork validation

**Answered as requirements.** Owner CRM uses the same environment model; PROD+DEV; own DB/assets/secrets; no `platformOwner` business-logic branches; can move nodes like any other customer.

## S7 Successful

### S7.29–S7.33

**Answered as acceptance criteria (not yet true).** Normal owner CRM; separate control-plane access; tracking → form → Lead → follow-up; not a fork; gaps recorded before S8.

---

# S8 — First external martial-arts customer live

### S8.1 What qualifies as the first external customer?

**Recommendation.** A real academy that is not Renzo Gracie Kaysville, not a Scott lab slug, running production acquisition.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Who is the intended first external academy, or what test makes someone ‘real enough’ if you do not have a name yet?”

### S8.2 Single-location only?

**Recommendation.** Yes for S8.

### S8.3 Which martial-arts disciplines are acceptable?

**Recommendation.** Any that fit the Martial Arts template (BJJ-like programs). Do not require Renzo affiliation.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Any discipline you will not take as customer #1 (e.g. only BJJ)?”

### S8.4 Who is buyer / admin / daily user?

**ASK SCOTT**  
Reviewing AI: ask Scott: “For a typical academy, who pays, who is ADMIN, and who works leads day to day?”

### S8.5 How will they pay initially?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Invoice, contract, cash, or something else for customer #1?”

### S8.6 Is Stripe deferred?

**Recommendation.** Yes unless Scott wants it for S8.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Confirm Stripe is not required for launched?”

### S8.7 Monthly / setup fee?

**ASK SCOTT**  
Reviewing AI: ask Scott: “What will you charge (setup + monthly), even as a working number?”

### S8.8 Are PROD + DEV included?

**Answered.** Yes, by default policy.

### S8.9 Are extra environments billable?

**ASK SCOTT**  
Reviewing AI: ask Scott: “If they want a third environment, do you charge extra, and starting when?”

### S8.10 Is hosting included?

**Recommendation.** Yes for S8 (you host on Pi or VPS).

**ASK SCOTT**  
Reviewing AI: ask Scott: “Is hosting included in the fee, or billed separately?”

### S8.11 Is support included?

**ASK SCOTT**  
Reviewing AI: ask Scott: “What support is included (hours, channel)?”

### S8.12 What does the agreement promise?

**ASK SCOTT**  
Reviewing AI: ask Scott: “What will you put in writing: software access, backups, support window — and what will you refuse to promise?”

### S8.13 What uptime / support promises should not be made yet?

**Recommendation.** No 99.9% SLA. No 15-minute response. Pi/home-WAN is not that product.

### S8.14 Who owns data?

**Recommendation.** The customer owns their CRM data. You hold it as processor/host.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Confirm: the academy owns their leads/data; you host it; they can export on cancel?”

### S8.15 What happens on cancellation / data export?

**Recommendation.** Export the backup zip; retain per S6 retention; then wipe.

### S8.16–S8.25 Onboarding data

**Recommendation.** Required: business/branding name, timezone, at least one ADMIN. Programs/prices/intro/sources/staff as onboarding work, not code. Meta optional. Privacy URL — see S5.41.

**ASK SCOTT**  
Reviewing AI: ask Scott: “Who approves the public form and who signs off PROD go-live — you, them, or both?”

### S8.26 Who approves public form?

**ASK SCOTT** (same as above)

### S8.27 Who tests DEV?

**Recommendation.** Platform operator + customer staff if available.

### S8.28 Who approves PROD?

**ASK SCOTT**

### S8.29–S8.40 Operational readiness

**Answered as S8 checklist.** All must be yes before Successful: visible healthy PROD/DEV; local + off-host backup; restore tested; version known; relaunch works; DEV upgrade path; HTTPS + renewal; public acquisition up; real credentials; no `setup`; enough monitoring; incident notes exist.

### S8.41–S8.50 Product validation

**Answered as S8 checklist.** They can run Campaigns, tracking links, public form, attribution, Leads, MA workflow, follow-up, Trials, outcomes, reports for leads/booked trials.

### S8.51 Is Renzo branding absent?

**Answered as requirement.** Yes.

### S8.52 Are Renzo-specific programs/prices absent?

**Answered as requirement.** Yes, unless that academy chose the same numbers themselves.

### S8.53 Are customer changes configuration rather than forks?

**Answered as requirement.** Yes.

### S8.54 Did onboarding require code changes?

**Unknown until it happens.** If yes → S8.55.

### S8.55 If yes, promote to template or Platform?

**Answered as process.** Use the promotion path. Default not “fork for them.”

### S8.56 Can the same procedure onboard customer #3?

**Answered as requirement.** Yes for Successful.

### S8.57 What privacy policy applies to public forms?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Whose privacy policy is on the public form — yours (platform), theirs (academy), or both?”

### S8.58 What SaaS terms are required?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Do you have (or need) SaaS terms before charging customer #1?”

### S8.59 Who owns consent language?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Who writes SMS/email consent copy — platform default they can edit, or they supply all of it?”

### S8.60 How are customer backups protected?

**Recommendation.** Access-controlled off-host store, encrypted if Scott said yes in S6.7. Not in public Git.

### S8.61 What is the support escalation path?

**ASK SCOTT**  
Reviewing AI: ask Scott: “If their PROD is down, who do they contact, and who is backup if you are unavailable?”

### S8.62 What constitutes an outage?

**Recommendation.** PROD Healthy is false or public form/login unreachable, not DEV issues.

### S8.63 What response expectation is promised?

**ASK SCOTT**  
Reviewing AI: ask Scott: “What response time will you actually say out loud (e.g. same business day)?”

### S8.64 Is Pi hosting acceptable for the first paid customer?

**ASK SCOTT**  
Reviewing AI: ask Scott: “Are you willing to host paying customer #1 on the Raspberry Pi, knowing WAN/IP and single-node risk?”

### S8.65 If yes, what triggers VPS migration?

**ASK SCOTT**  
Reviewing AI: ask Scott: “What would make you move them off the Pi (second paid customer, an outage, disk, or a date)?”

### S8.66 What is the rollback / exit plan after a severe launch issue?

**Recommendation.** Restore last good backup; roll image to last good version; if unrecoverable, export data and stop billing. Written in S6/S8 runbook.

## S8 Successful

### S8.67–S8.78

**Answered as launch definition (not yet true).** Non-Renzo academy; isolated env; public; secure login; off-host backup; visible/operable in control plane; relaunchable; DEV-before-PROD; fresh DB; no fork; commercially offerable; repeatable; matches [[SaaS-Milestones]] **launched**.

---

# After S8 — deferred

Do not answer these as if S8 depended on them. Do not design Beauty, self-service, full Meta, multi-location, or VPS-at-scale here.

If a reviewing AI is in an After-S8 conversation, **ASK SCOTT** whether that work is authorized before asking the detailed questions in the source file.

---

# Questions the reviewing AI must ask Scott

Collect these in one pass. Do **not** ask all at once in a giant interview. Use [[SaaS-Milestones]] order: finish S1 asks first.

## S1 (ask now)

1. Confirm exactly one PROD per customer is a hard invariant.  
2. **Answered (2026-09-09).** Default is PROD+DEV. Extra non-PROD: capability now; operator add in S6; paid request in S8. Not in S4 Successful.  
3. Which customer settings may be overridden per environment?  
4. Do customer-level config changes apply automatically or via explicit apply/promote?  
5. Any integration credentials that should be customer-wide rather than per environment?

## S0 / process (can wait until convenient)

6. Manual backport to Renzo for now, or a formal process before S8?

## S2 (answered 2026-09-09)

7–14 answered. See [[SaaS-Decisions#2026-09-09 — Martial Arts template product defaults (S2 closeout)]].

## S3 (answered 2026-09-09; do not implement until Scott asks)

15–18 answered. See [[SaaS-Decisions#2026-09-09 — S3 v1 owner decisions]].

## S4+ (do not ask until that milestone)

See ASK SCOTT items under S4–S8 above (image registry, secrets store, platform domain, DNS provider, hostname pattern, privacy policy, payment, owner entity, Pi for paid customer, notifications, retention, SLAs).

---

# Suggested next action

1. Reviewing AI asks Scott the **S1** questions only.  
2. Promote answers into `Customer-Environment.md` and [[SaaS-Decisions]].  
3. Mark [[SaaS-Milestones]] S1 Successful.  
4. Stop. Do not start S2 implementation until Scott asks.
