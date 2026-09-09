---
type: note
status: current
area: process
updated: 2026-09-09
aliases:
  - SaaS tasks
tags:
  - saas
  - todo
---

# SaaS to-do


Platform / productization tasks only. Historical Renzo gym checkboxes stay in [[Milestones]] and [[Open-Questions]] and still aggregate on [[ToDo]]. Real Renzo is not a SaaS customer.

Do not treat a box here as permission to implement. Decision-first: [[Working-Agreement]]. Sequence and **Successful** criteria: [[SaaS-Milestones]].

## Sooner

- [x] **Give this workspace its own Git repository (local).** `git init -b main` at `C:\Users\Scoy9\Projects\crm_marketing_saas` on 2026-09-08. There was no existing `.git` and no remotes — nothing to detach from `renzo-crm`. Fresh history (no Renzo commits imported). No GitHub/Cursor remote yet.
- [x] **Add a hosted remote.** `origin` is https://github.com/Koifish95/crm_marketing_saas.git . `main` pushed 2026-09-08. Not `renzo-crm`.
- [x] **S1** — Customer-environment unit recorded. [[Customer-Environment]]. **Successful.**
- [x] **S2** — Hand-boot a second martial-arts environment. [[S2-Hand-Boot-Checklist]]. Docker + named lab volumes. **Successful** (2026-09-09).

## Later / not started

- [ ] **S3** — Control-plane v1 (decisions recorded 2026-09-09; implement only when Scott asks)
- [ ] **S4–S8** — Provision, access, ops, dogfood, first external customer (see [[SaaS-Milestones]])
