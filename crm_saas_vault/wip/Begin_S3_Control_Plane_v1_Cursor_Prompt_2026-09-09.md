# Cursor Execution Prompt — S3 Control Plane v1

Updated 2026-09-09 with repository facts from S2 closeout and `martial_arts_template`. This is an **execution prompt**. Do not treat older ChatGPT-only drafts as truth when this file and the vault disagree.

**This prompt is for Plan, then Agent.** Do not start S4. Do not reopen S2 unless an S3 defect proves an S2 assumption invalid.

---

## Mission

Begin and complete **Milestone S3 — Control Plane v1** in:

`C:\Users\Scoy9\Projects\crm_marketing_saas`

S0, S1, and S2 are Successful. S2 is closed. Official S3 Successful (durable wording wins):

> Open the control app and see environments, up/down (container running **and** `/api/health`), and relaunch without destroying volumes. The list reads “Customer B · production · healthy,” not a raw container id.

For this repo that means: open the control app and see **Acme BJJ · PROD · healthy** and **Acme BJJ · DEV · healthy** (wording equivalent), then relaunch one lab environment without `-v`.

**S3 is observation and safe lifecycle of environments that already exist.**

**S3 is not provisioning.** Creating a new customer/environment is S4.

Develop only through S3 Successful, then QA, document, commit, push, and STOP.

This Cursor window’s workspace default is often Renzo. **This task is `crm_marketing_saas` only.** Do not open or edit `C:\Users\Scoy9\Projects\renzo_crm`, `WebHosting/`, or ThePond unless Scott names them (he has not).

---

## Locked engineering defaults

Scott confirmed 2026-09-09: **Nuxt**, **seed the two known labs on first setup**, **port 52100**. Do not re-ask. Do not treat these as open.

| Topic | Lock |
|---|---|
| App location | New folder `control_plane/` next to `martial_arts_template/` and `crm_saas_vault/`. Own `package.json`. **Not** a pnpm workspace unless a tiny one is strictly required. **Not** a page inside the CRM. **Not** a new Git remote. |
| Stack | Same family as the template: **Nuxt 4 + Nitro + Vue + Drizzle + SQLite + pnpm + Node 22+ + Vitest**. Confirmed. No Python, no Express, no PostgreSQL, no separate control-plane Docker for S3 (run `pnpm dev` on the laptop). |
| Listen | Bind **127.0.0.1** only. Port **52100** (confirmed). Avoids 3000, 5000/5010/5020/5030, lab 52040/52050, and Windows excluded ~50360–50759. If 52100 cannot bind, pick another free port **outside** that list and record it. |
| Operator auth | **None** for S3. Laptop-only. Record the assumption. Do not build customer/tenant auth. |
| Registration | **Explicit seed on first setup** for the two known `lab-acme` environments + one `laptop` node (confirmed). No registration form required. **No** `docker ps` auto-discovery. **No** registering leftover `renzo-*` or the template triple. |
| Relaunch | Same semantics as `pnpm lab:docker <lab-acme-prod\|lab-acme-dev> recreate`: `docker compose --env-file <lab env> -f docker-compose.lab-acme-*.yml up -d --force-recreate --no-deps app`. **Not** `docker restart`. **Not** `compose down` (with or without `-v`). **Not** `env:up` / `env:restart`. |
| CRM code | Do **not** modify `martial_arts_template` unless a proven S3 blocker requires it (existing `/api/health` is enough). Do not add Customer ID to health. Do not add `tenant_id`. Do not change seed, `/trial` hide, or lab compose. |
| Shell | Windows PowerShell: chain with `;`, not `&&`. Use `pnpm`, not npm. |
| Git | Branch `working`. Origin `https://github.com/Koifish95/crm_marketing_saas.git`. No force-push. Do not stage `.env`, sqlite, uploads, `.nuxt`, `node_modules`, secrets. Leave **pre-existing dirty non-S3 files unstaged** (including leftover S2 closeout edits if they are not part of this pass). |

---

# 1. Read first

Before changing code, read in order:

