---
type: decision
status: current
area: process
updated: 2026-09-08
tags:
  - adr
  - saas
---

# SaaS decisions

Lightweight ADR log for the **SaaS / platform** workstream only. Newest first. Do not relitigate here — add a new entry if something changes.

Renzo customer-implementation ADRs stay in [[Decisions]]. “Accepted for Renzo” is not “accepted for the platform.”

Template:

```markdown
## YYYY-MM-DD — Short title
Status: accepted | working decision | superseded
Context: one or two sentences
Decision: what we chose
```

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

Decision: The platform sequence is [[SaaS-Milestones]] S0–S8. **Successful** is the acceptance name. “Launched” is S8: first external martial-arts customer live, sales-led. This map does not authorize implementation. S0 and S1 are Successful. Next implementation milestone is S2, only when Scott asks.

Source: 2026-09-08 conversation; [[SaaS-Milestones]]

---

## 2026-09-08 — This workspace gets its own Git repo, not renzo-crm

Status: working decision (execution pending)

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

Source: [[Control-Plane]], [[Working-Agreement]], [[wip/SaaS_Project_Alignment_and_Current_Understanding]], [[wip/Control_Plane_v1_and_Working_Agreement_2026-09-08]]

---

## 2026-09-08 — Renzo production and SaaS productization stay separate tracks

Status: working decision

Context: The copied Renzo codebase is evidence and a design partner, not automatically the SaaS architecture. Live academy data already exists on Koi-Pi.

Decision: Keep CRM fine-tuning and platform expansion as separate tracks in this vault. Do not convert Renzo PRODUCTION into a multi-tenant app. Do not invent answers to Renzo [[Open-Questions]]. Platform work records decisions here; Renzo ADRs stay in [[Decisions]].

Source: [[Working-Agreement]], [[wip/SaaS_Project_Alignment_and_Current_Understanding]]
