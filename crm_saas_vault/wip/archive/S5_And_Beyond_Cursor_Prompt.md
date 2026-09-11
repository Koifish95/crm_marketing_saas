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

# S5 and beyond — Cursor prompt

Authority: Scott’s answers in [[wip/archive/Post_S4_Ten_Decisions]] plus Q4 checkboxes (one PROD, extra non-PROD now, decommission before VPS launch). Catalog: [[wip/archive/Post_S4_Foundation_Decision_Inventory]]. Do not re-litigate operator-shell items 1–10.

**Do not mark tentative S5 Successful** because leftovers or extras ship. Historical S5 (hostname/TLS) is still unset. Launch = first customer on the VPS.

## Current state

- S0–S4 Successful. Operator shell shipped (`control_plane/` at http://127.0.0.1:52100).
- Live data: `GET /api/status`. Mutations: customers POST, provision POST, relaunch POST.
- Runtime already classifies Docker as running / stopped / missing / unknown. Combined status still maps missing → stopped.
- SI, Acme, and any laptop Beauty rows are **test data** until VPS launch.

## Settled

- SI disposable until first VPS provision; then data must be safe. No backup work until that cutover.
- Laptop/desktop until launch; then dedicated VPS (provider TBD). Control plane stays local until then.
- Operator login required before the control plane leaves localhost. Until then: loopback, no auth.
- Exactly one PROD per customer, API-enforced.
- Extra non-PROD in-scope now (DEV / STAGE / UAT / TRAINING / named extras). No billing. No hostname.
- Decommission/archive before VPS launch. Not Stop. **Never** `down -v`.
- Missing ≠ Stopped.
- No slug edit until DNS. Other customer fields stay read-only until Q7 leftovers are answered.
- Sister is the second real pilot. Do not build the Beauty template in this prompt.
- Launch = first customer on the VPS.

## Unset (do not invent)

- Retry = continue vs rebuild vs both.
- Auto-delete of failed volumes: **default never**.
- Product domain / hostname strings.

## Hard stops

No GoDaddy, TLS, public URLs, backups, image registry, remote nodes, operator auth, Beauty extraction, treating SI as durable, `down -v`, prune, `webhosting_renzo_*` / leftover `renzo-*` volumes, force-push, laptop sqlite onto the Pi.

## Sprints

1. Missing status + one-PROD API + docs that still say extras wait for S6.
2. Operator adds one extra non-PROD on a customer workspace. Same local image, isolation, ports 52200–52999, gitignored env. Refuse second PROD.
3. Gated decommission: stop/remove process only; volumes stay; `lifecycleStatus` decommissioned; confirm copy. Customer decommission = all of that customer’s envs.

QA each sprint: `control_plane` `pnpm test`, `lint`, `typecheck`, `build`. Commit + push `working`. No secrets/sqlite/`data/provisioned/`.

Repo: `crm_marketing_saas`, branch `working`.
