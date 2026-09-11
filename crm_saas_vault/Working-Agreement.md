---
type: reference
status: current
area: process
updated: 2026-09-10
aliases:
  - How we work
  - Vault vs wip
tags:
  - saas
  - process
---

# Working agreement

This workspace is the SaaS productization effort. The Martial Arts template in this repo is the current product. The external `renzo_crm` project is historical evidence and a separately maintained gym implementation. The two tracks share this vault. They are not one mixed project.

Real Renzo is **not** a customer of this platform. It is not provisioned here, not in this Docker fleet, and not shown on the future control plane. First intended pilots are Strategic Insights and Scott’s sister’s business.

## Two tracks

| Track | What it is | How we work |
|---|---|---|
| **Martial Arts template** | Improve `martial_arts_template` as the generic industry product | Evidence-driven. Default: template change. |
| **Platform expansion** | Control plane, customer environments, provisioning | Decision-first. No implementation until Scott asks. |

Do not refactor the CRM into multi-tenant SaaS in order to “get ready.” Do not treat a CRM UX fix as a platform architecture change.

When a CRM change appears, classify it:

```text
template-only (this Martial Arts product)
→ platform-generic?
```

Promotion to platform-generic is an explicit decision, recorded in [[SaaS-Decisions]].

“Protect Renzo” means: do not touch the external `renzo_crm` project, Koi-Pi, or `webhosting_renzo_*`. Copied Renzo-derived artifacts **inside this repository** may be generalized.

## Vault vs wip

`crm_saas_vault` is **the vault**. Scott and Cursor communicate in Markdown here.

| Place | Role |
|---|---|
| Durable notes at the vault root | Settled map: decisions, architecture, current understanding |
| [[wip/_index\|wip/]] | Direct communication: prompts, discussion, drafts |
| `wip/archive/` | Processed sources. Evidence, not the map |

Chat is not the record. After a conversation settles something, promote it into a durable note and leave the `wip` file as evidence. Do not delete `wip` after incorporating it.

Renzo customer notes (`Domain-Model`, `Architecture`, `Implementation-State`, [[Decisions]], and the rest) stay **historical evidence**. Do not rewrite them into SaaS docs. SaaS decisions live in [[SaaS-Decisions]], not in the Renzo ADR log.

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

1. Use archived alignment ([[wip/archive/SaaS_Project_Alignment_and_Current_Understanding]]) plus current [[SaaS-Decisions]] as context.
2. Before asking Scott a question, check whether a note or prior decision already answers it.
3. Ask only unresolved questions.
4. Work major decisions **one at a time**.
5. Distinguish product decisions, architecture decisions, and implementation decisions.
6. Challenge assumptions.
7. Do not begin platform implementation until Scott explicitly asks.

## Current next decision

Official path: [[SaaS-Milestones]] Map B. S0–S4 are Successful. Official **S5** is Control Plane Productization / Operations Foundation: substantially implemented, **not Successful**. Closeout: [[wip/Post_S4_Foundation_Decision_Closeout]].

Next **implementation** waits until Scott authorizes the remaining S5 acceptance gaps (Retry UI and owner browser/Docker pass) or S6. Do not start either on this closeout.

**Git:** this workspace is its own repo at `C:\Users\Scoy9\Projects\crm_marketing_saas`. `origin` is https://github.com/Koifish95/crm_marketing_saas.git (not `renzo-crm`).

## What we do not do next

- Start S6 (fleet backup/upgrade) unless Scott asks
- Implement remaining S5 gaps unless Scott asks
- Start DNS / TLS / public hostnames (official S8)
- Start VPS cutover, operator auth, or production backup implementation
- Add `tenant_id` to the CRM
- Start Stripe, self-service signup, or a beauty-variant design
- Touch Koi-Pi PRODUCTION SQLite or `Projects/renzo_crm`
- Start unstarted Renzo gym milestones unless Scott asks

Related: [[Conventions]], [[Home]], [[wip/archive/Control_Plane_v1_and_Working_Agreement_2026-09-08]].
