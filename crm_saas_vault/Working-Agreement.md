---
type: reference
status: current
area: process
updated: 2026-09-12
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

The **git vault is the only durable project-state system.** ChatGPT Project sources are a bootstrap packet. ChatGPT memory stores process rules, not current milestone status.

---

## Two tracks

| Track | What it is | How we work |
|---|---|---|
| **Martial Arts template** | Improve `martial_arts_template` as the generic industry product | Evidence-driven. Default: template change. |
| **Platform expansion** | Control plane, customer environments, provisioning, Core/verticals | Decision-first. No implementation until a [[Work-Order-Protocol\|work order]] (or Scott’s explicit ask in the current chat). |

Do not refactor the CRM into multi-tenant SaaS in order to “get ready.” Do not treat a CRM UX fix as a platform architecture change.

When a CRM change appears, classify it:

```text
template-only (this Martial Arts product)
→ platform-generic?
```

Promotion to platform-generic is an explicit decision, recorded in [[SaaS-Decisions]].

“Protect Renzo” means: do not touch the external `renzo_crm` project, Koi-Pi, or `webhosting_renzo_*`. Copied Renzo-derived artifacts **inside this repository** may be generalized.

---

## Authoritative sources

| Question | Wins |
|---|---|
| What the code does | The repository at HEAD. Investigate if the map disagrees, then fix the map. |
| What we claim exists now | [[Current-State]] + [[project-state.yaml]] |
| What the next milestone **is** | [[SaaS-Milestones]] (S-track and C-track are separate ID spaces) |
| What we decided | [[SaaS-Decisions]] and linked ADRs |
| What Cursor may implement **now** | An active work order, or Scott’s explicit ask in this chat |
| Historical proof (SHAs, closeouts) | Git + [[history/_index\|history/]] |

Conflict rule: if two durable notes disagree, [[Current-State]] and [[project-state.yaml]] win for *status*; the ADR wins for *architecture law*; Git wins for *whether code exists*. Then update the loser. Do not invent a third document.

Renzo notes (`Domain-Model`, [[Architecture]], [[Implementation-State]], [[Decisions]], [[Milestones]]) stay **historical evidence**. Do not rewrite them into SaaS docs. “Accepted for Renzo” is not “accepted for the platform.”

---

## Vault vs wip

`crm_saas_vault` is **the vault**.

| Place | Role |
|---|---|
| Canonical set at vault root | Settled map. See [[Home]]. |
| [[wip/_index\|wip/]] | Direct communication: **at most one** active work order and its return |
| `wip/archive/` | Processed communication. Evidence, not the map |
| [[history/_index\|history/]] | Historical maps, closeouts, dated snapshots. Evidence, not the map |

**WIP communicates work but never defines durable project truth.**

Chat is not the record. After a conversation settles something, promote it into a durable note and leave the `wip` file as evidence. Do not delete `wip` after incorporating it. Do not leave closeouts or “fresh agent handoffs” in `wip/` as orientation.

---

## Communication loop

```text
Scott decides
    → ChatGPT advises (bootstrap packet only; drafts ADRs and work orders)
    → Scott lands the work order in git (or pastes it into Cursor)
    → Cursor implements only the authorized scope
    → Cursor patches Current-State, roadmap, decisions, project-state.yaml
    → Git SHA is evidence
    → Cursor writes a return; promote facts; archive the pair
    → ChatGPT may review the return; it must not become a second state store
```

ChatGPT does not keep a parallel Implementation-State. Cursor does not treat planning documents as authorization. Scott is the only person who can mark a milestone **Successful**.

---

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

---

## How we decide

1. Read [[Current-State]] and [[SaaS-Decisions]]. Do not reconstruct state from archive.
2. Before asking Scott a question, check whether a note or prior decision already answers it.
3. Ask only unresolved questions ([[SaaS-Open-Questions]]).
4. Work major decisions **one at a time**.
5. Distinguish product decisions, architecture decisions, and implementation decisions.
6. Challenge assumptions.
7. Do not begin platform implementation until a work order exists or Scott explicitly asks in the current chat.

---

## Current next decision

Orientation: [[Current-State]]. Official S-track: [[SaaS-Milestones]]. S0–S6 are Successful. Official **S7** is not started. CRM Core + vertical architecture is **Accepted**. D1–D4 are **accepted**. **C1 is code-shipped**. **C2A is Successful**. **C2B Slice A is Successful**. **SI Sales B1 is code-shipped** pending owner acceptance. **No active work order.** Await Scott. Do not start B2, C2, Core promotion, Beauty, D1 CP schema, or S7 unless Scott asks.

**Git:** this workspace is its own repo at `C:\Users\Scoy9\Projects\crm_marketing_saas`. `origin` is https://github.com/Koifish95/crm_marketing_saas.git (not `renzo-crm`).

---

## What we do not do next

- Start B2 (proposals/PDF/e-sign/portal), C2, Core promotion, Beauty, D1 Control Plane schema, or VPS/S7
- Move `martial_arts_template` to `apps/` in C1 (C1 already shipped without that move)
- Start DNS / TLS / public hostnames (official S8)
- Start VPS cutover, operator auth, or an image registry (official S7) — product family locally first
- Add `tenant_id` to the CRM
- Start Stripe, self-service signup, or a beauty-variant design
- Touch Koi-Pi PRODUCTION SQLite or `Projects/renzo_crm`
- Start unstarted Renzo gym milestones unless Scott asks

Related: [[Conventions]], [[Home]], [[Work-Order-Protocol]].
