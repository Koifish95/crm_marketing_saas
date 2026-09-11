---
type: note
status: current
area: process
updated: 2026-09-10
aliases:
  - S5 closeout
  - S5 handoff
tags:
  - wip
  - saas
  - s5
---

# S5 closeout and handoff

Definitive record of Milestone **S5 — Control Plane Productization / Operations Foundation** (official Map B). Written 2026-09-10.

**S6 was not started.**

Related: [[SaaS-Milestones]], [[Control-Plane]], [[wip/S5_Control_Plane_Productization_Status]], [[SaaS-Decisions#2026-09-10 — Official S5 is Successful]].

## 1. Successful

An operator can run the laptop fleet from the multi-page control plane with honest status (including missing), search/filter, Refresh/Relaunch, extra non-PROD, gated decommission, one-PROD enforcement, and continue/resume Retry — accepted by Scott in a real browser on http://127.0.0.1:52100 with live Docker up.

## 2. Live laptop proof (2026-09-10)

| App | Port |
|---|---|
| Control plane | 52100 |
| Acme PROD / DEV | 52040 / 52050 |
| Strategic Insights PROD / DEV | 52200 / 52201 |

- Shell: Dashboard, Customers, Environments, Hosting Nodes, Settings placeholder
- SI Relaunch without `-v`; siblings stayed up
- Extra non-PROD added; no second PROD
- Gated decommission of the throwaway extra; volumes left in place; SI/Acme stayed healthy
- Continue/resume Retry UI on customer and environment workspaces (`POST /api/customers/:id/provision`, `POST /api/environments/:id/provision`)
- Display-name edit was not required (IMM-03 “may”, not a gate)

## 3. Not in S5

DNS/TLS, public hostnames, fleet backup, operator auth, VPS, Beauty, billing, server pagination, silent rebuild.

## 4. Git

| Item | Value |
|---|---|
| Commit SHA | `3c992b5` (`3c992b5ce561c899292996eeac16a5223265e448`) |
| Push | *filled after push* |
| Scope | Retry UI in `control_plane/` plus vault Successful record. No secrets, sqlite, or `data/provisioned/`. |
