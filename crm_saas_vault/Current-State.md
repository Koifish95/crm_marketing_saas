---
type: note
status: current
area: process
updated: 2026-09-11
aliases:
  - CURRENT_STATE
  - Current state
tags:
  - saas
  - current
---

# Current state

In-place map of **what exists now** in `crm_marketing_saas`. Update this note in the same work that changes implementation, milestone status, or hard stops. Do not create dated “current state” snapshots here. Dated evidence lives in [[history/_index|history/]].

Chat is not the record. [[wip/_index|wip/]] is not this map. Code is implementation truth; this note is the declared map. If they conflict, investigate, then fix this note.

Orientation: [[Home]] → [[Working-Agreement]] → this file → [[SaaS-Milestones]] → [[SaaS-Decisions]] → [[Platform-Architecture]] → [[project-state.yaml]].

---

## Executive state

This repo is the **generic SaaS platform** plus its first industry product, the **Martial Arts** CRM. It was derived from the external Renzo gym app. Renzo is **not** a customer here and must not be managed, provisioned, or migrated from this tree.

| Layer | Status |
|---|---|
| Official S-track S0–S6 | **Successful** |
| Official S6 (fleet backup / restore / upgrade + start/stop) | **Successful** (2026-09-11). Evidence: [[history/S6_closeout]] |
| CRM Core + vertical ADR | **Accepted** |
| D1–D4 | **Accepted** (D1 schema **not** shipped) |
| C1 Core extraction | **Code-shipped**. Evidence: [[history/C1_CRM_Core_Architecture_Return]] |
| C2 / Sales / Beauty / S7–S11 | **Not started** |
| Sales pre-development architecture audit | **Complete** (2026-09-11, docs only). Evidence: [[wip/WO-2026-09-11-sales-predev-audit-return]]. Conclusion: **READY FOR SALES IMPLEMENTATION WORK ORDER**. Recommended first slice ID: **C2A** (new C-track row; do not reuse C2). No Sales package exists yet. |

**Authorized work:** none. The Sales audit work order is **done**. A Sales **implementation** work order has not been authorized. A roadmap “next” row is not permission. See [[Working-Agreement]] and [[Work-Order-Protocol]].

Lockfile: [[project-state.yaml]].

---

## Repository

| Item | Value |
|---|---|
| Repo | `C:\Users\Scoy9\Projects\crm_marketing_saas` |
| Branch | `working` |
| Remote | `origin` https://github.com/Koifish95/crm_marketing_saas.git (not `renzo-crm`) |
| `main` | first commit only — do not develop there |

```text
crm_marketing_saas/
├── pnpm-workspace.yaml          # packages/crm-core + martial_arts_template
├── package.json                 # root workspace stub; Node 22+; pnpm 10
├── packages/crm-core/           # @crm/core — C1 shipped
├── martial_arts_template/       # first vertical; local :5030; Docker :5000/:5010/:5020
├── control_plane/               # NOT in the workspace; http://127.0.0.1:52100
└── crm_saas_vault/              # this vault
```

**Runtime:** laptop Docker only. Control plane loopback, no operator auth. Health on demand. Never `docker compose down -v`, never prune, never attach `webhosting_renzo_*` / leftover `renzo-*` volumes. Do not copy laptop sqlite onto the Pi. Do not touch `Projects/renzo_crm` or Koi-Pi PRODUCTION.

**Image tags in use:** `martial-arts-acquisition:s2` (Acme lab) and `:s4` (provisioned). Names `crm-martial-arts` / `crm-sales` / `crm-beauty` are **target**, not current tags.

**Live sqlite caveat:** `control_plane/data/control-plane.sqlite` is gitignored. Source seeds **lab-acme**. Strategic Insights is the S4 laptop proof. A live registry may contain extra rows that are **not** in git. Do not promote live sqlite into product docs.

---

## Target vs implemented

**Target** (accepted, not fully implemented) — [[Platform-Architecture]], [[ADR-CRM-Core-Vertical-Architecture]], [[Customer-Environment]]:

```text
Customer Account / Organization
    ↓
Business / Product Instance     (exactly one vertical)
    ↓
Vertical Product                (Martial Arts | Sales | Beauty)
    ↓
Environments                    (exactly one PROD, default DEV, optional extras — same vertical)
```

