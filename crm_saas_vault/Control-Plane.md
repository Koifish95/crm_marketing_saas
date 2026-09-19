---
type: note
status: current
area: architecture
updated: 2026-09-18
aliases:
  - Platform control
  - Control module
tags:
  - saas
  - architecture
---

# Control plane

S3 and S4 **Successful**. Operator app: `control_plane/` at http://127.0.0.1:52100 — multi-page shell (Dashboard, Customers, Environments, Hosting Nodes, Settings). Observe: [[S3-Control-Plane-Runbook]]. Provision: [[S4-Provision-Runbook]] (`Customers → New customer` then **Add product instance**). Current state: [[Current-State]]. Historical frontend status: [[wip/archive/S5_Control_Plane_Productization_Status]]. Historical audit: [[wip/archive/Control_Plane_Post_Productization_Audit]]. Handoffs: [[history/S3_closeout]], [[history/S4_closeout]].

It is not another customer admin page and not the platform owner's CRM.

```text
Platform Owner
├── Platform / Control Plane privileges
└── Own Customer CRM Environment   (not provisioned here)

lab-acme (S2 laptop lab — registered)
├── PROD
└── DEV

Strategic Insights Consulting, LLC (S4 laptop — provisioned)
├── PROD  (52200)
└── DEV   (52201)

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

Headlines still read “Acme BJJ · Martial Arts · PROD · healthy,” not a container id. Indexes are tables. Workspaces can Refresh, Retry, add a product instance, add extra non-PROD on an instance, gated-decommission (volumes stay), and use the **Lifecycle** tab (backup, restore, off-host copy, upgrade — S6 Successful). Configuration fields stay read-only. Start / Stop / bulk start-stop are implemented on `/environments` (not Relaunch). Current state: [[Current-State]].

Laptop-only. Local Docker. Health on demand. Acme is seeded as a Martial Arts instance; new customers are accounts until the operator adds a product. No Docker socket in CRM containers.

C2 **Successful** (2026-09-15): one account may own Martial Arts and Sales instances. One PROD per instance. Add Product Instance returns after registry insert; Docker build/compose is server-side `provisioning` until `ready` or `failed` (`provision_error` retained). Retry continues the same rows. Upgrade gating is instance-scoped. Restore is selectable with PROD→DEV copy-down. The Control Plane does **not** track a CRM Core / foundation package version and does **not** inspect a product’s domain model. See [[Customer-Environment]] and [[SaaS-Decisions#2026-09-15 — Official C2 is Successful]].

## What it is not

- Public hostname / TLS / DNS
- Image registry / VPS / operator login
- Billing, self-service, ThePond replacement
- Managing external Renzo
- Operator login (loopback only; required before leaving localhost)

## Implementation (S3 facts + S6)

- Own SQLite: `control_plane/data/control-plane.sqlite`
- Generated UUID ids. Slugs are attributes.
- Runtime adapter: exact `docker inspect` + compose recreate (`up -d --force-recreate --no-deps app`)
- Health GET only registered `127.0.0.1` lab URLs
- Fleet backup zips: gitignored `control_plane/data/backups/{customerSlug}/{environmentSlug}/{customerSlug}_{environmentSlug}_{yyyy-MM-dd}_{HHmmss}.zip` (14-day retention). Older rows may still point at UUID folders. Each new zip includes `BACKUP.md`. Not `control-plane.sqlite`.
- Environment APIs: `POST .../backup`, `GET .../backups` (restore candidates), `POST .../restore` (`{ confirm, backupId }`), `.../backup/copy`, `.../backup/reveal`, `.../upgrade`, `.../start`, `.../stop`, `.../bulk/start`, `.../bulk/stop`. Restore is server-gated: same customer + same Product Instance; rollback or PROD→DEV copy-down only.
- Start: eligible when not decommissioned/provisioning/failed and status `stopped`. Missing stays on Relaunch. Stop: runtime running (or healthy/unhealthy); never sets `decommissioned`. Bulk `{ scope: selected|all }`; `all` = eligible registered fleet, not the table filter. Sequential Docker; no `Promise.all`.
- No operator login; loopback bind
- Non-loopback requests are refused unless `CONTROL_PLANE_ALLOW_REMOTE=true` **and** `x-control-plane-token` matches `CONTROL_PLANE_TOKEN`
- New Martial Arts/Sales envs get a unique initial-access password (never provisioned `setup`); env files and sidecar password files are `0600` where the OS allows
- Fleet SQLite snapshot uses in-container `VACUUM INTO` + integrity_check, not a live `docker cp` of the database file
- Customer #1 operator procedures: [[Customer-1-Production-Deploy-Runbook]], [[Customer-1-Backup-Restore-Runbook]], [[Martial-Arts-Customer-1-Sell-Readiness]]

## Safety rule

Relaunch means: recreate the process, remount the same durable data. Never `docker compose down -v`, prune, or attach `webhosting_renzo_*` / leftover `renzo-*` volumes.

## Next

Official S5 and S6 are **Successful**. C2 is **Successful**. Public hostname work is official S8. Do not start S7, C3, or DNS/TLS unless an active work order says so. Architecture: [[ADR-Product-Owned-Domains-Shared-Foundation]]. Do not duplicate `lab-acme` or `strategic-insights` blindly. Runbook: [[S6-Fleet-Runbook]]. Closeout: [[history/S6_closeout]]. Live map: [[Current-State]].
