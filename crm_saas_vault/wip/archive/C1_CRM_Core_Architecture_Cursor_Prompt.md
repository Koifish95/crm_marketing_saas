---
type: note
status: implemented
area: architecture
updated: 2026-09-11
tags:
  - wip
  - saas
  - c1
---

# Cursor Prompt — C1 CRM Core Architecture Establishment

## Purpose

Authorize and implement **C1 — Architecture establishment**: workspace, thin Core layer, enforcement, Docker workspace support, then brand/health/app-env and the auth/users/RBAC/settings/shell frameworks.

Scott has accepted [[ADR-CRM-Core-Vertical-Architecture]], [[wip/CRM_Core_Extraction_Implementation_Plan]], and D1–D4.

This prompt authorizes **C1 units 1–3 only**. Do not start Sales, Beauty, Control Plane product-instance schema, VPS/S7, or domain CRM extraction (leads, trials, campaigns, public capture).

Plan: workspace Cursor plan `c1_core_architecture_7b6579a6` (do not edit the plan file).

---

# Workspace

Project root: `C:\Users\Scoy9\Projects\crm_marketing_saas`  
Remote: `origin = https://github.com/Koifish95/crm_marketing_saas.git`  
Branch: `working`

Do **not** touch `renzo_crm`, Koi-Pi, `webhosting_renzo_*`, leftover `renzo-*` volumes.

PowerShell: `;` not `&&`. Never `docker compose down`, `-v`, prune, or `pnpm env:up` unless Scott asks.

---

# Locked decisions

| ID | Rule |
|---|---|
| ADR-01–27 | Core is infrastructure. Composition. Vertical → Core only. |
| D1 | Account → Product Instance → Vertical → Environments is **target**. Do not implement CP schema in C1. |
| D2–D4 | Keep MA leads/campaigns/public capture. Wait for Sales. |
| Images | Stay `martial-arts-acquisition:s4` / `:s2`. |

---

# Sprints

Commit and `git push origin working` after each sprint.

1. Workspace + `@crm/core` Nuxt layer + ESLint/arch test + repo-root Docker context (`-f martial_arts_template/Dockerfile`). Compose cwd stays `templateRoot()`.
2. Move brand, health, app-env into Core. MA consumes. No dual copies.
3. Auth/users/RBAC **framework**, Settings **framework**, shell + nav/settings/permission registration. Journal `0000`–`0020` stays in MA. Marketing right names stay MA.
4. Docs: C1 code-shipped; Sales not started.

Gate each sprint: `martial_arts_template` `pnpm test`, `lint`, `typecheck`, `build`. Stop if red.

---

# Out of C1

Sales, Beauty, D1 schema, provision product picker, leads/campaigns/`/trial` extraction, plugin framework, `tenant_id`, S6 Successful, S7/VPS, Map B rewrite.
