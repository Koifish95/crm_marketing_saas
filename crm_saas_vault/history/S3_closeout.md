---
type: note
status: current
area: process
updated: 2026-09-09
aliases:
  - S3 closeout
  - S3 handoff
tags:
  - wip
  - saas
  - s3
---

# S3 closeout and handoff

Definitive record of Milestone **S3 — Control Plane v1**. Written 2026-09-09 from the repository, live laptop proof, and Git history.

**S4 was not started.** There is no provision/create-customer API or UI.

| Layer | Meaning |
|---|---|
| 1. Durable SaaS decisions | ADRs in [[SaaS-Decisions]] |
| 2. S3 implementation facts | What `control_plane/` does today |
| 3. Lab / testing defaults | `lab-acme`, ports 52040/52050/52100, `m10a-*` |
| 4. Deferred work | S4+ |

Related: [[S3-Control-Plane-Runbook]], [[Control-Plane]], [[history/S2_closeout]], [[wip/archive/S3_Implementation_Status]].

---

## 1. Objective and Successful criteria

Observe and safely relaunch environments that **already exist**. Official line:

> Open the control app and see environments, up/down (container running **and** `/api/health`), and relaunch without destroying volumes. The list reads “Customer B · production · healthy,” not a raw container id.

For this laptop that is **Acme BJJ · PROD · healthy** and **Acme BJJ · DEV · healthy**.

Not in S3: provision, domains, billing, ThePond, Pi/SSH.

---

## 2. Starting state

S0–S2 Successful. No `control_plane/` folder. S2 labs `lab-acme-prod` / `lab-acme-dev` already existed with isolated volumes and `martial-arts-acquisition:s2`. S2 used slugs only — no Customer/Environment IDs. CRM `/api/health` already returned `{ ok, app, timezone, database, appEnv }`.

Scott confirmed 2026-09-09: Nuxt, seed the two known labs, port 52100.

---

## 3. Architecture

```text
crm_marketing_saas/
├── martial_arts_template/     # CRM labs (unchanged in S3)
├── control_plane/             # NEW operator app
└── crm_saas_vault/
```

```text
Dashboard 127.0.0.1:52100
  → Registry SQLite
  → Health GET registered lab URLs
  → Local Docker adapter
       inspect exact container name
       compose recreate one project
```

No `nuxt-auth-utils`. No Docker socket in CRM containers. No pnpm workspace.

---

## 4. Data model

UUID primary keys on `customers`, `hosting_nodes`, `environments`.

Live laptop seed ids (this machine; not portable law):

| Row | Id |
|---|---|
| Customer Acme BJJ | `a00ba906-4eb9-4243-9670-99ce3abd0231` |
| Node laptop | `93932739-7e45-42e1-b4c3-267395a54cec` |
| PROD | `56f51de7-2a5f-41b1-a6b6-81a44539a1b1` |
| DEV | `65a9af9a-cc1b-4697-bdac-6ae12daa6c5d` |

Second `db:setup` keeps these ids (tested).

---

## 5. Health and relaunch

Healthy = `runtime === running` AND HTTP 200 AND `ok === true` AND `database === "reachable"`.

Relaunch argv (locked):

```text
docker compose --env-file <lab env or example> -f docker-compose.lab-acme-*.yml up -d --force-recreate --no-deps app
```

Refuses `-v`, prune, `down`, unknown slugs, leftover `renzo-*`, template-triple compose.

---

## 6. Live proof (2026-09-09)

1. Labs already running. Stamped both isolation markers.
2. Relaunched **PROD** through `relaunchRegisteredEnvironment`.
3. Markers still `m10a-prod-isolation` / `m10a-dev-isolation`.
4. Both containers `running` / `healthy`.
5. Both `/api/health` `ok` + `database: reachable`.
6. Control plane `GET /api/status` returned both **healthy** headlines.
7. Homepage HTML showed Refresh + Relaunch, no Provision.
8. Registry ids persisted across the Nitro start that created `control-plane.sqlite`.

Browser click-through of Refresh/Relaunch: **NOT VERIFIED** (no browser tools). HTTP + SSR HTML + `lab:docker get` used instead.

---

## 7. QA

From `control_plane/`:

| Command | Result |
|---|---|
| `pnpm test` | 6 files, **11 passed** |
| `pnpm lint` | passed |
| `pnpm typecheck` | passed |
| `pnpm build` | passed |

`martial_arts_template` was not modified; its suite was not re-run.

---

## 8. Git

Branch `working`. Origin https://github.com/Koifish95/crm_marketing_saas.git

| Sprint | SHA |
|---|---|
| 1 Skeleton | `5ae4e66` |
| 2 Registry | `ade96ed` |
| 3 Dashboard | `800ed64` |
| 4 Runtime | `29e9972` |
| 5 Health | `37d19da` |
| 6 Relaunch | `0ef11d0` |
| 7 Closeout | `cb2664c` |

---

## 9. Lab-only assumptions

Port 52100, 52040/52050, `m10a-*` markers, `crm.sqlite` inside lab volumes, America/Denver on labs, no operator auth, seed instead of a registration form. Do not promote these to platform law.

---

## 10. Debt / S4 influence

- Nitro production bundle should set `TEMPLATE_ROOT` / copy migrations if anyone runs `.output` instead of `pnpm dev`.
- No confirmation dialog on Relaunch (button is immediate).
- No persisted last-checked table (timestamp is per request).
- S4 must generate new IDs, not reuse `lab-acme` slugs blindly; must force password change on real customer PROD; must not `down -v`.
- Do not register Renzo or the template triple.

---

## 11. Acceptance table

| Criterion | Status |
|---|---|
| Separate `control_plane/` app | **PASS** |
| Own SQLite registry | **PASS** |
| Stable IDs; slugs not identity | **PASS** |
| lab-acme PROD/DEV seeded | **PASS** |
| Human headlines | **PASS** (`GET /api/status` + homepage HTML) |
| Exact container inspect | **PASS** |
| Health GET + combine | **PASS** |
| Refresh | **PASS** (API + HTML button; click NOT VERIFIED) |
| Relaunch without `-v` | **PASS** (service + live PROD recreate) |
| Markers / sibling persist | **PASS** |
| No Renzo / no template-triple | **PASS** |
| No provision | **PASS** |
| Runbook + closeout | **PASS** |
| Browser click-through | **NOT VERIFIED** |
| S4 not started | **PASS** |

---

## 12. Final status

**S3 is Successful** (2026-09-09).

**S4 was not started.**
