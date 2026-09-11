---
type: note
status: current
area: saas
updated: 2026-09-10
tags:
  - wip
  - saas
  - closeout
---

# Post-S4 foundation decision closeout

Scott resolved IMM-01–04 and the dual-map conflict on 2026-09-10. This note records that documentation pass. Official S5 later became **Successful** the same day — see [[wip/S5_closeout]].

ADR: [[SaaS-Decisions#2026-09-10 — Map B is the official post-S4 roadmap]]. Briefing that was answered: [[wip/archive/Milestone_Map_Conflict_Decision]].

## Decisions accepted

- **Map:** B + ten-decision overlay. Official post-S4 roadmap.
- **Map A:** Historical documentation for S0–S4 history and the originally approved S5–S8 Successful lines. Do not rewrite those closeouts.
- **From S5 onward:** Map B supersedes Map A.
- **Official S5:** Control Plane Productization / Operations Foundation. Later **Successful** (2026-09-10) — [[wip/S5_closeout]].
- **IMM-02:** Retry = continue/resume. Preserve volumes. Never silent rebuild. Rebuild later, gated, separate.
- **IMM-03:** Display name may be edited. Slug, timezone, admin email stay read-only.
- **IMM-04:** Hostname shape `{slug}.{product-domain}`. Product domain unset. No DNS/TLS now.
- **Launch:** VPS cutover ≠ commercial launch. Commercial launch = first real external customer on the production VPS, launch-ready (official S11).
- **Backups:** Laptop SI remains disposable. Do not build fleet backup to protect laptop test data. Design backup around production hosting (official S6).

## Files updated

- [[SaaS-Milestones]] — official Map B table/sequence; official S5–S11; Map A moved to historical section
- [[SaaS-Decisions]] — 2026-09-10 ADR
- [[Working-Agreement]] — next decision / do-not-start
- [[SaaS-ToDo]] — official S5 gaps; S6+ later
- [[wip/Clean_Starting_Point_Decision_Backlog]] — IMM-01–04 resolved
- [[Home]], [[Control-Plane]], [[wip/archive/S5_Control_Plane_Productization_Status]], [[wip/archive/Milestone_Map_Conflict_Decision]], [[wip/_index]] — live “next S5” wording aligned

Not rewritten (evidence): `wip/S2_closeout`, `wip/S3_closeout`, `wip/S4_closeout`, `wip/archive/post_S4_prompt`.

## New official roadmap

```text
S0–S4 Successful (laptop proofs)
S5 Control Plane Productization / Operations Foundation  — Successful (later same day)
S6 Fleet Reliability / Lifecycle
S7 Hosting / Security / Remote Nodes
S8 Public Exposure
S9 Dogfood / Pilot Readiness
S10 Second Pilot / Template Expansion
S11 External Paying Customer Readiness  — commercial launch
```

## Historical roadmap treatment

2026-09-08 Map A (S5 hostname → S6 backup → S7 dogfood → S8 live) is preserved under [[SaaS-Milestones#Historical 2026-09-08 map (Map A)]]. Historical S5 work is official S8. Historical S6 backup remainder is official S6 (extras already shipped). Historical S7 is official S9. Historical S8 is official S11 plus VPS hosting.

## IMM-01 through IMM-04 disposition

| ID | Status | Disposition |
|---|---|---|
| IMM-01 | Resolved | Map B official. Next implementation not started. |
| IMM-02 | Resolved | Continue/resume. Retry UI implemented. |
| IMM-03 | Resolved | Display name may be edited (not an S5 gate). Slug/timezone/email read-only. |
| IMM-04 | Resolved (shape) | `{slug}.{product-domain}`. Domain string unset. NEAR-07 still owns provider/TLS. |

## Current S5 status

**Successful** (2026-09-10). See [[wip/S5_closeout]].

Shipped: operator shell; Dashboard + Needs Attention + missing; workspaces; `/customers/new`; Refresh/Relaunch; extra non-PROD; gated decommission; one-PROD API; localhost access URLs; continue/resume Retry UI; owner browser/Docker pass; unit/API tests.

## Exact remaining S5 acceptance gaps

None. Both gaps closed:

1. Continue/resume Retry in the UI — implemented.
2. Owner acceptance pass — accepted by Scott 2026-09-10.

Not S5 gates: display-name edit; Settings placeholder; pagination; audit log; DNS; backups; auth.

## Next roadmap decision

S5 is Successful. Next implementation is official S6 only if Scott asks. Do not start S6 on this note.

## QA / document consistency

Official notes should say Map B is official and S5 is Successful. Do not start S6 unless asked.

## Git

| Item | Value |
|---|---|
| Commit SHA | `dcaaa10` (`dcaaa10ce8428f79418a9df633c26e93b11c9470`) |
| Push | `origin/working` at `72ff2aa` (2026-09-10) |
| Scope | Vault planning notes only. No `control_plane/` code. |
