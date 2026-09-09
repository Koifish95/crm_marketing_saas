---
type: note
status: current
area: saas
updated: 2026-09-09
tags:
  - wip
  - saas
  - s5
---

# S5 control-plane productization status

Authorized first slice of **tentative** S5: operator frontend / operational dashboard foundation.

**This work does not make tentative S5 Successful.** Milestone sequencing remains pending [[wip/Post_S4_Foundation_Decision_Inventory]]. Historical S5 is still “reachable customer access” in [[SaaS-Milestones]]. Post-UI hardening: [[wip/Control_Plane_Post_Productization_Audit]].

Related: [[wip/post_S4_prompt]], [[wip/Where_We_Are_Now_Post_S4_2026-09-09]].

## Tentative roadmap

S5 Control Plane Productization → S6 Fleet Reliability → S7 Hosting / Security / Remote Nodes → S8 Public Exposure → S9 Dogfood / Pilot Readiness → S10 Second Pilot / Template Expansion → S11 External Paying Customer Readiness.

Provisional only.

## Frontend architecture

Nuxt pages + `layouts/default.vue`. Live data from existing `GET /api/status`. Mutations unchanged (`POST /api/customers`, `POST /api/customers/:id/provision`, `POST /api/environments/:id/relaunch`). Client grouping in `shared/utils/fleet.ts`. No new write APIs.

Honest derived fields only: customer/node overall = worst env status (`unhealthy` > `unknown` > `stopped` > `healthy`); Needs Attention = `unhealthy` or `unknown`.

## Routes / components

- Layout/nav: Dashboard, Customers, Environments, Hosting Nodes, Settings
- `useFleetStatus`, `shared/utils/fleet.ts`
- `AppStatusBadge`, `AppPageHeader`, `AppWorkspaceTabs`, `AppSearchField`
- `/` operational Dashboard (counts + Needs Attention). No provision form. No full record dump.
- `/customers` index + `/customers/:id` workspace (Overview / Environments / Configuration, read-only)
- `/customers/new` S4 provision form (same two POSTs, same fields, resume/retry, redirect to workspace)
- `/environments` index + `/environments/:id` workspace (Overview / Runtime / Configuration + Refresh + existing Relaunch)
- `/nodes` index + `/nodes/:id` workspace (today: one `laptop` row)
- `/settings` placeholder

Indexes use client-side search/filter. Shared `AppDataTable` / `AppAsyncPanel` after the hardening sprint.

## Existing functionality preserved

S3 registry, observe, Refresh, Relaunch (never `-v`). S4 provision semantics and POST body keys (`displayName`, `slug`, `timezone`, `adminEmail`). No DNS/TLS/hostnames.

## Unresolved owner decisions

- Foundation inventory is in-repo; unanswered items stay unset.
- Settings has nothing legitimate to manage yet (placeholder).
- No customer/environment edit APIs — configuration tabs stay read-only.

## Sprints

| Sprint | SHA | QA | Browser vs API |
|---|---|---|---|
| 1 Shell | `f61bcdf` | 11 files / 23 tests; lint, typecheck, build | API/HTML: `/` still loaded status inside the new shell |
| 2 Dashboard | `5c32a8f` | 12 files / 24 tests; lint, typecheck, build | HTML: counts + Needs Attention; no New customer on `/` |
| 3 Customers | `5c32a8f` | same | HTML: Acme + SI index rows; SI workspace Overview |
| 4 Environments | `5c32a8f` | same | HTML: index + SI PROD workspace with Relaunch. API: Refresh via `GET /api/status`; relaunch Acme DEV (no `-v`); brief unhealthy then healthy on refresh |
| 5 Nodes | `5c32a8f` | same | HTML: `laptop` index + workspace with placed envs |
| 6 Provision move | `5c32a8f` | same + `tests/s5/provision-payload.test.ts` | HTML: form only on `/customers/new`. API: SI resume `resumed=true`, same id `5b3b4674-84df-440d-855b-113689bab69d`, still 2 envs |
| 7 Consistency | `5c32a8f` | search/filter, empty/loading/error, responsive CSS, badges, tab/search/breadcrumb a11y | HTML/API as above. **Click-through in a real browser was not verified** (no browser automation in this session) |

Sprints 2–7 landed together in `5c32a8f` after sprint 1 (`f61bcdf`). Hardening: UI `a3b9efe`, tests `3f5e399`. Docs/audit SHA is in [[wip/Control_Plane_Post_Productization_Audit]].

## Stop

Frontend slice + hardening complete. Do not start DNS, public URLs, GoDaddy, TLS, remote nodes, backups, billing, or delete.
