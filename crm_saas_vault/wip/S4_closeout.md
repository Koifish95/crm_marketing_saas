---
type: note
status: current
area: process
updated: 2026-09-09
aliases:
  - S4 closeout
  - S4 handoff
tags:
  - wip
  - saas
  - s4
---

# S4 closeout and handoff

Definitive record of Milestone **S4 — Sales-led provision**. Written 2026-09-09.

**S5 was not started.**

Related: [[S4-Provision-Runbook]], [[Control-Plane]], [[wip/S3_closeout]], [[wip/S4_Implementation_Status]].

## 1. Successful

Operator action produces a new martial-arts PROD+DEV pair that the control plane shows as healthy. Doing it again uses the same procedure.

Live proof customer: **Strategic Insights Consulting, LLC** / `strategic-insights` (Scott’s business).

## 2. Live laptop proof (2026-09-09)

| Row | Id | Port |
|---|---|---|
| Customer | `5b3b4674-84df-440d-855b-113689bab69d` | — |
| PROD | `165919e5-2a57-4f26-beb0-d806034a18ed` | 52200 |
| DEV | `44a62387-142a-4f41-af53-801a9b2592a5` | 52201 |

- `GET /api/status`: Acme PROD/DEV **healthy** and SI PROD/DEV **healthy**
- SI PROD login `admin` / `setup` → `mustChangePassword: true`, redirect `/account/password`
- Second `POST /api/customers` for the same slug returned `resumed: true` and the same customer id
- Relaunch SI PROD without `-v`; after boot, all four rows healthy
- Acme `/api/health` stayed reachable
- Homepage HTML includes **Provision**, not Add-environment
- Browser click-through **NOT VERIFIED** (HTTP + login API used)

## 3. Architecture

```text
POST /api/customers          → registry + gitignored env files
POST /api/customers/:id/provision → local docker build + compose up
GET /api/status              → inspect + health (already S3)
POST /api/environments/:id/relaunch → registered-row compose recreate
```

Generic compose: `martial_arts_template/docker-compose.provisioned.yml`. Env files are absolute `--env-file` paths under `control_plane/data/provisioned/`. Image `martial-arts-acquisition:s4`.

## 4. QA

`control_plane/`: 10 files / 19 tests; lint, typecheck, build passed.  
`martial_arts_template/`: 67 files / 326 tests; lint, typecheck, build passed (sprint 4).

## 5. Lab-only

Ports 52200/52201, SI slug, unwrap `setup`, no operator auth, laptop Docker. Do not promote these to platform law.

## 6. S5 influence

Do not publish a hostname until the bootstrap password is changed. Image registry and extras UI stay later.

## 7. Sprints

| Sprint | SHA |
|---|---|
| 1 Contract | `a211513` |
| 2 Registry | `4d066d9` |
| 3 Env + compose | `3d81290` |
| 4 Seed flag | `89ae4d4` |
| 5 Runtime | `ad50499` |
| 6 UI | `94ae265` |
| 7 Closeout | (this commit) |