1. `crm_saas_vault/Home.md`
2. `crm_saas_vault/Working-Agreement.md`
3. `crm_saas_vault/SaaS-Milestones.md` — S3
4. `crm_saas_vault/Customer-Environment.md` — S1 contract; obey, do not reopen
5. `crm_saas_vault/wip/S2_closeout.md` — definitive S2 handoff
6. `crm_saas_vault/S2-Hand-Boot-Checklist.md`
7. `crm_saas_vault/SaaS-Decisions.md` — especially 2026-09-09 S3 owner decisions
8. `crm_saas_vault/Control-Plane.md`
9. `crm_saas_vault/SaaS-ToDo.md`
10. `crm_saas_vault/wip/answers.md` — S3.2, S3.3, S3.20, S3.28–S3.30 already Answered; do not re-ask
11. `crm_saas_vault/wip/Renzo_to_Generic_Martial_Arts_Sanitization.md` — naming after S2
12. These implementation files (do not “audit the whole template”):
    - `martial_arts_template/scripts/lab-docker.mjs`
    - `martial_arts_template/docker-compose.lab-acme-prod.yml`
    - `martial_arts_template/docker-compose.lab-acme-dev.yml`
    - `martial_arts_template/server/api/health.get.ts`
    - `martial_arts_template/.env.lab-acme-prod.example`
    - `martial_arts_template/.env.lab-acme-dev.example`

If an older note conflicts with a newer ADR or `S2_closeout.md`, use the newer source and record the discrepancy.

`wip/answers.md` “Suggested next action” still says stop before S2 — **stale**. Ignore it.

---

# 2. Closed milestones / current state

## S0 — Successful

This repo is `crm_marketing_saas`, not `renzo-crm`. Origin as above.

## S1 — Successful

Obey [[Customer-Environment]]. Do not redesign. Remember:

- Stable Customer ID and Environment ID (S2 used **slugs only** — S3 must generate real IDs).
- Exactly one PROD per customer.
- Independent sqlite + assets per environment.
- Health = process running **and** `/api/health` app + DB reachable.
- Control plane is the authority for identity, placement, version.
- Docker is the current mechanism, not permanent law.
- Stop ≠ delete. S3 does not implement delete.

## S2 — Successful (facts, not law)

Existing **lab** proof (not a paying customer, not Renzo):

| Field | PROD | DEV |
|---|---|---|
| Customer slug | `lab-acme` | `lab-acme` |
| Display | Acme BJJ | Acme BJJ |
| Env slug | `lab-acme-prod` | `lab-acme-dev` |
| Type | PROD | DEV |
| `APP_ENV` | `production` | `dev` |
| Compose project | `lab-acme-prod` | `lab-acme-dev` |
| Compose file | `docker-compose.lab-acme-prod.yml` | `docker-compose.lab-acme-dev.yml` |
| Container | `lab-acme-prod-app` | `lab-acme-dev-app` |
| Network | `lab-acme-prod-net` | `lab-acme-dev-net` |
| Host health | http://127.0.0.1:52040/api/health | http://127.0.0.1:52050/api/health |
| Publish | `52040:5000` | `52050:5000` |
| SQLite volume | `lab-acme-prod-sqlite` | `lab-acme-dev-sqlite` |
| Assets volume | `lab-acme-prod-assets` | `lab-acme-dev-assets` |
| Isolation marker | `m10a-prod-isolation` | `m10a-dev-isolation` |
| In-volume sqlite file | `crm.sqlite` | `crm.sqlite` |

Current operator image: `martial-arts-acquisition:s2`.  
Original 2026-09-09 proof image was `renzo-acquisition:m10a` — keep that in archives; do not rewrite evidence.

Helper: from `martial_arts_template`, `pnpm lab:docker <slug> <build\|up\|stamp\|get\|recreate\|ps>`. It already refuses `-v`, `--volumes`, `prune`, `down`, and non-`lab-acme-*` slugs.

Prefer these two environments as the first registered rows. **Do not invent a third lab customer** to prove S3.

### Do not register / do not control

- External Renzo (`Projects/renzo_crm`, Koi-Pi, `webhosting_renzo_*`)
- Leftover laptop volumes/containers named `renzo-*`
- Local **template triple** from `pnpm env:up`: `martial-arts-prod` / `stage` / `dev` on 5000/5010/5020
- Historical host Nitro labs (`pnpm lab … serve` on `data/lab-acme-*/`). S3 talks to **Docker labs only**.

### Lab facts that are not SaaS law

