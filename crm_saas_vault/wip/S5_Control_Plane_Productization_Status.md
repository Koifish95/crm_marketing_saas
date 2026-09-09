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

**This work does not make tentative S5 Successful.** Milestone sequencing remains pending the Foundation Decision Inventory (`Post_S4_Foundation_Decision_Inventory.md` — **not in the repo**). Historical S5 is still “reachable customer access” in [[SaaS-Milestones]].

Related: [[wip/post_S4_prompt]], [[wip/Where_We_Are_Now_Post_S4_2026-09-09]].

## Tentative roadmap

S5 Control Plane Productization → S6 Fleet Reliability → S7 Hosting / Security / Remote Nodes → S8 Public Exposure → S9 Dogfood / Pilot Readiness → S10 Second Pilot / Template Expansion → S11 External Paying Customer Readiness.

Provisional only.

## Frontend architecture

Nuxt pages + `layouts/default.vue`. Live data from existing `GET /api/status`. Mutations unchanged (`POST /api/customers`, provision, relaunch). Client grouping in `shared/utils/fleet.ts`.

## Routes / components

- Layout: `app/layouts/default.vue` (Dashboard, Customers, Environments, Hosting Nodes, Settings)
- `useFleetStatus`, `shared/utils/fleet.ts`, `AppStatusBadge`, `AppPageHeader`, `AppWorkspaceTabs`, `AppSearchField`
- `/` still has the S4 provision form and environment cards
- Stub indexes for `/customers`, `/environments`, `/nodes`; Settings is a placeholder

## Existing functionality preserved

S3 registry, observe, Refresh, Relaunch. S4 provision semantics. No DNS/TLS/hostnames.

## Unresolved owner decisions

- Foundation inventory file missing; do not invent answers.
- Settings has nothing legitimate to manage yet (placeholder).
- No customer/environment edit APIs — configuration tabs stay read-only.

## Sprints

| Sprint | SHA | QA | Browser |
|---|---|---|---|
| 1 Shell | | | |
| 2 Dashboard | | | |
| 3 Customers | | | |
| 4 Environments | | | |
| 5 Nodes | | | |
| 6 Provision move | | | |
| 7 Consistency | | | |
