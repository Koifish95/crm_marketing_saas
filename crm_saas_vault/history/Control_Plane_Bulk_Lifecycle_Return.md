---
type: note
status: historical
area: saas
updated: 2026-09-11
tags:
  - history
  - saas
  - control-plane
  - handoff
---

# Control Plane bulk lifecycle — return

**Historical evidence.** Official S6 was later marked **Successful**. Live map: [[Current-State]]. Eligibility facts were promoted into [[Control-Plane]].

Bulk Start / Stop on `/environments`, plus a real single-environment Start. Written before official S6 Successful.

Spec: Environments table selection, sequential Docker, partial results. Recreate stays on Relaunch. Missing containers stay out of Start.

## Implementation

- Single Start: `docker compose … start app` via `POST /api/environments/:id/start`. Lifecycle **Start** on the environment page. Same `assertSafeRelaunch` + forbidden `-v` / `prune` / `down`.
- Bulk: `POST /api/environments/bulk/start` and `…/bulk/stop` with `{ scope: 'selected' | 'all', ids? }`. `all` uses registered fleet eligibility and ignores client ids.
- Sequential `for` loop. No `Promise.all` over Docker. One `observeRegisteredEnvironments` snapshot after the loop.
- Environments table: visible-row checkboxes, header select-all for the current filter, Start/Stop Selected, Start All / Stop All. Filter/type change clears selection.

## Eligibility

| Action | Eligible | Refused / skipped |
|---|---|---|
| Start | `lifecycleStatus` not `decommissioned` / `provisioning` / `failed`, status `stopped` | already running; `missing`; `unknown`; retryable |
| Stop | not decommissioned; runtime `running` or status healthy/unhealthy | stopped / missing / unknown; decommissioned |

`compose start` cannot resume a gone container. Recreate is Relaunch only. Stop never sets `decommissioned`. Unregistered selected ids are per-row `failed` and do not abort the rest.

## Concurrency

Laptop Docker only. One compose action at a time. Partial success: one failure does not roll back others. Client never sends container names, compose paths, or shell.

## QA

Contract tests: start/stop args are `start app` / `stop app` with no `-v` / `down` / `prune` / `rm` / `--force-recreate`; identity and volumes stay out of the command; visible header-select; Start All / Stop All = eligible registry; unknown ids fail without abort; observe after the loop.

Gates in `control_plane/`: `pnpm test` 18 files / 68 tests; `pnpm lint`; `pnpm typecheck`; `pnpm build`.

No browser-click tools in this session. Substitutes against http://127.0.0.1:52100:

- GET `/environments` 200 with Start Selected, Stop All, and visible select-all
- POST `/api/environments/bulk/start` `{ scope: selected }` without ids → 400
- POST selected unknown id → per-row `failed` (`Environment not registered.`) and a reconciled fleet snapshot
- Live selected start then stop of `strategic-insights-dev` → `ok` / Started, then `ok` / Stopped. Left stopped.

Did not click checkboxes, filter-clear, or Stop All confirms in a browser. Do not claim a full UI pass.

## Deviations

None material. Stop All is `secondary` plus a confirm checkbox and a count confirm so it is harder to fire than Stop Selected (count confirm only).

## Git

Three commits on `working` after gates. Do not mark S6 Successful.

Related: [[Control-Plane]], [[history/S6_Implementation_Status]], [[wip/_index]].
