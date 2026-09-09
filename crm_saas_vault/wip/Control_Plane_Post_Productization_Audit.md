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

# Control plane post-productization audit

Hardening/QA after the tentative S5 operator frontend. **Does not make tentative S5 Successful.** Inventory: [[wip/Post_S4_Foundation_Decision_Inventory]]. Status: [[wip/S5_Control_Plane_Productization_Status]].

## Current UI / application structure

`control_plane/` Nuxt app on `127.0.0.1:52100`. Layout [`app/layouts/default.vue`](../../control_plane/app/layouts/default.vue). Live read: `GET /api/status` via `useFleetStatus` (`key: fleet-status`). Mutations unchanged.

```text
/                    Dashboard — counts + Needs Attention
/customers           index + search + New customer
/customers/new       S4 form → POST /api/customers + POST .../provision
/customers/:id       Overview | Environments | Configuration (read-only)
/environments        index + search + PROD/DEV filter
/environments/:id    Overview | Runtime | Configuration + Refresh / Relaunch
/nodes               index + search
/nodes/:id           identity + placed envs
/settings            placeholder
```

Shared: `AppPageHeader`, `AppStatusBadge`, `AppWorkspaceTabs`, `AppSearchField`, `AppAsyncPanel`, `AppDataTable`, `AppRefreshButton`. Grouping: `shared/utils/fleet.ts`. Nav: `shared/utils/nav.ts`.

## Audit findings

| Finding | Action |
|---|---|
| Each page called `useFetch('/api/status')` and re-ran sequential Docker/health probes | Shared key + payload reuse; Refresh still `refresh()` |
| Duplicated loading/error/empty and table markup | `AppAsyncPanel`, `AppDataTable` |
| Env crumbs were type-only; titles inconsistent | Customer in env crumbs; `Customer ·`, `Environment · name · TYPE`, `Hosting node ·` |
| Runtime tab invented “Database health” from `healthOk` | Row removed |
| Dead `.access` CSS; tables overflow on small screens | Removed; `.table-wrap` |
| Weak a11y on busy/error | Skip link, `aria-busy`, `aria-live` |
| `GET /api/environments` unused by UI | Kept (S3 + tests) |
| `observe.ts` sequential probes | Deferred (proven S3 on-demand health) |
| Client-only search/filter; no pagination | Left (inventory §1.8) |

## Improvements made

- Shared fleet fetch; Refresh/Relaunch/provision semantics unchanged
- Consistent index/workspace chrome
- Honest Runtime tab
- Skip link, table overflow, live regions
- Provision body helper (`provisionRequestBody`) — same four keys

## Tests added

Vitest only. 15 files / 34 tests (was 12 / 24).

- `tests/s5/nav.test.ts` — five nav links, active rules, workspace tabs
- `tests/s5/workspace.test.ts` — find by id / missing id
- `tests/s5/fleet-status.test.ts` — fetch key + cached payload helper
- `tests/s5/fleet.test.ts` — empty fleet, 12-row filter/type filter
- `tests/s5/provision-payload.test.ts` — uses `provisionRequestBody`

S3/S4 files re-run as regression (listen, registry, health, relaunch, provision-*). No backend service rewrite.

## Browser QA results

**Click-through in a real browser was not performed.** No browser automation tools in this session.

**HTML + API** against http://127.0.0.1:52100 (dev server):

- `/` — skip link, Needs Attention, no New customer, no Database health
- `/customers` — Acme + Strategic Insights + New customer + Search
- `/customers/5b3b4674-84df-440d-855b-113689bab69d` — SI workspace tabs
- SI PROD workspace — Runtime / Health + Relaunch; no Database health
- `/nodes` + laptop workspace
- `/customers/new` — S4 form
- Refresh: `GET /api/status`
- SI resume: `resumed=true`, same id, still 2 SI envs
- Relaunch Acme DEV: no `-v`; after wait, Acme DEV healthy

Live fleet at QA time also included **Still Beauty, LLC** PROD/DEV (6 envs). Observed only. Not a Beauty-template decision.

## Regression results

`control_plane`: `pnpm test` 15/34 pass; lint; typecheck; build. S3/S4 tests included. No backend defects found.

## Performance / query findings

- Frontend: one `GET /api/status` per full load; client navigation reuses payload until Refresh. No new write APIs. No cache product, jobs, or CDN.
- Backend: `observeRegisteredEnvironments` still probes each env sequentially. Fine for a handful of laptop envs. Do not parallelize or paginate without an inventory decision.
- `GET /api/environments` remains a lighter registry list; UI does not call it (needs health).

## Technical debt remaining

- No Vue component mount tests (`@vue/test-utils` not added)
- Settings is an empty placeholder
- Configuration tabs cannot edit (no APIs)
- Workspace default tab is Overview (Runtime content is client-tab only)
- Client search/filter only; no sort/pagination
- Still Beauty appeared on the laptop fleet without a documented template decision

## Unresolved items deferred (inventory / hard boundary)

Backup/restore, upgrades, rollback, image registry, remote nodes, node agents, capacity, operator auth, secrets redesign, DNS/hostnames/TLS/proxy/GoDaddy, billing/entitlements, extra environments, decommission, async provision, cleanup semantics, generic CRM extraction, Beauty template, SI dogfood conversion, public exposure, list scalability beyond current client filter.

## Files changed (hardening)

`control_plane/app/**` (layout, pages, new shared components, CSS, `useFleetStatus`), `control_plane/shared/utils/{fleet,nav,provision}.ts`, `control_plane/tests/s5/*`, `crm_saas_vault/{Home,Control-Plane,S3-Control-Plane-Runbook,S4-Provision-Runbook}.md`, `crm_saas_vault/wip/S5_Control_Plane_Productization_Status.md`, this note.

Did **not** commit sqlite, `data/provisioned/`, `.env`, or the inventory file body beyond linking it.

## Commit SHA(s) and push

| Work | SHA | Push |
|---|---|---|
| Operator UI (prior) | `f61bcdf`, `5c32a8f`, `0c0982d` | `working` |
| Hardening UI | `a3b9efe` | `working` |
| Tests | `3f5e399` | `working` |
| Docs + this audit | `e84d038` | `working` |