CRM Core is shared infrastructure. Verticals compose on Core. One-way dependency: Vertical → Core only. Sequence: Core → Martial Arts → Sales as second consumer → prove shared abstractions → Beauty → then production VPS.

Official S-track still lists S7 (hosting/VPS) after S6. The Core ADR **changes that priority** (product family locally first). Both notes remain valid in their roles: [[SaaS-Milestones]] is the official S-track; the ADR is architecture law. Do not silently rewrite the S-track. C-track IDs are separate.

**Implemented:** the control plane still has `customers` + `environments` only. Today’s customer row is the commercial account **and** the only product instance. `industry_template` is stored and always written `martial-arts`. Provision creates one PROD + one DEV under that row. Exactly one PROD per **customer row** is the implemented invariant. `@crm/core` exists. Martial Arts consumes it. Control plane provision is still Martial Arts-only.

---

## What is implemented

### Martial Arts vertical (`martial_arts_template/`)

Full gym CRM derived from Renzo: households as `leads` + `lead_lines`, trials, intro `/trial`, follow-up, campaigns, events, marketing, settings, seed programs (`ADULT_BJJ` / `KIDS_BJJ`). Consumes `@crm/core` for brand, health, app-env, auth/users/RBAC **framework**, settings KV, shell/nav/settings/permission **registration**. Drizzle journal `0000`–`0020` remains in MA.

Local: http://localhost:5030 (`pnpm dev`). Laptop Docker PRODUCTION `:5000`, STAGE `:5010`, DEV `:5020`.

### CRM Core (`packages/crm-core`)

C1 units 1–3: pnpm workspace, thin Nuxt layer, ESLint/architecture test (Core must not import MA / sales / beauty), brand/health/app-env, auth/users/RBAC framework, settings KV, shell + registration. `control_plane` is **out** of the workspace. `martial_arts_template/` was **not** moved to `apps/`.

### Control Plane (`control_plane/`)

http://127.0.0.1:52100. Multi-page shell: Dashboard, Customers, Environments, Hosting Nodes, Settings. Observe + provision Martial Arts PROD+DEV. Extra non-PROD. Gated decommission (volumes stay). Retry = continue/resume. One-PROD API. Localhost `accessUrl`s. No operator login. Details: [[Control-Plane]].

### Environment lifecycle

| Action | Command / API | Notes |
|---|---|---|
| Relaunch | `up -d --force-recreate --no-deps app` | Recreate process, same volumes |
| Start | `compose start app` · `POST .../start` | Resume stopped. Not Relaunch. Missing excluded |
| Stop | `compose stop app` · `POST .../stop` | Halt process. Never sets `decommissioned` |
| Bulk start/stop | `POST .../bulk/start` · `.../bulk/stop` | Sequential; `{ scope: selected\|all, ids? }` |
| Decommission | `compose rm -f --stop app` | Sets `decommissioned`. Volumes stay |

Start All / Stop All = eligible **registered fleet**, not the table filter. Eligibility: [[Control-Plane]].

### Provisioning

Sales-led. `Customers → New customer` builds `martial-arts-acquisition:s4` from `martial_arts_template/Dockerfile` with **repo-root** context (so the image can `COPY packages/crm-core`). Compose up cwd stays `templateRoot()`. Runbook: [[S4-Provision-Runbook]].

### Backup / restore (official S6, Successful)

Lifecycle tab: same-host zip, gated restore, off-host copy to an existing folder, backup-gated local upgrade, Explorer reveal (`POST .../backup/reveal` with `{ backupId }`, path must stay under `data/backups/`). Retention 14 days. Runbook: [[S6-Fleet-Runbook]].

### Docker / runtime

Exact `docker inspect` + compose. Combined status: container running **and** `/api/health`. Distinct `stopped` vs `missing`. Forbidden: `-v`, `prune`, `down` on relaunch/start/stop.

---

## What is not implemented

Do not assume any of these exist:

