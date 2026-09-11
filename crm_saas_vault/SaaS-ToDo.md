---
type: note
status: current
area: process
updated: 2026-09-11
aliases:
  - SaaS tasks
tags:
  - saas
  - todo
---

# SaaS to-do

Platform / productization tasks only. Historical Renzo gym checkboxes stay in [[Milestones]] and [[Open-Questions]] and still aggregate on [[ToDo]]. Real Renzo is not a SaaS customer.

Do not treat a box here as permission to implement. Decision-first: [[Working-Agreement]]. Current state: [[wip/Current_State_and_Fresh_Agent_Handoff_2026-09-11]]. Sequence and **Successful** criteria: [[SaaS-Milestones]]. Map closeout: [[wip/Post_S4_Foundation_Decision_Closeout]]. S5 closeout: [[wip/S5_closeout]].

## Sooner

- [x] **Give this workspace its own Git repository (local).** `git init -b main` at `C:\Users\Scoy9\Projects\crm_marketing_saas` on 2026-09-08. There was no existing `.git` and no remotes — nothing to detach from `renzo-crm`. Fresh history (no Renzo commits imported). No GitHub/Cursor remote yet.
- [x] **Add a hosted remote.** `origin` is https://github.com/Koifish95/crm_marketing_saas.git . `main` pushed 2026-09-08. Not `renzo-crm`.
- [x] **S1** — Customer-environment unit recorded. [[Customer-Environment]]. **Successful.**
- [x] **S2** — Hand-boot a second martial-arts environment. [[S2-Hand-Boot-Checklist]]. Docker + named lab volumes. **Successful** (2026-09-09).
- [x] **S3** — Control-plane v1. [[S3-Control-Plane-Runbook]]. **Successful** (2026-09-09).
- [x] **S4** — Sales-led provision. **Successful** (2026-09-09). [[S4-Provision-Runbook]].
- [x] **Post-S4 leftovers (missing, one-PROD API, extra non-PROD, gated decommission, operator UI)** — Shipped on `working`.
- [x] **IMM-01–04** — Map B official; retry = continue/resume; display name may be edited; hostname shape `{slug}.{product-domain}` with domain unset. [[SaaS-Decisions#2026-09-10 — Map B is the official post-S4 roadmap]].

- [x] **S5** — Control Plane Productization / Operations Foundation. **Successful** (2026-09-10). Retry UI + owner browser/Docker pass. [[wip/S5_closeout]].

## Official S6 (in progress, not Successful)

- [ ] **S6 Successful** — Fleet Reliability / Lifecycle. Code shipped (`76d0f71`). Do not check until Scott’s browser/Docker pass (backup, restore, off-host copy to a real folder, upgrade). [[S6-Fleet-Runbook]].

## Architecture (C1 code-shipped)

- [x] **D1–D4** — Account vs product instance; wait on MA leads/campaigns/public capture. [[SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain]].
- [x] **C1 code-shipped** — Workspace + Core layer + frameworks. Sales not started. D1 CP schema unchanged. Do not mark Map B Successful. [[wip/C1_CRM_Core_Architecture_Return]].

## Later / not started

- [ ] **S7–S11** — Hosting/security, public exposure, dogfood, second pilot, commercial launch. Product family (Core / MA / Sales / Beauty) is intended **before** production VPS. [[SaaS-Milestones]] sequence not rewritten yet.
