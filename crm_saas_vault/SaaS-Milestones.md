---
type: note
status: current
area: process
updated: 2026-09-11
aliases:
  - Platform milestones
  - Successful
tags:
  - saas
  - milestones
---

# SaaS milestones

Live **roadmap** for the platform. Official S-track (historically called Map B) plus a **separate C-track**. Do not mix S IDs with C IDs. Do not reuse an ID for a new meaning.

S-track law: [[SaaS-Decisions#2026-09-10 — Map B is the official post-S4 roadmap]]. Evidence: [[history/Post_S4_Foundation_Decision_Closeout]]. S5: [[history/S5_closeout]]. S6: [[history/S6_closeout]].

S0–S4 Successful bodies below are unchanged laptop proofs. From **S5 onward**, this sequence supersedes the 2026-09-08 hostname-first path. That older path is **only** in [[history/Map-A-Milestones]]. Do not rewrite S0–S4 closeouts as though this sequence existed then.

Renzo gym milestones stay in [[Milestones]] as historical evidence. Improving `martial_arts_template` runs in parallel and is not a launch gate unless we promote a change ([[Working-Agreement]]). Real Renzo is not a SaaS customer.

**Successful** is the official acceptance name. Code existing is not Successful.

**This note is not permission to start the next implementation.** Next ≠ authorized. Cursor implements only an active [[Work-Order-Protocol|work order]] or Scott’s explicit ask in the current chat.

## What “launched” means here

Two events, not one ([[SaaS-Decisions]]):

- **VPS cutover** — production hosting infrastructure exists (dedicated VPS; laptop/desktop stays the development environment until then).
- **Commercial launch** — the first real external customer is operational on that production VPS and has passed launch-readiness (reachable, backed up for production, on the control plane, relaunchable). That is Successful **S11**, not S5.

Still sales-led, martial arts first. Not Stripe-by-default, not every industry, not Beauty, not self-service signup.

Laptop Strategic Insights data remains disposable test data. Do not build fleet backup merely to protect those laptop volumes. Backup/recovery is designed around production hosting (official S6).

## Status (S-track)

| ID | Focus | Status |
|---|---|---|
| S0 | Workspace split | Successful |
| S1 | Environment unit | Successful |
| S2 | Second martial-arts environment by hand | Successful |
| S3 | Control plane v1 | Successful |
| S4 | Sales-led provision | Successful |
| S5 | Control Plane Productization / Operations Foundation | **Successful** (2026-09-10) |
| S6 | Fleet Reliability / Lifecycle | **Successful** (2026-09-11) |
| S7 | Hosting / Security / Remote Nodes | Not started |
| S8 | Public Exposure | Not started |
| S9 | Dogfood / Pilot Readiness | Not started |
| S10 | Second Pilot / Template Expansion | Not started |
| S11 | External Paying Customer Readiness | Not started — this is commercial launch |

```text
S0 Workspace split
→ S1 Environment unit
→ S2 Hand-boot second MA environment
→ S3 Control plane v1
→ S4 Sales-led provision
→ S5 Control Plane Productization / Operations Foundation
→ S6 Fleet Reliability / Lifecycle
→ S7 Hosting / Security / Remote Nodes
→ S8 Public Exposure
→ S9 Dogfood / Pilot Readiness
→ S10 Second Pilot / Template Expansion
→ S11 External Paying Customer Readiness
```

S0–S6 are Successful. Official S7 is not started. Evidence: [[history/S5_closeout]], [[history/S6_closeout]].

The Core ADR says product family locally **before** production VPS. That is C-track priority, not a silent rewrite of S7. State both.

## Status (C-track — architecture; separate IDs)

Not S-track. Do not call C2 “S7.” Do not call historical hostname work “S5.”

| ID | Focus | Status |
|---|---|---|
| C1 | CRM Core extraction (workspace, `@crm/core`, frameworks) | **Code-shipped** (2026-09-11). Evidence: [[history/C1_CRM_Core_Architecture_Return]] |
| C2A | Thin Sales consumer (local Core consumer; no CP catalog) | **Successful** (2026-09-11). Evidence: [[history/C2A_closeout]]. Not C2. |
| C2 | Sales vertical as second Core consumer + CP product catalog | Not started |
| C3 | Beauty vertical after Sales proves Core | Not started |
| D1 | Account vs Product Instance CP schema | **Accepted**, schema **not shipped** |
| D2–D4 | Keep MA leads / campaigns / public capture vertical-owned | **Accepted** (wait) |

C1 is not Map B Successful. C2A is **Successful** (not C2). C2 is not started and is **not** authorized by C2A closure. Plan narrative (not a license): [[history/CRM_Core_Extraction_Implementation_Plan]].

---

## S0 — Workspace split

Status: **Successful**

Git, vault, alignment, and control-plane *scope* (not the app).

**Successful:** This tree is its own repo (`https://github.com/Koifish95/crm_marketing_saas`), not `renzo-crm`. Renzo PRODUCTION is untouched. Two-track agreement exists.

Evidence: [[Working-Agreement]], [[SaaS-Decisions]], [[Control-Plane]], [[wip/archive/SaaS_Project_Alignment_and_Current_Understanding]].

---

## S1 — Environment unit

Status: **Successful** (2026-09-08)

What one Customer Environment is — the object the control plane will list, health-check, and relaunch.

**Successful:** Durable [[Customer-Environment]] records the unit, including: exactly one `PROD` per Customer; default PROD+DEV entitlement; additional non-PROD environments as capability (not billing); inheritance without silent override clobber; environment-specific credentials; minimal `/api/health`; prior S1 baseline preserved.

S2 boot details and S2 architecture were not decided here.

---

## S2 — Boot a second martial-arts environment by hand

Status: **Successful** (2026-09-09)

Prove the template is not “only Renzo.”

**Decide along the way:** What is required to boot an empty instance (admin user, empty vs seeded catalog, timezone, public form type). What stays Renzo-specific vs martial-arts template.

**Not in this milestone:** Control-plane UI. Automatic provision. Public hostname. Copying Renzo PRODUCTION data.

- [x] **S2 Successful:** A second martial-arts CRM runs in Docker on the laptop, isolated named volumes (`lab-acme-*-sqlite` / `lab-acme-*-assets`), own admin login (not `setup`), `GET /api/health` green, no shared SQLite with Renzo PRODUCTION. Repeatable via [[S2-Hand-Boot-Checklist]].

Evidence: [[history/S2_closeout]]. Original Docker proof: [[wip/archive/S2_Docker_Coexist_Evidence]] (image `renzo-acquisition:m10a`). Earlier host-process proof: [[wip/archive/S2_Sprint4_Coexist_Evidence]]. Current operator image: `martial-arts-acquisition:s2`.

---

## S3 — Control plane v1

Separate ops app. Scope: [[Control-Plane]].

**Recorded before coding:** Same repo, separate app folder; laptop-only; local Docker; on-demand health. Manual registration is enough. See [[SaaS-Decisions#2026-09-09 — S3 v1 owner decisions]].

**Not in this milestone:** Create/provision. Domains. Billing. ThePond replacement.

- [x] **S3 Successful:** Open the control app and see environments, up/down (container running **and** `/api/health`), and relaunch without destroying volumes. The list reads “Acme BJJ · PROD · healthy,” not a raw container id.

Status: **Successful** (2026-09-09). App: `control_plane/` at http://127.0.0.1:52100. Evidence: [[history/S3_closeout]]. Runbook: [[S3-Control-Plane-Runbook]]. S4 is not started.

---

## S4 — Sales-led provision

Operator creates a new environment on demand. Still not public self-serve.

**Recorded before coding:** Local Docker image on the laptop; per-env gitignored `.env`; provision form is name / slug / timezone / admin email; `admin` / `setup` + forced password change; S4 creates the default PROD+DEV pair only. See [[SaaS-Decisions#2026-09-09 — S4 owner decisions (password, form, image, secrets, extras)]].

**Decide along the way:** Compose project naming. Exact volume/network names (must include customer + environment ids; never `renzo-*`).

**Not in this milestone:** Customer self-signup. Vanity domains (S5). Extra environments UI (S6). Paid extras (S8). GHCR / Docker Hub.

- [x] **S4 Successful:** After a sales agreement, an operator (or a control-plane action) produces a new martial-arts environment that the control plane immediately shows as healthy. Doing it a second time does not require inventing a new procedure.

Status: **Successful** (2026-09-09). Live proof: Strategic Insights Consulting, LLC on 52200/52201. Evidence: [[history/S4_closeout]]. Runbook: [[S4-Provision-Runbook]]. “S5 is not started” in that closeout meant **historical hostname S5** at write time. Official S5 is control-plane productization (below). Historical hostname map: [[history/Map-A-Milestones]].

---

## S5 — Control Plane Productization / Operations Foundation

Official S5 (Map B). Operator can run the laptop fleet from a multi-page control plane. Not DNS. Not backups.

**Shipped:** shell (Dashboard, Customers, Environments, Hosting Nodes, Settings placeholder); counts + Needs Attention + missing; workspaces; provision at `/customers/new`; Refresh / Relaunch; extra non-PROD; gated decommission; one-PROD API; localhost `accessUrl`s; continue/resume Retry UI; unit/API tests. Evidence: [[wip/archive/S5_Control_Plane_Productization_Status]], [[history/S5_closeout]].

**Not in this milestone:** DNS/TLS, public hostnames, fleet backup, operator auth, VPS, Beauty, billing, server pagination.

- [x] **S5 Successful:** An operator can run the laptop fleet from that multi-page control plane with honest status (including missing), search/filter, Refresh/Relaunch, extra non-PROD, gated decommission, one-PROD enforcement, and continue/resume retry — accepted by a real browser pass on http://127.0.0.1:52100.

Status: **Successful** (2026-09-10). Owner pass: Scott. Display-name edit is allowed (IMM-03) but was **not** an S5 Successful gate.

---

## S6 — Fleet Reliability / Lifecycle

Production-oriented backup, restore, and upgrade. Extra non-PROD and gated decommission already shipped in S5 leftovers — they are **not** the remainder of this S6.

**Shipped:** environment Lifecycle tab; same-host zip; gated restore; off-host copy; Explorer reveal; backup-gated local upgrade; Start / Stop / bulk start-stop; running / success / conflict notices for Backup and Copy off-host. Runbook: [[S6-Fleet-Runbook]]. Evidence: [[history/S6_closeout]]. Status: [[history/S6_Implementation_Status]].

**Not in this milestone:** Perfect observability. Multi-region. Protecting disposable laptop SI volumes as if they were production. Image registry (S7).

- [x] **S6 Successful:** Backup and restore work for a customer environment without killing others, designed around **production** hosting. A CRM template update can ship to a non-Renzo environment and still show healthy. Off-host copy is required before a paying customer is safe.

Authorized 2026-09-10 ([[wip/archive/S6_Fleet_Reliability_Cursor_Prompt]]). Status: **Successful** (2026-09-11). Owner pass: Scott.

---

## S7 — Hosting / Security / Remote Nodes

Operator auth before the control plane leaves localhost. Image story for a second machine / VPS. Remote node communication. Not Pi-first.

**Not in this milestone:** Public customer hostnames (S8). Beauty template.

- [ ] **S7 Successful:** The control plane can leave loopback only with operator login. A second machine can run the same image without copying laptop sqlite. Laptop remains the development environment until VPS cutover.

---

## S8 — Public Exposure

Reachable customer access: hostname shape `{slug}.{product-domain}`, TLS, real (changed) password. Product domain is still unset. Do not invent a domain. Do not implement DNS/TLS yet.

**Not in this milestone:** Apex/www for Renzo. Cloudflare/Caddy locks from the Renzo hosting contract.

- [ ] **S8 Successful:** Customer staff can hit `{slug}.{product-domain}`, sign in with a real password, and run the CRM, without touching `app.renzogracieutah.com`.

---

## S9 — Dogfood / Pilot Readiness

Use the product to sell the product on durable (non-disposable) data.

- [ ] **S9 Successful:** The owner has a normal CRM environment **and** control-plane access. A tracking link → form → Lead → follow-up can represent a SaaS prospect. The owner CRM is not a special fork. SI is not treated as that durable CRM while it remains laptop test data.

---

## S10 — Second Pilot / Template Expansion

Sister business is the second real pilot. Beauty template is not started.

- [ ] **S10 Successful:** Second pilot is provisioned on the intended template (Beauty if she cannot wait on Martial Arts). Not a special fork.

---

## S11 — External Paying Customer Readiness

**Commercial launch.** First real external customer operational on the production VPS, launch-ready.

**Not in this milestone:** Self-service. Stripe required. Multi-location.

- [ ] **S11 Successful:** A real academy that is not Renzo Kaysville is running on the production VPS, reachable, backed up for production, visible on the control plane, and you could relaunch it. You did not copy Renzo’s database to create them.

---

## C1 — CRM Core extraction

Status: **Code-shipped** (2026-09-11). Not S-track Successful.

Workspace + `@crm/core` + brand/health/app-env + auth/RBAC/settings/shell frameworks. Martial Arts consumes Core. Control plane still Martial Arts-only. `martial_arts_template/` was not moved to `apps/`. Evidence: [[history/C1_CRM_Core_Architecture_Return]].

## C2A — Thin Sales consumer

Status: **Successful** (2026-09-11). Owner-accepted after Scott’s browser QA at http://localhost:5040. Not S-track. Not C2. C2A success does **not** authorize C2, SI Sales refinement, or Core promotion.

First local Sales CRM vertical consuming `@crm/core`, with Sales-owned CRM domain and **no** Control Plane product catalog. Path `sales_template/` (package `sales-crm`), local http://localhost:5040. SQLite `sales_template/data/app.sqlite`. Fresh Drizzle journal `0000_wide_cyclops`. Thin domain: Company / Sales Account, Contacts, Opportunities, provisional stages (`open` → `in_progress` → `won` | `lost`), Activities / Tasks, Won / Lost. Strategic Insights is the intended first real-world Sales customer and has **not** been migrated. Evidence: [[history/C2A_closeout]]. Work order (archived): [[wip/archive/WO-2026-09-11-sales-thin-slice]]. Implementation return: [[history/WO-2026-09-11-sales-thin-slice-return]].

## C2 — Sales as second Core consumer

Status: **Not started.** Not authorized.

Sales / Software vertical plus control-plane product catalog. Architecture law: [[ADR-CRM-Core-Vertical-Architecture]]. Narrative plan (not a license): [[history/CRM_Core_Extraction_Implementation_Plan]]. C2’s historical meaning is unchanged; C2A does not replace it.

## C3 — Beauty vertical

Status: **Not started.** After Sales proves Core. Sister-as-Beauty is a later business milestone (S10), not an architecture shortcut.

## After commercial launch (not required for Successful S11)

- Beauty / salon / esthetician variant if not already done in S10
- Self-service signup
- Native Meta publish / full funnel
- Multi-location
- Productized VPS migration path

---

## Historical maps

Superseded 2026-09-08 hostname-first S5–S8: [[history/Map-A-Milestones]]. Do not implement those IDs. Dual-S5 is **resolved**.

## Hard stops

- Do not start an unstarted milestone’s *implementation* unless an active work order (or Scott’s explicit ask in the current chat) names that ID.
- Do not invent answers to Renzo [[Open-Questions]].
- Do not touch Koi-Pi PRODUCTION SQLite.
- Do not treat this note as a substitute for [[SaaS-Decisions]].

Related: [[Current-State]], [[SaaS-ToDo]], [[Control-Plane]], [[Home]], [[Work-Order-Protocol]].