America/Denver, placeholder admin passwords, `mustChangePassword: false`, `m10a-*` marker names, `crm.sqlite` inside the volume (template default sqlite is now `app.sqlite`), `APP_ENV=production` on a laptop lab. Store what you need to operate; do not promote these to ADRs.

`/trial` is hidden until an enabled intro rule exists. **Green `/api/health` does not mean the public form is live.** Do not treat a 404 `/trial` as Unhealthy.

---

# 3. Renzo is external

Do not register, provision, health-check, relaunch, or mention as a fleet customer:

- `C:\Users\Scoy9\Projects\renzo_crm`
- Koi-Pi
- `webhosting_renzo_*`
- `app.renzogracieutah.com` and stage/dev twins
- Renzo remotes

Do not attach, migrate, delete, or prune leftover laptop `renzo-*` Docker resources.

“Protect Renzo” means do not touch the external project / Pi volumes. It does **not** freeze copied strings in this repo.

First intended real pilots (context only, **do not provision**): Strategic Insights; Scott’s sister’s business.

---

# 4. S3 product goal

```text
crm_marketing_saas/
├── martial_arts_template/   # existing CRM (do not treat as the control plane)
├── control_plane/           # NEW — operator app
└── crm_saas_vault/
```

The control plane answers:

- Which customers are registered?
- Which environments does each have?
- Which Hosting Node (S3: one row, `laptop`)?
- Type (PROD / DEV)?
- Expected image/version (record `martial-arts-acquisition:s2` plus optional git SHA of this repo)?
- Is the **exact registered container** running?
- Does `/api/health` say `ok` and `database: "reachable"`?
- When was health last checked?
- Can I relaunch this one environment without destroying volumes?

Favor a simple operational dashboard. This is not a Docker Desktop clone with names taped on.

Official list copy shape: **“Acme BJJ · PROD · healthy”**, not `lab-acme-prod-app`.

---

# 5. Already-decided owner decisions

From [[SaaS-Decisions]] 2026-09-09:

- Same SaaS repo, separate `control_plane/` folder. No new remote. Not inside a customer CRM.
- S3 proof is **laptop-only**.
- First node mechanism: **local Docker** on the operator laptop. No SSH, no agent. CRM containers never receive a Docker socket.
- Health for Successful is **on-demand** (page load / explicit refresh). No 30–60s poll required.
- Manual registration is enough.
- Provisioning is forbidden (S4).
- Relaunch = recreate process, remount same volumes; never `down -v`.

---

# 6. S3 Successful — finish line

Durable one-liner in `SaaS-Milestones.md` wins if this list fights it. Implementation bar for this pass:

1. `control_plane/` exists and runs locally on 127.0.0.1:52100 (or recorded fallback).
2. Own SQLite (or equivalent) **separate** from every CRM database. Suggested path: `control_plane/data/control-plane.sqlite` (gitignored).
3. Customers, Hosting Nodes, Environments with **generated stable IDs**. Slugs, display names, container names, compose project names, and `m10a` markers are attributes, not primary keys.
4. `lab-acme` + laptop node + PROD + DEV are explicitly registered.
5. UI shows both in human-readable form (Acme BJJ · PROD/DEV · status).
6. Runtime check uses the **exact** registered container name (`lab-acme-prod-app` / `lab-acme-dev-app`), not a substring search across `docker ps`.
7. Health GET uses the registered health URL with a short timeout. Parse `ok === true` and `database === "reachable"`. Do not parse `app` as identity (`app` is “Acme BJJ Acquisition” from env).
8. Distinguishes at least: **Healthy** (running + health ok), **Stopped** (container not running), **Unhealthy** (running but health fail/timeout/DB not reachable). Optional: **Unknown** if Docker engine is unreachable — do not call that Unhealthy-app.
9. Last-checked timestamp; explicit Refresh.
10. Relaunch one registered lab env via the locked recreate semantics.
11. Target volumes unchanged; isolation marker persists (`pnpm lab:docker <slug> get`); sibling stays healthy / not relaunched.
12. No Renzo / `renzo-*` / template-triple control.
13. No provision / create-environment UI or API.
14. Runbook + implementation status + closeout written.
15. S4 not started.

---

# 7. Minimum data model

