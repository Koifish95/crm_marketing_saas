---
type: note
status: current
area: process
updated: 2026-09-11
tags:
  - wip
  - saas
  - handoff
---

# CRM Core architecture planning — return

Handoff for Scott → ChatGPT. Planning complete. **No architecture refactor and no new vertical implementation was started.**

## Documentation reviewed

- [[wip/archive/Clean_Starting_Point_Current_State]], [[wip/Clean_Starting_Point_Decision_Backlog]], [[wip/archive/Clean_Starting_Point_Return]]
- [[Home]], [[Working-Agreement]], [[SaaS-Milestones]], [[SaaS-Decisions]], [[Customer-Environment]], [[Control-Plane]], [[SaaS-ToDo]]
- [[wip/Post_S4_Foundation_Decision_Closeout]], [[wip/S5_closeout]], [[wip/archive/S5_Control_Plane_Productization_Status]], [[wip/S6_Implementation_Status]]
- Prompt: [[wip/archive/Create_CRM_Core_Vertical_Architecture_ADR_and_Planning_Prompt]]

## Repository areas inspected

- Git: branch `working`, `origin` https://github.com/Koifish95/crm_marketing_saas.git (not `renzo-crm`). Tip before this commit: `f43fcae`.
- `martial_arts_template/`: `package.json`, `nuxt.config.ts`, `server/database/schema/index.ts` (55 tables, `0000`–`0020`), services, `app/layouts/internal.vue`, `shared/utils/access-rights.ts`, `shared/utils/brand.ts`, seed, Dockerfile/compose, `tests/` (67 files).
- `control_plane/`: `server/database/schema.ts`, provision-contract/runtime, `industry_template` unused for image pick, S6 backup APIs present.
- Root: no `pnpm-workspace.yaml`, no root `package.json`, no `ADR/` folder (convention = [[SaaS-Decisions]]).
- External `renzo_crm`, Koi-Pi, `webhosting_renzo_*`: not touched.

## Architecture findings

The desired Core + vertical architecture **does not exist in code**. Martial Arts is a Nuxt 4 monolith. Control plane provision is hard-wired to `martial-arts-acquisition:s4`. `customers.industry_template` is a stored placeholder.

Recommended model: pnpm workspace + `packages/crm-core` Nuxt layer + TS modules; Martial Arts stays in place and extends the layer; independent product images later; no big-bang `apps/` move.

## Major coupling discovered

- Household is `leads` + `lead_lines` (no `households` table); `leads.programId` required; lead status includes trial states.
- Services cross-import (leads → campaigns, trials, compensation, events).
- Tracking default `/trial`; seed/UI hard-code `ADULT_BJJ` / `KIDS_BJJ`.
- Staff nav hard-coded; settings mix trial + compensation; RBAC marketing catalog is the only fine-grained rights list.
- CP image/compose ignore `industry_template`.

## ADR path

[[ADR-CRM-Core-Vertical-Architecture]] (Accepted 2026-09-11). Pointer: [[SaaS-Decisions#2026-09-11 — CRM Core + vertical architecture]].

## Implementation-plan path

[[wip/CRM_Core_Extraction_Implementation_Plan]]

## Owner decisions D1–D4

**Resolved** 2026-09-11. [[SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain]]. None block C1 / Sprint 1. C1 was **not** started.

1. **D1 accepted (rejects prior recommendation):** Customer Account → Product Instance → Vertical → Environments. One account may own multiple instances on different verticals. **Not implemented.**
2. **D2 accepted (wait):** MA `leads` stay MA-owned. Eventual Core name need not be `Lead`.
3. **D3 accepted (wait):** campaigns/events stay MA-owned.
4. **D4 accepted (wait):** `/trial`, `/events/[slug]`, `/t/[slug]` stay vertical-owned.

## Recommended first implementation sprint

C1 / Sprint 1: `pnpm-workspace.yaml` + empty/thin `packages/crm-core` layer + MA `extends` + ESLint/architecture test + Dockerfile workspace COPY. No schema split. No Sales. No CP product picker. **Do not start until Scott asks.**

## Sales before Core is fully extracted?

**Yes.** After shell/auth/settings are Core-owned, introduce minimum Sales to challenge Core. Do not finish “all of Martial Arts stripped into Core” first. Beauty after the ADR-27 finish line.

## Deviations from the prompt

- ADR lives at the prompt’s preferred filename **and** a short pointer in [[SaaS-Decisions]] (existing convention; no `ADR/` folder).
- Did not update [[SaaS-Milestones]] sequence (prompt: propose in the plan only). Proposed C1–C3 insert is in the implementation plan.
- Did not reopen S6 or start S7.
- Hosting/backup prompt language vs authorized S6: recorded as sequencing conflict, not a reversal of NEAR-01–03.

## Validation performed

Checked imports/schema/workflows against Core-candidate lists; MA-only candidates against household/trial/program code; Drizzle journal and migrator before recommending split-later; Nuxt/package layout before recommending a layer; Docker/CP build cwd before recommending workspace COPY; CP schema before recommending Customer vs Environment identity; test scripts before naming the critical suite; searched for existing Core/layer/plugin infrastructure (none). Untested at runtime this session: live Docker fleet (not required for docs).

## Files changed (this task)

- `crm_saas_vault/ADR-CRM-Core-Vertical-Architecture.md` (created)
- `crm_saas_vault/wip/CRM_Core_Extraction_Implementation_Plan.md` (created)
- `crm_saas_vault/wip/archive/CRM_Core_Architecture_Planning_Return.md` (this file)
- `crm_saas_vault/SaaS-Decisions.md` (pointer)
- `crm_saas_vault/Working-Agreement.md` (current next)
- `crm_saas_vault/wip/_index.md`
- `crm_saas_vault/wip/Clean_Starting_Point_Decision_Backlog.md` (DEF-01 pointer only)
- `crm_saas_vault/SaaS-ToDo.md` (planning pointer; S6 Successful still unchecked)
- Prompt file tracked if previously untracked

No `martial_arts_template/` or `control_plane/` application changes.

## Commit SHA / push status

| Item | Value |
|---|---|
| Planning commit | `33e116e` |
| D1–D4 decisions | `fa54497` |
| Push | `origin/working` |

## Confirmation

This file is the **planning** return. C1 implementation later shipped; see [[wip/C1_CRM_Core_Architecture_Return]]. Sales, Beauty, D1 CP schema, and C2 were still not started as of that return.
