---
type: index
status: current
area: overview
updated: 2026-09-12
aliases:
  - Start
  - Index
  - BOOTSTRAP
tags:
  - moc
  - saas
---

# CRM / Marketing SaaS

Open this `crm_saas_vault/` folder as an Obsidian vault. Scott and Cursor treat it as **the vault**. It is the durable project record. ChatGPT memory and ChatGPT Project sources are **bootstrap/context**, not a parallel system of record.

**Read in this order:**

1. This file
2. [[Working-Agreement]]
3. [[Current-State]]
4. [[SaaS-Milestones]] (status tables only, then the ID you were authorized for)
5. [[SaaS-Decisions]] (newest first) and [[Platform-Architecture]]
6. [[project-state.yaml]]

Then inspect only the code that matters. Do not scan [[wip/_index|wip/]] or [[history/_index|history/]] for “what is true now.”

---

## What this repository is

```text
External renzo_crm (separate repo, host, deploy)
        | lessons / evidence only
        v
crm_marketing_saas
        |
        +-- Generic platform
        +-- Martial Arts template
        +-- Sales template (C2A + C2B Slice A Successful; local only)
        +-- future industry templates (Beauty later)
        +-- Customer instances: Strategic Insights (pilot), sister's business (pilot), then others
```

Real Renzo is **not** a SaaS customer and will not appear on the control plane. Do not manage, provision, or migrate live Renzo from this tree.

Git: this folder is its own repo; `origin` is https://github.com/Koifish95/crm_marketing_saas.git (not `renzo-crm`). Branch: `working`.

---

## Canonical set (live law)

| Note | Responsibility |
|---|---|
| **this file** | Bootstrap / index. Read-first path. |
| [[Working-Agreement]] | Two tracks, ChatGPT ↔ Cursor loop, authorization, vault vs wip |
| [[Current-State]] | What exists now. In-place. Not dated snapshots. |
| [[SaaS-Milestones]] | Live S-track and C-track. Not permission to implement. |
| [[SaaS-Decisions]] | Platform ADR index (newest first) |
| [[ADR-CRM-Core-Vertical-Architecture]] | Core + vertical architecture law |
| [[Platform-Architecture]] | Platform composition (not Renzo [[Architecture]]) |
| [[project-state.yaml]] | Machine-readable lockfile; update in the same commit as the work |
| [[Work-Order-Protocol]] | Only thing that authorizes Cursor implementation |
| [[SaaS-Open-Questions]] | Unresolved NEAR/DEF |
| [[Conventions]] | How notes are written and promoted |

Supporting live notes (not a second current-state): [[Customer-Environment]], [[Control-Plane]], [[S2-Hand-Boot-Checklist]], [[S3-Control-Plane-Runbook]], [[S4-Provision-Runbook]], [[S6-Fleet-Runbook]], [[SaaS-ToDo]].

---

## Two tracks

| Track | Start here | How we work |
|---|---|---|
| Platform expansion | [[Working-Agreement]] → [[Current-State]] → [[SaaS-Milestones]] → [[Platform-Architecture]] | Decision-first. No implementation without a work order. |
| Martial Arts template | `martial_arts_template/` plus domain evidence below | Evidence-driven. Default: template change. |

Renzo notes at the vault root (`Overview`, `Implementation-State`, `Milestones`, `Decisions`, Koi-Pi, and the rest) are **historical evidence** of the source implementation. Do not rewrite them into platform law. [[Architecture]] is the Renzo/source stack.

---

## Where development stands

Official S-track S0–S6 **Successful**. C1 **code-shipped**. C2A **Successful**. Official S7, C2, Beauty, D1 schema, DNS/TLS: **not started**. **No active work order.** Await Scott.

Details: [[Current-State]]. Lockfile: [[project-state.yaml]].

---

## ChatGPT bootstrap

At the start of a new ChatGPT conversation, do **not** infer current state from historical Project sources, memory, or old WIP.

Give ChatGPT only:

1. This file (process: vault is truth; ChatGPT is not the record)
2. [[project-state.yaml]]
3. [[Current-State]]
4. [[SaaS-Milestones]] status tables (S-track and C-track) — not historical maps
5. The newest entries in [[SaaS-Decisions]]

Instruction to store in ChatGPT memory: process rules only. **Never** store milestone status, SHAs, or “what exists now.” Re-read the packet when those change.

ChatGPT may draft ADRs and work orders. Scott lands them in git. ChatGPT must not maintain a second Implementation-State.

---

## Cursor bootstrap

Work only in `C:\Users\Scoy9\Projects\crm_marketing_saas` on branch `working`. This is not `renzo-crm`.

Read [[Current-State]] and [[project-state.yaml]]. Follow this Documentation map. Do not scan `wip/` or `history/` as current law.

Before doing anything: `git status`, branch, HEAD. Code is implementation truth. Distinguish TARGET vs IMPLEMENTED. If there is no active work order, summarize understanding and **stop**.

Hard stops: [[Current-State#Hard stops]].

---

## Historical evidence

| Place | Role |
|---|---|
| [[history/_index\|history/]] | Closeouts, superseded maps, dated snapshots |
| [[wip/archive/_index\|wip/archive/]] | Processed prompts and communication |
| Renzo notes at vault root | Source-product evidence |

Do not read those as the live map.

Alignment (evidence, not the map): [[wip/archive/SaaS_Project_Alignment_and_Current_Understanding]].
