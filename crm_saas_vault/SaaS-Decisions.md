---
type: decision
status: current
area: process
updated: 2026-09-09
tags:
  - adr
  - saas
---

# SaaS decisions

Lightweight ADR log for the **SaaS / platform** workstream only. Newest first. Do not relitigate here — add a new entry if something changes.

Renzo customer-implementation ADRs stay in [[Decisions]] as **historical evidence**. “Accepted for Renzo” is not “accepted for the platform.” Real Renzo is not a SaaS customer.

Template:

```markdown
## YYYY-MM-DD — Short title
Status: accepted | working decision | superseded
Context: one or two sentences
Decision: what we chose
```

---

## 2026-09-09 — Post-S4 ten decisions (launch, laptop, extras)

Status: accepted

Context: Scott answered the high-leverage post-S4 forks. Full text: [[wip/Post_S4_Ten_Decisions]]. Prompt: [[wip/S5_And_Beyond_Cursor_Prompt]].

Decision:

- Strategic Insights laptop data is **test data** until the first customer is provisioned on a VPS. Then data must be persisted and safe. Do not start backup work before that cutover.
- Stay on laptop/desktop until launch; then a dedicated VPS (provider TBD). The control plane stays local until that move. Not Pi-first.
- Operator login is required before the control plane is reachable off localhost. Until then: loopback, no auth.
- Exactly **one PROD** per customer, API-enforced now.
- Extra **non-PROD** environments are operator-productized now (no billing, no hostname). This accelerates the old “S6 extras” line in [[#2026-09-09 — S4 owner decisions (password, form, image, secrets, extras)]].
- Decommission/archive is in-scope before VPS launch. It is not Stop. Never `docker compose down -v`.
- Combined status **Missing** is distinct from Stopped.
- Slug is not editable until DNS. Other customer fields stay read-only until a later answer.
- Sister business remains the second real pilot. Do not build Beauty in this slice.
- **Launch** means the first customer on the VPS.
- Retry continue-vs-rebuild, volume auto-delete (default never), and product domain/hostnames remain unset.

Source: Scott 2026-09-09

---

## 2026-09-09 — S4 Successful: one form provisions a customer pair

Status: accepted

Context: Owner decisions were recorded before coding. The live laptop proof passed for Strategic Insights Consulting, LLC.

Decision: S4 is **Successful**. The control plane writes registry rows and gitignored env files, builds `martial-arts-acquisition:s4` locally, and `compose up`s a generic `docker-compose.provisioned.yml` with an absolute `--env-file` and `-p` project. Same slug resumes; volumes are not deleted. Evidence: [[wip/S4_closeout]]. Procedure: [[S4-Provision-Runbook]].

Source: 2026-09-09 implementation

---

## 2026-09-09 — S4 owner decisions (password, form, image, secrets, extras)

Status: accepted

Context: S3 is Successful. Scott answered the five questions that unblock S4 design. This does **not** authorize S4 implementation.

Decision:

- **Bootstrap login.** Every newly generated environment writes `admin` / `setup` and sets `mustChangePassword` on the ADMIN row. First login works; CRM use waits on `/account/password`. `setup` is not a compliant permanent password. Seed still throws if `NUXT_AUTH_PASSWORD` is missing. After they change it, the control plane does not store the new password. Break-glass: CRM ADMIN reset, or one-shot `NUXT_AUTH_RESET_PASSWORD` that restores `setup` **and** forces change again. Do not leave reset on. Do not publish an S5 hostname until that change is done. Existing Acme lab rows stay as they are (`mustChangePassword` false) unless Scott asks to flip them.
- **Provision form (mandatory).** Display name, slug, timezone, admin email. Industry template is Martial Arts (only template). Nothing else is required to hit Provision.
- **Images.** S4 uses a **local Docker build** on the laptop node only. Not Docker Hub. Not GHCR. Record the learning curve; pick a registry when a second machine (Pi / VPS) needs the same image (likely S6).
- **Secrets.** Per-environment `.env` on the node, gitignored, not in Git. Control plane stores references, not copies of live admin passwords or integration tokens.
- **Extra environments.** Default entitlement remains one PROD + one DEV. S4 provisions that pair only — no Add-environment button, no fee. Schema must not hard-code “only two forever.” Timing of extras and decommission is superseded by [[#2026-09-09 — Post-S4 ten decisions (launch, laptop, extras)]].

This supersedes “lab passwords do not force a change” in the S2 product-defaults ADR, for **new** generated environments. It also extends [[#2026-09-09 — Generated lab environments use admin / setup]]: `setup` remains the unwrap key, not the living SaaS password.

Source: Scott 2026-09-09

---

## 2026-09-09 — Generated lab environments use admin / setup

Status: accepted

Context: Scott wanted to log into every generated CRM without hunting per-env placeholders. Existing Acme lab volumes already had hashed `change-me-lab-acme-*-admin` passwords.

Decision:

- Generation path writes `NUXT_AUTH_USERNAME=admin` and `NUXT_AUTH_PASSWORD=setup` (lab env examples and lab Compose default `${NUXT_AUTH_PASSWORD:-setup}`).
- Seed still throws `BOOTSTRAP_PASSWORD_REQUIRED` if the password is missing. It does not invent `setup`.
- Existing lab DBs were one-shot reset with `NUXT_AUTH_RESET_PASSWORD=true`, then the flag returned to `false`. Reset re-hashes every user; do not leave it on.
- First-login force-change and S4 copy rules: [[#2026-09-09 — S4 owner decisions (password, form, image, secrets, extras)]].

Source: Scott 2026-09-09

---

## 2026-09-09 — S3 Successful: laptop control plane observes and relaunches lab-acme

Status: accepted

Context: S3 owner decisions were recorded before coding. The app now exists and the live laptop proof passed.

Decision: S3 is **Successful**. `control_plane/` is a separate Nuxt app on `127.0.0.1:52100` with its own SQLite registry. It lists Acme BJJ PROD/DEV as human headlines, combines container running with `/api/health`, and relaunches via `compose up -d --force-recreate --no-deps app`. No provision. No operator login. Procedure: [[S3-Control-Plane-Runbook]]. Evidence: [[wip/S3_closeout]].

Source: 2026-09-09 implementation; Scott confirmed Nuxt, seed-on-setup, port 52100

---

## 2026-09-09 — S3 v1 owner decisions

Status: accepted

Context: S2 is Successful. Scott recorded the four questions that unblock an S3 skeleton. This does **not** authorize S3 implementation.

Decision:

- The control plane lives in **this same GitHub repo** as a second app/folder (e.g. `control_plane/` next to `martial_arts_template/`). Not a new remote. Not inside a customer CRM.
- S3 proof is **laptop-only**.
- First node mechanism: **local Docker** on the operator laptop. No SSH, no agent. Customer CRM containers never receive a Docker socket.
- Health for S3 Successful is **on-demand** (page load / explicit refresh). A 30–60s poll is optional later, not required.

S3 Successful remains: human-readable environments, container running **and** `/api/health`, relaunch without `-v`. Not in S3: create/provision, domains, billing, ThePond replacement.

Source: Scott 2026-09-09; [[wip/answers]] S3.2, S3.3, S3.20, S3.28–S3.30

---

## 2026-09-09 — Martial Arts template product defaults (S2 closeout)

Status: accepted

Context: Remaining S2 ASK SCOTT items were answered so the template contract is explicit before S3.

Decision:

- Seed **Adult BJJ** and **Kids BJJ** active; **Striking** and **Wrestling** inactive extras. No Renzo prices. No Kaysville intro timetable (`intro-seed.ts` is a test fixture only).
- Public `/trial` (and the homepage booking card) is **hidden** until ADMIN publishes at least one enabled intro availability rule. Staff Settings still edit the timetable.
- Acquisition Events capability is **on**; no seeded events.
- Compensation stays **off** by default (0 bps). No 50% Scott ledger.
- `allowEarlyTrialOutcomes` defaults **ON**.
- Lab / operator-set ADMIN passwords do **not** force a change on **existing** Acme labs. **Superseded for new generated environments** by [[#2026-09-09 — S4 owner decisions (password, form, image, secrets, extras)]] (`admin` / `setup` + `mustChangePassword`).
- **USD only** through S8.
- **Household** is a Martial Arts template concept, not Platform core.

Source: Scott 2026-09-09; [[wip/answers]]

---

## 2026-09-09 — Real Renzo CRM is external evidence, not a SaaS customer

Status: accepted

Context: This repo was copied from work done for Renzo. Scott clarified the project boundary before S3.

Decision:

- The live gym implementation is `C:\Users\Scoy9\Projects\renzo_crm`. It stays separately maintained, hosted, and deployed. Do not add it as a remote, migrate it here, or manage its PROD/DEV/STAGE from this platform.
- Inside `crm_marketing_saas`, the copied code is the **Martial Arts template**. Renzo-specific runtime names may be generalized. This repo does not need backward compatibility with Renzo deploy names.
- “Protect Renzo” means do not touch the external project, Koi-Pi, or `webhosting_renzo_*`. It does not mean freeze copied strings in this repo.
- First intended real pilots: **Strategic Insights** and **Scott’s sister’s business**. Renzo is not a pilot and must not appear as a control-plane customer.
- Historical references (lessons, S2 evidence that used `renzo-acquisition:m10a`, warnings about `webhosting_renzo_*`) stay. Do not rewrite history.

Source: Scott 2026-09-09; [[Home]]; [[Working-Agreement]]

---

## 2026-09-09 — S2 Successful: Docker lab-acme coexistence

Status: accepted

Context: S2 proved a second martial-arts academy can run on the laptop without Renzo production resources.

Decision: S2 is **Successful**. Two Docker environments (`lab-acme-prod`, `lab-acme-dev`) with isolated named volumes, green `/api/health`, persist through recreate without `-v`, distinct ADMIN logins, `setup` rejected. Original proof image was `renzo-acquisition:m10a`. Current operator image is `martial-arts-acquisition:s2`. Procedure: [[S2-Hand-Boot-Checklist]]. Evidence: [[wip/archive/S2_Docker_Coexist_Evidence]].

Source: 2026-09-09 acceptance; later closeout naming

---

## 2026-09-08 — S1 customer environment unit

Status: accepted

Context: S1 discovery questions in [[wip/answers]] were resolved. Scott accepted the remaining S1 answers as hard decisions. This records the environment unit so [[Control-Plane]] v1 has a concrete object to list and relaunch.

Decision:

- Durable model: [[Customer-Environment]].
- Exactly one environment with Type `PROD` per Customer (hard invariant). Multiple non-PROD environments are allowed.
- Default entitlement: one PROD + one DEV. Architecture must support additional non-PROD types/names (`DEV-JOHN`, `STAGE`, `UAT`, `TRAINING`, …) from the start. Capability ≠ entitlement. Do not design billing in S1.
- Customer config supplies defaults; environments may set explicit permitted overrides. Later customer-level changes must not silently overwrite those overrides. Sync mechanics are a later milestone.
- Integration credentials are environment-specific by default. PROD secrets do not flow into other environments. Sharing would be a future deliberate capability.
- `/api/health` stays minimal (process availability, readiness, database). Identity, placement, and version live on the control plane. Richer health/diagnostics may be added in S3/S6; this is not a permanent restriction.
- Preserve prior S1 baseline: customer owns branding/business config; environment owns runtime/secrets; independent SQLite + assets; explicit PROD→DEV copy-down only; no silent sync; no implicit DEV→PROD; one application process (initially one container; Docker not a permanent model requirement); stable IDs; changeable slugs/names; per-environment deployed version; Type ≠ display name; no sibling or cross-customer data access; Stop ≠ gated delete; Environment placed on a Hosting Node; node hosts zero or more environments; Pi→VPS portable model.

S1 is **Successful**. Do not begin S2 implementation from this decision.

Source: Scott 2026-09-08; [[wip/SaaS_S0-S8_Discovery_Questions_2026-09-08]]; [[wip/answers]]

---

## 2026-09-08 — SaaS launch path is S0–S8 with Successful acceptance

Status: working decision

Context: Scott asked for milestones from the current workspace to a fully launched SaaS, with deliverables named Successful, and decisions made along the way.

Decision: The platform sequence is [[SaaS-Milestones]] S0–S8. **Successful** is the acceptance name. “Launched” is S8: first external martial-arts customer live, sales-led. This map does not authorize implementation. S0, S1, and S2 are Successful. Next implementation milestone is S3, only when Scott asks.

Source: 2026-09-08 conversation; [[SaaS-Milestones]]

---

## 2026-09-08 — This workspace gets its own Git repo, not renzo-crm

Status: accepted

Context: The SaaS tree started as a snapshot/reference of Renzo. Accidental commits or pushes into `renzo-crm` would mix productization work into the live customer implementation. Scott asked to disconnect from `renzo_crm` and create a new repo, sooner rather than later.

Decision: This workspace must have an **independent Git repository and remote**. It must not use remote `renzo-crm` or treat `Projects/renzo_crm` as its origin. Execute before substantial SaaS commits.

Still unresolved when we execute: keep Renzo history, start fresh, or import a shallow snapshot. Do not `git init` at `C:\Users\Scoy9\Projects`. Do not force-push Renzo `working` / `main`.

Executed 2026-09-08: `git init -b main` in `C:\Users\Scoy9\Projects\crm_marketing_saas`. Confirmed no prior `.git`. Fresh history. Root `.gitignore` added so `.env`, sqlite, uploads, backups, and Obsidian local state stay out. Hosted remote: `origin` → https://github.com/Koifish95/crm_marketing_saas.git (`main` pushed).

Task: [[SaaS-ToDo]]

---

## 2026-09-08 — Control plane v1 is a separate app: inventory, health, relaunch

Status: working decision

Context: Scott wants a platform layer above individually containerized CRM environments so he can see which customers have which environments, whether they are up or down, and relaunch them. He is new to this expansion step and accepted the alignment recommendations. CRM fine-tuning will continue in parallel.

Decision:

- A **separate platform control application** sits above customer CRMs. It is not a page inside any customer CRM, including the platform owner's.
- The object it manages is a **customer environment**, not a raw Docker container. A container is how the environment runs.
- **v1 scope** is observe and relaunch only: which customers exist, which environment(s) they have, up/down, restart. Health is both “the container is running” and `GET /api/health` (app + database reachable).
- **Create / provision** of new customer environments is out of v1. Spin up and relaunch are different jobs.
- Restart / relaunch must recreate the process and remount the same durable data. It must not destroy volumes (`down -v`, volume prune, copying sqlite onto a live volume).
- The platform owner's own business still receives a normal customer CRM environment. Control-plane privileges are separate.
- Billing, self-service signup, and a generic multi-tenant rewrite are not part of this decision.
- Where the control plane runs (Pi vs elsewhere) and whether it later absorbs ThePond’s Renzo ship button remain **unresolved**.

Rationale: prove the fleet-operations model with the smallest safe surface. Provisioning requires the customer-environment unit first.

Implications: next decision is the environment composition contract (what must exist to observe and relaunch). Do not implement the control app until Scott asks.

Source: [[Control-Plane]], [[Working-Agreement]], [[wip/archive/SaaS_Project_Alignment_and_Current_Understanding]], [[wip/archive/Control_Plane_v1_and_Working_Agreement_2026-09-08]]

---

## 2026-09-08 — Renzo production and SaaS productization stay separate tracks

Status: working decision

Context: The copied Renzo codebase is evidence and a design partner, not automatically the SaaS architecture. Live academy data already exists on Koi-Pi.

Decision: Keep the Martial Arts template and platform expansion as separate tracks in this vault. Do not convert the external Renzo PRODUCTION into a multi-tenant app. Do not invent answers to Renzo [[Open-Questions]]. Platform work records decisions here; Renzo ADRs stay in [[Decisions]] as historical evidence. Superseded in part by [[#2026-09-09 — Real Renzo CRM is external evidence, not a SaaS customer]].

Source: [[Working-Agreement]], [[wip/archive/SaaS_Project_Alignment_and_Current_Understanding]]
