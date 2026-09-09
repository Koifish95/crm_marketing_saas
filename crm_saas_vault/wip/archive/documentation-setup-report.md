---
type: note
status: current
area: process
updated: 2026-08-26
tags:
  - wip
---

# Documentation setup report

Written after building the permanent vault. Application code was not changed except README pointers to the vault. M1 was not started. Source WIP files were not deleted or rewritten.

## 1. Vault structure

Open `vault/` as the Obsidian vault root.

```text
vault/
  Home.md
  Conventions.md
  Plugins.md
  ToDo.md
  Overview.md
  Requirements.md
  Funnel.md
  Domain-Model.md
  Architecture.md
  Decisions.md
  Implementation-State.md
  Milestones.md
  Open-Questions.md
  How-to-Run.md
  Glossary.md
  .obsidian/          # shared app + plugin list; local workspace gitignored
  wip/                # inbox (unchanged sources + this report + a folder index)
```

No empty stubs for Meta API, auth how-to, test matrix, etc. Those notes should appear when those milestones exist.

## 2. Permanent documents created

| File | Role |
|---|---|
| `Home.md` | Entry: what / why / now / next / decisions / links |
| `Conventions.md` | Frontmatter, links, tasks, when to update docs |
| `Plugins.md` | Dataview requirement |
| `ToDo.md` | Dataview aggregation only |
| `Overview.md` | Project framing and V1 boundaries |
| `Requirements.md` | Current business rules |
| `Funnel.md` | Revised acquisition workflow |
| `Domain-Model.md` | Planned entities (not in SQLite yet) |
| `Architecture.md` | Stack, Meta boundary, Docker |
| `Decisions.md` | ADR-lite log |
| `Implementation-State.md` | What M0 actually runs |
| `Milestones.md` | Revised sequence + M1 checkbox |
| `Open-Questions.md` | Gym/unknowns as checkboxes |
| `How-to-Run.md` | Local + Docker |
| `Glossary.md` | Short term list |

Also: `vault/wip/_index.md` (navigation into inbox only), `.gitignore` entries for Obsidian workspace cache, README links to `vault/Home.md`.

## 3. Information incorporated from WIP

| Source | What moved into permanent notes |
|---|---|
| Original spec | Scope, non-goals, stack intent, Meta-not-required, original funnel language (superseded for priority) |
| `v1-questions.md` / `answers.md` | Greenfield, programs, kids/guardian, statuses, Trial entity, consent split, `/trial` shape, ownership split, Scott-only V1 ops, no commission UI, no website CMS |
| `PROJCET_UPDATE_2026-08-26.md` | **Takes precedence:** intro-first funnel, next-day human call, FollowUpTask, scheduling priority over content, revised milestone order, Meta inventory unknowns, mid-November window, suspected social URLs as unconfirmed |

WIP files remain in `vault/wip/` as provenance.

## 4. Obsidian conventions

- Frontmatter: `type`, `status`, `area`, `updated`, `tags` (optional `aliases`)
- `[[Wiki Links]]` between permanent notes; `[[wip/filename]]` for sources
- Checkboxes only in the owning note
- Decisions: single `Decisions.md` log, newest first, short template
- New notes from Obsidian default into `wip/` (`app.json`)

## 5. How `ToDo.md` works

It contains no task descriptions. Dataview lists incomplete `- [ ]` items from the vault **except** `wip/`, grouped by source file.

Today that is [[Milestones]] (start M1) and [[Open-Questions]] (gym/Meta/ops unknowns).

Without Dataview, search for `- [ ]` outside `wip/`.

## 6. Plugin dependencies

**Dataview** (community plugin) for `ToDo.md` only. Documented in `Plugins.md` and listed in `vault/.obsidian/community-plugins.json`. The plugin binary is not vendored; enable it in Obsidian after install.

Core plugins only otherwise. No Tasks plugin (Dataview TASK query is enough).

## 7. Contradictions / unclear requirements

1. **Milestone meaning changed.** Original answers: V1 = old M0–M7 (content pipeline as M4, public form as M7). August 26 update: M4 = intro scheduling, M5 = follow-up, M6 = Meta, M7 = content. Permanent docs follow the **update**.
2. **Public form timing.** Original: `/trial` in V1 but not first. Update: intro scheduling is central and should not wait behind content. Exact gym availability still unknown — docs say do not invent a schedule.
3. **Scheduling depth.** Answers: no reusable slots/capacity. Update: possible `IntroAvailability` later after the gym replies. Both say do not implement speculative scheduler now.
4. **V1 cutoff vs Meta.** Update puts Meta at M6 inside the new sequence; original kept Meta APIs post-V1 (old M9). Docs treat **M6 as Meta integration** but still “blocked on gym answers,” and keep old M8–M10 as post-V1 unless you say otherwise. This needs a conscious call when M5 is done.
5. **WIP filename** `PROJCET_UPDATE_2026-08-26.md` is misspelled; left as-is.
6. **“Media center”** is undefined; listed as an open question.
7. **Port 5000** is current in the running config (host 3000 conflict). Documented as a decision.

## 8. Gaps that need your input

- Approve or adjust the revised M0–M7 sequence before M1.
- Whether FollowUpTask is **in M1 schema** (recommended: yes, empty of UI until M5).
- Confirm Meta access path and intro availability when the gym replies (already on [[Open-Questions]]).
- Whether Dataview is acceptable, or you want Tasks plugin / no plugin and a manual ToDo.

Then STOP. Waiting for review before M1.