```text
Customer
- id (stable, generated)
- slug          # lab-acme — changeable later
- displayName   # Acme BJJ
- industryTemplate  # martial-arts (optional string)

HostingNode
- id (stable, generated)
- name          # laptop
- kind          # laptop
- driver        # local-docker  (S3 only; future SSH/agent is not implemented)

Environment
- id (stable, generated)
- customerId
- hostingNodeId
- type          # PROD | DEV  (code must allow later types; UI may only show these two)
- displayName   # PROD / DEV
- slug          # lab-acme-prod — not the id
- containerName # lab-acme-prod-app
- composeProject
- composeFile   # path relative to martial_arts_template
- healthUrl     # http://127.0.0.1:52040/api/health
- sqliteVolume
- assetsVolume
- expectedImage # martial-arts-acquisition:s2
- isolationMarker  # verification aid only
```

Runtime/health/lastChecked are **observed**, not source of truth. Persist last-checked if useful; do not persist “is running” as if it were inventory.

Do not build Provisioning / Updating / Failed. Do not implement delete/decommission.

Never store CRM ADMIN passwords, session seals, or Meta tokens in the control-plane DB.

---

# 8. Registered vs runtime

A registry row is a claim: “this environment should be this container, these volumes, this health URL.”

Docker inspect / compose ps tells whether that container exists and is running.

`GET /api/health` tells whether the app and its sqlite are reachable.

Do not assume registered = running, running = healthy, or healthy = `/trial` published.

If registry and runtime disagree, **show both**. Do not delete volumes to “fix” it.

---

# 9. Health contract (existing CRM)

`martial_arts_template/server/api/health.get.ts` already returns:

```json
{
  "ok": true,
  "app": "<NUXT_PUBLIC_APP_NAME>",
  "timezone": "<NUXT_PUBLIC_TIMEZONE>",
  "database": "reachable",
  "appEnv": "production" | "dev" | "stage"
}
```

Healthy:

```text
registered container exists AND state running
AND HTTP 200
AND body.ok === true
AND body.database === "reachable"
```

Examples:

- container stopped → Stopped
- running + health ok → Healthy
- running + timeout / 5xx / `ok` false / DB not reachable → Unhealthy
- Docker engine down → Unknown (optional), not “Acme is Unhealthy”

Timeouts: short (a few seconds). No background poller.

Do not change the CRM health payload to embed platform IDs.

---

# 10. Runtime adapter

Do not scatter `docker` / `spawn` through Vue pages.

```text
Control Plane
├── Registry (own SQLite)
├── Health Service (HTTP GET registered URL)
└── Runtime Adapter
    └── Local Docker (S3) — only allowlisted registered metadata
        └── Future remote node (NOT IMPLEMENTED)
```

S3 adapter may:

- `docker inspect` the exact `containerName`
- invoke the same compose recreate as `lab-docker.mjs` (cwd = `martial_arts_template`, env-file + compose file from the registry row)
- optionally call `pnpm lab:docker <slug> get` for marker proof

It must not:

- mount a Docker socket into any CRM container
- accept an arbitrary container name from the query string and run it
- `docker compose down`, `-v`, prune, or wildcard stop/rm
- control anything not in the registry

Coupling to `martial_arts_template` compose files is **acceptable for S3** because those are the only registered environments. Document it as lab-node configuration, not “the platform owns CRM compose forever.”

---

# 11. Relaunch safety

Highest-risk S3 action.

Must:

- target exactly one registered Environment ID;
- use that row’s compose file, env file, and container name;
- `up -d --force-recreate --no-deps app` only;
- preserve the four `lab-acme-*` volumes;
- recheck runtime + `/api/health` afterward;
- leave the sibling compose project untouched.

Proof sequence (PROD relaunch is the usual choice):

1. `pnpm lab:docker lab-acme-prod get` and `lab-acme-dev get` (or adapter equivalent)
2. Record volume names, markers, sibling health
3. Relaunch via control plane
4. Target returns Healthy
5. Markers unchanged; unique volume contents unchanged
6. DEV still Healthy and was not recreated

If labs are not running at the start of a sprint, start them with `pnpm lab:docker lab-acme-prod up` and `… lab-acme-dev up`. **Do not** `down -v`. **Do not** rebuild unless the `martial-arts-acquisition:s2` image is missing. **Do not** `pnpm env:up`.

---

# 12. Destructive command policy

Never execute:

