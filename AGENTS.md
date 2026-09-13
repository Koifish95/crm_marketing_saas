# Agent instructions

This repository is **`crm_marketing_saas`** (remote `crm_marketing_saas`, branch `working`). It is not `renzo-crm`. It is not the live Renzo gym app.

Durable project knowledge lives in `crm_saas_vault/`. **The git vault is the only durable project-state system.** ChatGPT memory, ChatGPT Project sources, `wip/`, and dated handoffs are not the map.

## Read this first

1. `crm_saas_vault/Home.md`
2. `crm_saas_vault/Working-Agreement.md`
3. `crm_saas_vault/Current-State.md`
4. `crm_saas_vault/project-state.yaml`
5. `crm_saas_vault/SaaS-Milestones.md` — status tables only, then the ID you were authorized for
6. `crm_saas_vault/SaaS-Decisions.md` (newest first) and `crm_saas_vault/Platform-Architecture.md`

Then inspect **only** the code that matters. Code is implementation truth; durable vault notes are documented rules. If they conflict, investigate, then fix the map.

Do not scan `crm_saas_vault/wip/` or `crm_saas_vault/history/` to decide what is true now. `wip/` communicates work but **never** defines durable project truth. `history/` is evidence.

## Authorization

Roadmaps, ADRs, plans, old prompts, and ChatGPT memory **never** authorize implementation.

Implement platform work only when:

- an **active work order** exists in `crm_saas_vault/wip/` (`authorized: yes`), or
- Scott’s **current chat** explicitly asks and names the scope (same fields as `crm_saas_vault/Work-Order-Protocol.md`).

If `project-state.yaml` has `authorization.active_work_order: null` and Scott did not ask in this chat: summarize understanding and **stop**.

Do not start S7, C2, SI Sales B2, Core promotion, Beauty, D1 schema, VPS, or DNS/TLS because they are “next” on the roadmap. C2A/C2B Successful and B1 Successful do not authorize those.

## Canonical set

| Need | Note |
|---|---|
| Bootstrap | `crm_saas_vault/Home.md` |
| How we work | `crm_saas_vault/Working-Agreement.md` |
| What exists now | `crm_saas_vault/Current-State.md` |
| Roadmap (S-track and C-track) | `crm_saas_vault/SaaS-Milestones.md` |
| Decisions | `crm_saas_vault/SaaS-Decisions.md` |
| Platform architecture | `crm_saas_vault/Platform-Architecture.md` |
| Core ADR | `crm_saas_vault/ADR-CRM-Core-Vertical-Architecture.md` |
| Lockfile | `crm_saas_vault/project-state.yaml` |
| Work orders | `crm_saas_vault/Work-Order-Protocol.md` |
| Open NEAR/DEF | `crm_saas_vault/SaaS-Open-Questions.md` |
| Control plane | `crm_saas_vault/Control-Plane.md` |
| Customer / environment | `crm_saas_vault/Customer-Environment.md` |
| Martial Arts template agents | `martial_arts_template/AGENTS.md` |
| Sales template agents | `sales_template/AGENTS.md` |
| Renzo gym evidence (not SaaS law) | `Implementation-State.md`, `Milestones.md`, `Architecture.md`, `Decisions.md` |

Renzo notes at the vault root are **historical evidence** of the source implementation. `Architecture.md` is the Renzo/source stack. Platform architecture is `Platform-Architecture.md`. Never reuse a milestone ID for a new meaning.

## Hard stops

- Do not touch `C:\Users\Scoy9\Projects\renzo_crm`, Koi-Pi, or `webhosting_renzo_*`.
- Never `docker compose down -v`, never prune, never attach leftover `renzo-*` volumes.
- Do not `git push --force` to `main` / `master`. Commit one repo at a time, only when asked.
- Do not invent answers to `crm_saas_vault/Open-Questions.md` (Renzo) or `crm_saas_vault/SaaS-Open-Questions.md` (platform).
- Do not treat live laptop sqlite extras as official pilots.

## After authorized work

In the same work, update `Current-State.md`, `project-state.yaml`, and any milestone/decision notes that changed. Write the work-order return, promote facts, archive the pair. Protocol: `crm_saas_vault/Work-Order-Protocol.md`.

Inspect git (`branch`, `HEAD`, `status`) before editing. Do not switch branches, merge, rebase, force-push, or discard unrelated work unless asked.
