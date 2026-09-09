---
type: note
status: current
area: process
updated: 2026-09-08
tags:
  - wip
  - saas
---

# WIP — Control plane v1 and working agreement

Direct Scott ↔ Cursor communication for 2026-09-08. Durable outcomes were promoted to [[Working-Agreement]], [[SaaS-Decisions]], and [[Control-Plane]]. This file stays as evidence.

## What Scott asked

1. Follow the SaaS alignment instructions; put the alignment output in wip. Later: the vault folder is `crm_saas_vault`.
2. Discuss a platform control module on top of CRM apps that spin up in Docker: see which customers have which containers, up/down, relaunch.
3. He agreed with the recommendations and will lean on them. CRM fine-tuning will continue in parallel. General documentation goes in the vault; direct communication goes in `wip`. How should we begin?

## What we settled

- Separate control application above customer CRMs. Not a Settings page. Not the owner’s CRM.
- Manage **customer environments**, not raw containers.
- v1 = inventory + health + relaunch only. Health = container running **and** `/api/health`.
- Create/provision is later. Restart must not destroy volumes.
- Two tracks: CRM fine-tuning vs platform expansion. Default CRM changes are Renzo-only until promoted.
- Chat is not the record. Promote decisions out of `wip`.
- Do not implement the control plane until Scott asks.

## What we recorded

| Durable note | Role |
|---|---|
| [[Working-Agreement]] | Two tracks, vault vs wip, how we decide |
| [[SaaS-Decisions]] | SaaS ADR log (kept separate from Renzo [[Decisions]]) |
| [[Control-Plane]] | What the control app is and is not |
| [[Home]] | SaaS workspace index; Renzo notes remain evidence |

## Later in the same session

Scott: disconnect Git from `renzo_crm` and create a new repo; add to to-dos, sooner rather than later.

Recorded as a working decision (execution pending) in [[SaaS-Decisions]] and as the first sooner item on [[SaaS-ToDo]]. This folder currently has no `.git`. History keep-vs-fresh is still open.

## Next

- Local Git: done 2026-09-08 (`git init -b main` here; no remotes). Hosted remote still open.
- Next architecture decision: the **customer-environment unit**. Discuss in a new `wip` note. Do not implement.

Related: [[wip/SaaS_Project_Alignment_and_Current_Understanding]], [[wip/Cursor_SaaS_Project_Alignment_Instructions_2026-09-08]].
