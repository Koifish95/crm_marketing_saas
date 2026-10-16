---
type: note
status: current
area: architecture
updated: 2026-10-14
aliases:
  - Platform control
  - Control module
tags:
  - saas
  - architecture
---

# Control plane

S3 and S4 **Successful**. Operator app: `control_plane/` at http://127.0.0.1:52100 — multi-page shell (Dashboard, Customers, Products, Environments, Tickets, QA Runs, Backups, Reports, Hosting Nodes, Settings). Live instance: systemd `sic-control-plane` on the Nuxxion VPS, reached by SSH tunnel; start/stop/status/tunnel from this PC with `pnpm vps` ([[How-to-Run]]). Observe: [[S3-Control-Plane-Runbook]]. Provision: [[S4-Provision-Runbook]] (`Customers → New customer` then **Add product instance**). Hosting node: [[Hosting-Node-Architecture]]. Current state: [[Current-State]]. Operator UX audit: [[Control-Plane-Operator-UX-Audit]]. Return: [[history/WO-2026-09-19-cp-operator-experience-return]]. Historical frontend status: [[wip/archive/S5_Control_Plane_Productization_Status]]. Historical audit: [[wip/archive/Control_Plane_Post_Productization_Audit]]. Handoffs: [[history/S3_closeout]], [[history/S4_closeout]].

It is not another customer admin page and not the platform owner's CRM.

2026-10-02 QA/ticketing is **code-shipped**. The shell adds **Tickets** and **QA Runs**. Tickets have sources/categories/lifecycle, comments, activity, assignment labels, resolution, and evidence. QA runs preserve workflows/findings/evidence; findings may be ticketed, linked, dismissed, or marked duplicate without deletion. The Martial Arts Playwright runner selects a registered ready environment, refuses PROD before browser launch, and creates findings rather than code changes. Architecture/runbook: [[QA-Ticketing-Architecture]], [[QA-Ticketing-Runbook]]. No customer support portal or autonomous remediation exists.

```text
Platform Owner
├── Platform / Control Plane privileges
└── Own Customer CRM Environment   (not provisioned here)

Nuxxion VPS registry (nuxxion-vps-1, live)
└── Acme · Martial Arts
    ├── PROD  acme.nuxxion.com
    └── DEV   (not published)

Laptop registry (seed + live extras, not in git)
├── lab-acme (S2 laptop lab)       PROD, DEV
└── Strategic Insights (S4 proof)  PROD 52200, DEV 52201

Sister business / Beauty
└── not provisioned
```

Do **not** list the external Renzo gym as a managed customer.

## What it does today (S3 + S4)

```text
which customers exist
→ which environment(s) they have
→ up / down  (container running AND /api/health)
→ relaunch without destroying data
→ provision a Product Instance PROD+DEV pair (Martial Arts or Sales)
```

Headlines still read “Acme BJJ · Martial Arts · PROD · healthy,” not a container id. Indexes are tables with search/filter/sort. Archived environments are hidden unless **Show archived**. Workspaces show `releaseId` and `schemaVersion` from `/api/health`. Operators can Refresh, Retry, add a product instance, add extra non-PROD on an instance, deactivate/reactivate a customer or product instance, Start/Stop, gated-decommission (volumes stay), Archive & Delete (final backup + exact volume rm), assign a PROD public hostname, and use the **Backup** / **Release** tabs (backup, restore, off-host copy, target-image upgrade — S6 Successful; recreate without `-v`). Start / Stop / bulk start-stop are on `/environments` (not Relaunch). Reports use registry + Docker inspect + health + backup rows only. Map: [[Product-Release-Update-Lifecycle]]. Current state: [[Current-State]].

Laptop **or** Linux hosting node (`kind=laptop|vps`, `driver=local-docker`). Health on demand. Acme is seeded as a Martial Arts instance on laptop; VPS bootstrap sets `SKIP_LAB_SEED=true`. New customers are accounts until the operator adds a product. No Docker socket in CRM containers.

