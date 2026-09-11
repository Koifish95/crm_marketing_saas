---
type: note
status: current
area: architecture
updated: 2026-09-11
tags:
  - wip
  - saas
  - c1
  - handoff
---

# C1 CRM Core architecture — return

C1 units 1–3 are **code-shipped** on `working`. Sales is **not** started. D1 Control Plane schema is **unchanged**. Map B is **not** Successful. C2 is **not** started.

Prompt: [[wip/C1_CRM_Core_Architecture_Cursor_Prompt]]. Plan: [[wip/CRM_Core_Extraction_Implementation_Plan]]. ADR: [[ADR-CRM-Core-Vertical-Architecture]].

## Shipped

| Sprint | What | SHA |
|---|---|---|
| 0 | C1 prompt + vault pointers | `1d7c365` |
| 1 | pnpm workspace, thin `@crm/core` layer, ESLint/arch test, repo-root Docker context | `2770c8e` |
| 2 | brand, health, app-env in Core; MA consumes; no dual copies | `98f3825` |
| 3 | auth/users/RBAC framework, settings KV, shell + nav/settings/permission registration; journal `0000`–`0020` stays in MA | `60cec54` |
| 4 | this status (docs only) | `ac9c7a2` |

`control_plane` stays out of the workspace. Image tags stay `martial-arts-acquisition:s4` / `:s2`. `martial_arts_template/` was not moved to `apps/`.

## Martial Arts gates (Sprint 3)

`martial_arts_template`: `pnpm test` 69 files / 330 tests; `pnpm lint`; `pnpm typecheck`; `pnpm build`. Architecture test: Core does not import MA / sales / beauty.

## Docker / Control Plane

Provision still builds `-f martial_arts_template/Dockerfile` with **repo-root** context so the image can `COPY packages/crm-core`. Compose **up** cwd stays `templateRoot()`. Slugs, ports, retry, and product identity unchanged. D1 Account vs Product Instance tables were **not** added.

## What stayed Martial Arts

Marketing right **names**, MA settings keys/pages (trial outcomes, compensation, intro, catalog, campaigns, Meta), household/leads/trials/campaigns/events/`/trial`, BJJ seed codes, Drizzle journal `0000`–`0020`. MA registers Dashboard/Leads/Follow-up/Marketing/Reports plus settings sections.

## Confirmation

C2 (Sales proof + CP product catalog) was **not** started. D1 CP schema was **not** started. Beauty, plugin framework, `tenant_id`, S6 Successful, S7/VPS, and Map B rewrite were **not** started.
