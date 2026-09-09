---
type: index
status: current
area: overview
updated: 2026-09-08
aliases:
  - Start
  - Index
tags:
  - moc
  - saas
---

# CRM / Marketing SaaS

Open this `crm_saas_vault/` folder as an Obsidian vault. Scott and Cursor treat it as **the vault**. [[Working-Agreement]] is how we work. [[Conventions]] is how notes are written.

This workspace productizes the Renzo CRM evidence into a commercial platform. It is **not** a license to convert the live Renzo gym app into multi-tenant SaaS.

## Two tracks

| Track | Start here |
|---|---|
| Platform expansion (decision-first) | [[Working-Agreement]] → [[SaaS-Decisions]] → [[Control-Plane]] |
| CRM fine-tuning (evidence-driven) | [[Overview]] → [[Implementation-State]] → [[Decisions]] |

Renzo Gracie Kaysville is the first real implementation, design partner, and proving ground. Those notes stay **evidence**. Do not rewrite them into platform law.

## Platform — current understanding

Long-term direction: an ultra-general marketing, lead-generation, and CRM platform for SMBs. First industry variant: Martial Arts. Likely second: Beauty / Salon / Esthetician (not designed yet).

```text
Platform → Industry Template → Customer Instance → Enabled Capabilities → Configuration
```

Control plane v1 (working decision, not implemented): a **separate** app that lists customer environments, shows up/down, and relaunches without destroying data. It does not provision new customers yet. Details: [[Control-Plane]].

Alignment (evidence, not the map): [[wip/SaaS_Project_Alignment_and_Current_Understanding]].

**Local Git:** this folder is its own repo (`main`, no `renzo-crm` remote). Hosted remote still open on [[SaaS-ToDo]].  
**Next decision:** customer-environment unit. Discuss in `wip`. Do not implement the control plane until asked.

## Platform notes

| Note | Contents |
|---|---|
| [[Working-Agreement]] | Two tracks, vault vs wip, how we decide |
| [[SaaS-Decisions]] | SaaS ADR log |
| [[SaaS-ToDo]] | Platform tasks (Git repo first) |
| [[Control-Plane]] | Platform control app — v1 scope |
| [[Conventions]] | How notes, links, and promotions work |
| [[wip/_index\|WIP inbox]] | Direct Scott ↔ Cursor communication |

## Renzo CRM evidence

Working name: **Renzo Gracie Kaysville Acquisition**. Product briefing: repo-root `AGENTS.md`. Live PRODUCTION SQLite on Koi-Pi must be preserved: [[Operations-PRODUCTION-SQLite]].

M0–M9 implemented. M8/M9 await Scott browser acceptance. M10A / M10C / M10D live. M10B laptop backup implemented; Pi restore not LIVE-VALIDATED. Do not start M10E, PostgreSQL, SMS, email, or WhatsApp unless asked.

| Note | Contents |
|---|---|
| [[Overview]] | Why the gym app exists |
| [[Implementation-State]] | What runs now |
| [[Milestones]] | Sequence and acceptance status |
| [[Requirements]] | Current business rules |
| [[Funnel]] | Acquisition workflow |
| [[Domain-Model]] | Entities and relationships |
| [[Database]] | Schema, migrations, seed, money, timestamps |
| [[Operations-PRODUCTION-SQLite]] | Preserve Koi-Pi PRODUCTION SQLite |
| [[Authentication]] | Sessions, passwords, roles, Access Rights |
| [[CRM]] | Internal lead / household workflow |
| [[Design-System]] | UI tokens, shells, Primary Record Workspace |
| [[Intro-Scheduling]] | Public `/trial` and intro availability |
| [[Architecture]] | Stack, boundaries, deploy shape |
| [[How-to-Run]] | Local and Docker commands |
| [[Workspace]] | Cursor workspace map (three remotes) |
| [[Koi-Pi-Infrastructure]] | Pi hardware and update steps |
| [[Deploy-Workflow]] | Develop in sibling, refresh drop-in, deploy Pi |
| [[Open-Questions]] | Unresolved Renzo items — do not invent answers |
| [[Decisions]] | Renzo durable choices |
| [[Glossary]] | Terms |
| [[ToDo]] | Outstanding checkboxes from the Renzo notes |
