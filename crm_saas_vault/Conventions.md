---
type: reference
status: current
area: process
updated: 2026-09-11
tags:
  - docs
---

# Documentation conventions

Open this `crm_saas_vault/` folder as an Obsidian vault. Scott and Cursor call it **the vault**. These notes also work as ordinary Markdown in the repo.

How the two tracks, ChatGPT, and `wip` communication work: [[Working-Agreement]]. Start at [[Home]]. Work orders: [[Work-Order-Protocol]].

The source code is the implementation. Durable notes are the map: read them first, then inspect only the code that matters, then update the notes when the work changes something durable.

---

## Folders

| Location | Role |
|---|---|
| Notes directly under `crm_saas_vault/` | Permanent knowledge |
| **Canonical live set** | [[Home]], [[Working-Agreement]], [[Current-State]], [[SaaS-Milestones]], [[SaaS-Decisions]], [[Platform-Architecture]], [[project-state.yaml]], [[Work-Order-Protocol]], [[SaaS-Open-Questions]] |
| Other live SaaS notes | [[Customer-Environment]], [[Control-Plane]], runbooks, [[SaaS-ToDo]] |
| Renzo evidence notes | [[Overview]], [[Implementation-State]], [[Milestones]], [[Architecture]], [[Decisions]], and the rest of the original gym map |
| [[history/_index\|history/]] | Historical maps, closeouts, dated snapshots. Evidence, not the map |
| [[Workspace]] | Cursor workspace map (three remotes). Twin of `C:\Users\Scoy9\Projects\AGENTS.md`. Historical for *this* repo’s identity. |
| [[wip/_index\|wip/]] | Direct Scott ↔ Cursor communication. At most one active work order + return. **WIP communicates work but never defines durable project truth.** |
| `wip/archive/` | Processed communication. Do not treat as the map. |

Do not delete WIP after incorporating it. Copy durable facts into permanent notes and leave a source link. Then move the wip file to `wip/archive/` or `history/`.

Do not leave “current state,” “fresh agent,” or “definitive closeout” notes in `wip/`. Those belong in [[Current-State]] (live) or `history/` (evidence).

---

## Frontmatter

Use only fields that help navigation or queries.

```yaml
---
type: index | note | decision | reference | work-order | work-return
status: current | draft | deferred | superseded | historical | active | done
area: overview | domain | architecture | operations | process
updated: YYYY-MM-DD
tags: []
---
```

Optional: `aliases` when a note has a common other name.

Do not add `created`, owners, or empty tag lists for completeness.

Renzo evidence notes may still say `status: current` as *gym-product* notes. They are **not** the SaaS live map. Agents follow [[Home]], not isolated `status:` fields.

---

## Linking

- Prefer `[[Wiki Links]]` between permanent notes.
- Link historical evidence as `[[history/filename]]` or `[[wip/archive/filename]]`.
- New inbox drafts can use `[[wip/filename]]`.
- Do not paste the same long explanation into two notes. Link instead.

---

## Tasks

Put `- [ ]` checkboxes in the note that owns the work ([[SaaS-Milestones]], [[SaaS-Open-Questions]], and similar). Do not copy the same task into [[ToDo]] or [[SaaS-ToDo]] except as a pointer.

[[ToDo]] gathers incomplete checkboxes with Dataview. Without the plugin, search the vault for `- [ ]`.

Exclude `wip/` and `history/` from that aggregation so inbox and evidence text does not look like committed work.

---

## Decisions

- SaaS / platform choices: [[SaaS-Decisions]]
- Renzo customer-implementation choices: [[Decisions]]

Do not record platform decisions in the Renzo log. “Accepted for Renzo” is not “accepted for the platform.”

Substantial architecture decisions get a dedicated ADR file plus a pointer in [[SaaS-Decisions]].

---

## When to update

Update vault notes in the **same work** as a change to architecture, domain, business rules, integrations, config, deploy, milestone status, assumptions, or limitations.

Required on every authorized implementation:

1. [[Current-State]]
2. [[project-state.yaml]] (`head_at_write`, track status, `active_work_order`)
3. [[SaaS-Milestones]] if status/Successful changed
4. [[SaaS-Decisions]] if a new choice was made

Do not document details that are obvious from the code. Do not create a new “current state” file with a date in the name.

---

## Historical vs live

- Never reuse a milestone ID for a new meaning (the dual-S5 failure). New meaning → new ID.
- Historical maps live in `history/`, not as a heading in the live roadmap.
- Dated handoffs are evidence. Git SHA is the implementation receipt.

---

## Plugins

See [[Plugins]].
