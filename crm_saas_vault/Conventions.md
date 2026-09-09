---
type: reference
status: current
area: process
updated: 2026-09-09
tags:
  - docs
---

# Documentation conventions

Open this `crm_saas_vault/` folder as an Obsidian vault. Scott and Cursor call it **the vault**. These notes also work as ordinary Markdown in the repo.

How the two tracks and `wip` communication work: [[Working-Agreement]]. Start at [[Home]].

The source code is the implementation. Durable notes are the map: read them first, then inspect only the code that matters, then update the notes when the work changes something durable.

## Folders

| Location | Role |
|---|---|
| Notes directly under `crm_saas_vault/` | Permanent knowledge |
| SaaS / platform notes | [[Working-Agreement]], [[SaaS-Milestones]], [[Customer-Environment]], [[SaaS-Decisions]], [[Control-Plane]] |
| Renzo evidence notes | [[Overview]], [[Implementation-State]], [[Decisions]], and the rest of the original map |
| [[Workspace]] | Cursor workspace map (three remotes). Twin of `C:\Users\Scoy9\Projects\AGENTS.md`. |
| [[Koi-Pi-Infrastructure]] | Raspberry Pi hardware, directories, and the update loop. |
| [[wip/_index\|wip/]] | Direct Scott ↔ Cursor communication. Processed sources: `wip/archive/`. Do not treat either as the map. |

Do not delete WIP after incorporating it. Copy durable facts into permanent notes and leave a source link.

## Frontmatter

Use only fields that help navigation or queries.

```yaml
---
type: index | note | decision | reference
status: current | draft | deferred | superseded
area: overview | domain | architecture | operations | process
updated: YYYY-MM-DD
tags: []
---
```

Optional: `aliases` when a note has a common other name.

Do not add `created`, owners, or empty tag lists for completeness.

## Linking

- Prefer `[[Wiki Links]]` between permanent notes.
- Link to archived sources as `[[wip/archive/filename]]`. New inbox drafts can use `[[wip/filename]]`.
- Do not paste the same long explanation into two notes. Link instead.

## Tasks

Put `- [ ]` checkboxes in the note that owns the work ([[Open-Questions]], [[Milestones]], [[SaaS-Milestones]], and similar). Do not copy the same task into [[ToDo]] or [[SaaS-ToDo]] except as a pointer.

[[ToDo]] gathers incomplete checkboxes with Dataview. Without the plugin, search the vault for `- [ ]`.

Exclude `wip/` from that aggregation so unprocessed inbox text does not look like committed work.

## Decisions

- SaaS / platform choices: [[SaaS-Decisions]]
- Renzo customer-implementation choices: [[Decisions]]

Do not record platform decisions in the Renzo log. “Accepted for Renzo” is not “accepted for the platform.”

## When to update

Update vault notes in the same work as a change to architecture, domain, business rules, integrations, config, deploy, milestone status, assumptions, or limitations.

Do not document details that are obvious from the code.

## Plugins

See [[Plugins]].