- Sales / Software vertical (audit complete; implementation not started; recommended local shape `sales_template/` / `sales-crm` / :5040 — not created)
- Beauty vertical (sister business is the intended second **pilot**, not a shipped product)
- Completed generic Lead model in Core
- Generic Campaign / Event framework
- Generic public-capture framework
- Account → Product Instance database split
- Multi-product provisioning or a product picker
- VPS / remote nodes / image registry
- DNS / TLS / public hostnames / production edge
- Billing, Stripe, self-service signup
- Remote Control Plane auth (or any CP login)
- S-track rewritten around Core
- `martial_arts_template` moved to `apps/`
- Plugin framework, `tenant_id`, Beauty/Sales images

---

## Locked decisions

Link, do not re-litigate. Index: [[SaaS-Decisions]].

| Decision | Authority |
|---|---|
| Two tracks; Renzo is external | [[Working-Agreement]], [[Home]] |
| Vault is the durable record; wip is not | [[Working-Agreement]], [[Conventions]] |
| Official S-track; S0–S6 Successful | [[SaaS-Milestones]], [[SaaS-Decisions#2026-09-10 — Map B is the official post-S4 roadmap]] |
| S6 backup/restore/upgrade | [[SaaS-Decisions#2026-09-10 — S6 backup, restore, and upgrade]] |
| Core + vertical architecture | [[ADR-CRM-Core-Vertical-Architecture]] |
| D1–D4 | [[SaaS-Decisions#2026-09-11 — D1–D4: account vs product instance; wait on Core domain]] |
| Customer / environment unit | [[Customer-Environment]] |
| Never `-v` / prune / Renzo volumes | [[Control-Plane]] |
| Retry = continue/resume | IMM-02 in [[SaaS-Open-Questions]] |
| Display name editable; slug/timezone/email read-only | IMM-03 |
| Hostname shape `{slug}.{product-domain}`; domain unset | IMM-04 |

---

## Open questions

IMM-01–04 and NEAR-01–03 are **resolved / working**. Do not present them as open. Remaining: [[SaaS-Open-Questions]] (NEAR-04–10, DEF-02–08). C2 start is an **authorization** question, not an open architecture question.

---

## Hard stops

- No Renzo work. External app is `C:\Users\Scoy9\Projects\renzo_crm`. Do not touch Koi-Pi, `webhosting_renzo_*`, or live Renzo SQLite.
- This SaaS repo is not a license to manage Renzo.
- No VPS / DNS / TLS / public hostnames unless an active work order says so (official S8 / S7).
- No Sales or Beauty unless an active work order authorizes that sprint.
- No premature Core promotion (D2–D4 wait).
- No D1 schema rewrite unless authorized.
- No destructive Docker: never `down -v`, never prune, never attach Renzo volumes.
- No architecture that contradicts [[ADR-CRM-Core-Vertical-Architecture]].
- Do not `git push --force` to `main` / `master`. Commit one repo at a time, only when asked.
- Do not treat live laptop sqlite extras as official pilots.
- Do not infer permission from [[SaaS-Milestones]], an ADR, a plan, ChatGPT memory, or an archived prompt.

---

## Documentation map

| Topic | Authoritative document |
|---|---|
| Bootstrap / start | [[Home]] |
| How we work | [[Working-Agreement]] |
| Current implementation map | **this file** |
| Roadmap (S-track and C-track) | [[SaaS-Milestones]] |
| Decisions index | [[SaaS-Decisions]] |
| Platform architecture | [[Platform-Architecture]] |
| Core / vertical ADR | [[ADR-CRM-Core-Vertical-Architecture]] |
| State lockfile | [[project-state.yaml]] |
| Work authorization | [[Work-Order-Protocol]], [[wip/_index]] |
| Customer / environment | [[Customer-Environment]] |
| Control Plane | [[Control-Plane]] |
| Open NEAR/DEF | [[SaaS-Open-Questions]] |
| Historical evidence | [[history/_index]] |
| Renzo gym evidence | [[Implementation-State]], [[Milestones]], [[Architecture]], [[Decisions]] |

Renzo gym notes at the vault root are **historical evidence of the source implementation**, not SaaS law. [[Architecture]] is the Renzo/source stack. Platform architecture is [[Platform-Architecture]].
