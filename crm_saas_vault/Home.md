---
type: index
status: current
area: overview
updated: 2026-09-09
aliases:
  - Start
  - Index
tags:
  - moc
  - saas
---

# CRM / Marketing SaaS

Open this `crm_saas_vault/` folder as an Obsidian vault. Scott and Cursor treat it as **the vault**. [[Working-Agreement]] is how we work. [[Conventions]] is how notes are written.

This repository is the **generic SaaS platform** and its first industry product, the **Martial Arts template**. It was derived from the external Renzo CRM implementation. It is **not** a license to manage, provision, or migrate live Renzo.

```text
External renzo_crm (separate repo, host, deploy)
        | lessons / evidence only
        v
crm_marketing_saas
        |
        +-- Generic platform
        +-- Martial Arts template
        +-- future industry templates (Beauty later)
        +-- Customer instances: Strategic Insights (pilot), sister's business (pilot), then others
```

Real Renzo is **not** a SaaS customer and will not appear on the control plane.

## Two tracks

| Track | Start here |
|---|---|
| Platform expansion (decision-first) | [[Working-Agreement]] → [[SaaS-Milestones]] → [[Customer-Environment]] → [[SaaS-Decisions]] → [[Control-Plane]] |
| Martial Arts template | `martial_arts_template/` — improve the generic industry product |

Renzo notes at the vault root (`Overview`, `Implementation-State`, `Decisions`, Koi-Pi, and the rest) are **historical evidence** of the source implementation. Do not rewrite them into platform law. Do not treat them as a deployable customer in this repo.

## Platform — current understanding

Long-term direction: an ultra-general marketing, lead-generation, and CRM platform for SMBs. First industry variant: Martial Arts. Likely second: Beauty / Salon / Esthetician (not designed yet).

```text
Platform → Industry Template → Customer Instance → Enabled Capabilities → Configuration
```

Control plane is **implemented** as `control_plane/` (http://127.0.0.1:52100): Dashboard, Customers, Environments, Hosting Nodes. It shows up/down, relaunches without destroying data, and provisions a Martial Arts PROD+DEV pair from **Customers → New customer**. Details: [[Control-Plane]]. Observe: [[S3-Control-Plane-Runbook]]. Provision: [[S4-Provision-Runbook]]. Audit: [[wip/Control_Plane_Post_Productization_Audit]].

Alignment (evidence, not the map): [[wip/archive/SaaS_Project_Alignment_and_Current_Understanding]].

**Git:** this folder is its own repo; `origin` is https://github.com/Koifish95/crm_marketing_saas.git (not `renzo-crm`).  
**Milestones:** [[SaaS-Milestones]] S0–S4 Successful. A tentative operator-UI slice of S5 shipped; it is **not** Successful. Next leftovers: [[wip/S5_And_Beyond_Cursor_Prompt]]. Do not start DNS/TLS. Evidence: [[wip/S4_closeout]], [[wip/S5_Control_Plane_Productization_Status]], [[wip/Post_S4_Ten_Decisions]].

**First intended pilots:** Strategic Insights Consulting, LLC is **laptop-provisioned** (S4 proof, not public). Scott’s sister’s business is **not** provisioned.

## Platform notes

| Note | Contents |
|---|---|
| [[Working-Agreement]] | Two tracks, vault vs wip, how we decide |
| [[SaaS-Milestones]] | S0–S8 launch path; **Successful** is acceptance |
| [[Customer-Environment]] | S1 unit: Customer, Environment, node placement |
| [[SaaS-Decisions]] | SaaS ADR log |
| [[S2-Hand-Boot-Checklist]] | S2 lab boot (Docker + named lab volumes) |
| [[wip/S2_closeout]] | Definitive S2 closeout / handoff |
| [[S3-Control-Plane-Runbook]] | How to start and use the S3 control plane |
| [[wip/S3_closeout]] | Definitive S3 closeout / handoff |
| [[SaaS-ToDo]] | Open platform tasks |
| [[Control-Plane]] | Platform control app — v1 scope |
| [[Conventions]] | How notes, links, and promotions work |
| [[wip/_index\|WIP inbox]] | Direct Scott ↔ Cursor communication |

## Renzo CRM evidence (historical / external)

The live gym app is **`C:\Users\Scoy9\Projects\renzo_crm`**, hosted separately. Do not touch that project, Koi-Pi, or `webhosting_renzo_*` from this repo. Copied Renzo-derived code **inside this repository** may be generalized.

Working name of the source implementation: **Renzo Gracie Kaysville Acquisition**. Live PRODUCTION SQLite on Koi-Pi must stay in the external project: [[Operations-PRODUCTION-SQLite]].

| Note | Contents |
|---|---|
| [[Overview]] | Why the gym app exists |
| [[Implementation-State]] | What ran in the source implementation |
| [[Milestones]] | Renzo gym sequence and acceptance status |
| [[Requirements]] | Source business rules |
| [[Funnel]] | Acquisition workflow |
| [[Domain-Model]] | Entities and relationships |
| [[Database]] | Schema, migrations, seed, money, timestamps |
| [[Operations-PRODUCTION-SQLite]] | Preserve Koi-Pi PRODUCTION SQLite (external) |
| [[Authentication]] | Sessions, passwords, roles, Access Rights |
| [[CRM]] | Internal lead / household workflow |
| [[Design-System]] | UI tokens, shells, Primary Record Workspace |
| [[Intro-Scheduling]] | Public `/trial` and intro availability |
| [[Architecture]] | Stack, boundaries, deploy shape |
| [[How-to-Run]] | Local and Docker commands (source + template) |
| [[Workspace]] | Cursor workspace map (three remotes) |
| [[Koi-Pi-Infrastructure]] | Pi hardware and update steps (external Renzo) |
| [[Deploy-Workflow]] | Renzo develop / copy / deploy (external) |
| [[Open-Questions]] | Unresolved Renzo items — do not invent answers |
| [[Decisions]] | Renzo durable choices |
| [[Glossary]] | Terms |
| [[ToDo]] | Outstanding checkboxes from the Renzo notes |
