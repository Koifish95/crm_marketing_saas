---
type: note
status: current
area: process
updated: 2026-09-10
aliases:
  - SaaS tasks
tags:
  - saas
  - todo
---

# SaaS to-do

Platform / productization tasks only. Historical Renzo gym checkboxes stay in [[Milestones]] and [[Open-Questions]] and still aggregate on [[ToDo]]. Real Renzo is not a SaaS customer.

Do not treat a box here as permission to implement. Decision-first: [[Working-Agreement]]. Sequence and **Successful** criteria: [[SaaS-Milestones]]. Map closeout: [[wip/Post_S4_Foundation_Decision_Closeout]]. S5 closeout: [[wip/S5_closeout]].

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

## Later / not started

- [ ] **S6** — Fleet Reliability / Lifecycle (production backup/upgrade). Do not start.
- [ ] **S7–S11** — Hosting/security, public exposure, dogfood, second pilot, commercial launch. [[SaaS-Milestones]].