- `docker compose down` or `down -v`
- `docker volume prune` / `docker system prune`
- broad `docker rm` / wildcard `docker stop`
- deletion of customer sqlite/assets
- `git clean -fdx`
- anything against external Renzo or leftover `renzo-*` volumes

S3 does not implement delete/decommission.

---

# 13. Auth / exposure

Laptop-only. Bind 127.0.0.1. No public DNS/TLS. No unauthenticated Docker-control API on a LAN/public interface.

No operator login for S3. Record that in the runbook.

---

# 14. UI scope

One functional dashboard is enough:

- customer display name
- environment type + display
- hosting node name
- expected image
- runtime (running / stopped / missing)
- combined health
- last checked
- Refresh
- Relaunch (confirm if cheap; not a provision wizard)

No billing, onboarding, template marketplace, Beauty, CRM features, or analytics.

---

# 15. Manual registration

On first control-plane `db:setup` (or an explicit `pnpm register:lab-acme` script), insert:

- Customer `lab-acme` / Acme BJJ
- Node `laptop` / local-docker
- Env PROD and DEV with the table in §2

Idempotent: running setup twice must not duplicate IDs or create a second PROD.

Never scan Docker and insert whatever is there.

---

# 16. Suggested sprint plan (commit breakpoints)

Follow Working-Agreement. Each sprint: do the work, QA, commit **only that sprint’s files**, push `working`, update `wip/S3_Implementation_Status.md`.

Do not expand a sprint into CRM refactors or S4.

## Sprint 1 — Skeleton + status note

- Confirm git (`working`, origin).
- Inspect only the files in §1.
- Create `control_plane/` Nuxt skeleton, 127.0.0.1:52100, own gitignore for `data/`.
- Create `crm_saas_vault/wip/S3_Implementation_Status.md` (stack, adapter, health, deviations).

QA → commit → push.

## Sprint 2 — Registry

- Drizzle schema + migrate for Customer / HostingNode / Environment.
- Generated IDs.
- Idempotent lab-acme seed/register.
- Prove registry survives control-plane restart.

QA → commit → push.

## Sprint 3 — Read-only dashboard

- Human-readable inventory from the registry only.
- No Docker mutation.
- Show IDs in a secondary/debug way if useful; headline is Acme BJJ · PROD, not container id.

QA → commit → push.

## Sprint 4 — Runtime observation

- Local Docker adapter: inspect exact registered containers.
- Surface running / stopped / missing.
- No auto-registration.

QA → commit → push.

## Sprint 5 — Application health

- On-demand GET healthUrl.
- Combine into Healthy / Stopped / Unhealthy (+ optional Unknown).
- Last-checked + Refresh.
- Prove an Unhealthy or error path if you can do it safely (stop a container **without** `-v`, or point a test at a closed port). Do not destroy volumes to create Unhealthy.

QA → commit → push.

## Sprint 6 — Safe relaunch

- Relaunch button/API for a registered Environment ID.
- Locked compose recreate only.
- Marker + sibling proof as in §11.
- Browser-exercise the dashboard and relaunch if browser tools are available; if not, say so and use HTTP + `lab:docker get`.

QA → commit → push.

## Sprint 7 — Runbook + acceptance + closeout

- Write `crm_saas_vault/S3-Control-Plane-Runbook.md`.
- Finish `wip/S3_Implementation_Status.md` and `wip/S3_closeout.md` (same thoroughness as `wip/S2_closeout.md`).
- Update `SaaS-Milestones.md`, `SaaS-ToDo.md`, `Control-Plane.md` if implementation clarifies architecture.
- Add ADRs to `SaaS-Decisions.md` **only** for genuine new durable choices.
- Mark S3 Successful only after the §18 live proof.
- Update `wip/_index.md` to point at the S3 closeout.

QA → commit → push → STOP.

---

# 17. Mandatory sprint loop

1. Only that sprint.
2. Review changed files.
3. QA (`pnpm test`, `lint`, `typecheck`, `build` in `control_plane/`). Do **not** require a full `martial_arts_template` suite unless you touched it (you should not).
4. Fix or revert failures before proceeding.
5. Never push knowingly red work.
6. Commit only sprint files. Do not mix leftover S2 vault dirt.
7. Push `working`.
8. Update S3 status note.
9. Continue only if passed and S3 is not already Successful.

