---
type: reference
status: current
area: process
updated: 2026-09-08
aliases:
  - How we work
  - Vault vs wip
tags:
  - saas
  - process
---

# Working agreement

This workspace is the SaaS productization effort. Renzo CRM is the first customer implementation, design partner, and proving ground. The two tracks share this vault. They are not one mixed project.

## Two tracks

| Track | What it is | How we work |
|---|---|---|
| **CRM fine-tuning** | Improve the existing acquisition app | Evidence-driven. Default: Renzo-only unless we promote the change. |
| **Platform expansion** | Control plane, customer environments, provisioning | Decision-first. No implementation until Scott asks. |

Do not refactor the CRM into multi-tenant SaaS in order to “get ready.” Do not treat a CRM UX fix as a platform architecture change.

When a CRM change appears, classify it:

```text
Renzo-only
→ martial-arts template?
→ platform-generic?
```

Default is **Renzo-only**. Promotion is an explicit decision, recorded in [[SaaS-Decisions]].

## Vault vs wip

`crm_saas_vault` is **the vault**. Scott and Cursor communicate in Markdown here.

| Place | Role |
|---|---|
| Durable notes at the vault root | Settled map: decisions, architecture, current understanding |
| [[wip/_index\|wip/]] | Direct communication: prompts, discussion, drafts |
| `wip/archive/` | Processed sources. Evidence, not the map |

Chat is not the record. After a conversation settles something, promote it into a durable note and leave the `wip` file as evidence. Do not delete `wip` after incorporating it.

Renzo customer notes (`Domain-Model`, `Architecture`, `Implementation-State`, [[Decisions]], and the rest) stay **evidence**. Do not rewrite them into SaaS docs. SaaS decisions live in [[SaaS-Decisions]], not in the Renzo ADR log.

## Confidence labels

Preserve these in SaaS notes. Do not turn inference into fact.

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

## How we decide

1. Use [[wip/SaaS_Project_Alignment_and_Current_Understanding]] plus the create-handoff prompt as context.
2. Before asking Scott a question, check whether a note or prior decision already answers it.
3. Ask only unresolved questions.
4. Work major decisions **one at a time**.
5. Distinguish product decisions, architecture decisions, and implementation decisions.
6. Challenge assumptions.
7. Do not begin platform implementation until Scott explicitly asks.

## Current next decision

The control-plane v1 scope is recorded. Next product/architecture decision: define the **customer-environment unit** — what pieces must exist for an environment to be observed and relaunched. See [[Control-Plane]] and [[SaaS-Decisions]].

**Local Git:** this workspace is its own repo at `C:\Users\Scoy9\Projects\crm_marketing_saas` (`main`, no remotes, not `renzo-crm`). Hosted remote still open on [[SaaS-ToDo]].

Do not open a broad repository audit until that decision needs targeted evidence (Docker, volumes, health, env, backup).

## What we do not do next

- Build the control-plane application
- Write Compose templates or provisioners
- Add `tenant_id` to the CRM
- Start Stripe, self-service signup, or a beauty-variant design
- Touch Koi-Pi PRODUCTION SQLite
- Start unstarted Renzo milestones unless Scott asks

Related: [[Conventions]], [[Home]], [[wip/Control_Plane_v1_and_Working_Agreement_2026-09-08]].