C2 **Successful** (2026-09-15): one account may own Martial Arts and Sales instances. One PROD per instance. Add Product Instance returns after registry insert; Docker build/compose is server-side `provisioning` until `ready` or `failed` (`provision_error` retained). Retry continues the same rows. Upgrade gating is instance-scoped. Restore is selectable with PROD→DEV copy-down. The Control Plane does **not** track a CRM Core / foundation package version and does **not** inspect a product’s domain model. See [[Customer-Environment]] and [[SaaS-Decisions#2026-09-15 — Official C2 is Successful]].

2026-09-19 hosting-node path: the Control Plane is the SIC infrastructure-management plane on one node. It stays loopback-only. Remote operators SSH-tunnel. Official S7 is **not** Successful.

## What it is not

- Public Control Plane website
- Official S7 operator login
- Official S8 live product domain
- Image registry / multi-region / Kubernetes
- Billing, self-service, ThePond replacement
- Managing external Renzo
- Autonomous finding remediation or deployment
- Customer-facing support portal

## Implementation (S3 facts + S6)

- Own SQLite: `control_plane/data/control-plane.sqlite`. Drizzle journal `0000`–`0009_previous_release`
- Generated UUID ids. Slugs are attributes.
- Runtime adapter: exact `docker inspect` + compose recreate (`up -d --force-recreate --no-deps app`)
- Health GET only registered `127.0.0.1` lab URLs
- Fleet backup zips: gitignored `control_plane/data/backups/{customerSlug}/{environmentSlug}/{customerSlug}_{environmentSlug}_{yyyy-MM-dd}_{HHmmss}.zip` (14-day retention). Older rows may still point at UUID folders. Each new zip includes `BACKUP.md`. Not `control-plane.sqlite`.
- Read APIs: `GET /api/status` (full fleet observe; Docker inspect + health for every environment), `/api/environments`, `/api/products`, `/api/backups`, `/api/events`, `/api/reports`.
- Customer APIs: `POST /api/customers`, `.../{id}/product-instances`, `.../{id}/environments` (extra non-PROD), `.../{id}/provision`, `.../{id}/decommission`, `.../{id}/deactivate`, `.../{id}/reactivate`. Product instance `deactivate` / `reactivate`.
- Environment APIs (`/api/environments/{id}/…`): `provision` (retry), `relaunch`, `start`, `stop`, `decommission`, `hostname`, `backup`, `backups` (restore candidates), `restore` (`{ confirm, backupId }`), `backup/copy` (`{ destinationDir }` or verified `{ remotePath }`), `backup/reveal`, `release-pin`, `upgrade`, `rollback` (`{ confirm, backupId }`), `archive` (`{ confirmSlug, confirmPhrase, destinationDir?, skipOffhost? }`). Bulk: `/api/environments/bulk/start`, `.../bulk/stop`. Restore is server-gated: same customer + same Product Instance; rollback or PROD→DEV copy-down only. Archive requires exact slug + `ARCHIVE AND DELETE`.
- Release identity (uncommitted on Scott’s PC and on the VPS as of 2026-10-14; live-proven on Acme 2026-10-07): `release-pin` pins the running image as `{repo}@sha256:…` with `RELEASE_ID={sha}@{12-hex}`. Upgrade requires a pinned release, stores the previous digest + release id on the latest backup (`environment_backups.previous_expected_image`, `previous_release_id`, migration `0009_previous_release`), and does not rebuild for a digest a sibling already runs. `rollback` restores that backup and starts that digest in one call. `release-pin` and `rollback` have no UI button. Runbook: [[S6-Fleet-Runbook]].
- Start: eligible when not decommissioned/archived/provisioning/failed, customer and product instance are active, and status `stopped`. Missing stays on Relaunch. Stop: runtime running (or healthy/unhealthy); never sets `decommissioned`. Bulk `{ scope: selected|all }`; `all` = eligible registered fleet, not the table filter. Sequential Docker; no `Promise.all`.
- Customer `POST .../deactivate` / `.../reactivate`. Product instance same. Deactivate stops live processes; does not delete rows or volumes.
- Operator events: `GET /api/events`. Reports: `GET /api/reports`. Fleet backups: `GET /api/backups`.
- Tickets: `/tickets` with paginated/filterable `GET /api/tickets`; details, lifecycle changes, comments, activity, and QA evidence links. QA history: `/qa/runs`.
- QA evidence bytes: gitignored `data/qa-evidence/`; metadata stays in SQLite. Control Plane registry snapshots copy evidence to a sibling `.evidence` directory.
- No operator login; loopback bind
- Non-loopback requests are refused unless `CONTROL_PLANE_ALLOW_REMOTE=true` **and** `x-control-plane-token` matches `CONTROL_PLANE_TOKEN`
- New Martial Arts/Sales envs start as `admin` / `setup` with `mustChangePassword`; first login opens `/account/password`. Env files are `0600` where the OS allows. The Control Plane does not store the password chosen after that.
- Fleet SQLite snapshot uses in-container `VACUUM INTO` + integrity_check, not a live `docker cp` of the database file
- Control Plane registry snapshot: `POST /api/control-plane/backup` (VACUUM INTO under `data/backups/control-plane/`)
- PROD `POST .../hostname` `{ hostname }` writes `public_hostname`, derives `NUXT_PUBLIC_ORIGIN=https://{hostname}`, regenerates `deploy/edge/nginx.conf`
- Customer #1 operator procedures: [[Customer-1-Production-Deploy-Runbook]], [[Customer-1-Backup-Restore-Runbook]], [[Martial-Arts-Customer-1-Sell-Readiness]], [[Hosting-Node-Bootstrap-Runbook]], [[Production-Edge-Runbook]]

## Safety rule

Relaunch means: recreate the process, remount the same durable data. Never `docker compose down -v`, prune, or attach `webhosting_renzo_*` / leftover `renzo-*` volumes.

## Next

Official S5 and S6 are **Successful**. C2 is **Successful**. Public hostname work is official S8. Do not start S7, C3, or DNS/TLS unless an active work order says so. Architecture: [[ADR-Product-Owned-Domains-Shared-Foundation]]. Do not duplicate `lab-acme` or `strategic-insights` blindly. Runbook: [[S6-Fleet-Runbook]]. Closeout: [[history/S6_closeout]]. Live map: [[Current-State]].