If blocked on a consequential product decision that cannot be derived: record options + recommendation in `S3_Implementation_Status.md`, then continue unrelated safe S3 work. Do not invent S4 provision rules.

PowerShell: `cd control_plane; pnpm test` — not `&&`.

---

# 18. Final live acceptance (required)

Before marking Successful:

1. Labs up via `lab:docker … up` if needed (no `-v`).
2. Start control plane; open http://127.0.0.1:52100.
3. See Acme BJJ, PROD, DEV, laptop.
4. Refresh; both Healthy when they actually are.
5. Record volume names + isolation markers + sibling health.
6. Relaunch **one** environment from the control plane.
7. Target returns running + Healthy; volumes/markers persist; sibling Healthy and not relaunched.
8. Restart the control plane; registry still has the same IDs (not re-created as new rows).
9. Confirm no Create/Provision action exists.
10. Confirm no Renzo / `renzo-*` / template-triple rows.

Criterion board: PASS / FAIL / **NOT VERIFIED**. Never invent output. Never silently upgrade NOT VERIFIED to PASS.

API tests are not browser QA. If you did not click the dashboard, say so.

---

# 19. QA / evidence / git

**QA:** control-plane test/lint/typecheck/build. Runtime evidence as in §18.

**Git before work:** `git status`, branch, remotes, confirm origin. Checkout `working` (create from `origin/working` if needed). Never add a Renzo remote. Never commit control-plane sqlite or lab env files.

**Do not commit** filled `.env`, `*.sqlite`, uploads, backups, `.obsidian`, `.nuxt`.

---

# 20. Hard scope stops

Do **not** implement:

- provision / create customer / create environment / “boot a third academy”
- onboarding, template picker, entitlements, Stripe
- DNS / TLS / public hostname
- Pi, SSH, agent, VPS, ThePond replacement
- PROD→DEV copy-down, fleet backup product, upgrade/rollback system
- Beauty template
- Strategic Insights or sister-business provision
- delete/decommission
- CRM `tenant_id`, health-payload identity, `/trial` changes
- pruning leftover `renzo-*` volumes
- operator auth, LAN bind, Cloudflare/Caddy
- S4+

A thin `RuntimeAdapter` interface is enough future-facing surface. Do not implement a second driver.

---

# 21. Questions / owner decisions

Do not stop Scott for questions already answered in ADRs, `S2_closeout.md`, this prompt’s locked table, or safe S3 engineering.

Consequential blockers only: record in `S3_Implementation_Status.md` (options, recommendation, what is blocked).

Do not walk `answers.md` S3.4–S3.45 asking every Recommendation.

---

# 22. Required documentation

**Durable**

- Create `crm_saas_vault/S3-Control-Plane-Runbook.md` (start, DB path, register, how to start labs, refresh, relaunch, safety, how to verify volumes/markers, exclusions).
- Update `SaaS-Milestones.md`, `SaaS-ToDo.md` when Successful.
- Update `Control-Plane.md` if the implementation clarifies the app.
- `SaaS-Decisions.md` only for new durable choices.

Do not promote lab ports or `m10a` names into SaaS law.

**WIP**

- Maintain `crm_saas_vault/wip/S3_Implementation_Status.md` every sprint.
- On Successful, write `crm_saas_vault/wip/S3_closeout.md` comparable to `wip/S2_closeout.md`: objective, starting state, architecture, data model, adapter, health, UI, registration, relaunch proof, QA, SHAs, lab-only assumptions, debt, S4 not started, criterion table.

Distinguish: durable decisions vs S3 facts vs lab defaults vs deferred work.

---

# 23. End-of-run

When Successful:

1. Finish runbook, status, closeout.
2. Update milestones / ToDo / indexes.
3. Final QA.
4. Review `git status` / diff; no secrets.
5. Commit closeout.
6. Push `working`.
7. **STOP. Do not begin S4.**

---

# 24. Final Cursor chat response

Do not dump the closeout in chat.

Return only:

- S3 status: Successful / In Progress / Blocked
- sprints completed
- `control_plane/` path and listen URL
- QA result
- live acceptance result
- final commit SHA
- push result
- blockers, if any
- confirmation S4 was not started
- paths to `S3_closeout.md`, `S3_Implementation_Status.md`, `S3-Control-Plane-Runbook.md`

**STOP after S3.**
